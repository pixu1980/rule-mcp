// @ts-check

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_ROOT = path.dirname(fileURLToPath(import.meta.url));
const SHARED_SOURCE_ROOT = path.join(SKILL_ROOT, "..", "examples"); // decorator/ and events/ subfolders
const SHARED_PACKAGE_NAME = "@rule-mcp/rule-core";

const DEFAULTS = {
  target: process.cwd(),
  componentsDir: "src/components",
  sharedDir: "packages/rule-core",
  installShared: false,
  force: false,
  dryRun: false,
};

const SHARED_SOURCES = [
  { sourceRoot: path.join(SHARED_SOURCE_ROOT, "decorator"), targetFolder: "decorator", skipEntries: [] },
  { sourceRoot: path.join(SHARED_SOURCE_ROOT, "events"), targetFolder: "events", skipEntries: [] },
  // Template-engine tagged runtime is installed when the sibling
  // rule-template-engine skill is present; otherwise it is skipped.
  {
    sourceRoot: path.resolve(SKILL_ROOT, "..", "..", "rule-template-engine", "assets", "tagged-runtime"),
    targetFolder: "template-engine",
    skipEntries: [],
    optional: true,
  },
];
const DECORATOR_MARKER = "export function componentDecorator";

const SHARED_PACKAGE_FILES = Object.freeze({
  "package.json": `${JSON.stringify(
    {
      name: SHARED_PACKAGE_NAME,
      private: true,
      type: "module",
      exports: {
        "./decorator/index.js": "./decorator/index.js",
        "./events/index.js": "./events/index.js",
        "./template-engine/index.js": "./template-engine/index.js",
      },
    },
    null,
    2,
  )}\n`,
  "README.md": "# @rule-mcp/rule-core\n\nShared runtime helpers for rule-mcp component packages.\n",
});

/**
 * @typedef {{
 *   target: string;
 *   name: string;
 *   tag: string;
 *   componentsDir: string;
 *   sharedDir: string;
 *   extendsElement: string;
 *   attributes: string[];
 *   events: string[];
 *   installShared: boolean;
 *   force: boolean;
 *   dryRun: boolean;
 * }} ScaffoldOptions
 */

/**
 * @typedef {{
 *   sourcePath: string;
 *   targetPath: string;
 *   content: string;
 * }} GeneratedFile
 */

/**
 * @typedef {{
 *   componentDir: string;
 *   sharedLibraryPath: string;
 *   sharedLibraryInstalled: boolean;
 *   sharedImportPath: string;
 *   writtenFiles: string[];
 *   dryRun: boolean;
 *   nextSteps: string[];
 * }} ScaffoldResult
 */

/**
 * Read a CLI flag value (`--flag value`) with a fallback.
 *
 * @param {string[]} argv
 * @param {string} flag
 * @param {string} fallback
 * @returns {string}
 */
const getArg = (argv, flag, fallback = "") => {
  const index = argv.findIndex((entry) => entry === flag);
  if (index === -1) return fallback;
  return argv[index + 1] ?? fallback;
};

/**
 * Parse a comma-separated list, stripping whitespace and empty entries.
 *
 * @param {string} raw
 * @returns {string[]}
 */
const parseList = (raw) => {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
};

/**
 * @param {string} str
 * @returns {string}
 */
const toKebabCase = (str) =>
  str
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

/**
 * @param {string} str
 * @returns {string}
 */
const toPascalCase = (str) =>
  str
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

/**
 * Validate and normalise a class name into its custom-element tag.
 *
 * @param {string} name
 * @returns {{ name: string, tag: string }}
 */
const resolveName = (name) => {
  if (!name) {
    throw new Error('Missing required --name flag (PascalCase, e.g. "PixCard").');
  }

  const pascal = toPascalCase(name);
  const tag = toKebabCase(pascal);

  if (!tag.includes("-")) {
    throw new Error(
      `Class name "${name}" produces tag "${tag}" without a hyphen. Custom element names must contain a hyphen - use a class with at least two PascalCase words (e.g. "PixCard").`,
    );
  }

  return { name: pascal, tag };
};

/**
 * @param {string[]} argv
 * @returns {ScaffoldOptions}
 */
export const parseArgs = (argv) => {
  const tagFlag = getArg(argv, "--tag", "");
  const { name, tag: defaultTag } = resolveName(getArg(argv, "--name", ""));

  return {
    target: path.resolve(getArg(argv, "--target", DEFAULTS.target)),
    name,
    tag: tagFlag || defaultTag,
    componentsDir: getArg(argv, "--components-dir", DEFAULTS.componentsDir),
    sharedDir: getArg(argv, "--shared-dir", DEFAULTS.sharedDir),
    extendsElement: getArg(argv, "--extends", ""),
    attributes: parseList(getArg(argv, "--attributes", "")),
    events: parseList(getArg(argv, "--events", "")),
    installShared: argv.includes("--install-shared"),
    force: argv.includes("--force"),
    dryRun: argv.includes("--dry-run"),
  };
};

/**
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
const fileExists = async (filePath) => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Walk `root` looking for any JS/MJS file that declares
 * `export function componentDecorator`. Returns the path of its containing folder
 * (i.e. the `decorator/` directory), or null when nothing is found.
 *
 * @param {string} root
 * @returns {Promise<string | null>}
 */
const findExistingDecorator = async (root) => {
  /** @type {string[]} */
  const skipDirs = ["node_modules", "dist", "build", ".git", ".next", ".parcel-cache"];

  /** @param {string} dir */
  const walk = async (dir) => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return null;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (skipDirs.includes(entry.name)) continue;
        const found = await walk(path.join(dir, entry.name));
        if (found) return found;
        continue;
      }

      if (!entry.isFile()) continue;
      if (!/\.m?js$/.test(entry.name)) continue;

      const filePath = path.join(dir, entry.name);
      const content = await readFile(filePath, "utf8").catch(() => "");
      if (content.includes(DECORATOR_MARKER)) {
        return path.dirname(filePath);
      }
    }

    return null;
  };

  return walk(root);
};

/**
 * Recursively copy a directory tree to a target path.
 *
 * @param {string} sourceRoot
 * @param {string} targetRoot
 * @param {boolean} force
 * @param {string[]} [skipEntries=[]]
 * @returns {Promise<string[]>} list of files written
 */
const copyTree = async (sourceRoot, targetRoot, force, skipEntries = []) => {
  /** @type {string[]} */
  const written = [];

  /**
   * @param {string} src
   * @param {string} dest
   */
  const copy = async (src, dest) => {
    const entries = await readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      if (skipEntries.includes(entry.name)) continue;

      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await mkdir(destPath, { recursive: true });
        await copy(srcPath, destPath);
        continue;
      }

      if (!entry.isFile()) continue;

      const exists = await fileExists(destPath);
      if (exists && !force) {
        throw new Error(`Refusing to overwrite ${destPath} without --force.`);
      }

      const content = await readFile(srcPath, "utf8");
      await mkdir(path.dirname(destPath), { recursive: true });
      await writeFile(destPath, content, "utf8");
      written.push(destPath);
    }
  };

  await copy(sourceRoot, targetRoot);
  return written;
};

/**
 * Compute a relative import path from `fromFile` to `toDir`, normalised to
 * use `/` separators and prefixed with `./` when in the same or child folder.
 *
 * @param {string} fromFile
 * @param {string} toDir
 * @returns {string}
 */
const relativeImport = (fromFile, toDir) => {
  let rel = path.relative(path.dirname(fromFile), toDir);
  rel = rel.split(path.sep).join("/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
};

/**
 * @param {ScaffoldOptions} options
 * @param {string} sharedImportPath - relative import to the shared library root
 * @returns {Record<string, string>} map of relative file path -> content
 */
const buildComponentFiles = (options, sharedImportPath, hasTemplateEngine = true) => {
  const { name, tag, extendsElement, attributes, events } = options;

  const baseClass = extendsElement ? extendsElementToHTMLClass(extendsElement) : "HTMLElement";

  const extendsLine = extendsElement ? `  static extendsElement = '${extendsElement}';\n` : "";

  const attributesImport = `import attributes from './${tag}.attributes.js';`;
  const eventsImport = `import events from './${tag}.events.js';`;

  const componentJs = `// @ts-check

// CSS is loaded as a string by the bundler. Configure the bundler to treat
// component CSS imports as raw text (for esbuild: \`loader: { '.css': 'text' }\`).
import styles from './styles/${tag}.css';

import { componentDecorator } from '${SHARED_PACKAGE_NAME}/decorator/index.js';

${attributesImport}
${eventsImport}
import { renderRoot } from './${tag}.template.js';
import { CONTENT_PART } from './${tag}.consts.js';
import { filterRenderableNodes, normalizeVariant } from './${tag}.utils.js';

export class ${name} extends ${baseClass} {
${extendsLine}  static attributes = attributes;
  static events = events;
  static styles = styles;

  static {
    componentDecorator(this);
  }

  constructor() {
    super();
  }

  /**
   * @returns {'default' | 'outlined'}
   */
  get variant() {
    return normalizeVariant(this.getAttribute('variant'));
  }

  /**
   * @param {string | null | undefined} value
   */
  set variant(value) {
    this.setAttribute('variant', normalizeVariant(value));
  }

  onRender() {
    const existingRoot = this.querySelector(':scope > [data-part="root"]');

    if (!existingRoot) {
      const nodes = filterRenderableNodes(Array.from(this.childNodes));
      this.innerHTML = renderRoot({});
      this.querySelector(':scope > [data-part="content"]')?.append(...nodes);
    }

    this.#syncState();
  }

  /**
   * @param {string} name
   * @param {string | null} _oldValue
   * @param {string | null} newValue
   */
  onAttributeChanged(name, _oldValue, newValue) {
    if (name === 'variant') {
      this.setAttribute('data-variant', normalizeVariant(newValue));
    }
  }

  #syncState() {
    const variant = this.variant;
    this.setAttribute('variant', variant);
    this.setAttribute('data-variant', variant);
    this.querySelector(':scope > [data-part="' + CONTENT_PART + '"]')?.setAttribute('data-variant', variant);
  }
}

export { normalizeVariant } from './${tag}.utils.js';
export default ${name};
`;

  const attributeEntries = attributes.map((attr) => {
    const handlerName = attr.replace(/[^a-zA-Z0-9]/g, "");
    return `  /**
   * @this {HTMLElement & { componentName: string }}
   * @param {string | null} _oldValue
   * @param {string | null} _newValue
   */
  ${handlerName}(_oldValue, _newValue) {
    // handle ${attr} attribute change
  },`;
  });

  const attributesJs = `// @ts-check

import { normalizeVariant } from './${tag}.utils.js';

export default {
  /**
   * @this {HTMLElement}
   * @param {string | null} _oldValue
   * @param {string | null} newValue
   */
  variant(_oldValue, newValue) {
    this.setAttribute('data-variant', normalizeVariant(newValue));
  },
${attributeEntries.length > 0 ? attributeEntries.join("\n") + "\n" : ""}};
`;

  const eventEntries = events.map((evt) => {
    const handlerName = evt.replace(/[^a-zA-Z0-9]/g, "");
    return `  /**
   * @this {HTMLElement}
   * @param {Event} _e
   */
  ${handlerName}(_e) {
    // handle ${evt} event
  },`;
  });

  const eventsJs = `// @ts-check

export default {
${eventEntries.length > 0 ? eventEntries.join("\n") + "\n" : ""}};
`;

  const constsJs = `// @ts-check

export const DEFAULT_VARIANT = 'default';
export const SUPPORTED_VARIANTS = ['default', 'outlined'];
export const ROOT_PART = 'root';
export const CONTENT_PART = 'content';
`;

  const utilsJs = `// @ts-check

import { DEFAULT_VARIANT, SUPPORTED_VARIANTS } from './${tag}.consts.js';

/**
 * @param {string | null | undefined} value
 * @returns {'default' | 'outlined'}
 */
export const normalizeVariant = (value) => {
  return SUPPORTED_VARIANTS.includes(String(value)) ? /** @type {'default' | 'outlined'} */ (value) : DEFAULT_VARIANT;
};

/**
 * @param {ChildNode[]} nodes
 * @returns {ChildNode[]}
 */
export const filterRenderableNodes = (nodes) => {
  return nodes.filter((node) => !(node.nodeType === Node.ELEMENT_NODE && node instanceof HTMLElement && node.getAttribute('data-part') === 'root'));
};
`;

  const templateJs = hasTemplateEngine
    ? `// @ts-check

import TemplateEngine from '${SHARED_PACKAGE_NAME}/template-engine/index.js';
import { CONTENT_PART, ROOT_PART } from './${tag}.consts.js';

const engine = new TemplateEngine();

export const renderRoot = engine.html\`
  <div data-part="\${ROOT_PART}">
    <div data-part="\${CONTENT_PART}"></div>
  </div>
\`;
`
    : `// @ts-check

import { CONTENT_PART, ROOT_PART } from './${tag}.consts.js';

export const renderRoot = () => \`
  <div data-part="\${ROOT_PART}">
    <div data-part="\${CONTENT_PART}"></div>
  </div>
\`;
`;

  const cssEntry = `@import "./_core.css" layer(components.${tag});
@import "./states/_states.css" layer(components.${tag});
`;

  const selector = extendsElement ? `[is="${tag}"]` : tag;

  const cssCore = `:root {
  --${tag}--padding: var(--space-4);
  --${tag}--color: var(--color-text);
  --${tag}--background-color: var(--color-surface);
  --${tag}--border-color: var(--color-border);
  --${tag}--border-radius: var(--radius-control);
}

${selector} {
  display: block;
  padding: var(--${tag}--padding);
  color: var(--${tag}--color);
  background-color: var(--${tag}--background-color);
  border: 0.1rem solid var(--${tag}--border-color);
  border-radius: var(--${tag}--border-radius);
}
`;

  const cssStates = `${selector} {
  /* state-driven rules go here, e.g. &[open], &[disabled], &:focus-within */
}
`;

  return {
    [`${tag}.js`]: componentJs,
    [`${tag}.template.js`]: templateJs,
    [`${tag}.consts.js`]: constsJs,
    [`${tag}.utils.js`]: utilsJs,
    [`${tag}.attributes.js`]: attributesJs,
    [`${tag}.events.js`]: eventsJs,
    [`styles/${tag}.css`]: cssEntry,
    [`styles/_core.css`]: cssCore,
    [`styles/states/_states.css`]: cssStates,
  };
};

/**
 * Map a built-in tag to its corresponding HTMLxxxElement class name.
 *
 * @param {string} tag
 * @returns {string}
 */
const extendsElementToHTMLClass = (tag) => {
  /** @type {Record<string, string>} */
  const overrides = {
    a: "HTMLAnchorElement",
    blockquote: "HTMLQuoteElement",
    button: "HTMLButtonElement",
    details: "HTMLDetailsElement",
    dialog: "HTMLDialogElement",
    div: "HTMLDivElement",
    form: "HTMLFormElement",
    img: "HTMLImageElement",
    input: "HTMLInputElement",
    label: "HTMLLabelElement",
    li: "HTMLLIElement",
    ol: "HTMLOListElement",
    p: "HTMLParagraphElement",
    select: "HTMLSelectElement",
    span: "HTMLSpanElement",
    table: "HTMLTableElement",
    textarea: "HTMLTextAreaElement",
    ul: "HTMLUListElement",
  };

  if (overrides[tag]) return overrides[tag];

  return `HTML${tag.charAt(0).toUpperCase()}${tag.slice(1)}Element`;
};

/**
 * @param {ScaffoldOptions} options
 * @returns {Promise<ScaffoldResult>}
 */
export const scaffoldComponent = async (options) => {
  const targetRoot = path.resolve(options.target);
  const componentDir = path.join(targetRoot, options.componentsDir, options.name);

  // 1. resolve shared library - find existing or install
  let sharedLibraryPath = await findExistingDecorator(targetRoot);
  let sharedLibraryInstalled = false;
  /** @type {string[]} */
  const sharedWritten = [];

  if (sharedLibraryPath) {
    // sharedLibraryPath points at the decorator dir; the library root is its parent
    sharedLibraryPath = path.dirname(sharedLibraryPath);
  } else if (options.installShared) {
    sharedLibraryPath = path.join(targetRoot, options.sharedDir);

    if (!options.dryRun) {
      for (const source of SHARED_SOURCES) {
        if (source.optional && !(await fileExists(source.sourceRoot))) continue;
        const dest = path.join(sharedLibraryPath, source.targetFolder);
        const written = await copyTree(source.sourceRoot, dest, options.force, source.skipEntries);
        sharedWritten.push(...written);
      }

      for (const [relativePath, content] of Object.entries(SHARED_PACKAGE_FILES)) {
        const targetPath = path.join(sharedLibraryPath, relativePath);
        await mkdir(path.dirname(targetPath), { recursive: true });
        await writeFile(targetPath, content, "utf8");
        sharedWritten.push(targetPath);
      }
    } else {
      for (const source of SHARED_SOURCES) {
        sharedWritten.push(path.join(sharedLibraryPath, source.targetFolder, "<copied>"));
      }

      for (const relativePath of Object.keys(SHARED_PACKAGE_FILES)) {
        sharedWritten.push(path.join(sharedLibraryPath, relativePath));
      }
    }

    sharedLibraryInstalled = true;
  } else {
    throw new Error(
      [
        "No existing `componentDecorator` found in the project.",
        "Re-run with `--install-shared` to install the shared library once at",
        `\`${path.join(options.sharedDir)}\` (override with --shared-dir).`,
      ].join(" "),
    );
  }

  const componentEntryFile = path.join(componentDir, `${options.tag}.js`);
  const sharedImportPath = SHARED_PACKAGE_NAME;

  // template-engine tagged runtime is present only when the sibling
  // rule-template-engine skill was installed into the shared library.
  const hasTemplateEngine = await fileExists(path.join(sharedLibraryPath, "template-engine", "index.js"));

  // 2. build component files
  const files = buildComponentFiles(options, sharedImportPath, hasTemplateEngine);

  // 3. conflict detection
  if (!options.force) {
    for (const relPath of Object.keys(files)) {
      const abs = path.join(componentDir, relPath);
      if (await fileExists(abs)) {
        throw new Error(`Refusing to overwrite ${abs} without --force.`);
      }
    }
  }

  // 4. write files
  /** @type {string[]} */
  const componentWritten = [];

  if (!options.dryRun) {
    for (const [relPath, content] of Object.entries(files)) {
      const abs = path.join(componentDir, relPath);
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, content, "utf8");
      componentWritten.push(abs);
    }
  } else {
    for (const relPath of Object.keys(files)) {
      componentWritten.push(path.join(componentDir, relPath));
    }
  }

  return {
    componentDir,
    sharedLibraryPath,
    sharedLibraryInstalled,
    sharedImportPath,
    writtenFiles: [...sharedWritten, ...componentWritten],
    dryRun: options.dryRun,
    nextSteps: [
      `Import the component module from your app entry: import '${path.relative(targetRoot, componentEntryFile).split(path.sep).join("/")}';`,
      sharedLibraryInstalled
        ? 'Confirm the bundler resolves component CSS imports as raw text (for esbuild use `loader: { ".css": "text", ".svg": "text" }`).'
        : "Reusing existing shared library - no bundler change needed.",
      options.extendsElement
        ? `Customized built-ins (\`is="${options.tag}"\`) require the @ungap/custom-elements polyfill on Safari.`
        : "Autonomous element - no Safari polyfill needed.",
    ],
  };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const result = await scaffoldComponent(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
};

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (invokedFile === currentFile) {
  main().catch((error) => {
    process.stderr.write(`scaffold-component error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

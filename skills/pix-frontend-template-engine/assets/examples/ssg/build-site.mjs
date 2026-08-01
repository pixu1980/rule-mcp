// @ts-check

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import TemplateEngine from '../../template-engine/index.js';

const posts = [
  { slug: 'intro', title: 'Intro', summary: 'First post' },
  { slug: 'roadmap', title: 'Roadmap', summary: 'Upcoming features' },
];

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const outputDir = path.join(currentDir, 'dist');

await mkdir(outputDir, { recursive: true });

const engine = new TemplateEngine({ rootDir: currentDir });

for (const post of posts) {
  const html = engine.render('post.html', { post, page: { title: post.title } });
  await writeFile(path.join(outputDir, `${post.slug}.html`), `${html}\n`, 'utf8');
}

process.stdout.write('Generated SSG pages in examples/template-engine/ssg/dist\n');

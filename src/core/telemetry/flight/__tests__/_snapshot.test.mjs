/**
 * @module test/flight-recorder/snapshot
 *
 * F5: what the project looked like when the session ended.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { makeCheck, makeSandbox } from "./_flight.fixture.mjs";

const { check, finish } = makeCheck("Flight recorder: project snapshot");
const { project } = makeSandbox();

mkdirSync(join(project, "src", "components", "ContactCard"), { recursive: true });
mkdirSync(join(project, "docs", "adr"), { recursive: true });
mkdirSync(join(project, "node_modules", "left-pad"), { recursive: true });
mkdirSync(join(project, ".tokensave"), { recursive: true });
writeFileSync(join(project, "src", "components", "ContactCard", "index.js"), 'export * from "./_ContactCard.jsx";\n');
writeFileSync(join(project, "src", "components", "ContactCard", "_ContactCard.jsx"), "const a = 1;\nconst b = 2;\n");
writeFileSync(join(project, "src", "components", "ContactCard", "_ContactCard.css"), ":host { color: red; }\n");
writeFileSync(join(project, "docs", "adr", "001-pick-react.md"), "# 001\n");
writeFileSync(join(project, "src", "_contacts.test.js"), "test('x', () => {});\n");
writeFileSync(join(project, "node_modules", "left-pad", "index.js"), "// noise\n".repeat(50));

const { snapshotProject } = await import("../../../session/snapshot/index.js");
const snapshot = snapshotProject(project);

check("F5 source lines are counted", snapshot.lines.total > 0);
check("F5.1 lines are broken down by extension", snapshot.lines.byExtension[".jsx"] === 2);
check("F5.2 files are broken down by extension", snapshot.files.byExtension[".css"] === 1);
check("F5.3 node_modules is never counted as source", snapshot.files.byExtension[".js"] === 2);
check("F5.4 components are the directories with a barrel", snapshot.components === 1);
check("F5.5 ADRs are counted", snapshot.adrs === 1);
check("F5.6 test files are counted", snapshot.testFiles === 1);
check("F5.7 the source tree is weighed", snapshot.bytes.source > 0);
check("F5.8 dependencies are weighed apart from source", snapshot.bytes.nodeModules > 0);

writeFileSync(join(project, ".tokensave", "branch-meta.json"), JSON.stringify({ db_file: "tokensave.db" }));

const withGraph = snapshotProject(project);

check("F5.9 a missing graph is reported as absent, not as zero", withGraph.tokensave.present === true);

finish();

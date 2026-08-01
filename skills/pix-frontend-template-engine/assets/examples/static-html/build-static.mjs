// @ts-check

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TemplateRenderer } from '../../template-engine/index.js';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

const renderer = new TemplateRenderer(currentDir);
const html = renderer.render('page.template.html', {
  page: {
    title: 'Static page',
    description: 'Generated with pix-template-engine.',
    items: ['Fast', 'Deterministic', 'Composable'],
  },
});

await writeFile(path.join(currentDir, 'page.html'), `${html}\n`, 'utf8');
process.stdout.write('Generated examples/template-engine/static-html/page.html\n');

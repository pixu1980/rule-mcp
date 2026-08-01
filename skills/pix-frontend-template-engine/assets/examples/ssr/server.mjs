// @ts-check

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import TemplateEngine from '../../template-engine/index.js';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const engine = new TemplateEngine({ rootDir: currentDir });

const server = http.createServer((_, response) => {
  const html = engine.render('view.html', {
    page: { title: 'SSR page' },
    user: { name: 'Guest', isLoggedIn: true },
  });

  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(html);
});

server.listen(4173, () => {
  process.stdout.write('SSR example running on http://localhost:4173\n');
});

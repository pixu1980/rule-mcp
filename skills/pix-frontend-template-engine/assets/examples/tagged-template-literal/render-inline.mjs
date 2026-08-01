// @ts-check

import TemplateEngine from '../../template-engine/index.js';

const engine = new TemplateEngine();

const renderStatus = engine.html`
  <article>
    <h1>{{ page.title }}</h1>
    <p>{{ page.description }}</p>

    <ul>
      <for each="item in items">
        <li>{{ item.label }}: {{ item.value }}</li>
      </for>
    </ul>
  </article>
`;

const renderPage = engine.template`
  <main>
    ${renderStatus}
    ${(data) => `<script type="application/json" id="page-data">${JSON.stringify(data.page)}</script>`}
  </main>
`;

const html = renderPage({
  page: {
    title: 'Inline report',
    description: 'Rendered with tagged template literals.',
  },
  items: [
    { label: 'Mode', value: 'tagged-template-literal' },
    { label: 'Alias', value: 'engine.html' },
    { label: 'Reusable', value: 'yes' },
  ],
});

process.stdout.write(`${html}\n`);

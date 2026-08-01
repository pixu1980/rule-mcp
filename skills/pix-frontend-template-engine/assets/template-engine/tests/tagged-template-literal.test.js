#!/usr/bin/env node

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { TemplateEngine } from '../index.js';

describe('TemplateEngine - Tagged Template Literals', () => {
  test('should render inline templates with engine.template', () => {
    const engine = new TemplateEngine();

    const renderList = engine.template`
      <h1>{{ title | upper }}</h1>
      <for each="item in items">
        <span>{{ item }}</span>
      </for>
    `;

    const html = renderList({
      title: 'tagged literal',
      items: ['Alpha', 'Beta'],
    });

    assert.ok(html.includes('<h1>TAGGED LITERAL</h1>'));
    assert.ok(html.includes('<span>Alpha</span>'));
    assert.ok(html.includes('<span>Beta</span>'));
  });

  test('should render inline templates with engine.html alias', () => {
    const engine = new TemplateEngine();

    const renderCard = engine.html`<article><h2>{{ card.title }}</h2><p>{{ card.summary }}</p></article>`;

    assert.strictEqual(
      renderCard({
        card: {
          title: 'Alias',
          summary: 'Short form works',
        },
      }),
      '<article><h2>Alias</h2><p>Short form works</p></article>'
    );
  });

  test('should compose tagged render functions with shared render data', () => {
    const engine = new TemplateEngine();

    const renderHeader = engine.html`<header><h1>{{ page.title }}</h1></header>`;
    const renderShell = engine.template`<main>${renderHeader}<p>{{ page.description }}</p></main>`;

    assert.strictEqual(
      renderShell({
        page: {
          title: 'Composed page',
          description: 'Header and body share data.',
        },
      }),
      '<main><header><h1>Composed page</h1></header><p>Header and body share data.</p></main>'
    );
  });

  test('should evaluate JavaScript interpolations before template rendering', () => {
    const engine = new TemplateEngine();

    const renderPage = engine.html`
      <section>{{ title }}</section>
      ${(data) => `<footer>{{ meta.generatedAt }} - ${data.links.length} links</footer>`}
    `;

    const html = renderPage({
      title: 'Inline function',
      meta: { generatedAt: '2026-04-30' },
      links: ['Docs', 'API'],
    });

    assert.ok(html.includes('<section>Inline function</section>'));
    assert.ok(html.includes('<footer>2026-04-30 - 2 links</footer>'));
  });

  test('should reject non-tagged direct calls', () => {
    const engine = new TemplateEngine();

    assert.throws(() => engine.template('<p>{{ message }}</p>'), {
      name: 'TypeError',
      message: 'TemplateEngine.template must be used as a tagged template literal',
    });
  });
});

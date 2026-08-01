// @ts-check

import TemplateEngine from '../../template-engine/index.js';

const engine = new TemplateEngine();

const renderBadge = engine.html`<span data-kind="{{ kind | lower }}">{{ label }}</span>`;

const renderCard = engine.html`
  <article>
    <h2>{{ title }}</h2>
    <p>{{ summary }}</p>
    <div>
      ${(card) => card.badges.map((badge) => renderBadge(badge)).join('')}
    </div>
  </article>
`;

const renderPage = engine.html`
  <section>
    ${(data) => data.cards.map((card) => renderCard(card)).join('')}
  </section>
`;

const html = renderPage({
  cards: [
    {
      title: 'Inline card',
      summary: 'Small reusable render functions stay near data preparation.',
      badges: [
        { kind: 'Mode', label: 'Tagged' },
        { kind: 'Scope', label: 'Card data' },
      ],
    },
    {
      title: 'Second card',
      summary: 'JavaScript interpolation can map data before template rendering.',
      badges: [
        { kind: 'Mode', label: 'Map' },
        { kind: 'Scope', label: 'Page data' },
      ],
    },
  ],
});

process.stdout.write(`${html}\n`);

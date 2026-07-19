// ═══════════════════════════════════════════════════════════════════════════════
//  Pattern CustomElement vrComponent with External HTML — Custom Element with External HTML Template: ProfileCard
//  ═══════════════════════════════════════════════════════════════════════════════
//  Uses vrComponent for lifecycle. Template loaded from .template.html file.
//  html(templateStr) converts the raw string to a TemplateResult.
//  ═══════════════════════════════════════════════════════════════════════════════

import { vrComponent, html } from '../../core/index.js';

// Load external HTML template at module scope
const templateStr = await (
  await fetch(new URL('./_ProfileCard.template.html', import.meta.url))
).text();
const TEMPLATE = html(templateStr);

class ProfileCard extends HTMLElement {
  static {
    vrComponent(this, {
      tag: 'profile-card',
      css: import.meta.url,   // loads _ProfileCard.css
    });
  }

  handleToggle(id) {
    console.log('toggle', id);
  }

  context() {
    return {
      name: 'Alice',
      todos: [
        { id: 1, title: 'Learn Pix', done: true },
        { id: 2, title: 'Build app', done: false },
      ],
    };
  }

  render(ctx) {
    const result = TEMPLATE;
    result._context = ctx;
    result._scope = this;     // methods = @click handlers
    return result;
  }
}

export { ProfileCard };

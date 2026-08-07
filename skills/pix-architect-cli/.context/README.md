# Documentation

## Overview

is a **[DOMAIN_NAME]** product designed to .

Primary value propositions:

- **[KEY_VALUE_PROP_1]**
- **[KEY_VALUE_PROP_2]**
- **[KEY_VALUE_PROP_3]**

Core feature areas:

- **[FEATURE_1]**
- **[FEATURE_2]**
- **[FEATURE_3]**

## Product Frame

- Primary persona: **[USER_PERSONA]**
- Main records: **[PRIMARY_ENTITY]** and **[SECONDARY_ENTITY]**
- Reference manager: **[DOMAIN_ENTITY_MANAGER]**
- Main logic area: **[DOMAIN_LOGIC_AREA]**

## Architecture Principles

The project stays intentionally simple:

1. **Zero runtime dependencies** - pure vanilla JavaScript only
2. **Light DOM UI** - Custom Elements v1 with shared cascade and native browser APIs
3. **Deterministic domain logic** - business rules remain explicit, traceable, and testable
4. **Local-first workflows** - persistence and recovery must protect user work

## Documentation Map

Use this index to navigate the docs set. These files are the source of truth for planning and implementation.

### Project context

- [project-context.md](./project-context.md)

### Active roadmap

- [ROADMAP.md](./ROADMAP.md)

### Analysis

- [analysis/functional-analysis.md](./analysis/functional-analysis.md)
- [analysis/implementation-roadmap.md](./analysis/implementation-roadmap.md)

### Specs

- [specs/00-sdd.md](./specs/00-sdd.md)
- [specs/01-product.md](./specs/01-product.md)
- [specs/02-domain-glossary.md](./specs/02-domain-glossary.md)
- [specs/03-calculation-engine.md](./specs/03-calculation-engine.md)
- [specs/04-ruleset-config.md](./specs/04-ruleset-config.md)
- [specs/05-architecture-ui-storage.md](./specs/05-architecture-ui-storage.md)
- [specs/06-quality-acceptance.md](./specs/06-quality-acceptance.md)
- [specs/10-rule-routing.md](./specs/10-rule-routing.md)

### Supporting assets

- [schemas/ruleset.schema.json](./schemas/ruleset.schema.json)
- [qa/checklist.md](./qa/checklist.md)

## Working Rules

- Use `specs/02-domain-glossary.md` to preserve vocabulary consistency.
- Use `specs/03-calculation-engine.md` and `specs/04-ruleset-config.md` when changing rules, policies, or derived outputs.
- Use `analysis/functional-analysis.md` and `qa/checklist.md` when modifying user journeys.
- Use `specs/06-quality-acceptance.md` before closing implementation work.

## Skills and Rules

Start from the shared guidance before changing implementation details:

- [rule-custom-element](../.agents/skills/rule-custom-element/SKILL.md)
- [rule-template-engine](../.agents/skills/rule-template-engine/SKILL.md)
- [rule-design-system](../.agents/skills/rule-design-system/SKILL.md)
- [skills-overview](../.agents/skills/README.md)

## Tooling

- `pnpm dev` - start the development server
- `pnpm build` - build for production
- `pnpm clean` - remove build artifacts

## Browser Support

The application relies on modern browser APIs:

- Custom Elements v1
- ES modules
- modern ES6+ syntax

Supported browsers:

- Chrome/Edge 80+
- Firefox 75+
- Safari 13.1+

## Contributing

When contributing to this project:

1. Follow the existing code style
2. Keep domain terminology consistent with the glossary and functional analysis
3. Avoid adding runtime dependencies
4. Keep logic deterministic, traceable, and easy to test
5. Write clear, self-documenting code
6. Update documentation when behavior changes

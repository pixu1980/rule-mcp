# Context Generation Guide

## How the CLI Works

The context generation CLI fills template files with project-specific values. It uses a simple placeholder replacement system.

## Template Format

Template files live in `cli/.context/` and use `[PLACEHOLDER_NAME]` syntax:

```markdown
# [PROJECT_NAME]

[PROJECT_NAME] is a [DOMAIN_NAME] product.
```

## Placeholder Types

### Simple placeholders
```json
{
  "[PROJECT_NAME]": "MyApp",
  "[PROJECT_DESCRIPTION]": "a tool for managing tasks"
}
```

### Numbered group placeholders
```json
{
  "[PERSONA_1]": "Freelancer",
  "[PERSONA_1_DESC]": "Works independently on multiple projects",
  "[PERSONA_2]": "Team Lead",
  "[PERSONA_2_DESC]": "Coordinates work across team members"
}
```

### Numbered groups handled by the CLI
- `USER_STORY_*`
- `PERSONA_*` / `PERSONA_*_DESC`
- `USER_NEED_*` / `ADVANCED_USER_NEED_*`
- `FEATURE_*`
- `SCOPE_ITEM_*` / `OUT_OF_SCOPE_ITEM_*`
- `NON_GOAL_*`
- `ENTITY_*` / `ENTITY_*_DESC`

## CLI Commands

### Interactive wizard
```bash
node cli/cli.js
```

### Pre-fill with JSON
```bash
node cli/cli.js --input ./my-values.json
```

### Add one item at a time
```bash
node cli/cli.js add --type user-need --value "I need quick search"
node cli/cli.js add-persona "Busy freelancer"
node cli/cli.js add-use-case "Create project from template"
```

### Tier profiles
```bash
# Starter: essential only
node cli/cli.js --tier starter --apply

# Standard: progressive with personas + features
node cli/cli.js --tier standard --include-personas --apply

# Deep: full domain + quality
node cli/cli.js --tier deep --include-domain-rules --include-quality-checks --apply
```

### View generated docs
```bash
node cli/cli.js docs                # list all docs
node cli/cli.js docs --doc 1        # show first doc
node cli/cli.js docs --doc analysis/functional-analysis.md
```

## Template-to-Output Pipeline

1. Templates live in `cli/.context/`
2. CLI reads `cli-values.json` (saved state)
3. CLI merges provided values + interactive answers
4. CLI applies values to all template files
5. Output goes to `./.context/`
6. Support files (`TEMPLATE_GUIDE.md`, `*.concrete.md`) stay in template directory

## Custom Template Sections

### Adding a new spec document
1. Create `cli/.context/specs/NN-section-name.md` with placeholders
2. Add placeholders to `cli/data/placeholder-info.json`
3. Add placeholders to `cli/data/placeholder-census.json`
4. Regenerate context

### Adding a new placeholder
1. Add to template files in `cli/.context/`
2. Update `cli/data/placeholder-info.json` with section info
3. Update `cli/data/placeholder-order.json` with display order
4. Update `cli/data/placeholder-examples.json` with example values

## Values File Format

```json
{
  "[PROJECT_NAME]": "MyApp",
  "[PROJECT_DESCRIPTION]": "help teams manage tasks",
  "[DOMAIN_NAME]": "Task Management",
  "[PRIMARY_ENTITY]": "Task",
  "[SECONDARY_ENTITY]": "Project",
  "[PERSONA_1]": "Freelancer",
  "[PERSONA_1_DESC]": "Independent professional",
  "[FEATURE_1]": "Create and edit tasks",
  "[FEATURE_2]": "Organize into projects",
  "[USER_NEED_1]": "I need to track my daily tasks"
}
```

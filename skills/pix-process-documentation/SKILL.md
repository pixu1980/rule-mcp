---
name: rule-process-documentation
description: >-
  Use when setting up Mintlify documentation for rule repositories. Covers docs/ directory, mint.json config, page templates, and local preview.
tags:
  - "process"
  - "documentation"
frameworks: [all]
compatibility: Designed for AI coding assistants
metadata:
  author: rule-engineering
  version: "1.0"
---

# Documentation

## Step 1 - Create the directory structure

All Mintlify files live in `docs/` at the repository root:

```
docs/
├── mint.json              # Mintlify configuration
├── introduction.mdx       # Landing page
├── development.mdx        # Development guide
├── architecture.mdx       # Architecture overview
├── api-reference/         # API docs (backend only)
│   └── overview.mdx
└── images/                # Documentation images
    └── logo.svg
```

## Step 2 - Configure mint.json

```json
{
  "$schema": "https://mintlify.com/schema.json",
  "name": "<Project Name>",
  "logo": {
    "dark": "/images/logo.svg",
    "light": "/images/logo.svg"
  },
  "favicon": "/images/logo.svg",
  "colors": {
    "primary": "<Project primary color> or #0055FF as default",
    "light": "<Project light color> or 3377FF as default",
    "dark": "<Project dark color> or 0033CC as default"
  },
  "navigation": [
    {
      "group": "Getting Started",
      "pages": ["introduction", "development", "architecture"]
    }
  ],
  "footerSocials": {}
}
```

For backend repositories with API endpoints, add an API reference group:

```json
{
  "navigation": [
    {
      "group": "Getting Started",
      "pages": ["introduction", "development", "architecture"]
    },
    {
      "group": "API Reference",
      "pages": ["api-reference/overview"]
    }
  ]
}
```

## Step 3 - Write page templates

### introduction.mdx

```mdx
---
title: Introduction
description: Overview of <Project Name>
---

# <Project Name>

<Brief description of the project and its purpose.>

## Quick Start

<Step-by-step instructions to get running. Copy from README.>

## Key Features

- <Feature 1>
- <Feature 2>
- <Feature 3>
```

### development.mdx

```mdx
---
title: Development Guide
description: How to develop and contribute
---

# Development Guide

## Prerequisites

- ...

## Setup

<Exact commands to clone, install, seed, and run.>

## Scripts

| Command              | Description              |
| -------------------- | ------------------------ |
| `pnpm dev`           | Start development server |
| `pnpm test`          | Run tests                |
| `pnpm test:coverage` | Run tests with coverage  |
| `pnpm lint`          | Lint code                |
| `pnpm format`        | Format code              |
| `pnpm build`         | Build for production     |
| `pnpm seed`          | Run seed data            |

Or `pnpm` scripts.

## Testing

<Coverage thresholds and how to run tests. Reference rules/testing-standards.md content.>
```

### architecture.mdx

```mdx
---
title: Architecture
description: System architecture overview
---

# Architecture

## Overview

<High-level description of the system architecture.>

## Directory Structure

<Project directory tree with descriptions.>

## Technology Stack

| Layer            | Technology          |
| ---------------- | ------------------- |
| Runtime          | Node.js             |
| Language         | TypeScript (strict) |
| Linter/Formatter | Biome 2.0           |
| Testing          | Vitest              |
| CI/CD            | GitLab CI           |
| Containers       | Docker              |
```

## Step 4 - Add the docs script and dependency

Install last version of **mintlify** and add to root `package.json`:

```json
{
  "scripts": {
    "docs": "mintlify dev --dir mintlify"
  }
}
```

## Step 5 - Add new pages

1. Create a new `.mdx` file in `docs/`.
2. Add frontmatter with `title` and `description`.
3. Add the page path to `mint.json` navigation.
4. Verify locally with `pnpm docs` (or `pnpm docs`).

## Edge cases

- **API reference pages**: For backend repos, generate OpenAPI-based pages under `api-reference/`. Mintlify supports OpenAPI spec files natively.
- **Custom domains**: Configure the `"baseUrl"` field in `mint.json` when deploying docs to a custom domain.
- **Versioned docs**: If multiple major versions coexist, use Mintlify's version selector feature in `mint.json`.

---

## See also

- [rule](../rule/SKILL.md) - Central skill index and dispatcher
- [rule-architect](../rule-architect/SKILL.md) - Project architecture wizard

# Documentation Rules

## README.md requirements

Every repository must have a `README.md` at the root containing all of the following sections:

### Mandatory sections

1. **Project name and description** - One-line purpose statement
2. **Architecture overview** - High-level description of the system, its components, and how they interact. Include a text-based diagram if helpful
3. **Prerequisites** - Node version, Docker, npm (or pnpm)
4. **Quick start** - Step-by-step instructions to install, seed, and run
5. **Development workflow** - How to run in dev mode, run tests, lint, format
6. **Seed policy** - Explain that seed is mandatory before first run, how to run it, how to re-seed
7. **Docker usage** - How to build images, run with docker-compose, access services
8. **Documentation** - How to run documentation locally, how to add pages
9. **License** - Unlicensed

Do not include a directory tree.

### For AI Agent repositories, also include

Explain how to add and configure an agent and a tools.

## Documentation policy

- README content must be concrete and copy-pasteable
- Do not use vague instructions like "configure as needed"
- Do not maintain a manual `CHANGELOG.md`

# 002: Design System Apple-inspired per Rubrica PhoneBook

- **Date**: 2026-07-11
- **Status**: accepted
- **Tags**: design-system, ui, electron, react, apple
- **Author**: rule-architect

## Context

Creazione di una applicazione Electron + React per rubrica contatti con design system Apple-inspired. Necessità di avere consistenza visiva in termini di typography proporzionale (major second 1.25), spacings (8pt grid), radii, elevations, colori e motion.

## Decision

Adottare un design system basato su CSS custom properties con: palette Apple-inspired (SF Blues, neutri caldi), tipografia -apple-system con scala 1.25, griglia 8pt per spaziature, ombre morbide Apple-style (6 livelli di elevazione), easing spring per micro-interazioni, e animazioni rispettose di prefers-reduced-motion.

## Consequences

Positivo: consistenza visiva garantita da token CSS centralizzati, facilità di theming, micro-interazioni naturali con easing spring. Negativo: nessun vendor lock-in grazie a CSS puro.

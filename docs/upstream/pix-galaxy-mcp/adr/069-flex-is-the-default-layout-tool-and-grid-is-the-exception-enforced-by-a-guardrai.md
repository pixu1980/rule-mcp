# 069: Flex is the default layout tool and grid is the exception, enforced by a guardrail with a stated-reason escape

- **Date**: 2026-09-03
- **Status**: accepted
- **Tags**: css, guardrails, skills, styleguide, layout
- **Author**: Emiliano Pisu <emiliano.pisu@rule.com>

## Context

Nothing in the corpus said which of flex and grid to reach for, so both read as equal options and a grid could be written for a label and a button. A flex container declares one axis and hands the rest to the content, which is what rows, columns, toolbars, stacks and wrapping card sets are; a grid declares a coordinate system whose tracks must exist before anything occupies them, and that definition then has to be kept in step with every later change. The corpus footprint was small enough to see all of it: `grid` appeared in five skill files, the component templates were already flex, and the CSS styleguide taught `repeat(auto-fit, minmax(min(100%, 17rem), 1fr))` as the way to lay out cards. An interview settled the four questions that mattered: enforcement is blocking with an escape hatch rather than advisory; the rule has to reach the skills, the generated templates, the per-call reminder and route payload, and the agent rules the installer writes into user projects; named areas, subgrid, explicit placement or overlap, and auto-fit/auto-fill tracks all remain legitimate; and the card example becomes flex-wrap with the grid kept as a footnote.

## Decision

Flex first, and grid has to earn itself. The rule is one exported sentence (`FLEX_FIRST` in core/directive) that every surface quotes rather than paraphrases: a new shared guardrail `css-flex-first`, the workflow reminder, the route payload, the installer's instruction block, the shell installer's rules block, the docs, and the skills. The guardrail fails a `display: grid` or `display: inline-grid` unless the stylesheet shows one of the four signals in the same block (grid-template-areas, subgrid, grid-auto-flow, repeat(auto-fit|auto-fill, minmax(...))), or an item places itself somewhere in the same submission (grid-area, grid-column, grid-row), or a comment above the rule states the reason as `/* grid: why */`. Being shared, it applies to every skill and stays silent when there is no CSS. The reminder clause is emitted only when the result actually carries CSS, so a postgres answer is not lectured about layout, and the route payload gains a `styling_contract` only for frontend, ui, platform-web/desktop/expo and the css/html/a11y styleguide routes. The CSS skill gains the canonical section with the four legitimate cases, a conversion table for the common misuses, and the one honest difference between a wrapping flex row and auto-fit tracks: the last line stretches instead of keeping the track widths. The card example is now flex-wrap plus `flex: 1 1 17rem`; the auto-fit grid is the footnote for when tracks must match across rows. Eight framework and platform skills gained a numbered "Flex first" principle beside "Zero CSS classes"; the frontend dispatcher, the patterns skill and the a11y responsive reference carry it too, the last one with its reflow example converted from a `.grid` class to a wrapping flex row.

## Consequences

A grid now costs a sentence explaining itself, which is the point: the four cases are cheap to declare and everything else converts to flex in one line. The escape hatch is deliberately weak - any `/* grid: ... */` comment passes - because the alternative is a check people switch off; it makes the choice visible in review rather than provable by the tool. Enforcing it exposed a gap that predates it: CSS guardrails only looked at a
"CSS block" - a fenced snippet, a `<style>` element, a `CSSStyleSheet` call, or
a file named `.css` - so a stylesheet pasted into `pix_check` with no
`fileName` was invisible to every one of them and reported a pass nobody had
checked. `extractRealCSS` now falls back to treating the whole submission as a
stylesheet when it has the shape of one and none of the markers of a program or
a document, and `external-css` grants it the same exemption a named `.css` file
already had, because that rule exists to keep CSS out of JS and markup and
there is no host document in a bare stylesheet. This strengthens `no-css-classes`
and the rest of the CSS set as a side effect, which is the point: a rule that
skips the most natural call shape is not enforced.

Two heuristics are approximations and are documented as such: an item placing itself vouches for every grid in the same submission, since the container and its children are separate rules and inferring parentage from selector text would be wrong less predictably; and a check receives a snippet, not a stylesheet graph. The guardrail count per skill rises by one (57 for the CSS styleguide, 59 for a frontend route). A new test file holds the rule on all seven surfaces at once, including a sweep that runs every fenced CSS block in the whole skill corpus through the guardrail, so a skill cannot teach a grid it would reject, and a check that output compression cannot strip the "only" the rule turns on. The installed agent rules reach existing machines only on a reinstall, and only
because both installers now refresh the block instead of skipping a file that
already had one: a delimited block is replaced in place, the user's own notes
around it are untouched, and refreshing twice is a no-op. Without that, a rule
added today would have reached fresh installs and nobody else.

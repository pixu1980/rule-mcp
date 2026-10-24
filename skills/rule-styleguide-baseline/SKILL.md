---
name: rule-styleguide-baseline
description: >-
  Use when deciding whether a platform feature is safe to use, or when writing guidance that recommends one. Covers the three Baseline states, what a fallback really costs, progressive enhancement with supports queries, and declaring the project's own support floor in prose and in browserslist.
tags:
  - baseline
  - browser-support
  - progressive-enhancement
  - supports
  - fallback
  - compatibility
  - platform
  - css
  - feature-detection
frameworks: [all]
---

# rule-styleguide-baseline - Is this CSS or platform feature safe to use yet

## Purpose

Every recommendation about a platform feature lands in one of two failure modes
when it says nothing about support. An unqualified "use this" burns whoever
ships it on a runtime that does not have it. A hedge teaches nothing and moves
the decision straight back to the reader.

This skill is the third option: a procedure that produces an answer, and a
convention every other skill in this corpus annotates against.

**A feature recommendation without a support state is incomplete.** It has moved
the risk from the writer to the reader without telling them.

The states are not invented here. They are [Baseline](https://web-platform-dx.github.io/web-features/),
the compatibility signal from the W3C WebDX Community Group, the one MDN prints
on every reference page and the one [`web-features`](https://github.com/web-platform-dx/web-features)
publishes as data.

## The three Baseline states

Not a percentage. A percentage is a fact about the world that changes weekly and
is useless at the moment of writing a line of code. What matters is what you owe
the feature.

| State                    | Means                                                                                                    | What you owe it                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Widely available**     | Interoperable in every Baseline browser for at least 2.5 years, long enough that the long tail has moved | Nothing. A fallback here is code that will never run      |
| **Newly available**      | Interoperable in the latest version of every Baseline browser, but not for long                          | A judgment call, and this skill is mostly about making it |
| **Limited availability** | Not interoperable. One engine, behind a flag, or specified and unshipped                                 | A stated reason, in the code, next to the use             |

Two facts make the table checkable rather than rhetorical:

- **The window is 2.5 years.** That is what separates widely available from
  newly available, and it is why a state replaced a date: the window rolls
  forward on its own, and a date in a document goes stale silently.
- **The browser set is Chrome, Edge, Firefox and Safari**, desktop and mobile,
  as [MDN defines it](https://developer.mozilla.org/en-US/docs/Glossary/Baseline/Compatibility).

Two habits keep it honest:

- **State the state, cite no dates.** "Widely available since March 2023" is the
  same mistake as a percentage: true once, wrong later, and nobody notices.
- **Verify at write time.** Support moves in one direction and faster than a
  document does. The check costs a minute; being wrong costs somebody a bug
  report from a browser you do not have.

Where to check, in a minute:

- the **Baseline badge** at the top of the MDN page for the feature;
- the [`web-features`](https://github.com/web-platform-dx/web-features) entry,
  which also gives the year set the feature belongs to;
- [`mdn/browser-compat-data`](https://github.com/mdn/browser-compat-data) when
  the badge is missing;
- [caniuse.com](https://caniuse.com/) for the long tail of CSS and API details,
  remembering that its support tables are not Baseline.

## The question a fallback actually answers

The instinct is to ask whether a feature works everywhere. That is the wrong
question, because the answer is almost never yes and it does not tell you what
to do.

**Ask instead: what does a user see if it is absent, and is that acceptable?**

Three answers, and each has a different cost:

- **They see something slightly plainer.** No fallback. A rounded corner that is
  square, a transition that is a cut, a color that is close. Ship it.
- **They see something usable but worse.** Usually no fallback either, and this
  is the case people over-serve. A layout that stacks instead of flowing around
  is not broken.
- **They see something broken or nothing at all.** A fallback, or do not use the
  feature. There is no third option here, and this is the only case that earns
  the branch.

**A fallback is not free and it is not temporary.** It is code that has to be
written, tested, carried in the bundle, understood by the next reader, and
eventually deleted. The deletion never happens. Ten years of dead fallbacks in a
stylesheet is what the second question is protecting you from.

A polyfill is a fallback with a worse bill: it ships to every user, including the
ones whose browser did not need it. Choose it when the absent case is the third
answer above, when the polyfill is small enough to measure, and when the feature
is on the path a real user takes. Otherwise, degrade.

## Progressive enhancement, supports queries, and feature detection

**Start from what works everywhere and add the enhancement behind a capability
check.** That is progressive enhancement, and it is the default here because the
absent case is already handled by the cascade or by the platform's own behavior.
Graceful degradation starts from the rich version and works backwards; it costs
more, because every step down is a branch someone has to write and test.

Where a real branch is needed, ask the platform rather than the user agent:

```css
/**
 * FILE: article.css
 * USAGE: Article layout, with a container query where it is available
 * SCOPE: main
 */

main {
  /* The floor: every engine understands this, so it needs no query. */
  display: flow-root;
}

@supports (container-type: inline-size) {
  main {
    container-type: inline-size;
  }
}
```

```js
/**
 * Position the panel against its trigger, where the platform can do it.
 *
 * @param {HTMLElement} panel - The panel to position.
 * @returns {void}
 */
export function positionPanel(panel) {
  const anchored = CSS.supports("anchor-name: --trigger");

  panel.dataset.position = anchored ? "anchored" : "fixed";
}

/**
 * Open a dialog, falling back to an inline panel where showModal is absent.
 *
 * @param {HTMLDialogElement} dialog - The dialog to open.
 * @returns {void}
 */
export function openDialog(dialog) {
  const canBlock = "showModal" in HTMLDialogElement.prototype;

  if (canBlock) {
    dialog.showModal();

    return;
  }

  // No top layer here, so the panel opens inline and the page stays reachable.
  dialog.open = true;
}
```

Three things never to do:

- **Never sniff the user agent.** It answers a different question, it is wrong
  about the engines you did not test, and it is wrong again next release.
- **Never test the version.** A version is a proxy for a capability, and the
  capability is directly askable.
- **Never write a check for a widely available feature.** It is noise that reads
  as caution, and the next person maintains it forever because they cannot tell
  whether it still matters.

Two things `@supports` cannot do, and what to do instead:

- **A declaration is not a feature.** `@supports (display: grid)` is true in a
  browser with a broken subgrid, so test the declaration you actually depend on,
  not the one the feature is named after.
- **Selectors and at-rules need their own test.** `@supports selector(:has(*))`
  is the only way to ask about a selector; cascade layers and other at-rules
  have no test at all, so treat them as limited availability until the floor
  says otherwise. The JS side must ask the same question: `CSS.supports()`
  mirrors `@supports`, and `in` on the prototype mirrors a missing method.

## The project declares its own floor

A desktop shell, an embedded webview in a five-year-old point-of-sale terminal,
and a public marketing site are three different answers to the same question,
and re-deriving them feature by feature is how a team ends up with three
different answers inside one repository.

**The floor has two faces, and they must agree.** The prose says why; the
configuration says what the tools compile against.

The prose half, in the project's own agent instructions:

```markdown
## Browser support floor

Current and previous major of Chrome, Edge, Firefox and Safari. Anything widely
available or newly available is available without a fallback. Anything with
limited availability needs a comment naming the reason.
```

The configuration half, in `package.json`:

```json
{
  "browserslist": ["> 0.5%", "last 2 versions", "not dead"]
}
```

That list is read by Lightning CSS, Autoprefixer, esbuild and Babel, so the
stylesheet and the script are compiled against the same floor the prose
describes. A floor that exists only in prose is a wish; a floor that exists only
in configuration is a number nobody can argue with.

Three floors, three answers:

- **Public marketing site:** current and previous major of the four. Widely and
  newly available ship; limited availability needs a fallback or a different
  design.
- **Desktop shell with a bundled engine:** the engine version in the package.
  Newly available is available, widely available is the safe default, limited
  availability is a decision the shell makes once.
- **Embedded webview in a five-year-old terminal:** whatever that webview
  shipped. Most of the modern platform is limited availability here, and the
  floor is a reason to keep a plain baseline rather than a reason to polyfill
  everything.

With that written down, every later question is mechanical: look up the state,
compare to the floor, done. Without it, every feature is a debate, and the
debate is resolved by whoever feels most strongly that day.

## The annotation every distillate carries

When a skill in this corpus recommends a platform feature, it says which state
the feature is in, in the sentence that recommends it. Not a table at the end,
not a link, and not a version number.

Good:

> Container queries are widely available: a component can respond to the width it
> was given rather than the width of the window.

> Anchor positioning is newly available, so a popover that would be unreadable
> without it needs a fallback position; one that is merely better placed does
> not.

> Customizable `<select>` has limited availability. Use it as an enhancement over
> a working native select, never as the thing that makes the control work.

Bad, and each for its own reason:

> Container queries have 93% support. _(A number that was true once.)_

> Anchor positioning works in today's browsers. _(Which ones, and does the
> reader's floor include them?)_

> Use `@supports` for anchor positioning if you need to support older browsers.
> _(Says nothing about whether the fallback is needed at all.)_

## Checklist before recommending a feature

1. Which of the three states is it in, checked now rather than remembered?
2. What does a user see without it, and is that genuinely unacceptable?
3. Does the project's floor already answer this, making the question moot?
4. If a branch is needed, is it a capability check rather than a version or a
   user agent?
5. Does the sentence that recommends it also say the state?

---

## See also

- [rule-styleguide-css](../rule-styleguide-css/SKILL.md) - The layout and
  color features this procedure gets applied to most often
- [rule-platform-web](../rule-platform-web/SKILL.md) - Browser APIs that
  replace a dependency, each with its own support answer
- [rule-styleguide](../rule-styleguide/SKILL.md) - The styleguide index

---

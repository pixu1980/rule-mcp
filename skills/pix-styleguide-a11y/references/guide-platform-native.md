# Platform-Native Accessibility Mapping Guide

> **Target:** Semantic Equivalence | **Scope:** iOS (SwiftUI/UIKit), Android (Compose/Views), React Native, Flutter

The normative layer of this skill (Principle Zero, POUR, Compliance Profiles, Severity, Governance) is platform-agnostic — WCAG 2.2 is technology-neutral, and [WCAG2ICT](https://www.w3.org/TR/wcag2ict-22/) maps it to non-web software.

## Core Rules

1. **Never emit web idioms on native platforms.** ARIA attributes, roles, and CSS pixels do not exist in SwiftUI, Compose, React Native or Flutter. Translate the _intent_, not the syntax.
2. **Prefer native components.** Platform-standard controls (Button, Switch, Alert) ship with built-in semantics and focus behavior.
3. **Touch targets:** **44×44pt (iOS HIG)** / **48×48dp (Material)** satisfy this standard's House Rule by default.
4. **Respect system accessibility settings:** Dynamic Type, `sp` units, `textScaler`, Reduce Motion, increased contrast.
5. **Announce dynamic changes:** Use the platform's accessibility notification API — the native equivalent of `aria-live`.

## Translation Table (semantic intent → platform)

| Web intent                    | iOS (SwiftUI)                                                             | Android (Compose)                                               | React Native                                                                                  | Flutter                                                           |
| :---------------------------- | :------------------------------------------------------------------------ | :-------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- | :---------------------------------------------------------------- |
| `<button>` / `role="button"`  | `Button` or `.accessibilityAddTraits(.isButton)`                          | `Button` or `Modifier.semantics { role = Role.Button }`         | `accessibilityRole="button"`                                                                  | `ElevatedButton` or `Semantics(button: true)`                     |
| Accessible name               | `.accessibilityLabel("…")`                                                | `contentDescription` / `semantics { contentDescription = "…" }` | `accessibilityLabel`                                                                          | `Semantics(label: "…")`                                           |
| `aria-live` / `role="status"` | `AccessibilityNotification.Announcement("…").post()`                      | `Modifier.semantics { liveRegion = LiveRegionMode.Polite }`     | `accessibilityLiveRegion` (Android) / `AccessibilityInfo.announceForAccessibility`            | `SemanticsService.sendAnnouncement(…)`                            |
| Modal + focus containment     | `.accessibilityAddTraits(.isModal)` (UIKit: `accessibilityViewIsModal`)   | `Dialog()` (scopes focus by default)                            | `accessibilityViewIsModal` (iOS); `importantForAccessibility="no-hide-descendants"` (Android) | `showDialog` (route scoping); `Semantics(scopesRoute: true)`      |
| Heading (`<h1>`–`<h6>`)       | `.accessibilityAddTraits(.isHeader)`                                      | `Modifier.semantics { heading() }`                              | `accessibilityRole="header"`                                                                  | `Semantics(header: true)`                                         |
| Disabled state                | `.disabled(true)` (auto-exposed)                                          | `enabled = false`                                               | `accessibilityState={{disabled: true}}`                                                       | `Semantics(enabled: false)`                                       |
| Grouping content              | `.accessibilityElement(children: .combine)`                               | `Modifier.semantics(mergeDescendants = true) {}`                | `accessible={true}` on container                                                              | `MergeSemantics`                                                  |
| Focus after navigation        | `@AccessibilityFocusState`                                                | `FocusRequester.requestFocus()`                                 | `AccessibilityInfo.sendAccessibilityEvent(handle, 'focus')`                                   | `FocusNode.requestFocus()`                                        |
| `prefers-reduced-motion`      | `accessibilityReduceMotion` env / `UIAccessibility.isReduceMotionEnabled` | Respect system animator scale                                   | `AccessibilityInfo.isReduceMotionEnabled()`                                                   | `MediaQuery.of(context).disableAnimations`                        |
| Text zoom equivalent          | Dynamic Type — use system styles                                          | `sp` units, never `dp`                                          | `allowFontScaling` (default `true`)                                                           | `MediaQuery` `textScaler` — never hardcode `textScaleFactor: 1.0` |

## Verification (Native equivalent of Section 8)

- [ ] **Screen reader pass requested:** VoiceOver (iOS) / TalkBack (Android) — human validation; AI MUST NOT claim it ran these.
- [ ] **Font scaling:** UI survives largest system font size without truncation.
- [ ] **Focus/swipe order:** Sequential navigation follows visual/logical order.
- [ ] **Announcements:** Async feedback audible without touching the screen.

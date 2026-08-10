# Testing strategy

Unlike `docs/decisions/`, this is a living reference, not a point-in-time record — update it in
place as the strategy actually changes, don't append a new dated version of it.

## The split: Vitest vs. a real browser

This app is unusually browser-dependent for what it does: Monaco, Web Workers, sandboxed iframes,
`Blob`/object URLs, and cross-origin security behavior are all load-bearing. Vitest runs on
[jsdom](https://github.com/jsdom/jsdom), a JS-only DOM simulation with no real rendering engine and
no real implementation of `Worker`, iframe sandboxing, canvas text measurement, or same-origin/
blob-URL security rules (it does stub `matchMedia`, see `src/test/setup.ts` — but only enough to
let non-Monaco components read it, not enough for Monaco itself). Monaco cannot mount under jsdom
at all, and two real bugs this project actually hit (ADR 0006: blob URLs are origin-scoped;
relative imports can't resolve against a `blob:` referrer) are _browser security-model_ behaviors
with no jsdom equivalent. No unit test, however cleverly written, could have caught either — only a
real browser can.

So testing here is deliberately split by what's actually being verified:

| What you're checking                                                                                            | Tool                                                                          | Where                                      |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------ |
| Pure logic — store rules, utility functions                                                                     | Vitest                                                                        | Committed, runs in CI (`npm test`)         |
| UI chrome that doesn't need a real Monaco instance (e.g. the app shell renders a Run button and theme switcher) | Vitest + Testing Library, with `MonacoEditor` mocked (see `src/App.test.tsx`) | Committed, runs in CI                      |
| Monaco, Web Workers, iframes, blob URLs, sandbox/origin behavior, persistence, sharing, and accessibility       | Playwright, against a real `vite build` + `vite preview`                      | Committed, runs in CI (`npm run test:e2e`) |

## The Playwright suite (`e2e/`)

Phase 9 formalized what had been ad hoc, throwaway browser checks (Playwright driven by hand from
the session scratchpad, one script per phase, discarded after use — Phases 3 through 8 were all
verified this way) into a real committed suite. One spec file per concern, mirroring the app's own
`src/` layout: `editor-and-run`, `settings-and-compiler-options`, `sharing-and-persistence`,
`packages-and-theme`, `onboarding-examples`, `accessibility`.

**Runs against a real production build, not `vite dev`.** `playwright.config.ts`'s `webServer`
calls `npm run e2e:serve` (`vite build && vite preview`), deliberately — Vite's dev server bypasses
Rollup's chunking entirely (native unbundled ESM), so it can't catch bundler-shaped bugs. This is
not hypothetical: the suite's first real run caught a production-only regression where lazy-loading
Monaco (`AppShell.tsx`'s `React.lazy`) let Rollup split monaco-editor's internal dynamic imports
across chunks in a way that broke several editor contributions (CodeLens, Suggest, CodeAction) —
invisible under `vite dev`, real under `vite build`. Fixed via `vite.config.ts`'s `manualChunks`
(forces all of `monaco-editor` into one chunk); see that file's comment for the full story. If a
future check ever "only reproduces in the real build," this is why — reach for `npm run test:e2e`
before assuming a component-level fix will do.

**Accessibility is scanned automatically, not just spot-checked.** `e2e/accessibility.spec.ts` runs
`@axe-core/playwright` against the main shell and each modal/popover-style dialog, plus asserts
focus-trap and focus-return behavior (`src/state/useFocusTrap.ts`) directly. This is how the Phase
9 a11y pass found (and fixed) real WCAG AA color-contrast failures in two of the three curated
themes (`src/theme/presets.ts`'s `colorTextDim` values) and a missing `<main>`/`<h1>` landmark
structure — none of that was something a screenshot-based manual check would have caught reliably.

**A couple of Monaco-specific gotchas worth knowing before adding more specs**, both discovered the
hard way while writing this suite:

- Monaco renders some whitespace in its DOM as U+00A0 (non-breaking space), not a regular space —
  identical when printed, but a literal-space substring assertion against raw `innerText()` fails
  silently unless the checked string happens to contain no spaces. Use `e2e/helpers.ts`'s
  `getEditorText()`, which normalizes this, for any assertion checking editor content that contains
  spaces.
- Monaco's own default keybindings (e.g. Cmd+Z/Ctrl+Z for undo) can be unreliable when dispatched
  via CDP (`page.keyboard.press`) under headless automation, even though the underlying command
  works fine — confirmed by triggering it directly (`editor.trigger(...)`) and via `canUndo()`, both
  of which were consistent every time the raw keypress wasn't. If you're testing something that
  depends on _our_ code (e.g. "is this state undo-able"), test the underlying capability directly
  rather than fighting a third-party library's keybinding delivery — see
  `e2e/onboarding-examples.spec.ts`'s undo test and `MonacoEditor.tsx`'s `window.__cpEditor`
  exposure (added specifically for this, not a stray debug leftover).

## Decision guide

- Writing a pure function or a store? Write a Vitest test for it — no reason not to.
- Adding UI that doesn't need Monaco to actually render? Vitest + Testing Library.
- Touching Monaco, the transpile worker, the sandboxed iframe, persistence/sharing, or anything
  blob/origin-related? Add or extend an `e2e/` spec — `npm run test:e2e` runs it against a real
  production build, in CI, on every push. Assume jsdom cannot verify it, and don't fall back to
  "verified by hand" for anything that can be expressed as a Playwright check; hand-verification is
  still fine for one-off UI polish (does this look right), just not a substitute for coverage that
  can be committed.

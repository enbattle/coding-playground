# Testing strategy

Unlike `docs/decisions/`, this is a living reference, not a point-in-time record — update it in
place as the strategy actually changes (e.g. once Phase 9 lands, per below), don't append a new
dated version of it.

## The split: Vitest vs. a real browser

This app is unusually browser-dependent for what it does: Monaco, Web Workers, sandboxed iframes,
`Blob`/object URLs, and cross-origin security behavior are all load-bearing. Vitest runs on
[jsdom](https://github.com/jsdom/jsdom), a JS-only DOM simulation with no real rendering engine and
no real implementation of `Worker`, iframe sandboxing, `matchMedia`, canvas text measurement, or
same-origin/blob-URL security rules. That's fine for most web apps. It is not fine for this one —
Monaco cannot even mount under jsdom (`window.matchMedia is not a function` and similar), and two
real bugs this project actually hit (ADR 0006: blob URLs are origin-scoped; relative imports can't
resolve against a `blob:` referrer) are _browser security-model_ behaviors with no jsdom equivalent
at all. No unit test, however cleverly written, could have caught either — only a real browser can.

So testing here is deliberately split by what's actually being verified:

| What you're checking                                                                                                                      | Tool                                                                          | Where                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Pure logic — store rules, utility functions (e.g. `rewriteRelativeImportsToBareSpecifiers`, `src/files/store.ts`'s entry-file protection) | Vitest                                                                        | Committed, runs in CI (`npm test`)                                                           |
| UI chrome that doesn't need a real Monaco instance (e.g. the app shell renders a Run button and theme switcher)                           | Vitest + Testing Library, with `MonacoEditor` mocked (see `src/App.test.tsx`) | Committed, runs in CI                                                                        |
| Anything touching Monaco, Web Workers, iframes, blob URLs, or sandbox/origin behavior                                                     | A real browser, driven by hand or by a scripted Playwright check              | **Not committed** — done ad hoc per phase from the session scratchpad, thrown away after use |

## Why the real-browser checks aren't committed (yet)

Each phase that touched execution or the editor was verified by launching the actual dev server,
driving a real Chromium instance (Playwright, installed into the session scratchpad, never into
this repo), and reading back either the rendered DOM text or a screenshot — the scripted equivalent
of manually clicking through the app. This is intentionally throwaway: it lives outside
`coding-playground/` so it doesn't pollute the git history with one-off debugging scripts, and it's
re-derived fresh each time rather than maintained as a suite.

That's a deliberate, temporary trade-off, not the end state. **Phase 9 formalizes this into a real
Playwright e2e suite that _is_ committed and runs in CI** (type → run → see output, multi-file
switch, settings persistence round-trip, share-link round-trip — see the phase plan). Until Phase 9
lands, "verified in a real browser" in a commit message means the ad hoc process described above,
not automated coverage — there is a real gap between what's proven to work once, by hand, and what
CI will catch on the next change. Don't read the absence of e2e tests today as an oversight; it's
sequenced deliberately so the e2e suite gets written against a settled execution architecture
instead of chasing a moving target through Phases 3–6.

## Decision guide

- Writing a pure function or a store? Write a Vitest test for it — no reason not to.
- Adding UI that doesn't need Monaco to actually render? Vitest + Testing Library.
- Touching Monaco, the transpile worker, the sandboxed iframe, or anything blob/origin-related?
  Assume jsdom cannot verify it. Run the dev server, check it in a real browser, and say so
  explicitly when reporting the change as done — per this project's own standard (and the top-level
  instruction it's inherited from): type-checking and unit tests verify code correctness, not
  feature correctness.

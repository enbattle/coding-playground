# Verification discipline

`docs/testing-strategy.md` records _which tool_ verifies _which layer_ (Vitest vs. Playwright, and
why). This doc records the methodology underneath that — how "is this actually correct" got
answered throughout the build, including the times the first answer was wrong. It exists because
the specific bugs this caught (a production-only bundler regression, real WCAG AA failures, several
test-script false positives) would not have been caught by a weaker version of this discipline, and
the failure mode on a future change is quietly regressing one of them.

## The core rule

Type-checking and unit tests verify code correctness, not feature correctness. A change that
compiles, lints clean, and passes Vitest has not been shown to work — it's been shown to not
obviously not-work. For anything touching Monaco, workers, iframes, blob URLs, persistence, or
rendered UI, "done" means verified in a real browser (ideally the committed `e2e/` suite; by hand
against the dev server only for something not yet worth a committed spec), not "the checks passed."

## Test against what actually ships

The single highest-leverage discipline in this build: **the e2e suite runs against a real
`vite build` + `vite preview`, not `vite dev`** (`playwright.config.ts`'s `webServer` calls
`npm run e2e:serve`). This is not a style preference — it's the only reason Phase 9's Monaco
chunk-splitting regression got caught at all.

What happened: lazy-loading Monaco (`React.lazy` in `AppShell.tsx`) worked perfectly under
`vite dev` in every manual check. Only when the e2e suite ran against the actual production build
did several editor contributions (CodeLens, Suggest, CodeAction) start throwing "depends on UNKNOWN
service" errors — Rollup's production chunking had split monaco-editor's internal dynamic imports
across chunk boundaries in a way `vite dev`'s unbundled native-ESM serving never exercises at all.
The fix (`vite.config.ts`'s `manualChunks`, forcing all of `monaco-editor` into one chunk) is
trivial once found — the hard part was that a component-level fix would have looked plausible and
been wrong, because the bug wasn't in the component. **Vite's dev server and a real build are
different programs with different bundling behavior; anything bundler-shape-sensitive (chunking,
code-splitting, worker loading) has to be checked against what users actually receive.**

## Isolate before concluding "it's broken"

Every real bug in this build, and every false lead, got resolved the same way: reduce to a minimal
reproduction, then change exactly one variable at a time, before writing a fix.

**Concrete example — the Monaco regression above.** The investigation didn't start by guessing at
Monaco internals. It started by reverting _just_ the `React.lazy` wrapping (keeping every other
Phase 9 change in place) and re-running the same check — confirming the lazy-load boundary
specifically, not "Phase 9 broke something." Then a Rollup `manualChunks` fix was tried and verified
against the same reproduction before being accepted, not assumed to work because it was theoretically
sound.

**Concrete example — a false lead treated as a real bug until checked.** An early full-suite run
showed editor content from two unrelated tests concatenated together, which looked like a real
select-all/replace bug. Re-running the exact same sequence, isolated (`--workers=1`, single test via
`-g`), didn't reproduce it. The actual cause was a leftover `vite preview` process from an earlier
manual debugging session still bound to the target port, being silently reused by
`reuseExistingServer: true` — not a product bug at all. Lesson: **before fixing a "flaky" bug, kill
every stray process and reproduce clean.** A bug that vanishes when you eliminate a variable you
weren't tracking usually means that variable was the cause.

## Distinguish test-script bugs from product bugs

A failing assertion is a claim about the product, but the assertion itself can be wrong. Three
confirmed cases from this build, each only resolved by checking the assertion's assumption directly
rather than patching the code it was "failing":

- **Substring-matching selectors.** Playwright's `:has-text("Load")` matches "Down**load** .ts" —
  clicking what looked like a Load button actually clicked Download. Fixed by using
  `getByRole('button', { name: 'Load', exact: true })` everywhere a short label could collide with a
  longer one, not by touching the Load button's implementation.
- **Non-breaking spaces in Monaco's rendered DOM.** Monaco renders some whitespace as U+00A0, not a
  regular space — visually and when printed to a terminal, indistinguishable from a real space, but
  a literal-space substring assertion against raw `innerText()` fails silently. Confirmed via a
  direct char-code dump (`Array.from(text).map(c => c.charCodeAt(0))`) before concluding this was
  the cause, not a formatting bug in Prettier's output. `e2e/helpers.ts`'s `getEditorText()` exists
  specifically to normalize this.
- **CSS `text-transform` vs. DOM content.** A `KEYBOARD SHORTCUTS` heading is styled uppercase via
  CSS; `innerText()` reflects the rendered (uppercase) text, while `getByRole`/`getByText`
  accessible-name computation reflects the actual DOM content (mixed-case). An assertion comparing
  against the wrong casing looked like a broken button; it was a wrong assumption about which API
  reflects which layer.

The pattern in all three: when an assertion fails in a way that doesn't match a plausible product
bug, check what the assertion is actually measuring before touching product code.

## Test the actual capability, not a third-party library's UI automation surface

Monaco's own Cmd+Z/Ctrl+Z keybinding proved unreliable when dispatched via Playwright's
`page.keyboard.press` under headless CDP automation — failing in the test runner's environment
while succeeding reliably in a standalone script driving the identical sequence. Direct
instrumentation (`model.canUndo()`, `editor.trigger('x', 'undo', null)`) confirmed the underlying
undo command and undo-stack registration both worked correctly every time; only the raw keypress
delivery was inconsistent. Rather than fight a third-party library's keybinding wiring — which this
app doesn't own and isn't what the test is actually meant to verify — the test was rewritten to
assert the real thing under test (does `pushEditOperations` keep the change on the undo stack) via
a small, deliberate `window.__cpEditor` exposure. **If a test is flaky because of _how_ it drives the
UI rather than _what_ the product does, that's a signal to find a more direct way to assert the
capability, not to add retries or loosen the assertion.**

## Automate what humans are bad at judging by eye

Color contrast is the clearest example: all three curated themes' `colorTextDim` values "looked
fine" through Phase 8. An axe-core scan (`e2e/accessibility.spec.ts`) found that two of the three
failed WCAG AA's 4.5:1 threshold by a real margin (3.27–3.75:1) against every surface they were
rendered on. The fix wasn't guesswork either — computed via the actual WCAG relative-luminance
formula for each candidate value against every background it appears on, not "this looks a bit
lighter now." **For anything with an objective, computable standard (contrast ratios, valid
JSON/HTML, WCAG rules generally), use the tool that computes it — human eyes are a bad instrument
for a 4.5:1 threshold.**

## Read the library's source before writing a workaround

When compiler-option changes (e.g. toggling `strict`) seemed like they might not be live-updating
Monaco's diagnostics, the first instinct was to write a manual revalidation trick (a no-op edit to
force Monaco to re-check). Reading Monaco's actual `DiagnosticsAdapter` source first showed it
already subscribes to `typescriptDefaults.onDidChange` and revalidates every open model itself —
confirmed by testing the built-in behavior directly (toggling `strict` live-changed a diagnostic's
message with no re-edit), then the workaround was deleted as unnecessary rather than kept "to be
safe." **A workaround for a library's assumed limitation should be justified by reading the
library's actual behavior, not by the workaround compiling and seeming to help.**

## A fix isn't done until it's re-verified, and the whole chain is still green

Every fix in this build was re-run against the same reproduction that found it before being
considered resolved — not assumed fixed because the change looked correct. And every commit in this
project's history was preceded by the full local chain
(`format:check && lint && typecheck && test && build`) passing, plus a real-browser pass for
anything in scope for one — see `AGENTS.md`'s Commands section for the exact chain, and
`docs/testing-strategy.md` for what belongs in `e2e/` versus a one-off manual check.

# Engineering principles

The design principles this repo writes code against, what each one means _here_ (a
function-and-store React app, not a class hierarchy), and where each one stops paying for itself.
Like `docs/testing-strategy.md`, this is a living reference — update it in place when the guidance
changes, don't append dated versions. `AGENTS.md`'s "Design principles" section holds the short,
binding version of this; this doc holds the reasoning and the examples.

Most of these principles don't have a live trigger in the code yet. They're written down now so
that the first time one does — a third copy of a rule, a second implementation of something, a
module that starts doing two jobs — there's an agreed answer instead of a fresh debate.

## The rule of thumb

> Write the simplest code that meets today's need, with its test first. Add a split, an interface
> or a shared helper only when you can name the change or test it makes easier, and when you can't
> tell whether two copies share a rule, wait for a third.

Everything below is an elaboration of that sentence. None of it is a law: these principles pull
against each other (DRY against KISS, SOLID against YAGNI), and the right call depends on the
situation. When they conflict, prefer the option that's less abstract and easier to undo.
**Duplication is far cheaper than the wrong abstraction** — a duplicate costs one extra edit later;
a wrong abstraction costs every caller, and tends to get bent further instead of removed.

## Quick reference

| Principle | Core focus               | Prevents                                    | Applies here when…                                                  |
| --------- | ------------------------ | ------------------------------------------- | ------------------------------------------------------------------- |
| YAGNI     | Scope restraint          | Speculative, unused code paths              | Always — the default answer to "should we add this in case"         |
| KISS      | Clarity                  | Unneeded moving parts                       | Always — pick the option with fewer parts that still meets the need |
| DRY       | One home per rule        | Copies of a rule drifting apart             | The same _rule_ (not just similar text) appears a third time        |
| SoC       | Module boundaries        | Logic tangled with side effects / god files | Logic can't be tested without mocking a store, `window`, or Monaco  |
| SOLID     | Structure under change   | A small change rippling everywhere          | Selectively — see the translated version below                      |
| TDD       | Verification before code | Untested, unrefactorable code               | Pure logic, stores, bug fixes; spec-first or spike-then-test above  |

## YAGNI — you aren't gonna need it

This repo's strongest existing habit, already practiced throughout (AGENTS.md's "What NOT to do
here", "don't pre-create empty directories"): multi-file was built then rolled back (ADR 0008), the
`.zip` export was dropped once there was one file (ADR 0010), friendlier diagnostic messages were
built, verified, and reverted (ADR 0012), e2e runs Chromium only until a real trigger appears.

### Speculative seams: one-way doors only

A "seam" is code added now so a future change is easier — an empty hook, a stub, an unused
parameter. The test for whether one is justified is whether the thing it protects is a **one-way
door**:

- **Two-way doors — code shape.** Functions, modules, interfaces, options. Cheap to add the day
  they're needed, because all the code that would change is in this repo. A seam here buys nothing
  you couldn't do later, and costs reading and maintenance until then. Don't add it.
- **One-way doors — data that has left the program.** `localStorage` contents, share-link payloads,
  exported settings files. Once one is sitting in a user's browser or a link is posted somewhere,
  it can't be recalled or rewritten. A small seam here is worth it, because retrofitting it later
  means guessing at the shape of data you can no longer see.

How the existing seams sort under that test:

| Seam                                                                                                                                                             | Door    | Status                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SETTINGS_SCHEMA_VERSION`, the `version` on each persisted store, the `v` field in share payloads (`src/sharing/shareLink.ts`)                                   | One-way | Justified. Every stored blob and every share link is stamped with the shape it was written in. (`v` is written but not yet read — that's fine; read it the day the format changes.)                                                                                                                                                                                                                            |
| The identity `migrate` functions on each persisted store                                                                                                         | Two-way | Kept. Zustand only calls `migrate` when stored and current versions differ, so these never run until a bump; adding one at that point would be just as easy. They're one line each and a consistent pattern across five stores, so a new persisted store follows the same pattern rather than becoming the odd one out. Don't delete them as a cleanup, and don't take them as precedent for code-shape seams. |
| `src/theme/generate.ts` (throwing stub), the disabled "Custom…" entry in `ThemeSwitcher.tsx`, `customTokens`/`setCustomTheme` in `src/theme/store.ts` (ADR 0004) | Two-way | Grandfathered. This rule wouldn't add it today: it protects a feature that's blocked on a backend that doesn't exist, and the intended design could live in `docs/future-implementations.md` instead. Leave it as is, but don't extend it. When the feature is scoped, build it out or remove it; don't add more scaffolding around it.                                                                        |

## KISS — keep it simple

Fewer moving parts, platform features over libraries, the obvious implementation over the clever
one. Repo examples: `clearLocalData()` reloads the page instead of maintaining a reset path per
store; the `.ts` download instead of a zip library; share links in the URL hash instead of a
backend. "Simple" means few parts and few concepts, not "familiar" — a 40-line function that reads
top to bottom beats three 10-line functions you have to jump between, if nothing else calls those
three.

## DRY — don't repeat yourself

DRY is about _knowledge_, not text: one rule should have one home, so changing the rule means one
edit. Two blocks that look alike but encode different rules aren't duplication, and merging them
couples things that should change independently.

- **Not duplication:** the two `TARGET_MAP`s (`src/editor/monacoCompilerOptions.ts`,
  `src/execution/transpile.worker.ts`). Same keys, but each maps to a different library's enum, and
  ADR 0007 deliberately has each consumer map independently.
- **Already DRY, the right way:** `src/packages/registry.ts` (one entry drives execution,
  IntelliSense, and the panel), `SETTINGS_SCHEMA_VERSION`, the keyboard-shortcuts list shared by
  Settings and the Welcome modal, `waitForMonaco()` in `e2e/helpers.ts`.
- **At the rule of three, and already drifting:** "copy the recognized compiler-option keys from
  an untrusted object into the store" appears in `src/sharing/shareLink.ts`,
  `src/settings/localData.ts`, and `src/sharing/savedPlaygroundsStore.ts` (plus a near-copy for
  editor settings in `localData.ts`). The copies already differ — the saved-playground one skips the
  `key in` check — and none of them validates values, only keys. That drift is exactly what DRY
  exists to prevent; it's the first candidate for a shared, tested helper the next time any of
  those files is touched.
- **At two, so wait:** the blob-download dance in `exportSettings()` and `downloadCurrentCode()`.

When an abstraction turns out wrong — callers start passing flags to make it behave differently for
each of them — inline it back into the callers and re-extract from what they actually share. Don't
add another parameter.

## SoC — separation of concerns

Already the backbone of the layout: one directory per domain, one Zustand store per concern, three
independent TypeScript engines (Monaco's worker for diagnostics, the transpile worker for execution,
the iframe for running — ADR 0002).

The practical test at the function level: **can this logic be unit-tested without mocking a store,
`window`, `history`, or Monaco?** If not, the logic and its side effects are in one function. Split
it into a pure core (parse, validate, compute — takes values, returns values) and a thin shell
(reads stores, writes stores, touches the DOM). `src/sharing/shareLink.ts` is a worked example. It
started as one `applyShareLinkFromHash()` doing decoding, validation, `history.replaceState`, and
store writes, with no unit test. Adding the "ask before replacing your work" prompt split it into
pure `parseSharePayload()` and `needsConfirmation()` (unit-tested) and a thin
`openShareLinkFromHash()` shell. The split happened when a change needed it, not before.

`MonacoEditor.tsx` is deliberately the integration hub between the stores and Monaco — that's its
one concern, and it's fine for it to have many small subscription effects. Keep _logic_ out of it:
pure helpers like `severityFrom` and `toEditorOptions` are the right shape, and should move out to
a testable module the moment one needs a test.

## SOLID, translated

SOLID was written for class hierarchies; this codebase has functions, hooks, and stores, and
shouldn't grow classes just to apply it. What carries over:

- **Single responsibility** — one reason to change per module and per store. Same as "one store per
  concern".
- **Open/closed** — extend by adding data, not editing logic: a package is one registry entry, a
  theme is one `THEME_PRESETS` entry, a command is one `getCommands()` entry. When an `if`/`switch`
  grows a third case for "another kind of the same thing", consider a data table instead.
- **Liskov substitution** — rarely applies. The one real case is `ThemeTokens`: any theme, curated
  or a future generated one, must work in every component and meet the same contrast bar (ADR 0004,
  `generate.ts`'s comment).
- **Interface segregation** — components subscribe to the store slice they use
  (`useStore((s) => s.x)`), not the whole store; props take values, not whole store objects.
- **Dependency inversion** — pass a dependency in (a value, a function) when that's what makes a
  piece of logic testable; otherwise calling `useXStore.getState()` directly is fine. No interfaces
  with a single implementation, no DI containers.

## TDD — test-driven development, and where it's weak here

The part of TDD that matters most is **every test has been seen failing for the right reason.** A
test that has never been red might not be testing anything. Writing the test first is the cheapest
way to guarantee that; where writing first doesn't work, the red has to be shown some other way.

This app is unusually browser-dependent (see `docs/testing-strategy.md` for which tool covers which
layer), so how strictly test-first applies depends on the layer:

| Layer                                                                       | Test first?          | How                                                                                                                                                                                |
| --------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pure logic — parsers, validators, mappers, filters, string builders         | **Yes**              | Failing Vitest test, then the code. Fast loop: `npm run test:watch`.                                                                                                               |
| Stores — actions and derived values                                         | **Yes**              | Vitest against the store directly (`setState` to arrange, call the action, assert on `getState()`).                                                                                |
| Bug fixes, any layer                                                        | **Yes**              | Reproduce as a failing test at the lowest layer that can show it, then fix.                                                                                                        |
| UI that doesn't need Monaco                                                 | Preferred            | Testing Library, querying by role and accessible name.                                                                                                                             |
| Monaco, workers, iframes, blob URLs, persistence, a11y — **behavior known** | Spec first           | Write the failing `e2e/` spec, then implement. Slow loop (each run rebuilds), so run just that spec with `npx playwright test e2e/<file>.spec.ts -g "<name>"`.                     |
| Same layer — **behavior not yet known** (how a library actually behaves)    | No: spike, then test | Explore and instrument by hand (`docs/verification-discipline.md`), throw the spike away, then commit a spec. Show it's red by temporarily reverting the fix and watching it fail. |
| Visual polish — does it look right                                          | No                   | Check by hand. Anything with a computable standard (contrast, a11y rules) still goes through a tool (axe).                                                                         |

Where TDD is weak here, and what to do about it:

- **The slow loop is a design signal.** If a change can only be tested through e2e, check whether
  there's logic inside it that could move into a pure function. TDD that function in Vitest, and
  leave e2e covering only the wiring. Most of the share-link, settings-import, and command-filter
  logic is this shape.
- **Unknown library behavior** — the Monaco contribution-registration gaps in `AGENTS.md` were all
  discovered by exploring, not specified up front. A test written before you know the behavior just
  encodes a guess. Spike first; the test comes when there's something real to assert.
- **No objective oracle** — "this layout looks balanced" has no assertion. Don't fake one with
  brittle snapshot or pixel tests.

**Existing code:** most current pure logic predates this doc and has no unit tests
(`filterCommands`, share-link decoding, settings import, `extractRelativeSpecifiers` in
`src/packages/esmSh.ts`, `escapeForInlineScript` in `src/execution/sandboxHarness.ts`,
`resolveActiveTokens`, `isRuntimeConsoleMessage`). Don't backfill it all at once; add tests to a
module when you change it.

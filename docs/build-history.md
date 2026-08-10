# Build history

A phase-by-phase account of how this repo got to its current state, and — separately — every real
deviation from the original 10-phase plan. This is the narrative companion to `docs/decisions/`
(which records _why_ for individual technical calls) and `docs/testing-strategy.md` (which records
_how correctness gets verified_): this doc records _what shipped when, and in what order_, so a
future session — on this project or a different one — can understand the arc without reconstructing
it from `git log`.

Like `docs/testing-strategy.md`, this is a living document for the phases still ahead (right now,
just deploy) — append to it rather than treating it as closed once Phase 10 finishes.

## Phase 1 — Scaffold

Vite + React 19 + TypeScript strict, oxlint (not ESLint), Prettier, Vitest + Testing Library, a CI
workflow running the full check chain. `AGENTS.md` and `docs/decisions/` established here,
right-sized from `cortex-workspace`'s multi-repo agent-harness patterns — the repo-purpose/
conventions doc and a lightweight ADR log, deliberately _not_ the full change-folder/spec-pipeline
machinery, since nothing about a solo single-repo MVP triggers needing it (see AGENTS.md's "What
NOT to do here"). ADRs 0001–0003 recorded immediately: Monaco as the editor, worker + sandboxed-
iframe execution, curated esm.sh package allowlist — the three biggest architectural bets, decided
before any of their code existed.

## Phase 2 — Design system & app shell

Three curated themes (Instrument Panel, Terminal Botanical, Cartographic Blueprint), chosen from a
5-direction visual comparison via the `frontend-design` skill — picked specifically to avoid the
generic Tailwind/shadcn "AI vibe-coded" look. Implemented as a token system, not per-theme component
variants: every themed value is a `--cp-*` CSS custom property applied at runtime
(`src/theme/tokens.ts`), so components are built once and themes are data (ADR 0004). Each theme's
signature decorative motif stays deliberately outside the token system — that asymmetry is what
makes the themes feel distinct rather than palette-swapped. The "describe your own theme" feature
was scaffolded end-to-end without being implemented (store shape, disabled UI slot, a documented
intended flow) specifically so wiring in real generation later touches nothing else — still not
implemented as of Phase 10; the seam is waiting for a backend that doesn't exist yet.

## Phase 3 — Core editor + execution

Real Monaco wired in (TS language service, diagnostics, IntelliSense), replacing Phase 2's
placeholder. Execution: a Web Worker transpiles via the `typescript` package, independent of
Monaco's own TS worker; emitted JS runs in a fresh sandboxed iframe per run
(`sandbox="allow-scripts"`, no `allow-same-origin`) with console output and runtime errors captured
via `postMessage`. Two dependency-shape surprises turned into ADR 0005 (TypeScript 7 dropped the
classic browser-embeddable compiler API — pinned to `^6.x`) and an AGENTS.md note (monaco-editor
0.56 moved its language-feature modules to direct named exports, `monaco.languages.typescript` is
now a deprecated stub). First real Playwright-in-a-browser verification of this whole build:
console output, runtime errors with stack traces, execution halting correctly after a top-level
throw.

## Phase 4 — Multi-file virtual FS + preview _(later rolled back — see Deviations)_

A flat-namespace virtual filesystem (create/rename/delete, tabs, protected `/index.ts` entry),
working cross-file `import` execution, and a Preview tab rendering `/index.html` live. Getting
cross-file execution working produced ADR 0006 (blob URLs are origin-scoped, so a sandboxed
opaque-origin iframe can't load a parent-created blob URL — blob creation had to move inside the
iframe itself; relative import specifiers can't resolve against a `blob:` referrer at all, so
compiled cross-file imports got rewritten to bare specifiers matching import-map keys). This phase's
mechanics all worked and were verified end-to-end — the rollback in Phase 4.5 was a UX judgment
call, not a bug fix.

## Phase 4.5 — Roll back to single-file _(deviation — not in the original plan)_

See **Deviations → Multi-file rollback** below.

## Phase 5 — Compiler options + diagnostics

A curated tsconfig-shaped option set (target, strict, esModuleInterop, experimentalDecorators,
noUnusedLocals, noUnusedParameters) behind a header popover — `module` deliberately not exposed
since execution hard-requires ESM output. Option values are plain strings/booleans, not tied to
either Monaco's or the real `typescript` package's enums, so each consumer maps independently from
one source of truth (ADR 0007). Monaco's own diagnostic markers mirrored into a plain store,
surfaced as a Problems tab with click-to-jump. Verified live: toggling `strict` live-changes a
diagnostic's severity with no re-edit — confirmed Monaco's `DiagnosticsAdapter` already subscribes
to `typescriptDefaults.onDidChange` itself (a manual revalidation trick was written first, then
removed once this was confirmed via Monaco's own source, not assumption).

## Phase 6 — Packages panel

Six curated packages (zod, date-fns, nanoid, immer, lodash-es, rxjs — ADR 0003's allowlist made
concrete), pinned versions, resolved via esm.sh. Two things were verified against the real service
rather than assumed: that esm.sh's `X-TypeScript-Types` header is actually CORS-exposed (checked via
`curl`, not just "should be"), and that a single `.d.ts` fetch isn't enough — real packages split
types across files referencing each other via relative specifiers, sometimes hosted at unrelated
paths (lodash-es). `src/packages/esmSh.ts` recursively crawls this, keeping real-fetch-URL and
virtual-Monaco-URL spaces in sync via structural `new URL(spec, base)` resolution against two
different bases rather than manual path bookkeeping (ADR 0009). Verified end-to-end: a full
`nanoid()` program actually executing in the sandbox with zero Problems-panel diagnostics (confirms
the crawled types resolved correctly), and a non-allowlisted import failing with a clear error
rather than silently.

## Phase 7 — Settings system + command palette

A functional ⌘K command palette (previously a decorative hint), a Settings modal (editor
prefs — live via `editor.updateOptions`, no remount — plus a keyboard-shortcuts reference and
export/import/clear for local data), and Prettier-backed formatting registered as Monaco's own
`DocumentFormattingEditProvider`. All persisted stores unified under one schema-version constant
with a `migrate` seam, even though nothing needed migrating yet — the seam is what future-you edits
instead of retrofitting versioning under time pressure. `useRunner` became a real store
(`runnerStore.ts`) once Run had three separate callers needing the same `run()`. Two real Monaco
bugs found by instrumenting the browser directly rather than guessing (both now in AGENTS.md):
`editor.getAction()`/`getSupportedActions()` return nothing on this minimal-import editor instance
(fixed via `editor.trigger()` instead), and Monaco captures Enter keydowns while focused, silently
breaking a window-level ⌘Enter listener while typing (fixed by also registering the shortcut
directly on the editor).

## Phase 7.5 — Floating theme switcher _(scope addition — not strictly in the original plan)_

Moved out of the header into its own floating pill above the shell, freeing header space and giving
it a dedicated affordance — this was a direct response to user feedback that it felt cramped in the
header, not part of the original phase breakdown. Widened the shell from 1180px to 1400px in the
same pass. Two follow-on layout bugs (pill overlapping the Run button; a page scroll from the pill's
added height) were both root-caused to the same pattern — hardcoded pixel/viewport-height
assumptions breaking the moment the assumption they depended on changed — and fixed by switching to
real flexbox constraints instead of magic numbers. Also: found and fixed a real test-infrastructure
gap surfaced while updating tests for this (`afterEach(cleanup)` was missing from
`src/test/setup.ts`, so multiple `render()` calls in one file stacked DOM instead of resetting).

## Phase 8 — Persistence & sharing

Autosave (the editor was in-memory-only before this — every reload reset to the sample snippet),
no-backend shareable links (`lz-string`-compressed URL hash carrying code + compiler options — the
hash never reaches a server, so it needs no backend), and a local named-snapshot list ("saved
playgrounds"). Export dropped the originally-planned `.zip` for a plain `.ts` download (ADR 0010) — Phase 4.5's rollback already left exactly one file to package, so a zip library would have
added a dependency to solve a problem that no longer existed. Found and fixed a real gap while
wiring up "Load saved playground": `MonacoEditor` only ever seeded its model from the store once at
mount, so loading a snapshot silently updated the store while the visible editor stayed frozen.
Fixed with a store→editor sync subscription.

## Phase 8.5 — Theme-switcher / command-palette redundancy cleanup _(deviation — not in the original plan)_

See **Deviations → Theme-switching redundancy** below.

## Phase 9 — Polish

The biggest single phase for real bugs found via verification, not just features shipped:

- **Perf**: lazy-loaded Monaco out of the main bundle (`React.lazy` + `Suspense`), cutting the
  initial JS chunk from ~4.09MB to ~235KB gzip. This directly caused a production-only regression —
  Rollup split monaco-editor's internal dynamic imports across chunks under the new lazy boundary,
  breaking several editor contributions (CodeLens, Suggest, CodeAction) with "depends on UNKNOWN
  service" errors that were completely invisible under `vite dev` and only reproduced against a real
  `vite build`. Fixed via a `manualChunks` rule forcing all of `monaco-editor` into one chunk. See
  `docs/verification-discipline.md` for the full investigation.
- **Responsive fallback**: skips mounting Monaco entirely below ~800px width (not just hiding it
  with CSS — the lazy chunk shouldn't even be fetched on a screen too narrow to use it).
- **A11y pass**: focus-visible styling, a real focus trap + return-focus for the Settings modal and
  command palette, a `<main>`/`<h1>` landmark structure, and WCAG AA color-contrast fixes for two of
  the three curated themes — all caught by an automated axe-core scan, not by eye. See
  `docs/verification-discipline.md`.
- **Onboarding**: three example snippets loadable from the command palette, plus a Settings header
  button (previously only reachable via the palette).
- **e2e suite**: formalized the ad hoc, throwaway Playwright checks used by hand for every phase
  since Phase 3 into a committed suite (`e2e/`, wired into CI), deliberately run against a real
  `vite build` + `vite preview` rather than the dev server — see the perf bullet above for why that
  distinction is load-bearing, not stylistic.
- Found and fixed the same class of bug as Phase 8's saved-playground gap, this time for "Load
  Example": fixed by using `model.pushEditOperations` (not `setValue()`) specifically so external
  content changes stay on Monaco's undo stack.

## Phase 10 — CI hardening & deploy

CI hardening done: concurrency cancellation (a new push cancels an in-flight run for the same
branch/PR), least-privilege `permissions: contents: read`, `timeout-minutes` on both jobs (a hung
`webServer` startup is a real failure mode — it happened locally, more than once, while building the
e2e suite), and Playwright browser-binary caching. Deploy (picking and configuring a static host) is
still open — deliberately deferred, not forgotten; the app's architecture (no backend, no
client-side router, share links living entirely in the URL hash) means deploy is close to "point any
static host at `dist/`" once a host is chosen.

## Deviations from the original plan

Three real forks in the road happened that weren't anticipated in the original phase breakdown.

### Multi-file rollback (between Phase 4 and Phase 5)

Phase 4 shipped a working multi-file virtual filesystem with real cross-file execution — the
mechanics were sound and verified. After using it, it turned out to add more confusion than value:
`.css`/`.json` files were creatable but functionally inert, and nothing in the UI explained the
entry-file convention or that Console/Preview shared one running iframe. Rather than patch the
specific gaps, the call was to cut scope back to single-file TypeScript-only and revisit multi-file
later _with_ the UX designed in from the start. Full reasoning and what got removed:
`docs/decisions/0008-roll-back-multi-file-and-preview.md`. This decision had a real downstream
effect that shows up twice more: ADR 0010 (no `.zip` export — there was only ever going to be one
file to package after this) and this doc's Phase 8 entry.

### Theme-switching redundancy (between Phase 8 and Phase 9)

By Phase 8, both the floating theme pill (added in Phase 7.5) and the command palette's per-theme
"Switch to X" commands did the same thing. Since the pill was specifically built as a dedicated,
always-visible affordance for exactly this, it stayed as the single source and the palette entries
were removed — a small cleanup, but worth recording because it's the kind of redundancy that's easy
to reintroduce if a future session doesn't know the pill was the deliberate choice.

### Next.js migration considered and declined (after Phase 8)

Raised as a question about "future-proofing" for accounts, cloud save, and collaboration. Evaluated
seriously rather than dismissed outright — full reasoning in
`docs/decisions/0011-stay-on-vite-not-nextjs.md`. Short version: none of those three features are
frontend-framework concerns, Next.js buys zero benefit for an app that's 100% client-only by
construction, and there's a concrete migration cost (three places already depend on Vite-specific
worker-import syntax with no Next equivalent). The actual trigger condition for revisiting this is
recorded in the ADR — it's a narrower bar than "we added a backend."

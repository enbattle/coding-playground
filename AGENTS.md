# coding-playground — agent context

## What this is

A TypeScript-first, in-browser coding playground/studio: Monaco editor, client-side TS
compilation, a sandboxed console, a curated package allowlist, and a thorough settings system.
No backend — everything runs client-side (see ADR 0011 for why this stays true even once
accounts/cloud-save/collaboration get scoped). Single file only for now — multi-file editing and
the DOM Preview tab were built in Phase 4 and then deliberately rolled back; see ADR 0008 before
reintroducing either.

Read `docs/build-history.md` before picking up work here cold — it's the phase-by-phase account of
what shipped when, including every real deviation from the original 10-phase plan. `docs/decisions/`
has the why for individual architectural calls; `docs/verification-discipline.md` has the how for
knowing something actually works, not just that it compiles — read that one before assuming a change
is done because the checks passed. `docs/engineering-principles.md` is the design-principles
reference (YAGNI, KISS, DRY, SoC, SOLID, TDD — what each means here and when it doesn't apply).
`docs/future-implementations.md` tracks what's deliberately not built yet (accounts/cloud-save,
collaboration, AI theme generation, per-PR previews) and what to do first when picking one up —
check it before scoping any of those from scratch.

## Conventions

- TypeScript strict mode throughout; no `any` without a comment explaining why it's unavoidable.
- Semicolons, single quotes, 100-char print width — enforced by Prettier, don't hand-format.
- Lint via `oxlint` (not ESLint) — this is the current Vite-scaffold default, faster, mostly
  rule-compatible. Don't add ESLint alongside it.
- State: Zustand stores, one per concern (settings, editor, layout), each with a localStorage
  persistence middleware where the plan calls for persistence. Prefer a store over component-local
  state as soon as more than one UI entry point needs to trigger the same behavior — `useRunner`
  started as a component-local hook in Phase 3 and became `src/execution/runnerStore.ts` in Phase 7
  once the Run button, the command palette, and the global ⌘Enter shortcut all needed to call it.
- A new persisted store passes `storage: persistStorage` (`src/settings/safeStorage.ts`) to
  `persist`, like the existing five. Zustand's default storage swallows quota errors, so without it
  a full `localStorage` stops saving silently instead of showing the footer warning. Also add its
  key to `PERSISTED_KEYS` in `src/settings/localData.ts` so "Clear local data" covers it.
  The one deliberate exception is notes (`src/notes/store.ts`): sessionStorage, private to the tab,
  never in share links, saved playgrounds or settings export (ADR 0014). Don't move notes into
  any of those, or onto `persistStorage`, without revisiting that ADR; it's a privacy decision.
- Components are named exports except `App.tsx`'s default export (kept for Vite/React convention).
- New dependency? Run `npm audit` before committing it. Prefer a `package.json` `overrides` entry
  to force a patched transitive version (see `dompurify` via `monaco-editor`) over downgrading the
  direct dependency — don't let `npm audit fix --force`'s suggestion be the default choice.
  Before trusting an override, check that the bundle actually imports that package. `dompurify`
  is the counterexample: Monaco ships its own vendored copy
  (`monaco-editor/esm/vs/base/browser/dompurify/dompurify.js`), so the override only quiets
  `npm audit` and changes nothing users receive. To judge a DOMPurify advisory, check the vendored
  copy's version and how `domSanitize.js` calls it. Monaco doesn't use `IN_PLACE`, for example.
- Directory layout (populated incrementally, phase by phase — don't pre-create empty ones):
  `src/editor/`, `src/execution/`, `src/settings/`, `src/packages/`, `src/layout/`, `src/state/`
  (cross-cutting hooks with no single domain owner, e.g. `useFocusTrap`), `src/theme/`,
  `src/sharing/` (share links, saved-playground snapshots, code export — Phase 8),
  `src/commandPalette/` (Phase 7), `src/onboarding/` (example snippets, Phase 9; the first-load
  welcome modal), `src/notes/` (the tab-private notepad under the console, ADR 0014). No
  `src/files/` right now — see ADR 0008.
- Layout: `SplitPane` does both splits, editor | output side by side and output over notes stacked
  (`orientation="vertical"`, with `secondCollapsed` for the folded notes header). Extend it rather
  than writing another splitter. A popup inside a pane (tooltip, menu) must use `position: fixed`
  or it gets clipped by the pane's `overflow: auto`; see `NotesPanel.tsx`'s tooltip and the
  `fixedOverflowWidgets` note below.
- Adding a curated package (ADR 0003, ADR 0009): add one entry to `src/packages/registry.ts` —
  verify it resolves on esm.sh first (`curl -sI https://esm.sh/<name>@<version>`, check for a 200
  and an `x-typescript-types` header) before pinning the version. Execution and Monaco IntelliSense
  both derive from that one entry automatically; no other file needs touching.
- Theming: every themed value is a `--cp-*` CSS custom property (see `src/theme/tokens.ts`), never
  a literal color/font in component CSS — this is what lets themes multiply without components
  being rebuilt per theme. Exceptions are deliberate and narrow: fonts come only from the
  `FontKey` registry (`src/theme/fonts.ts`), and each curated theme's signature decorative motif
  lives in `src/theme/motifs.tsx`, not in tokens. See
  `docs/decisions/0004-theme-tokens-and-ai-ready-generation.md` before changing this system.

## Design principles

Full reasoning, repo examples, and where each principle stops applying:
`docs/engineering-principles.md` — read it before adding a module, store, shared helper, or any
other new abstraction. The binding rules:

- **Rule of thumb:** write the simplest code that meets today's need, with its test first. Add a
  split, an interface or a shared helper only when you can name the change or test it makes
  easier, and when you can't tell whether two copies share a rule, wait for a third. Duplication is
  far cheaper than the wrong abstraction.
- **Test first where it works:** pure logic, stores, and every bug fix start with a failing test.
  Browser-only behavior starts with a failing `e2e/` spec if the behavior is known, or a spike then
  a spec if it isn't. See the layer table in that doc.
- **Every new or changed test must have been seen failing for the right reason** — by writing it
  first, or by temporarily reverting the fix and watching it go red.
- **Name the payoff:** when a commit adds a new abstraction (shared helper, module split,
  interface, option, seam), its commit message body says which change or test it makes easier.
  If you can't name one, don't add it.
- **Speculative seams only at one-way doors** — persisted/shared data formats (localStorage,
  share links, exported files), never code shape. Existing seams and their status are listed in
  that doc; don't extend the grandfathered ones.
- These are heuristics, not laws. Departing from one is fine when it's the better call; say why
  in the commit message (or an ADR, if it's of ADR weight).

## Monaco integration notes

- Import monaco-editor subpaths _without_ the `esm/vs/` prefix (e.g.
  `monaco-editor/editor/editor.api`, not `monaco-editor/esm/vs/editor/editor.api`) — the package's
  `exports` map already implies that prefix; including it resolves to a nonexistent doubled path.
- `monaco.languages.typescript` is a deprecated stub (`{ deprecated: true }`) in this monaco-editor
  version. The real API (`typescriptDefaults`, `ScriptTarget`, `ModuleKind`, `ModuleResolutionKind`,
  etc.) is now direct named exports from `monaco-editor/languages/features/typescript/register`, and
  that module's `ModuleResolutionKind` only has `Classic`/`NodeJs` (no `Bundler`). The base language
  ID + tokenizer registration is a separate import:
  `monaco-editor/languages/definitions/typescript/register`. Both are side-effect imports that must
  happen before creating a model with `languageId: 'typescript'`.
- Monaco cannot mount in jsdom (`window.matchMedia` and friends are missing) — `MonacoEditor` is
  mocked out in Vitest tests (see `src/App.test.tsx`). See `docs/testing-strategy.md` for the full
  reasoning on what's unit-tested vs. verified by hand against a real browser, and why — don't try
  to make Monaco work under jsdom in the meantime.
- Monaco's `DiagnosticsAdapter` (in `languageFeatures.js`) already subscribes to
  `typescriptDefaults.onDidChange` and recomputes every open model's diagnostics whenever
  `setCompilerOptions` is called — confirmed by hand (toggling `strict` live-changed a diagnostic's
  severity and message with no re-edit). It's easy to miss this reading only the per-model
  `onDidChangeContent` listener a few lines above it in the source and wrongly conclude you need to
  force revalidation yourself (e.g. a no-op edit) after a compiler-option change — you don't.
- `editor.getAction(id)` / `editor.getSupportedActions()` return nothing on this editor instance —
  confirmed by instrumenting it directly (`getSupportedActions()` is `[]`, total, not just for
  format-related ids). Our minimal modular imports don't wire up the editor-action contribution
  registry those two APIs read from, even though the _commands_ those actions would run (format,
  etc.) work fine. To invoke a Monaco command programmatically, use
  `editor.trigger(source, commandId, payload)` instead — the same path a keybinding resolves to,
  and it works regardless of this gap. `src/editor/monacoFormattingProvider.ts` and the format
  command handler in `MonacoEditor.tsx` are the reference example.
- General pattern behind the two bullets below, worth checking before wiring up any _other_ Monaco
  feature that isn't working: this app's minimal modular imports (`editor/editor.api` +
  per-feature registration modules) don't auto-register editor _contributions_ the way the old full
  `editor.main.js` bundle used to — each one needs its own side-effect import
  (`monaco-editor/editor/contrib/<feature>/browser/<feature>Contribution`-shaped path), found by
  grepping that contribution's source for `registerEditorContribution`. Silent failure, not an
  error: the feature just never activates.
  - **Hover**: without `monaco-editor/editor/contrib/hover/browser/hoverContribution`, hovering a
    squiggly-underlined diagnostic shows nothing at all.
  - **Suggest** (autocomplete/IntelliSense — member access, local symbols, keywords, `new X(...)`):
    without `monaco-editor/editor/contrib/suggest/browser/suggestController`, the dropdown never
    appears while typing, and `editor.action.triggerSuggest` (what Ctrl+Space/Cmd+Space resolves
    to) silently no-ops. This one is easy to miss because it can appear to work anyway: production
    builds "worked" here purely by accident before this import was added, because
    `vite.config.ts`'s `manualChunks` rule forces all of `node_modules/monaco-editor` into one
    chunk, which happened to sweep this registration in even though nothing explicitly imported
    it. `npm run dev` serves native, unbundled ESM that follows only the app's real import graph,
    so the gap was only visible there — confirmed by testing the identical low-level trigger
    (`editor.trigger('x', 'editor.action.triggerSuggest', {})`) against both `npm run dev` and a
    real `vite preview` build and comparing results directly, not by assuming build behavior
    generalizes to dev. If a future Monaco feature "works in preview but not in dev" (the reverse
    of the Phase 9 regression `docs/verification-discipline.md` describes), check for exactly this
    class of gap before looking anywhere else — and verify any new contribution against `npm run
dev` specifically, not just a production build, since that's the environment `manualChunks`
    can't accidentally paper over.
- `monaco.editor.create()` is called with `fixedOverflowWidgets: true` — without it, overflow
  widgets (hover, suggest, parameter hints) render `position: absolute` inside the editor's own
  overflow-guard node, which `.pane`'s `overflow: auto` (`SplitPane.module.css`) and `.shell`'s
  `overflow: hidden` (`AppShell.module.css`) then clip at the editor pane's edge — a hover or
  suggestion dropdown near the split divider gets visibly cut off instead of overlapping the
  console/problems pane. This option switches them to `position: fixed`, anchored to the viewport
  instead of any ancestor, confirmed by checking the rendered widget's computed `position` directly
  rather than assuming the option name matches its effect. Don't remove this as unnecessary — the
  clipping it fixes only shows up near the pane's right edge, easy to miss testing near the left.
- `MonacoEditor.tsx`'s model is seeded from `useEditorStore` once at mount and otherwise only
  writes editor→store (via `onDidChangeModelContent`) — it does not automatically reflect store
  changes made from outside the editor (e.g. `savedPlaygroundsStore.load()`, or a share link
  applied while already mounted). Found this the hard way building the Phase 8 "Load saved
  playground" action: the store updated correctly but the visible editor didn't change at all.
  Fixed with a `useEditorStore.subscribe` effect that pushes the store's `content` into the model
  via `pushEditOperations` whenever it no longer matches `model.getValue()` — that equality check
  is what avoids double-applying the editor's own edits back onto itself. Any future code path that
  calls `useEditorStore.getState().setContent(...)` from outside `MonacoEditor.tsx` relies on this
  subscription to actually show up; don't remove it as "dead code" without checking for that.
- Monaco captures and stops propagation of the `Enter` keydown while it has focus (it needs Enter
  for newlines/autocomplete acceptance) — confirmed by instrumenting a `window`-level keydown
  listener directly: the Enter keydown for `⌘Enter` simply never arrives at `window` when focus is
  inside the editor, silently breaking any global "run on ⌘Enter"-style shortcut for the single
  most common case (the user actively typing). Any keyboard shortcut that must work while the
  editor has focus needs `editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.<Key>, handler)`
  registered on the editor itself, in addition to (not instead of) any `window`-level listener for
  when focus is elsewhere — see the `editor.addCommand` call in `MonacoEditor.tsx`'s mount effect.
- `MonacoEditor.tsx` exposes the live editor instance as `window.__cpEditor` — deliberate, not a
  debug leftover. It exists because Cmd+Z/Ctrl+Z dispatched via CDP (`page.keyboard.press`) proved
  unreliable in Playwright under headless automation even though the underlying undo command always
  worked when triggered directly; e2e specs that need to assert on Monaco's actual state (e.g.
  `canUndo()`) should read it from `window.__cpEditor` rather than fight keybinding delivery. See
  `docs/testing-strategy.md`.
- The store→editor sync effect (`useEditorStore.subscribe` in `MonacoEditor.tsx`) is what makes
  external content changes (loading a saved playground, an example, a share link applied while
  already mounted) actually show up — the model is otherwise only seeded once at mount. It applies
  changes via `model.pushEditOperations`, not `model.setValue()`, specifically so the change stays
  on the model's undo stack instead of resetting it — don't swap that for `setValue()` as a
  "simplification," it would silently make every one of those actions un-undo-able.

## Execution/sandbox notes

- The runtime iframe (`sandbox="allow-scripts"`, no `allow-same-origin`) has an opaque origin and
  cannot load blob URLs created outside itself — including ones the parent page creates. All blob
  URLs for a run are created _inside_ the sandbox from source text embedded in the harness: the
  iframe's bootstrap creates the worker's, and the worker creates the user module's (see
  `src/execution/sandboxHarness.ts`, ADR 0006). Don't go back to creating blob URLs on the main
  thread and passing the URLs in.
- User code runs in a **classic Web Worker started inside that iframe**, not on the iframe's own
  thread (ADR 0013). A sandboxed `srcdoc` iframe shares the app's main thread, so code running
  there directly could freeze the whole page (Stop button included) with a single
  `while (true) {}`. Unmounting the iframe kills the worker; that's how Stop works. Don't move user
  code back onto the iframe thread, and don't switch the worker to `type: 'module'`: a module
  worker created from a blob fails to start in an opaque-origin iframe (confirmed in Chromium).
  Consequence: no DOM globals in user code (`document`/`window` are undefined).
- Import maps don't apply in workers, so curated package specifiers are rewritten to full esm.sh
  URLs at compile time (`src/execution/transpile.ts`'s `after` transformer), not resolved at
  runtime. Single file only right now (ADR 0008). If multi-file returns, re-read ADR 0006 first:
  relative import specifiers (`./utils`) cannot resolve against a `blob:` URL referrer at all
  (non-hierarchical scheme), which is why that earlier implementation had to rewrite compiled
  `./name` specifiers. The same transformer is the natural place to do that again.
- "Running" lasts until the worker reports idle: its top level has settled and no
  timeout/interval is pending (tracked by wrapping the timer functions in the harness). That's
  what decides when Stop is shown. There's deliberately no execution timeout (see ADR 0013 for
  why).
- User `console.*` output goes only to the app's console panel, not to DevTools. Don't add
  mirroring back: measured, it alone made a 200,000-line flood freeze the tab for 8–15 s. The
  worker's send quota and the per-frame flush in `RuntimeFrame.tsx` are both load-bearing too
  (Phase 10.7 in `docs/build-history.md`).
- When testing Monaco input via Playwright, prefer `page.keyboard.insertText(...)` over
  `page.keyboard.type(...)` — `type()` sends real keydown events and can trip Monaco's
  auto-closing-bracket "type over" detection, duplicating closing braces in ways a real human
  typing wouldn't. If you do see a stray extra `}` from a test script, verify by reading back
  `.view-lines` content before chasing it as a product defect — it may just be the test input.

## Commands

- `npm run dev` — dev server
- `npm run lint` — oxlint
- `npm run typecheck` — `tsc -b` (project references, no emit)
- `npm run format` / `npm run format:check` — Prettier
- `npm test` / `npm run test:watch` — Vitest (jsdom environment, Testing Library)
- `npm run build` — typecheck + production build
- `npm run test:e2e` — Playwright, against a real `vite build` + `vite preview` (auto-started; see
  `docs/testing-strategy.md`). Anything touching Monaco, workers, iframes, blob URLs, persistence,
  or accessibility belongs here, not in a hand-run script — see that doc before adding a spec.
- Before every commit: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build` must pass. Run `npm run test:e2e` too for anything touching editor/execution/persistence/a11y — it's slower, so not part of the default chain, but CI runs it on every push and pull request.
- Deploy is automatic: every push to `main` deploys to https://enbattle.github.io/coding-playground/
  through CI's `deploy` job, once `verify` and `e2e` pass (`.github/workflows/ci.yml`). There is no
  manual deploy command; don't add one. So merging to `main` is shipping. `base` in
  `vite.config.ts` must stay `/coding-playground/` to match the Pages path.

## Architectural decisions

Real architectural calls (editor choice, execution sandboxing, package-loading strategy, settings
schema versioning, etc.) are logged as lightweight ADRs in `docs/decisions/`. Check there before
re-litigating a decision that was already made deliberately — and add a new ADR when making
another one of similar weight. Not every change needs one; see the ADR template's own guidance.

## What NOT to do here

This repo intentionally does not carry the full multi-repo agent-harness machinery (change
folders, spec-clarify/review pipeline, contracts directory) — it's a single-repo solo MVP with no
cross-repo surface and no second contributor yet, so that machinery has no trigger. Don't add it
speculatively; if a real trigger fires later (e.g. a second contributor joins), that's a decision
to make explicitly then, not now.

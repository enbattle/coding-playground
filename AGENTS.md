# coding-playground — agent context

## What this is

A TypeScript-first, in-browser coding playground/studio: Monaco editor, client-side TS
compilation, a sandboxed console, a curated package allowlist, and a thorough settings system.
No backend in this phase — everything runs client-side. Single file only for now — multi-file
editing and the DOM Preview tab were built in Phase 4 and then deliberately rolled back; see ADR
0008 before reintroducing either. Full plan and phase breakdown: see the plan this repo was
bootstrapped from (referenced in commit history of the initial scaffold commit) and
`docs/decisions/` for the specific architectural calls.

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
- Components are named exports except `App.tsx`'s default export (kept for Vite/React convention).
- New dependency? Run `npm audit` before committing it. Prefer a `package.json` `overrides` entry
  to force a patched transitive version (see `dompurify` via `monaco-editor`) over downgrading the
  direct dependency — don't let `npm audit fix --force`'s suggestion be the default choice.
- Directory layout (populated incrementally, phase by phase — don't pre-create empty ones):
  `src/editor/`, `src/execution/`, `src/settings/`, `src/packages/`, `src/layout/`, `src/state/`,
  `src/theme/`. No `src/files/` right now — see ADR 0008.
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
- Monaco captures and stops propagation of the `Enter` keydown while it has focus (it needs Enter
  for newlines/autocomplete acceptance) — confirmed by instrumenting a `window`-level keydown
  listener directly: the Enter keydown for `⌘Enter` simply never arrives at `window` when focus is
  inside the editor, silently breaking any global "run on ⌘Enter"-style shortcut for the single
  most common case (the user actively typing). Any keyboard shortcut that must work while the
  editor has focus needs `editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.<Key>, handler)`
  registered on the editor itself, in addition to (not instead of) any `window`-level listener for
  when focus is elsewhere — see the `editor.addCommand` call in `MonacoEditor.tsx`'s mount effect.

## Execution/sandbox notes

- The runtime iframe (`sandbox="allow-scripts"`, no `allow-same-origin`) has an opaque origin and
  cannot load blob URLs created outside itself — including ones the parent page creates. All blob
  URLs for a run are created _inside_ the iframe by its own bootstrap script, from source text
  embedded in the harness (see `src/execution/sandboxHarness.ts`, ADR 0006). Don't go back to
  creating blob URLs on the main thread and passing the URLs in.
- Single file only right now (ADR 0008) — no import map, no cross-file specifier rewriting. If
  multi-file returns, re-read ADR 0006 first: relative import specifiers (`./utils`) cannot resolve
  against a `blob:` URL referrer at all (non-hierarchical scheme, throws before the import map is
  even consulted), which is why that earlier implementation had to rewrite compiled `./name`
  specifiers to bare `name` ones matching bare import-map keys.
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
- Before every commit: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build` must pass.

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

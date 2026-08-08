# coding-playground — agent context

## What this is

A TypeScript-first, in-browser coding playground/studio: Monaco editor, client-side TS
compilation, a sandboxed console + live DOM preview, a curated package allowlist, and a
thorough settings system. No backend in this phase — everything runs client-side. Full plan
and phase breakdown: see the plan this repo was bootstrapped from (referenced in commit history
of the initial scaffold commit) and `docs/decisions/` for the specific architectural calls.

## Conventions

- TypeScript strict mode throughout; no `any` without a comment explaining why it's unavoidable.
- Semicolons, single quotes, 100-char print width — enforced by Prettier, don't hand-format.
- Lint via `oxlint` (not ESLint) — this is the current Vite-scaffold default, faster, mostly
  rule-compatible. Don't add ESLint alongside it.
- State: Zustand stores, one per concern (settings, files, layout), each with a localStorage
  persistence middleware where the plan calls for persistence.
- Components are named exports except `App.tsx`'s default export (kept for Vite/React convention).
- Directory layout (populated incrementally, phase by phase — don't pre-create empty ones):
  `src/editor/`, `src/execution/`, `src/files/`, `src/settings/`, `src/packages-panel/`,
  `src/layout/`, `src/state/`, `src/theme/`.
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
  mocked out in Vitest tests (see `src/App.test.tsx`); real editor/execution behavior is verified by
  hand against an actual browser, not by the unit test suite. Phase 9 formalizes real-browser
  coverage into a Playwright e2e suite — don't try to make Monaco work under jsdom in the meantime.

## Execution/sandbox notes

- The runtime iframe (`sandbox="allow-scripts"`, no `allow-same-origin`) has an opaque origin and
  cannot load blob URLs created outside itself — including ones the parent page creates. All blob
  URLs for a run are created _inside_ the iframe by its own bootstrap script, from source text
  embedded in the harness (see `src/execution/sandboxHarness.ts`, ADR 0006). Don't go back to
  creating blob URLs on the main thread and passing the URLs in.
- Relative import specifiers (`./utils`) cannot resolve against a `blob:` URL referrer — it's a
  non-hierarchical scheme, so the browser throws before even consulting the import map. Compiled
  code has its `./name` specifiers rewritten to bare `name` specifiers
  (`src/execution/rewriteRelativeImports.ts`) to route around this; the import map's keys are bare
  to match. This only supports the flat, no-subdirectory file model this project has — don't extend
  it to handle `../` without reconsidering the whole scheme.
- When testing Monaco input via Playwright's `keyboard.type()`, auto-closing brackets can duplicate
  closing braces (Monaco's "type over" detection doesn't always fire the same way for synthetic
  fast-typed input as for a real human) — a stray extra `}` from a test script is a test artifact,
  not necessarily a real bug. Verify by reading back `.view-lines` content before chasing it as a
  product defect.

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

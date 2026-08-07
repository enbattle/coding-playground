# coding-playground — agent context

## What this is

A TypeScript-first, in-browser coding playground/studio: Monaco editor, client-side TS
compilation, a sandboxed console + live DOM preview, a curated package allowlist, and a
thorough settings system. No backend in this phase — everything runs client-side. Full plan
and phase breakdown: see the plan this repo was bootstrapped from (referenced in commit history
of the initial scaffold commit) and `docs/decisions/` for the specific architectural calls.

## Conventions

- TypeScript strict mode throughout; no `any` without a comment explaining why it's unavoidable.
- No semicolons, single quotes, 100-char print width — enforced by Prettier, don't hand-format.
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

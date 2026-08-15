# coding-playground

A TypeScript-first, in-browser coding playground/studio: a Monaco-powered editor, client-side
TypeScript compilation, a sandboxed console, a curated package allowlist, a thorough settings
system, a first-load welcome guide, and no-backend persistence/sharing — no backend, everything
runs in your browser. Single file only for now (see
`docs/decisions/0008-roll-back-multi-file-and-preview.md`).

Built step by step across 10 phases (editor + execution, packages, settings/command palette,
persistence/sharing, polish, CI) — see `docs/build-history.md` for the phase-by-phase account,
`AGENTS.md` for conventions, `docs/decisions/` for the architectural calls made along the way, and
`docs/verification-discipline.md` for how those calls got verified. Deploy, accounts/cloud save,
multi-user collaboration, and AI-generated custom themes are deliberately not built yet — see
`docs/future-implementations.md`.

## Getting started

```sh
npm install
npm run dev
```

## Scripts

| Command                | What it does                        |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Start the dev server                |
| `npm run lint`         | Lint with oxlint                    |
| `npm run typecheck`    | Type-check with `tsc -b`            |
| `npm run format`       | Format with Prettier                |
| `npm run format:check` | Check formatting without writing    |
| `npm test`             | Run the test suite once (Vitest)    |
| `npm run test:watch`   | Run the test suite in watch mode    |
| `npm run test:e2e`     | Run the Playwright e2e suite        |
| `npm run build`        | Type-check and build for production |

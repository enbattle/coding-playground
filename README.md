# coding-playground

A TypeScript-first, in-browser coding playground/studio: a Monaco-powered editor, client-side
TypeScript compilation, a sandboxed console and live DOM preview, a curated package allowlist, and
a thorough settings system — no backend, everything runs in your browser.

Being built step by step; see `AGENTS.md` for conventions and `docs/decisions/` for the
architectural calls made along the way.

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
| `npm run build`        | Type-check and build for production |

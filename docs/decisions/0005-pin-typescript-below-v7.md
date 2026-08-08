# 0005 - Pin `typescript` to the classic (pre-7) compiler line

## Status

Accepted

## Context

ADR 0002 committed to running the `typescript` npm package's JS API (`ts.transpileModule`) inside
a Web Worker for in-browser execution. While implementing that in Phase 3, `npm view typescript
version` resolved to `7.0.2` as `latest` — TypeScript 7 is the native, Go-ported compiler. Checking
its package metadata: `main` is `./lib/version.cjs` and the `exports` map only exposes
`unstable/ast`, `unstable/sync`, `unstable/async`, `unstable/proto`, `unstable/fs` — a Node-oriented
API surface for driving a native binary, not the classic browser-embeddable `typescript.js` bundle.
There is no `transpileModule`, no `ScriptTarget`, none of the classic compiler API a Web Worker
running purely client-side would need. TS7's `bin: { tsc }` still works fine as a CLI, but the
in-browser execution path this project depends on cannot run against it.

The classic compiler line tops out at `6.0.3` (the last pre-native-rewrite major); `typescript.js`
there is exactly the API ADR 0002 assumed.

## Decision

Depend on `typescript@^6.0.3` (a caret range, so it cannot silently jump to the `7.x` native line on
a routine dependency update) as a regular `dependency` (not `devDependency`) — it is now genuinely
shipped to the browser (loaded inside the transpile Web Worker), not just a build-time tool. The
same package version is used for both the project's own `tsc -b` build and the in-browser execution
worker, rather than maintaining two separate TypeScript installs.

## Consequences

This project cannot casually adopt TypeScript 7 for the in-browser execution path — upgrading past
the `6.x` line would require re-deriving the execution architecture (e.g., moving to Monaco's own
bundled TS worker and its `getEmitOutput`, or waiting for/adopting whatever browser-embeddable
successor API TS7 eventually ships, if any). Revisit this pin deliberately, with a fresh ADR, if
that becomes necessary — don't let a routine `npm update` do it silently.

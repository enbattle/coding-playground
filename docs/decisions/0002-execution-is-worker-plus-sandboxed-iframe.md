# 0002 - Execute code via a Web Worker transpile step + sandboxed iframe, not WebContainers/Sandpack

## Status

Accepted

## Context

Needed a way to run user TypeScript in the browser with no backend. Three real options surfaced:
StackBlitz's WebContainers (a real Node.js runtime compiled to WASM), CodeSandbox's Sandpack
(bundler-as-a-service by default), or transpiling TS to JS ourselves and running it in an isolated
context.

WebContainers requires a commercial license for any non-prototype commercial use past a
free-session cap — too heavy a dependency and licensing commitment for an MVP. Sandpack's default
bundler depends on CodeSandbox's hosted bundler service, which is an external runtime dependency —
directly at odds with "no backend" for this phase (an experimental client-side Sandpack bundler
exists but adds real complexity for capability we don't need yet: real npm install, not just a
curated allowlist).

## Decision

Compile TS → JS in-browser using the `typescript` package (`ts.transpileModule` for execution, the
language service for diagnostics) inside a Web Worker, off the main thread. Run the emitted JS in a
sandboxed iframe (`sandbox="allow-scripts"`, no `allow-same-origin`) with a `postMessage` bridge
that intercepts `console.*` calls and captures runtime errors / unhandled rejections. This is the
same architecture CodePen, JSFiddle, and the official TS Playground itself use.

## Consequences

No real `npm install`, no arbitrary multi-package dependency resolution, no filesystem-level
Node.js APIs — those all require WebContainers-class infrastructure and are explicitly out of
scope for this phase (see the plan's non-goals). Package support instead comes from a curated
esm.sh-backed allowlist (0003). If unrestricted real-Node execution becomes a hard requirement
later, WebContainers is the fallback path — but that's a licensing and scope decision to make
explicitly then, with real usage evidence, not now.

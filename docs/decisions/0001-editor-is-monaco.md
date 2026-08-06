# 0001 - Use Monaco Editor, not CodeMirror 6

## Status

Accepted

## Context

Needed to pick the in-browser code editor. The two realistic candidates are Monaco (VS Code's
editor, extracted for the web) and CodeMirror 6 (a modular, tree-shakeable toolkit). Monaco is
~5-10MB uncompressed versus CodeMirror 6's ~300KB modular core, so the size trade-off is real and
not close.

## Decision

Use Monaco. For a _TypeScript_ playground specifically, real TS language-service fidelity —
diagnostics, hover types, go-to-definition, quick fixes — is the point of the product, not a
nice-to-have. Monaco ships this out of the box; CodeMirror 6 would mean hand-building or
integrating a separate TS language-service layer to get the same fidelity. The official
TypeScript Playground itself uses Monaco for the same reason.

## Consequences

Bigger initial bundle — mitigated by lazy-loading Monaco (Phase 9 perf pass) so it's not on the
critical path for first paint. In exchange, we get IntelliSense-quality editing for free instead
of building it. Revisit only if bundle size becomes a measured, user-reported problem — not
speculatively.

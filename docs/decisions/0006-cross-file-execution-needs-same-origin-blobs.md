# 0006 - Cross-file execution: build blob URLs inside the sandboxed iframe, not outside it

## Status

Accepted

## Context

Phase 4 added multi-file editing and needed the entry file's `import './utils'` to actually resolve
at runtime. The first implementation built one `Blob`/`URL.createObjectURL` per file on the main
thread (in `useRunner.ts`) and passed those blob URLs into a native `<script type="importmap">` /
`<script type="module" src="...">` inside the sandboxed iframe's `srcDoc` (same mechanism as ADR
0002's entry-loading approach).

This failed at runtime with `Not allowed to load local resource: blob:...`. Blob URLs are
origin-scoped: a blob created by `URL.createObjectURL` on the parent page (`http://localhost:...`)
belongs to the parent's origin. Our iframe is `sandbox="allow-scripts"` with no
`allow-same-origin` — deliberately, per ADR 0002, so it has an opaque origin distinct from the
parent and can't reach back into it. That same isolation means it's also disallowed from loading a
blob URL created by a _different_ origin (the parent), even though it's the same browser process.
The obvious "fix" — add `allow-same-origin` to the sandbox — was rejected: `allow-scripts` +
`allow-same-origin` together let an iframe use script to strip its own sandbox restrictions, which
is exactly the escape hatch ADR 0002 excluded on purpose.

## Decision

Move blob URL creation _into_ the iframe itself. The harness now embeds each file's compiled JS as
plain text data (JSON-escaped, with the same `</script` guard as user code always needed) and runs a
small trusted bootstrap script, inside the iframe, that: creates one `Blob`/object URL per file
(now same-origin to the iframe that made them), builds the import map from those iframe-local URLs,
and `document.write()`s the `<script type="importmap">` + `<script type="module" src="...">` tags —
`document.write` because the import map must be present in the parse stream _before_ the module
script tag is reached, and blob URLs aren't known until the bootstrap script has already run.

## Consequences

No blob URL lifecycle management is needed on the main thread anymore — each run's blobs belong to
that run's iframe and are implicitly released when the iframe (a fresh one per run, per ADR 0002)
is torn down, so `useRunner.ts` no longer tracks or revokes URLs itself. The general lesson —
sandboxed opaque-origin iframes cannot consume blob/object URLs minted outside themselves — applies
to anything else this project ever hands into that sandbox (e.g. Phase 6 packages, if a
package's code ever needs to be blob-served rather than fetched from esm.sh directly).

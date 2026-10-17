# 0009 - Package IntelliSense via a recursive esm.sh `.d.ts` crawl

## Status

Accepted — see the 2026-10-17 update at the end (cap raised, types loaded on demand, import map replaced by compile-time rewriting per ADR 0013).

## Context

ADR 0003 committed to a curated esm.sh-backed package allowlist with "ambient `.d.ts` wired into
Monaco so intellisense works... without the user doing anything," but didn't work out the mechanism.
Two things had to be verified rather than assumed, given this project has already been burned twice
by assuming a library's API shape (TypeScript 7 dropping the classic compiler API, monaco-editor
0.56's restructured language modules):

1. **Does esm.sh expose type locations to browser JS at all?** Confirmed via `curl -sI
https://esm.sh/zod@3.23.8`: an `X-TypeScript-Types` response header on the JS module points at
   the `.d.ts` entry file, and critically `access-control-expose-headers: X-ESM-Path,
X-TypeScript-Types` — the header is genuinely readable from browser `fetch()`, not just visible
   to curl.
2. **Is one `.d.ts` file enough?** No. `curl`'ing zod's entry `index.d.ts` showed
   `export * from "./lib/index.d.ts"` — real packages split types across multiple files that
   reference each other via relative specifiers. Worse, some packages' types live at a completely
   different path than their JS: lodash-es's `X-TypeScript-Types` points into a separate
   `@types/lodash-es` hosting path with no shared prefix with the `lodash-es` module URL at all.

A single `monaco.typescriptDefaults.addExtraLib(entryDts, uri)` call would leave every relative
`export * from`/`import from` inside that entry file unresolved — Monaco would report "cannot find
module" for the package's own internal structure, defeating the point.

## Decision

`src/packages/esmSh.ts` recursively crawls relative specifiers starting from the entry `.d.ts`,
registering every discovered file with Monaco via `addExtraLib`, capped at 30 files per package as
a runaway-crawl guard.

The mechanism that keeps this correct without manual path bookkeeping: every discovered file is
tracked as a _pair_ — its real fetch URL and a parallel virtual `file:///node_modules/<name>/...`
URL Monaco sees. When a file at `(realUrl, virtualUrl)` contains a relative specifier `spec`, both
`new URL(spec, realUrl)` (where to fetch next) and `new URL(spec, virtualUrl)` (what Monaco should
call it) are computed with the _same_ relative-resolution operation, just against different bases.
Because URL relative resolution is purely structural, doing it twice keeps the real and virtual
spaces in lockstep automatically — no need to know or preserve any relationship between a package's
real hosting path and its virtual one (which is exactly what breaks for lodash-es's `@types/*`
redirect). The entry file is always registered at the fixed `file:///node_modules/<name>/index.d.ts`
regardless of its real path shape, because that's the conventional location TypeScript's Node-style
module resolution (`moduleResolution: NodeJs`, our Monaco setting per ADR 0007) checks first when
resolving a bare specifier with no `package.json` present to redirect it.

Package imports in user code (`import { z } from 'zod'`) are _bare_ specifiers, which — unlike the
`./relative` ones ADR 0006 dealt with — resolve straight through an import map regardless of the
importing module's own URL scheme. So unlike local file execution (which needs blob URLs created
inside the iframe, ADR 0006), the package import map can be a plain static
`<script type="importmap">` in the harness, built once from the same registry, no runtime
computation needed.

Type-fetching is fire-and-forget per package (`syncMonacoPackageTypes`, called once at editor
setup) — a slow or unreachable esm.sh degrades to "no IntelliSense for that package" and never
blocks typing or running code, since execution depends only on the import map, not on the crawl
having succeeded.

## Consequences

Adding a package to the curated allowlist (`src/packages/registry.ts`) is enough to get both
working execution and real IntelliSense — no per-package special-casing needed, the crawl handles
arbitrary relative-reference structures and cross-path type hosting uniformly. The 30-file cap means
a package with a genuinely huge, deeply-split type surface could get partial IntelliSense; that's an
acceptable degradation, not a correctness bug, and the cap is there specifically to prevent an
unbounded crawl on some pathological or misconfigured package.

## Update — 2026-10-17

The 30-file cap turned out to be a correctness bug, not an acceptable degradation. Measured against
esm.sh, four of the six curated packages need far more files: lodash-es ~305, date-fns ~258, rxjs
~175, zod ~80. With the cap, date-fns' `format` showed a false "has no exported member" error and
rxjs's `map` lost its types (a false "implicitly has an 'any' type"), on code that ran fine. The
e2e suite had only checked nanoid, which needs a single file.

What changed:

- The cap is now 1000, as a real runaway guard rather than a budget, and the crawl fetches each
  level of the graph in parallel (a few hundred sequential round trips would be far too slow).
- Types load **on demand**, the first time the code imports a package
  (`src/packages/packageImports.ts`), not for all six at startup. That's ~800 files total, and most
  sessions import none of them. Files are registered in one `setExtraLibs` batch per package, not
  one `addExtraLib` per file, since each extra-lib change revalidates every open model.
- The static import map described above is gone: user code now runs in a Web Worker, where import
  maps don't apply, so curated specifiers are rewritten to esm.sh URLs at compile time (ADR 0013).
- `e2e/package-types.spec.ts` checks a common import from each large package type-checks cleanly.

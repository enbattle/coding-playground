# 0007 - Compiler options panel is curated, and `module` is not user-configurable

## Status

Accepted

## Context

The plan calls for "real tsconfig.json-shaped `compilerOptions`" exposed to the user, naming
`target`, `module`, `strict`, `jsx`, `lib`, `esModuleInterop`, `experimentalDecorators` as examples.
Two things surfaced while implementing this literally:

1. **`module` isn't safely user-configurable here.** Execution (ADR 0002, ADR 0006) depends on the
   compiled entry loading as `<script type="module" src="blob:...">` and cross-file imports
   resolving through a native browser import map — both hard-require ESM output. Letting a user
   pick `CommonJS` would silently produce code that can't run in the sandbox at all, with a
   confusing failure mode (a blob URL script tag that just does nothing, or a `require is not
defined` error) rather than an honest one.
2. **Monaco's own `ScriptTarget`/`JsxEmit` enums (from `monaco-editor/languages/features/typescript
/register`) are a trimmed subset** of the real `typescript` package's — no discrete ES2021+
   members, capped at `ESNext`/`Latest`. The execution worker uses the full real `typescript`
   package and isn't limited this way. If the option set let users pick a target Monaco can't
   represent, the live diagnostics the user sees while typing would silently stop matching what
   actually runs on Run — undermining the whole "compiler transparency" goal this panel exists for.

## Decision

`module` is not exposed at all — it's hardcoded to ESNext in both Monaco's defaults and the
execution worker, unconditionally, regardless of any other option. The compiler-options panel is a
curated set that both Monaco and the real `typescript` package can represent identically:
`target` (ES5/ES2015/ES2017/ES2019/ES2020/ESNext — the intersection of both enums), `jsx`
(none/preserve/react-jsx), `strict`, `esModuleInterop`, `experimentalDecorators`, `noUnusedLocals`,
`noUnusedParameters`. `lib` is deliberately cut from the MVP list (it needs a multi-select UI and is
rarely hand-tuned) rather than half-implemented.

The canonical representation (`src/settings/compilerOptions.ts`) is plain strings/booleans, not
either library's enum — `src/editor/monacoCompilerOptions.ts` and
`src/execution/transpile.worker.ts` each maintain their own small mapping table from those strings
to their own enum, rather than one file importing the other's enum type. This keeps the two
libraries decoupled and makes the "what can actually be represented identically by both" constraint
an explicit, visible list instead of an implicit assumption.

## Consequences

Users can't pick CommonJS/UMD/AMD output or an ES2021+ target from this panel. If a real need for
either surfaces later (e.g. a package that only ships CommonJS, once Phase 6 lands), that's a
new decision to make explicitly — likely requiring either a build-time module transform or waiting
for Monaco's typescript module to widen its enum — not a reason to quietly loosen this constraint.

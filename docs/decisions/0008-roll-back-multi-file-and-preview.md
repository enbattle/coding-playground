# 0008 - Roll back multi-file editing and the Preview tab to single-file TypeScript-only

## Status

Accepted

## Context

Phase 4 built a flat-namespace virtual filesystem (create/rename/delete, tabs, a protected
`/index.ts` entry) with working cross-file `import` execution (ADR 0006) and a Preview tab that
rendered `/index.html` live. After using it, the user reported it added more confusion than value:

- `.css` and `.json` files were creatable but functionally inert — nothing linked a stylesheet into
  Preview, and `import data from './data.json'` failed silently at runtime, since only `.ts`/`.tsx`
  files were ever transpiled or given an import-map entry. Creating either was a dead end with no
  indication why.
- Nothing in the UI explained the entry-file convention, that Preview needed `/index.html` to show
  anything beyond a blank page, or that Console and Preview shared one running iframe (switching
  tabs doesn't re-run).
- File tabs carried no visual distinction between "special" files (`index.ts`, `index.html`) and
  regular ones.

Weighed three options: patch the specific gaps (drop `.css`/`.json` as creatable types, add UI
hints), leave it and just document better, or wire `.css`/`.json` up properly instead of cutting
them. The user asked to go further than any of these: cut multi-file entirely for now, TypeScript
only, revisit later with better UX once there's evidence it's worth the complexity again.

## Decision

Single file only. Concretely:

- Deleted `src/files/` (the virtual filesystem store and `FileTabs.tsx`) and
  `src/execution/rewriteRelativeImports.ts` — no create/rename/delete, no file tabs in the header.
- `src/editor/store.ts` (the original Phase 3 single-content store) is back to being the only
  editor-state store; `MonacoEditor.tsx` creates one fixed model at `file:///index.ts` and never
  swaps it.
- The Preview tab and the DOM-preview branch of the runtime harness are gone — `RuntimeFrame` is
  always hidden again (console capture only), and `sandboxHarness.ts` takes a single compiled `code`
  string, no import map, no `htmlContent`, no `document.write` (a single blob URL + a plain dynamic
  `import()` is enough with nothing to sequence against).
- The `jsx` compiler option was removed from the settings panel (`compilerOptions.ts`,
  `monacoCompilerOptions.ts`, `transpile.worker.ts`) — with no `.tsx` files possible, JSX syntax
  can't appear anywhere, so the option had no observable effect and was pure confusing dead UI.
- ADR 0006 is left unedited (see its addendum) since the blob-URL origin-scoping lesson it documents
  still governs the simplified single-file harness; only the cross-file-specific mechanism it
  describes was removed.

## Consequences

Simpler onboarding — a first run is just "type TypeScript, hit Run, see console output," with no
unexplained affordances. The trade-off is real: this gives up genuinely-working cross-file imports
that took real effort to get right (ADR 0006). That work isn't wasted — it's preserved in git
history and ADR 0006 — and multi-file can come back later, but next time it should ship _with_ the
UX (file-role affordances, working `.css`/`.json`, in-app explanation of the entry/Preview
relationship) rather than the mechanics alone.

Downstream effects worth remembering when they come up: the original plan's Phase 8 (persistence/
sharing) can serialize a single content string instead of a files record for now; Phase 9's planned
e2e coverage included a "multi-file switch" scenario that no longer applies until multi-file
returns. Neither needs action now — noting them here so they don't cause confusion later.

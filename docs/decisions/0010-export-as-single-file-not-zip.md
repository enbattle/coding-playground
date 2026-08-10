# 0010 - Export the playground as a single .ts download, not a .zip

## Status

Accepted

## Context

The original plan's Phase 8 called for "export as `.zip`" via `jszip`, written when the editor was
still the Phase 4 multi-file virtual filesystem. ADR 0008 rolled that back to single-file
TypeScript-only and explicitly flagged this downstream effect for Phase 8 without acting on it yet.
Now that Phase 8 is being built: there is exactly one file, `index.ts`. Zipping it would add a
dependency (`jszip`, never installed) and an extra archive-extraction step for the user, to package
one file that a plain download already handles.

## Decision

`src/sharing/exportCode.ts` downloads the current editor content directly as `index.ts` via a Blob

- object URL, the same mechanism `exportSettings()` already uses for the settings JSON download. No
  `jszip` dependency.

## Consequences

One less dependency, one less step for the user (`index.ts` lands directly in Downloads, no
unzip). If multi-file editing returns (ADR 0008's reversal condition), this decision reverses with
it — re-evaluate `jszip` at that point rather than before.

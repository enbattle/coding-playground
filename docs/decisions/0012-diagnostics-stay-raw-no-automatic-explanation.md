# 0012 - Diagnostic messages stay raw; explored and declined an automatic "pretty" reformatting

## Status

Accepted

## Context

The Problems panel truncated long diagnostic messages with an ellipsis and no way to see the rest —
a real, narrow bug, fixed independently (wrap instead of truncate). Fixing that led to a broader
question: TypeScript's raw diagnostic text is often genuinely hard to read, especially deeply
nested generic-mismatch chains ("Type X is not assignable to type Y" repeated at every level with
"Types of property Z are incompatible" connectors between them). Inspired by the
[pretty-ts-errors](https://github.com/yoavbls/pretty-ts-errors) VSCode extension, a full
implementation was built and verified working end-to-end:

- `diagnosticPrettifier.ts`: parsed raw messages by finding every quoted span and classifying it
  by the nearest preceding keyword (type/property/parameter/module), rather than templating each of
  TypeScript's ~2,100 distinct diagnostic codes — the same general strategy the reference extension
  uses, reduced from its ~16 combined regexes to one classifier plus two special-cased line shapes.
- `prettierFormat.ts`'s `formatTypeSnippet`: reused this project's own already-bundled
  `prettier/standalone` to reformat extracted type fragments (wrap as `type __X = <fragment>;`,
  format, strip the wrapper) — the same technique the reference extension uses, via infrastructure
  this app already shipped for Format Document rather than a new dependency.
- `DiagnosticDetailModal.tsx` + `diagnosticDetailStore.ts`: one shared "dig deeper" destination,
  opened by a small action added to both the Problems panel (a second button per row, since a
  `<button>` can't nest inside another) and Monaco's native hover (via a custom, additive
  `HoverParticipant` registered alongside the existing `MarkerHoverParticipant`, not replacing it).
- Raw text stayed the default everywhere; the formatted version was strictly opt-in via the "dig
  deeper" action. This traded one click of friction for a real robustness win discovered mid-build:
  an earlier version rewrote Monaco's live TS markers in place (via `setModelMarkers`) so the native
  hover would show pretty text directly, and that turned out to be unreliable in this app
  specifically — `monacoPackageTypes.ts`'s background package-type crawl calls
  `typescriptDefaults.addExtraLib` once per discovered `.d.ts` file, each call fires
  `typescriptDefaults.onDidChange`, and Monaco's own `DiagnosticsAdapter` responds by clearing every
  TS marker and fully revalidating — clobbering the rewrite for as long as that crawl runs after
  page load. Reading from markers fresh, on demand, in a separate modal sidesteps this entirely.

Real, non-trivial engineering problems came up and were solved along the way (all still true and
useful if this is revisited): Monaco's hover participant contract requires each returned part to
carry `range` and `owner` fields undocumented anywhere in its public API (confirmed by two separate
runtime crashes, `Cannot read properties of undefined (reading 'startLineNumber')` and `Cannot set
properties of undefined (setting 'tabIndex')`, each traced to Monaco's own rendering internals);
adding a hover _action_ is best done via `context.statusBar.addAction(...)` — the same status-bar
API "View Problem" and "Quick Fix" use — not a hand-built row appended to the hover's content
fragment, which reads as visually bolted-on; and multiple diagnostics can legitimately overlap the
same hover position (e.g. an unused-variable hint and a type-mismatch error on the same statement),
so picking one requires sorting by `MarkerSeverity`, not just taking whichever came first from
`getModelMarkers()`.

Despite all of that working correctly, testing it against real, user-supplied errors (not
hand-picked examples) showed the core premise didn't hold up:

- For short, already-simple messages (e.g. `Type 'ListNode<T> | null' is not assignable to type
'ListNode<T>'.`), the only visible difference from raw was quote marks becoming colored inline
  code — real, but not what "pretty" was promising, and not what the reference extension's own
  README demonstrates.
- For genuinely deep chains — the case that motivated this in the first place — rendering every
  level faithfully with each type independently Prettier-formatted made messages _longer_ than raw
  (an 8-line real chain became 14 rendered lines, with a multi-line code block awkwardly interrupting
  a sentence mid-line), the opposite of the goal.
- A prototype that collapsed the "Types of X are incompatible" connector chain into a breadcrumb
  (`via parameter 'payload' → property 'response' → property 'bio'`) plus the deepest, most specific
  mismatch did compress an 8-line chain down to 4 meaningful lines — but this and every variant
  tried was still _reformatting TypeScript's own sentences_, never synthesizing new explanatory
  text ("this fails because the property might be `null` here"). That distinction is what the
  reference extension's own demo — a wall of text becoming a small, explained section — actually
  shows, and no amount of quote-stripping or Prettier-formatting produces it.

## Decision

Ship none of it. Problems panel and hover both show Monaco's and TypeScript's diagnostic text
exactly as given — no quote-stripping, no reformatting, no "dig deeper" action, no detail modal.
The two narrower fixes made along the way that don't depend on any of this stay: the Problems panel
wraps long messages instead of truncating them, and hover shows Monaco's native tooltip (fixed so
`fixedOverflowWidgets` keeps it from being clipped by the shell layout — see `AGENTS.md`'s Monaco
notes).

## Consequences

The Problems-panel-truncation bug that started this is still fixed, independent of everything else
here. Real, hard-won Monaco integration knowledge (the hover-participant contract's undocumented
`range`/`owner`/`hoverElement` requirements, the status-bar action API, the marker-severity-overlap
issue, the live-marker-mutation fragility caused by `syncMonacoPackageTypes`) is preserved above and
in `AGENTS.md` even though the feature that surfaced it didn't ship — worth reading before
attempting hover-related Monaco work again, regardless of whether this specific feature comes back.

If genuine human-readable diagnostic explanations are revisited, the finding above is the one to
take seriously first: reformatting existing compiler text has a hard ceiling, demonstrated here, not
just theorized. Getting past it needs something that actually interprets the error rather than
retypesets it — realistically an LLM call given the prompt/context, which runs into the same
no-backend constraint as the deferred custom-theme-generation feature (see
`docs/future-implementations.md` and ADR 0004) — not a bigger regex/parser effort in the same
direction already explored here.

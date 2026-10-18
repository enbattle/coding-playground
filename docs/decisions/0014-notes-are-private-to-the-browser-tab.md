# 0014 - Notes are private to the browser tab: never persisted, shared or saved

## Status

Accepted

## Context

Users wanted a notepad for things they need while coding: TODOs, reminders, pasted snippets of
docs. Every other piece of user content in the app is persisted and portable: editor content
autosaves to localStorage, saved playgrounds snapshot it, and share links carry it to other people.
So the question was whether notes belong to the _person_ or to the _playground_.

Treating notes as part of the playground (in share links and saved snapshots) would mean a share
link silently publishes whatever the user jotted down, possibly something they'd never share,
like a key or a note about a colleague. A share link can't be recalled once posted. It would also
make every code-replacing action (examples, snapshots, share links) replace notes too, widening the
"ask before replacing work" problem the share-link prompt exists for.

## Decision

Notes are personal and scoped to the browser tab:

- Stored in **sessionStorage** (`coding-playground:notes`, `src/notes/store.ts`), through the same
  `createSafeStorage` wrapper as the other stores, but not `persistStorage` (localStorage). A reload
  keeps them; closing the tab deletes them; each tab has its own. Memory-only was rejected: an
  accidental reload would lose them.
- **Never** included in share links, saved playgrounds, settings export, or localStorage. Loading
  an example, a snapshot or a share link replaces the code and leaves notes alone.
- "Clear local data" removes them explicitly, since sessionStorage survives the reload it does.
- The UI says so where people type: a visible line ("Private to this tab: cleared when you close
  it, never saved or shared.") plus an ⓘ tooltip with the full explanation, reachable by keyboard.
  A hover-only tooltip alone would be missed, and this is a data-loss warning.

Layout: notes sit under Console/Problems in a vertical split (resizable, collapsible, collapsed by
default unless the tab already has notes), so code, output and notes are visible together. The
shell's 1400×720 size cap was lifted at the same time (max width 1920px, full height) to make room.

## Consequences

Notes can't leak through any sharing path, and there's no new persisted or shared data format to
maintain. The cost: notes are lost when the tab closes, by design, and two tabs don't share notes.
No warning on tab close: browsers only allow a generic prompt, and it would also fire on reloads,
which keep notes.

Changing this later is cheap if it's ever wanted. Share payloads and snapshots are versioned, and
their readers ignore fields they don't know, so an optional `notes` field could be added without
breaking existing links. That's a privacy decision, though: it needs an explicit opt-in in the UI
(for example "include my notes" on Share), not a silent default, and this ADR revisited.

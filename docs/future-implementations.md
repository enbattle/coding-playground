# Future implementations

Features discussed but deliberately not built yet — what each one is, why it's deferred, what's
already scaffolded toward it (if anything), and the concrete next step for whoever picks it up.
This is a living doc: update an entry in place as its status changes, move it out once it's
actually built (into `docs/build-history.md`, the way every shipped phase already is).

## Describe-your-own-theme (custom AI-generated themes)

**What:** type a free-text prompt ("moody late-night terminal, purple accents"), get back a
matching theme — inspired by Messenger's custom chat themes. Sits alongside the three curated
themes (Instrument Panel, Terminal Botanical, Cartographic Blueprint) in the floating theme pill.

**Why deferred:** turning open-ended text into a coherent, accessible set of colors and fonts needs
an LLM call, and that can't run safely from the browser without shipping an API key to every
visitor — it needs a backend endpoint that doesn't exist in this no-backend MVP. See ADR 0004.

**Already scaffolded** (this is the one deferred feature with real code behind it, not just a
plan):

- `src/theme/store.ts` already has `setCustomTheme(tokens)` to receive a generated result.
- `src/theme/ThemeSwitcher.tsx` already has a disabled "Custom…" entry in the theme menu.
- `src/theme/generate.ts` exports `generateThemeFromPrompt(prompt): Promise<ThemeTokens>`,
  currently throwing, with the full intended implementation already written up in its own comment:
  POST the prompt to a serverless endpoint holding the LLM key → structured output constrained to
  `ThemeTokens` minus `id`/`name`/`motif` → fonts constrained to the vetted `FontKey` registry
  (never a free-form family name an LLM could invent) → validate `colorText`/`colorTextStrong`/
  `colorDanger` meet WCAG AA (4.5:1) against `colorBg` before accepting, reject or clamp otherwise →
  `setCustomTheme(tokens)`.
- Generated themes render with `motif: 'none'` by design — no bespoke decorative art, and that's
  correct, not a gap (see ADR 0004's Consequences).

**Next step when picked up:** stand up the serverless endpoint (doesn't need the full backend
architecture from the accounts/cloud-save entry below — just _somewhere_ to hold an API key), fill
in `generateThemeFromPrompt`'s body, and wire the "Custom…" button to prompt for text input instead
of being disabled. Everything else in the theme system is already built for this.

## Real accounts + cloud save

**What:** user login, and playgrounds/settings synced to a server instead of living only in
`localStorage`.

**Why deferred:** no backend exists yet (deliberately — ADR 0011), and this was explicitly out of
the original MVP's scope (see the plan's "Non-goals" section in `docs/build-history.md`'s Phase 1
entry).

**Current state:** Phase 8 built full-featured _local_ persistence — autosave, named "saved
playgrounds" snapshots, and share links — all `localStorage`-only, all working, none of it
server-backed.

**Next step when picked up:** the framework question is already answered (ADR 0011: stay on Vite,
pair it with a backend service rather than migrating to a meta-framework — Supabase is called out
there as a strong default candidate, since it covers auth + Postgres + realtime in one service with
no custom server code). The interesting design work is the _sync_ model: does a signed-in user's
`localStorage` saved-playgrounds list merge with their cloud list, replace it, or stay local-only
with cloud save as a separate action? That's a real product decision, not just plumbing — decide it
explicitly when this gets scoped, don't default into whichever's easiest to implement.

## Multi-user collaboration

**What:** real-time collaborative editing of the same playground — Google-Docs-style, live cursors
and concurrent edits.

**Why deferred:** out of MVP scope, and it's the deferred feature with the most architecture still
genuinely undecided.

**Current state:** nothing built toward this yet — no CRDT, no realtime transport, no presence UI.

**Next step when picked up:** per ADR 0011, this needs a dedicated WebSocket/CRDT sync layer (Yjs
paired with something like Liveblocks, PartyKit, or `y-websocket`), not Next.js API routes or any
particular frontend framework — traditional request/response API routes don't handle long-lived
connections well regardless of what renders the frontend. Concretely: Yjs's shared-document model
would need a binding into Monaco (the established library for this is `y-monaco`), a sync provider
for transport, and almost certainly the accounts entry above done first — collaboration needs a
notion of "who," which anonymous local-only playgrounds don't have.

## Smaller, already-tracked deferrals

These are deliberately deferred too, but smaller or already documented elsewhere, so they're
listed here only for discoverability, not duplicated:

- **Notes in share links or saved playgrounds** — deliberately not done: notes are private to the
  tab (ADR 0014). Adding an optional field wouldn't break existing links or snapshots, but it's a
  privacy change that needs an explicit opt-in in the UI and that ADR revisited.
- **Per-PR preview deploys** — GitHub Pages serves one site per repo, so a PR can't get its own
  preview URL there. That needs a host with built-in previews (Vercel, Netlify, Cloudflare Pages);
  only worth switching if reviewing PRs in a browser becomes a real need.
- **Multi-file editing / the Preview tab** — built once (Phase 4), then rolled back for UX reasons,
  not a technical failure. Full reasoning, what got removed, and what a future re-attempt should do
  differently: `docs/decisions/0008-roll-back-multi-file-and-preview.md`.
- **Multi-browser e2e coverage** — `playwright.config.ts` currently runs Chromium only, by
  deliberate choice for a solo MVP with no cross-browser bug reports yet. See that file's comment
  for the stated trigger condition (a real bug report, a second contributor) before adding
  Firefox/WebKit projects.
- **"Don't show again" for the welcome modal** — `src/onboarding/WelcomeModal.tsx` currently opens
  on every load (`welcomeModalStore.ts`'s `open` starts `true`, no persistence). Next step: add a
  `dismissed` flag to that store behind `persist` with `storage: persistStorage` (same pattern as
  `editorSettingsStore.ts`), gate the initial `open` value on it, and add its key to
  `src/settings/localData.ts`'s `PERSISTED_KEYS` so "Clear local data" and settings export/import
  both cover it.

# 0011 - Stay on Vite; don't migrate to Next.js

## Status

Accepted

## Context

After Phase 8, the idea of converting to Next.js came up "to account for future improvements even
after phase 10" — specifically real accounts, cloud save, and possibly multi-user collaboration.
Worth a real decision record rather than an implicit non-choice, since the question will
predictably resurface the moment any of those three features is actually scoped.

Evaluated what Next.js would actually buy this app:

- **Nothing for the current feature set.** Every phase of this build (Monaco, Web Workers, the
  sandboxed iframe execution model) is 100% client-only by construction — none of it can
  server-render, so adopting a meta-framework whose central value proposition is SSR/SSG buys zero
  benefit for the app's actual interactive surface while adding real complexity (`'use client'`
  boundaries, `next/dynamic(..., { ssr: false })` wrapping for anything Monaco-adjacent, a different
  bundler to reason about).
- **A concrete migration cost, not a hypothetical one.** This codebase already depends on
  Vite-specific `?worker` import syntax in three places (`transpile.worker.ts`,
  `monacoEnvironment.ts`'s two Monaco worker imports — see AGENTS.md's Monaco integration notes) —
  Next.js/webpack has no equivalent, and Monaco-under-webpack worker loading is a known pain point
  (part of why `@monaco-editor/react` exists). Migrating would mean re-verifying every
  Playwright-checked behavior from Phases 3-9 under a different bundler, several of which were
  bundler/module-resolution-shaped bugs in the first place (ADR 0006, and the manualChunks fix
  referenced in the Phase 9 commit).
- **The three motivating features don't actually need it.** Accounts, cloud save, and
  collaboration are backend concerns, not frontend-framework concerns — a Vite SPA calling a REST
  API or an SDK (Supabase, Clerk, a small Hono/Express service) gets the same outcome as Next.js API
  routes would, since Next API routes are just "a backend colocated in the repo," not a unique
  capability. Realtime collaboration in particular wants a dedicated WebSocket/CRDT sync layer (Yjs
  paired with something like Liveblocks, PartyKit, or `y-websocket`) regardless of what renders the
  frontend — traditional Next.js API routes don't handle long-lived connections well either.
- **The one legitimate trigger for a meta-framework** would be a genuine need for
  server-rendered, crawlable, public pages (a share-page with Open Graph previews, a marketing
  site) — nothing currently planned needs that; accounts/cloud-save are behind-login surfaces, not
  crawlable ones.

## Decision

Stay on Vite. If/when accounts, cloud save, or collaboration get scoped for real, the decision to
make then is which backend/service to pair with the existing Vite SPA (a strong default candidate:
Supabase, which covers auth + Postgres cloud-save + realtime subscriptions in one service with no
custom server code) — not which frontend framework to move to. If a genuinely SSR-shaped need shows
up later (a public share-page, SEO), that's more likely a small, separate app for just that public
surface than a rewrite of this one.

## Consequences

No migration cost paid now, no bundler-swap regression risk to the working Monaco/worker/sandbox
pipeline. Revisit this ADR specifically (not from scratch) if a concrete requirement for
server-rendered public pages materializes — that's the actual trigger condition, not "we're adding
a backend." See `docs/future-implementations.md` for where accounts, cloud save, and collaboration
currently stand.

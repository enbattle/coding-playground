# 0004 - Theme system is a token schema + runtime applier, built generation-ready

## Status

Accepted

## Context

Five distinct visual directions were mocked up and compared; three were selected (Instrument
Panel, Terminal Botanical, Cartographic Blueprint). The user then asked for two things: (1) a
switcher between the three without having to build every future feature three times, and (2) an
aspirational "describe your own theme in plain text" feature, inspired by Messenger's custom chat
themes, where free text produces a matching theme.

Building three visually distinct themes the naive way (per-theme component variants, or per-theme
CSS files with duplicated component styles) would mean exactly the 3x-work problem the user flagged.
Separately, the "type anything" feature fundamentally needs an LLM to turn open-ended text into a
coherent, accessible set of colors and fonts — that can't run safely from the browser without
exposing an API key, so it needs a backend endpoint that doesn't exist yet in this MVP.

## Decision

A theme is a plain, serializable `ThemeTokens` object (`src/theme/tokens.ts`): colors, radii,
shadow, and three font choices, all applied at runtime via `applyThemeTokens()`, which sets
`--cp-*` CSS custom properties on `<html>`. Every component styles itself once, against these
tokens — never against a specific theme's identity. The three curated themes
(`src/theme/presets.ts`) are just three instances of this same object; switching is a matter of
swapping which object is active (`src/theme/store.ts`, a persisted Zustand store).

Two deliberate exceptions to "everything is a token":

- **Fonts are constrained to a closed registry** (`src/theme/fonts.ts`, `FontKey` enum), not
  free-form family names. This matters specifically for future AI generation: an LLM only ever
  picks a _key_ out of fonts we've already vetted and can serve, never invents a family we'd have
  to trust or fail to load.
- **The handful of signature decorative details** (Instrument Panel's scanlines, Terminal
  Botanical's branch traces, Cartographic Blueprint's compass corners) are kept out of the token
  system entirely and live in `src/theme/motifs.tsx`, one component per theme, selected by a
  `motif` field. These are intentionally _not_ tokenized — collapsing them into shared values would
  flatten out exactly what makes each theme memorable. A generated theme has no bespoke art and
  renders with `motif: 'none'`, which is correct, not a limitation to fix later.

The custom-theme-from-text feature is scaffolded but not implemented: `src/theme/generate.ts`
exports `generateThemeFromPrompt(prompt): Promise<ThemeTokens>`, currently throwing, with a
detailed comment on the intended implementation (server endpoint holding the LLM key, structured
output constrained to `ThemeTokens`, WCAG contrast validation before accepting the result). The
store already has `setCustomTheme()` to receive a result, and the theme switcher UI
(`src/theme/ThemeSwitcher.tsx`) already has a disabled "Custom…" entry. Wiring the real generation
in later is filling in one function — no other part of the system changes.

## Consequences

New features get built once against tokens, not three times per theme — directly addresses the
concern that prompted this decision. The trade-off is a small amount of indirection today (every
themed value goes through a CSS custom property rather than a literal) for a system that scales to
more curated themes, and eventually generated ones, for free. The AI-generated-theme feature
remains genuinely unavailable until a backend endpoint exists — that's an explicit, accepted gap,
not an oversight. See `docs/future-implementations.md` for the concrete next step when this gets
picked up.

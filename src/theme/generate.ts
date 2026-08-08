import type { ThemeTokens } from './tokens'

/**
 * Placeholder for the "describe your own theme" feature (type a prompt, get a matching theme —
 * see docs/decisions/0004-theme-tokens-and-ai-ready-generation.md for the full reasoning).
 *
 * Deliberately not implemented yet: turning arbitrary text into a *coherent, accessible* set of
 * colors and fonts needs an LLM call, and doing that from the browser would mean shipping an API
 * key to every visitor. This is scaffolded now so wiring it up later is a matter of filling in
 * this one function — nothing else in the theme system needs to change (ThemeSwitcher.tsx already
 * has a disabled "Custom…" entry calling this; src/theme/store.ts already has `setCustomTheme` to
 * receive the result).
 *
 * The intended implementation, once there's a backend:
 *   1. POST the prompt to a server endpoint (a small serverless function is enough — this does not
 *      need the full backend architecture, just *a* place to hold the LLM API key server-side).
 *   2. The endpoint calls an LLM with structured output constrained to `ThemeTokens` minus `id`/
 *      `name`/`motif` (motif stays `'none'` for generated themes — see motifs.tsx) — critically,
 *      `fontDisplay`/`fontBody`/`fontMono` must be constrained to `FontKey` (an enum of the fonts
 *      already vetted and loadable — see fonts.ts), never a free-form string, so the model can only
 *      pick from fonts we already trust and can serve.
 *   3. Before returning, validate contrast: colorText, colorTextStrong, and colorDanger must each
 *      meet at least WCAG AA (4.5:1) against colorBg — reject or clamp toward the nearest compliant
 *      value rather than trusting the model's color choice outright.
 *   4. Client calls `useThemeStore.getState().setCustomTheme(tokens)`.
 */
export async function generateThemeFromPrompt(prompt: string): Promise<ThemeTokens> {
  void prompt
  throw new Error(
    'generateThemeFromPrompt is not implemented yet — it requires a backend endpoint to hold the LLM API key. See the comment on this function for the intended implementation.',
  )
}

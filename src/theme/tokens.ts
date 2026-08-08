import { ALLOWED_FONTS, ensureFontsLoaded, type FontKey } from './fonts'

/** Which decorative background layer (see ./motifs.tsx) a theme uses. `'none'` for themes with no bespoke art. */
export type MotifKey = 'instrument-panel' | 'terminal-botanical' | 'cartographic-blueprint' | 'none'

/**
 * The complete, serializable description of a theme. Every visual value a theme controls lives
 * here as plain data — nothing theme-specific is hardcoded into component CSS. This is what makes
 * the theme system "generation-ready": a curated theme and a future LLM-generated one (see
 * ./generate.ts) are both just a `ThemeTokens` object, applied through the same `applyThemeTokens`.
 */
export interface ThemeTokens {
  id: string
  name: string

  colorBg: string
  colorSurface: string
  colorSurface2: string
  colorBorder: string
  colorText: string
  colorTextDim: string
  colorTextStrong: string
  colorAccent: string
  colorAccent2: string
  colorDanger: string

  radiusSm: string
  radiusMd: string
  radiusLg: string
  shadow: string

  fontDisplay: FontKey
  fontBody: FontKey
  fontMono: FontKey
  trackingDisplay: string
  transformDisplay: 'uppercase' | 'none'

  motif: MotifKey
}

const CSS_VAR_MAP: Record<
  Exclude<keyof ThemeTokens, 'id' | 'name' | 'fontDisplay' | 'fontBody' | 'fontMono' | 'motif'>,
  string
> = {
  colorBg: '--cp-color-bg',
  colorSurface: '--cp-color-surface',
  colorSurface2: '--cp-color-surface-2',
  colorBorder: '--cp-color-border',
  colorText: '--cp-color-text',
  colorTextDim: '--cp-color-text-dim',
  colorTextStrong: '--cp-color-text-strong',
  colorAccent: '--cp-color-accent',
  colorAccent2: '--cp-color-accent-2',
  colorDanger: '--cp-color-danger',
  radiusSm: '--cp-radius-sm',
  radiusMd: '--cp-radius-md',
  radiusLg: '--cp-radius-lg',
  shadow: '--cp-shadow',
  trackingDisplay: '--cp-tracking-display',
  transformDisplay: '--cp-transform-display',
}

/**
 * Applies a full theme to the document: sets every `--cp-*` custom property on `<html>`, resolves
 * the three font keys to CSS font-family values, loads the fonts, and stamps `data-theme` (used
 * by ./motifs.tsx to pick the decorative layer, and available for the rare CSS override that
 * genuinely needs to key off the theme id directly).
 *
 * Safe to call for any valid `ThemeTokens`, curated or generated — this function has no knowledge
 * of which themes exist.
 */
export function applyThemeTokens(tokens: ThemeTokens): void {
  const root = document.documentElement

  for (const [key, cssVar] of Object.entries(CSS_VAR_MAP) as [keyof typeof CSS_VAR_MAP, string][]) {
    root.style.setProperty(cssVar, tokens[key])
  }

  root.style.setProperty('--cp-font-display', ALLOWED_FONTS[tokens.fontDisplay].family)
  root.style.setProperty('--cp-font-body', ALLOWED_FONTS[tokens.fontBody].family)
  root.style.setProperty('--cp-font-mono', ALLOWED_FONTS[tokens.fontMono].family)

  root.dataset.theme = tokens.id
  ensureFontsLoaded([tokens.fontDisplay, tokens.fontBody, tokens.fontMono])
}

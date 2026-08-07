/**
 * The closed set of fonts any theme — curated or future AI-generated — is allowed to reference.
 *
 * Constraining fonts to a known registry (rather than letting a theme name an arbitrary family)
 * matters for two reasons: we control exactly which Google Fonts get network-loaded, and it means
 * a future LLM-generated theme (see ./generate.ts) only ever has to pick a *key* out of this list,
 * never invent or hallucinate a font name we haven't vetted.
 */

export type FontKey =
  | 'fragment-mono'
  | 'ibm-plex-sans-condensed'
  | 'jetbrains-mono'
  | 'zilla-slab'
  | 'work-sans'
  | 'martian-mono'
  | 'big-shoulders-stencil'
  | 'public-sans'
  | 'ibm-plex-mono'

interface FontDefinition {
  /** CSS `font-family` value, including quotes and a fallback stack. */
  family: string
  /** The `family=` query segment for the Google Fonts CSS2 API. */
  googleFontsQuery: string
}

export const ALLOWED_FONTS: Record<FontKey, FontDefinition> = {
  'fragment-mono': {
    family: "'Fragment Mono', ui-monospace, monospace",
    googleFontsQuery: 'Fragment+Mono',
  },
  'ibm-plex-sans-condensed': {
    family: "'IBM Plex Sans Condensed', system-ui, sans-serif",
    googleFontsQuery: 'IBM+Plex+Sans+Condensed:wght@400;500;600',
  },
  'jetbrains-mono': {
    family: "'JetBrains Mono', ui-monospace, monospace",
    googleFontsQuery: 'JetBrains+Mono:wght@400;500',
  },
  'zilla-slab': {
    family: "'Zilla Slab', Georgia, serif",
    googleFontsQuery: 'Zilla+Slab:wght@500;600',
  },
  'work-sans': {
    family: "'Work Sans', system-ui, sans-serif",
    googleFontsQuery: 'Work+Sans:wght@400;500',
  },
  'martian-mono': {
    family: "'Martian Mono', ui-monospace, monospace",
    googleFontsQuery: 'Martian+Mono:wght@400;500',
  },
  'big-shoulders-stencil': {
    family: "'Big Shoulders Stencil', system-ui, sans-serif",
    googleFontsQuery: 'Big+Shoulders+Stencil:wght@600;700',
  },
  'public-sans': {
    family: "'Public Sans', system-ui, sans-serif",
    googleFontsQuery: 'Public+Sans:wght@400;500;600',
  },
  'ibm-plex-mono': {
    family: "'IBM Plex Mono', ui-monospace, monospace",
    googleFontsQuery: 'IBM+Plex+Mono:wght@400;500',
  },
}

const loadedHrefs = new Set<string>()

/** Injects a `<link>` for the Google Fonts CSS needed by the given font keys, deduped by URL. */
export function ensureFontsLoaded(keys: FontKey[]): void {
  const unique = [...new Set(keys)]
  const href =
    'https://fonts.googleapis.com/css2?' +
    unique.map((key) => `family=${ALLOWED_FONTS[key].googleFontsQuery}`).join('&') +
    '&display=swap'

  if (loadedHrefs.has(href)) return
  loadedHrefs.add(href)

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}

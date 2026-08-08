import * as monaco from 'monaco-editor/editor/editor.api'
import { THEME_PRESETS, type PresetThemeId } from '../theme/presets'
import type { ThemeTokens } from '../theme/tokens'
import { resolveActiveTokens, useThemeStore } from '../theme/store'

function toMonacoTheme(tokens: ThemeTokens): monaco.editor.IStandaloneThemeData {
  return {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: stripHash(tokens.colorTextDim), fontStyle: 'italic' },
      { token: 'keyword', foreground: stripHash(tokens.colorAccent) },
      { token: 'string', foreground: stripHash(tokens.colorText) },
      { token: 'number', foreground: stripHash(tokens.colorAccent2) },
      { token: 'type', foreground: stripHash(tokens.colorAccent2) },
      { token: 'function', foreground: stripHash(tokens.colorAccent2) },
      { token: 'identifier', foreground: stripHash(tokens.colorTextStrong) },
    ],
    colors: {
      'editor.background': tokens.colorSurface,
      'editor.foreground': tokens.colorText,
      'editorLineNumber.foreground': tokens.colorTextDim,
      'editorLineNumber.activeForeground': tokens.colorTextStrong,
      'editor.selectionBackground': withAlpha(tokens.colorAccent, 0.25),
      'editor.inactiveSelectionBackground': withAlpha(tokens.colorAccent, 0.12),
      'editorCursor.foreground': tokens.colorAccent,
      'editorGutter.background': tokens.colorSurface,
      'editorWidget.background': tokens.colorSurface2,
      'editorWidget.border': tokens.colorBorder,
      'editorSuggestWidget.background': tokens.colorSurface2,
      'editorSuggestWidget.border': tokens.colorBorder,
      'editorSuggestWidget.selectedBackground': withAlpha(tokens.colorAccent, 0.18),
      'editorHoverWidget.background': tokens.colorSurface2,
      'editorHoverWidget.border': tokens.colorBorder,
      'editor.lineHighlightBackground': withAlpha(tokens.colorTextDim, 0.08),
      'scrollbarSlider.background': withAlpha(tokens.colorTextDim, 0.2),
      'scrollbarSlider.hoverBackground': withAlpha(tokens.colorTextDim, 0.3),
    },
  }
}

/** Monaco color values must be `#rrggbb`/`#rgb` with no alpha suffix for the `rules` foreground field. */
function stripHash(color: string): string {
  return color.startsWith('#') ? color.slice(1) : color
}

/** Best-effort: only handles `#rrggbb` input, which is all our presets use for accent/text colors. */
function withAlpha(color: string, alpha: number): string {
  if (!color.startsWith('#') || color.length !== 7) return color
  const value = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return `${color}${value}`
}

const definedThemeIds = new Set<string>()

function ensureThemeDefined(id: string, tokens: ThemeTokens) {
  if (definedThemeIds.has(id)) return
  monaco.editor.defineTheme(id, toMonacoTheme(tokens))
  definedThemeIds.add(id)
}

/** Defines and applies the Monaco theme matching the currently active app theme, then keeps it in sync. */
export function syncMonacoTheme(): void {
  const apply = () => {
    const tokens = resolveActiveTokens(useThemeStore.getState())
    ensureThemeDefined(tokens.id, tokens)
    monaco.editor.setTheme(tokens.id)
  }

  // Curated presets are known up front, so their Monaco themes can be defined immediately —
  // avoids a flash of the wrong theme while a preset's tokens are first resolved.
  for (const id of Object.keys(THEME_PRESETS) as PresetThemeId[]) {
    ensureThemeDefined(id, THEME_PRESETS[id])
  }

  apply()
  useThemeStore.subscribe(apply)
}

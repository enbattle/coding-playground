import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyThemeTokens, type ThemeTokens } from './tokens';
import { DEFAULT_THEME_ID, THEME_PRESETS, type PresetThemeId } from './presets';
import { SETTINGS_SCHEMA_VERSION } from '../settings/schemaVersion';

interface ThemeState {
  /** A curated preset id, or `'custom'` for a generated theme held in `customTokens`. */
  activeId: PresetThemeId | 'custom';
  /** Populated once theme generation (./generate.ts) exists and produces a result. */
  customTokens: ThemeTokens | null;
  setPreset: (id: PresetThemeId) => void;
  setCustomTheme: (tokens: ThemeTokens) => void;
}

export function resolveActiveTokens(
  state: Pick<ThemeState, 'activeId' | 'customTokens'>,
): ThemeTokens {
  if (state.activeId === 'custom' && state.customTokens) return state.customTokens;
  return THEME_PRESETS[state.activeId as PresetThemeId] ?? THEME_PRESETS[DEFAULT_THEME_ID];
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      activeId: DEFAULT_THEME_ID,
      customTokens: null,
      setPreset: (id) => set({ activeId: id }),
      setCustomTheme: (tokens) => set({ activeId: 'custom', customTokens: tokens }),
    }),
    {
      name: 'coding-playground:theme',
      version: SETTINGS_SCHEMA_VERSION,
      // No prior versions exist yet — this is the seam for a future migration, not migrating
      // anything today. See src/settings/schemaVersion.ts.
      migrate: (persistedState) => persistedState as ThemeState,
    },
  ),
);

// Applied once at module load (synchronous localStorage hydration means this runs before React's
// first render), then kept in sync on every change. This is what avoids a flash of default-themed
// content on reload.
applyThemeTokens(resolveActiveTokens(useThemeStore.getState()));
useThemeStore.subscribe((state) => applyThemeTokens(resolveActiveTokens(state)));

import { useThemeStore } from '../theme/store';
import { THEME_PRESETS } from '../theme/presets';
import { useCompilerOptionsStore, getCompilerOptionValues } from './compilerOptionsStore';
import { useEditorSettingsStore } from './editorSettingsStore';
import { DEFAULT_COMPILER_OPTIONS } from './compilerOptions';
import { DEFAULT_EDITOR_SETTINGS } from './editorSettings';
import { SETTINGS_SCHEMA_VERSION } from './schemaVersion';

/** The localStorage keys this app owns — see each store's `persist` config for where these live. */
const PERSISTED_KEYS = [
  'coding-playground:theme',
  'coding-playground:compiler-options',
  'coding-playground:editor-settings',
];

export function clearLocalData(): void {
  for (const key of PERSISTED_KEYS) localStorage.removeItem(key);
  // Reload rather than reset each store in place — guarantees every in-memory store (and
  // anything derived from it, like Monaco's applied compiler options) ends up in the same state a
  // fresh visitor would see, instead of us having to hand-maintain a "reset to defaults" path per
  // store that's only ever exercised here.
  window.location.reload();
}

interface ExportedSettings {
  schemaVersion: number;
  theme: { activeId: string };
  compilerOptions: ReturnType<typeof getCompilerOptionValues>;
  editorSettings: typeof DEFAULT_EDITOR_SETTINGS;
}

export function exportSettings(): void {
  const payload: ExportedSettings = {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    theme: { activeId: useThemeStore.getState().activeId },
    compilerOptions: getCompilerOptionValues(),
    editorSettings: { ...useEditorSettingsStore.getState() },
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'coding-playground-settings.json';
  link.click();
  URL.revokeObjectURL(url);
}

/** Best-effort — applies whatever recognizable fields are present, ignores the rest. Never throws. */
export function importSettingsFromText(text: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return;
  }
  if (typeof parsed !== 'object' || parsed === null) return;
  const data = parsed as Partial<ExportedSettings>;

  if (
    data.theme &&
    typeof data.theme.activeId === 'string' &&
    data.theme.activeId in THEME_PRESETS
  ) {
    useThemeStore.getState().setPreset(data.theme.activeId as never);
  }

  if (data.compilerOptions && typeof data.compilerOptions === 'object') {
    for (const key of Object.keys(
      DEFAULT_COMPILER_OPTIONS,
    ) as (keyof typeof DEFAULT_COMPILER_OPTIONS)[]) {
      if (key in data.compilerOptions) {
        useCompilerOptionsStore.getState().setOption(key, data.compilerOptions[key] as never);
      }
    }
  }

  if (data.editorSettings && typeof data.editorSettings === 'object') {
    for (const key of Object.keys(
      DEFAULT_EDITOR_SETTINGS,
    ) as (keyof typeof DEFAULT_EDITOR_SETTINGS)[]) {
      if (key in data.editorSettings) {
        useEditorSettingsStore.getState().setOption(key, data.editorSettings[key] as never);
      }
    }
  }
}

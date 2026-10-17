import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_EDITOR_SETTINGS, type EditorSettingValues } from './editorSettings';
import { persistStorage } from './safeStorage';
import { SETTINGS_SCHEMA_VERSION } from './schemaVersion';

interface EditorSettingsState extends EditorSettingValues {
  setOption: <K extends keyof EditorSettingValues>(key: K, value: EditorSettingValues[K]) => void;
}

export const useEditorSettingsStore = create<EditorSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_EDITOR_SETTINGS,
      setOption: (key, value) => set({ [key]: value } as Partial<EditorSettingsState>),
    }),
    {
      name: 'coding-playground:editor-settings',
      version: SETTINGS_SCHEMA_VERSION,
      storage: persistStorage,
      migrate: (persistedState) => persistedState as EditorSettingsState,
    },
  ),
);

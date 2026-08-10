import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEditorStore } from '../editor/store';
import { DEFAULT_COMPILER_OPTIONS, type CompilerOptionValues } from '../settings/compilerOptions';
import { getCompilerOptionValues, useCompilerOptionsStore } from '../settings/compilerOptionsStore';
import { SETTINGS_SCHEMA_VERSION } from '../settings/schemaVersion';

export interface SavedPlayground {
  id: string;
  name: string;
  code: string;
  compilerOptions: CompilerOptionValues;
  savedAt: number;
}

interface SavedPlaygroundsState {
  items: SavedPlayground[];
  save: (name: string) => void;
  remove: (id: string) => void;
  load: (id: string) => void;
}

export const useSavedPlaygroundsStore = create<SavedPlaygroundsState>()(
  persist(
    (set, get) => ({
      items: [],
      save: (name) => {
        const item: SavedPlayground = {
          id: crypto.randomUUID(),
          name,
          code: useEditorStore.getState().content,
          compilerOptions: getCompilerOptionValues(),
          savedAt: Date.now(),
        };
        set({ items: [item, ...get().items] });
      },
      remove: (id) => set({ items: get().items.filter((item) => item.id !== id) }),
      load: (id) => {
        const item = get().items.find((entry) => entry.id === id);
        if (!item) return;
        useEditorStore.getState().setContent(item.code);
        for (const key of Object.keys(DEFAULT_COMPILER_OPTIONS) as (keyof CompilerOptionValues)[]) {
          useCompilerOptionsStore.getState().setOption(key, item.compilerOptions[key]);
        }
      },
    }),
    {
      name: 'coding-playground:saved-playgrounds',
      version: SETTINGS_SCHEMA_VERSION,
      migrate: (persistedState) => persistedState as SavedPlaygroundsState,
    },
  ),
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEditorStore } from '../editor/store';
import {
  DEFAULT_COMPILER_OPTIONS,
  pickCompilerOptions,
  type CompilerOptionValues,
} from '../settings/compilerOptions';
import { getCompilerOptionValues, useCompilerOptionsStore } from '../settings/compilerOptionsStore';
import { SETTINGS_SCHEMA_VERSION } from '../settings/schemaVersion';

interface SavedPlayground {
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
        // A snapshot saved before an option existed won't carry it — defaults fill the gap rather
        // than whatever happens to be set now.
        useCompilerOptionsStore.setState({
          ...DEFAULT_COMPILER_OPTIONS,
          ...pickCompilerOptions(item.compilerOptions),
        });
      },
    }),
    {
      name: 'coding-playground:saved-playgrounds',
      version: SETTINGS_SCHEMA_VERSION,
      migrate: (persistedState) => persistedState as SavedPlaygroundsState,
    },
  ),
);

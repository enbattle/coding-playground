import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createSafeStorage } from '../settings/safeStorage';
import { SETTINGS_SCHEMA_VERSION } from '../settings/schemaVersion';

export const NOTES_STORAGE_KEY = 'coding-playground:notes';

interface NotesState {
  text: string;
  setText: (text: string) => void;
}

/**
 * Notes are private to the browser tab (ADR 0014): sessionStorage keeps them across a reload but
 * drops them when the tab closes, and each tab has its own. The one store that deliberately
 * doesn't use `persistStorage` (localStorage). Never add notes to share links, saved playgrounds
 * or settings export without revisiting that ADR.
 */
export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      text: '',
      setText: (text) => set({ text }),
    }),
    {
      name: NOTES_STORAGE_KEY,
      version: SETTINGS_SCHEMA_VERSION,
      storage: createJSONStorage(() => createSafeStorage(() => sessionStorage)),
      migrate: (persistedState) => persistedState as NotesState,
    },
  ),
);

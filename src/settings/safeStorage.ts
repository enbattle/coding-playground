import { create } from 'zustand';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

interface StorageHealthState {
  /** True while the latest localStorage write failed (in practice: the origin's quota is full). */
  writeFailed: boolean;
}

/** Drives the "changes aren't being saved" warning in the app footer. */
export const useStorageHealthStore = create<StorageHealthState>()(() => ({ writeFailed: false }));

/**
 * Wraps localStorage so a refused write is reported instead of thrown. Zustand's persist
 * middleware doesn't catch storage errors, so once the quota filled up (saved playgrounds each
 * hold a full copy of the code), the error escaped from every `set()`: Save threw out of its
 * handler, and each autosave keystroke threw inside Monaco's change listener. The user's work
 * silently stopped being saved. In-memory state still updates; the footer says it isn't saved.
 */
export function createSafeStorage(getStorage: () => Storage): StateStorage {
  return {
    getItem: (name) => getStorage().getItem(name),
    removeItem: (name) => getStorage().removeItem(name),
    setItem: (name, value) => {
      try {
        getStorage().setItem(name, value);
        if (useStorageHealthStore.getState().writeFailed) {
          useStorageHealthStore.setState({ writeFailed: false });
        }
      } catch {
        useStorageHealthStore.setState({ writeFailed: true });
      }
    },
  };
}

/** The `storage` option every persisted store in this app uses. */
export const persistStorage = createJSONStorage(() => createSafeStorage(() => localStorage));

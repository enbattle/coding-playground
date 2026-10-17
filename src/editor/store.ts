import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from '../settings/safeStorage';
import { SETTINGS_SCHEMA_VERSION } from '../settings/schemaVersion';

export const SAMPLE_SOURCE = `function greet(name: string): string {
  return \`Hello, ${'${name}'}!\`
}

console.log(greet("world"))
`;

interface EditorState {
  /** Single-file content — see ADR 0008 (multi-file was rolled back). */
  content: string;
  setContent: (content: string) => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      content: SAMPLE_SOURCE,
      setContent: (content) => set({ content }),
    }),
    {
      name: 'coding-playground:editor-content',
      version: SETTINGS_SCHEMA_VERSION,
      storage: persistStorage,
      migrate: (persistedState) => persistedState as EditorState,
    },
  ),
);

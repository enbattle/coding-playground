import { create } from 'zustand';

const SAMPLE_SOURCE = `function greet(name: string): string {
  return \`Hello, ${'${name}'}!\`
}

console.log(greet("world"))
`;

interface EditorState {
  /** Single-file content for now — Phase 4 replaces this with a virtual multi-file store. */
  content: string;
  setContent: (content: string) => void;
}

export const useEditorStore = create<EditorState>()((set) => ({
  content: SAMPLE_SOURCE,
  setContent: (content) => set({ content }),
}));

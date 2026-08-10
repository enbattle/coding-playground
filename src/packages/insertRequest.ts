import { create } from 'zustand';

interface InsertRequestState {
  pendingSnippet: string | null;
  request: (snippet: string) => void;
  clear: () => void;
}

/** A one-shot command: "insert this text at the cursor" — MonacoEditor.tsx is the consumer. */
export const useInsertRequestStore = create<InsertRequestState>()((set) => ({
  pendingSnippet: null,
  request: (snippet) => set({ pendingSnippet: snippet }),
  clear: () => set({ pendingSnippet: null }),
}));

/** `import {  } from 'name';` with the cursor left between the braces, ready to type. */
export function importSnippetFor(packageName: string): string {
  return `import {  } from '${packageName}';\n`;
}

/** Characters from the start of the snippet to where the cursor should land. */
export const IMPORT_SNIPPET_CURSOR_OFFSET = 'import { '.length;

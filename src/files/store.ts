import { create } from 'zustand';

/** Flat namespace only for the MVP — no directories. Every path is `/name.ext`. */
export interface VirtualFile {
  path: string;
  content: string;
}

/** The one file that always exists and is always the execution entry point. */
export const ENTRY_PATH = '/index.ts';

export const ALLOWED_EXTENSIONS = ['ts', 'tsx', 'html', 'css', 'json'] as const;
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

const SAMPLE_SOURCE = `function greet(name: string): string {
  return \`Hello, ${'${name}'}!\`;
}

console.log(greet('world'));
`;

function extensionOf(path: string): string {
  return path.slice(path.lastIndexOf('.') + 1).toLowerCase();
}

export function isTranspilable(path: string): boolean {
  const ext = extensionOf(path);
  return ext === 'ts' || ext === 'tsx';
}

interface FilesState {
  files: Record<string, VirtualFile>;
  /** Tab display order — separate from `files`' keys so reordering doesn't need to touch content. */
  order: string[];
  activePath: string;
  setActivePath: (path: string) => void;
  updateContent: (path: string, content: string) => void;
  /** Returns the created path (deduped against collisions), or null if the name is invalid. */
  createFile: (requestedName: string) => string | null;
  /** No-op if `path` is `ENTRY_PATH` — it can never be renamed away. */
  renameFile: (path: string, requestedName: string) => void;
  /** No-op if `path` is `ENTRY_PATH` — it can never be deleted. */
  deleteFile: (path: string) => void;
}

function normalizeName(requestedName: string): string | null {
  const trimmed = requestedName.trim().replace(/^\/+/, '');
  if (!trimmed) return null;
  const hasExtension = ALLOWED_EXTENSIONS.some((ext) => trimmed.toLowerCase().endsWith(`.${ext}`));
  const name = hasExtension ? trimmed : `${trimmed}.ts`;
  if (!ALLOWED_EXTENSIONS.includes(extensionOf(name) as AllowedExtension)) return null;
  if (/[\\/]/.test(name)) return null; // flat namespace only
  return `/${name}`;
}

function dedupe(path: string, existing: Record<string, VirtualFile>): string {
  if (!existing[path]) return path;
  const dot = path.lastIndexOf('.');
  const base = path.slice(0, dot);
  const ext = path.slice(dot);
  let n = 2;
  while (existing[`${base}-${n}${ext}`]) n++;
  return `${base}-${n}${ext}`;
}

export const useFilesStore = create<FilesState>()((set, get) => ({
  files: { [ENTRY_PATH]: { path: ENTRY_PATH, content: SAMPLE_SOURCE } },
  order: [ENTRY_PATH],
  activePath: ENTRY_PATH,

  setActivePath: (path) => {
    if (get().files[path]) set({ activePath: path });
  },

  updateContent: (path, content) =>
    set((state) => {
      if (!state.files[path]) return state;
      return { files: { ...state.files, [path]: { path, content } } };
    }),

  createFile: (requestedName) => {
    const normalized = normalizeName(requestedName);
    if (!normalized) return null;
    const path = dedupe(normalized, get().files);
    set((state) => ({
      files: { ...state.files, [path]: { path, content: '' } },
      order: [...state.order, path],
      activePath: path,
    }));
    return path;
  },

  renameFile: (path, requestedName) => {
    if (path === ENTRY_PATH) return;
    const normalized = normalizeName(requestedName);
    if (!normalized || normalized === path) return;
    set((state) => {
      if (!state.files[path]) return state;
      const newPath = dedupe(normalized, state.files);
      const { [path]: file, ...rest } = state.files;
      return {
        files: { ...rest, [newPath]: { path: newPath, content: file.content } },
        order: state.order.map((p) => (p === path ? newPath : p)),
        activePath: state.activePath === path ? newPath : state.activePath,
      };
    });
  },

  deleteFile: (path) => {
    if (path === ENTRY_PATH) return;
    set((state) => {
      if (!state.files[path]) return state;
      const { [path]: _removed, ...rest } = state.files;
      const order = state.order.filter((p) => p !== path);
      const activePath = state.activePath === path ? ENTRY_PATH : state.activePath;
      return { files: rest, order, activePath };
    });
  },
}));

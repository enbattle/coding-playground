import { create } from 'zustand';

interface CommandPaletteState {
  open: boolean;
  query: string;
  setOpen: (open: boolean) => void;
  setQuery: (query: string) => void;
  toggle: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>()((set, get) => ({
  open: false,
  query: '',
  setOpen: (open) => set({ open, query: open ? get().query : '' }),
  setQuery: (query) => set({ query }),
  toggle: () => get().setOpen(!get().open),
}));

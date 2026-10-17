import { create } from 'zustand';
import type { ConsoleLevel } from './runtimeMessage';

interface ConsoleEntry {
  id: number;
  level: ConsoleLevel;
  text: string;
}

type NewConsoleEntry = Omit<ConsoleEntry, 'id'>;

/**
 * The console keeps only the latest lines. A program can log far faster than the DOM can render
 * (`for (…200000) console.log(i)`), and an uncapped list made both the store update and the render
 * grow with total output until the tab hung. The sandbox applies the same cap to each batch it
 * sends (sandboxHarness.ts), so neither side ever holds more than this.
 */
export const MAX_CONSOLE_ENTRIES = 1000;

interface ExecutionState {
  entries: ConsoleEntry[];
  /** Lines dropped to stay under MAX_CONSOLE_ENTRIES, here or already in the sandbox. */
  hiddenCount: number;
  status: 'idle' | 'running';
  append: (entry: NewConsoleEntry) => void;
  /** One store update per batch; `droppedBefore` counts lines the sandbox dropped first. */
  appendMany: (entries: NewConsoleEntry[], droppedBefore?: number) => void;
  clear: () => void;
  setStatus: (status: ExecutionState['status']) => void;
}

let nextEntryId = 0;

export const useExecutionStore = create<ExecutionState>()((set, get) => ({
  entries: [],
  hiddenCount: 0,
  status: 'idle',
  append: (entry) => get().appendMany([entry]),
  appendMany: (incoming, droppedBefore = 0) =>
    set((state) => {
      const combined = [
        ...state.entries,
        ...incoming.map((entry) => ({ ...entry, id: nextEntryId++ })),
      ];
      const overflow = Math.max(0, combined.length - MAX_CONSOLE_ENTRIES);
      return {
        entries: overflow > 0 ? combined.slice(overflow) : combined,
        hiddenCount: state.hiddenCount + droppedBefore + overflow,
      };
    }),
  clear: () => set({ entries: [], hiddenCount: 0 }),
  setStatus: (status) => set({ status }),
}));

import { create } from 'zustand';

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

export interface DiagnosticEntry {
  path: string;
  message: string;
  severity: DiagnosticSeverity;
  line: number;
  column: number;
}

interface RevealTarget {
  path: string;
  line: number;
  column: number;
}

interface DiagnosticsState {
  byPath: Record<string, DiagnosticEntry[]>;
  setForPath: (path: string, entries: DiagnosticEntry[]) => void;
  clearPath: (path: string) => void;
  revealTarget: RevealTarget | null;
  requestReveal: (target: RevealTarget) => void;
  clearReveal: () => void;
}

export const useDiagnosticsStore = create<DiagnosticsState>()((set) => ({
  byPath: {},
  setForPath: (path, entries) => set((state) => ({ byPath: { ...state.byPath, [path]: entries } })),
  clearPath: (path) =>
    set((state) => {
      if (!(path in state.byPath)) return state;
      const { [path]: _removed, ...rest } = state.byPath;
      return { byPath: rest };
    }),
  revealTarget: null,
  requestReveal: (target) => set({ revealTarget: target }),
  clearReveal: () => set({ revealTarget: null }),
}));

export function useProblemsCount(): number {
  return useDiagnosticsStore((state) =>
    Object.values(state.byPath).reduce((total, entries) => total + entries.length, 0),
  );
}

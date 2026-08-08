import { create } from 'zustand'
import type { ConsoleLevel } from './runtimeMessage'

export interface ConsoleEntry {
  id: number
  level: ConsoleLevel
  text: string
}

interface ExecutionState {
  entries: ConsoleEntry[]
  status: 'idle' | 'running'
  append: (entry: Omit<ConsoleEntry, 'id'>) => void
  clear: () => void
  setStatus: (status: ExecutionState['status']) => void
}

let nextEntryId = 0

export const useExecutionStore = create<ExecutionState>()((set) => ({
  entries: [],
  status: 'idle',
  append: (entry) =>
    set((state) => ({ entries: [...state.entries, { ...entry, id: nextEntryId++ }] })),
  clear: () => set({ entries: [] }),
  setStatus: (status) => set({ status }),
}))

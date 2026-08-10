import { create } from 'zustand';

interface FormatCommandState {
  /** Increments on every request — a plain boolean/null wouldn't notify subscribers on a second
   * request in a row if nothing else changed in between. */
  requestId: number;
  request: () => void;
}

/** A one-shot command: "run Monaco's native Format Document action now." Consumed by MonacoEditor. */
export const useFormatCommandStore = create<FormatCommandState>()((set, get) => ({
  requestId: 0,
  request: () => set({ requestId: get().requestId + 1 }),
}));

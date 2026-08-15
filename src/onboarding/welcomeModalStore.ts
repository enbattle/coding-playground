import { create } from 'zustand';

interface WelcomeModalState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

/**
 * `open` starts `true` so the welcome modal shows on every load — there's no "don't show again"
 * persistence yet (deliberately deferred, see WelcomeModal.tsx). No `persist` middleware here for
 * that reason; add one alongside a dismissed-state flag if that lands later.
 */
export const useWelcomeModalStore = create<WelcomeModalState>()((set) => ({
  open: true,
  setOpen: (open) => set({ open }),
}));

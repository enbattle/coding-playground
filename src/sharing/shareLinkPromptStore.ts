import { create } from 'zustand';
import type { SharedPlayground } from './shareLink';

interface ShareLinkPromptState {
  /** A share link waiting on the user's confirmation; null when there's nothing to ask about. */
  pending: SharedPlayground | null;
  setPending: (pending: SharedPlayground | null) => void;
}

/** Not persisted: a pending link only exists for the page load that opened it. */
export const useShareLinkPromptStore = create<ShareLinkPromptState>()((set) => ({
  pending: null,
  setPending: (pending) => set({ pending }),
}));

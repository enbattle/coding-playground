import { afterEach, describe, expect, it } from 'vitest';
import { NOTES_STORAGE_KEY, useNotesStore } from './store';

describe('notes store', () => {
  afterEach(() => {
    useNotesStore.getState().setText('');
    sessionStorage.clear();
    localStorage.clear();
  });

  // ADR 0014: notes are private to the browser tab. sessionStorage survives a reload but is
  // dropped when the tab closes; localStorage would keep them forever and share them across tabs.
  it('keeps notes in sessionStorage, never localStorage', () => {
    useNotesStore.getState().setText('remember to try zod');

    expect(sessionStorage.getItem(NOTES_STORAGE_KEY)).toContain('remember to try zod');
    expect(Object.values({ ...localStorage }).join('')).not.toContain('remember to try zod');
  });
});

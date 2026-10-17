import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSavedPlaygroundsStore } from '../sharing/savedPlaygroundsStore';
import { createSafeStorage, useStorageHealthStore } from './safeStorage';

const quotaExceeded = () => {
  throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
};

describe('createSafeStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useStorageHealthStore.setState({ writeFailed: false });
  });

  it('passes reads and writes through', () => {
    const storage = createSafeStorage(() => localStorage);
    storage.setItem('safe-storage-test', 'value');
    expect(storage.getItem('safe-storage-test')).toBe('value');
    expect(useStorageHealthStore.getState().writeFailed).toBe(false);
  });

  it('reports a failed write instead of throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(quotaExceeded);
    const storage = createSafeStorage(() => localStorage);
    expect(() => storage.setItem('safe-storage-test', 'value')).not.toThrow();
    expect(useStorageHealthStore.getState().writeFailed).toBe(true);
  });

  it('clears the failure once a write succeeds again', () => {
    useStorageHealthStore.setState({ writeFailed: true });
    createSafeStorage(() => localStorage).setItem('safe-storage-test', 'value');
    expect(useStorageHealthStore.getState().writeFailed).toBe(false);
  });

  // The persist middleware lets a storage error escape from set(): saving a playground used to
  // throw out of the Save handler, and every autosave keystroke threw inside Monaco's listener.
  it('keeps a persisted store usable when storage is full', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(quotaExceeded);
    expect(() => useSavedPlaygroundsStore.getState().save('snapshot')).not.toThrow();
    expect(useStorageHealthStore.getState().writeFailed).toBe(true);
  });
});

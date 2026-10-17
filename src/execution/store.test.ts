import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_CONSOLE_ENTRIES, useExecutionStore } from './store';

const lines = (count: number, prefix = 'line') =>
  Array.from({ length: count }, (_, index) => ({
    level: 'log' as const,
    text: `${prefix} ${index}`,
  }));

describe('execution store console buffer', () => {
  beforeEach(() => useExecutionStore.getState().clear());

  it('appends a batch in order', () => {
    useExecutionStore.getState().appendMany(lines(3));
    expect(useExecutionStore.getState().entries.map((entry) => entry.text)).toEqual([
      'line 0',
      'line 1',
      'line 2',
    ]);
  });

  it('keeps only the latest entries and counts what it dropped', () => {
    useExecutionStore.getState().appendMany(lines(MAX_CONSOLE_ENTRIES + 5));
    const { entries, hiddenCount } = useExecutionStore.getState();
    expect(entries).toHaveLength(MAX_CONSOLE_ENTRIES);
    expect(entries[0].text).toBe('line 5');
    expect(hiddenCount).toBe(5);
  });

  it('adds lines the sandbox already dropped to the hidden count', () => {
    useExecutionStore.getState().appendMany(lines(2), 40);
    expect(useExecutionStore.getState().hiddenCount).toBe(40);
  });

  it('clear resets the hidden count too', () => {
    useExecutionStore.getState().appendMany(lines(MAX_CONSOLE_ENTRIES + 1));
    useExecutionStore.getState().clear();
    expect(useExecutionStore.getState().hiddenCount).toBe(0);
  });
});

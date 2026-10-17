import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFormatCommandStore } from '../editor/formatCommand';
import { useRunnerStore } from '../execution/runnerStore';
import { CommandPalette } from './CommandPalette';
import { useCommandPaletteStore } from './store';

describe('CommandPalette', () => {
  const run = vi.fn(async () => {});

  beforeEach(() => {
    run.mockClear();
    useRunnerStore.setState({ run });
    useFormatCommandStore.setState({ requestId: 0 });
    useCommandPaletteStore.setState({ open: true, query: 'format' });
  });

  // ⌘/Ctrl+Enter means "run my code" everywhere. In the palette's input it used to also count as
  // plain Enter, running the highlighted command too.
  it('Ctrl+Enter in the search box runs the code once and nothing else', async () => {
    render(<CommandPalette />);
    await userEvent.keyboard('{Control>}{Enter}{/Control}');

    expect(run).toHaveBeenCalledTimes(1);
    expect(useFormatCommandStore.getState().requestId).toBe(0);
  });

  it('plain Enter still runs the highlighted command', async () => {
    render(<CommandPalette />);
    await userEvent.keyboard('{Enter}');

    expect(useFormatCommandStore.getState().requestId).toBe(1);
    expect(run).not.toHaveBeenCalled();
  });
});

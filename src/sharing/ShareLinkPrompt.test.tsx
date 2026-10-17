import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from '../editor/store';
import { DEFAULT_COMPILER_OPTIONS } from '../settings/compilerOptions';
import { useCompilerOptionsStore } from '../settings/compilerOptionsStore';
import { useSavedPlaygroundsStore } from './savedPlaygroundsStore';
import { ShareLinkPrompt } from './ShareLinkPrompt';
import { useShareLinkPromptStore } from './shareLinkPromptStore';

const SHARED = {
  code: 'console.log("shared")',
  compilerOptions: { ...DEFAULT_COMPILER_OPTIONS, strict: false },
};

describe('ShareLinkPrompt', () => {
  beforeEach(() => {
    useEditorStore.setState({ content: 'my unsaved work' });
    useCompilerOptionsStore.setState(DEFAULT_COMPILER_OPTIONS);
    useSavedPlaygroundsStore.setState({ items: [] });
    useShareLinkPromptStore.setState({ pending: SHARED });
  });

  it('shows what the link contains', () => {
    render(<ShareLinkPrompt />);
    expect(screen.getByRole('dialog', { name: 'Open shared code?' })).toBeInTheDocument();
    expect(screen.getByText('console.log("shared")')).toBeInTheDocument();
  });

  it('opening the link saves the current work first, then applies the shared code', async () => {
    render(<ShareLinkPrompt />);
    await userEvent.click(screen.getByRole('button', { name: 'Open shared code' }));

    expect(useEditorStore.getState().content).toBe('console.log("shared")');
    expect(useCompilerOptionsStore.getState().strict).toBe(false);
    const [snapshot] = useSavedPlaygroundsStore.getState().items;
    expect(snapshot.code).toBe('my unsaved work');
    expect(snapshot.name).toMatch(/^Before shared link/);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeping my code discards the link and changes nothing', async () => {
    render(<ShareLinkPrompt />);
    await userEvent.click(screen.getByRole('button', { name: 'Keep my code' }));

    expect(useEditorStore.getState().content).toBe('my unsaved work');
    expect(useSavedPlaygroundsStore.getState().items).toEqual([]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Escape is the safe choice: it keeps the current code', async () => {
    render(<ShareLinkPrompt />);
    await userEvent.keyboard('{Escape}');

    expect(useEditorStore.getState().content).toBe('my unsaved work');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

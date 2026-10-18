import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { NotesPanel } from './NotesPanel';
import { useNotesStore } from './store';

function Harness({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  return <NotesPanel open={open} onToggle={() => setOpen((value) => !value)} />;
}

describe('NotesPanel', () => {
  afterEach(() => {
    useNotesStore.getState().setText('');
    sessionStorage.clear();
  });

  it('collapses to a header and expands to a labelled text box', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const toggle = screen.getByRole('button', { name: /notes/i, expanded: false });
    expect(screen.queryByRole('textbox', { name: 'Notes' })).not.toBeInTheDocument();

    await user.click(toggle);

    expect(screen.getByRole('button', { name: /notes/i, expanded: true })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Notes' })).toBeInTheDocument();
  });

  it('says notes are private to the tab whenever the text box is shown', () => {
    render(<Harness initiallyOpen />);

    expect(
      screen.getByText('Private to this tab: cleared when you close it, never saved or shared.'),
    ).toBeInTheDocument();
  });

  it('stores what is typed', async () => {
    const user = userEvent.setup();
    render(<Harness initiallyOpen />);

    await user.type(screen.getByRole('textbox', { name: 'Notes' }), 'try rxjs retry');

    expect(useNotesStore.getState().text).toBe('try rxjs retry');
  });

  // A hover-only tooltip never shows for keyboard users; WCAG 1.4.13 also wants it dismissable.
  it('shows the privacy tooltip on keyboard focus and hides it on Escape', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const info = screen.getByRole('button', { name: 'About notes' });

    await user.tab();
    await user.tab();
    expect(info).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveTextContent(/closing the tab deletes them/);
    expect(info).toHaveAccessibleDescription(/closing the tab deletes them/);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

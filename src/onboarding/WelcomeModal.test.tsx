import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from '../editor/store';
import { useWelcomeModalStore } from './welcomeModalStore';
import { WelcomeModal } from './WelcomeModal';

describe('WelcomeModal', () => {
  beforeEach(() => {
    useWelcomeModalStore.setState({ open: true });
  });

  it('shows on render and closes via the close button', async () => {
    render(<WelcomeModal />);
    expect(screen.getByRole('dialog', { name: 'Welcome' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Close welcome' }));
    expect(screen.queryByRole('dialog', { name: 'Welcome' })).not.toBeInTheDocument();
  });

  it('closes when clicking outside the panel', async () => {
    const { container } = render(<WelcomeModal />);
    await userEvent.click(container.firstChild as HTMLElement);
    expect(screen.queryByRole('dialog', { name: 'Welcome' })).not.toBeInTheDocument();
  });

  it('does not close when clicking inside the panel', async () => {
    render(<WelcomeModal />);
    await userEvent.click(screen.getByRole('dialog', { name: 'Welcome' }));
    expect(screen.getByRole('dialog', { name: 'Welcome' })).toBeInTheDocument();
  });

  it('loading an example sets the editor content and closes the modal', async () => {
    render(<WelcomeModal />);
    await userEvent.click(screen.getByRole('button', { name: 'Array pipeline' }));
    expect(useEditorStore.getState().content).toContain('sumOfSquaresOfEvens');
    expect(screen.queryByRole('dialog', { name: 'Welcome' })).not.toBeInTheDocument();
  });

  it('lists the keyboard shortcuts also shown in Settings', () => {
    render(<WelcomeModal />);
    expect(screen.getByText('Command Palette')).toBeInTheDocument();
    expect(screen.getByText('Run Code')).toBeInTheDocument();
    expect(screen.getByText('⌘⏎')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

// Monaco requires real browser APIs (matchMedia, ResizeObserver, canvas text measurement) that
// jsdom doesn't provide — mocked here so this test can verify the surrounding app chrome without
// trying to mount a real editor instance. Actual editor behavior is verified by hand against a
// real browser (see docs/decisions/); Phase 9 formalizes that into a Playwright e2e suite.
vi.mock('./editor/MonacoEditor', () => ({
  MonacoEditor: () => null,
}));

describe('App', () => {
  it('renders the app shell with a run control and a theme switcher trigger', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Instrument Panel/i })).toBeInTheDocument();
  });

  it('opens the floating theme switcher to reveal the theme options', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Instrument Panel/i }));
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Terminal Botanical/i })).toBeInTheDocument();
  });
});

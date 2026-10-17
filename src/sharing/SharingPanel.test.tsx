import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SharingPanel } from './SharingPanel';

describe('SharingPanel', () => {
  afterEach(() => vi.restoreAllMocks());

  // writeText rejects without clipboard permission, in an insecure context, or when the document
  // isn't focused — previously an unhandled rejection with the button still saying "Copy link".
  it('says so when copying the link fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    render(<SharingPanel />);

    await user.click(screen.getByRole('button', { name: '⇪ Share' }));
    await user.click(screen.getByRole('button', { name: 'Copy link' }));

    expect(await screen.findByRole('button', { name: "Couldn't copy" })).toBeInTheDocument();
  });
});

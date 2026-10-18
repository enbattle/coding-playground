import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SplitPane } from './SplitPane';

describe('SplitPane', () => {
  it('splits side by side by default', () => {
    render(<SplitPane first="a" second="b" />);

    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical');
  });

  // ARIA orientation describes the divider itself: stacked panes have a horizontal divider.
  it('stacks top and bottom when vertical', () => {
    render(<SplitPane orientation="vertical" first="a" second="b" />);

    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('drops the divider while the second pane is collapsed, keeping both panes mounted', () => {
    render(<SplitPane orientation="vertical" first="a" second="b" secondCollapsed />);

    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
  });
});

/**
 * LiveIndicator Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../../test/test-utils';
import { LiveIndicator } from '../LiveIndicator';

describe('LiveIndicator', () => {
  it('renders live indicator', () => {
    render(<LiveIndicator />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('has correct styling', () => {
    const { container } = render(<LiveIndicator />);
    const wrapper = container.firstChild as HTMLElement;

    // Check inline styles exist (Tailwind generates these as classes, not inline styles)
    expect(wrapper).toHaveClass('flex', 'items-center', 'gap-2', 'rounded-lg', 'border');
  });

  it('has pulsing dot indicator', () => {
    const { container } = render(<LiveIndicator />);
    const dot = container.querySelector('.animate-pulse-live');

    expect(dot).toBeInTheDocument();
    expect(dot).toHaveStyle({ backgroundColor: '#D97F6F' });
  });

  it('has proper structure', () => {
    const { container } = render(<LiveIndicator />);
    const wrapper = container.firstChild;

    expect(wrapper).toHaveClass('flex', 'items-center', 'gap-2');
  });

  it('has small, rounded appearance', () => {
    const { container } = render(<LiveIndicator />);
    const wrapper = container.firstChild;

    expect(wrapper).toHaveClass('rounded-lg', 'border');
  });

  it('text has correct styling', () => {
    render(<LiveIndicator />);
    const text = screen.getByText('Live');

    expect(text).toHaveClass('text-xs', 'font-medium');
    expect(text).toHaveStyle({ color: '#6B5D52' });
  });
});

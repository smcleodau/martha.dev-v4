/**
 * Avatar Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../../test/test-utils';
import { Avatar } from '../Avatar';

describe('Avatar', () => {
  describe('Rendering', () => {
    it('renders with name initials', () => {
      render(<Avatar name="John Doe" />);
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('renders first character of name', () => {
      render(<Avatar name="Alice" />);
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('handles lowercase names', () => {
      render(<Avatar name="bob" />);
      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('renders image when avatar URL is provided', () => {
      render(<Avatar name="John Doe" avatar="/path/to/avatar.png" />);
      const img = screen.getByRole('img', { name: 'John Doe' });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/path/to/avatar.png');
    });
  });

  describe('Sizes', () => {
    it('renders extra small size', () => {
      const { container } = render(<Avatar name="John" size="xs" />);
      const avatar = container.firstChild;
      expect(avatar).toHaveClass('w-5', 'h-5', 'text-xs');
    });

    it('renders small size', () => {
      const { container } = render(<Avatar name="John" size="sm" />);
      const avatar = container.firstChild;
      expect(avatar).toHaveClass('w-6', 'h-6', 'text-xs');
    });

    it('renders medium size by default', () => {
      const { container } = render(<Avatar name="John" />);
      const avatar = container.firstChild;
      expect(avatar).toHaveClass('w-8', 'h-8', 'text-sm');
    });

    it('renders large size', () => {
      const { container } = render(<Avatar name="John" size="lg" />);
      const avatar = container.firstChild;
      expect(avatar).toHaveClass('w-10', 'h-10', 'text-base');
    });
  });

  describe('Tooltip', () => {
    it('shows tooltip with name by default', () => {
      const { container } = render(<Avatar name="John Doe" />);
      const avatar = container.firstChild as HTMLElement;
      expect(avatar).toHaveAttribute('title', 'John Doe');
    });

    it('hides tooltip when showTooltip is false', () => {
      const { container } = render(<Avatar name="John Doe" showTooltip={false} />);
      const avatar = container.firstChild as HTMLElement;
      expect(avatar).not.toHaveAttribute('title');
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      const { container } = render(<Avatar name="John" className="custom-class" />);
      const avatar = container.firstChild;
      expect(avatar).toHaveClass('custom-class');
    });

    it('preserves default classes with custom className', () => {
      const { container } = render(<Avatar name="John" className="custom-class" />);
      const avatar = container.firstChild;
      expect(avatar).toHaveClass('rounded-full', 'custom-class');
    });
  });

  describe('Gradient generation', () => {
    it('applies gradient background', () => {
      const { container } = render(<Avatar name="John Doe" />);
      const avatar = container.firstChild as HTMLElement;
      expect(avatar.style.background).toBeTruthy();
    });

    it('generates consistent gradient for same name', () => {
      const { container: container1 } = render(<Avatar name="Alice" />);
      const { container: container2 } = render(<Avatar name="Alice" />);

      const avatar1 = container1.firstChild as HTMLElement;
      const avatar2 = container2.firstChild as HTMLElement;

      expect(avatar1.style.background).toBe(avatar2.style.background);
    });
  });

  describe('Edge cases', () => {
    it('handles empty name gracefully', () => {
      const { container } = render(<Avatar name="" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('handles single character name', () => {
      render(<Avatar name="X" />);
      expect(screen.getByText('X')).toBeInTheDocument();
    });

    it('handles name with special characters', () => {
      render(<Avatar name="@User" />);
      expect(screen.getByText('@')).toBeInTheDocument();
    });

    it('handles name with numbers', () => {
      render(<Avatar name="123Test" />);
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Image rendering', () => {
    it('uses full image when avatar is provided', () => {
      render(<Avatar name="John Doe" avatar="/avatar.jpg" />);
      const img = screen.getByRole('img', { name: 'John Doe' });
      expect(img).toHaveClass('w-full', 'h-full', 'rounded-full', 'object-cover');
    });

    it('does not show initials when avatar image is provided', () => {
      const { container } = render(<Avatar name="John Doe" avatar="/avatar.jpg" />);
      expect(container.textContent).not.toContain('J');
    });
  });
});

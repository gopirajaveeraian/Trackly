import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button component', () => {
  describe('rendering', () => {
    it('should render with children text', () => {
      render(<Button>Click me</Button>);

      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('should render as a button element', () => {
      render(<Button>Submit</Button>);

      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });

    it('should render children content correctly', () => {
      render(<Button>Save Changes</Button>);

      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
  });

  describe('click handling', () => {
    it('should call onClick handler when clicked', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn();
      render(
        <Button onClick={handleClick} disabled>
          Click me
        </Button>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', () => {
      const handleClick = vi.fn();
      render(
        <Button onClick={handleClick} isLoading>
          Click me
        </Button>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should be disabled when isLoading is true', () => {
      render(<Button isLoading>Loading</Button>);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should show a loading spinner when isLoading is true', () => {
      render(<Button isLoading>Loading</Button>);

      // The Loader2 icon renders an SVG with the animate-spin class
      const button = screen.getByRole('button');
      const spinner = button.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should still render children text alongside spinner', () => {
      render(<Button isLoading>Saving</Button>);

      expect(screen.getByText('Saving')).toBeInTheDocument();
    });

    it('should not show the right icon when loading', () => {
      render(
        <Button isLoading rightIcon={<span data-testid="right-icon">R</span>}>
          Save
        </Button>
      );

      expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should apply disabled styling (opacity)', () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('disabled:opacity-50');
    });
  });

  describe('variants', () => {
    it('should apply primary variant styles by default', () => {
      render(<Button>Primary</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('btn-gradient');
    });

    it('should apply secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-surface');
    });

    it('should apply ghost variant styles', () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-transparent');
    });

    it('should apply danger variant styles', () => {
      render(<Button variant="danger">Danger</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-danger-600');
    });
  });

  describe('sizes', () => {
    it('should apply medium size styles by default', () => {
      render(<Button>Medium</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('px-4');
      expect(button.className).toContain('py-2');
      expect(button.className).toContain('text-sm');
    });

    it('should apply small size styles', () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('px-3');
      expect(button.className).toContain('text-xs');
    });

    it('should apply large size styles', () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('px-6');
      expect(button.className).toContain('text-base');
    });
  });

  describe('icons', () => {
    it('should render a left icon when provided', () => {
      render(
        <Button leftIcon={<span data-testid="left-icon">L</span>}>
          With Icon
        </Button>
      );

      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('should render a right icon when provided', () => {
      render(
        <Button rightIcon={<span data-testid="right-icon">R</span>}>
          With Icon
        </Button>
      );

      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('should not render left icon when loading (spinner replaces it)', () => {
      render(
        <Button isLoading leftIcon={<span data-testid="left-icon">L</span>}>
          Loading
        </Button>
      );

      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should merge custom className with default classes', () => {
      render(<Button className="custom-class">Custom</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
    });

    it('should allow Tailwind overrides via className', () => {
      render(<Button className="bg-green-500">Override</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-green-500');
    });
  });

  describe('forwarded ref', () => {
    it('should forward ref to the button element', () => {
      const ref = vi.fn();
      render(<Button ref={ref}>Ref Button</Button>);

      expect(ref).toHaveBeenCalled();
      expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('HTML attributes', () => {
    it('should pass through native button attributes', () => {
      render(
        <Button type="submit" name="submit-btn">
          Submit
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('name', 'submit-btn');
    });
  });
});

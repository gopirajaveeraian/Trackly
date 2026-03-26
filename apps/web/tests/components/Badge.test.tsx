import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, PriorityBadge, IssueTypeBadge } from '@/components/ui/Badge';
import { Priority, IssueType } from '@/types';

describe('Badge component', () => {
  describe('rendering', () => {
    it('should render with children text', () => {
      render(<Badge>Status</Badge>);

      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should render as a span element', () => {
      render(<Badge>Tag</Badge>);

      const badge = screen.getByText('Tag');
      expect(badge.tagName).toBe('SPAN');
    });

    it('should render with complex children', () => {
      render(
        <Badge>
          <span data-testid="inner">Inner Content</span>
        </Badge>
      );

      expect(screen.getByTestId('inner')).toBeInTheDocument();
    });
  });

  describe('default variant', () => {
    it('should apply default variant styles when no variant is specified', () => {
      render(<Badge>Default</Badge>);

      const badge = screen.getByText('Default');
      expect(badge.className).toContain('bg-gray-100');
      expect(badge.className).toContain('text-gray-700');
    });
  });

  describe('variants', () => {
    it('should apply primary variant styles', () => {
      render(<Badge variant="primary">Primary</Badge>);

      const badge = screen.getByText('Primary');
      expect(badge.className).toContain('bg-primary-50');
      expect(badge.className).toContain('text-primary-700');
    });

    it('should apply success variant styles', () => {
      render(<Badge variant="success">Success</Badge>);

      const badge = screen.getByText('Success');
      expect(badge.className).toContain('bg-success-50');
      expect(badge.className).toContain('text-success-500');
    });

    it('should apply warning variant styles', () => {
      render(<Badge variant="warning">Warning</Badge>);

      const badge = screen.getByText('Warning');
      expect(badge.className).toContain('bg-warning-50');
      expect(badge.className).toContain('text-warning-500');
    });

    it('should apply danger variant styles', () => {
      render(<Badge variant="danger">Danger</Badge>);

      const badge = screen.getByText('Danger');
      expect(badge.className).toContain('bg-danger-50');
      expect(badge.className).toContain('text-danger-600');
    });

    it('should apply accent variant styles', () => {
      render(<Badge variant="accent">Accent</Badge>);

      const badge = screen.getByText('Accent');
      expect(badge.className).toContain('bg-accent-50');
      expect(badge.className).toContain('text-accent-700');
    });

    it('should apply ghost variant styles', () => {
      render(<Badge variant="ghost">Ghost</Badge>);

      const badge = screen.getByText('Ghost');
      expect(badge.className).toContain('bg-gray-50');
      expect(badge.className).toContain('text-gray-500');
    });
  });

  describe('base styles', () => {
    it('should include rounded-full class', () => {
      render(<Badge>Rounded</Badge>);

      const badge = screen.getByText('Rounded');
      expect(badge.className).toContain('rounded-full');
    });

    it('should include text-xs class', () => {
      render(<Badge>Small Text</Badge>);

      const badge = screen.getByText('Small Text');
      expect(badge.className).toContain('text-xs');
    });

    it('should include font-medium class', () => {
      render(<Badge>Medium Font</Badge>);

      const badge = screen.getByText('Medium Font');
      expect(badge.className).toContain('font-medium');
    });
  });

  describe('custom className', () => {
    it('should merge custom className with default classes', () => {
      render(<Badge className="custom-badge">Custom</Badge>);

      const badge = screen.getByText('Custom');
      expect(badge.className).toContain('custom-badge');
      expect(badge.className).toContain('rounded-full');
    });
  });
});

describe('PriorityBadge component', () => {
  it('should render "Critical" text for CRITICAL priority', () => {
    render(<PriorityBadge priority={Priority.CRITICAL} />);

    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('should render "High" text for HIGH priority', () => {
    render(<PriorityBadge priority={Priority.HIGH} />);

    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('should render "Medium" text for MEDIUM priority', () => {
    render(<PriorityBadge priority={Priority.MEDIUM} />);

    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('should render "Low" text for LOW priority', () => {
    render(<PriorityBadge priority={Priority.LOW} />);

    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('should use danger variant for CRITICAL priority', () => {
    render(<PriorityBadge priority={Priority.CRITICAL} />);

    const badge = screen.getByText('Critical');
    expect(badge.className).toContain('bg-danger-50');
    expect(badge.className).toContain('text-danger-600');
  });

  it('should use danger variant for HIGH priority', () => {
    render(<PriorityBadge priority={Priority.HIGH} />);

    const badge = screen.getByText('High');
    expect(badge.className).toContain('bg-danger-50');
    expect(badge.className).toContain('text-danger-600');
  });

  it('should use warning variant for MEDIUM priority', () => {
    render(<PriorityBadge priority={Priority.MEDIUM} />);

    const badge = screen.getByText('Medium');
    expect(badge.className).toContain('bg-warning-50');
    expect(badge.className).toContain('text-warning-500');
  });

  it('should use primary variant for LOW priority', () => {
    render(<PriorityBadge priority={Priority.LOW} />);

    const badge = screen.getByText('Low');
    expect(badge.className).toContain('bg-primary-50');
    expect(badge.className).toContain('text-primary-700');
  });
});

describe('IssueTypeBadge component', () => {
  it('should render "Bug" text for BUG type', () => {
    render(<IssueTypeBadge type={IssueType.BUG} />);

    expect(screen.getByText('Bug')).toBeInTheDocument();
  });

  it('should render "Story" text for STORY type', () => {
    render(<IssueTypeBadge type={IssueType.STORY} />);

    expect(screen.getByText('Story')).toBeInTheDocument();
  });

  it('should render "Task" text for TASK type', () => {
    render(<IssueTypeBadge type={IssueType.TASK} />);

    expect(screen.getByText('Task')).toBeInTheDocument();
  });

  it('should render "Epic" text for EPIC type', () => {
    render(<IssueTypeBadge type={IssueType.EPIC} />);

    expect(screen.getByText('Epic')).toBeInTheDocument();
  });

  it('should render "Subtask" text for SUBTASK type', () => {
    render(<IssueTypeBadge type={IssueType.SUBTASK} />);

    expect(screen.getByText('Subtask')).toBeInTheDocument();
  });

  it('should use danger variant for BUG type', () => {
    render(<IssueTypeBadge type={IssueType.BUG} />);

    const badge = screen.getByText('Bug');
    expect(badge.className).toContain('bg-danger-50');
  });

  it('should use success variant for STORY type', () => {
    render(<IssueTypeBadge type={IssueType.STORY} />);

    const badge = screen.getByText('Story');
    expect(badge.className).toContain('bg-success-50');
  });

  it('should use primary variant for TASK type', () => {
    render(<IssueTypeBadge type={IssueType.TASK} />);

    const badge = screen.getByText('Task');
    expect(badge.className).toContain('bg-primary-50');
  });

  it('should use accent variant for EPIC type', () => {
    render(<IssueTypeBadge type={IssueType.EPIC} />);

    const badge = screen.getByText('Epic');
    expect(badge.className).toContain('bg-accent-50');
  });

  it('should use ghost variant for SUBTASK type', () => {
    render(<IssueTypeBadge type={IssueType.SUBTASK} />);

    const badge = screen.getByText('Subtask');
    expect(badge.className).toContain('bg-gray-50');
  });
});

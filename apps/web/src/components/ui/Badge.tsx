import { cn } from '@/utils/cn';
import { Priority, IssueType } from '@/types';

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'accent'
  | 'ghost';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-primary-50 text-primary-700',
  success: 'bg-success-50 text-success-500',
  warning: 'bg-warning-50 text-warning-500',
  danger: 'bg-danger-50 text-danger-600',
  accent: 'bg-accent-50 text-accent-700',
  ghost: 'bg-gray-50 text-gray-500',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// Utility component for priority badges
export function PriorityBadge({ priority }: { priority: Priority }) {
  const config: Record<Priority, { variant: BadgeVariant; label: string }> = {
    [Priority.CRITICAL]: { variant: 'danger', label: 'Critical' },
    [Priority.HIGH]: { variant: 'danger', label: 'High' },
    [Priority.MEDIUM]: { variant: 'warning', label: 'Medium' },
    [Priority.LOW]: { variant: 'primary', label: 'Low' },
  };

  const { variant, label } = config[priority];
  return <Badge variant={variant}>{label}</Badge>;
}

// Utility component for issue type badges
export function IssueTypeBadge({ type }: { type: IssueType }) {
  const config: Record<IssueType, { variant: BadgeVariant; label: string }> = {
    [IssueType.BUG]: { variant: 'danger', label: 'Bug' },
    [IssueType.STORY]: { variant: 'success', label: 'Story' },
    [IssueType.TASK]: { variant: 'primary', label: 'Task' },
    [IssueType.EPIC]: { variant: 'accent', label: 'Epic' },
    [IssueType.SUBTASK]: { variant: 'ghost', label: 'Subtask' },
  };

  const { variant, label } = config[type];
  return <Badge variant={variant}>{label}</Badge>;
}

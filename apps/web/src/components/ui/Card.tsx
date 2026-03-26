import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

export function Card({
  className,
  children,
  hoverable = false,
  padding = 'md',
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface rounded-lg border border-th-border-subtle shadow-card',
        hoverable && 'transition-shadow duration-200 hover:shadow-card-hover',
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn('pb-3 border-b border-th-border-subtle', className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn(
        'text-xs uppercase tracking-widest text-primary-600 font-semibold',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

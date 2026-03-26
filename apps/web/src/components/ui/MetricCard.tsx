import { type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    isPositive: boolean;
  };
  icon?: ReactNode;
  className?: string;
}

export function MetricCard({
  label,
  value,
  subtitle,
  trend,
  icon,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'metric-card flex flex-col justify-between',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <span className="metric-card-label">{label}</span>
        {icon && (
          <span className="text-primary-400">{icon}</span>
        )}
      </div>
      <div className="mt-2">
        <span className="metric-card-value">{value}</span>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center ml-2 text-xs font-medium',
              trend.isPositive ? 'text-success-500' : 'text-danger-600'
            )}
          >
            {trend.direction === 'up' ? (
              <TrendingUp className="h-3 w-3 mr-0.5" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-0.5" />
            )}
            {trend.value}%
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      )}
    </div>
  );
}

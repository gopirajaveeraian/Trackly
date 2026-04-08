import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface PageErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function PageError({
  title = 'Failed to load data',
  message = 'Something went wrong while loading this page. Please try again.',
  onRetry,
}: PageErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center" role="alert">
      <div className="flex items-center justify-center h-14 w-14 rounded-full bg-danger-50 mb-4">
        <AlertCircle className="h-7 w-7 text-danger-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md mb-6">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          onClick={onRetry}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
}

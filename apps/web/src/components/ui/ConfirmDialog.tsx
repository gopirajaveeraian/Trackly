import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Info } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/utils/cn';

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  children?: ReactNode;
}

const variantConfig: Record<ConfirmVariant, {
  icon: ReactNode;
  iconBg: string;
  confirmVariant: 'danger' | 'primary';
}> = {
  danger: {
    icon: <Trash2 className="h-6 w-6 text-danger-600" />,
    iconBg: 'bg-danger-50',
    confirmVariant: 'danger',
  },
  warning: {
    icon: <AlertTriangle className="h-6 w-6 text-warning-600" />,
    iconBg: 'bg-warning-50',
    confirmVariant: 'danger',
  },
  info: {
    icon: <Info className="h-6 w-6 text-primary-600" />,
    iconBg: 'bg-primary-50',
    confirmVariant: 'primary',
  },
};

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  children,
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onCancel();
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    // Focus the cancel button on open for safety
    cancelButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onCancel, isLoading]);

  if (!isOpen) return null;

  const config = variantConfig[variant];

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current && !isLoading) {
      onCancel();
    }
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleOverlayClick}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div
        className={cn(
          'w-full max-w-md bg-surface-elevated rounded-xl shadow-xl',
          'animate-in fade-in zoom-in-95 duration-200',
          'p-6'
        )}
      >
        <div className="flex gap-4">
          <div className={cn('flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full', config.iconBg)}>
            {config.icon}
          </div>
          <div className="flex-1">
            <h3 id="confirm-dialog-title" className="text-lg font-semibold text-th-text">
              {title}
            </h3>
            <p id="confirm-dialog-description" className="mt-1 text-sm text-th-text-secondary">
              {description}
            </p>
            {children && <div className="mt-3">{children}</div>}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            ref={cancelButtonRef}
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

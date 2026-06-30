import React from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: 'danger' | 'warning' | 'primary';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  onConfirm,
  variant = 'primary',
}) => {
  const confirmBtnClasses = {
    primary: 'bg-brand-400 hover:bg-brand-500 text-white',
    warning: 'bg-warning hover:bg-warning-dark text-white',
    danger: 'bg-danger hover:bg-danger-dark text-white',
  }[variant];

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        {/* Overlay */}
        <AlertDialog.Overlay className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 transition-opacity animate-fade-in" />
        
        {/* Content Box */}
        <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-white p-6 rounded-xl shadow-modal border border-neutral-200 z-50 focus:outline-none animate-fade-up">
          <AlertDialog.Title className="text-body-lg font-bold text-on-surface mb-2">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-body-md text-on-surface-variant mb-6 leading-relaxed">
            {description}
          </AlertDialog.Description>
          
          <div className="flex items-center justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <button className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-on-surface font-medium text-body-md transition-colors">
                {cancelText}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                onClick={onConfirm}
                className={`px-4 py-2 rounded-lg font-medium text-body-md transition-colors ${confirmBtnClasses}`}
              >
                {confirmText}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};

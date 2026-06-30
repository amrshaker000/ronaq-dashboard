import React from 'react';
import { PackageOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  className,
  icon: Icon = PackageOpen,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div
      className={cn(
        'card p-12 flex flex-col items-center justify-center text-center gap-4 border border-dashed border-neutral-300 bg-white rounded-xl shadow-none',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-400 flex items-center justify-center shadow-inner">
        <Icon className="w-8 h-8" />
      </div>
      <div className="space-y-1">
        <h3 className="text-body-lg font-bold text-on-surface">{title}</h3>
        {description && (
          <p className="text-label-sm text-on-surface-variant max-w-sm">
            {description}
          </p>
        )}
      </div>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-2 px-5 py-2 rounded-lg bg-brand-400 text-white font-medium text-body-md hover:bg-brand-500 transition-colors shadow-sm"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

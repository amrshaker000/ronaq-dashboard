import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, circle = false }) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-neutral-200',
        circle ? 'rounded-full' : 'rounded',
        className
      )}
    />
  );
};

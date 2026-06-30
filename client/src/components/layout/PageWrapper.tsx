import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({
  children,
  className,
  animate = true,
}) => {
  const content = (
    <div className={cn('max-w-container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6', className)}>
      {children}
    </div>
  );

  return (
    <main className="min-h-screen mr-0 lg:mr-sidebar pt-16 bg-transparent transition-all duration-300">
      {animate ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {content}
        </motion.div>
      ) : (
        content
      )}
    </main>
  );
};

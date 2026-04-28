'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { forwardRef, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ModalProps {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  title?:        ReactNode;
  description?:  ReactNode;
  children?:     ReactNode;
  footer?:       ReactNode;
  size?:         'sm' | 'md' | 'lg' | 'xl';
  showClose?:    boolean;
  closeOnOverlay?: boolean;
  className?:    string;
}

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

const ModalContent = forwardRef<HTMLDivElement, { className?: string; children: ReactNode }>(
  ({ className, children, ...props }, ref) => (
    <DialogPrimitive.Content asChild ref={ref} {...props}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        exit={{    opacity: 0, y: 10, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className={className}
      >
        {children}
      </motion.div>
    </DialogPrimitive.Content>
  )
);
ModalContent.displayName = 'ModalContent';

export default function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  showClose = true,
  closeOnOverlay = true,
  className,
}: ModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{    opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={(e) => {
                  if (!closeOnOverlay) e.stopPropagation();
                }}
              />
            </DialogPrimitive.Overlay>

            <div
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none"
              aria-hidden
            >
              <ModalContent
                className={cn(
                  'pointer-events-auto w-full bg-white dark:bg-arena-800',
                  'rounded-t-3xl sm:rounded-2xl shadow-2xl',
                  'border border-gray-100 dark:border-arena-700',
                  'max-h-[92vh] overflow-y-auto',
                  SIZES[size],
                  className
                )}
              >
                {(title || showClose) && (
                  <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-2">
                    <div className="flex-1 min-w-0">
                      {title && (
                        <DialogPrimitive.Title className="text-lg font-display font-bold text-gray-900 dark:text-gray-100">
                          {title}
                        </DialogPrimitive.Title>
                      )}
                      {description && (
                        <DialogPrimitive.Description className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {description}
                        </DialogPrimitive.Description>
                      )}
                    </div>
                    {showClose && (
                      <DialogPrimitive.Close
                        className="shrink-0 -me-1 -mt-1 p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-arena-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                        aria-label="Close"
                      >
                        <X size={18} />
                      </DialogPrimitive.Close>
                    )}
                  </div>
                )}

                {children && <div className="px-5 sm:px-6 py-4">{children}</div>}

                {footer && (
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 sm:px-6 pb-5 pt-2 border-t border-gray-50 dark:border-arena-700">
                    {footer}
                  </div>
                )}
              </ModalContent>
            </div>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, Trash2, Info } from 'lucide-react';
import Modal from './Modal';
import { cn } from '../../lib/utils';

export type ConfirmTone = 'danger' | 'warning' | 'info';

export interface ConfirmOptions {
  title?:        ReactNode;
  description?:  ReactNode;
  confirmLabel?: string;
  cancelLabel?:  string;
  tone?:         ConfirmTone;
  icon?:         ReactNode;
}

type Resolver = (value: boolean) => void;

interface ConfirmContextValue {
  confirm: (opts?: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

const TONE_STYLES: Record<ConfirmTone, { wrap: string; btn: string; iconBg: string }> = {
  danger: {
    wrap:    'text-red-600 dark:text-red-400',
    btn:     'bg-red-500 hover:bg-red-600 text-white',
    iconBg:  'bg-red-50 dark:bg-red-900/20 text-red-500',
  },
  warning: {
    wrap:    'text-amber-600 dark:text-amber-400',
    btn:     'bg-amber-500 hover:bg-amber-600 text-white',
    iconBg:  'bg-amber-50 dark:bg-amber-900/20 text-amber-500',
  },
  info: {
    wrap:    'text-brand-600 dark:text-brand-400',
    btn:     'btn-primary',
    iconBg:  'bg-brand-50 dark:bg-brand-900/20 text-brand-500',
  },
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open,    setOpen]    = useState(false);
  const [opts,    setOpts]    = useState<ConfirmOptions>({});
  const resolverRef = useRef<Resolver | null>(null);

  const confirm = useCallback((options: ConfirmOptions = {}) => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const finish = (value: boolean) => {
    setOpen(false);
    // Wait for the close animation before resolving so callers can update UI smoothly.
    setTimeout(() => {
      resolverRef.current?.(value);
      resolverRef.current = null;
    }, 150);
  };

  const tone = opts.tone ?? 'danger';
  const styles = TONE_STYLES[tone];
  const defaultIcon =
    tone === 'danger'  ? <Trash2 size={20} /> :
    tone === 'warning' ? <AlertTriangle size={20} /> :
    <Info size={20} />;

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        open={open}
        onOpenChange={(o) => { if (!o) finish(false); }}
        size="sm"
        showClose={false}
        title={
          <div className="flex items-center gap-3">
            <span className={cn('w-10 h-10 rounded-full flex items-center justify-center', styles.iconBg)}>
              {opts.icon ?? defaultIcon}
            </span>
            <span>{opts.title ?? 'Are you sure?'}</span>
          </div>
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => finish(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-arena-700 transition-colors"
            >
              {opts.cancelLabel ?? 'Cancel'}
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => finish(true)}
              className={cn('px-4 py-2 rounded-xl text-sm font-semibold transition-colors', styles.btn)}
            >
              {opts.confirmLabel ?? 'Confirm'}
            </button>
          </>
        }
      >
        {opts.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {opts.description}
          </p>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx.confirm;
}

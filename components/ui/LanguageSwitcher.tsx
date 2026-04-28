'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Languages, Check } from 'lucide-react';
import { useLocale } from '../layout/LocaleProvider';
import { LOCALES, LOCALE_LABEL, type Locale } from '../../lib/i18n/config';
import { cn } from '../../lib/utils';

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Change language"
          className={cn(
            'btn-ghost p-2 flex items-center gap-1.5 outline-none',
            compact ? 'text-xs' : 'text-sm',
          )}
        >
          <Languages size={compact ? 16 : 18} />
          <span className="font-semibold uppercase">{locale}</span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={8}
          className="z-50 w-44 card p-1 shadow-lg outline-none"
        >
          {LOCALES.map((l) => (
            <DropdownMenu.Item
              key={l}
              onSelect={() => setLocale(l as Locale)}
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer outline-none transition-colors',
                locale === l
                  ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-semibold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-arena-700',
              )}
            >
              <span>{LOCALE_LABEL[l]}</span>
              {locale === l && <Check size={14} />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

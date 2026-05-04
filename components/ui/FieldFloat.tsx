'use client';

import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

/**
 * Notched-outline form field — the label sits ON the input's top border with
 * the border line broken around the label text (Material/Carbon-style).
 *
 * Implemented via native `<fieldset>` + `<legend>` so the browser draws the
 * notch for us. This works regardless of what background sits behind the
 * field (white card, dark form panel, gradient, etc.) — no bg-matching needed.
 *
 * The wrapped `.input` element has its own border/padding/bg stripped here so
 * the fieldset provides the visible chrome instead. Outside this wrapper the
 * `.input` class still renders normally.
 *
 *   <FieldFloat label="First name">
 *     <input className="input" type="text" />
 *   </FieldFloat>
 *
 * RTL: legend defaults to inline-start, so it lands top-left in LTR and
 * top-right in RTL automatically — no `dir`-specific code needed.
 */
export function FieldFloat({
  label,
  hint,
  className,
  children,
}: {
  label:    ReactNode;
  htmlFor?: string;
  hint?:    ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <fieldset className="field-float">
        <legend className="field-float-legend">{label}</legend>
        {children}
      </fieldset>
      {hint && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>
      )}
    </div>
  );
}

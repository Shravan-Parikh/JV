'use client';

/**
 * ui.tsx — the small pieces every page repeats.
 *
 * The CS Dashboard keeps helpers like these at the foot of each page file,
 * which is right when a page owns its own look. Here the same banner, empty
 * state and skeleton appear on all three pages, and an error that looks
 * different depending on which screen you are on is an error you stop trusting.
 */

import clsx from 'clsx';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

// --- Banners ---------------------------------------------------------------

const TONES = {
  error: { wrap: 'border-red-200 bg-red-50 text-red-600', Icon: AlertCircle },
  warn: { wrap: 'border-amber-200 bg-amber-50 text-amber-800', Icon: Info },
  success: { wrap: 'border-emerald-200 bg-emerald-50 text-emerald-800', Icon: CheckCircle2 },
  info: { wrap: 'border-navy-200 bg-navy-50 text-navy-800', Icon: Info },
} as const;

export function Banner({
  tone = 'error',
  children,
  className,
}: {
  tone?: keyof typeof TONES;
  children: React.ReactNode;
  className?: string;
}) {
  const { wrap, Icon } = TONES[tone];
  return (
    <div
      className={clsx(
        'flex items-start gap-2 rounded-lg border px-4 py-3 text-sm leading-relaxed',
        wrap,
        className,
      )}
      role={tone === 'error' ? 'alert' : undefined}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// --- Loading ---------------------------------------------------------------

export function Skeleton({ lines = 5 }: { lines?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 w-14 shrink-0 animate-pulse rounded bg-slate-100" />
          <div className="h-3 flex-1 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-20 shrink-0 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

// --- Empty state -----------------------------------------------------------

/**
 * `body` always says what the thing is for, never just "no data" — an empty
 * screen is the one place someone is most likely to need telling.
 */
export function Empty({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex flex-col items-center gap-2 px-6 py-14 text-center', className)}>
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="max-w-sm text-xs leading-relaxed text-slate-400">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// --- Section ---------------------------------------------------------------

export function Section({
  icon: Icon,
  title,
  qualifier,
  count,
  action,
  children,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  qualifier?: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx('card overflow-hidden', className)}>
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
          <span className="truncate">{title}</span>
          {qualifier && <span className="shrink-0 font-normal text-slate-400">{qualifier}</span>}
          {count !== undefined && count > 0 && (
            <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {count}
            </span>
          )}
        </h3>
        {action}
      </header>
      {children}
    </section>
  );
}

// --- Modal -----------------------------------------------------------------

/**
 * Adding a client has to be possible from inside the entry form without losing
 * what is already typed, which is the one case that genuinely needs a layer on
 * top. Everything else on these pages stays inline.
 */
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={clsx(
          'max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="truncate text-xs text-slate-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1.5 shrink-0 rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            Close
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// --- Entry kind badge ------------------------------------------------------

export const KIND_STYLE: Record<string, string> = {
  inward: 'bg-navy-50 text-navy-700 ring-navy-200',
  outward: 'bg-flame-50 text-flame-700 ring-flame-200',
  payment: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export function KindBadge({ kind, className }: { kind: string; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1',
        KIND_STYLE[kind] || 'bg-slate-100 text-slate-600 ring-slate-200',
        className,
      )}
    >
      {kind}
    </span>
  );
}

/** A dash that reads as "nothing here", never a blank cell. */
export const Dash = () => <span className="text-slate-300">—</span>;

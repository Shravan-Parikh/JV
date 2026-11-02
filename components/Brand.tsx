'use client';

/**
 * Brand.tsx — the JV Enterprises wordmark.
 *
 * Drawn rather than placed as an image: it stays sharp at every size and in the
 * favicon, it costs no request, and the flame gradient picks up the exact
 * red-to-orange of the printed logo. If you'd rather use the artwork itself,
 * drop it into `public/` and swap the `<Mark>` body for an `<Image>` — nothing
 * else here depends on how the mark is produced.
 */

import { useId } from 'react';
import clsx from 'clsx';

/**
 * The monogram alone — sidebar header, favicon, mobile login.
 *
 * The gradient id has to be unique per instance. Two marks render on the login
 * screen, and a `fill="url(#id)"` resolves to the *first* matching id in the
 * document — which, when the desktop brand panel is `display: none`, is a
 * gradient inside a hidden subtree. The visible monogram then paints from
 * nothing and the "JV" vanishes. `useId` is hydration-safe, unlike a counter.
 */
export function Mark({ className }: { className?: string }) {
  const gradientId = `jv-flame-${useId()}`;
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="JV Enterprises">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8341c" />
          <stop offset="100%" stopColor="#f58220" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="#14315c" />
      {/* The arc and sweep of the printed logo, pared back to read at 20px. */}
      <path
        d="M9 20a15 15 0 0 1 27-6"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.28"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 33c7 4 13 4 18 1s10-4 14-1"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.22"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text
        x="24"
        y="32"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="22"
        fontWeight="700"
        fill={`url(#${gradientId})`}
        letterSpacing="-0.5"
      >
        JV
      </text>
    </svg>
  );
}

/**
 * The full lock-up. `tone` picks the text colour for a light or a navy
 * background; the monogram keeps its flame gradient on both.
 */
export default function Brand({
  size = 'md',
  tone = 'dark',
  tagline = false,
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'dark' | 'light';
  tagline?: boolean;
  className?: string;
}) {
  const scale = {
    sm: { mark: 'h-9 w-9', name: 'text-base', sub: 'text-[10px]' },
    md: { mark: 'h-11 w-11', name: 'text-xl', sub: 'text-[11px]' },
    lg: { mark: 'h-14 w-14', name: 'text-3xl', sub: 'text-xs' },
  }[size];

  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <Mark className={clsx(scale.mark, 'shrink-0')} />
      <div className="leading-tight">
        <div className={clsx('font-display font-bold tracking-tight', scale.name)}>
          <span className="text-flame-700">JV</span>{' '}
          <span className={tone === 'light' ? 'text-white' : 'text-navy-800'}>Enterprises</span>
        </div>
        <div
          className={clsx(
            'font-semibold uppercase tracking-[0.14em]',
            scale.sub,
            tone === 'light' ? 'text-navy-200' : 'text-slate-400',
          )}
        >
          Twisting Yarn Manufacturing
        </div>
        {tagline && (
          <div
            className={clsx(
              'mt-1.5 font-display italic',
              size === 'lg' ? 'text-sm' : 'text-xs',
              tone === 'light' ? 'text-flame-300' : 'text-flame-600',
            )}
          >
            Twisting today, weaving tomorrow
          </div>
        )}
      </div>
    </div>
  );
}

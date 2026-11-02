'use client';

/**
 * Dashboard — the three things worth knowing before opening anything else:
 * whose yarn is on the floor, who owes money, and what moved this month.
 *
 * Every tile and row is a link into a filtered ledger, so noticing something
 * here and acting on it is one tap rather than a search.
 */

import Link from 'next/link';
import clsx from 'clsx';
import {
  Package,
  IndianRupee,
  ArrowDownToLine,
  ArrowUpFromLine,
  BookOpenText,
  ArrowRight,
  Users,
  Boxes,
  RefreshCw,
} from 'lucide-react';
import Topbar from '@/components/Topbar';
import { Empty, Skeleton, Section, Banner, KindBadge } from '@/components/ui';
import { useLedger } from '@/lib/ledger';
import { useClients } from '@/lib/clients';
import { rupees, rupeesShort, kgs, kgsShort, fmtMonth, fmtDateRelative, percent } from '@/lib/format';

const TONES: Record<string, string> = {
  navy: 'bg-navy-50 text-navy-700',
  flame: 'bg-flame-50 text-flame-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  slate: 'bg-slate-100 text-slate-500',
};

export default function DashboardPage() {
  const { summary, loading, error, refresh } = useLedger();
  const { active } = useClients();

  const month = summary?.month;
  const openLots = summary?.openLots || [];
  const owing = (summary?.clients || []).filter((c) => c.balance > 0).slice(0, 6);
  const recent = summary?.recent || [];

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle="Where JV Enterprises stands today"
        actions={
          <button
            onClick={refresh}
            disabled={loading}
            className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-5">
          {error && <Banner tone="error">{error}</Banner>}

          {/* Tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <Tile
              icon={Package}
              tone="navy"
              label="Material with us"
              value={loading ? null : kgsShort(summary?.totals.materialKg || 0)}
              href="/ledger?lots=open"
            />
            <Tile
              icon={IndianRupee}
              tone="flame"
              label="Outstanding"
              value={loading ? null : rupeesShort(summary?.totals.outstanding || 0)}
              href="/clients"
            />
            <Tile
              icon={ArrowDownToLine}
              tone="slate"
              label="Inward this month"
              value={loading ? null : kgsShort(month?.inwardKg || 0)}
              href="/ledger?kind=inward"
            />
            <Tile
              icon={ArrowUpFromLine}
              tone="slate"
              label="Outward this month"
              value={loading ? null : kgsShort(month?.outwardKg || 0)}
              href="/ledger?kind=outward"
            />
            <Tile
              icon={Boxes}
              tone="emerald"
              label="Open lots"
              value={loading ? null : String(openLots.length)}
              href="/ledger?lots=open"
            />
          </div>

          {/* This month */}
          <Section
            icon={BookOpenText}
            title={month ? fmtMonth(month.key) : 'This month'}
            action={
              <Link
                href="/ledger"
                className="flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-navy-900"
              >
                Full ledger <ArrowRight className="h-3 w-3" />
              </Link>
            }
          >
            {loading ? (
              <Skeleton lines={2} />
            ) : (
              <dl className="grid grid-cols-2 divide-slate-100 sm:grid-cols-4 sm:divide-x">
                <Stat label="Entries" value={String(month?.entries || 0)} />
                <Stat label="Billed" value={rupees(month?.billed || 0)} tone="flame" />
                <Stat label="Received" value={rupees(month?.paid || 0)} tone="emerald" />
                <Stat label="GST on billing" value={rupees(month?.gst || 0)} />
              </dl>
            )}
          </Section>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Who owes */}
            <Section
              icon={IndianRupee}
              title="Outstanding"
              count={owing.length}
              action={
                <Link
                  href="/clients"
                  className="flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-navy-900"
                >
                  All clients <ArrowRight className="h-3 w-3" />
                </Link>
              }
            >
              {loading ? (
                <Skeleton lines={4} />
              ) : owing.length === 0 ? (
                <Empty
                  icon={IndianRupee}
                  title="Nothing outstanding"
                  body="Every client is settled. Billed amounts appear here as soon as an outward entry is recorded."
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {owing.map((c) => (
                    <li key={c.clientId}>
                      <Link
                        href={`/ledger?client=${c.clientId}`}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/60"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-slate-800">
                            {c.clientName}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {c.materialKg > 0 && `${kgs(c.materialKg)} with us · `}
                            {c.lastEntryDate ? fmtDateRelative(c.lastEntryDate) : 'opening balance'}
                          </span>
                        </span>
                        <span className="num shrink-0 text-sm font-semibold text-flame-700">
                          {rupees(c.balance)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {/* Open lots */}
            <Section
              icon={Package}
              title="Open lots"
              qualifier="yarn still with us"
              count={openLots.length}
            >
              {loading ? (
                <Skeleton lines={4} />
              ) : openLots.length === 0 ? (
                <Empty
                  icon={Package}
                  title="No open lots"
                  body="Everything received has gone back out. A lot stays here until its outward entries account for the weight that came in."
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {openLots.slice(0, 6).map((l) => (
                    <li key={l.key}>
                      <Link
                        href={`/ledger?client=${l.clientId}&lot=${encodeURIComponent(l.lotNo)}`}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/60"
                      >
                        <span className="num shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {l.lotNo}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-slate-800">
                            {l.clientName}
                          </span>
                          <span className="block truncate text-[11px] text-slate-400">
                            {[l.denier, l.shade].filter(Boolean).join(' · ') || 'No yarn details'}
                          </span>
                        </span>
                        <span className="num shrink-0 text-right">
                          <span className="block text-sm font-semibold text-navy-800">
                            {kgs(l.balanceKg)}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {l.delivered ? `${percent(l.gapPercent)} pending` : 'not started'}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          {/* Recent */}
          <Section
            icon={BookOpenText}
            title="Recent entries"
            action={
              <Link
                href="/ledger"
                className="flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-navy-900"
              >
                Open ledger <ArrowRight className="h-3 w-3" />
              </Link>
            }
          >
            {loading ? (
              <Skeleton lines={5} />
            ) : recent.length === 0 ? (
              <Empty
                icon={BookOpenText}
                title="Nothing recorded yet"
                body="Inward, outward and payments all land in the ledger. The most recent dozen show up here."
                action={
                  <Link href="/ledger" className="btn-primary px-3 py-1.5 text-xs">
                    Add the first entry <ArrowRight className="h-3 w-3" />
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                    <KindBadge kind={e.kind} />
                    <span className="num w-20 shrink-0 text-xs text-slate-400">
                      {fmtDateRelative(e.date)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                      {e.clientName}
                      {e.lotNo && <span className="num ml-2 text-xs text-slate-400">{e.lotNo}</span>}
                    </span>
                    <span className="num shrink-0 text-right text-sm">
                      {e.kind === 'payment' ? (
                        <span className="font-medium text-emerald-700">−{rupees(e.amount)}</span>
                      ) : e.kind === 'outward' ? (
                        <>
                          <span className="text-slate-600">{kgs(e.netWeight)}</span>
                          <span className="ml-2 font-medium text-flame-700">
                            {rupees(e.totalAmount)}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-600">{kgs(e.netWeight)}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {active.length === 0 && !loading && (
            <Banner tone="info">
              No clients yet.{' '}
              <Link href="/clients" className="font-semibold underline">
                Add the first one
              </Link>{' '}
              — their rate and GST then fill in automatically on every entry.
            </Banner>
          )}
        </div>
      </div>
    </>
  );
}

// --- small presentational helpers ------------------------------------------

/** `value === null` is the loading state, drawn as a grey dash. */
function Tile({
  icon: Icon,
  label,
  value,
  href,
  tone = 'slate',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  href: string;
  tone?: keyof typeof TONES;
}) {
  return (
    <Link href={href} className="card flex items-center gap-3 p-3 transition hover:shadow-md sm:p-4">
      <div
        className={clsx(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10',
          TONES[tone],
        )}
      >
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <div className="min-w-0">
        <div className="num text-base font-bold leading-tight text-slate-900 sm:text-lg">
          {value === null ? <span className="text-slate-300">–</span> : value}
        </div>
        <div className="text-[11px] leading-tight text-slate-400 sm:text-xs">{label}</div>
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: string;
  tone?: 'slate' | 'flame' | 'emerald';
}) {
  const colour = {
    slate: 'text-slate-800',
    flame: 'text-flame-700',
    emerald: 'text-emerald-700',
  }[tone];
  return (
    <div className="px-4 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={clsx('num text-lg font-bold leading-tight', colour)}>{value}</dd>
    </div>
  );
}

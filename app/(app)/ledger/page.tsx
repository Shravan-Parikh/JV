'use client';

/**
 * The ledger — the page he lives in.
 *
 * Every filter is held in the URL rather than in component state, so a client's
 * statement is a link he can bookmark or send, the phone's back button steps
 * back through what he was looking at, and a reload lands where he left off.
 *
 * The running-balance column only appears once a single client is selected,
 * because a running total down a list of mixed clients would be meaningless.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  BookOpenText,
  Download,
  Loader2,
  Search,
  X,
  Package,
  SlidersHorizontal,
  FileSpreadsheet,
} from 'lucide-react';
import Topbar from '@/components/Topbar';
import EntryForm from '@/components/EntryForm';
import LedgerTable from '@/components/LedgerTable';
import ClientPicker from '@/components/ClientPicker';
import { Banner, Empty, Skeleton, Section } from '@/components/ui';
import { useClients } from '@/lib/clients';
import { useLedger } from '@/lib/ledger';
import * as api from '@/lib/api';
import {
  kgs,
  rupees,
  percent,
  fmtDate,
  monthBounds,
  financialYearBounds,
  todayIso,
} from '@/lib/format';
import type { Entry, EntryKind, EntryTotals, Lot, Statement } from '@/lib/types';

const KIND_FILTERS: { id: EntryKind | ''; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'inward', label: 'Inward' },
  { id: 'outward', label: 'Outward' },
  { id: 'payment', label: 'Payments' },
];

const EMPTY_TOTALS: EntryTotals = {
  entries: 0,
  inwardKg: 0,
  outwardKg: 0,
  billed: 0,
  gst: 0,
  paid: 0,
};

export default function LedgerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-slate-400">Loading…</div>
      }
    >
      <Ledger />
    </Suspense>
  );
}

function Ledger() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { byId, loading: clientsLoading } = useClients();
  const { refresh: refreshSummary } = useLedger();

  // --- Filters live in the URL --------------------------------------------

  const filters = useMemo(
    () => ({
      client: params.get('client') || '',
      kind: (params.get('kind') || '') as EntryKind | '',
      account: params.get('account') || '',
      lot: params.get('lot') || '',
      q: params.get('q') || '',
      from: params.get('from') || '',
      to: params.get('to') || '',
    }),
    [params],
  );

  const lotsView = params.get('lots') === 'open';

  const setFilters = useCallback(
    (next: Partial<typeof filters> & { lots?: string | null }) => {
      const search = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v) search.set(k, String(v));
        else search.delete(k);
      }
      const qs = search.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  // --- Data ----------------------------------------------------------------

  const [entries, setEntries] = useState<Entry[]>([]);
  const [totals, setTotals] = useState<EntryTotals>(EMPTY_TOTALS);
  const [lots, setLots] = useState<Lot[]>([]);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Typing in the search box shouldn't rewrite history on every keystroke, so
  // the input is local and only pushed to the URL once typing pauses.
  const [search, setSearch] = useState(filters.q);
  useEffect(() => setSearch(filters.q), [filters.q]);
  useEffect(() => {
    if (search === filters.q) return;
    const t = setTimeout(() => setFilters({ q: search }), 350);
    return () => clearTimeout(t);
  }, [search, filters.q, setFilters]);

  useEffect(() => {
    let live = true;
    setLoading(true);

    // One client selected means a statement: same rows, plus the running
    // balance and the opening figure carried in from before the window.
    const load = filters.client
      ? api
          .getStatement(filters.client, { from: filters.from, to: filters.to })
          .then(async (s) => {
            if (!live) return;
            setStatement(s);
            // The statement is unfiltered by kind, so the chips still apply here.
            const rows = s.entries.filter(
              (e) =>
                (!filters.kind || e.kind === filters.kind) &&
                (!filters.account || e.account === filters.account) &&
                (!filters.lot || e.lotNo === filters.lot),
            );
            setEntries(rows);
            setTotals(s.totals);
            setLots(s.lots);
          })
      : api.getEntries(filters).then((r) => {
          if (!live) return;
          setStatement(null);
          setEntries(r.entries);
          setTotals(r.totals);
          setLots(r.lots);
        });

    load
      .then(() => live && setError(null))
      .catch((e) => live && setError(e instanceof Error ? e.message : 'Could not load the ledger'))
      .finally(() => live && setLoading(false));

    return () => {
      live = false;
    };
  }, [filters, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
    refreshSummary();
  }, [refreshSummary]);

  // --- Actions -------------------------------------------------------------

  async function onSaved(entry: Entry) {
    setEditing(null);
    reload();
    // An entry saved outside the window on screen would otherwise vanish with
    // no explanation, which reads as data loss.
    const outside =
      (filters.from && entry.date < filters.from) || (filters.to && entry.date > filters.to);
    if (outside) {
      setNotice(
        `Saved — but ${fmtDate(entry.date)} is outside the dates you're viewing, so it isn't in the list below.`,
      );
      setTimeout(() => setNotice(null), 6000);
    }
  }

  async function onDelete(entry: Entry) {
    const what =
      entry.kind === 'payment'
        ? `the ${rupees(entry.amount)} payment from ${entry.clientName}`
        : `the ${entry.kind} of ${kgs(entry.netWeight)} for ${entry.clientName}`;
    if (!confirm(`Delete ${what} on ${fmtDate(entry.date)}?\n\nThis cannot be undone.`)) return;

    setBusyId(entry.id);
    try {
      await api.deleteEntry(entry.id, entry.date);
      if (editing?.id === entry.id) setEditing(null);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete that entry');
    } finally {
      setBusyId(null);
    }
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const name = await api.downloadLedgerCsv(filters);
      setNotice(`Downloaded ${name}`);
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not export the ledger');
    } finally {
      setExporting(false);
    }
  }

  // --- Date presets --------------------------------------------------------

  const presets = useMemo(() => {
    const m = monthBounds();
    const d = new Date();
    const prev = monthBounds(
      `${d.getFullYear()}-${String(d.getMonth() || 12).padStart(2, '0')}-01`,
    );
    const fy = financialYearBounds();
    return [
      { label: 'All time', from: '', to: '' },
      { label: 'This month', ...m },
      { label: 'Last month', from: prev.from, to: prev.to },
      { label: fy.label, from: fy.from, to: fy.to },
    ];
  }, []);

  const activePreset = presets.find((p) => p.from === filters.from && p.to === filters.to);
  const filtersOn = !!(
    filters.client ||
    filters.kind ||
    filters.account ||
    filters.lot ||
    filters.q ||
    filters.from ||
    filters.to
  );

  const openLots = useMemo(() => lots.filter((l) => l.open), [lots]);
  const selectedClient = byId(filters.client);

  return (
    <>
      <Topbar
        title="Ledger"
        subtitle={
          selectedClient ? `Statement — ${selectedClient.name}` : 'Inward, outward and payments'
        }
        actions={
          <button
            onClick={exportCsv}
            disabled={exporting || entries.length === 0}
            className="btn-secondary px-3 py-1.5 text-xs"
            title="Download these entries as a CSV"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Export</span>
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-4">
          {error && <Banner tone="error">{error}</Banner>}
          {notice && <Banner tone="success">{notice}</Banner>}

          <EntryForm
            lots={lots}
            editing={editing}
            onSaved={onSaved}
            onCancelEdit={() => setEditing(null)}
          />

          {/* ---- Filters ---- */}
          <div className="card space-y-3 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                {KIND_FILTERS.map((f) => (
                  <button
                    key={f.id || 'all'}
                    onClick={() => setFilters({ kind: f.id })}
                    className={clsx(
                      'rounded-md px-2.5 py-1 text-xs font-semibold transition',
                      filters.kind === f.id
                        ? 'bg-white text-navy-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="w-full sm:w-52">
                <ClientPicker
                  value={filters.client}
                  onChange={(c) => setFilters({ client: c?.id || '', lot: '' })}
                  placeholder="All clients"
                  allowAdd={false}
                  includeInactive
                />
              </div>

              <div className="relative min-w-[160px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-9"
                  placeholder="Search lot, challan, vehicle, notes…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setFilters({ from: p.from, to: p.to })}
                  className={clsx(
                    'rounded-full border px-3 py-1 text-xs font-medium transition',
                    activePreset?.label === p.label
                      ? 'border-navy-200 bg-navy-50 text-navy-800'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
                  )}
                >
                  {p.label}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-1.5">
                <input
                  type="date"
                  className="input w-[140px] py-1.5 text-xs"
                  value={filters.from}
                  max={filters.to || undefined}
                  onChange={(e) => setFilters({ from: e.target.value })}
                  aria-label="From date"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  className="input w-[140px] py-1.5 text-xs"
                  value={filters.to}
                  min={filters.from || undefined}
                  max={todayIso()}
                  onChange={(e) => setFilters({ to: e.target.value })}
                  aria-label="To date"
                />
              </div>
            </div>

            {(filtersOn || lotsView) && (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-300" />
                {filters.account && (
                  <Chip
                    label={filters.account === 'trading' ? 'Own trading' : 'Job work'}
                    onClear={() => setFilters({ account: '' })}
                  />
                )}
                {filters.lot && (
                  <Chip label={`Lot ${filters.lot}`} onClear={() => setFilters({ lot: '' })} />
                )}
                {!filters.account && (
                  <>
                    <button
                      onClick={() => setFilters({ account: 'jobwork' })}
                      className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] text-slate-500 hover:border-slate-300"
                    >
                      Job work only
                    </button>
                    <button
                      onClick={() => setFilters({ account: 'trading' })}
                      className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] text-slate-500 hover:border-slate-300"
                    >
                      Own trading only
                    </button>
                  </>
                )}
                <button
                  onClick={() => router.replace(pathname, { scroll: false })}
                  className="ml-auto text-[11px] font-medium text-slate-400 hover:text-red-600"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* ---- Statement header ---- */}
          {statement?.summary && (
            <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <Figure label="Opening balance" value={rupees(statement.openingBalance)} />
              <Figure
                label="Billed in period"
                value={rupees(statement.totals.billed)}
                tone="flame"
              />
              <Figure label="Received" value={rupees(statement.totals.paid)} tone="emerald" />
              <Figure
                label="Closing balance"
                value={rupees(statement.closingBalance)}
                tone={statement.closingBalance > 0 ? 'flame' : 'emerald'}
                hint={
                  statement.closingBalance > 0
                    ? 'owed to JV'
                    : statement.closingBalance < 0
                      ? 'in credit'
                      : 'settled'
                }
              />
              <div className="col-span-full flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span className="num">
                  Material with us{' '}
                  <strong className="text-navy-800">{kgs(statement.summary.materialKg)}</strong>
                </span>
                <span className="num">
                  In {kgs(statement.summary.inwardKg)} · Out {kgs(statement.summary.outwardKg)}
                </span>
                {openLots.length > 0 && (
                  <span>
                    {openLots.length} open {openLots.length === 1 ? 'lot' : 'lots'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ---- Open lots ---- */}
          {(lotsView || filters.client) && openLots.length > 0 && (
            <Section
              icon={Package}
              title="Open lots"
              qualifier="yarn still with us"
              count={openLots.length}
              action={
                lotsView ? (
                  <button
                    onClick={() => setFilters({ lots: null })}
                    className="text-xs font-medium text-slate-400 hover:text-slate-600"
                  >
                    Hide
                  </button>
                ) : undefined
              }
            >
              <ul className="divide-y divide-slate-100">
                {openLots.map((l) => (
                  <li key={l.key} className="flex items-center gap-3 px-4 py-2.5">
                    <button
                      onClick={() => setFilters({ client: l.clientId, lot: l.lotNo, lots: null })}
                      className="num shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 hover:bg-navy-50 hover:text-navy-700"
                      title="Show this lot's entries"
                    >
                      {l.lotNo}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-800">{l.clientName}</p>
                      <p className="truncate text-[11px] text-slate-400">
                        {[l.denier, l.shade, l.ply ? `${l.ply} ply` : '']
                          .filter(Boolean)
                          .join(' · ') || 'No yarn details'}
                        {' · since '}
                        {fmtDate(l.firstDate)}
                      </p>
                    </div>
                    <div className="num shrink-0 text-right">
                      <p className="text-sm font-semibold text-navy-800">{kgs(l.balanceKg)}</p>
                      <p className="text-[11px] text-slate-400">
                        {kgs(l.inwardKg, { unit: false })} in
                        {l.delivered && ` · ${percent(l.gapPercent)} left`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* ---- Entries ---- */}
          <div className="card overflow-hidden">
            {loading || clientsLoading ? (
              <Skeleton lines={6} />
            ) : entries.length === 0 ? (
              <Empty
                icon={filtersOn ? Search : BookOpenText}
                title={filtersOn ? 'Nothing matches those filters' : 'The ledger is empty'}
                body={
                  filtersOn
                    ? 'Try a wider date range, or clear the filters to see everything recorded so far.'
                    : 'Record material coming in, material going back out, and payments received. Start with an inward entry above.'
                }
                action={
                  filtersOn ? (
                    <button
                      onClick={() => router.replace(pathname, { scroll: false })}
                      className="btn-secondary px-3 py-1.5 text-xs"
                    >
                      Clear filters
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <LedgerTable
                entries={entries}
                totals={totals}
                showBalance={!!filters.client}
                busyId={busyId}
                onEdit={(e) => {
                  setEditing(e);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onDelete={onDelete}
              />
            )}
          </div>

          {entries.length > 0 && (
            <p className="flex items-center justify-center gap-1.5 pb-2 text-[11px] text-slate-400">
              <FileSpreadsheet className="h-3 w-3" />
              Export gives every field of these {totals.entries}{' '}
              {totals.entries === 1 ? 'entry' : 'entries'} as a spreadsheet.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

// --- small presentational helpers ------------------------------------------

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-navy-50 px-2.5 py-0.5 text-[11px] font-medium text-navy-700">
      {label}
      <button onClick={onClear} className="hover:text-navy-900" aria-label={`Clear ${label}`}>
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function Figure({
  label,
  value,
  tone = 'slate',
  hint,
}: {
  label: string;
  value: string;
  tone?: 'slate' | 'flame' | 'emerald';
  hint?: string;
}) {
  const colour = {
    slate: 'text-slate-800',
    flame: 'text-flame-700',
    emerald: 'text-emerald-700',
  }[tone];
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={clsx('num text-lg font-bold leading-tight', colour)}>{value}</p>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

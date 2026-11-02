'use client';

/**
 * LedgerTable.tsx — the entries, as a table on a desktop and as cards on a phone.
 *
 * It is two renderings of one list rather than a table that scrolls sideways,
 * because he reads this standing in the unit on a phone as often as he does at
 * a desk, and a horizontally scrolled row of numbers is unreadable one-handed.
 *
 * `showBalance` is only passed when the list is already filtered to one client:
 * a running balance down a mixed list would be a number nobody could act on.
 */

import clsx from 'clsx';
import { Pencil, Trash2, Loader2, Package } from 'lucide-react';
import { KindBadge, Dash } from '@/components/ui';
import { useClients } from '@/lib/clients';
import { fmtDateShort, fmtDate, kgs, rupees } from '@/lib/format';
import type { Entry, EntryTotals } from '@/lib/types';

/** "150/48 Raw White · 2 ply · 600 TPM S" — the yarn in one line. */
function describe(e: Entry, yarnLabel: (id: string) => string) {
  if (e.kind === 'payment') {
    return [e.mode?.toUpperCase(), e.reference].filter(Boolean).join(' · ');
  }
  return [
    yarnLabel(e.yarnType),
    e.denier,
    e.shade,
    e.ply ? `${e.ply} ply` : '',
    e.tpm ? `${e.tpm} TPM ${e.twist}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function LedgerTable({
  entries,
  totals,
  showBalance = false,
  busyId,
  onEdit,
  onDelete,
}: {
  entries: Entry[];
  totals: EntryTotals;
  showBalance?: boolean;
  busyId?: string | null;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}) {
  const { reference } = useClients();
  const yarnLabel = (id: string) =>
    reference?.yarnTypes.find((y) => y.id === id)?.label || id || '';

  return (
    <>
      {/* ---------------- Desktop ---------------- */}
      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2.5 font-semibold">Date</th>
              <th className="px-3 py-2.5 font-semibold">Type</th>
              <th className="px-3 py-2.5 font-semibold">Client</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-semibold">Lot / Details</th>
              <th className="px-3 py-2.5 text-right font-semibold">In</th>
              <th className="px-3 py-2.5 text-right font-semibold">Out</th>
              <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
              {showBalance && <th className="px-3 py-2.5 text-right font-semibold">Balance</th>}
              <th className="w-20 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr
                key={e.id}
                className={clsx(
                  'border-b border-slate-100 last:border-0 hover:bg-slate-50/60',
                  busyId === e.id && 'opacity-50',
                )}
              >
                <td className="num whitespace-nowrap px-3 py-2.5 text-slate-600">
                  {fmtDateShort(e.date)}
                </td>
                <td className="px-3 py-2.5">
                  <KindBadge kind={e.kind} />
                  {e.account === 'trading' && (
                    <span className="ml-1.5 text-[10px] font-medium uppercase text-slate-400">
                      own
                    </span>
                  )}
                </td>
                <td className="max-w-[180px] whitespace-nowrap px-3 py-2.5">
                  <span className="block truncate font-medium text-slate-800">{e.clientName}</span>
                </td>
                <td className="px-3 py-2.5">
                  {e.lotNo && (
                    <span className="num mr-1.5 inline-block whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                      {e.lotNo}
                    </span>
                  )}
                  <span className="text-xs text-slate-500">{describe(e, yarnLabel)}</span>
                  {e.notes && (
                    <span className="block truncate text-[11px] italic text-slate-400">
                      {e.notes}
                    </span>
                  )}
                </td>
                <td className="num whitespace-nowrap px-3 py-2.5 text-right text-slate-700">
                  {e.kind === 'inward' ? kgs(e.netWeight, { unit: false }) : <Dash />}
                </td>
                <td className="num whitespace-nowrap px-3 py-2.5 text-right text-slate-700">
                  {e.kind === 'outward' ? kgs(e.netWeight, { unit: false }) : <Dash />}
                </td>
                <td className="num whitespace-nowrap px-3 py-2.5 text-right">
                  {e.kind === 'outward' ? (
                    <span className="font-medium text-flame-700">{rupees(e.totalAmount)}</span>
                  ) : e.kind === 'payment' ? (
                    <span className="font-medium text-emerald-700">−{rupees(e.amount)}</span>
                  ) : (
                    <Dash />
                  )}
                </td>
                {showBalance && (
                  <td className="num whitespace-nowrap px-3 py-2.5 text-right font-semibold text-slate-800">
                    {e.runningBalance === undefined ? <Dash /> : rupees(e.runningBalance)}
                  </td>
                )}
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-0.5">
                    {busyId === e.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                    ) : (
                      <>
                        <button
                          onClick={() => onEdit(e)}
                          title="Edit this entry"
                          className="rounded p-1.5 text-slate-300 hover:bg-navy-50 hover:text-navy-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(e)}
                          title="Delete this entry"
                          className="rounded p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50/70 text-sm font-semibold text-slate-700">
              <td className="px-3 py-2.5" colSpan={4}>
                {totals.entries} {totals.entries === 1 ? 'entry' : 'entries'}
              </td>
              <td className="num px-3 py-2.5 text-right">{kgs(totals.inwardKg, { unit: false })}</td>
              <td className="num px-3 py-2.5 text-right">
                {kgs(totals.outwardKg, { unit: false })}
              </td>
              <td className="num px-3 py-2.5 text-right">
                <span className="block text-flame-700">{rupees(totals.billed)}</span>
                {totals.paid > 0 && (
                  <span className="block text-xs font-medium text-emerald-700">
                    −{rupees(totals.paid)}
                  </span>
                )}
              </td>
              {showBalance && (
                <td className="num px-3 py-2.5 text-right">
                  {entries.length > 0 && entries[entries.length - 1].runningBalance !== undefined
                    ? rupees(entries[entries.length - 1].runningBalance)
                    : ''}
                </td>
              )}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ---------------- Phone ---------------- */}
      <ul className="divide-y divide-slate-100 xl:hidden">
        {entries.map((e) => (
          <li key={e.id} className={clsx('px-4 py-3', busyId === e.id && 'opacity-50')}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <KindBadge kind={e.kind} />
                  <span className="num text-xs text-slate-500">{fmtDate(e.date)}</span>
                  {e.account === 'trading' && (
                    <span className="text-[10px] font-medium uppercase text-slate-400">own</span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm font-medium text-slate-800">{e.clientName}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  {e.lotNo && (
                    <span className="num rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                      <Package className="mr-0.5 inline h-2.5 w-2.5" />
                      {e.lotNo}
                    </span>
                  )}
                  <span className="truncate">{describe(e, yarnLabel)}</span>
                </p>
              </div>

              <div className="shrink-0 text-right">
                {e.kind !== 'payment' && (
                  <p className="num text-sm font-semibold text-slate-800">{kgs(e.netWeight)}</p>
                )}
                {e.kind === 'outward' && (
                  <p className="num text-xs font-medium text-flame-700">{rupees(e.totalAmount)}</p>
                )}
                {e.kind === 'payment' && (
                  <p className="num text-sm font-semibold text-emerald-700">−{rupees(e.amount)}</p>
                )}
                {showBalance && e.runningBalance !== undefined && (
                  <p className="num mt-0.5 text-[11px] text-slate-400">
                    bal {rupees(e.runningBalance)}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-2 flex items-center gap-1">
              {busyId === e.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
              ) : (
                <>
                  <button
                    onClick={() => onEdit(e)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <button
                    onClick={() => onDelete(e)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </>
              )}
            </div>
          </li>
        ))}

        <li className="num flex flex-wrap items-center gap-x-4 gap-y-1 bg-slate-50/70 px-4 py-3 text-xs font-semibold text-slate-600">
          <span>
            {totals.entries} {totals.entries === 1 ? 'entry' : 'entries'}
          </span>
          <span>In {kgs(totals.inwardKg)}</span>
          <span>Out {kgs(totals.outwardKg)}</span>
          <span className="text-flame-700">{rupees(totals.billed)}</span>
          {totals.paid > 0 && <span className="text-emerald-700">−{rupees(totals.paid)}</span>}
        </li>
      </ul>
    </>
  );
}

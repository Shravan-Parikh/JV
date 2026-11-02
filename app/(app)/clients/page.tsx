'use client';

/**
 * Clients — the book of who JV works with, and where each of them stands.
 *
 * Two balances sit against every name and they answer different questions:
 * what they owe, and how much of their yarn is still on the floor. A client can
 * be square on money and still have 400 kg here, which is exactly the situation
 * worth spotting early.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import {
  Users,
  Pencil,
  Trash2,
  Search,
  Loader2,
  ArrowRight,
  Phone,
  EyeOff,
  Eye,
} from 'lucide-react';
import Topbar from '@/components/Topbar';
import ClientForm from '@/components/ClientForm';
import { AddClientButton } from '@/components/ClientPicker';
import { Banner, Empty, Skeleton, Modal, Dash } from '@/components/ui';
import { useClients } from '@/lib/clients';
import { useLedger } from '@/lib/ledger';
import { rupees, kgs, fmtDate } from '@/lib/format';
import type { Client, ClientBalance } from '@/lib/types';

export default function ClientsPage() {
  const { clients, reference, loading, error: loadError, update, remove, refresh } = useClients();
  const { summary, refresh: refreshSummary } = useLedger();

  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** Balances arrive keyed by client, so they're indexed once rather than scanned per row. */
  const balances = useMemo(() => {
    const map = new Map<string, ClientBalance>();
    for (const row of summary?.clients || []) map.set(row.clientId, row);
    return map;
  }, [summary]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter((c) => (showInactive ? true : c.active !== false))
      .filter(
        (c) =>
          !q ||
          [c.name, c.city, c.phone, c.gstin, c.contactPerson]
            .join(' ')
            .toLowerCase()
            .includes(q),
      );
  }, [clients, query, showInactive]);

  const inactiveCount = clients.filter((c) => c.active === false).length;

  async function onDelete(client: Client) {
    const bal = balances.get(client.id);
    const warning =
      bal && (bal.balance !== 0 || bal.materialKg !== 0)
        ? `\n\nThey currently show ${rupees(bal.balance)} and ${kgs(bal.materialKg)} of material.`
        : '';
    if (!confirm(`Remove ${client.name}?${warning}`)) return;

    setBusyId(client.id);
    setError(null);
    try {
      const r = await remove(client.id);
      setNotice(r.message || `${client.name} was removed.`);
      setTimeout(() => setNotice(null), 5000);
      refreshSummary();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove that client');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Topbar
        title="Clients"
        subtitle={`${clients.filter((c) => c.active !== false).length} active`}
        actions={
          <AddClientButton
            label="Add"
            className="btn-primary px-3 py-1.5 text-xs"
            onAdded={() => refreshSummary()}
          />
        }
      />

      <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          {(error || loadError) && <Banner tone="error">{error || loadError}</Banner>}
          {notice && <Banner tone="info">{notice}</Banner>}

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder="Search by name, city, phone or GSTIN…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {inactiveCount > 0 && (
              <button
                onClick={() => setShowInactive((v) => !v)}
                className="btn-secondary px-3 py-2 text-xs"
              >
                {showInactive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showInactive ? 'Hide' : 'Show'} inactive ({inactiveCount})
              </button>
            )}
          </div>

          <div className="card overflow-hidden">
            {loading ? (
              <Skeleton lines={5} />
            ) : rows.length === 0 ? (
              <Empty
                icon={query ? Search : Users}
                title={query ? 'No clients match that' : 'No clients yet'}
                body={
                  query
                    ? 'Try a shorter search, or check whether they were made inactive.'
                    : 'Add the firms JV twists for. Once a client is here, their rate and GST fill in automatically on every entry.'
                }
                action={
                  query ? undefined : <AddClientButton onAdded={() => refreshSummary()} />
                }
              />
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                        <th className="px-4 py-2.5 font-semibold">Client</th>
                        <th className="px-3 py-2.5 font-semibold">GSTIN</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Rate</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Material</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Balance</th>
                        <th className="w-24 px-3 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((c) => {
                        const bal = balances.get(c.id);
                        return (
                          <tr
                            key={c.id}
                            className={clsx(
                              'border-b border-slate-100 last:border-0 hover:bg-slate-50/60',
                              busyId === c.id && 'opacity-50',
                              c.active === false && 'bg-slate-50/40',
                            )}
                          >
                            <td className="px-4 py-2.5">
                              <Link
                                href={`/ledger?client=${c.id}`}
                                className="font-medium text-slate-800 hover:text-navy-700 hover:underline"
                                title="Open this client's statement"
                              >
                                {c.name}
                              </Link>
                              {c.active === false && (
                                <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                                  Inactive
                                </span>
                              )}
                              <span className="block text-xs text-slate-400">
                                {[c.contactPerson, c.city, c.phone].filter(Boolean).join(' · ') || (
                                  <span className="italic">No contact details</span>
                                )}
                              </span>
                            </td>
                            <td className="num px-3 py-2.5 text-xs text-slate-500">
                              {c.gstin || <Dash />}
                            </td>
                            <td className="num px-3 py-2.5 text-right text-slate-600">
                              {c.defaultRate > 0 ? rupees(c.defaultRate) : <Dash />}
                            </td>
                            <td className="num px-3 py-2.5 text-right">
                              {bal && bal.materialKg !== 0 ? (
                                <span className="font-medium text-navy-800">
                                  {kgs(bal.materialKg)}
                                </span>
                              ) : (
                                <Dash />
                              )}
                            </td>
                            <td className="num px-3 py-2.5 text-right">
                              <Balance value={bal?.balance ?? c.openingBalance ?? 0} />
                              {bal?.lastEntryDate && (
                                <span className="block text-[11px] text-slate-400">
                                  {fmtDate(bal.lastEntryDate)}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <Actions
                                busy={busyId === c.id}
                                onEdit={() => setEditing(c)}
                                onDelete={() => onDelete(c)}
                                href={`/ledger?client=${c.id}`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Phone */}
                <ul className="divide-y divide-slate-100 sm:hidden">
                  {rows.map((c) => {
                    const bal = balances.get(c.id);
                    return (
                      <li
                        key={c.id}
                        className={clsx('px-4 py-3', busyId === c.id && 'opacity-50')}
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/ledger?client=${c.id}`}
                              className="block truncate text-sm font-medium text-slate-800"
                            >
                              {c.name}
                            </Link>
                            <p className="truncate text-xs text-slate-400">
                              {[c.city, c.phone].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <div className="num shrink-0 text-right">
                            <Balance value={bal?.balance ?? c.openingBalance ?? 0} />
                            {bal && bal.materialKg !== 0 && (
                              <p className="text-[11px] text-navy-700">{kgs(bal.materialKg)}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          <Link
                            href={`/ledger?client=${c.id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-navy-700"
                          >
                            Statement <ArrowRight className="h-3 w-3" />
                          </Link>
                          {c.phone && (
                            <a
                              href={`tel:${c.phone}`}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600"
                            >
                              <Phone className="h-3 w-3" /> Call
                            </a>
                          )}
                          <button
                            onClick={() => setEditing(c)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600"
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <Modal
          title={`Edit ${editing.name}`}
          subtitle="Changes apply to new entries; history keeps the name it was saved with."
          onClose={() => setEditing(null)}
        >
          <ClientForm
            initial={editing}
            reference={reference}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              await update(editing.id, values);
              setEditing(null);
              refresh();
              refreshSummary();
            }}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}

// --- small presentational helpers ------------------------------------------

/** Positive is owed to JV, negative is a client in credit — never a bare number. */
function Balance({ value }: { value: number }) {
  if (!value) return <span className="text-slate-400">Settled</span>;
  return (
    <span className={clsx('font-semibold', value > 0 ? 'text-flame-700' : 'text-emerald-700')}>
      {rupees(Math.abs(value))}
      <span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {value > 0 ? 'due' : 'adv'}
      </span>
    </span>
  );
}

function Actions({
  busy,
  onEdit,
  onDelete,
  href,
}: {
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  href: string;
}) {
  if (busy) {
    return (
      <div className="flex justify-end">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end gap-0.5">
      <Link
        href={href}
        title="Open statement"
        className="rounded p-1.5 text-slate-300 hover:bg-navy-50 hover:text-navy-700"
      >
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      <button
        onClick={onEdit}
        title="Edit client"
        className="rounded p-1.5 text-slate-300 hover:bg-navy-50 hover:text-navy-700"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onDelete}
        title="Remove client"
        className="rounded p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

'use client';

/**
 * ClientPicker.tsx — pick a client, or add one without leaving the form.
 *
 * A twisting unit takes on new clients constantly, and the moment he needs one
 * is the moment a lorry is being unloaded. Making him stop, navigate to a
 * Clients page, add a row and come back would mean the entry gets written on
 * paper instead — so "+ Add new client" opens a dialog over the form, saves,
 * selects the new client, and hands focus back with nothing else lost.
 *
 * Typeahead rather than a long `<select>`: by the second year the list is too
 * long to scroll on a phone.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, Plus, Search, UserPlus, Check } from 'lucide-react';
import { Modal } from '@/components/ui';
import ClientForm from '@/components/ClientForm';
import { useClients } from '@/lib/clients';
import { rupeesShort } from '@/lib/format';
import type { Client } from '@/lib/types';

export default function ClientPicker({
  value,
  onChange,
  placeholder = 'Choose a client…',
  id,
  allowAdd = true,
  includeInactive = false,
}: {
  value: string;
  onChange: (client: Client | null) => void;
  placeholder?: string;
  id?: string;
  allowAdd?: boolean;
  includeInactive?: boolean;
}) {
  const { clients, active, reference, create } = useClients();
  const pool = includeInactive ? clients : active;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  const selected = clients.find((c) => c.id === value) || null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) search.current?.focus();
  }, [open]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((c) =>
      [c.name, c.city, c.phone, c.gstin, c.contactPerson]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [pool, query]);

  function pick(client: Client) {
    onChange(client);
    setOpen(false);
    setQuery('');
  }

  async function addClient(values: Parameters<typeof create>[0]) {
    const { client } = await create(values);
    setAdding(false);
    pick(client);
  }

  return (
    <>
      <div className="relative" ref={wrap}>
        <button
          type="button"
          id={id}
          onClick={() => setOpen((v) => !v)}
          className="input flex items-center justify-between gap-2 text-left"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={clsx('truncate', !selected && 'text-slate-400')}>
            {selected ? selected.name : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>

        {open && (
          <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-100 p-2">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                ref={search}
                className="input border-0 py-1.5 text-sm shadow-none focus:ring-0"
                placeholder="Search clients…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setOpen(false);
                  if (e.key === 'Enter' && matches.length === 1) {
                    e.preventDefault();
                    pick(matches[0]);
                  }
                }}
              />
            </div>

            <div className="max-h-60 overflow-y-auto py-1" role="listbox">
              {matches.length === 0 ? (
                <p className="px-3 py-3 text-sm text-slate-400">
                  {pool.length === 0 ? 'No clients yet' : 'No matches'}
                </p>
              ) : (
                matches.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={c.id === value}
                    onClick={() => pick(c)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-slate-800">{c.name}</span>
                      {(c.city || c.phone) && (
                        <span className="block truncate text-xs text-slate-400">
                          {[c.city, c.phone].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                    {c.defaultRate > 0 && (
                      <span className="num shrink-0 text-[11px] text-slate-400">
                        {rupeesShort(c.defaultRate)}/kg
                      </span>
                    )}
                    {c.id === value && <Check className="h-4 w-4 shrink-0 text-navy-700" />}
                  </button>
                ))
              )}
            </div>

            {allowAdd && (
              <div className="border-t border-slate-100 p-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setAdding(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-navy-700 hover:bg-navy-50"
                >
                  <Plus className="h-4 w-4" />
                  Add new client
                  {query.trim() && <span className="truncate text-slate-400">“{query.trim()}”</span>}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {adding && (
        <Modal
          title="Add a client"
          subtitle="Only the firm name is needed — the rest can wait."
          onClose={() => setAdding(false)}
        >
          <ClientForm
            // Whatever was typed into the search is almost always the name he
            // was looking for, so it carries straight into the form.
            initial={{ name: query.trim() }}
            reference={reference}
            submitLabel="Add client"
            onSubmit={addClient}
            onCancel={() => setAdding(false)}
          />
        </Modal>
      )}
    </>
  );
}

/** The bare "add client" button, for pages that aren't picking one. */
export function AddClientButton({
  label = 'Add client',
  className,
  onAdded,
}: {
  label?: string;
  className?: string;
  onAdded?: (client: Client) => void;
}) {
  const { reference, create } = useClients();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className || 'btn-primary'}>
        <UserPlus className="h-4 w-4" /> {label}
      </button>
      {open && (
        <Modal
          title="Add a client"
          subtitle="Only the firm name is needed — the rest can wait."
          onClose={() => setOpen(false)}
        >
          <ClientForm
            reference={reference}
            submitLabel="Add client"
            onSubmit={async (values) => {
              const { client } = await create(values);
              setOpen(false);
              onAdded?.(client);
            }}
            onCancel={() => setOpen(false)}
          />
        </Modal>
      )}
    </>
  );
}

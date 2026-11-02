'use client';

/**
 * ClientForm.tsx — add or edit a client.
 *
 * The same form serves the Clients page and the "add client" step inside the
 * ledger entry form, so a client added mid-entry is as complete as one added
 * deliberately — and there is one place to change when a field is added.
 *
 * Only the name is required. Everything else can be filled in later from the
 * Clients page, because the moment he needs a new client he is usually standing
 * at a weighbridge with a lorry waiting.
 */

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Banner } from '@/components/ui';
import * as api from '@/lib/api';
import type { Client, Reference } from '@/lib/types';

export interface ClientFormValues extends api.ClientInput {}

export default function ClientForm({
  initial,
  reference,
  submitLabel = 'Save client',
  onSubmit,
  onCancel,
  autoFocusName = true,
}: {
  initial?: Partial<Client>;
  reference: Reference | null;
  submitLabel?: string;
  onSubmit: (values: ClientFormValues) => Promise<void>;
  onCancel?: () => void;
  autoFocusName?: boolean;
}) {
  const [name, setName] = useState(initial?.name || '');
  const [contactPerson, setContactPerson] = useState(initial?.contactPerson || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [gstin, setGstin] = useState(initial?.gstin || '');
  const [address, setAddress] = useState(initial?.address || '');
  const [city, setCity] = useState(initial?.city || '');
  const [state, setState] = useState(initial?.state || '');
  const [defaultRate, setDefaultRate] = useState(
    initial?.defaultRate ? String(initial.defaultRate) : '',
  );
  const [defaultRateUnit, setDefaultRateUnit] = useState(initial?.defaultRateUnit || 'per_kg');
  const [defaultGstRate, setDefaultGstRate] = useState(
    initial?.defaultGstRate !== undefined
      ? String(initial.defaultGstRate)
      : String(reference?.defaultGstRate ?? 5),
  );
  const [openingBalance, setOpeningBalance] = useState(
    initial?.openingBalance ? String(initial.openingBalance) : '',
  );
  const [openingBalanceDate, setOpeningBalanceDate] = useState(initial?.openingBalanceDate || '');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [active, setActive] = useState(initial?.active !== false);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('A client name is required');
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        contactPerson,
        phone,
        email,
        gstin,
        address,
        city,
        state,
        defaultRate: Number(defaultRate) || 0,
        defaultRateUnit,
        defaultGstRate: Number(defaultGstRate) || 0,
        openingBalance: Number(openingBalance) || 0,
        openingBalanceDate,
        notes,
        active,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that client');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Banner tone="error">{error}</Banner>}

      <div>
        <label className="label" htmlFor="c-name">
          Firm name <span className="text-flame-600">*</span>
        </label>
        <input
          id="c-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Shah Textiles"
          maxLength={160}
          autoFocus={autoFocusName}
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="c-contact">
            Contact person
          </label>
          <input
            id="c-contact"
            className="input"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            maxLength={120}
          />
        </div>
        <div>
          <label className="label" htmlFor="c-phone">
            Phone
          </label>
          <input
            id="c-phone"
            className="input"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={40}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="c-gstin">
            GSTIN
          </label>
          <input
            id="c-gstin"
            className="input uppercase"
            value={gstin}
            onChange={(e) => setGstin(e.target.value.toUpperCase())}
            placeholder="26AAAAA0000A1Z5"
            maxLength={15}
          />
        </div>
        <div>
          <label className="label" htmlFor="c-email">
            Email
          </label>
          <input
            id="c-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={160}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="c-address">
          Address
        </label>
        <input
          id="c-address"
          className="input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={400}
        />
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <input
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            maxLength={80}
            aria-label="City"
          />
          <input
            className="input"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="State"
            maxLength={80}
            aria-label="State"
          />
        </div>
      </div>

      {/* These three are what make the entry form one tap instead of four. */}
      <fieldset className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
        <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Defaults for new entries
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="c-rate">
              Rate (₹)
            </label>
            <input
              id="c-rate"
              className="input num"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={defaultRate}
              onChange={(e) => setDefaultRate(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="c-rate-unit">
              Per
            </label>
            <select
              id="c-rate-unit"
              className="input"
              value={defaultRateUnit}
              onChange={(e) => setDefaultRateUnit(e.target.value)}
            >
              {(reference?.rateUnits || []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="c-gst">
              GST %
            </label>
            <input
              id="c-gst"
              className="input num"
              type="number"
              step="0.01"
              min="0"
              max="100"
              inputMode="decimal"
              value={defaultGstRate}
              onChange={(e) => setDefaultGstRate(e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
        <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Opening balance
        </legend>
        <p className="mb-2 px-1 text-[11px] leading-relaxed text-slate-400">
          What they already owed before this ledger started. Leave blank for a new client.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="c-opening">
              Amount (₹)
            </label>
            <input
              id="c-opening"
              className="input num"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="c-opening-date">
              As on
            </label>
            <input
              id="c-opening-date"
              className="input"
              type="date"
              value={openingBalanceDate}
              onChange={(e) => setOpeningBalanceDate(e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="c-notes">
          Notes
        </label>
        <textarea
          id="c-notes"
          className="input min-h-[60px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
        />
      </div>

      {initial?.id && (
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-navy-700 focus:ring-navy-200"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Active — show this client in the entry form
        </label>
      )}

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary flex-1" disabled={saving || !name.trim()}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

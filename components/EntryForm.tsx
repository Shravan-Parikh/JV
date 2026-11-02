'use client';

/**
 * EntryForm.tsx — the form he fills a dozen times a day.
 *
 * Three shapes behind one set of tabs, because inward, outward and a payment
 * are the same act of recording and showing all their fields at once would make
 * every one of them harder. Fields are ordered the way a challan is read:
 * date → client → lot and challan → what the yarn is → what was asked of it →
 * weights → money.
 *
 * Two decisions worth keeping:
 *
 *   Net weight is derived from gross − tare but stays editable. He often has
 *   only a net figure off a weighbridge slip, and a form that insists on the
 *   arithmetic it prefers is a form that gets filled in wrongly.
 *
 *   Picking a lot on an outward entry pulls the yarn's description forward from
 *   its inward entry and shows what the delivery leaves behind. That residue is
 *   the wastage, and surfacing it as he types is the whole point — it is the
 *   number clients argue about.
 */

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  Loader2,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  IndianRupee,
  ChevronDown,
  Check,
  X,
} from 'lucide-react';
import ClientPicker from '@/components/ClientPicker';
import { Banner } from '@/components/ui';
import { useClients } from '@/lib/clients';
import * as api from '@/lib/api';
import { kgs, rupees, percent, todayIso } from '@/lib/format';
import type { Client, Entry, EntryKind, Lot } from '@/lib/types';

const KIND_META: Record<EntryKind, { label: string; icon: typeof Plus; tone: string }> = {
  inward: { label: 'Inward', icon: ArrowDownToLine, tone: 'navy' },
  outward: { label: 'Outward', icon: ArrowUpFromLine, tone: 'flame' },
  payment: { label: 'Payment', icon: IndianRupee, tone: 'emerald' },
};

const TAB_ACTIVE: Record<string, string> = {
  navy: 'bg-navy-800 text-white',
  flame: 'bg-flame-600 text-white',
  emerald: 'bg-emerald-600 text-white',
};

/** One shape for every field, so switching tabs never loses what's typed. */
interface FormState {
  kind: EntryKind;
  date: string;
  account: string;
  clientId: string;
  clientName: string;
  lotNo: string;
  challanNo: string;
  partyChallanNo: string;
  yarnType: string;
  denier: string;
  shade: string;
  ply: string;
  tpm: string;
  twist: string;
  packing: string;
  bags: string;
  cones: string;
  grossWeight: string;
  tareWeight: string;
  netWeight: string;
  vehicleNo: string;
  transporter: string;
  lrNo: string;
  rate: string;
  rateUnit: string;
  gstRate: string;
  amount: string;
  mode: string;
  reference: string;
  notes: string;
}

const blank = (kind: EntryKind, gst: number): FormState => ({
  kind,
  date: todayIso(),
  account: 'jobwork',
  clientId: '',
  clientName: '',
  lotNo: '',
  challanNo: '',
  partyChallanNo: '',
  yarnType: 'poly-fdy',
  denier: '',
  shade: '',
  ply: '2',
  tpm: '',
  twist: 'S',
  packing: 'bags',
  bags: '',
  cones: '',
  grossWeight: '',
  tareWeight: '',
  netWeight: '',
  vehicleNo: '',
  transporter: '',
  lrNo: '',
  rate: '',
  rateUnit: 'per_kg',
  gstRate: String(gst),
  amount: '',
  mode: 'upi',
  reference: '',
  notes: '',
});

const fromEntry = (e: Entry): FormState => ({
  kind: e.kind,
  date: e.date,
  account: e.account,
  clientId: e.clientId,
  clientName: e.clientName,
  lotNo: e.lotNo || '',
  challanNo: e.challanNo || '',
  partyChallanNo: e.partyChallanNo || '',
  yarnType: e.yarnType || 'poly-fdy',
  denier: e.denier || '',
  shade: e.shade || '',
  ply: String(e.ply || ''),
  tpm: String(e.tpm || ''),
  twist: e.twist || 'S',
  packing: e.packing || 'bags',
  bags: String(e.bags || ''),
  cones: String(e.cones || ''),
  grossWeight: e.grossWeight ? String(e.grossWeight) : '',
  tareWeight: e.tareWeight ? String(e.tareWeight) : '',
  netWeight: e.netWeight ? String(e.netWeight) : '',
  vehicleNo: e.vehicleNo || '',
  transporter: e.transporter || '',
  lrNo: e.lrNo || '',
  rate: e.rate ? String(e.rate) : '',
  rateUnit: e.rateUnit || 'per_kg',
  gstRate: String(e.gstRate ?? ''),
  amount: e.kind === 'payment' ? String(e.amount || '') : e.amount ? String(e.amount) : '',
  mode: e.mode || 'upi',
  reference: e.reference || '',
  notes: e.notes || '',
});

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

export default function EntryForm({
  lots,
  editing,
  onSaved,
  onCancelEdit,
}: {
  lots: Lot[];
  editing?: Entry | null;
  onSaved: (entry: Entry) => void | Promise<void>;
  onCancelEdit?: () => void;
}) {
  const { reference } = useClients();
  const gstDefault = reference?.defaultGstRate ?? 5;

  const [form, setForm] = useState<FormState>(() =>
    editing ? fromEntry(editing) : blank('inward', gstDefault),
  );
  const [more, setMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // Editing starts from whatever row was tapped, and a second tap on a
  // different row has to replace what's in the form.
  useEffect(() => {
    if (editing) {
      setForm(fromEntry(editing));
      setMore(true);
      setError(null);
    }
  }, [editing]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const isMaterial = form.kind !== 'payment';

  // --- Derived figures, shown live so nothing is a surprise after saving ----

  const derivedNet = useMemo(() => {
    const gross = num(form.grossWeight);
    const tare = num(form.tareWeight);
    return gross > 0 ? Math.max(0, Math.round((gross - tare) * 1000) / 1000) : 0;
  }, [form.grossWeight, form.tareWeight]);

  // A typed net wins; otherwise gross − tare fills in behind it.
  const effectiveNet = form.netWeight !== '' ? num(form.netWeight) : derivedNet;

  const basis =
    form.rateUnit === 'per_cone' ? num(form.cones) : form.rateUnit === 'lumpsum' ? 1 : effectiveNet;

  const computedAmount = Math.round(num(form.rate) * basis * 100) / 100;
  const effectiveAmount = form.amount !== '' ? num(form.amount) : computedAmount;
  const gstAmount = Math.round(((effectiveAmount * num(form.gstRate)) / 100) * 100) / 100;
  const total = Math.round((effectiveAmount + gstAmount) * 100) / 100;

  /** Lots of this client that still have yarn outstanding. */
  const clientLots = useMemo(
    () => lots.filter((l) => l.clientId === form.clientId && l.open),
    [lots, form.clientId],
  );

  const activeLot = useMemo(
    () => lots.find((l) => l.clientId === form.clientId && l.lotNo === form.lotNo),
    [lots, form.clientId, form.lotNo],
  );

  /** What this delivery leaves in the lot — the wastage, as he types. */
  const lotAfter = useMemo(() => {
    if (!activeLot || form.kind !== 'outward') return null;
    // When editing, this entry's own weight is already counted in the lot.
    const alreadyCounted = editing && editing.kind === 'outward' ? editing.netWeight : 0;
    const out = activeLot.outwardKg - alreadyCounted + effectiveNet;
    const left = Math.round((activeLot.inwardKg - out) * 1000) / 1000;
    return {
      out: Math.round(out * 1000) / 1000,
      left,
      percent: activeLot.inwardKg > 0 ? (left / activeLot.inwardKg) * 100 : 0,
      over: left < -0.0005,
    };
  }, [activeLot, effectiveNet, form.kind, editing]);

  // --- Picking things ------------------------------------------------------

  function pickClient(client: Client | null) {
    setForm((f) => ({
      ...f,
      clientId: client?.id || '',
      clientName: client?.name || '',
      // A rate agreed months ago shouldn't have to be remembered, but one
      // already typed for this entry shouldn't be overwritten either.
      rate: f.rate || (client?.defaultRate ? String(client.defaultRate) : ''),
      rateUnit: client?.defaultRateUnit || f.rateUnit,
      gstRate:
        client?.defaultGstRate !== undefined ? String(client.defaultGstRate) : f.gstRate,
      // The lot belongs to the old client.
      lotNo: client?.id === f.clientId ? f.lotNo : '',
    }));
  }

  /** Carry the yarn's description forward from the lot's inward entry. */
  function pickLot(lot: Lot) {
    setForm((f) => ({
      ...f,
      lotNo: lot.lotNo,
      yarnType: lot.yarnType || f.yarnType,
      denier: lot.denier || f.denier,
      shade: lot.shade || f.shade,
      ply: lot.ply ? String(lot.ply) : f.ply,
      tpm: lot.tpm ? String(lot.tpm) : f.tpm,
      twist: lot.twist || f.twist,
      account: lot.account || f.account,
    }));
  }

  // --- Save ----------------------------------------------------------------

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setDone(null);

    const payload: api.EntryInput = {
      kind: form.kind,
      date: form.date,
      account: form.account as Entry['account'],
      clientId: form.clientId,
      clientName: form.clientName,
      notes: form.notes,
    };

    if (form.kind === 'payment') {
      Object.assign(payload, {
        amount: num(form.amount),
        mode: form.mode,
        reference: form.reference,
      });
    } else {
      Object.assign(payload, {
        lotNo: form.lotNo,
        challanNo: form.challanNo,
        partyChallanNo: form.partyChallanNo,
        yarnType: form.yarnType,
        denier: form.denier,
        shade: form.shade,
        ply: num(form.ply),
        tpm: num(form.tpm),
        twist: form.twist,
        packing: form.packing,
        bags: num(form.bags),
        cones: num(form.cones),
        grossWeight: num(form.grossWeight),
        tareWeight: num(form.tareWeight),
        // Send the figure on screen, so what he saw is what gets stored.
        netWeight: effectiveNet,
        vehicleNo: form.vehicleNo,
        transporter: form.transporter,
        lrNo: form.lrNo,
      });
      if (form.kind === 'outward') {
        Object.assign(payload, {
          rate: num(form.rate),
          rateUnit: form.rateUnit,
          gstRate: num(form.gstRate),
          amount: effectiveAmount,
        });
      }
    }

    try {
      const r = editing
        ? await api.updateEntry(editing.id, payload, editing.date)
        : await api.createEntry(payload);

      await onSaved(r.entry);

      if (!editing) {
        // Keep the date, client and account: entries arrive in runs from the
        // same party on the same day, and re-picking all three every time is
        // the fastest way to make someone stop using a tool.
        setForm((f) => ({
          ...blank(f.kind, gstDefault),
          date: f.date,
          account: f.account,
          clientId: f.clientId,
          clientName: f.clientName,
          rate: f.rate,
          rateUnit: f.rateUnit,
          gstRate: f.gstRate,
        }));
        setDone(
          form.kind === 'payment'
            ? `Recorded ${rupees(num(form.amount))} from ${form.clientName}`
            : `Saved ${kgs(effectiveNet)} ${form.kind}${form.lotNo ? ` · lot ${form.lotNo}` : ''}`,
        );
        setTimeout(() => setDone(null), 2500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that entry');
    } finally {
      setSaving(false);
    }
  }

  const yarnSpec =
    reference?.yarnTypes.find((y) => y.id === form.yarnType)?.spec === 'count'
      ? 'Count (Ne)'
      : 'Denier';

  return (
    <form onSubmit={submit} className="card overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2.5">
        <div className="flex gap-1 rounded-lg bg-slate-200/70 p-1">
          {(Object.keys(KIND_META) as EntryKind[]).map((k) => {
            const { label, icon: Icon, tone } = KIND_META[k];
            const on = form.kind === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => set('kind', k)}
                disabled={!!editing && editing.kind !== k}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40',
                  on ? TAB_ACTIVE[tone] : 'text-slate-600 hover:bg-white/70',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        {editing && (
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="hidden text-slate-400 sm:inline">Editing an entry</span>
            <button
              type="button"
              onClick={onCancelEdit}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-slate-500 hover:bg-slate-200/60"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        {error && <Banner tone="error">{error}</Banner>}
        {done && (
          <Banner tone="success">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" /> {done}
            </span>
          </Banner>
        )}

        {/* Date · Client · Account */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="e-date">
              Date
            </label>
            <input
              id="e-date"
              type="date"
              className="input"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              required
            />
          </div>
          <div className="order-last col-span-2 lg:order-none lg:col-span-2">
            <label className="label" htmlFor="e-client">
              Client
            </label>
            <ClientPicker id="e-client" value={form.clientId} onChange={pickClient} />
          </div>
          <div>
            <label className="label" htmlFor="e-account">
              Account
            </label>
            <select
              id="e-account"
              className="input"
              value={form.account}
              onChange={(e) => set('account', e.target.value)}
            >
              {(reference?.accounts || []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {form.kind === 'payment' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="e-amount">
                Amount received (₹)
              </label>
              <input
                id="e-amount"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                className="input num"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="e-mode">
                Mode
              </label>
              <select
                id="e-mode"
                className="input"
                value={form.mode}
                onChange={(e) => set('mode', e.target.value)}
              >
                {(reference?.paymentModes || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label" htmlFor="e-ref">
                Reference
              </label>
              <input
                id="e-ref"
                className="input"
                placeholder="UTR / cheque no."
                value={form.reference}
                onChange={(e) => set('reference', e.target.value)}
                maxLength={120}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Lot · challans */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="e-lot">
                  Lot no.
                </label>
                <input
                  id="e-lot"
                  className="input"
                  value={form.lotNo}
                  onChange={(e) => set('lotNo', e.target.value)}
                  placeholder="e.g. L-001"
                  maxLength={60}
                  list={form.kind === 'outward' ? 'open-lots' : undefined}
                />
                {form.kind === 'outward' && (
                  <datalist id="open-lots">
                    {clientLots.map((l) => (
                      <option key={l.key} value={l.lotNo} />
                    ))}
                  </datalist>
                )}
              </div>
              <div>
                <label className="label" htmlFor="e-party-challan">
                  Party challan no.
                </label>
                <input
                  id="e-party-challan"
                  className="input"
                  value={form.partyChallanNo}
                  onChange={(e) => set('partyChallanNo', e.target.value)}
                  maxLength={60}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="label" htmlFor="e-challan">
                  Our challan no.
                </label>
                <input
                  id="e-challan"
                  className="input"
                  value={form.challanNo}
                  onChange={(e) => set('challanNo', e.target.value)}
                  maxLength={60}
                />
              </div>
            </div>

            {/* Open lots for this client — one tap carries the yarn forward. */}
            {form.kind === 'outward' && clientLots.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Open lots
                </span>
                {clientLots.slice(0, 8).map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => pickLot(l)}
                    className={clsx(
                      'num rounded-full border px-2.5 py-1 text-xs font-medium transition',
                      form.lotNo === l.lotNo
                        ? 'border-flame-300 bg-flame-50 text-flame-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                    )}
                    title={`${kgs(l.inwardKg)} in, ${kgs(l.outwardKg)} out`}
                  >
                    {l.lotNo}
                    <span className="ml-1.5 text-slate-400">{kgs(l.balanceKg, { unit: false })}</span>
                  </button>
                ))}
              </div>
            )}

            {/* What the yarn is */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="label" htmlFor="e-yarn">
                  Yarn
                </label>
                <select
                  id="e-yarn"
                  className="input"
                  value={form.yarnType}
                  onChange={(e) => set('yarnType', e.target.value)}
                >
                  {(reference?.yarnTypes || []).map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="e-denier">
                  {yarnSpec}
                </label>
                <input
                  id="e-denier"
                  className="input"
                  value={form.denier}
                  onChange={(e) => set('denier', e.target.value)}
                  placeholder={yarnSpec === 'Denier' ? '150/48' : '2/30s'}
                  maxLength={40}
                />
              </div>
              <div>
                <label className="label" htmlFor="e-shade">
                  Shade
                </label>
                <input
                  id="e-shade"
                  className="input"
                  value={form.shade}
                  onChange={(e) => set('shade', e.target.value)}
                  list="shades"
                  maxLength={60}
                />
                <datalist id="shades">
                  {(reference?.shades || []).map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div className="col-span-2 grid grid-cols-3 gap-2 sm:col-span-1">
                <div>
                  <label className="label" htmlFor="e-ply">
                    Ply
                  </label>
                  <input
                    id="e-ply"
                    type="number"
                    min="1"
                    max="12"
                    inputMode="numeric"
                    className="input num px-2"
                    value={form.ply}
                    onChange={(e) => set('ply', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="e-tpm">
                    TPM
                  </label>
                  <input
                    id="e-tpm"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    className="input num px-2"
                    value={form.tpm}
                    onChange={(e) => set('tpm', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="e-twist">
                    Twist
                  </label>
                  <select
                    id="e-twist"
                    className="input px-2"
                    value={form.twist}
                    onChange={(e) => set('twist', e.target.value)}
                  >
                    {(reference?.twistDirections || []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Packing and weights */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div>
                <label className="label" htmlFor="e-packing">
                  Packing
                </label>
                <select
                  id="e-packing"
                  className="input"
                  value={form.packing}
                  onChange={(e) => set('packing', e.target.value)}
                >
                  {(reference?.packings || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="e-bags">
                  Qty
                </label>
                <input
                  id="e-bags"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  className="input num"
                  value={form.bags}
                  onChange={(e) => set('bags', e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="e-cones">
                  Cones
                </label>
                <input
                  id="e-cones"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  className="input num"
                  value={form.cones}
                  onChange={(e) => set('cones', e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="e-gross">
                  Gross (kg)
                </label>
                <input
                  id="e-gross"
                  type="number"
                  step="0.001"
                  min="0"
                  inputMode="decimal"
                  className="input num"
                  value={form.grossWeight}
                  onChange={(e) => set('grossWeight', e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="e-tare">
                  Tare (kg)
                </label>
                <input
                  id="e-tare"
                  type="number"
                  step="0.001"
                  min="0"
                  inputMode="decimal"
                  className="input num"
                  value={form.tareWeight}
                  onChange={(e) => set('tareWeight', e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="e-net">
                  Net (kg)
                </label>
                <input
                  id="e-net"
                  type="number"
                  step="0.001"
                  min="0"
                  inputMode="decimal"
                  className={clsx(
                    'input num font-semibold',
                    form.netWeight === '' && derivedNet > 0 && 'bg-navy-50/60',
                  )}
                  value={form.netWeight !== '' ? form.netWeight : derivedNet || ''}
                  onChange={(e) => set('netWeight', e.target.value)}
                  placeholder="0.000"
                />
              </div>
            </div>

            {form.netWeight === '' && derivedNet > 0 && (
              <p className="-mt-1 text-[11px] text-slate-400">
                Net worked out from gross − tare. Type over it if the slip says otherwise.
              </p>
            )}

            {/* The lot after this delivery — i.e. the wastage. */}
            {form.kind === 'outward' && activeLot && lotAfter && (
              <div
                className={clsx(
                  'rounded-lg border px-3 py-2.5 text-xs',
                  lotAfter.over
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-navy-200 bg-navy-50 text-navy-800',
                )}
              >
                <span className="font-semibold">Lot {activeLot.lotNo}</span>
                <span className="num">
                  {' · '}
                  {kgs(activeLot.inwardKg)} in
                  {activeLot.outwardKg > 0 && ` · ${kgs(activeLot.outwardKg)} already out`}
                </span>
                {effectiveNet > 0 && (
                  <>
                    <span className="mx-1 text-navy-300">→</span>
                    {lotAfter.over ? (
                      <span className="num font-semibold">
                        this delivers {kgs(Math.abs(lotAfter.left))} more than came in — check the
                        weight
                      </span>
                    ) : (
                      <span className="num font-semibold">
                        {kgs(lotAfter.left)} left ({percent(lotAfter.percent)} wastage)
                      </span>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Money — outward only; nothing is billed when yarn arrives. */}
            {form.kind === 'outward' && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 lg:grid-cols-4">
                <div>
                  <label className="label" htmlFor="e-rate">
                    Rate (₹)
                  </label>
                  <input
                    id="e-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    className="input num"
                    value={form.rate}
                    onChange={(e) => set('rate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="e-rate-unit">
                    Per
                  </label>
                  <select
                    id="e-rate-unit"
                    className="input"
                    value={form.rateUnit}
                    onChange={(e) => set('rateUnit', e.target.value)}
                  >
                    {(reference?.rateUnits || []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="e-taxable">
                    Taxable (₹)
                  </label>
                  <input
                    id="e-taxable"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    className={clsx(
                      'input num',
                      form.amount === '' && computedAmount > 0 && 'bg-navy-50/60',
                    )}
                    value={form.amount !== '' ? form.amount : computedAmount || ''}
                    onChange={(e) => set('amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="e-gst">
                    GST %
                  </label>
                  <input
                    id="e-gst"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    inputMode="decimal"
                    className="input num"
                    value={form.gstRate}
                    onChange={(e) => set('gstRate', e.target.value)}
                  />
                </div>

                <dl className="num col-span-full flex flex-wrap items-baseline gap-x-5 gap-y-1 border-t border-slate-200 pt-2.5 text-sm">
                  <div className="flex items-baseline gap-1.5">
                    <dt className="text-xs text-slate-500">Taxable</dt>
                    <dd className="font-medium text-slate-700">{rupees(effectiveAmount)}</dd>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <dt className="text-xs text-slate-500">GST</dt>
                    <dd className="font-medium text-slate-700">{rupees(gstAmount)}</dd>
                  </div>
                  <div className="ml-auto flex items-baseline gap-1.5">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Invoice total
                    </dt>
                    <dd className="text-base font-bold text-flame-700">{rupees(total)}</dd>
                  </div>
                </dl>
              </div>
            )}
          </>
        )}

        {/* Transport and notes — folded away, because most days they're blank. */}
        <div>
          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            <ChevronDown className={clsx('h-3.5 w-3.5 transition', more && 'rotate-180')} />
            {more ? 'Fewer details' : 'Transport & notes'}
          </button>

          {more && (
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {isMaterial && (
                <>
                  <div>
                    <label className="label" htmlFor="e-vehicle">
                      Vehicle no.
                    </label>
                    <input
                      id="e-vehicle"
                      className="input uppercase"
                      value={form.vehicleNo}
                      onChange={(e) => set('vehicleNo', e.target.value.toUpperCase())}
                      placeholder="DD 01 AB 1234"
                      maxLength={32}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="e-transporter">
                      Transporter
                    </label>
                    <input
                      id="e-transporter"
                      className="input"
                      value={form.transporter}
                      onChange={(e) => set('transporter', e.target.value)}
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="e-lr">
                      LR no.
                    </label>
                    <input
                      id="e-lr"
                      className="input"
                      value={form.lrNo}
                      onChange={(e) => set('lrNo', e.target.value)}
                      maxLength={60}
                    />
                  </div>
                </>
              )}
              <div className={isMaterial ? 'col-span-2 lg:col-span-1' : 'col-span-2 lg:col-span-4'}>
                <label className="label" htmlFor="e-notes">
                  Notes
                </label>
                <input
                  id="e-notes"
                  className="input"
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  maxLength={2000}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            className={clsx(
              'flex-1 sm:flex-none',
              form.kind === 'outward' ? 'btn-accent' : 'btn-primary',
            )}
            disabled={saving || !form.clientId}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editing ? 'Save changes' : `Add ${KIND_META[form.kind].label.toLowerCase()}`}
          </button>
          {!form.clientId && (
            <span className="text-xs text-slate-400">Choose a client to save</span>
          )}
        </div>
      </div>
    </form>
  );
}

// --- Account ---------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'member';
}

// --- Reference data (served by GET /api/reference) -------------------------

export interface RefItem {
  id: string;
  label: string;
  hint?: string;
}

export interface YarnType extends RefItem {
  /** Filament yarns are quoted in denier, spun yarns in count (Ne). */
  spec: 'denier' | 'count';
}

export interface Reference {
  kinds: RefItem[];
  accounts: RefItem[];
  yarnTypes: YarnType[];
  shades: string[];
  twistDirections: RefItem[];
  packings: RefItem[];
  rateUnits: RefItem[];
  paymentModes: RefItem[];
  defaultGstRate: number;
}

// --- Clients ---------------------------------------------------------------

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  /** Pre-filled into the entry form when this client is picked. */
  defaultRate: number;
  defaultRateUnit: string;
  defaultGstRate: number;
  /** What they owed when JV started tracking, so balances are right from day one. */
  openingBalance: number;
  openingBalanceDate: string;
  notes: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

// --- Ledger ----------------------------------------------------------------

export type EntryKind = 'inward' | 'outward' | 'payment';
export type Account = 'jobwork' | 'trading';

export interface Entry {
  id: string;
  kind: EntryKind;
  date: string;
  account: Account;
  clientId: string;
  /** Denormalised, so history still reads right if a client is later renamed. */
  clientName: string;
  notes: string;

  // Material (inward + outward)
  lotNo: string;
  challanNo: string;
  partyChallanNo: string;
  yarnType: string;
  denier: string;
  shade: string;
  ply: number;
  tpm: number;
  twist: string;
  packing: string;
  bags: number;
  cones: number;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  vehicleNo: string;
  transporter: string;
  lrNo: string;

  // Money (outward bills it, payment settles it)
  rate: number;
  rateUnit: string;
  amount: number;
  gstRate: number;
  gstAmount: number;
  totalAmount: number;
  mode?: string;
  reference?: string;

  createdAt: string;
  updatedAt: string;
  /** Only present on a statement — the balance after this entry. */
  runningBalance?: number;
}

/**
 * A lot ties outward back to inward. `gapPercent` reads as "still to come back"
 * while the lot is open, and as wastage once it has been delivered.
 */
export interface Lot {
  key: string;
  lotNo: string;
  clientId: string;
  clientName: string;
  account: Account;
  yarnType: string;
  denier: string;
  shade: string;
  ply: number;
  tpm: number;
  twist: string;
  inwardKg: number;
  outwardKg: number;
  inwardCones: number;
  outwardCones: number;
  balanceKg: number;
  /** Pending on an open lot; the wastage on a complete one. `complete` says which. */
  gapPercent: number;
  delivered: boolean;
  /** Delivered, and short by no more than the wastage tolerance. */
  complete: boolean;
  wastageKg: number;
  open: boolean;
  firstDate: string;
  lastDate: string;
  entries: number;
}

export interface EntryTotals {
  entries: number;
  inwardKg: number;
  outwardKg: number;
  billed: number;
  gst: number;
  paid: number;
}

/** Per-client position. `balance` positive means the client owes JV. */
export interface ClientBalance {
  clientId: string;
  clientName: string;
  active: boolean;
  known: boolean;
  openingBalance: number;
  /** Job-work material of theirs still on JV's floor, in kg — wastage excluded. */
  materialKg: number;
  /** Lost in process on their finished lots. */
  wastageKg: number;
  inwardKg: number;
  outwardKg: number;
  billed: number;
  paid: number;
  balance: number;
  entries: number;
  lastEntryDate: string;
}

export interface LedgerSummary {
  clients: ClientBalance[];
  totals: {
    clients: number;
    materialKg: number;
    wastageKg: number;
    inwardKg: number;
    outwardKg: number;
    billed: number;
    paid: number;
    opening: number;
    outstanding: number;
    advance: number;
    entries: number;
  };
  openLots: Lot[];
  month: { key: string } & EntryTotals;
  recent: Entry[];
}

export interface Statement {
  client: Client | { id: string; name: string };
  entries: Entry[];
  openingBalance: number;
  closingBalance: number;
  summary: ClientBalance | null;
  lots: Lot[];
  totals: EntryTotals;
}

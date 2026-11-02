import type {
  Client,
  Entry,
  EntryKind,
  EntryTotals,
  LedgerSummary,
  Lot,
  Reference,
  Statement,
  User,
} from './types';

declare global {
  interface Window {
    __JV_API_BASE__?: string;
  }
}

/**
 * Where the API lives.
 *
 * Resolved at *runtime*, from a value the server writes into the page, rather
 * than from `NEXT_PUBLIC_API_BASE` alone. `NEXT_PUBLIC_*` is inlined when the
 * bundle is built, and a Cloud Run `--source` deploy does not forward its build
 * env vars into the Dockerfile's ARGs — so that path silently compiled the
 * localhost fallback into production and every call failed before it left the
 * browser. Reading it at runtime also means pointing the app at a different API
 * is an env-var change, not a rebuild.
 *
 * The chain is: value injected by the server → build-time value (local `npm run
 * dev`, where .env.local is read) → the local default.
 */
function resolveApiBase(): string {
  if (typeof window !== 'undefined' && window.__JV_API_BASE__) {
    return window.__JV_API_BASE__;
  }
  return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4100/api';
}

/** Read through a getter so it picks up the injected value after hydration. */
export const apiBase = resolveApiBase;

const TOKEN_KEY = 'jv_token';
const REFRESH_KEY = 'jv_refresh';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function setRefreshToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(REFRESH_KEY, token);
  else window.localStorage.removeItem(REFRESH_KEY);
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

/** Store a whole session at once (login / refresh both return this shape). */
export function setSession(s: { token: string; refreshToken?: string }) {
  setToken(s.token);
  if (s.refreshToken) setRefreshToken(s.refreshToken);
}

export function clearSession() {
  setToken(null);
  setRefreshToken(null);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Firebase ID tokens expire after an hour, so a 401 is usually just staleness
 * rather than a real sign-out. Swap the refresh token for a fresh ID token and
 * replay the request once. Concurrent 401s share one refresh.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshSession(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${apiBase()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) {
          clearSession();
          return null;
        }
        const data = await res.json();
        setSession(data);
        return data.token as string;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function send(path: string, options: RequestInit, token: string | null) {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${apiBase()}${path}`, { ...options, headers });
}

async function raw(path: string, options: RequestInit = {}): Promise<Response> {
  let res = await send(path, options, getToken());
  if (res.status === 401 && getRefreshToken()) {
    const fresh = await refreshSession();
    if (fresh) res = await send(path, options, fresh);
  }
  return res;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await raw(path, options);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

/** Drop empty values so the URL only carries filters that are actually set. */
function qs(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

// --- Auth ------------------------------------------------------------------

export interface Session {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export function login(email: string, password: string) {
  return request<Session>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function register(name: string, email: string, password: string) {
  return request<Session>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export function me() {
  return request<{ user: User }>('/auth/me');
}

/** Always resolves for any well-formed address — it never reveals whether an account exists. */
export function forgotPassword(email: string) {
  return request<{ ok: true; message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

// --- Reference -------------------------------------------------------------

export function getReference() {
  return request<Reference>('/reference');
}

// --- Clients ---------------------------------------------------------------

export type ClientInput = Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>;

export function getClients() {
  return request<{ clients: Client[] }>('/clients');
}

export function createClient(input: ClientInput) {
  return request<{ client: Client; clients: Client[]; duplicate?: boolean }>('/clients', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateClient(id: string, input: ClientInput) {
  return request<{ client: Client; clients: Client[] }>(`/clients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/** A client with entries is deactivated rather than deleted — the reply says which. */
export function deleteClient(id: string) {
  return request<{ clients: Client[]; deactivated: boolean; message?: string }>(`/clients/${id}`, {
    method: 'DELETE',
  });
}

// --- Entries ---------------------------------------------------------------

export interface EntryFilters {
  from?: string;
  to?: string;
  client?: string;
  kind?: EntryKind | '';
  account?: string;
  lot?: string;
  q?: string;
}

export type EntryInput = Partial<Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>>;

export function getEntries(filters: EntryFilters = {}) {
  return request<{ entries: Entry[]; totals: EntryTotals; lots: Lot[] }>(
    `/entries${qs(filters as Record<string, string>)}`,
  );
}

export function createEntry(input: EntryInput) {
  return request<{ entry: Entry }>('/entries', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * `currentDate` is the date the entry has *now*, which tells the server which
 * month document to open — without it, it has to scan the book to find one row.
 */
export function updateEntry(id: string, input: EntryInput, currentDate: string) {
  return request<{ entry: Entry }>(`/entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...input, currentDate }),
  });
}

export function deleteEntry(id: string, date: string) {
  return request<{ ok: true }>(`/entries/${id}${qs({ date })}`, { method: 'DELETE' });
}

// --- Derived views ---------------------------------------------------------

export function getSummary() {
  return request<LedgerSummary>('/ledger/summary');
}

export function getStatement(client: string, filters: { from?: string; to?: string } = {}) {
  return request<Statement>(`/ledger/statement${qs({ client, ...filters })}`);
}

// --- Export ----------------------------------------------------------------

/**
 * A download opened in a new tab can't carry an Authorization header, so the
 * CSV is fetched with one and saved from the blob instead.
 */
export async function downloadLedgerCsv(filters: EntryFilters = {}) {
  const res = await raw(`/export/ledger.csv${qs(filters as Record<string, string>)}`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = `Export failed (${res.status})`;
    try {
      message = JSON.parse(text)?.error || message;
    } catch {
      /* a non-JSON body means the generic message is the best we have */
    }
    throw new ApiError(message, res.status);
  }

  const blob = await res.blob();
  const name =
    /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1] ||
    'jv-ledger.csv';

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return name;
}

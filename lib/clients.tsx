'use client';

/**
 * clients.tsx — the client book, shared across the app.
 *
 * It is held here rather than fetched per page because almost everything needs
 * it at once: the ledger's picker, the name on every row, the rate that
 * pre-fills the form, and the sidebar's count. Adding a client from inside the
 * ledger form has to show up in that picker immediately, which a per-page fetch
 * would not do.
 *
 * Every write returns the whole list, so there is no client-side merging to get
 * wrong — the server's copy is always what gets rendered.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './auth';
import * as api from './api';
import type { Client, Reference } from './types';

interface ClientsState {
  clients: Client[];
  /** Active only — what a picker should offer. */
  active: Client[];
  loading: boolean;
  error: string | null;
  /** Reference data for the entry form, loaded once alongside the clients. */
  reference: Reference | null;
  byId: (id: string) => Client | undefined;
  refresh: () => Promise<void>;
  create: (input: api.ClientInput) => Promise<{ client: Client; duplicate?: boolean }>;
  update: (id: string, input: api.ClientInput) => Promise<Client>;
  remove: (id: string) => Promise<{ deactivated: boolean; message?: string }>;
}

const ClientsContext = createContext<ClientsState | undefined>(undefined);

export function ClientsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [reference, setReference] = useState<Reference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setClients([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Reference data never changes at runtime, so it is fetched once and
      // only if it is missing.
      const [list, ref] = await Promise.all([
        api.getClients(),
        reference ? Promise.resolve(reference) : api.getReference(),
      ]);
      setClients(list.clients);
      setReference(ref);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your clients');
    } finally {
      setLoading(false);
    }
    // `reference` is deliberately not a dependency: including it would re-run
    // this the moment it lands and fetch the client list a second time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (input: api.ClientInput) => {
    const r = await api.createClient(input);
    setClients(r.clients);
    return { client: r.client, duplicate: r.duplicate };
  }, []);

  const update = useCallback(async (id: string, input: api.ClientInput) => {
    const r = await api.updateClient(id, input);
    setClients(r.clients);
    return r.client;
  }, []);

  const remove = useCallback(async (id: string) => {
    const r = await api.deleteClient(id);
    setClients(r.clients);
    return { deactivated: r.deactivated, message: r.message };
  }, []);

  const active = useMemo(() => clients.filter((c) => c.active !== false), [clients]);
  const byId = useCallback((id: string) => clients.find((c) => c.id === id), [clients]);

  const value = useMemo(
    () => ({ clients, active, loading, error, reference, byId, refresh, create, update, remove }),
    [clients, active, loading, error, reference, byId, refresh, create, update, remove],
  );

  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
}

export function useClients() {
  const ctx = useContext(ClientsContext);
  if (!ctx) throw new Error('useClients must be used within ClientsProvider');
  return ctx;
}

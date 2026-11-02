'use client';

/**
 * ledger.tsx — balances, shared between the dashboard and the sidebar badge.
 *
 * This holds the *derived* view only (what each client owes, what material is
 * on the floor, this month's movement). The entries themselves are fetched by
 * the ledger page against its own filters, because those change with every tap
 * and caching them here would mean two sources of truth for the same rows.
 *
 * Any write to an entry invalidates these totals, so `refresh` is exposed and
 * called by the pages that write.
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
import type { LedgerSummary } from './types';

interface LedgerState {
  summary: LedgerSummary | null;
  loading: boolean;
  error: string | null;
  /** Clients who owe money, most owed first. */
  outstanding: LedgerSummary['clients'];
  /** Total still owed to JV, ignoring anyone in credit. */
  outstandingTotal: number;
  /** Job-work material belonging to clients, still on JV's floor. */
  materialKg: number;
  openLots: number;
  refresh: () => Promise<void>;
}

const LedgerContext = createContext<LedgerState | undefined>(undefined);

export function LedgerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setSummary(null);
      setLoading(false);
      return;
    }
    try {
      setSummary(await api.getSummary());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your balances');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const derived = useMemo(() => {
    const clients = summary?.clients || [];
    return {
      outstanding: clients.filter((c) => c.balance > 0),
      outstandingTotal: summary?.totals.outstanding || 0,
      materialKg: summary?.totals.materialKg || 0,
      openLots: summary?.openLots.length || 0,
    };
  }, [summary]);

  const value = useMemo(
    () => ({ summary, loading, error, ...derived, refresh }),
    [summary, loading, error, derived, refresh],
  );

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger() {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error('useLedger must be used within LedgerProvider');
  return ctx;
}

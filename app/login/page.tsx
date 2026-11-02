'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, MailCheck } from 'lucide-react';
import Brand from '@/components/Brand';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';

/** Accounts are provisioned with the backend's create-user script. */
const SIGNUP_OPEN = process.env.NEXT_PUBLIC_ALLOW_SIGNUP === 'true';

type Mode = 'login' | 'register' | 'forgot';

export default function LoginPage() {
  const { user, loading, login, register } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/ledger');
  }, [user, loading, router]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setSent(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'forgot') {
        const r = await api.forgotPassword(email);
        setSent(r.message);
      } else if (mode === 'register') {
        await register(name, email, password);
        router.replace('/ledger');
      } else {
        await login(email, password);
        router.replace('/ledger');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const heading =
    mode === 'forgot' ? 'Reset your password' : mode === 'register' ? 'Create an account' : 'Sign in';
  const sub =
    mode === 'forgot'
      ? "Enter your email and we'll send a reset link."
      : mode === 'register'
        ? 'Set up access to the JV ledger.'
        : 'Inward, outward and payments for JV Enterprises.';

  return (
    <div className="flex min-h-screen">
      {/* Brand panel — the letterhead, on cream over navy. */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 p-12 text-white lg:flex">
        {/* The sweep under the wordmark on the printed card. */}
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-64 w-full opacity-20"
          viewBox="0 0 400 200"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d="M0 120 C 120 60, 260 180, 400 90 L400 200 L0 200 Z" fill="#f58220" />
          <path d="M0 150 C 140 90, 250 200, 400 130 L400 200 L0 200 Z" fill="#e8341c" opacity="0.6" />
        </svg>

        <Brand size="lg" tone="light" tagline />

        <div className="relative">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Every lot, every kilo,
            <br />
            every rupee.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-200">
            Record what comes in and what goes back out, and know at a glance whose yarn is on the
            floor and who still owes.
          </p>
        </div>

        <p className="relative text-xs text-navy-300">
          Shop No. Gala-14, Balaji Industrial Estate-C, Piparia, Silvassa — 396230
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center bg-cream-50 p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand size="md" />
          </div>

          <h2 className="font-display text-2xl font-bold text-navy-900">{heading}</h2>
          <p className="mt-1 text-sm text-slate-500">{sub}</p>

          {sent ? (
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{sent}</p>
              </div>
              <button onClick={() => switchMode('login')} className="btn-secondary w-full">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="label" htmlFor="name">
                    Full name
                  </label>
                  <input
                    id="name"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              <div>
                <label className="label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="label" htmlFor="password">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="mb-1.5 text-xs font-medium text-navy-600 hover:text-navy-800"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    id="password"
                    type="password"
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    required
                  />
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
              )}

              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === 'forgot'
                  ? 'Send reset link'
                  : mode === 'register'
                    ? 'Create account'
                    : 'Sign in'}
              </button>

              {mode === 'forgot' && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="btn-secondary w-full"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to sign in
                </button>
              )}
            </form>
          )}

          {SIGNUP_OPEN && mode !== 'forgot' ? (
            <p className="mt-6 text-center text-sm text-slate-500">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                className="font-semibold text-navy-700 hover:text-navy-900"
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              >
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          ) : mode !== 'forgot' && !sent ? (
            <p className="mt-6 text-center text-xs text-slate-400">
              Accounts for JV Enterprises are created by an administrator.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

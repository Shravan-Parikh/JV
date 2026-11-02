'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  BookOpenText,
  Users,
  LayoutDashboard,
  Package,
  FileText,
  Settings,
  Lock,
  X,
} from 'lucide-react';
import Brand from '@/components/Brand';
import { useClients } from '@/lib/clients';
import { useLedger } from '@/lib/ledger';
import { rupeesShort, kgsShort } from '@/lib/format';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  soon?: boolean;
  badge?: 'clients' | 'lots';
}

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Ledger', href: '/ledger', icon: BookOpenText },
  { label: 'Clients', href: '/clients', icon: Users, badge: 'clients' },
  { label: 'Open Lots', href: '/ledger?lots=open', icon: Package, badge: 'lots' },
  { label: 'Invoices', href: '#', icon: FileText, soon: true },
];

/**
 * On desktop this is a permanent 16rem column; below `lg` it becomes an overlay
 * drawer driven by `open`/`onClose` from the app shell.
 */
export default function Sidebar({
  open = false,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { active } = useClients();
  const { outstandingTotal, materialKg, openLots } = useLedger();

  return (
    <>
      {/* Mobile scrim */}
      <div
        className={clsx(
          'fixed inset-0 z-30 bg-slate-900/40 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200',
          'lg:static lg:z-auto lg:h-screen lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-100 px-4">
          <Brand size="sm" />
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>
          {NAV.map((item) => {
            // Open Lots is the ledger with a filter, so a plain path match would
            // light up both rows at once.
            const [path, query] = item.href.split('?');
            const active_ = !item.soon && pathname === path && !query;
            const Icon = item.icon;
            const count =
              item.badge === 'clients' ? active.length : item.badge === 'lots' ? openLots : 0;

            const content = (
              <div
                className={clsx(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                  active_
                    ? 'bg-navy-50 text-navy-800'
                    : item.soon
                      ? 'text-slate-400'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.soon ? (
                  <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                    <Lock className="h-3 w-3" /> Soon
                  </span>
                ) : count > 0 ? (
                  <span className="flex min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    {count}
                  </span>
                ) : null}
              </div>
            );

            return item.soon ? (
              <div key={item.label} className="cursor-not-allowed" title="Coming soon">
                {content}
              </div>
            ) : (
              <Link key={item.label} href={item.href} onClick={onClose}>
                {content}
              </Link>
            );
          })}

          {/* The two numbers worth knowing without opening anything. */}
          <div className="mt-5 rounded-xl border border-cream-300 bg-cream-100 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-700">
              Position
            </p>
            <dl className="mt-2 space-y-2">
              <div>
                <dt className="text-[11px] text-slate-500">Outstanding</dt>
                <dd className="num text-base font-bold leading-tight text-flame-700">
                  {rupeesShort(outstandingTotal)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Material with us</dt>
                <dd className="num text-base font-bold leading-tight text-navy-800">
                  {kgsShort(materialKg)}
                </dd>
              </div>
            </dl>
          </div>
        </nav>

        <div className="shrink-0 border-t border-slate-100 p-3">
          <div className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400">
            <Settings className="h-[18px] w-[18px]" />
            Settings
            <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
              Soon
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}

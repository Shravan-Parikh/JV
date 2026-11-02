import type { Metadata, Viewport } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

/** The wordmark only — the printed logo sets its name in a transitional serif. */
const serif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'JV Enterprises — Ledger',
  description:
    'Inward, outward and payments for JV Enterprises, twisting yarn manufacturing unit, Silvassa.',
  icons: {
    // Inlined so the tab icon needs no extra request and stays sharp.
    icon: [
      {
        url:
          'data:image/svg+xml,' +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e8341c"/><stop offset="100%" stop-color="#f58220"/></linearGradient></defs><rect width="48" height="48" rx="12" fill="#14315c"/><text x="24" y="33" text-anchor="middle" font-family="Georgia,serif" font-size="24" font-weight="700" fill="url(#g)">JV</text></svg>`,
          ),
        type: 'image/svg+xml',
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#14315c',
  // He uses this one-handed in a mill office; the layout is built for it, so
  // there is nothing to gain from letting the page scale.
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

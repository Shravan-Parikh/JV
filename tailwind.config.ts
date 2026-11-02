import type { Config } from 'tailwindcss';

/**
 * The palette is read off the JV Enterprises logo: a deep navy wordmark, a
 * red-to-orange gradient on the monogram, and warm cream paper behind it.
 *
 * `navy` is the primary and carries buttons, links, focus rings and the active
 * nav state. `flame` is kept deliberately scarce — the monogram, the primary
 * call to action, and money that is owed — so it still means something when it
 * appears. `cream` tints surfaces that want to feel like the letterhead rather
 * than the app chrome, which stays on slate and white for legibility.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f2f6fb',
          100: '#e3ecf7',
          200: '#c2d5ec',
          300: '#8fb0d8',
          400: '#5583bf',
          500: '#2f5f9f',
          600: '#1e4a85',
          700: '#193c6c',
          800: '#14315c',
          900: '#102848',
          950: '#0a192f',
        },
        flame: {
          50: '#fff6ed',
          100: '#ffe9d1',
          200: '#ffcfa2',
          300: '#ffad69',
          400: '#fc8a3c',
          500: '#f58220',
          600: '#e85c18',
          700: '#e8341c',
          800: '#b82a17',
          900: '#8f2414',
        },
        cream: {
          50: '#fdfaf3',
          100: '#faf4e6',
          200: '#f3e9d2',
          300: '#e8d9b6',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // The wordmark only — body text in a serif would slow down a form he
        // fills a dozen times a day.
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;

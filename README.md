# JV Enterprises — Web

The ledger app for **JV Enterprises**, a twisting-yarn manufacturing unit in
Silvassa: inward, outward and payments, with what each client owes and how much
of their yarn is still on the floor.

Next.js (App Router) + TypeScript + Tailwind. The API lives in a separate
repository — [Shravan-Parikh/JV-Backend](https://github.com/Shravan-Parikh/JV-Backend) —
and needs to be running for this app to do anything.

```bash
cp .env.local.example .env.local
npm install
npm run dev        # http://localhost:3100
```

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_API_BASE` | Base URL of the API, e.g. `http://localhost:4100/api`. Inlined into the client bundle at **build** time. |
| `NEXT_PUBLIC_ALLOW_SIGNUP` | `false`. Accounts are provisioned by the backend's `create-user.js`. |

## Pages

| | |
| --- | --- |
| `/login` | Split-screen sign-in with password reset. |
| `/dashboard` | Material on the floor, who owes what, this month's movement. |
| `/ledger` | The page he lives in — entry form, filters, statement. |
| `/clients` | The client book, with both balances against each name. |

## Two things worth knowing

**Filters live in the URL.** `/ledger?client=…&kind=…&from=…&to=…` — so a
client's statement is a link that can be bookmarked or sent, the phone's back
button steps back through what was being looked at, and a reload lands in the
same place. The running-balance column only appears once a single client is
selected, because a running total down a list of mixed clients is meaningless.

**It is used on a phone as much as a laptop.** The ledger renders as a table
above `xl` and as stacked cards below, rather than a table that scrolls
sideways. Short fields in the entry form pair two across even on the narrowest
screen, because a form that takes a dozen scrolls to reach its save button is a
form that gets filled in on paper instead.

## Layout

```
app/
├── login/           sign in · register · forgot password
└── (app)/           everything behind auth
    ├── layout.tsx   auth gate, providers, sidebar shell
    ├── dashboard/   ledger/   clients/
components/
├── Brand.tsx        the wordmark, drawn in SVG — no image asset
├── EntryForm.tsx    inward · outward · payment, behind one set of tabs
├── ClientPicker.tsx typeahead, with "add client" inline
├── LedgerTable.tsx  table above xl, cards below
└── ui.tsx           banners, empty states, skeletons, modal
lib/
├── api.ts           fetch wrapper with transparent token refresh-and-replay
├── auth.tsx         session
├── clients.tsx      the client book + reference data, shared
├── ledger.tsx       balances, shared with the sidebar
└── format.ts        one authority for Rs, kg and dates — all en-IN
```

`lib/format.ts` is deliberately shared rather than per-page: a weight shown to
two decimals on one screen and three on another is a weight someone will
dispute. It also carries the two IST rules — a date-only string is parsed as
`new Date(iso + 'T00:00:00')`, and "today" never comes from `toISOString()`.

## Deploy

The API must be deployed first, because its URL is compiled into this app's
client bundle at build time.

```bash
./scripts/deploy.sh
```

It finds the running `jv-api` service, builds against it, and then points that
service's `CORS_ORIGIN` back at this app so the two ends can talk. Pass
`JV_API_URL=https://…/api` to name the API explicitly instead.

Full notes, including first-time setup and costs, are in the backend repo's
`DEPLOY.md`.

## On his phone

It is a normal website, so: open the deployed URL in Safari or Chrome → Share →
**Add to Home Screen**. It then opens full-screen from the home screen like an
app, with the JV monogram as its icon.

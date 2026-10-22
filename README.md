# BizConnect POS — Business App PWA

A Progressive Web App front end for BizConnect's billing/POS backend. Installable
on a shop counter's phone, tablet, or desktop; keeps working through dropped
connections by queuing bills locally and syncing when back online.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4** with a custom design system (see "Design system" below)
- Hand-rolled service worker + manifest — no `next-pwa` dependency
- No UI/state library beyond React itself; no chart library (analytics uses
  plain CSS bar charts, kept deliberately light)

## Getting started

```bash
npm install
npm run dev
```

The dev server runs on **port 3001** — not 3000 — because the BizConnect
backend already uses `localhost:3000`. `npm start` (production) also uses
3001. Change this in `package.json` if you'd rather run them elsewhere.

Copy `.env.example` to `.env.local` and point `NEXT_PUBLIC_API_BASE_URL` at
your backend (defaults to `http://localhost:3000/api/v1`).

You need the BizConnect backend running and reachable at that URL — this app
has no logic of its own; every screen is a thin layer over the existing API.

**CORS note:** the backend's `cors()` config allows `*` in development, so
local setup needs no changes. In production it locks to
`config.app.frontendUrl` — set that backend env var to wherever this PWA is
actually deployed before going live, or every request will be blocked by CORS.

## Project structure

```
src/
  app/
    login/             public — OTP login
    onboarding/        public (post-login) — create business, first-time OWNER
    (app)/             protected shell — sidebar/bottom-nav, auth guard
      dashboard/
      billing/         the POS screen — see below
      products/
      customers/
      invoices/
      expenses/
      analytics/
      team/
    offline/           service worker's offline fallback page
  components/
    service-worker-register.tsx
  lib/
    types.ts            types mirroring the backend's Prisma models + response envelope
    http.ts              fetch wrapper: auth header, 401 refresh-and-retry, typed errors
    api.ts                one function per backend route, grouped by module
    auth-context.tsx     OTP login flow, session state, role helper (hasMinRole)
    offline-queue.ts     IndexedDB queue for invoices created while offline
    use-offline-sync.ts  flushes the queue on reconnect
    use-online-status.ts live online/offline flag
```

Every function in `lib/api.ts` maps 1:1 to a real backend route — same method,
same path, same request/response shape as the Zod schemas in
`src/modules/*/*.schema.ts` on the backend. If a backend route changes, this
is the only file that needs updating on the frontend.

## The billing screen — why this is a PWA at all

`(app)/billing/page.tsx` is the actual POS counter: search a product, it
drops into a running cart styled as a receipt tape, pick or skip a customer,
charge it. This is the one screen built with real intention rather than
being a thin CRUD wrapper, because it's the one a shop owner will have open
all day.

**Offline handling is real, not decorative.** If `POST /invoices` fails
because the network is down (not because the server rejected it — those are
different code paths), the bill is written to IndexedDB via
`lib/offline-queue.ts` instead of being lost, and the cashier sees "saved,
will sync" rather than an error. `use-offline-sync.ts` retries everything
queued the moment the browser's `online` event fires, and the top bar shows a
live count of anything still waiting to sync. A rejected bill (bad data, an
expired token) is *not* retried forever — only genuine network failures go
into the queue.

What this does **not** do yet: print to a thermal receipt printer, scan a
barcode via camera, or handle a truly multi-day offline session (IndexedDB
will hold the queue, but there's no conflict resolution if, say, the same
product runs out of stock while offline and a queued bill oversells it — the
backend's own stock check will just reject that item on sync).

## Design system

Not the default AI-generated look. A few deliberate choices, grounded in what
this actually is — a billing ledger, not a marketing site:

- **Palette**: paper (`#F6F7F4`) background, deep teal primary (`#0F5D52`,
  evokes a ledger/cash-register rather than a generic SaaS blue), marigold
  (`#E0952B`) for anything needing attention (low stock, pending sync,
  pending invites) — common in Indian retail signage — plus standard
  red/green for danger/success.
- **Type**: system font stack throughout (no Google Fonts — see note below).
  Every amount, quantity, phone number, and invoice number uses `.figures`
  (tabular-nums monospace) so columns of numbers actually align — this is
  functional, not decorative.
- **The one bold element**: the billing cart rendered as a receipt tape
  (dashed dividers, tape-like proportions) — everything else stays quiet and
  functional on purpose.

**On fonts:** this was built in a sandboxed environment with no access to
`fonts.googleapis.com`, so it intentionally uses system font stacks instead
of `next/font/google`. That's a constraint of where it was built, not a
recommendation — once you have normal network access, swapping in a real
typeface is a straightforward upgrade; the `--font-sans` / `--font-mono`
tokens in `globals.css` are the only place that needs to change.

## PWA / offline internals

- `public/manifest.json` — installable metadata, standalone display, teal
  theme color
- `public/sw.js` — network-first for API GETs (falls back to last-known-good
  cache offline), cache-first for the app shell, `/offline` as the navigation
  fallback
- Icons in `public/icons/` were generated from `scripts/icon-src.svg` via
  `sharp` at build time (sharp itself isn't a runtime dependency — it was
  removed after generating the PNGs). Regenerate with the same script if the
  icon changes.
- **Writes never go through the service worker** — only GET requests are
  intercepted. All mutations go straight to the network, with the invoice
  queue as the one deliberate exception.

## Known gaps / next steps

- **No barcode scanning** — product search is text-based only. A camera-based
  scanner (e.g. via the `BarcodeDetector` API where supported) is a natural
  follow-up for the billing screen specifically.
- **No thermal printer integration** — Web Bluetooth/Web USB support for
  ESC/POS printers is inconsistent across browsers (notably weak on iOS
  Safari); this needs its own investigation before committing to it as the
  primary printing path. Printing the backend-generated PDF works today as a
  fallback.
- **Lint**: `npx eslint .` currently flags several
  `react-hooks/set-state-in-effect` warnings on the standard "fetch on
  mount" pattern used across the list pages and `use-offline-sync.ts`. These
  don't block `npm run build` — Next's build step doesn't gate on lint in
  this template — but are worth either addressing (e.g. moving data-fetching
  to a library like SWR/TanStack Query) or tuning the rule in
  `eslint.config.mjs` in a follow-up pass.
- **Payment collection UI assumes a single payment mode per bill.** The
  backend actually supports split payments (an array of payment entries) —
  the billing screen only sends one. Worth extending if split payments are a
  real counter scenario.
- **No production Docker setup for this frontend yet** — `next.config.ts` is
  set to `output: "standalone"` so a Dockerfile is a short addition (copy
  `.next/standalone` + `.next/static` + `public`), but it hasn't been written.

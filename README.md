# Slow Express — QR table ordering (CPE 334 Project, Theme 4: Ordering) — Sprint 1

Customers scan the QR code on their table, order drinks as a **guest** (or sign in as a **member**), and drag toppings onto the cup to customize. Staff sign in, see incoming orders for their shop and accept them. The product is shop-agnostic (shop, tables, menu and toppings are data); the seeded context is the drink shop **Slow Express**.

## Setup
```bash
cd server && cp .env.example .env && npm install
npx prisma db push && npm run seed     # creates dev.db with synthetic demo data
npm run qr                             # writes docs/qr/<table>.png and prints each table's link
npm start                              # API on http://localhost:4000
cd ../client && npm install && npm run dev   # web app on http://localhost:5173 (proxies /api)
```
Open a printed link (`http://localhost:5173/t/<code>`) or scan a PNG from `docs/qr/`. Staff screen: `http://localhost:5173/staff`.

Demo accounts (synthetic, local only; password is `DEMO_PASSWORD` in `server/src/seedData.ts`): members `alice@demo.test`, `bob@demo.test`; staff `slow@demo.test` (Slow Express), `cafe@demo.test` (Demo Cafe). Guests need no account.

## Printable table QR sheet
Run `cd server && npm run qr`, then open `docs/qr/index.html` and print on A4. Each active table gets a card with its shop, table label and embedded QR image. Inactive tables are excluded. The default links use localhost (same-computer demo only). For phones, set `PUBLIC_URL` to the reachable web app address before generating, for example `PUBLIC_URL=http://192.168.1.10:5173 npm run qr`; replace that example with your actual address. Regenerate after seeding a fresh database or changing the address. The checked-in HTML is a demo output, not a deployment configuration.

## Tests and build
```bash
cd server && npm test        # 30 tests: API/DB integration + unit (npx tsc --noEmit also passes)
cd client && npm test        # 3 UI component tests (cup customizer)
cd client && npm run build   # type-check + production build
```

## Demo sequence (reproduces the Part F screenshots)
1. Open a Slow Express table link; tap *Peach Oolong*; drag *Cream Cheese* (and others) onto the cup; the cup picture changes; a 4th topping is refused.
2. Add to cart, enter a name to be called, place the order; the detail page shows the server-computed total.
3. Open `/staff`, sign in as `slow@demo.test`, press *Accept*; status becomes ACCEPTED.

## Documents
`docs/srs.md`, `docs/features.md`, `docs/traceability.md`, `docs/system-sds.md`, `docs/sprints/plan.md`, `docs/sprints/sprint-1/contracts.md` (AC + STS + DoD). TDD evidence in `evidence/` (red before implementation, green after). Screenshots in `evidence/shots/`.

## Configuration
`server/.env.example` lists `DATABASE_URL`, `JWT_SECRET`, `PORT`, `CORS_ORIGIN`. Never commit real secrets. Docker, CI/CD and GCP/PostgreSQL arrive in Lab 5.

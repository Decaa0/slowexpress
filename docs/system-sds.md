# System-Level SDS

## 1. Architecture and stack
Modular monolith: React + Vite + TypeScript SPA → REST/JSON API (Express, TypeScript) → Prisma → SQLite (dev/test; PostgreSQL for Lab 5). The browser talks to `/api/*` (Vite proxy in dev). Business rules live in the API service layer (`services/`, `domain/`); the UI only displays and gathers input, so hiding a button is never the authorization.

```
 Phone/Browser (React SPA) --HTTPS JSON--> Express API --Prisma--> SQLite/PostgreSQL
   /t/<tableCode> route         routes → middleware(auth,role) → services → db
```

## 2. Data model
```
Shop 1──* Table        (Table.code unique, active flag)
Shop 1──* MenuItem
Shop 1──* User         (operators only; members have null shopId)
User 1──* Session            (jti, expiresAt, revokedAt)
Order.customerId → User (member, nullable) | Order.guestSessionId → GuestSession (nullable); exactly one is set
Table 1──* GuestSession   Table 1──* Order   Shop 1──* Order
Order 1──* OrderItem         (menuItemId, itemName, unitPriceCents, quantity, lineTotalCents)
```
| Entity | Key fields and constraints |
|---|---|
| Shop | id, name (unique) |
| Table | id, shopId, label, code (unique, random 12+ chars), active |
| User | id, email (unique), fullName, passwordHash (bcrypt), role MEMBER/OPERATOR, shopId?, points (Sprint 2) |
| Session | id, userId, jti (unique), expiresAt, revokedAt? |
| MenuItem | id, shopId, name, priceCents ≥ 0, available |
| GuestSession | id, tableId, jti (unique), expiresAt, revokedAt? |
| Order | id, customerId?, guestSessionId?, shopId, tableId, note?, status PLACED/ACCEPTED, paymentStatus PENDING, totalCents, createdAt, acceptedAt?, acceptedById? |
| OrderItem | id, orderId, menuItemId, itemName, unitPriceCents, quantity 1..10, lineTotalCents |

Setup: `prisma db push` (SQLite). Seed is idempotent (upserts): 2 shops (a drink shop and a second shop), 3 tables each, 2 members, 2 operators, 5+ drink menu items including one unavailable.

## 3. UI conventions
Screens: Sign in → (QR route `/t/<code>` shows shop + table, then Menu) → Cart/Place order → Order detail; My orders; Operator: Incoming orders with Accept. Shared behaviour: loading text, empty-state text, inline `role="alert"` errors showing the API message, disabled place button until the cart has items, estimated total labelled "estimated; server computes final".

## 4. API conventions
JSON only; `Authorization: Bearer <token>`. Errors: `{error:{code,message}}` with codes VALIDATION_ERROR, UNAUTHENTICATED, INVALID_CREDENTIALS, FORBIDDEN, NOT_FOUND, INVALID_TRANSITION, ITEM_UNAVAILABLE, WRONG_RESTAURANT. Status mapping: 400 validation, 401 auth, 403 role, 404 missing or not yours, 409 invalid transition. No stack traces or SQL in responses.

## 5. Role and permission matrix
| Operation | Anonymous | Guest (table session) | Member | Operator |
|---|---|---|---|---|
| Login (member/operator) | yes | yes | yes | yes |
| Start guest session by table code | yes | yes | yes | yes |
| Me / Logout | no | yes | yes | yes |
| Resolve table code | yes (public: shop + table label only) | yes | yes | yes |
| View menu of a table's shop | no | own table's shop | any shop via table code | own shop |
| Place order | no | for own session table | yes | 403 |
| List orders | no | this session only | own only | own shop only |
| Order detail | no | this session only (else 404) | own only (else 404) | own shop only (else 404) |
| Accept order | no | 403 | 403 | own shop, PLACED only |

## 6. Authentication
Members and operators log in with email + password (bcrypt, cost 10). A guest calls `POST /api/guest-sessions {tableCode}`; the server creates a GuestSession row bound to that table and returns a JWT with `role:"GUEST"`-less claims (`sub` = guest session id, `typ`="guest", `jti`), expiry 3 hours; the guest has no password and no role escalation path. Login creates a Session row and returns a JWT (HS256) carrying `sub` and `jti`, expiry 8 hours. Every protected request verifies the signature, then loads the Session by `jti` and rejects if missing, expired or revoked; role and shop come from the DB user (or the table bound to the guest session), never from the token body or the client. Logout sets `revokedAt`. `GET /api/auth/me` returns the current user.

## 7. Configuration and deployment plan
Env vars: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `CORS_ORIGIN` (documented in `.env.example`; real values never committed). Lab 5 plan: multi-stage non-root Dockerfile, docker-compose with PostgreSQL for local parity, GitHub Actions CI (build + tests as required check on `main`), deployment to Cloud Run with Cloud SQL (PostgreSQL) and secrets in Secret Manager; SQLite is replaced because container disks are not durable.

# Sprint 1 Engineering Contracts — ScanDine / Slow Express (v1.1; v1.0 was written before implementation)

Product: QR table ordering for shops; first context is the drink shop **Slow Express**. Roles: Guest (table-bound session), Member and Operator (email + password). All rules are enforced by the backend; the UI only mirrors them.

## 1. Feature contracts

### F-01 Authentication and session (FR-01, FR-02, NFR-01, NFR-02, NFR-04)
`POST /api/auth/login {email,password}` → 200 `{token,user:{id,fullName,role,shopId}}`; wrong email/password → 401 `INVALID_CREDENTIALS` (same message); missing fields → 400. `GET /api/auth/me` → 200 user. `POST /api/auth/logout` → 204 and the session is revoked. Missing, malformed, expired or revoked token → 401 `UNAUTHENTICATED`. Passwords are bcrypt hashed. Data: User, Session. UI: sign-in form with inline error; logout button.

### F-02 Table QR and guest session (FR-03, FR-16, BR-11, BR-12)
`GET /api/tables/:code` (public) → 200 `{shop:{id,name},table:{id,label}}`; unknown/inactive → 404 `NOT_FOUND`. `POST /api/guest-sessions {tableCode}` → 201 `{token,table,shop}`; the token is bound to that table, expires in 3 hours and carries no role other than guest. The QR encodes `/t/<code>`; the web app opens that route and starts the guest session. Data: Table (unique random code, active), GuestSession. UI: `/t/<code>` shows the shop name and table label, then the menu.

### F-03 Browse table menu (FR-04, BR-04, BR-05)
`GET /api/menu` (guest session, or member/operator with `?tableCode=`) → 200 `{shop,categories:[{name,items:[{id,name,priceCents,imageKey}]}],toppings:[{id,name,priceCents,imageKey}]}` with available entries of that shop only. UI: drinks grouped by category with pictures, the cup customizer (drag a topping onto the cup, tap fallback, max 3, cup picture changes with the toppings), empty-state text when nothing is available. Data: MenuItem(category,imageKey), Topping.

### F-04 Place order (FR-05, FR-19, BR-01..BR-06, BR-10, BR-14..BR-17, NFR-03)
`POST /api/orders {callName?,tableCode? (members only),items:[{menuItemId,quantity,toppingIds:[],note?}]}` (price/total fields ignored). Guest or member only. Validation order: auth → role → body shape → 1..10 lines, no duplicate drink → quantity integer 1..10 → callName ≤ 20 → note ≤ 100, ≤ 3 distinct toppingIds → items and toppings exist and are available → all belong to the table's shop. Success → 201 `{id,status:"PLACED",paymentStatus:"PENDING",totalCents,callName,table,shop,createdAt,items:[{menuItemId,itemName,unitPriceCents,quantity,note,toppings:[{toppingId,toppingName,priceCents}],lineTotalCents}]}`. Order, lines and topping lines are saved in one transaction. Errors: 400 `VALIDATION_ERROR`/`ITEM_UNAVAILABLE`/`WRONG_SHOP`, 401, 403. UI: cart, call-name field, estimated total labelled "server computes the final price", place button.

### F-05 My orders and detail (FR-06, BR-07)
`GET /api/orders` → guest: orders of this session; member: all own orders, newest first. `GET /api/orders/:id` → order detail; anyone else's → 404 `NOT_FOUND`. UI: My orders list with empty state; order detail.

### F-06 Incoming orders and accept (FR-07, FR-08, BR-08, BR-09, BR-10)
`GET /api/orders` (operator) → own shop's orders newest first; `GET /api/orders/:id` other shop → 404. `POST /api/orders/:id/accept` → operator only, own shop (else 404), status must be PLACED (else 409 `INVALID_TRANSITION`); sets ACCEPTED, acceptedAt, acceptedById; guest/member → 403. UI: operator list showing table, call name, lines and toppings with an Accept button on PLACED rows.

## 2. Acceptance criteria
| ID | Acceptance criterion | Requirements | Feature |
|---|---|---|---|
| AC-01 | Login with valid member or operator credentials returns 200 with a token and user {id,fullName,role,shopId}; the response never contains passwordHash | FR-01 | F-01 |
| AC-02 | Wrong password and unknown email both return 401 INVALID_CREDENTIALS with the same message; missing email or password returns 400 VALIDATION_ERROR | FR-01, NFR-04 | F-01 |
| AC-03 | Every protected endpoint called with no token, a malformed token or a bad signature returns 401 UNAUTHENTICATED and no private data | NFR-01 | F-01 |
| AC-04 | GET /api/auth/me returns the current user; after POST /api/auth/logout (204) the same token returns 401 | FR-02 | F-01 |
| AC-05 | Stored passwords are bcrypt hashes: the stored value differs from the plain password and bcrypt.compare succeeds | NFR-02 | F-01 |
| AC-06 | GET /api/tables/:code for an active table returns {shop:{id,name},table:{id,label}}; unknown or inactive code returns 404 NOT_FOUND | FR-03, BR-11 | F-02 |
| AC-07 | POST /api/guest-sessions {tableCode} for an active table returns 201 {token,table,shop}; unknown or inactive code returns 404; missing body returns 400 | FR-16, BR-11 | F-02 |
| AC-08 | A guest token cannot use operator operations (accept returns 403) and an expired or logged-out guest token returns 401 | BR-12, BR-10 | F-02 |
| AC-09 | GET /api/menu returns the table's shop only: available drinks grouped by category and available toppings; sold-out items and other shops' items are absent | FR-04, BR-04, BR-05 | F-03 |
| AC-10 | A guest places a valid order: 201, status PLACED, paymentStatus PENDING, bound to the guest's table; GET /api/orders/:id then returns the same persisted order with its lines and toppings | FR-05, NFR-03 | F-04 |
| AC-11 | Order total = Σ (drink price + Σ topping prices) × quantity from database prices; client-sent price, total or lineTotal fields are ignored | BR-01, BR-15 | F-04 |
| AC-12 | Drink name, topping names and prices are copied into the order; changing the menu price afterwards does not change the stored order | BR-06, BR-15 | F-04 |
| AC-13 | Quantity 0, 11, 1.5 and "2" (string) are rejected with 400 VALIDATION_ERROR; quantity 1 and 10 are accepted | BR-02 | F-04 |
| AC-14 | An order with 0 lines, 11 lines or the same drink twice is rejected with 400 VALIDATION_ERROR | BR-03 | F-04 |
| AC-15 | An unavailable drink or an unavailable topping is rejected with 400 ITEM_UNAVAILABLE and nothing is stored | BR-04, BR-14 | F-04 |
| AC-16 | A drink or topping that belongs to another shop is rejected with 400 WRONG_SHOP | BR-05, BR-14 | F-04 |
| AC-17 | More than 3 toppings, a repeated topping on one line, or a note longer than 100 characters is rejected with 400 VALIDATION_ERROR; exactly 3 toppings and a 100-character note are accepted | BR-14, BR-16 | F-04 |
| AC-18 | If any line is invalid, no order, line or topping rows are stored (atomic save) | NFR-03 | F-04 |
| AC-19 | An operator placing an order returns 403 FORBIDDEN; an anonymous request returns 401 | BR-10, NFR-01 | F-04 |
| AC-20 | An optional callName up to 20 characters is stored and returned on the order; 21 characters returns 400; empty or omitted is allowed | FR-19, BR-17 | F-04 |
| AC-21 | A member's order is attached to the member account; GET /api/orders lists all of that member's orders, newest first, across sessions | FR-06 | F-05 |
| AC-22 | A guest lists and opens only orders placed in the guest's own session | FR-06, BR-07 | F-05 |
| AC-23 | Opening another guest's or another member's order returns 404 NOT_FOUND with no order data | BR-07 | F-05 |
| AC-24 | An operator lists only orders of their own shop (newest first) with table label, callName, lines and toppings; orders of other shops are absent | FR-07, BR-08 | F-06 |
| AC-25 | An operator accepts a PLACED order of their own shop: 200, status ACCEPTED, acceptedAt and acceptedById set and persisted | FR-08 | F-06 |
| AC-26 | Accepting an order that is not PLACED returns 409 INVALID_TRANSITION and changes nothing | BR-09 | F-06 |
| AC-27 | A guest or member calling accept returns 403 FORBIDDEN and the order stays PLACED | BR-10 | F-06 |
| AC-28 | An operator of another shop opening or accepting the order gets 404 NOT_FOUND and the order is unchanged | BR-08 | F-06 |
| AC-29 | UI journey: guest opens /t/<code>, drags Cream Cheese onto the cup, the cup picture changes, adds to cart, places the order and sees the order detail with the server total; operator logs in and accepts it | FR-05, FR-08, FR-16 | F-04, F-06 |
| AC-30 | UI customizer: dragging a topping onto the cup adds it and updates the cup picture and estimated price; a 4th topping is refused with a message; tapping an added topping removes it | FR-04, BR-14 | F-03, F-04 |

## 3. Software Test Specification (STS)
| Test | AC | Level | Precondition / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-01 | AC-01 | API | Seeded member and operator accounts | Exercise the behaviour in the AC | 200, token present, no passwordHash |
| TEST-02 | AC-02 | API | Seeded account; wrong password; unknown email; empty body | Exercise the behaviour in the AC | 401 same message for both; 400 for missing fields |
| TEST-03 | AC-03 | API | No Authorization header; `Bearer abc`; token signed with another secret | Exercise the behaviour in the AC | 401 UNAUTHENTICATED each time, body has no order/user data |
| TEST-04 | AC-04 | API | Logged-in member token | Exercise the behaviour in the AC | me = 200 user; logout 204; me again = 401 |
| TEST-05 | AC-05 | Unit/DB | Seed run | Exercise the behaviour in the AC | Stored hash != plain; compare true |
| TEST-06 | AC-06 | API | Active table code; inactive table code; random code | Exercise the behaviour in the AC | 200 shop+table; 404 for unknown/inactive |
| TEST-07 | AC-07 | API | Active table code; random code; empty body | Exercise the behaviour in the AC | 201 with token; 404; 400 |
| TEST-08 | AC-08 | API | Guest token; operator-only accept call; revoked/expired token | Exercise the behaviour in the AC | 403 on accept; 401 on dead token |
| TEST-09 | AC-09 | API | Seed: shop A has 1 sold-out drink and 1 unavailable topping; shop B has its own items | Exercise the behaviour in the AC | Only shop A available drinks (grouped) and available toppings |
| TEST-10 | AC-10 | API/DB | Guest session; order of 2 lines with toppings | Exercise the behaviour in the AC | 201 PLACED/PENDING; GET returns identical lines and toppings |
| TEST-11 | AC-11 | API + Unit | Request body includes fake priceCents/totalCents; known DB prices | Exercise the behaviour in the AC | totalCents equals server calc, not client value |
| TEST-12 | AC-12 | API/DB | Place order, then update MenuItem and Topping prices in DB | Exercise the behaviour in the AC | Stored names/prices unchanged after price edit |
| TEST-13 | AC-13 | API + Unit | quantity 0, 11, 1.5, "2", 1, 10 | Exercise the behaviour in the AC | 400 for 0/11/1.5/"2"; 201 for 1 and 10 |
| TEST-14 | AC-14 | API + Unit | [] ; 11 lines ; same drink twice | Exercise the behaviour in the AC | 400 each |
| TEST-15 | AC-15 | API | Sold-out drink; unavailable topping | Exercise the behaviour in the AC | 400 ITEM_UNAVAILABLE; no rows |
| TEST-16 | AC-16 | API | Drink id from shop B; topping id from shop B | Exercise the behaviour in the AC | 400 WRONG_SHOP |
| TEST-17 | AC-17 | API + Unit | 4 toppings; same topping twice; 3 toppings; note of 101 and 100 chars | Exercise the behaviour in the AC | 400 for 4/duplicate/101; 201 for 3/100 |
| TEST-18 | AC-18 | DB | 2-line order where line 2 is invalid; count rows before/after | Exercise the behaviour in the AC | Row counts unchanged |
| TEST-19 | AC-19 | API | Operator token; no token | Exercise the behaviour in the AC | 403 / 401 |
| TEST-20 | AC-20 | API | callName of 20 chars, 21 chars, omitted, empty | Exercise the behaviour in the AC | Stored 20-char name; 400 at 21; ok when omitted |
| TEST-21 | AC-21 | API | Member places orders in two sessions | Exercise the behaviour in the AC | Both orders listed newest first, tied to member |
| TEST-22 | AC-22 | API | Guest A and guest B each place an order | Exercise the behaviour in the AC | Each guest sees only own order |
| TEST-23 | AC-23 | API | Guest B / member B requests guest A's order id | Exercise the behaviour in the AC | 404 NOT_FOUND, no data |
| TEST-24 | AC-24 | API | Orders exist in shops A and B; operator of A | Exercise the behaviour in the AC | Only shop A orders with callName/table/toppings |
| TEST-25 | AC-25 | API/DB | PLACED order in operator's shop | Exercise the behaviour in the AC | 200 ACCEPTED; DB has acceptedAt/acceptedById |
| TEST-26 | AC-26 | API | Order already ACCEPTED | Exercise the behaviour in the AC | 409 INVALID_TRANSITION; status unchanged |
| TEST-27 | AC-27 | API | Guest token and member token on a PLACED order | Exercise the behaviour in the AC | 403; still PLACED |
| TEST-28 | AC-28 | API | Operator of shop B on shop A's order | Exercise the behaviour in the AC | 404; order unchanged |
| TEST-29 | AC-29 | UI/E2E | Running API + UI, seeded data, headless browser | Exercise the behaviour in the AC | Each step succeeds; detail total matches server; status shows ACCEPTED for operator |
| TEST-30 | AC-30 | UI component | Rendered customizer component with 4 available toppings | Exercise the behaviour in the AC | Topping added + picture class changes; 4th refused; remove works |
| TEST-U01 | AC-11 | Unit | pure function inputs | call function | lineTotal(drink 5500, toppings [1500,1000], qty 2) = 16000 |
| TEST-U02 | AC-13, AC-14, AC-17 | Unit | pure function inputs | call function | validateOrderBody accepts boundary values (qty 1/10, 10 lines, 3 toppings, 100-char note) and rejects just-outside values |

## 4. Product Definition of Done
- Every Sprint 1 AC has an implemented behaviour and a planned test; each test exists, ran, and passes (no skipped or weakened tests).
- Red evidence: the behaviour tests failed on the missing behaviour before implementation (`evidence/tdd-red-*.txt`); green evidence after (`evidence/tdd-green-*.txt`) with command, counts and commit.
- `npm test` (server and client) and `npm run build` pass on the release commit; counts and commit recorded.
- The release is on `main` through reviewed integration; README setup works from a clean clone; no real secrets committed.
- Incomplete work, skipped tests and the solo-review limitation are disclosed. Completion is shown by evidence, not by an AI statement.

## 5. Seed data (synthetic)
Shops: **Slow Express** and **Demo Cafe**. Tables: SE-1..SE-3 and DC-1..DC-2 with random codes. Slow Express drinks (category): Thai Milk Tea 4500, Taiwan Milk Tea 5000 (Milk Tea); Matcha Latte 6000 (Milk Tea); Peach Oolong 5500, Lychee Green Tea 5500 (Fruit Tea); Americano 4500 (Coffee); Mango Sago 6500 (sold out). Toppings: Cream Cheese 1500, Boba Pearls 1000, Strawberry 1500, Lychee Jelly 1000, Aloe (unavailable). Members: alice, bob; operators: one per shop. Prices are integer satang.

## 6. Revision history
| Version | Change | Reason |
|---|---|---|
| v1.0 | Initial Sprint 1 contracts F-01..F-06, AC-01..AC-30, STS | Written before any implementation (docs-first commit) |
| v1.1 | AC-29 is now verified by an automated Playwright test (TEST-29, `client/e2e/journey.spec.ts`) instead of only manual screenshots, which stay in `evidence/shots/` as supporting evidence. Added TEST-31 (invalid QR screen, issue 1.3) and TEST-32 (printable QR sheet, issue 1.4); issues 1.1 and 1.2 added UI refresh component tests. Test counts are recorded in `release.md` | Contract matched to what was actually built and tested in Sprint 1 |

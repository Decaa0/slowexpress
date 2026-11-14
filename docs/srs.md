# SRS — ScanDine: QR table ordering for shops (CPE 334 Project, Theme 4: E-Commerce / Ordering)

## 1. Stakeholder problem and context
Small shops lose time because customers queue or wait for staff just to order, and staff re-type paper orders. Each table carries a printed QR code. The customer scans it with their phone, which opens the menu of *that* shop already bound to *that* table, and orders without installing anything or signing in (guest). Customers who sign in become members and earn points and promotions. Staff see incoming orders for their shop and accept them. The product is shop-agnostic (name, tables and menu are data), and the first configured context is a **drink shop**. Real payment is excluded; payment is a simulated status.

## 2. Actors
| Actor | Responsibility |
|---|---|
| Guest | Scans a table QR, browses the menu, places orders for that table, views orders placed in the same guest session. Gets no points |
| Member | A signed-in customer: everything a guest can do, plus own order history across visits, points and promotions (Sprint 2) |
| Operator | Works for exactly one shop; sees that shop's orders and accepts them; (later) moves orders through preparing/served, edits menu and tables |
| System | Resolves QR codes, computes prices, enforces rules, persists data |

## 3. Scope and exclusions
In scope: QR table resolution, menu, multi-line orders, order lifecycle, simulated payment status, per-shop operator scope, sales summaries.
Excluded: real payment, delivery, self-registration, password recovery, email/SMS, multiple roles per account, split bills, printing QR images in production.

## 4. Functional requirements
| ID | Requirement | Sprint |
|---|---|---|
| FR-01 | A member or operator logs in with email + password and receives a session token; invalid credentials are rejected | 1 |
| FR-16 | A guest scanning a valid table code receives a temporary guest session bound to that table; no password needed | 1 |
| FR-02 | A signed-in user can retrieve their own identity and can log out; a logged-out token is rejected | 1 |
| FR-03 | A table QR code (opaque table code) resolves to its table and shop; unknown/inactive codes are rejected | 1 |
| FR-04 | A guest or member views the available menu (drinks grouped by category, with pictures) and the available toppings of the shop that owns the scanned table | 1 |
| FR-05 | A guest or member places one order with 1..10 line items for a scanned table; each line is a drink with a quantity, 0..3 toppings and an optional note | 1 |
| FR-06 | A guest (this session) or member (all own orders) lists their own orders and opens one order's detail | 1 |
| FR-07 | An operator lists the orders of their own shop | 1 |
| FR-08 | An operator accepts a PLACED order of their own shop | 1 |
| FR-09 | An operator moves an accepted order to PREPARING then SERVED | 2 |
| FR-10 | Simulated payment: operator marks an order PAID (or the member/guest "pays" in-app) | 2 |
| FR-11 | A guest or member cancels their own order while it is still PLACED | 2 |
| FR-12 | An operator creates/edits menu items and toggles availability | 2 |
| FR-13 | An operator manages tables and regenerates a table's QR code | 3 |
| FR-14 | An operator views a daily sales summary (orders, revenue, top items) | 3 |
| FR-15 | A guest or member adds items to their existing open order for the same table | 3 |
| FR-17 | A member earns points when an order is served (1 point per 10 THB) and sees their balance | 2 |
| FR-18 | An operator defines a simple promotion (percentage off for members) applied by the server to member orders | 2 |

## 5. Business rules
| ID | Rule |
|---|---|
| BR-01 | Order total is computed on the server from database prices; client-sent prices/totals are ignored |
| BR-02 | Line quantity is an integer 1..10 |
| BR-03 | An order has 1..10 lines and no menu item appears twice |
| BR-04 | Only available menu items can be ordered |
| BR-05 | Every ordered item must belong to the shop that owns the scanned table |
| BR-06 | Item name and unit price are copied into the order line when placed (later price changes do not alter old orders) |
| BR-07 | A guest can read only orders of their own guest session, a member only their own orders; anyone else's order behaves as not found (404) |
| BR-08 | An operator can see and act only on orders of their own shop (other shop = 404) |
| BR-09 | Only a PLACED order can be accepted; any other status gives 409 INVALID_TRANSITION |
| BR-10 | Only guests/members can place orders; only operators can accept (wrong role = 403) |
| BR-14 | A line has at most 3 distinct toppings; each topping must be available and belong to the same shop as the drink |
| BR-15 | Line total = (drink price + sum of topping prices) × quantity, computed on the server; topping name and price are copied into the line when placed |
| BR-16 | A line note is at most 100 characters |
| BR-12 | A guest session is bound to one table and expires in 3 hours; it cannot be used for another table or for operator operations |
| BR-13 | Points and promotions apply only to members, never guests (Sprint 2) |
| BR-11 | A table code must exist and be active to be used for an order |

## 6. Non-functional requirements
| ID | Requirement | Target and verification | Sprint |
|---|---|---|---|
| NFR-01 | Unauthenticated access to any protected endpoint returns 401 with no private data | API test on every protected route | 1 |
| NFR-02 | Passwords stored only as bcrypt hashes | DB test: stored value != plain and verifies via bcrypt | 1 |
| NFR-03 | Order header and lines are saved atomically | DB integration test: failing line leaves no order row | 1 |
| NFR-04 | Error responses use one shape `{error:{code,message}}` and never leak stack traces | API tests on 400/401/403/404/409 | 1 |
| NFR-05 | Menu and order list respond in under 500 ms on seeded local data | Timed API check, recorded in Part F | 2 |
| NFR-06 | The UI is usable on a 360 px wide phone | Manual check + screenshot | 2 |
| NFR-07 | App runs from Docker with durable database | Lab 5 | 3 |

## 7. Assumptions and decisions
| ID | Decision |
|---|---|
| D-01 | Guest ordering is allowed for convenience. To still meet the course rule of real authentication and server-side roles, the guest is a real server-issued, expiring, table-bound session token (not a client-chosen user or role), members and operators use email + password, and all rules are enforced on the backend |
| D-02 | A QR code encodes the URL `/t/<tableCode>`; tableCode is an unguessable random string, not a sequential number |
| D-03 | One shop per operator; seed data has two shops (a drink shop and a second shop) to prove the shop-scope rule and that the product is shop-agnostic. First context: drink shop |
| D-04 | Money is stored as integer satang (THB cents) |
| D-05 | Stack: React + Vite + TypeScript, Express + Prisma, SQLite locally (PostgreSQL planned for Lab 5), JWT with a Session table for logout |
| D-06 | Solo project: teammate review cannot be satisfied honestly; disclosed in Part F |

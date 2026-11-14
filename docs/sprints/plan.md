# Three-sprint plan

| Sprint | Goal | Features | Depends on | Completion outcome | Checkpoint |
|---|---|---|---|---|---|
| 1 | Small working slice: scan table as guest, order, member/operator sign in, operator accepts | F-01..F-06 | none | Guest scans a table code, orders, sees the order (members see all their own orders); operator of the same shop accepts; role and ownership rules tested | Deliverable 1 |
| 2 | Core expansion: finish the order life cycle and run the menu | F-07, F-08, F-09, F-10, F-14, F-16, F-17 | Sprint 1 release | Order goes PLACED → ACCEPTED → PREPARING → SERVED, simulated payment, cancel, menu editing, member points and promotions, phone layout | Deliverable 2 (29 Nov) |
| 3 | Completion and hardening | F-11, F-12, F-13, F-15 | Sprint 2 | Table/QR admin, sales summary, add-to-order, Docker + durable DB, regression and defect fixes | Progress 29 Nov; final 13 Dec |

**Why Sprint 1 is this small:** it must prove the whole vertical path (UI → API → DB), real authentication, two roles, one business rule set and one state transition. Anything that does not add to that proof (payment, cancel, menu editing) waits for Sprint 2.

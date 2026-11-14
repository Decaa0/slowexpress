# Sprint 1 Release Note: Slow Express (QR table ordering)

## Tested commit
`71cb9a72e580280c2264fc324207de520c4467ab` (tip of `sprint-1-staging` after PR #14 was merged by JEWKEW). Later commits on this branch change documentation only (this note, contracts revision history, README).

## Commands and results (run on that commit, 14 Nov 2026)
| Command | Result |
|---|---|
| `cd server && npm test` | 3 files, 34 tests passed (28 API/DB AC tests, 2 order-rule unit tests, 4 QR sheet tests) |
| `cd server && npx tsc --noEmit` | clean |
| `cd client && npm test` | 4 files, 10 tests passed |
| `cd client && npm run build` | type-check and production build succeeded |
| `cd client && npm run test:e2e` | 1 test passed (about 15 s), output in `evidence/e2e-ac29-sprint-1.5.txt` |

No test is skipped, disabled or marked todo (searched `server/tests`, `client/src`, `client/e2e` for skip/todo/fixme).

## Acceptance criteria to test results
| AC | Test | File / name | Type | Result |
|---|---|---|---|---|
| AC-01 | TEST-01 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-02 | TEST-02 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-03 | TEST-03 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-04 | TEST-04 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-05 | TEST-05 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-06 | TEST-06 | `server/tests/api/sprint1.test.ts`; client `client/src/InvalidQr.test.tsx` TEST-31 | Automated (API/DB) | Pass |
| AC-07 | TEST-07 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-08 | TEST-08 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-09 | TEST-09 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-10 | TEST-10 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-11 | TEST-11 | `server/tests/api/sprint1.test.ts`; unit `server/tests/unit/orderRules.test.ts` TEST-U01 | Automated (API/DB) | Pass |
| AC-12 | TEST-12 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-13 | TEST-13 | `server/tests/api/sprint1.test.ts`; unit TEST-U02 | Automated (API/DB) | Pass |
| AC-14 | TEST-14 | `server/tests/api/sprint1.test.ts`; unit TEST-U02 | Automated (API/DB) | Pass |
| AC-15 | TEST-15 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-16 | TEST-16 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-17 | TEST-17 | `server/tests/api/sprint1.test.ts`; unit TEST-U02 | Automated (API/DB) | Pass |
| AC-18 | TEST-18 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-19 | TEST-19 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-20 | TEST-20 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-21 | TEST-21 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-22 | TEST-22 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-23 | TEST-23 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-24 | TEST-24 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-25 | TEST-25 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-26 | TEST-26 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-27 | TEST-27 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-28 | TEST-28 | `server/tests/api/sprint1.test.ts` | Automated (API/DB) | Pass |
| AC-29 | TEST-29 | `client/e2e/journey.spec.ts` (Playwright, headless Chromium, isolated DB); earlier manual screenshots in `evidence/shots/` | Automated (E2E) + manual screenshots | Pass |
| AC-30 | TEST-30 | `client/src/Customizer.test.tsx` (3 tests: drag adds layer and estimate, 4th refused, tap removes) | Automated (UI component) | Pass |

Automated and manual evidence are separate: every row above is an automated test that ran and passed. The six screenshots in `evidence/shots/` are the earlier manual run of the AC-29 journey and are kept as supporting evidence, not as the test.

## Sprint tasks and their pull requests
| Issue | Task | Pull request | Merged by |
|---|---|---|---|
| #1 | 1.1 Staff incoming-orders list auto-refreshes | #8 | JEWKEW |
| #5 | 1.2 Customer order page shows live status | #10 | JEWKEW |
| #6 | 1.3 Friendly screen for an invalid or inactive table QR | #11 | JEWKEW |
| #7 | 1.4 Printable QR sheet for the tables | #13 | JEWKEW |
| #4 | 1.5 Playwright E2E for the guest-order and staff-accept journey | #14 | JEWKEW |
| #2 | 1.6 Release evidence and contract v1.1 | this PR | pending |

Each PR was opened one at a time into `sprint-1-staging`, reviewed by JEWKEW, and merged by him. The author did not merge.

## Known limitations
- Reviews were done by one peer (JEWKEW). His review comments state he ran the tests locally; those runs were not independently re-run for this note.
- The E2E test reads the seeded table code through the server Prisma client, so run `npm install` in both `server/` and `client/` first.
- The E2E uses a temporary database and ports 4005 and 5175; it never touches the development database.
- Tests for issues 1.1 to 1.3 (staff and customer refresh, invalid QR) are UI component tests without STS IDs, except invalid QR (TEST-31); the QR sheet is TEST-32. They are listed in the contract revision history.
- Member points and promotions, payment and the final release to `main` are outside Sprint 1. The `sprint-1-staging` to `main` pull request and tag `v1.0-sprint1` are still to be done and reviewed.

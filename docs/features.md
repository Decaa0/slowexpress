# Feature inventory

| ID | Feature | Requirements | Depends on | Sprint |
|---|---|---|---|---|
| F-01 | Authentication and session (member/operator login, logout, me) | FR-01, FR-02, NFR-01, NFR-02, NFR-04 | — | 1 |
| F-02 | Resolve table QR and start guest session | FR-03, FR-16, BR-11, BR-12 | F-01 | 1 |
| F-03 | Browse table menu (drinks, categories, pictures, toppings) | FR-04, BR-04, BR-05 | F-01, F-02 | 1 |
| F-04 | Place order with toppings and notes (drag-a-topping-onto-the-cup customizer in the UI) | FR-05, BR-01..BR-06, BR-14..BR-16, BR-10, BR-11, NFR-03 | F-02, F-03 | 1 |
| F-05 | My orders and detail | FR-06, BR-07 | F-04 | 1 |
| F-06 | Incoming orders and accept | FR-07, FR-08, BR-08, BR-09, BR-10 | F-04 | 1 |
| F-07 | Kitchen workflow (preparing, served) | FR-09 | F-06 | 2 |
| F-08 | Simulated payment | FR-10 | F-06 | 2 |
| F-09 | Cancel own order | FR-11 | F-04 | 2 |
| F-10 | Menu management | FR-12 | F-01 | 2 |
| F-11 | Table and QR management | FR-13 | F-02 | 3 |
| F-12 | Sales summary | FR-14 | F-08 | 3 |
| F-13 | Add items to open order | FR-15 | F-04 | 3 |
| F-14 | Mobile usability and performance hardening | NFR-05, NFR-06 | all | 2–3 |
| F-16 | Member points | FR-17, BR-13 | F-07, F-08 | 2 |
| F-17 | Member promotions | FR-18, BR-13 | F-16 | 2 |
| F-15 | Docker and durable database | NFR-07 | all | 3 (Lab 5) |

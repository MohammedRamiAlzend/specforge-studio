---
id: ART-0022
title: Test Cases
type: index
status: generated
project: PRJ-0004
updated: "2026-08-25"
---

# Test Cases

## Test Cases

### TC-0101 — Checkout success path

- Type: integration · Result: — · Status: `approved`

Precondition: Cart with one item; signed-in customer.

Steps:

1. Place order
2. Capture payment
3. Confirm order
Expected results:

- Order created with status pending_payment
- Inventory reserved

### TC-0102 — Payment decline path

- Type: integration · Result: — · Status: `approved`

Precondition: Cart with one item; gateway declines.

Steps:

1. Place order
2. Capture payment
Expected results:

- Order marked failed
- Cart restored

### TC-0103 — Inventory reservation

- Type: integration · Result: — · Status: `approved`

Precondition: Stock = 5; order quantity = 2.

Steps:

1. Place order
Expected results:

- Stock now 3
- No oversell

### TC-0104 — Refund issuance

- Type: integration · Result: — · Status: `approved`

Precondition: Paid order within return window.

Steps:

1. Request refund
2. Issue refund
Expected results:

- Refund recorded
- Gateway refund processed

### TC-0105 — Catalog pagination

- Type: integration · Result: — · Status: `approved`

Precondition: 100 products published.

Steps:

1. List products page 2
Expected results:

- Returns page 2 with correct page size

### TC-0106 — Analytics authorization

- Type: integration · Result: — · Status: `approved`

Precondition: Non-admin token.

Steps:

1. Request analytics
Expected results:

- 403 Forbidden
## Templates

Use 05-testing/templates/bug-report.md for defect reports.


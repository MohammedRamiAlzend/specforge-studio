---
id: ART-0012
title: Use Cases
type: index
status: generated
project: PRJ-0001
updated: "2026-08-16"
---

# Use Cases

## Use Cases

### UC-0001 — Customer checks out

- Actor: Customer · Status: `approved`

Preconditions:

- Cart contains at least one item
- Customer is signed in
Main flow:

1. Customer reviews cart
2. Customer enters shipping address
3. System calculates totals
4. Customer confirms order
5. System creates order and sends confirmation
Alternate flows:

- Payment failure: order marked failed, cart restored
Postconditions:

- Order is created with status pending_payment
- Inventory is reserved

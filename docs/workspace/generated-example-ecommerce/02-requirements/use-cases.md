---
id: ART-0012
title: Use Cases
type: index
status: generated
project: PRJ-0004
updated: "2026-08-16"
---

# Use Cases

## Use Cases

### UC-0101 — Customer completes checkout

- Actor: Customer · Status: `approved`

Preconditions:

- Cart contains at least one item
- Customer is signed in
Main flow:

1. Customer reviews cart
2. Customer enters shipping address
3. System computes totals server-side
4. System captures payment via gateway
5. System creates order and sends confirmation
Alternate flows:

- Payment declined: order marked failed, cart restored
- Stock shortfall: cart flagged, order blocked
Postconditions:

- Order is created with status pending_payment
- Inventory is reserved
- Confirmation email queued

### UC-0102 — Customer requests a refund

- Actor: Customer · Status: `approved`

Preconditions:

- Order exists and is paid
- Order is within the return window
Main flow:

1. Customer opens the order
2. Customer requests a refund
3. System validates eligibility
4. System issues the refund
Alternate flows:

- Refund rejected: return window closed
Postconditions:

- Refund is recorded against the order
- Payment gateway processes the refund

### UC-0103 — Administrator restocks inventory

- Actor: Administrator · Status: `approved`

Preconditions:

- Inventory item is below its low-stock threshold
Main flow:

1. Admin opens inventory dashboard
2. Admin selects a low-stock item
3. Admin places a restock order
4. System updates stock on receipt
Alternate flows:

- Restock delayed: alert remains open
Postconditions:

- Restock order is created
- Stock level is updated on receipt

### UC-0104 — Customer views order history

- Actor: Customer · Status: `approved`

Preconditions:

- Customer is signed in
Main flow:

1. Customer opens account orders
2. System lists past orders
3. Customer opens an order detail
Alternate flows:

- Empty state shown when no orders exist
Postconditions:

- Order list is rendered with status and totals

### UC-0105 — Administrator reviews analytics

- Actor: Administrator · Status: `approved`

Preconditions:

- Admin is signed in with the admin role
Main flow:

1. Admin opens the dashboard
2. System aggregates sales metrics
3. Admin filters by period
Alternate flows:

- No data period shows an empty state
Postconditions:

- Revenue, orders, and low-stock reports render

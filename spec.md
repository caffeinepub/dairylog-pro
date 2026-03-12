# Shree Hari Dairy

## Current State
- App has 5 tabs: Milk Records, Expenses, Staff, Animals, Buyer Payments
- "Buyer Payments" page tracks money received from buyer every 10 days using `BuyerAdvancePayment` backend type (fields: id, date, amount, reason)
- No separate "Buyer Advances" page exists
- No pending/paid status on buyer payments

## Requested Changes (Diff)

### Add
- New "Buyer Advances" tab in navigation - separate page for tracking money given to buyers as advances, uses a new `BuyerAdvance` backend type (fields: id, date, buyerName, amount, note)
- Pending / Paid status field on Buyer Payments page — stored in backend as part of `BuyerAdvancePayment` with a new `status` field (values: "pending" | "paid"), shown as color-coded badge in the table
- Summary cards on Buyer Payments page: Total Received (paid), Total Pending

### Modify
- App.tsx: add "Buyer Advances" as a 6th nav tab between Animals and Buyer Payments
- BuyerPaymentsPage: add status column (Paid = green badge, Pending = yellow badge), show pending/paid totals in summary cards
- Add/Edit dialog for Buyer Payments: add status dropdown (Paid/Pending)

### Remove
- Nothing

## Implementation Plan
1. Update backend: add `BuyerAdvance` type + CRUD methods; add `status` field to `BuyerAdvancePayment`
2. Update `backend.d.ts` with new types and methods
3. Update `useQueries.ts` with new hooks for BuyerAdvances
4. Create `BuyerAdvancesPage.tsx` for advances given to buyers
5. Update `BuyerPaymentsPage.tsx` to include status field (Paid/Pending), summary cards
6. Update `App.tsx` to add Buyer Advances tab

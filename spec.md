# ARAA TRADE LUBES

## Current State
A full-stack CRM app for ARAA TRADE LUBES with customers, vendors, products, invoices, payments, GST breakups, customer statements, WhatsApp sharing, and PDF generation. The app has a Dashboard with 6 tabs: Overview, Customers, Vendors, Products, Invoices, Export.

The DashboardOverview shows:
- 6 stat cards (Total Customers, Total Vendors, Products, Total Invoices, Total Revenue, Growth)
- Recent Activity list
- Quick Actions panel with 3 buttons (Add New Customer, Create Invoice, Add Product)

Known issues from user reports:
- Quick Action buttons may not navigate reliably to the correct tab
- Record Payment dialog may not show clear success/error feedback
- Dashboard stat cards are not clickable to navigate to their respective tabs

## Requested Changes (Diff)

### Add
- Make each dashboard stat card clickable to navigate to its respective tab:
  - "Total Customers" -> navigates to "customers" tab
  - "Total Vendors" -> navigates to "vendors" tab
  - "Products" -> navigates to "products" tab
  - "Total Invoices" -> navigates to "invoices" tab
  - "Total Revenue" -> navigates to "invoices" tab
  - "Growth" card -> no navigation (informational only)
- Visual cursor pointer on clickable stat cards

### Modify
- DashboardOverview: add `onClick` handlers to the stat cards grid that call `onNavigate` with the correct TabName
- InvoicesTab: ensure Record Payment button shows a visible success toast with the amount and invoice number after successful payment; confirm error state is clearly shown on failure
- DashboardOverview Quick Action buttons: verify they properly call `onNavigate("customers")`, `onNavigate("invoices")`, `onNavigate("products")` -- they already have onClick handlers but ensure they are not broken by any wrapper issues

### Remove
- Nothing

## Implementation Plan
1. In `DashboardOverview.tsx`, add a `navigateTo` property to each stat object (optional TabName), and wrap each stat card with an `onClick` that calls `onNavigate(stat.navigateTo)` when defined. Add `cursor-pointer` class when navigable.
2. In `InvoicesTab.tsx`, enhance the `handleRecordPayment` success toast to show invoice number and amount clearly. Ensure error toast is also clear.
3. Verify Quick Action buttons in DashboardOverview are functioning with correct onClick targets.

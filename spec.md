# ARAA TRADE LUBES

## Current State
App has a working Export tab (DataExport.tsx) that downloads CSV files for customers, vendors, products, invoices, payments. No import/restore functionality exists.

## Requested Changes (Diff)

### Add
- CSV import/restore section in the Export/Backup tab
- Parse uploaded CSV and call addCustomer/addVendor/addProduct for each row
- Show progress toast with imported/failed counts
- parseCSV, importCustomersFromCSV, importVendorsFromCSV, importProductsFromCSV helpers in exportUtils.ts

### Modify
- DataExport.tsx: add Restore section below Export section with file upload cards for Customers, Vendors, Products
- exportUtils.ts: add CSV parsing utilities

### Remove
- Nothing

## Implementation Plan
1. Add parseCSV + typed row-parsers to exportUtils.ts
2. Update DataExport.tsx with import UI and logic

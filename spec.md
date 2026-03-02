# Specification

## Summary
**Goal:** Improve GST calculation precision in both the backend and frontend by using integer (paise-level) arithmetic throughout all GST computation steps, eliminating rounding errors.

**Planned changes:**
- Update backend Motoko actor to use high-precision integer arithmetic for CGST, SGST, and IGST calculations, rounding only at the final storage step
- Update frontend `gstUtils.ts` to mirror backend logic using integer paise arithmetic, avoiding floating-point in intermediate steps
- Ensure `InvoicesTab.tsx` and `InvoiceDetails.tsx` display GST values consistent with backend-stored data

**User-visible outcome:** Invoice GST totals (CGST, SGST, IGST, taxable amount, grand total) displayed on the frontend will exactly match backend-stored values with no off-by-one paise discrepancies.

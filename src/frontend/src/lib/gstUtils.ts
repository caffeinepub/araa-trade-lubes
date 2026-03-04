/**
 * GST Utility Module
 *
 * All monetary values are in PAISE (1 INR = 100 paise) to avoid floating-point errors.
 * taxRate is stored as an integer where 1800 = 18.00%, 500 = 5.00%, etc.
 * (i.e., taxRate / 10000 gives the decimal rate, matching backend formula)
 *
 * Backend formula:
 *   halfTaxRate = taxRate / 2  (integer division)
 *   sgst = (taxableAmount * halfTaxRate) / 10000  (integer division)
 *   cgst = (taxableAmount * halfTaxRate) / 10000  (integer division)
 *   igst = (taxableAmount * taxRate) / 10000       (integer division)
 *
 * This module mirrors that logic exactly using BigInt arithmetic.
 */

import type { GstBreakup } from "../backend";

export interface GstLineItem {
  price: bigint; // unit price in paise
  quantity: bigint;
  taxRate: bigint; // e.g. 1800 for 18%
  hsnSacCode: string; // non-empty => CGST+SGST (intra-state)
}

export interface GstSummary {
  taxableAmount: bigint; // paise
  cgst: bigint; // paise
  sgst: bigint; // paise
  igst: bigint; // paise
  totalTax: bigint; // paise
  totalAmount: bigint; // paise
}

/**
 * Calculate GST breakup for a single line item.
 * Mirrors backend calculateWithCgstSgst / calculateWithIgst exactly.
 */
export function calculateLineItemGst(item: GstLineItem): GstBreakup {
  const taxableAmount = item.price * item.quantity;
  const taxRate = item.taxRate;

  if (item.hsnSacCode && item.hsnSacCode.trim() !== "") {
    // Intra-state: CGST + SGST
    // Backend: halfTaxRate = taxRate / 2 (integer division)
    const halfTaxRate = taxRate / 2n;
    const sgst = (taxableAmount * halfTaxRate) / 10000n;
    const cgst = (taxableAmount * halfTaxRate) / 10000n;
    const totalTax = sgst + cgst;
    const totalAmount = taxableAmount + totalTax;
    return {
      taxableAmount,
      sgst,
      cgst,
      igst: 0n,
      totalTax,
      totalAmount,
    };
  }
  // Inter-state: IGST
  const igst = (taxableAmount * taxRate) / 10000n;
  const totalAmount = taxableAmount + igst;
  return {
    taxableAmount,
    sgst: 0n,
    cgst: 0n,
    igst,
    totalTax: igst,
    totalAmount,
  };
}

/**
 * Calculate invoice GST summary from line items.
 * Returns aggregated totals across all line items.
 */
export function calculateInvoiceSummary(items: GstLineItem[]): GstSummary {
  let taxableAmount = 0n;
  let cgst = 0n;
  let sgst = 0n;
  let igst = 0n;

  for (const item of items) {
    const breakup = calculateLineItemGst(item);
    taxableAmount += breakup.taxableAmount;
    cgst += breakup.cgst;
    sgst += breakup.sgst;
    igst += breakup.igst;
  }

  const totalTax = cgst + sgst + igst;
  const totalAmount = taxableAmount + totalTax;

  return { taxableAmount, cgst, sgst, igst, totalTax, totalAmount };
}

/**
 * Calculate GST summary from backend-stored GstBreakup array.
 * Use this when displaying stored invoice data to ensure exact match with backend.
 */
export function calculateSummaryFromBreakups(
  breakups: GstBreakup[],
): GstSummary {
  let taxableAmount = 0n;
  let cgst = 0n;
  let sgst = 0n;
  let igst = 0n;

  for (const b of breakups) {
    taxableAmount += b.taxableAmount;
    cgst += b.cgst;
    sgst += b.sgst;
    igst += b.igst;
  }

  const totalTax = cgst + sgst + igst;
  const totalAmount = taxableAmount + totalTax;

  return { taxableAmount, cgst, sgst, igst, totalTax, totalAmount };
}

/**
 * Format paise value to INR string (e.g., 10050n => "₹100.50")
 */
export function formatPaiseToINR(paise: bigint): string {
  const rupees = Number(paise) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Convert a rupee amount (number) to paise (bigint)
 */
export function rupeesToPaise(rupees: number): bigint {
  return BigInt(Math.round(rupees * 100));
}

/**
 * Convert paise (bigint) to rupees (number)
 */
export function paiseToRupees(paise: bigint): number {
  return Number(paise) / 100;
}

/**
 * GST Utility Module
 *
 * All monetary values are in PAISE (1 INR = 100 paise) to avoid floating-point errors.
 * taxRate is stored as an integer where 1800 = 18.00%, 500 = 5.00%, etc.
 * (i.e., taxRate / 10000 gives the decimal rate, matching backend formula)
 *
 * GST-INCLUSIVE pricing model:
 *   The price entered by the user is the FINAL/inclusive price (GST already included).
 *   Back-calculate taxable amount: taxableAmount = inclusivePrice * 10000 / (10000 + taxRate)
 *   Then GST is extracted: CGST = taxableAmount * (taxRate/2) / 10000, etc.
 *   Grand total = original inclusive price entered.
 *
 * Backend formula (uses taxableAmount as base, adds GST on top):
 *   halfTaxRate = taxRate / 2
 *   sgst = (taxableAmount * halfTaxRate) / 10000
 *   cgst = (taxableAmount * halfTaxRate) / 10000
 *   igst = (taxableAmount * taxRate) / 10000
 *
 * To keep frontend+backend in sync: we back-calculate the taxable base from the
 * inclusive price, then send that base to the backend as the item price.
 */

import type { GstBreakup } from "../backend";

export interface GstLineItem {
  price: bigint; // unit price in paise (this is the INCLUSIVE price entered by user)
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
  totalAmount: bigint; // paise (equals the inclusive price entered)
}

/**
 * Back-calculate the taxable base from an inclusive price.
 * inclusiveTotal = taxableAmount + GST
 * taxableAmount = inclusiveTotal * 10000 / (10000 + taxRate)
 */
export function inclusivePriceToBase(
  inclusivePaise: bigint,
  taxRate: bigint,
): bigint {
  if (taxRate === 0n) return inclusivePaise;
  return (inclusivePaise * 10000n) / (10000n + taxRate);
}

/**
 * Calculate GST breakup for a single line item using GST-INCLUSIVE pricing.
 * The price is the inclusive total per unit; we back-calculate taxable amount.
 * Mirrors backend calculateWithCgstSgst / calculateWithIgst exactly once base is known.
 */
export function calculateLineItemGst(item: GstLineItem): GstBreakup {
  const taxRate = item.taxRate;
  // Back-calculate per-unit taxable base from inclusive price
  const unitBase = inclusivePriceToBase(item.price, taxRate);
  const taxableAmount = unitBase * item.quantity;

  if (item.hsnSacCode && item.hsnSacCode.trim() !== "") {
    // Intra-state: CGST + SGST
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
 * Calculate invoice GST summary from line items (inclusive pricing).
 * Returns aggregated totals across all line items.
 */
export function calculateInvoiceSummary(items: GstLineItem[]): GstSummary {
  let taxableAmount = 0n;
  let cgst = 0n;
  let sgst = 0n;
  let igst = 0n;
  let totalAmount = 0n;

  for (const item of items) {
    const breakup = calculateLineItemGst(item);
    taxableAmount += breakup.taxableAmount;
    cgst += breakup.cgst;
    sgst += breakup.sgst;
    igst += breakup.igst;
    totalAmount += breakup.totalAmount;
  }

  const totalTax = cgst + sgst + igst;

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

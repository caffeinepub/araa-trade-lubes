/**
 * Currency utility functions for formatting amounts in INR (Indian Rupees)
 */

/**
 * Formats a bigint or number amount as INR currency
 * @param amount - The amount in smallest currency unit (paisa, where 100 paisa = 1 rupee)
 * @returns Formatted string like '₹1,234.56'
 */
export function formatCurrency(amount: bigint | number): string {
  const numericAmount = typeof amount === 'bigint' ? Number(amount) : amount;
  const rupees = numericAmount / 100;
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Safely converts bigint to number for display purposes
 * @param value - The bigint value to convert
 * @returns Number representation
 */
export function bigintToNumber(value: bigint): number {
  return Number(value);
}

/**
 * Formats a plain number as INR without assuming it's in paisa
 * @param amount - The amount in rupees
 * @returns Formatted string like '₹1,234.56'
 */
export function formatRupees(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

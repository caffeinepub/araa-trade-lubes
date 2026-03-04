import type { Customer, Invoice, Payment, Product, Vendor } from "../backend";

export function formatDateForExport(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1000000);
  return date.toISOString();
}

export function formatCurrencyForExport(amount: bigint): number {
  return Number(amount) / 100;
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];

  // Add header row
  csvRows.push(headers.map((h) => `"${h}"`).join(","));

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      const escaped = `${value}`.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCSV(data: any[], fileName: string) {
  const csv = convertToCSV(data);
  downloadFile(csv, `${fileName}.csv`, "text/csv;charset=utf-8;");
}

export function prepareCustomersForExport(customers: Customer[]) {
  return customers.map((customer) => ({
    ID: customer.id.toString(),
    Name: customer.name,
    Phone: customer.phone,
    Email: customer.email,
    Address: customer.address,
    "GST Number": customer.gstNumber,
    "Created At": formatDateForExport(customer.createdAt),
    "Updated At": formatDateForExport(customer.updatedAt),
  }));
}

export function prepareVendorsForExport(vendors: Vendor[]) {
  return vendors.map((vendor) => ({
    ID: vendor.id.toString(),
    Name: vendor.name,
    Phone: vendor.phone,
    Email: vendor.email,
    Address: vendor.address,
    "Created At": formatDateForExport(vendor.createdAt),
    "Updated At": formatDateForExport(vendor.updatedAt),
  }));
}

export function prepareProductsForExport(products: Product[]) {
  return products.map((product) => ({
    ID: product.id.toString(),
    Name: product.name,
    Description: product.description,
    SKU: product.sku,
    "Price (INR)": formatCurrencyForExport(product.price),
    Stock: product.stock.toString(),
    "Created At": formatDateForExport(product.createdAt),
    "Updated At": formatDateForExport(product.updatedAt),
  }));
}

export function prepareInvoicesForExport(invoices: Invoice[]) {
  return invoices.map((invoice) => ({
    "Invoice ID": invoice.id.toString(),
    "Customer ID": invoice.customerId.toString(),
    "Total (INR)": formatCurrencyForExport(invoice.total),
    Status: invoice.status,
    "Created At": formatDateForExport(invoice.createdAt),
    "Updated At": formatDateForExport(invoice.updatedAt),
    "Items Count": invoice.items.length,
  }));
}

export function preparePaymentsForExport(payments: Payment[]) {
  return payments.map((payment) => ({
    "Payment ID": payment.id.toString(),
    "Invoice ID": payment.invoiceId.toString(),
    "Amount (INR)": formatCurrencyForExport(payment.amount),
    "Payment Date": formatDateForExport(payment.date),
  }));
}

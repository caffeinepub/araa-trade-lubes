import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Printer } from 'lucide-react';
import type { Invoice, Customer, Product } from '../backend';
import { calculateSummaryFromBreakups, formatPaiseToINR } from '../lib/gstUtils';
import { useGetCallerUserProfile } from '../hooks/useQueries';

interface InvoiceDetailsProps {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  products: Product[];
}

export default function InvoiceDetails({
  invoice,
  open,
  onOpenChange,
  customers,
  products,
}: InvoiceDetailsProps) {
  const { data: userProfile } = useGetCallerUserProfile();

  const customer = customers.find((c) => c.id === invoice.customerId);
  const summary = calculateSummaryFromBreakups(invoice.gstBreakups);

  const getProductName = (productId: bigint): string => {
    const product = products.find((p) => p.id === productId);
    return product ? product.name : `Product #${productId}`;
  };

  const getProductHsn = (productId: bigint): string => {
    const product = products.find((p) => p.id === productId);
    return product ? product.hsnSacCode : '';
  };

  const getProductTaxRate = (productId: bigint): string => {
    const product = products.find((p) => p.id === productId);
    if (!product) return '-';
    return `${Number(product.taxRate) / 100}%`;
  };

  const formatDate = (timestamp: bigint): string => {
    return new Date(Number(timestamp) / 1_000_000).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const handlePrint = () => {
    const companyName = userProfile?.businessName || 'Your Business';
    const companyAddress = userProfile?.companyInfo?.address || '';
    const companyGst = userProfile?.companyInfo?.gstNumber || '';

    // Build line items HTML using stored breakup data
    const lineItemsHtml = invoice.items
      .map((item, index) => {
        const breakup = invoice.gstBreakups[index];
        const productName = getProductName(item.productId);
        const hsnCode = getProductHsn(item.productId);
        const taxRate = getProductTaxRate(item.productId);
        const unitPrice = breakup
          ? formatPaiseToINR(breakup.taxableAmount / item.quantity)
          : formatPaiseToINR(item.price);
        const taxableAmt = breakup ? formatPaiseToINR(breakup.taxableAmount) : '-';
        const cgst = breakup ? formatPaiseToINR(breakup.cgst) : '-';
        const sgst = breakup ? formatPaiseToINR(breakup.sgst) : '-';
        const igst = breakup ? formatPaiseToINR(breakup.igst) : '-';
        const lineTotal = breakup ? formatPaiseToINR(breakup.totalAmount) : '-';

        return `
          <tr>
            <td style="padding:8px;border:1px solid #e2e8f0;">${productName}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${hsnCode || '-'}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${Number(item.quantity)}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${unitPrice}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${taxableAmt}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${taxRate}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${cgst}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${sgst}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${igst}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-weight:600;">${lineTotal}</td>
          </tr>
        `;
      })
      .join('');

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice #${invoice.id} - ${companyName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #1a202c; font-size: 13px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
          .company-info h1 { font-size: 22px; font-weight: 700; margin: 0 0 4px; color: #1a202c; }
          .company-info p { margin: 2px 0; color: #4a5568; font-size: 12px; }
          .invoice-meta { text-align: right; }
          .invoice-meta h2 { font-size: 18px; font-weight: 700; color: #2d3748; margin: 0 0 8px; }
          .invoice-meta p { margin: 2px 0; font-size: 12px; color: #4a5568; }
          .bill-to { margin-bottom: 20px; padding: 12px; background: #f7fafc; border-radius: 6px; }
          .bill-to h3 { font-size: 12px; font-weight: 600; color: #718096; text-transform: uppercase; margin: 0 0 6px; }
          .bill-to p { margin: 2px 0; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
          th { background: #2d3748; color: white; padding: 8px; text-align: left; font-size: 11px; }
          th.right { text-align: right; }
          th.center { text-align: center; }
          .totals { margin-left: auto; width: 320px; }
          .totals table { margin-bottom: 0; }
          .totals td { padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 13px; }
          .totals .grand-total td { font-weight: 700; font-size: 14px; background: #ebf8ff; }
          .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #718096; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>${companyName}</h1>
            ${companyAddress ? `<p>${companyAddress}</p>` : ''}
            ${companyGst ? `<p>GSTIN: ${companyGst}</p>` : ''}
          </div>
          <div class="invoice-meta">
            <h2>TAX INVOICE</h2>
            <p><strong>Invoice #:</strong> ${invoice.id}</p>
            <p><strong>Date:</strong> ${formatDate(invoice.createdAt)}</p>
          </div>
        </div>

        ${customer ? `
        <div class="bill-to">
          <h3>Bill To</h3>
          <p><strong>${customer.name}</strong></p>
          ${customer.address ? `<p>${customer.address}</p>` : ''}
          ${customer.phone ? `<p>Phone: ${customer.phone}</p>` : ''}
          ${customer.gstNumber ? `<p>GSTIN: ${customer.gstNumber}</p>` : ''}
        </div>
        ` : ''}

        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th class="center">HSN/SAC</th>
              <th class="center">Qty</th>
              <th class="right">Unit Price</th>
              <th class="right">Taxable Amt</th>
              <th class="center">GST%</th>
              <th class="right">CGST</th>
              <th class="right">SGST</th>
              <th class="right">IGST</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <table>
            <tr><td>Taxable Amount</td><td style="text-align:right;">${formatPaiseToINR(summary.taxableAmount)}</td></tr>
            ${summary.cgst > 0n ? `<tr><td>CGST</td><td style="text-align:right;">${formatPaiseToINR(summary.cgst)}</td></tr>` : ''}
            ${summary.sgst > 0n ? `<tr><td>SGST</td><td style="text-align:right;">${formatPaiseToINR(summary.sgst)}</td></tr>` : ''}
            ${summary.igst > 0n ? `<tr><td>IGST</td><td style="text-align:right;">${formatPaiseToINR(summary.igst)}</td></tr>` : ''}
            <tr><td>Total Tax</td><td style="text-align:right;">${formatPaiseToINR(summary.totalTax)}</td></tr>
            <tr class="grand-total"><td><strong>Grand Total</strong></td><td style="text-align:right;"><strong>${formatPaiseToINR(summary.totalAmount)}</strong></td></tr>
          </table>
        </div>

        <div class="footer">
          <p>Thank you for your business!</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Invoice #{String(invoice.id)}</DialogTitle>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 mr-6">
              <Printer className="h-4 w-4" />
              Print / PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Meta */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-semibold">{customer?.name || `Customer #${invoice.customerId}`}</p>
              {customer?.address && (
                <p className="text-sm text-muted-foreground">{customer.address}</p>
              )}
              {customer?.gstNumber && (
                <p className="text-sm text-muted-foreground">GSTIN: {customer.gstNumber}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Invoice Date</p>
              <p className="font-semibold">{formatDate(invoice.createdAt)}</p>
            </div>
          </div>

          <Separator />

          {/* Line Items Table */}
          <div>
            <h3 className="font-semibold mb-3">Line Items</h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">HSN/SAC</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Taxable Amt</TableHead>
                    <TableHead className="text-center">GST%</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, index) => {
                    const breakup = invoice.gstBreakups[index];
                    const productName = getProductName(item.productId);
                    const hsnCode = getProductHsn(item.productId);
                    const taxRate = getProductTaxRate(item.productId);
                    // Use stored breakup values directly — no recalculation
                    const unitPricePaise = breakup
                      ? breakup.taxableAmount / item.quantity
                      : item.price;
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{productName}</TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {hsnCode || '-'}
                        </TableCell>
                        <TableCell className="text-center">{String(item.quantity)}</TableCell>
                        <TableCell className="text-right">
                          {formatPaiseToINR(unitPricePaise)}
                        </TableCell>
                        <TableCell className="text-right">
                          {breakup ? formatPaiseToINR(breakup.taxableAmount) : '-'}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {taxRate}
                        </TableCell>
                        <TableCell className="text-right">
                          {breakup ? formatPaiseToINR(breakup.cgst) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {breakup ? formatPaiseToINR(breakup.sgst) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {breakup ? formatPaiseToINR(breakup.igst) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {breakup ? formatPaiseToINR(breakup.totalAmount) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <Separator />

          {/* GST Summary — sourced entirely from backend-stored breakups */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <h3 className="font-semibold mb-3">GST Summary</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxable Amount:</span>
                  <span>{formatPaiseToINR(summary.taxableAmount)}</span>
                </div>
                {summary.cgst > 0n && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CGST:</span>
                    <span>{formatPaiseToINR(summary.cgst)}</span>
                  </div>
                )}
                {summary.sgst > 0n && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SGST:</span>
                    <span>{formatPaiseToINR(summary.sgst)}</span>
                  </div>
                )}
                {summary.igst > 0n && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IGST:</span>
                    <span>{formatPaiseToINR(summary.igst)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Tax:</span>
                  <span>{formatPaiseToINR(summary.totalTax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Grand Total:</span>
                  <span>{formatPaiseToINR(summary.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

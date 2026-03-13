import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Customer, Invoice, Product } from "../backend";
import { useGetCallerUserProfile } from "../hooks/useQueries";
import {
  calculateSummaryFromBreakups,
  formatPaiseToINR,
} from "../lib/gstUtils";
import { loadJsPDF } from "../lib/pdfUtils";

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
  const [lastPdfBlob, setLastPdfBlob] = useState<{
    blob: Blob;
    filename: string;
  } | null>(null);

  const customer = customers.find((c) => c.id === invoice.customerId);
  const summary = calculateSummaryFromBreakups(invoice.gstBreakups);

  const companyName = userProfile?.businessName || "ARAA TRADE LUBES";
  const companyAddress = userProfile?.companyInfo?.address || "";
  const companyGst = userProfile?.companyInfo?.gstNumber || "";

  const getProductName = (productId: bigint): string => {
    const product = products.find((p) => p.id === productId);
    return product ? product.name : `Product #${productId}`;
  };

  const getProductHsn = (productId: bigint): string => {
    const product = products.find((p) => p.id === productId);
    return product ? product.hsnSacCode : "";
  };

  const getProductTaxRate = (productId: bigint): string => {
    const product = products.find((p) => p.id === productId);
    if (!product) return "-";
    return `${Number(product.taxRate) / 100}%`;
  };

  const formatDate = (timestamp: bigint): string => {
    return new Date(Number(timestamp) / 1_000_000).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const handleDownloadPDF = async () => {
    try {
      const { jsPDF, autoTable } = await loadJsPDF();

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Company name (left)
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(companyName, 14, 20);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      if (companyAddress) doc.text(companyAddress, 14, 26);
      if (companyGst)
        doc.text(`GSTIN: ${companyGst}`, 14, companyAddress ? 31 : 26);

      // Invoice meta (right)
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("TAX INVOICE", pageWidth - 14, 20, { align: "right" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Invoice #: ${String(invoice.id)}`, pageWidth - 14, 26, {
        align: "right",
      });
      doc.text(`Date: ${formatDate(invoice.createdAt)}`, pageWidth - 14, 31, {
        align: "right",
      });

      // Bill to section
      let y = 42;
      doc.setFont("helvetica", "bold");
      doc.text("Bill To:", 14, y);
      doc.setFont("helvetica", "normal");
      y += 5;
      if (customer) {
        doc.text(customer.name, 14, y);
        y += 5;
        if (customer.address) {
          doc.text(String(customer.address), 14, y);
          y += 5;
        }
        if (customer.phone) {
          doc.text(`Phone: ${String(customer.phone)}`, 14, y);
          y += 5;
        }
        if (customer.gstNumber) {
          doc.text(`GSTIN: ${String(customer.gstNumber)}`, 14, y);
          y += 5;
        }
      }

      // Items table
      const tableRows = invoice.items.map((item, idx) => {
        const breakup = invoice.gstBreakups[idx];
        return [
          getProductName(item.productId),
          getProductHsn(item.productId) || "-",
          String(Number(item.quantity)),
          breakup
            ? formatPaiseToINR(breakup.taxableAmount / item.quantity)
            : formatPaiseToINR(item.price),
          breakup ? formatPaiseToINR(breakup.taxableAmount) : "-",
          getProductTaxRate(item.productId),
          breakup ? formatPaiseToINR(breakup.cgst) : "-",
          breakup ? formatPaiseToINR(breakup.sgst) : "-",
          breakup ? formatPaiseToINR(breakup.igst) : "-",
          breakup ? formatPaiseToINR(breakup.totalAmount) : "-",
        ];
      });

      autoTable(doc, {
        startY: y + 3,
        head: [
          [
            "Product",
            "HSN",
            "Qty",
            "Unit Price",
            "Taxable",
            "GST%",
            "CGST",
            "SGST",
            "IGST",
            "Total",
          ],
        ],
        body: tableRows,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [45, 55, 72], textColor: 255, fontSize: 7 },
        columnStyles: { 0: { cellWidth: 30 } },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 8;

      // GST Summary
      const summaryTableBody: string[][] = [
        ["Taxable Amount", formatPaiseToINR(summary.taxableAmount)],
      ];
      if (summary.cgst > 0n)
        summaryTableBody.push(["CGST", formatPaiseToINR(summary.cgst)]);
      if (summary.sgst > 0n)
        summaryTableBody.push(["SGST", formatPaiseToINR(summary.sgst)]);
      if (summary.igst > 0n)
        summaryTableBody.push(["IGST", formatPaiseToINR(summary.igst)]);
      summaryTableBody.push(["Total Tax", formatPaiseToINR(summary.totalTax)]);
      summaryTableBody.push([
        "Grand Total",
        formatPaiseToINR(summary.totalAmount),
      ]);

      doc.setFont("helvetica", "bold");
      doc.text("GST Summary", pageWidth - 14 - 70, finalY);

      autoTable(doc, {
        startY: finalY + 4,
        margin: { left: pageWidth - 14 - 70 },
        tableWidth: 70,
        body: summaryTableBody,
        styles: { fontSize: 9 },
        bodyStyles: { fillColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [247, 250, 252] },
        didParseCell: (data) => {
          if (data.row.index === summaryTableBody.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [235, 248, 255];
          }
        },
      });

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 15;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text("Thank you for your business!", pageWidth / 2, footerY, {
        align: "center",
      });

      const filename = `Invoice_${String(invoice.id)}_${companyName.replace(/\s+/g, "_")}.pdf`;
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setLastPdfBlob({ blob, filename });
      toast.success("PDF downloaded successfully");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  const handleSharePDF = async () => {
    if (!lastPdfBlob) return;
    try {
      const file = new File([lastPdfBlob.blob], lastPdfBlob.filename, {
        type: "application/pdf",
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice #${String(invoice.id)}`,
        });
      } else {
        toast.error("Sharing is not supported on this device/browser");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") toast.error("Failed to share PDF");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Invoice #{String(invoice.id)}</DialogTitle>
            <div className="flex items-center gap-2 mr-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                className="gap-2"
                data-ocid="invoice.download_button"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              {lastPdfBlob && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSharePDF}
                  className="gap-2"
                  data-ocid="invoice.secondary_button"
                >
                  <Share2 className="h-4 w-4" />
                  Share PDF
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Meta */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-semibold">
                {customer?.name || `Customer #${invoice.customerId}`}
              </p>
              {customer?.address && (
                <p className="text-sm text-muted-foreground">
                  {customer.address}
                </p>
              )}
              {customer?.gstNumber && (
                <p className="text-sm text-muted-foreground">
                  GSTIN: {customer.gstNumber}
                </p>
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
                    const unitPricePaise = breakup
                      ? breakup.taxableAmount / item.quantity
                      : item.price;
                    return (
                      <TableRow key={`${String(item.productId)}-${index}`}>
                        <TableCell className="font-medium">
                          {productName}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {hsnCode || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {String(item.quantity)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPaiseToINR(unitPricePaise)}
                        </TableCell>
                        <TableCell className="text-right">
                          {breakup
                            ? formatPaiseToINR(breakup.taxableAmount)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {taxRate}
                        </TableCell>
                        <TableCell className="text-right">
                          {breakup ? formatPaiseToINR(breakup.cgst) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {breakup ? formatPaiseToINR(breakup.sgst) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {breakup ? formatPaiseToINR(breakup.igst) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {breakup
                            ? formatPaiseToINR(breakup.totalAmount)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <Separator />

          {/* GST Summary */}
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

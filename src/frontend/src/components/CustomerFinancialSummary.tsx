import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { SiWhatsapp } from "react-icons/si";
import { toast } from "sonner";
import type { Customer } from "../backend";
import {
  useGenerateWhatsappLink,
  useGetCustomerFinancialSummary,
} from "../hooks/useQueries";
import { formatCurrency } from "../lib/currencyUtils";
import { openPrintDialog } from "../lib/pdfUtils";

interface CustomerFinancialSummaryProps {
  customer: Customer;
}

export default function CustomerFinancialSummary({
  customer,
}: CustomerFinancialSummaryProps) {
  const { data: summary, isLoading } = useGetCustomerFinancialSummary(
    customer.id,
  );
  const generateWhatsapp = useGenerateWhatsappLink();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) / 1000000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
            Paid
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400">
            Pending
          </Badge>
        );
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const generateFinancialSummaryHTML = (): string => {
    if (!summary) return "";

    const totalInvoices = summary.invoices.reduce(
      (sum, inv) => sum + inv.total,
      BigInt(0),
    );
    const totalPayments = summary.payments.reduce(
      (sum, pay) => sum + pay.amount,
      BigInt(0),
    );

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Financial Summary - ${customer.name} - ARAA TRADE LUBES</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; color: #333; }
          .header { display: flex; align-items: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
          .logo { width: 80px; height: 80px; margin-right: 20px; }
          .company-info { flex: 1; }
          .company-name { color: #2563eb; font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          h1 { color: #333; font-size: 32px; margin: 0; }
          .customer-info { margin: 30px 0; padding: 20px; background: #f8fafc; border-radius: 8px; }
          .customer-info h3 { color: #555; margin-bottom: 10px; font-size: 18px; }
          .customer-details { color: #666; line-height: 1.6; }
          .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
          .summary-card { padding: 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #2563eb; }
          .summary-card h4 { color: #666; font-size: 14px; margin-bottom: 8px; }
          .summary-card .amount { font-size: 24px; font-weight: bold; color: #2563eb; }
          .outstanding { border-left-color: ${Number(summary.outstandingBalance) > 0 ? "#dc2626" : "#22c55e"}; }
          .outstanding .amount { color: ${Number(summary.outstandingBalance) > 0 ? "#dc2626" : "#22c55e"}; }
          table { width: 100%; border-collapse: collapse; margin: 30px 0; }
          th { background: #2563eb; color: white; padding: 12px; text-align: left; font-weight: 600; font-size: 14px; }
          td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
          tr:last-child td { border-bottom: none; }
          .section-title { color: #333; font-size: 20px; font-weight: bold; margin: 40px 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; }
          .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
          .status-paid { background: #dcfce7; color: #166534; }
          .status-pending { background: #fef3c7; color: #854d0e; }
          .status-overdue { background: #fee2e2; color: #991b1b; }
          .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #666; font-size: 12px; }
          @media print {
            body { padding: 20px; }
            .header { page-break-after: avoid; }
            table { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/assets/generated/araa-trade-lubes-logo-transparent.dim_200x200.png" alt="ARAA TRADE LUBES" class="logo" onerror="this.style.display='none'">
          <div class="company-info">
            <div class="company-name">ARAA TRADE LUBES</div>
            <h1>FINANCIAL SUMMARY</h1>
          </div>
        </div>

        <div class="customer-info">
          <h3>Customer Information</h3>
          <div class="customer-details">
            <div><strong>Name:</strong> ${customer.name}</div>
            ${customer.email ? `<div><strong>Email:</strong> ${customer.email}</div>` : ""}
            ${customer.phone ? `<div><strong>Phone:</strong> ${customer.phone}</div>` : ""}
            ${customer.address ? `<div><strong>Address:</strong> ${customer.address}</div>` : ""}
          </div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <h4>Total Invoiced</h4>
            <div class="amount">${formatCurrency(totalInvoices)}</div>
          </div>
          <div class="summary-card">
            <h4>Total Paid</h4>
            <div class="amount">${formatCurrency(totalPayments)}</div>
          </div>
          <div class="summary-card outstanding">
            <h4>Outstanding Balance</h4>
            <div class="amount">${formatCurrency(BigInt(summary.outstandingBalance))}</div>
          </div>
        </div>

        <h2 class="section-title">Invoices (${summary.invoices.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Status</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${summary.invoices
              .map(
                (invoice) => `
              <tr>
                <td><strong>#${invoice.id}</strong></td>
                <td>${formatDate(invoice.createdAt)}</td>
                <td><span class="status-badge status-${invoice.status}">${invoice.status}</span></td>
                <td style="text-align: right;"><strong>${formatCurrency(invoice.total)}</strong></td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <h2 class="section-title">Payments (${summary.payments.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Payment Date</th>
              <th>Invoice #</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${summary.payments
              .map(
                (payment) => `
              <tr>
                <td>${formatDate(payment.date)}</td>
                <td>#${payment.invoiceId}</td>
                <td style="text-align: right;"><strong>${formatCurrency(payment.amount)}</strong></td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div class="footer">
          <p><strong>ARAA TRADE LUBES</strong></p>
          <p>Thank you for your business!</p>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
      </html>
    `;
  };

  const handleDownloadPDF = () => {
    setIsGeneratingPdf(true);
    const toastId = toast.loading("Generating financial summary PDF...");

    try {
      const htmlContent = generateFinancialSummaryHTML();
      openPrintDialog(
        htmlContent,
        `Financial_Summary_${customer.name.replace(/\s+/g, "_")}_ARAA_TRADE_LUBES.pdf`,
      );

      toast.success(
        "PDF generated successfully! Use the print dialog to save.",
        {
          id: toastId,
          duration: 4000,
          icon: <CheckCircle2 className="h-5 w-5" />,
        },
      );
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error(
        "Failed to generate PDF. Please check your pop-up settings.",
        {
          id: toastId,
          duration: 5000,
        },
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!customer.phone) {
      toast.error("Customer phone number not available");
      return;
    }

    if (!summary) {
      toast.error("Financial summary not loaded");
      return;
    }

    setIsGeneratingPdf(true);
    const toastId = toast.loading(
      "Preparing financial summary for WhatsApp...",
    );

    try {
      // Step 1: Generate PDF
      const htmlContent = generateFinancialSummaryHTML();
      openPrintDialog(
        htmlContent,
        `Financial_Summary_${customer.name.replace(/\s+/g, "_")}_ARAA_TRADE_LUBES.pdf`,
      );

      toast.loading("Opening WhatsApp...", { id: toastId });

      // Step 2: Calculate totals
      const totalInvoices = summary.invoices.reduce(
        (sum, inv) => sum + inv.total,
        BigInt(0),
      );
      const totalPayments = summary.payments.reduce(
        (sum, pay) => sum + pay.amount,
        BigInt(0),
      );
      const outstanding = Number(summary.outstandingBalance) / 100;

      // Step 3: Create WhatsApp message
      const message = `*ARAA TRADE LUBES*\n\n*Financial Summary*\n\nDear ${customer.name},\n\nPlease find your financial summary attached.\n\n📊 *Summary:*\nTotal Invoiced: ${formatCurrency(totalInvoices)}\nTotal Paid: ${formatCurrency(totalPayments)}\nOutstanding Balance: ₹${outstanding.toFixed(2)}\n\nInvoices: ${summary.invoices.length}\nPayments: ${summary.payments.length}\n\nThank you for your business!\n\n_ARAA TRADE LUBES_`;

      const whatsappLink = await generateWhatsapp.mutateAsync({
        phone: customer.phone,
        message,
      });

      // Step 4: Open WhatsApp
      setTimeout(() => {
        window.open(whatsappLink, "_blank");
        toast.success("PDF generated and WhatsApp opened successfully!", {
          id: toastId,
          duration: 5000,
          icon: <CheckCircle2 className="h-5 w-5" />,
          description:
            "Save the PDF from the print dialog and share it via WhatsApp.",
        });
      }, 500);
    } catch (error) {
      console.error("WhatsApp share error:", error);
      toast.error("Failed to share via WhatsApp. Please try again.", {
        id: toastId,
        duration: 5000,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No financial data available for this customer</p>
      </div>
    );
  }

  const totalInvoices = summary.invoices.reduce(
    (sum, inv) => sum + inv.total,
    BigInt(0),
  );
  const totalPayments = summary.payments.reduce(
    (sum, pay) => sum + pay.amount,
    BigInt(0),
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-2xl font-bold">{customer.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Financial Summary
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download PDF
          </Button>
          {customer.phone && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareWhatsApp}
              disabled={isGeneratingPdf || generateWhatsapp.isPending}
            >
              {isGeneratingPdf || generateWhatsapp.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <SiWhatsapp className="mr-2 h-4 w-4" />
              )}
              Share via WhatsApp
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Invoiced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalInvoices)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totalPayments)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${Number(summary.outstandingBalance) > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
            >
              {formatCurrency(BigInt(summary.outstandingBalance))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices ({summary.invoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.invoices.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No invoices found
            </p>
          ) : (
            <div className="space-y-3">
              {summary.invoices.map((invoice) => (
                <div
                  key={Number(invoice.id)}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        Invoice #{Number(invoice.id)}
                      </span>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDate(invoice.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(invoice.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments ({summary.payments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.payments.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No payments recorded
            </p>
          ) : (
            <div className="space-y-2">
              {summary.payments
                .sort((a, b) => Number(b.date - a.date))
                .map((payment) => (
                  <div
                    key={Number(payment.id)}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        Invoice #{Number(payment.invoiceId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payment.date)}
                      </p>
                    </div>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(payment.amount)}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

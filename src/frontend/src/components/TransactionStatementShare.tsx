import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { SiWhatsapp } from "react-icons/si";
import { toast } from "sonner";
import type { Customer, UserProfile } from "../backend";
import { useGenerateWhatsappLink } from "../hooks/useQueries";
import { formatCurrency } from "../lib/currencyUtils";
import { openPrintDialog } from "../lib/pdfUtils";

interface TransactionStatementShareProps {
  customer: Customer;
  transactionType: "sale" | "payment";
  transactionAmount: bigint;
  previousBalance: bigint;
  newBalance: bigint;
  userProfile: UserProfile | null;
}

export default function TransactionStatementShare({
  customer,
  transactionType,
  transactionAmount,
  previousBalance,
  newBalance,
  userProfile,
}: TransactionStatementShareProps) {
  const generateWhatsappLink = useGenerateWhatsappLink();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = () => {
    setIsGeneratingPDF(true);
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Transaction Statement - ${customer.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .company-info {
              font-size: 12px;
              color: #666;
              margin-top: 5px;
            }
            .statement-title {
              font-size: 20px;
              font-weight: bold;
              margin: 20px 0;
              text-align: center;
            }
            .customer-info {
              margin: 20px 0;
              padding: 15px;
              background: #f5f5f5;
              border-radius: 5px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 8px 0;
            }
            .label {
              font-weight: bold;
            }
            .transaction-details {
              margin: 30px 0;
              border: 1px solid #ddd;
              border-radius: 5px;
              overflow: hidden;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 12px 15px;
              border-bottom: 1px solid #ddd;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-row.highlight {
              background: #f9f9f9;
              font-weight: bold;
            }
            .amount-positive {
              color: #dc2626;
            }
            .amount-negative {
              color: #16a34a;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${userProfile?.businessName || "ARAA TRADE LUBES"}</div>
            ${userProfile?.companyInfo?.address ? `<div class="company-info">${userProfile.companyInfo.address}</div>` : ""}
            ${userProfile?.companyInfo?.gstNumber ? `<div class="company-info">GST: ${userProfile.companyInfo.gstNumber}</div>` : ""}
          </div>

          <div class="statement-title">Transaction Statement</div>

          <div class="customer-info">
            <div class="info-row">
              <span class="label">Customer:</span>
              <span>${customer.name}</span>
            </div>
            ${
              customer.phone
                ? `
            <div class="info-row">
              <span class="label">Phone:</span>
              <span>${customer.phone}</span>
            </div>
            `
                : ""
            }
            ${
              customer.gstNumber
                ? `
            <div class="info-row">
              <span class="label">GST:</span>
              <span>${customer.gstNumber}</span>
            </div>
            `
                : ""
            }
            <div class="info-row">
              <span class="label">Date:</span>
              <span>${new Date().toLocaleDateString("en-IN")}</span>
            </div>
          </div>

          <div class="transaction-details">
            <div class="detail-row">
              <span class="label">Previous Outstanding:</span>
              <span>${formatCurrency(previousBalance)}</span>
            </div>
            <div class="detail-row">
              <span class="label">${transactionType === "sale" ? "New Sale:" : "Payment Received:"}</span>
              <span class="${transactionType === "sale" ? "amount-positive" : "amount-negative"}">
                ${transactionType === "sale" ? "+" : "-"}${formatCurrency(transactionAmount)}
              </span>
            </div>
            <div class="detail-row highlight">
              <span class="label">Current Outstanding:</span>
              <span>${formatCurrency(newBalance)}</span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Generated on ${new Date().toLocaleString("en-IN")}</p>
          </div>
        </body>
        </html>
      `;

      openPrintDialog(
        htmlContent,
        `Statement-${customer.name}-${Date.now()}.pdf`,
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleWhatsAppShare = async () => {
    const message = `
*Transaction Statement*

Customer: ${customer.name}
Date: ${new Date().toLocaleDateString("en-IN")}

Previous Outstanding: ${formatCurrency(previousBalance)}
${transactionType === "sale" ? "New Sale" : "Payment Received"}: ${transactionType === "sale" ? "+" : "-"}${formatCurrency(transactionAmount)}
Current Outstanding: ${formatCurrency(newBalance)}

Thank you for your business!
- ${userProfile?.businessName || "ARAA TRADE LUBES"}
    `.trim();

    try {
      const link = await generateWhatsappLink.mutateAsync({
        phone: customer.phone,
        message,
      });
      window.open(link, "_blank");
    } catch (error) {
      toast.error("Failed to generate WhatsApp link");
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Transaction Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">{customer.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">
                {new Date().toLocaleDateString("en-IN")}
              </span>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Previous Outstanding:
              </span>
              <span className="font-medium">
                {formatCurrency(previousBalance)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {transactionType === "sale" ? "New Sale:" : "Payment Received:"}
              </span>
              <span
                className={`font-medium ${transactionType === "sale" ? "text-destructive" : "text-green-600"}`}
              >
                {transactionType === "sale" ? "+" : "-"}
                {formatCurrency(transactionAmount)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Current Outstanding:</span>
              <span>{formatCurrency(newBalance)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF}
          variant="outline"
          className="flex-1"
        >
          {isGeneratingPDF ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Download PDF
        </Button>
        <Button
          onClick={handleWhatsAppShare}
          disabled={!customer.phone || generateWhatsappLink.isPending}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {generateWhatsappLink.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <SiWhatsapp className="mr-2 h-4 w-4" />
          )}
          Share via WhatsApp
        </Button>
      </div>
    </div>
  );
}

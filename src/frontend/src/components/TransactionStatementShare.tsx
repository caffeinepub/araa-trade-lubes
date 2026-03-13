import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Download, Loader2, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Customer, UserProfile } from "../backend";
import { formatCurrency } from "../lib/currencyUtils";
import { loadJsPDF } from "../lib/pdfUtils";

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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [lastPdfBlob, setLastPdfBlob] = useState<{
    blob: Blob;
    filename: string;
  } | null>(null);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const { jsPDF, autoTable } = await loadJsPDF();

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(userProfile?.businessName || "ARAA TRADE LUBES", 14, 20);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const address = userProfile?.companyInfo?.address || "";
      const gstNum = userProfile?.companyInfo?.gstNumber || "";
      let yPos = 26;
      if (address) {
        doc.text(address, 14, yPos);
        yPos += 5;
      }
      if (gstNum) {
        doc.text(`GSTIN: ${gstNum}`, 14, yPos);
        yPos += 5;
      }

      // Title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Transaction Statement", pageWidth / 2, yPos + 4, {
        align: "center",
      });
      yPos += 12;

      // Customer info
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Customer: ${customer.name}`, 14, yPos);
      yPos += 5;
      if (customer.phone) {
        doc.text(`Phone: ${customer.phone}`, 14, yPos);
        yPos += 5;
      }
      if (customer.gstNumber) {
        doc.text(`GSTIN: ${customer.gstNumber}`, 14, yPos);
        yPos += 5;
      }
      doc.text(`Date: ${new Date().toLocaleDateString("en-IN")}`, 14, yPos);
      yPos += 8;

      // Transaction summary table
      const rows = [
        ["Previous Outstanding", formatCurrency(previousBalance)],
        [
          transactionType === "sale" ? "New Sale" : "Payment Received",
          `${transactionType === "sale" ? "+" : "-"}${formatCurrency(transactionAmount)}`,
        ],
        ["Current Outstanding", formatCurrency(newBalance)],
      ];

      autoTable(doc, {
        startY: yPos,
        body: rows,
        styles: { fontSize: 11 },
        bodyStyles: { fillColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [247, 250, 252] },
        didParseCell: (data) => {
          if (data.row.index === 2) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [235, 248, 255];
          }
        },
      });

      const footerY = doc.internal.pageSize.getHeight() - 15;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text("Thank you for your business!", pageWidth / 2, footerY, {
        align: "center",
      });

      const filename = `Statement-${customer.name}-${Date.now()}.pdf`;
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
    } catch (error: any) {
      toast.error(error.message || "Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
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
          title: `Statement - ${customer.name}`,
        });
      } else {
        toast.error("Sharing is not supported on this device/browser");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") toast.error("Failed to share PDF");
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
                className={`font-medium ${
                  transactionType === "sale"
                    ? "text-destructive"
                    : "text-green-600"
                }`}
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
          data-ocid="statement.download_button"
        >
          {isGeneratingPDF ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Download PDF
        </Button>
        {lastPdfBlob && (
          <Button
            onClick={handleSharePDF}
            variant="outline"
            className="flex-1"
            data-ocid="statement.secondary_button"
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share PDF
          </Button>
        )}
      </div>
    </div>
  );
}

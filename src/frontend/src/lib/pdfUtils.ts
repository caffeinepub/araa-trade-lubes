/**
 * Utility functions for PDF handling without external dependencies
 * Using browser's native print-to-PDF functionality
 */

export function openPrintDialog(htmlContent: string, filename: string): void {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    throw new Error(
      "Pop-up blocked. Please allow pop-ups for this site to generate PDFs.",
    );
  }

  try {
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Set document title for better PDF naming
    printWindow.document.title = filename;

    // Trigger print dialog after content loads
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  } catch (_error) {
    printWindow.close();
    throw new Error("Failed to generate PDF content. Please try again.");
  }
}

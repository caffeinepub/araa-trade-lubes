/**
 * Utility functions for PDF handling
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
    printWindow.document.title = filename;
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

/** Load jsPDF and autotable from CDN at runtime */
export async function loadJsPDF(): Promise<{
  jsPDF: any;
  autoTable: (doc: any, opts: any) => void;
}> {
  const win = window as any;

  if (!win._jspdfLoaded) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load jsPDF"));
      document.head.appendChild(s);
    });

    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load autotable"));
      document.head.appendChild(s);
    });

    win._jspdfLoaded = true;
  }

  const { jsPDF } = win.jspdf;
  // autotable is injected onto jsPDF prototype by the CDN script
  const autoTable = (doc: any, opts: any) => (doc as any).autoTable(opts);
  return { jsPDF, autoTable };
}

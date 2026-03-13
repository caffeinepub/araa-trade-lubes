import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Loader2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  useAddCustomer,
  useAddProduct,
  useAddVendor,
  useGetAllCustomers,
  useGetAllInvoices,
  useGetAllPayments,
  useGetAllProducts,
  useGetAllVendors,
} from "../hooks/useQueries";
import {
  exportToCSV,
  parseCustomersFromCSV,
  parseProductsFromCSV,
  parseVendorsFromCSV,
  prepareCustomersForExport,
  prepareInvoicesForExport,
  preparePaymentsForExport,
  prepareProductsForExport,
  prepareVendorsForExport,
} from "../lib/exportUtils";

export default function DataExport() {
  const { data: customers, isLoading: customersLoading } = useGetAllCustomers();
  const { data: vendors, isLoading: vendorsLoading } = useGetAllVendors();
  const { data: products, isLoading: productsLoading } = useGetAllProducts();
  const { data: invoices, isLoading: invoicesLoading } = useGetAllInvoices();
  const { data: payments, isLoading: paymentsLoading } = useGetAllPayments();

  const addCustomer = useAddCustomer();
  const addVendor = useAddVendor();
  const addProduct = useAddProduct();

  const [exporting, setExporting] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);

  const customerFileRef = useRef<HTMLInputElement>(null);
  const vendorFileRef = useRef<HTMLInputElement>(null);
  const productFileRef = useRef<HTMLInputElement>(null);

  const handleExport = async (type: string) => {
    setExporting(type);
    try {
      let data: any[] = [];
      let fileName = "";

      switch (type) {
        case "customers":
          if (!customers || customers.length === 0) {
            toast.error("No customers to export");
            return;
          }
          data = prepareCustomersForExport(customers);
          fileName = `Customers_${new Date().toISOString().split("T")[0]}`;
          break;
        case "vendors":
          if (!vendors || vendors.length === 0) {
            toast.error("No vendors to export");
            return;
          }
          data = prepareVendorsForExport(vendors);
          fileName = `Vendors_${new Date().toISOString().split("T")[0]}`;
          break;
        case "products":
          if (!products || products.length === 0) {
            toast.error("No products to export");
            return;
          }
          data = prepareProductsForExport(products);
          fileName = `Products_${new Date().toISOString().split("T")[0]}`;
          break;
        case "invoices":
          if (!invoices || invoices.length === 0) {
            toast.error("No invoices to export");
            return;
          }
          data = prepareInvoicesForExport(invoices);
          fileName = `Invoices_${new Date().toISOString().split("T")[0]}`;
          break;
        case "payments":
          if (!payments || payments.length === 0) {
            toast.error("No payments to export");
            return;
          }
          data = preparePaymentsForExport(payments);
          fileName = `Payments_${new Date().toISOString().split("T")[0]}`;
          break;
        default:
          toast.error("Invalid export type");
          return;
      }

      exportToCSV(data, fileName);
      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully`,
      );
    } catch (error) {
      toast.error("Failed to export data");
      console.error(error);
    } finally {
      setExporting(null);
    }
  };

  const handleImport = async (
    type: "customers" | "vendors" | "products",
    file: File,
  ) => {
    setImporting(type);
    const text = await file.text();
    let successCount = 0;
    let failCount = 0;

    try {
      if (type === "customers") {
        const rows = parseCustomersFromCSV(text);
        for (const row of rows) {
          try {
            await addCustomer.mutateAsync({ ...row, state: null });
            successCount++;
          } catch {
            failCount++;
          }
        }
      } else if (type === "vendors") {
        const rows = parseVendorsFromCSV(text);
        for (const row of rows) {
          try {
            await addVendor.mutateAsync(row);
            successCount++;
          } catch {
            failCount++;
          }
        }
      } else if (type === "products") {
        const rows = parseProductsFromCSV(text);
        for (const row of rows) {
          try {
            await addProduct.mutateAsync(row);
            successCount++;
          } catch {
            failCount++;
          }
        }
      }

      if (failCount === 0) {
        toast.success(`Imported ${successCount} records successfully.`);
      } else {
        toast.warning(
          `Imported ${successCount} records successfully. ${failCount} failed.`,
        );
      }
    } catch (error) {
      toast.error("Import failed — please check the CSV format.");
      console.error(error);
    } finally {
      setImporting(null);
      // Reset file inputs
      if (customerFileRef.current) customerFileRef.current.value = "";
      if (vendorFileRef.current) vendorFileRef.current.value = "";
      if (productFileRef.current) productFileRef.current.value = "";
    }
  };

  const exportCards = [
    {
      id: "customers",
      title: "Customers",
      description:
        "Export all customer data including contact details and GST numbers",
      count: customers?.length || 0,
      isLoading: customersLoading,
    },
    {
      id: "vendors",
      title: "Vendors",
      description: "Export all vendor information and contact details",
      count: vendors?.length || 0,
      isLoading: vendorsLoading,
    },
    {
      id: "products",
      title: "Products",
      description: "Export product catalog with prices and stock levels",
      count: products?.length || 0,
      isLoading: productsLoading,
    },
    {
      id: "invoices",
      title: "Invoices",
      description: "Export all invoice records with totals and status",
      count: invoices?.length || 0,
      isLoading: invoicesLoading,
    },
    {
      id: "payments",
      title: "Payments",
      description: "Export payment history and transaction records",
      count: payments?.length || 0,
      isLoading: paymentsLoading,
    },
  ];

  const importCards: Array<{
    id: "customers" | "vendors" | "products";
    title: string;
    description: string;
    fileRef: React.RefObject<HTMLInputElement | null>;
  }> = [
    {
      id: "customers",
      title: "Customers",
      description: "Restore customers from a previously exported CSV backup",
      fileRef: customerFileRef,
    },
    {
      id: "vendors",
      title: "Vendors",
      description: "Restore vendors from a previously exported CSV backup",
      fileRef: vendorFileRef,
    },
    {
      id: "products",
      title: "Products",
      description:
        "Restore products and prices from a previously exported CSV backup",
      fileRef: productFileRef,
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Backup &amp; Restore
          </h2>
          <p className="text-muted-foreground">
            Download CSV backups to Excel / Google Sheets and restore them at
            any time
          </p>
        </div>
      </div>

      {/* ── Export Section ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Export Data</h3>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {exportCards.map((card) => (
            <Card key={card.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                  <span className="text-2xl font-bold">{card.count}</span>
                </div>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  data-ocid={`export.${card.id}.primary_button`}
                  onClick={() => handleExport(card.id)}
                  disabled={
                    card.isLoading || exporting === card.id || card.count === 0
                  }
                  className="w-full"
                >
                  {exporting === card.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export {card.title}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* ── Restore Section ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold">Restore from Backup</h3>
        </div>

        <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription>
            <strong>Important:</strong> Import adds new records — it does not
            overwrite existing data. Only use a CSV that was previously exported
            from this app.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {importCards.map((card) => (
            <Card key={card.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <ShieldCheck className="h-8 w-8 text-green-600" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Restore
                  </span>
                </div>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Hidden file input */}
                <input
                  ref={card.fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImport(card.id, file);
                  }}
                />
                <Button
                  data-ocid={`restore.${card.id}.upload_button`}
                  variant="outline"
                  onClick={() => card.fileRef.current?.click()}
                  disabled={importing !== null}
                  className="w-full"
                >
                  {importing === card.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import {card.title} CSV
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Info Card ── */}
      <Card>
        <CardHeader>
          <CardTitle>About Backup &amp; Restore</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • CSV files (.csv) can be opened in Microsoft Excel, Google Sheets,
            or any spreadsheet application
          </p>
          <p>
            • All dates are exported in ISO format (YYYY-MM-DD) for easy sorting
          </p>
          <p>
            • Currency values are exported as numbers in INR (Indian Rupees)
          </p>
          <p>• Files are named with the current date for easy organization</p>
          <p>
            • To open in Excel: Right-click the downloaded file → Open with →
            Microsoft Excel
          </p>
          <p>
            • To import to Google Sheets: File → Import → Upload → Select the
            CSV file
          </p>
          <p>
            • To restore from a backup: click the Import button, select your
            saved CSV file, and records will be added automatically
          </p>
          <p>
            • Invoices and payments cannot be restored from CSV (they have
            complex relationships); keep them safe in blockchain storage
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

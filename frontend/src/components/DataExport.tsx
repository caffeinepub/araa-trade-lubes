import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import {
  useGetAllCustomers,
  useGetAllVendors,
  useGetAllProducts,
  useGetAllInvoices,
  useGetAllPayments,
} from '../hooks/useQueries';
import {
  exportToCSV,
  prepareCustomersForExport,
  prepareVendorsForExport,
  prepareProductsForExport,
  prepareInvoicesForExport,
  preparePaymentsForExport,
} from '../lib/exportUtils';

export default function DataExport() {
  const { data: customers, isLoading: customersLoading } = useGetAllCustomers();
  const { data: vendors, isLoading: vendorsLoading } = useGetAllVendors();
  const { data: products, isLoading: productsLoading } = useGetAllProducts();
  const { data: invoices, isLoading: invoicesLoading } = useGetAllInvoices();
  const { data: payments, isLoading: paymentsLoading } = useGetAllPayments();

  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (type: string) => {
    setExporting(type);
    try {
      let data: any[] = [];
      let fileName = '';

      switch (type) {
        case 'customers':
          if (!customers || customers.length === 0) {
            toast.error('No customers to export');
            return;
          }
          data = prepareCustomersForExport(customers);
          fileName = `Customers_${new Date().toISOString().split('T')[0]}`;
          break;

        case 'vendors':
          if (!vendors || vendors.length === 0) {
            toast.error('No vendors to export');
            return;
          }
          data = prepareVendorsForExport(vendors);
          fileName = `Vendors_${new Date().toISOString().split('T')[0]}`;
          break;

        case 'products':
          if (!products || products.length === 0) {
            toast.error('No products to export');
            return;
          }
          data = prepareProductsForExport(products);
          fileName = `Products_${new Date().toISOString().split('T')[0]}`;
          break;

        case 'invoices':
          if (!invoices || invoices.length === 0) {
            toast.error('No invoices to export');
            return;
          }
          data = prepareInvoicesForExport(invoices);
          fileName = `Invoices_${new Date().toISOString().split('T')[0]}`;
          break;

        case 'payments':
          if (!payments || payments.length === 0) {
            toast.error('No payments to export');
            return;
          }
          data = preparePaymentsForExport(payments);
          fileName = `Payments_${new Date().toISOString().split('T')[0]}`;
          break;

        default:
          toast.error('Invalid export type');
          return;
      }

      exportToCSV(data, fileName);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully`);
    } catch (error) {
      toast.error('Failed to export data');
      console.error(error);
    } finally {
      setExporting(null);
    }
  };

  const exportCards = [
    {
      id: 'customers',
      title: 'Customers',
      description: 'Export all customer data including contact details and GST numbers',
      count: customers?.length || 0,
      isLoading: customersLoading,
    },
    {
      id: 'vendors',
      title: 'Vendors',
      description: 'Export all vendor information and contact details',
      count: vendors?.length || 0,
      isLoading: vendorsLoading,
    },
    {
      id: 'products',
      title: 'Products',
      description: 'Export product catalog with prices and stock levels',
      count: products?.length || 0,
      isLoading: productsLoading,
    },
    {
      id: 'invoices',
      title: 'Invoices',
      description: 'Export all invoice records with totals and status',
      count: invoices?.length || 0,
      isLoading: invoicesLoading,
    },
    {
      id: 'payments',
      title: 'Payments',
      description: 'Export payment history and transaction records',
      count: payments?.length || 0,
      isLoading: paymentsLoading,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Export Data</h2>
          <p className="text-muted-foreground">Download your business data as CSV files for Excel or Google Sheets</p>
        </div>
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
                onClick={() => handleExport(card.id)}
                disabled={card.isLoading || exporting === card.id || card.count === 0}
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

      <Card>
        <CardHeader>
          <CardTitle>About Data Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• CSV files (.csv) can be opened in Microsoft Excel, Google Sheets, or any spreadsheet application</p>
          <p>• All dates are exported in ISO format (YYYY-MM-DD) for easy sorting</p>
          <p>• Currency values are exported as numbers in INR (Indian Rupees)</p>
          <p>• Files are named with the current date for easy organization</p>
          <p>• To open in Excel: Right-click the downloaded file → Open with → Microsoft Excel</p>
          <p>• To import to Google Sheets: File → Import → Upload → Select the CSV file</p>
        </CardContent>
      </Card>
    </div>
  );
}

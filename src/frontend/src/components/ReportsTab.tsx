import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  Package,
  Users,
} from "lucide-react";
import { useState } from "react";
import { SiWhatsapp } from "react-icons/si";
import { toast } from "sonner";
import type { Customer } from "../backend";
import { Variant_sale_payment } from "../backend";
import {
  useGenerateWhatsappLink,
  useGetAllCustomers,
  useGetAllInvoices,
  useGetAllProducts,
  useGetCustomerFinancialSummary,
  useGetCustomerStatement,
} from "../hooks/useQueries";
import { formatCurrency } from "../lib/currencyUtils";
import { openPrintDialog } from "../lib/pdfUtils";

// ─── Customer Report Row ─────────────────────────────────────────────────────

function CustomerReportRow({ customer }: { customer: Customer }) {
  const [expanded, setExpanded] = useState(false);
  const { data: summary, isLoading: summaryLoading } =
    useGetCustomerFinancialSummary(expanded ? customer.id : null);
  const { data: statement, isLoading: statementLoading } =
    useGetCustomerStatement(expanded ? customer.id : null);
  const generateWhatsapp = useGenerateWhatsappLink();
  const [pdfLoading, setPdfLoading] = useState(false);

  const formatDate = (ts: bigint) =>
    new Date(Number(ts) / 1_000_000).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const totalInvoiced = summary
    ? summary.invoices.reduce((s, inv) => s + inv.total, 0n)
    : 0n;
  const totalPaid = summary
    ? summary.payments.reduce((s, pay) => s + pay.amount, 0n)
    : 0n;
  const outstanding = summary ? summary.outstandingBalance : 0n;

  const handleWhatsApp = async () => {
    if (!customer.phone) {
      toast.error("No phone number for this customer");
      return;
    }
    if (!summary) {
      toast.error("Summary not loaded yet");
      return;
    }
    try {
      const message = `*ARAA TRADE LUBES*\n*Customer Statement*\n\nCustomer: ${customer.name}\n\nTotal Invoiced: ${formatCurrency(totalInvoiced)}\nTotal Paid: ${formatCurrency(totalPaid)}\nOutstanding: ${formatCurrency(outstanding)}\n\nThank you for your business!`;
      const link = await generateWhatsapp.mutateAsync({
        phone: customer.phone,
        message,
      });
      window.open(link, "_blank");
    } catch {
      toast.error("Failed to open WhatsApp");
    }
  };

  const handlePDF = () => {
    if (!summary) return;
    setPdfLoading(true);
    try {
      const sortedStatement = [...(statement ?? [])].sort((a, b) =>
        Number(a.date - b.date),
      );
      const rows = sortedStatement
        .map((e) => {
          const isSale = e.transactionType === Variant_sale_payment.sale;
          const typeLabel = isSale ? "Sale" : "Payment";
          const badgeClass = isSale ? "badge-sale" : "badge-payment";
          return `<tr>
              <td>${formatDate(e.date)}</td>
              <td><span class="badge ${badgeClass}">${typeLabel}</span></td>
              <td>${e.description}</td>
              <td style="text-align:right">${formatCurrency(e.amount)}</td>
              <td style="text-align:right">${formatCurrency(e.runningBalance)}</td>
            </tr>`;
        })
        .join("");

      const outColor = Number(outstanding) > 0 ? "#dc2626" : "#16a34a";
      const phoneStr = customer.phone ? ` | ${customer.phone}` : "";
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>Statement - ${customer.name}</title>
        <style>
          body{font-family:Arial,sans-serif;padding:32px;color:#333}
          h1{color:#1d4ed8;font-size:22px}h2{font-size:16px;margin:24px 0 8px}
          .badge{padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold}
          .badge-sale{background:#fef3c7;color:#92400e}
          .badge-payment{background:#dcfce7;color:#166534}
          table{width:100%;border-collapse:collapse;margin:16px 0}
          th{background:#1d4ed8;color:#fff;padding:10px;text-align:left;font-size:13px}
          td{padding:9px 10px;border-bottom:1px solid #e5e7eb;font-size:13px}
          .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:20px 0}
          .card{padding:16px;background:#f8fafc;border-radius:8px;border-left:4px solid #1d4ed8}
          .card h4{font-size:12px;color:#6b7280;margin-bottom:6px}
          .card .val{font-size:20px;font-weight:bold;color:#1d4ed8}
          .out .val{color:${outColor}}
          .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center}
        </style></head><body>
        <h1>ARAA TRADE LUBES</h1><p>Customer Statement</p>
        <p><strong>${customer.name}</strong>${phoneStr}</p>
        <div class="cards">
          <div class="card"><h4>Total Invoiced</h4><div class="val">${formatCurrency(totalInvoiced)}</div></div>
          <div class="card"><h4>Total Paid</h4><div class="val">${formatCurrency(totalPaid)}</div></div>
          <div class="card out"><h4>Outstanding</h4><div class="val">${formatCurrency(outstanding)}</div></div>
        </div>
        <h2>Transactions</h2>
        <table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Balance</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <div class="footer">ARAA TRADE LUBES | Thank you for your business!</div>
        <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
        </body></html>`;
      openPrintDialog(html, `Statement_${customer.name}.pdf`);
      toast.success("PDF dialog opened");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="border rounded-xl overflow-hidden mb-3">
      {/* Row header — full-width button */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/40 cursor-pointer transition-colors text-left"
        onClick={() => setExpanded((p) => !p)}
        data-ocid="reports.customer.row"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">{customer.name}</p>
            {customer.phone && (
              <p className="text-xs text-muted-foreground">{customer.phone}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1 bg-background">
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {expanded ? "Hide" : "View Report"}
          </span>
        </div>
      </button>

      {/* Expanded report */}
      {expanded && (
        <div className="border-t bg-muted/20 p-4 space-y-4">
          {summaryLoading || statementLoading ? (
            <div
              className="space-y-3"
              data-ocid="reports.customer.loading_state"
            >
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
              <Skeleton className="h-40" />
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs text-muted-foreground font-medium">
                      Total Invoiced
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(totalInvoiced)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-green-200 dark:border-green-800">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs text-muted-foreground font-medium">
                      Total Paid
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(totalPaid)}
                    </p>
                  </CardContent>
                </Card>
                <Card
                  className={
                    Number(outstanding) > 0
                      ? "border-red-200 dark:border-red-800"
                      : "border-green-200 dark:border-green-800"
                  }
                >
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs text-muted-foreground font-medium">
                      Outstanding
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <p
                      className={
                        Number(outstanding) > 0
                          ? "text-xl font-bold text-red-600 dark:text-red-400"
                          : "text-xl font-bold text-green-600 dark:text-green-400"
                      }
                    >
                      {formatCurrency(outstanding)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Transaction table */}
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!statement || statement.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-8 text-muted-foreground"
                          data-ocid="reports.statement.empty_state"
                        >
                          No transactions yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      [...statement]
                        .sort((a, b) => Number(a.date - b.date))
                        .map((entry) => (
                          <TableRow
                            key={`${entry.date}-${entry.amount}`}
                            data-ocid="reports.statement.row"
                          >
                            <TableCell className="text-xs">
                              {formatDate(entry.date)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  entry.transactionType ===
                                  Variant_sale_payment.sale
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                    : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                }
                              >
                                {entry.transactionType ===
                                Variant_sale_payment.sale
                                  ? "Sale"
                                  : "Payment"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {entry.description}
                            </TableCell>
                            <TableCell className="text-right font-medium text-xs">
                              {formatCurrency(entry.amount)}
                            </TableCell>
                            <TableCell
                              className={
                                Number(entry.runningBalance) > 0
                                  ? "text-right font-semibold text-xs text-red-600 dark:text-red-400"
                                  : "text-right font-semibold text-xs text-green-600 dark:text-green-400"
                              }
                            >
                              {formatCurrency(entry.runningBalance)}
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={handlePDF}
                  disabled={pdfLoading}
                  data-ocid="reports.customer.download_button"
                >
                  {pdfLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Download PDF
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 text-xs bg-[#25D366] hover:bg-[#1ebe5d] text-white"
                  onClick={handleWhatsApp}
                  disabled={generateWhatsapp.isPending || !customer.phone}
                  data-ocid="reports.customer.secondary_button"
                >
                  {generateWhatsapp.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <SiWhatsapp className="h-3.5 w-3.5" />
                  )}
                  Share via WhatsApp
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Customer Wise Tab ────────────────────────────────────────────────────────

function CustomerWiseTab() {
  const { data: customers, isLoading } = useGetAllCustomers();

  if (isLoading) {
    return (
      <div className="space-y-3" data-ocid="reports.customers.loading_state">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!customers || customers.length === 0) {
    return (
      <div
        className="text-center py-16 text-muted-foreground"
        data-ocid="reports.customers.empty_state"
      >
        <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No customers yet</p>
        <p className="text-sm mt-1">Add customers to view their reports here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {customers.map((customer) => (
        <CustomerReportRow key={Number(customer.id)} customer={customer} />
      ))}
    </div>
  );
}

// ─── Product Wise Tab ─────────────────────────────────────────────────────────

function ProductWiseTab() {
  const { data: products, isLoading: productsLoading } = useGetAllProducts();
  const { data: invoices, isLoading: invoicesLoading } = useGetAllInvoices();

  if (productsLoading || invoicesLoading) {
    return (
      <div className="space-y-3" data-ocid="reports.products.loading_state">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div
        className="text-center py-16 text-muted-foreground"
        data-ocid="reports.products.empty_state"
      >
        <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No products yet</p>
        <p className="text-sm mt-1">Add products to view sales analysis</p>
      </div>
    );
  }

  const productStats = new Map<
    string,
    { unitsSold: bigint; revenue: bigint }
  >();

  for (const invoice of invoices ?? []) {
    for (const item of invoice.items) {
      const key = item.productId.toString();
      const existing = productStats.get(key) ?? { unitsSold: 0n, revenue: 0n };
      productStats.set(key, {
        unitsSold: existing.unitsSold + item.quantity,
        revenue: existing.revenue + item.price * item.quantity,
      });
    }
  }

  const rows = products
    .map((p) => {
      const stats = productStats.get(p.id.toString()) ?? {
        unitsSold: 0n,
        revenue: 0n,
      };
      return { product: p, ...stats };
    })
    .sort((a, b) =>
      a.revenue > b.revenue ? -1 : a.revenue < b.revenue ? 1 : 0,
    );

  return (
    <div
      className="rounded-xl border overflow-x-auto"
      data-ocid="reports.products.table"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Product Name</TableHead>
            <TableHead>HSN/SAC</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Units Sold</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">GST%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow
              key={Number(row.product.id)}
              data-ocid="reports.products.row"
            >
              <TableCell className="text-muted-foreground text-xs">
                {idx + 1}
              </TableCell>
              <TableCell className="font-medium">{row.product.name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {row.product.hsnSacCode || "—"}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(row.product.price)}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {Number(row.unitsSold)}
              </TableCell>
              <TableCell className="text-right font-bold text-primary">
                {formatCurrency(row.revenue)}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="outline">{Number(row.product.taxRate)}%</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── ReportsTab ───────────────────────────────────────────────────────────────

export default function ReportsTab() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Reports</h2>
        <p className="text-sm text-muted-foreground">
          View data customer-wise and product-wise
        </p>
      </div>

      <Tabs defaultValue="customer-wise">
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
          <TabsTrigger
            value="customer-wise"
            className="flex items-center gap-1.5"
            data-ocid="reports.customer.tab"
          >
            <Users className="h-4 w-4" />
            Customer Wise
          </TabsTrigger>
          <TabsTrigger
            value="product-wise"
            className="flex items-center gap-1.5"
            data-ocid="reports.product.tab"
          >
            <Package className="h-4 w-4" />
            Product Wise
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customer-wise" className="mt-4">
          <CustomerWiseTab />
        </TabsContent>

        <TabsContent value="product-wise" className="mt-4">
          <ProductWiseTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  DollarSign,
  FileText,
  Package,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import type React from "react";
import {
  useGetAllCustomers,
  useGetAllInvoices,
  useGetAllProducts,
  useGetAllVendors,
} from "../hooks/useQueries";
import { formatCurrency } from "../lib/currencyUtils";
import type { TabName } from "../pages/Dashboard";

interface DashboardOverviewProps {
  onNavigate: (tab: TabName) => void;
}

export default function DashboardOverview({
  onNavigate,
}: DashboardOverviewProps) {
  const { data: customers, isLoading: customersLoading } = useGetAllCustomers();
  const { data: vendors, isLoading: vendorsLoading } = useGetAllVendors();
  const { data: products, isLoading: productsLoading } = useGetAllProducts();
  const { data: invoices, isLoading: invoicesLoading } = useGetAllInvoices();

  const totalInvoiceAmount =
    invoices?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0;
  const paidInvoices =
    invoices?.filter((inv) => inv.status === "paid").length || 0;
  const pendingInvoices =
    invoices?.filter((inv) => inv.status === "pending").length || 0;
  const lowStockProducts =
    products?.filter((p) => Number(p.stock) < 10).length || 0;

  const stats: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    loading: boolean;
    gradient: string;
    bgGradient: string;
    subtitle?: string;
    navigateTo?: TabName;
    ocid?: string;
  }[] = [
    {
      title: "Total Customers",
      value: customers?.length || 0,
      icon: Users,
      loading: customersLoading,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-500/10 to-cyan-500/10",
      navigateTo: "customers",
      ocid: "dashboard.customers.card",
    },
    {
      title: "Total Vendors",
      value: vendors?.length || 0,
      icon: Building2,
      loading: vendorsLoading,
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-500/10 to-pink-500/10",
      subtitle: undefined,
      navigateTo: "vendors",
      ocid: "dashboard.vendors.card",
    },
    {
      title: "Products",
      value: products?.length || 0,
      icon: Package,
      loading: productsLoading,
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-500/10 to-emerald-500/10",
      subtitle:
        lowStockProducts > 0 ? `${lowStockProducts} low stock` : undefined,
      navigateTo: "products",
      ocid: "dashboard.products.card",
    },
    {
      title: "Total Invoices",
      value: invoices?.length || 0,
      icon: FileText,
      loading: invoicesLoading,
      gradient: "from-orange-500 to-amber-500",
      bgGradient: "from-orange-500/10 to-amber-500/10",
      subtitle: `${paidInvoices} paid, ${pendingInvoices} pending`,
      navigateTo: "invoices",
      ocid: "dashboard.invoices.card",
    },
    {
      title: "Total Revenue",
      value: formatCurrency(totalInvoiceAmount),
      icon: DollarSign,
      loading: invoicesLoading,
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-500/10 to-teal-500/10",
      navigateTo: "invoices",
      ocid: "dashboard.revenue.card",
    },
    {
      title: "Growth",
      value: "+12.5%",
      icon: TrendingUp,
      loading: false,
      gradient: "from-cyan-500 to-blue-500",
      bgGradient: "from-cyan-500/10 to-blue-500/10",
      subtitle: "vs last month",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent flex items-center gap-2">
          Dashboard Overview
          <Sparkles className="h-7 w-7 text-accent" />
        </h2>
        <p className="text-lg text-muted-foreground">
          Welcome to ARAA TRADE LUBES! Here's what's happening with your
          business.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            data-ocid={stat.ocid}
            className={`border-2 border-primary/10 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-primary/30 bg-gradient-to-br from-card to-card/50${stat.navigateTo ? " cursor-pointer" : ""}`}
            onClick={
              stat.navigateTo
                ? () => onNavigate(stat.navigateTo as TabName)
                : undefined
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-foreground/80">
                {stat.title}
              </CardTitle>
              <div
                className={`rounded-xl p-2.5 bg-gradient-to-br ${stat.bgGradient} border border-primary/10`}
              >
                <stat.icon
                  className={`h-5 w-5 bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`}
                  style={{ WebkitTextFillColor: "transparent" }}
                />
              </div>
            </CardHeader>
            <CardContent>
              {stat.loading ? (
                <Skeleton className="h-9 w-28" />
              ) : (
                <>
                  <div className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                      {stat.subtitle}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="border-2 border-primary/10 bg-gradient-to-br from-card to-primary/5">
          <CardHeader>
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoices?.slice(0, 5).map((invoice) => {
                const customer = customers?.find(
                  (c) => c.id === invoice.customerId,
                );
                return (
                  <div
                    key={Number(invoice.id)}
                    className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 hover:bg-muted/30 -mx-2 px-2 py-1 rounded-lg transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-foreground">
                        {customer?.name || "Unknown Customer"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Invoice #{Number(invoice.id)} -{" "}
                        <span className="font-semibold text-accent">
                          {formatCurrency(invoice.total)}
                        </span>
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
                        invoice.status === "paid"
                          ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-700 dark:text-green-400 border border-green-500/30"
                          : invoice.status === "pending"
                            ? "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30"
                            : "bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-700 dark:text-red-400 border border-red-500/30"
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                );
              })}
              {(!invoices || invoices.length === 0) && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/10 bg-gradient-to-br from-card to-secondary/5">
          <CardHeader>
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <button
                type="button"
                data-ocid="quick.customers.button"
                onClick={() => onNavigate("customers")}
                className="flex items-center gap-3 rounded-xl border-2 border-primary/20 p-4 hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/10 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md w-full text-left"
              >
                <img
                  src="/assets/generated/customer-icon-transparent.dim_64x64.png"
                  alt=""
                  className="h-10 w-10"
                />
                <div>
                  <p className="font-semibold text-foreground">
                    Add New Customer
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Create a customer profile
                  </p>
                </div>
              </button>
              <button
                type="button"
                data-ocid="quick.invoices.button"
                onClick={() => onNavigate("invoices")}
                className="flex items-center gap-3 rounded-xl border-2 border-primary/20 p-4 hover:bg-gradient-to-r hover:from-accent/10 hover:to-primary/10 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md w-full text-left"
              >
                <img
                  src="/assets/generated/invoice-icon-transparent.dim_64x64.png"
                  alt=""
                  className="h-10 w-10"
                />
                <div>
                  <p className="font-semibold text-foreground">
                    Create Invoice
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Generate a new invoice
                  </p>
                </div>
              </button>
              <button
                type="button"
                data-ocid="quick.products.button"
                onClick={() => onNavigate("products")}
                className="flex items-center gap-3 rounded-xl border-2 border-primary/20 p-4 hover:bg-gradient-to-r hover:from-secondary/10 hover:to-accent/10 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md w-full text-left"
              >
                <img
                  src="/assets/generated/product-icon-transparent.dim_64x64.png"
                  alt=""
                  className="h-10 w-10"
                />
                <div>
                  <p className="font-semibold text-foreground">Add Product</p>
                  <p className="text-xs text-muted-foreground">
                    Add to inventory
                  </p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

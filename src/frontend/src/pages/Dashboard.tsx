import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart2,
  Building2,
  Download,
  FileText,
  LayoutDashboard,
  Package,
  Users,
} from "lucide-react";
import { useState } from "react";
import CustomersTab from "../components/CustomersTab";
import DashboardOverview from "../components/DashboardOverview";
import DataExport from "../components/DataExport";
import InvoicesTab from "../components/InvoicesTab";
import ProductsTab from "../components/ProductsTab";
import ReportsTab from "../components/ReportsTab";
import VendorsTab from "../components/VendorsTab";

export type TabName =
  | "overview"
  | "customers"
  | "vendors"
  | "products"
  | "invoices"
  | "export"
  | "reports";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabName>("overview");

  return (
    <div className="container py-8">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabName)}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 gap-2">
          <TabsTrigger
            value="overview"
            className="flex items-center gap-2"
            data-ocid="nav.overview.tab"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="customers"
            className="flex items-center gap-2"
            data-ocid="nav.customers.tab"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Customers</span>
          </TabsTrigger>
          <TabsTrigger
            value="vendors"
            className="flex items-center gap-2"
            data-ocid="nav.vendors.tab"
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Vendors</span>
          </TabsTrigger>
          <TabsTrigger
            value="products"
            className="flex items-center gap-2"
            data-ocid="nav.products.tab"
          >
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Products</span>
          </TabsTrigger>
          <TabsTrigger
            value="invoices"
            className="flex items-center gap-2"
            data-ocid="nav.invoices.tab"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Invoices</span>
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="flex items-center gap-2"
            data-ocid="nav.reports.tab"
          >
            <BarChart2 className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger
            value="export"
            className="flex items-center gap-2"
            data-ocid="nav.export.tab"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <DashboardOverview onNavigate={setActiveTab} />
        </TabsContent>

        <TabsContent value="customers">
          <CustomersTab />
        </TabsContent>

        <TabsContent value="vendors">
          <VendorsTab />
        </TabsContent>

        <TabsContent value="products">
          <ProductsTab />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesTab />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>

        <TabsContent value="export">
          <DataExport />
        </TabsContent>
      </Tabs>
    </div>
  );
}

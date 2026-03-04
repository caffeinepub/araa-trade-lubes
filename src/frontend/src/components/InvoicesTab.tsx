import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import type { Invoice, Product } from "../backend";
import {
  useAddInvoice,
  useDeleteInvoice,
  useGetAllCustomers,
  useGetAllInvoices,
  useGetAllProducts,
  useRecordPayment,
} from "../hooks/useQueries";
import { formatCurrency } from "../lib/currencyUtils";
import {
  type GstLineItem,
  calculateLineItemGst,
  calculateSummaryFromBreakups,
  formatPaiseToINR,
} from "../lib/gstUtils";
import InvoiceDetails from "./InvoiceDetails";

let lineItemCounter = 0;
function nextLineItemId() {
  lineItemCounter += 1;
  return lineItemCounter;
}

interface InvoiceLineItem {
  uid: number;
  productId: bigint;
  quantity: number;
  price: number; // in rupees (display)
}

export default function InvoicesTab() {
  const queryClient = useQueryClient();
  const { data: invoices = [], isLoading: invoicesLoading } =
    useGetAllInvoices();
  const { data: customers = [] } = useGetAllCustomers();
  const { data: products = [] } = useGetAllProducts();

  const addInvoiceMutation = useAddInvoice();
  const deleteInvoiceMutation = useDeleteInvoice();
  const recordPaymentMutation = useRecordPayment();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<bigint | null>(null);

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { uid: nextLineItemId(), productId: 0n, quantity: 1, price: 0 },
  ]);
  const [paymentAmount, setPaymentAmount] = useState<string>("");

  const getCustomerName = (customerId: bigint) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer ? customer.name : `Customer #${customerId}`;
  };

  const getProductById = (productId: bigint): Product | undefined => {
    return products.find((p) => p.id === productId);
  };

  const getStatusBadge = (status: Invoice["status"]) => {
    const statusStr =
      typeof status === "object" ? Object.keys(status)[0] : String(status);
    switch (statusStr) {
      case "paid":
        return (
          <Badge className="bg-success/20 text-success border-success/30">
            Paid
          </Badge>
        );
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      { uid: nextLineItemId(), productId: 0n, quantity: 1, price: 0 },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === BigInt(productId));
    const updatedItems = [...lineItems];
    updatedItems[index] = {
      ...updatedItems[index],
      productId: product ? product.id : 0n,
      // price in rupees for display; backend stores in paise
      price: product ? Number(product.price) / 100 : 0,
    };
    setLineItems(updatedItems);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], quantity };
    setLineItems(updatedItems);
  };

  const handlePriceChange = (index: number, price: number) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], price };
    setLineItems(updatedItems);
  };

  /**
   * Build GstLineItem array from current form state for preview.
   * Prices are entered in rupees; convert to paise for calculation.
   */
  const buildGstLineItems = (): GstLineItem[] => {
    return lineItems
      .filter((item) => item.productId !== 0n)
      .map((item) => {
        const product = getProductById(item.productId);
        return {
          price: BigInt(Math.round(item.price * 100)), // rupees -> paise
          quantity: BigInt(item.quantity),
          taxRate: product ? product.taxRate : 0n,
          hsnSacCode: product ? product.hsnSacCode : "",
        };
      });
  };

  const previewSummary =
    buildGstLineItems().length > 0
      ? (() => {
          const items = buildGstLineItems();
          let taxableAmount = 0n;
          let cgst = 0n;
          let sgst = 0n;
          let igst = 0n;
          for (const item of items) {
            const b = calculateLineItemGst(item);
            taxableAmount += b.taxableAmount;
            cgst += b.cgst;
            sgst += b.sgst;
            igst += b.igst;
          }
          const totalTax = cgst + sgst + igst;
          const totalAmount = taxableAmount + totalTax;
          return { taxableAmount, cgst, sgst, igst, totalTax, totalAmount };
        })()
      : null;

  const handleCreateInvoice = async () => {
    if (!selectedCustomerId) {
      toast.error("Please select a customer");
      return;
    }
    const validItems = lineItems.filter(
      (item) => item.productId !== 0n && item.quantity > 0,
    );
    if (validItems.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    try {
      await addInvoiceMutation.mutateAsync({
        customerId: BigInt(selectedCustomerId),
        items: validItems.map((item) => ({
          productId: item.productId,
          quantity: BigInt(item.quantity),
          // price in paise (backend expects paise)
          price: BigInt(Math.round(item.price * 100)),
        })),
      });
      toast.success("Invoice created successfully");
      setIsAddDialogOpen(false);
      setSelectedCustomerId("");
      setLineItems([
        { uid: nextLineItemId(), productId: 0n, quantity: 1, price: 0 },
      ]);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    } catch (error) {
      console.error("Failed to create invoice:", error);
      toast.error("Failed to create invoice. Please try again.");
    }
  };

  const handleDeleteInvoice = async () => {
    if (invoiceToDelete === null) return;
    try {
      await deleteInvoiceMutation.mutateAsync(invoiceToDelete);
      toast.success("Invoice deleted successfully");
      setIsDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    } catch (error) {
      console.error("Failed to delete invoice:", error);
      toast.error("Failed to delete invoice. Please try again.");
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;
    const parsedAmount = Number.parseFloat(paymentAmount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }
    try {
      // paymentAmount entered in rupees; convert to paise
      const amountPaise = BigInt(Math.round(parsedAmount * 100));
      await recordPaymentMutation.mutateAsync({
        invoiceId: selectedInvoice.id,
        amount: amountPaise,
      });
      toast.success(
        `Payment of ₹${parsedAmount.toFixed(2)} recorded for Invoice #${String(selectedInvoice.id)}`,
      );
      setIsPaymentDialogOpen(false);
      setPaymentAmount("");
      setSelectedInvoice(null);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customerFinancialSummary"] });
      queryClient.invalidateQueries({ queryKey: ["customerStatement"] });
    } catch (error) {
      console.error("Failed to record payment:", error);
      toast.error(
        "Failed to record payment. Please check the amount and try again.",
      );
    }
  };

  const openPaymentDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPaymentDialogOpen(true);
  };

  const openDetailsDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailsDialogOpen(true);
  };

  const openDeleteDialog = (invoiceId: bigint) => {
    setInvoiceToDelete(invoiceId);
    setIsDeleteDialogOpen(true);
  };

  /**
   * Format invoice total (stored in paise) to INR display string.
   */
  const formatInvoiceTotal = (total: bigint): string => {
    return formatPaiseToINR(total);
  };

  if (invoicesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Invoices</h2>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Invoice
        </Button>
      </div>

      {/* Invoice Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Taxable Amt</TableHead>
              <TableHead>CGST</TableHead>
              <TableHead>SGST</TableHead>
              <TableHead>IGST</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center py-8 text-muted-foreground"
                >
                  No invoices found. Create your first invoice.
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => {
                const summary = calculateSummaryFromBreakups(
                  invoice.gstBreakups,
                );
                return (
                  <TableRow
                    key={String(invoice.id)}
                    className="hover:bg-muted/30"
                  >
                    <TableCell className="font-medium">
                      #{String(invoice.id)}
                    </TableCell>
                    <TableCell>{getCustomerName(invoice.customerId)}</TableCell>
                    <TableCell>
                      {new Date(
                        Number(invoice.createdAt) / 1_000_000,
                      ).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell>
                      {formatPaiseToINR(summary.taxableAmount)}
                    </TableCell>
                    <TableCell>{formatPaiseToINR(summary.cgst)}</TableCell>
                    <TableCell>{formatPaiseToINR(summary.sgst)}</TableCell>
                    <TableCell>{formatPaiseToINR(summary.igst)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatInvoiceTotal(invoice.total)}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDetailsDialog(invoice)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPaymentDialog(invoice)}
                          title="Record Payment"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(invoice.id)}
                          title="Delete Invoice"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Invoice Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <select
                id="customer"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={String(customer.id)} value={String(customer.id)}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <Label>Line Items</Label>
              {lineItems.map((item, index) => {
                const product = getProductById(item.productId);
                return (
                  <div
                    key={item.uid}
                    className="grid grid-cols-12 gap-2 items-end"
                  >
                    <div className="col-span-5">
                      <Label className="text-xs text-muted-foreground">
                        Product
                      </Label>
                      <select
                        value={
                          item.productId === 0n ? "" : String(item.productId)
                        }
                        onChange={(e) =>
                          handleProductChange(index, e.target.value)
                        }
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select product</option>
                        {products.map((p) => (
                          <option key={String(p.id)} value={String(p.id)}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">
                        Qty
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleQuantityChange(
                            index,
                            Number.parseInt(e.target.value) || 1,
                          )
                        }
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs text-muted-foreground">
                        Price (₹)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) =>
                          handlePriceChange(
                            index,
                            Number.parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs text-muted-foreground">
                        GST%
                      </Label>
                      <div className="py-2 text-sm text-muted-foreground">
                        {product ? `${Number(product.taxRate) / 100}%` : "-"}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLineItem(index)}
                        disabled={lineItems.length === 1}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddLineItem}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>

            {/* GST Preview */}
            {previewSummary && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                <h4 className="font-medium text-sm">GST Preview</h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Taxable Amount:
                    </span>
                    <span>
                      {formatPaiseToINR(previewSummary.taxableAmount)}
                    </span>
                  </div>
                  {previewSummary.cgst > 0n && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CGST:</span>
                        <span>{formatPaiseToINR(previewSummary.cgst)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SGST:</span>
                        <span>{formatPaiseToINR(previewSummary.sgst)}</span>
                      </div>
                    </>
                  )}
                  {previewSummary.igst > 0n && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IGST:</span>
                      <span>{formatPaiseToINR(previewSummary.igst)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1">
                    <span>Grand Total:</span>
                    <span>{formatPaiseToINR(previewSummary.totalAmount)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateInvoice}
              disabled={
                !selectedCustomerId ||
                lineItems.every((i) => i.productId === 0n) ||
                addInvoiceMutation.isPending
              }
            >
              {addInvoiceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Invoice"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent data-ocid="invoice.record_payment.dialog">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/30 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice #:</span>
                  <span className="font-medium">
                    {String(selectedInvoice.id)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span>{getCustomerName(selectedInvoice.customerId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Total:</span>
                  <span className="font-semibold">
                    {formatInvoiceTotal(selectedInvoice.total)}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Payment Amount (₹)</Label>
                <Input
                  id="paymentAmount"
                  data-ocid="invoice.payment_amount.input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter amount in rupees"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              data-ocid="invoice.record_payment.cancel_button"
              onClick={() => setIsPaymentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="invoice.record_payment.submit_button"
              onClick={handleRecordPayment}
              disabled={!paymentAmount || recordPaymentMutation.isPending}
            >
              {recordPaymentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Recording...
                </>
              ) : (
                "Record Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvoice}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteInvoiceMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invoice Details Dialog */}
      {selectedInvoice && (
        <InvoiceDetails
          invoice={selectedInvoice}
          open={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
          customers={customers}
          products={products}
        />
      )}
    </div>
  );
}

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Edit,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Product } from "../backend";
import {
  useAddProduct,
  useDeleteProduct,
  useFindProductsByName,
  useGetAllProducts,
  useUpdateProduct,
} from "../hooks/useQueries";
import { formatCurrency } from "../lib/currencyUtils";

/** GST rates in percent (e.g. 18 = 18%). Stored in backend as basis points (1800). */
const GST_RATES = [0, 5, 12, 18, 28];

export default function ProductsTab() {
  const { data: products, isLoading } = useGetAllProducts();
  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const findProducts = useFindProductsByName();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[] | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    sku: "",
    stock: "",
    hsnSacCode: "",
    taxRate: "18",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      sku: "",
      stock: "",
      hsnSacCode: "",
      taxRate: "18",
    });
  };

  /**
   * Convert display percent (e.g. "18") to basis points bigint (1800n).
   * Backend formula: (taxableAmount * taxRate) / 10000
   * So 18% → taxRate = 1800 → 1800/10000 = 18% ✓
   */
  const percentToBasisPoints = (percent: string): bigint => {
    const pct = Number.parseFloat(percent) || 0;
    return BigInt(Math.round(pct * 100));
  };

  /**
   * Convert basis points bigint (1800n) to display percent string ("18").
   */
  const basisPointsToPercent = (bp: bigint): string => {
    return (Number(bp) / 100).toString();
  };

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.price || !formData.stock) {
      toast.error("Name, price, and stock are required");
      return;
    }

    try {
      await addProduct.mutateAsync({
        name: formData.name,
        description: formData.description,
        price: BigInt(Math.round(Number.parseFloat(formData.price) * 100)),
        sku: formData.sku,
        stock: BigInt(formData.stock),
        hsnSacCode: formData.hsnSacCode,
        taxRate: percentToBasisPoints(formData.taxRate),
      });
      toast.success("Product added successfully");
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to add product");
      console.error(error);
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: (Number(product.price) / 100).toString(),
      sku: product.sku,
      stock: product.stock.toString(),
      hsnSacCode: product.hsnSacCode || "",
      // Convert stored basis points back to percent for display
      taxRate: basisPointsToPercent(product.taxRate),
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (
      !selectedProduct ||
      !formData.name.trim() ||
      !formData.price ||
      !formData.stock
    ) {
      toast.error("Name, price, and stock are required");
      return;
    }

    try {
      await updateProduct.mutateAsync({
        id: selectedProduct.id,
        name: formData.name,
        description: formData.description,
        price: BigInt(Math.round(Number.parseFloat(formData.price) * 100)),
        sku: formData.sku,
        stock: BigInt(formData.stock),
        hsnSacCode: formData.hsnSacCode,
        taxRate: percentToBasisPoints(formData.taxRate),
      });
      toast.success("Product updated successfully");
      setIsEditDialogOpen(false);
      setSelectedProduct(null);
      resetForm();
    } catch (error) {
      toast.error("Failed to update product");
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;

    try {
      await deleteProduct.mutateAsync(selectedProduct.id);
      toast.success("Product deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      toast.error("Failed to delete product");
      console.error(error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      const results = await findProducts.mutateAsync(searchQuery);
      setSearchResults(results);
    } catch (error) {
      toast.error("Search failed");
      console.error(error);
    }
  };

  const displayProducts = searchResults || products || [];

  const productFormFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="prod-name">Name *</Label>
        <Input
          id="prod-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Product Name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="prod-description">Description</Label>
        <Textarea
          id="prod-description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Product description"
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="prod-price">Price (₹) *</Label>
          <Input
            id="prod-price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) =>
              setFormData({ ...formData, price: e.target.value })
            }
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prod-stock">Stock *</Label>
          <Input
            id="prod-stock"
            type="number"
            value={formData.stock}
            onChange={(e) =>
              setFormData({ ...formData, stock: e.target.value })
            }
            placeholder="0"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="prod-sku">SKU</Label>
          <Input
            id="prod-sku"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            placeholder="SKU-001"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prod-hsn">HSN/SAC Code</Label>
          <Input
            id="prod-hsn"
            value={formData.hsnSacCode}
            onChange={(e) =>
              setFormData({ ...formData, hsnSacCode: e.target.value })
            }
            placeholder="e.g. 27101990"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="prod-taxRate">GST Rate (%)</Label>
        <Select
          value={formData.taxRate}
          onValueChange={(val) => setFormData({ ...formData, taxRate: val })}
        >
          <SelectTrigger id="prod-taxRate">
            <SelectValue placeholder="Select GST rate" />
          </SelectTrigger>
          <SelectContent>
            {GST_RATES.map((rate) => (
              <SelectItem key={rate} value={rate.toString()}>
                {rate}%
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground">Manage your product inventory</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>Enter product details below</DialogDescription>
            </DialogHeader>
            {productFormFields}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={addProduct.isPending}>
                {addProduct.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={findProducts.isPending}>
              {findProducts.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
            {searchResults && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchResults(null);
                  setSearchQuery("");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product List ({displayProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchResults
                ? "No products found"
                : "No products yet. Add your first product!"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>HSN/SAC</TableHead>
                    <TableHead>GST%</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayProducts.map((product) => (
                    <TableRow key={Number(product.id)}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.description && (
                            <p className="text-sm text-muted-foreground">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{product.sku || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {product.hsnSacCode || "-"}
                      </TableCell>
                      {/* taxRate stored as basis points (1800 = 18%); divide by 100 for display */}
                      <TableCell>{Number(product.taxRate) / 100}%</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(product.price)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{Number(product.stock)}</span>
                          {Number(product.stock) < 10 && (
                            <Badge
                              variant="destructive"
                              className="flex items-center gap-1"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              Low
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(product);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product details</DialogDescription>
          </DialogHeader>
          {productFormFields}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateProduct.isPending}>
              {updateProduct.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the product "{selectedProduct?.name}
              ". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteProduct.isPending}
            >
              {deleteProduct.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

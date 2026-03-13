import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Customer,
  CustomerStatementEntry,
  FinancialSummary,
  Invoice,
  InvoiceItem,
  Payment,
  Product,
  UserProfile,
  Vendor,
} from "../backend";
import { useActor } from "./useActor";

// ─── User Profile ────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// ─── Customers ───────────────────────────────────────────────────────────────

export function useGetAllCustomers() {
  const { actor, isFetching } = useActor();

  return useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllCustomers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddCustomer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      phone: string;
      email: string;
      address: string;
      gstNumber: string;
      state: string | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addCustomer(
        params.name,
        params.phone,
        params.email,
        params.address,
        params.gstNumber,
        params.state,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: bigint;
      name: string;
      phone: string;
      email: string;
      address: string;
      gstNumber: string;
      state: string | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateCustomer(
        params.id,
        params.name,
        params.phone,
        params.email,
        params.address,
        params.gstNumber,
        params.state,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customerFinancialSummary"] });
      queryClient.invalidateQueries({ queryKey: ["customerStatement"] });
    },
  });
}

export function useDeleteCustomer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteCustomer(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customerFinancialSummary"] });
      queryClient.invalidateQueries({ queryKey: ["customerStatement"] });
    },
  });
}

export function useFindCustomersByName() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.findCustomersByName(name);
    },
  });
}

// ─── Vendors ─────────────────────────────────────────────────────────────────

export function useGetAllVendors() {
  const { actor, isFetching } = useActor();

  return useQuery<Vendor[]>({
    queryKey: ["vendors"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllVendors();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddVendor() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      phone: string;
      email: string;
      address: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addVendor(
        params.name,
        params.phone,
        params.email,
        params.address,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}

export function useUpdateVendor() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: bigint;
      name: string;
      phone: string;
      email: string;
      address: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateVendor(
        params.id,
        params.name,
        params.phone,
        params.email,
        params.address,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}

export function useDeleteVendor() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteVendor(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });
}

export function useFindVendorsByName() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.findVendorsByName(name);
    },
  });
}

// ─── Products ─────────────────────────────────────────────────────────────────

export function useGetAllProducts() {
  const { actor, isFetching } = useActor();

  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllProducts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      description: string;
      price: bigint;
      sku: string;
      stock: bigint;
      hsnSacCode: string;
      taxRate: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addProduct(
        params.name,
        params.description,
        params.price,
        params.sku,
        params.stock,
        params.hsnSacCode,
        params.taxRate,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: bigint;
      name: string;
      description: string;
      price: bigint;
      sku: string;
      stock: bigint;
      hsnSacCode: string;
      taxRate: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateProduct(
        params.id,
        params.name,
        params.description,
        params.price,
        params.sku,
        params.stock,
        params.hsnSacCode,
        params.taxRate,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteProduct(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useFindProductsByName() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.findProductsByName(name);
    },
  });
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export function useGetAllInvoices() {
  const { actor, isFetching } = useActor();

  return useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllInvoices();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetInvoice(invoiceId: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<Invoice>({
    queryKey: ["invoice", invoiceId.toString()],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getInvoice(invoiceId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      customerId: bigint;
      items: InvoiceItem[];
      invoiceDate?: Date;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const invoiceDateNs: [bigint] | [] = params.invoiceDate
        ? [BigInt(params.invoiceDate.getTime()) * 1_000_000n]
        : [];
      return (actor as any).addInvoice(
        params.customerId,
        params.items,
        invoiceDateNs,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customerFinancialSummary"] });
      queryClient.invalidateQueries({ queryKey: ["customerStatement"] });
    },
  });
}

export function useDeleteInvoice() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteInvoice(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customerFinancialSummary"] });
      queryClient.invalidateQueries({ queryKey: ["customerStatement"] });
    },
  });
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export function useGetAllPayments() {
  const { actor, isFetching } = useActor();

  return useQuery<Payment[]>({
    queryKey: ["payments"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPayments();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useRecordPayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      invoiceId: bigint;
      amount: bigint;
      paymentDate?: Date;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const paymentDateNs: [bigint] | [] = params.paymentDate
        ? [BigInt(params.paymentDate.getTime()) * 1_000_000n]
        : [];
      return (actor as any).recordPayment(
        params.invoiceId,
        params.amount,
        paymentDateNs,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customerFinancialSummary"] });
      queryClient.invalidateQueries({ queryKey: ["customerStatement"] });
    },
  });
}

// ─── Customer Financial Summary ───────────────────────────────────────────────

export function useGetCustomerFinancialSummary(customerId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<FinancialSummary>({
    queryKey: ["customerFinancialSummary", customerId?.toString()],
    queryFn: async () => {
      if (!actor || !customerId)
        throw new Error("Actor or customerId not available");
      return actor.getCustomerFinancialSummary(customerId);
    },
    enabled: !!actor && !isFetching && customerId !== null,
  });
}

// ─── Customer Statement ───────────────────────────────────────────────────────

export function useGetCustomerStatement(customerId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<CustomerStatementEntry[]>({
    queryKey: ["customerStatement", customerId?.toString()],
    queryFn: async () => {
      if (!actor || !customerId)
        throw new Error("Actor or customerId not available");
      return actor.getCustomerStatement(customerId);
    },
    enabled: !!actor && !isFetching && customerId !== null,
  });
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

export function useGenerateWhatsappLink() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (params: { phone: string; message: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.generateWhatsappMessageLink(params.phone, params.message);
    },
  });
}

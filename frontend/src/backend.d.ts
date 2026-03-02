import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Product {
    id: bigint;
    sku: string;
    name: string;
    createdAt: Time;
    description: string;
    updatedAt: Time;
    stock: bigint;
    price: bigint;
    hsnSacCode: string;
    taxRate: bigint;
}
export interface InvoiceItem {
    productId: bigint;
    quantity: bigint;
    price: bigint;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export type Time = bigint;
export interface FinancialSummary {
    payments: Array<Payment>;
    invoices: Array<Invoice>;
    outstandingBalance: bigint;
}
export interface CompanyInfo {
    gstNumber: string;
    state: string;
    address: string;
}
export interface Payment {
    id: bigint;
    date: Time;
    invoiceId: bigint;
    amount: bigint;
}
export interface Invoice {
    id: bigint;
    status: InvoiceStatus;
    total: bigint;
    createdAt: Time;
    updatedAt: Time;
    gstBreakups: Array<GstBreakup>;
    customerId: bigint;
    items: Array<InvoiceItem>;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface GstBreakup {
    taxableAmount: bigint;
    cgst: bigint;
    igst: bigint;
    sgst: bigint;
    totalTax: bigint;
    totalAmount: bigint;
}
export interface CustomerStatementEntry {
    transactionType: Variant_sale_payment;
    date: Time;
    description: string;
    runningBalance: bigint;
    amount: bigint;
}
export interface Customer {
    id: bigint;
    gstNumber: string;
    name: string;
    createdAt: Time;
    email: string;
    updatedAt: Time;
    state?: string;
    address: string;
    phone: string;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export interface Vendor {
    id: bigint;
    name: string;
    createdAt: Time;
    email: string;
    updatedAt: Time;
    address: string;
    phone: string;
}
export interface UserProfile {
    name: string;
    businessName: string;
    companyInfo?: CompanyInfo;
}
export enum InvoiceStatus {
    pending = "pending",
    paid = "paid",
    overdue = "overdue"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_sale_payment {
    sale = "sale",
    payment = "payment"
}
export interface backendInterface {
    addCustomer(name: string, phone: string, email: string, address: string, gstNumber: string, state: string | null): Promise<bigint>;
    addInvoice(customerId: bigint, items: Array<InvoiceItem>): Promise<bigint>;
    addProduct(name: string, description: string, price: bigint, sku: string, stock: bigint, hsnSacCode: string, taxRate: bigint): Promise<bigint>;
    addVendor(name: string, phone: string, email: string, address: string): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    deleteCustomer(id: bigint): Promise<void>;
    deleteInvoice(id: bigint): Promise<void>;
    deleteProduct(id: bigint): Promise<void>;
    deleteVendor(id: bigint): Promise<void>;
    findCustomersByName(name: string): Promise<Array<Customer>>;
    findProductsByName(name: string): Promise<Array<Product>>;
    findVendorsByName(name: string): Promise<Array<Vendor>>;
    generateWhatsappMessageLink(phone: string, message: string): Promise<string>;
    getAllCustomers(): Promise<Array<Customer>>;
    getAllInvoices(): Promise<Array<Invoice>>;
    getAllPayments(): Promise<Array<Payment>>;
    getAllProducts(): Promise<Array<Product>>;
    getAllVendors(): Promise<Array<Vendor>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCustomer(id: bigint): Promise<Customer>;
    getCustomerFinancialSummary(customerId: bigint): Promise<FinancialSummary>;
    getCustomerStatement(customerId: bigint): Promise<Array<CustomerStatementEntry>>;
    getInvoice(id: bigint): Promise<Invoice>;
    getProduct(id: bigint): Promise<Product>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVendor(id: bigint): Promise<Vendor>;
    isCallerAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    recordPayment(invoiceId: bigint, amount: bigint): Promise<bigint>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateCustomer(id: bigint, name: string, phone: string, email: string, address: string, gstNumber: string, state: string | null): Promise<void>;
    updateProduct(id: bigint, name: string, description: string, price: bigint, sku: string, stock: bigint, hsnSacCode: string, taxRate: bigint): Promise<void>;
    updateVendor(id: bigint, name: string, phone: string, email: string, address: string): Promise<void>;
}

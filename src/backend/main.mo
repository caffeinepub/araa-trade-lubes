import Text "mo:core/Text";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import List "mo:core/List";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Order "mo:core/Order";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import OutCall "http-outcalls/outcall";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import Stripe "stripe/stripe";

actor {
  // Initialize the access control state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  public type CompanyInfo = {
    address : Text;
    gstNumber : Text;
    state : Text;
  };

  public type Customer = {
    id : Nat;
    name : Text;
    phone : Text;
    email : Text;
    address : Text;
    gstNumber : Text;
    state : ?Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  public type Vendor = {
    id : Nat;
    name : Text;
    phone : Text;
    email : Text;
    address : Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  public type Product = {
    id : Nat;
    name : Text;
    description : Text;
    price : Nat;
    sku : Text;
    stock : Nat;
    hsnSacCode : Text;
    taxRate : Int;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  public type GstBreakup = {
    taxableAmount : Int;
    sgst : Int;
    cgst : Int;
    igst : Int;
    totalTax : Int;
    totalAmount : Int;
  };

  public type Invoice = {
    id : Nat;
    customerId : Nat;
    items : [InvoiceItem];
    total : Int;
    gstBreakups : [GstBreakup];
    status : InvoiceStatus;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  public type InvoiceItem = {
    productId : Nat;
    quantity : Nat;
    price : Int;
  };

  public type Payment = {
    id : Nat;
    invoiceId : Nat;
    amount : Int;
    date : Time.Time;
  };

  public type Transaction = {
    id : Nat;
    amount : Int;
    date : Time.Time;
  };

  public type InvoiceStatus = {
    #pending;
    #paid;
    #overdue;
  };

  public type FinancialSummary = {
    invoices : [Invoice];
    payments : [Payment];
    outstandingBalance : Int;
  };

  public type UserProfile = {
    name : Text;
    businessName : Text;
    companyInfo : ?CompanyInfo;
  };

  public type CustomerStatementEntry = {
    transactionType : {
      #sale;
      #payment;
    };
    date : Time.Time;
    amount : Int;
    runningBalance : Int;
    description : Text;
  };

  module Customer {
    public func compareByName(customer1 : Customer, customer2 : Customer) : Order.Order {
      Text.compare(customer1.name, customer2.name);
    };
  };

  module Vendor {
    public func compareByName(vendor1 : Vendor, vendor2 : Vendor) : Order.Order {
      Text.compare(vendor1.name, vendor2.name);
    };
  };

  module Product {
    public func compareByName(product1 : Product, product2 : Product) : Order.Order {
      Text.compare(product1.name, product2.name);
    };
  };

  // STABLE storage - persists across all upgrades and redeployments
  stable let customers = Map.empty<Nat, Customer>();
  stable let vendors = Map.empty<Nat, Vendor>();
  stable let products = Map.empty<Nat, Product>();
  stable let invoices = Map.empty<Nat, Invoice>();
  stable let payments = Map.empty<Nat, Payment>();
  stable let transactions = Map.empty<Nat, Transaction>();
  stable let userProfiles = Map.empty<Principal, UserProfile>();

  stable var nextCustomerId = 1;
  stable var nextVendorId = 1;
  stable var nextProductId = 1;
  stable var nextInvoiceId = 1;
  stable var nextPaymentId = 1;
  stable var nextTransactionId = 1;

  stable var stripeConfiguration : ?Stripe.StripeConfiguration = null;

  // STRIPE INTEGRATION
  public query func isStripeConfigured() : async Bool {
    stripeConfiguration != null;
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    stripeConfiguration := ?config;
  };

  public shared ({ caller }) func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get Stripe session status");
    };
    await Stripe.getSessionStatus(getStripeConfiguration(), sessionId, transform);
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create checkout sessions");
    };
    await Stripe.createCheckoutSession(getStripeConfiguration(), caller, items, successUrl, cancelUrl, transform);
  };

  func getStripeConfiguration() : Stripe.StripeConfiguration {
    switch (stripeConfiguration) {
      case (null) { Runtime.trap("Stripe needs to be first configured") };
      case (?value) { value };
    };
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // USER PROFILE FUNCTIONS

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // PUBLIC QUERIES

  public query ({ caller }) func getCustomer(id : Nat) : async Customer {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view customers");
    };
    switch (customers.get(id)) {
      case (null) { Runtime.trap("Customer not found") };
      case (?customer) { customer };
    };
  };

  public query ({ caller }) func getVendor(id : Nat) : async Vendor {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view vendors");
    };
    switch (vendors.get(id)) {
      case (null) { Runtime.trap("Vendor not found") };
      case (?vendor) { vendor };
    };
  };

  public query ({ caller }) func getProduct(id : Nat) : async Product {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view products");
    };
    switch (products.get(id)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) { product };
    };
  };

  public query ({ caller }) func getInvoice(id : Nat) : async Invoice {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view invoices");
    };
    switch (invoices.get(id)) {
      case (null) { Runtime.trap("Invoice not found") };
      case (?invoice) { invoice };
    };
  };

  // SEARCH AND FILTER

  public query ({ caller }) func findCustomersByName(name : Text) : async [Customer] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can search customers");
    };
    let filtered = customers.toArray().map(
      func((_, c)) { c }
    ).filter(
      func(c) { c.name.contains(#text name) }
    );
    filtered.sort(Customer.compareByName);
  };

  public query ({ caller }) func findVendorsByName(name : Text) : async [Vendor] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can search vendors");
    };
    let filtered = vendors.toArray().map(
      func((_, v)) { v }
    ).filter(
      func(v) { v.name.contains(#text name) }
    );
    filtered.sort(Vendor.compareByName);
  };

  public query ({ caller }) func findProductsByName(name : Text) : async [Product] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can search products");
    };
    let filtered = products.toArray().map(
      func((_, p)) { p }
    ).filter(
      func(p) { p.name.contains(#text name) }
    );
    filtered.sort(Product.compareByName);
  };

  // ADMIN/USER OPERATIONS

  public shared ({ caller }) func addCustomer(
    name : Text,
    phone : Text,
    email : Text,
    address : Text,
    gstNumber : Text,
    state : ?Text,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add customers");
    };
    let id = nextCustomerId;
    let newCustomer : Customer = {
      id;
      name;
      phone;
      email;
      address;
      gstNumber;
      state;
      createdAt = Time.now();
      updatedAt = Time.now();
    };
    customers.add(id, newCustomer);
    nextCustomerId += 1;
    id;
  };

  public shared ({ caller }) func addVendor(name : Text, phone : Text, email : Text, address : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add vendors");
    };
    let id = nextVendorId;
    let newVendor : Vendor = {
      id;
      name;
      phone;
      email;
      address;
      createdAt = Time.now();
      updatedAt = Time.now();
    };
    vendors.add(id, newVendor);
    nextVendorId += 1;
    id;
  };

  public shared ({ caller }) func addProduct(
    name : Text,
    description : Text,
    price : Nat,
    sku : Text,
    stock : Nat,
    hsnSacCode : Text,
    taxRate : Int,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add products");
    };
    let id = nextProductId;
    let newProduct : Product = {
      id;
      name;
      description;
      price;
      sku;
      stock;
      hsnSacCode;
      taxRate;
      createdAt = Time.now();
      updatedAt = Time.now();
    };
    products.add(id, newProduct);
    nextProductId += 1;
    id;
  };

  public shared ({ caller }) func addInvoice(customerId : Nat, items : [InvoiceItem], invoiceDate : ?Time.Time) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add invoices");
    };
    switch (customers.get(customerId)) {
      case (null) { Runtime.trap("Customer not found") };
      case (_) {};
    };
    var total : Int = 0;
    for (item in items.values()) {
      total += item.price * item.quantity;
    };

    let gstBreakups = calculateGstBreakup(customerId, items);
    let timestamp = switch (invoiceDate) {
      case (?d) { d };
      case (null) { Time.now() };
    };

    let id = nextInvoiceId;
    let newInvoice : Invoice = {
      id;
      customerId;
      items;
      total;
      gstBreakups;
      status = #pending;
      createdAt = timestamp;
      updatedAt = Time.now();
    };
    invoices.add(id, newInvoice);
    nextInvoiceId += 1;
    id;
  };

  public shared ({ caller }) func recordPayment(invoiceId : Nat, amount : Int, paymentDate : ?Time.Time) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can record payments");
    };
    switch (invoices.get(invoiceId)) {
      case (null) { Runtime.trap("Invoice not found") };
      case (_) {};
    };
    let timestamp = switch (paymentDate) {
      case (?d) { d };
      case (null) { Time.now() };
    };
    let id = nextPaymentId;
    let newPayment : Payment = {
      id;
      invoiceId;
      amount;
      date = timestamp;
    };
    payments.add(id, newPayment);
    nextPaymentId += 1;

    // Update invoice status
    switch (invoices.get(invoiceId)) {
      case (null) {};
      case (?invoice) {
        var totalPaid : Int = 0;
        for (p in payments.values()) {
          if (p.invoiceId == invoiceId) {
            totalPaid += p.amount;
          };
        };
        let newStatus = if (totalPaid >= invoice.total) { #paid } else { #pending };
        let updatedInvoice : Invoice = {
          id = invoice.id;
          customerId = invoice.customerId;
          items = invoice.items;
          total = invoice.total;
          gstBreakups = invoice.gstBreakups;
          status = newStatus;
          createdAt = invoice.createdAt;
          updatedAt = Time.now();
        };
        invoices.add(invoiceId, updatedInvoice);
      };
    };

    id;
  };

  public shared ({ caller }) func updateCustomer(
    id : Nat,
    name : Text,
    phone : Text,
    email : Text,
    address : Text,
    gstNumber : Text,
    state : ?Text,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update customers");
    };
    switch (customers.get(id)) {
      case (null) { Runtime.trap("Customer not found") };
      case (?customer) {
        let updatedCustomer : Customer = {
          id;
          name;
          phone;
          email;
          address;
          gstNumber;
          state;
          createdAt = customer.createdAt;
          updatedAt = Time.now();
        };
        customers.add(id, updatedCustomer);
      };
    };
  };

  public shared ({ caller }) func updateVendor(id : Nat, name : Text, phone : Text, email : Text, address : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update vendors");
    };
    switch (vendors.get(id)) {
      case (null) { Runtime.trap("Vendor not found") };
      case (?vendor) {
        let updatedVendor : Vendor = {
          id;
          name;
          phone;
          email;
          address;
          createdAt = vendor.createdAt;
          updatedAt = Time.now();
        };
        vendors.add(id, updatedVendor);
      };
    };
  };

  public shared ({ caller }) func updateProduct(
    id : Nat,
    name : Text,
    description : Text,
    price : Nat,
    sku : Text,
    stock : Nat,
    hsnSacCode : Text,
    taxRate : Int,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update products");
    };
    switch (products.get(id)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) {
        let updatedProduct : Product = {
          id;
          name;
          description;
          price;
          sku;
          stock;
          hsnSacCode;
          taxRate;
          createdAt = product.createdAt;
          updatedAt = Time.now();
        };
        products.add(id, updatedProduct);
      };
    };
  };

  // DELETE OPERATIONS

  public shared ({ caller }) func deleteCustomer(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete customers");
    };
    if (not customers.containsKey(id)) {
      Runtime.trap("Customer not found");
    };
    customers.remove(id);
  };

  public shared ({ caller }) func deleteVendor(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete vendors");
    };
    if (not vendors.containsKey(id)) {
      Runtime.trap("Vendor not found");
    };
    vendors.remove(id);
  };

  public shared ({ caller }) func deleteProduct(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete products");
    };
    if (not products.containsKey(id)) {
      Runtime.trap("Product not found");
    };
    products.remove(id);
  };

  public shared ({ caller }) func deleteInvoice(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete invoices");
    };
    if (not invoices.containsKey(id)) {
      Runtime.trap("Invoice not found");
    };
    invoices.remove(id);
  };

  public query ({ caller }) func getAllCustomers() : async [Customer] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view customers");
    };
    customers.values().toArray();
  };

  public query ({ caller }) func getAllVendors() : async [Vendor] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view vendors");
    };
    vendors.values().toArray();
  };

  public query ({ caller }) func getAllProducts() : async [Product] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view products");
    };
    products.values().toArray();
  };

  public query ({ caller }) func getAllInvoices() : async [Invoice] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view invoices");
    };
    invoices.values().toArray();
  };

  public query ({ caller }) func getAllPayments() : async [Payment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view payments");
    };
    payments.values().toArray();
  };

  // Customer Financial Summary

  public query ({ caller }) func getCustomerFinancialSummary(customerId : Nat) : async FinancialSummary {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view financial summaries");
    };

    switch (customers.get(customerId)) {
      case (null) { Runtime.trap("Customer not found") };
      case (_) {
        let customerInvoices = Array.fromIter(
          invoices.values().filter(func(invoice) { invoice.customerId == customerId })
        );

        var totalInvoices : Int = 0;
        for (invoice in customerInvoices.values()) {
          totalInvoices += invoice.total;
        };

        let customerPayments = Array.fromIter(
          payments.values().filter(func(payment) {
            switch (invoices.get(payment.invoiceId)) {
              case (null) { false };
              case (?invoice) { invoice.customerId == customerId };
            };
          })
        );

        var totalPayments : Int = 0;
        for (payment in customerPayments.values()) {
          totalPayments += payment.amount;
        };

        {
          invoices = customerInvoices;
          payments = customerPayments;
          outstandingBalance = totalInvoices - totalPayments : Int;
        };
      };
    };
  };

  // Customer Statement

  public query ({ caller }) func getCustomerStatement(customerId : Nat) : async [CustomerStatementEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view customer statements");
    };

    switch (customers.get(customerId)) {
      case (null) { Runtime.trap("Customer not found") };
      case (_) {
        let statementEntries = List.empty<CustomerStatementEntry>();
        let customerInvoices = Array.fromIter(
          invoices.values().filter(func(invoice) { invoice.customerId == customerId })
        );
        let customerPayments = Array.fromIter(
          payments.values().filter(func(payment) {
            switch (invoices.get(payment.invoiceId)) {
              case (null) { false };
              case (?invoice) { invoice.customerId == customerId };
            };
          })
        );

        var runningBalance = 0;

        for (invoice in customerInvoices.values()) {
          runningBalance += invoice.total.toNat();
          let entry : CustomerStatementEntry = {
            transactionType = #sale;
            date = invoice.createdAt;
            amount = invoice.total;
            runningBalance;
            description = "Sale - Invoice #" # invoice.id.toText();
          };
          statementEntries.add(entry);
        };

        for (payment in customerPayments.values()) {
          runningBalance -= payment.amount.toNat();
          let entry : CustomerStatementEntry = {
            transactionType = #payment;
            date = payment.date;
            amount = payment.amount;
            runningBalance;
            description = "Payment - Invoice #" # payment.invoiceId.toText();
          };
          statementEntries.add(entry);
        };

        statementEntries.toArray();
      };
    };
  };

  // Whatsapp Integration (via browser redirect)
  public query ({ caller }) func generateWhatsappMessageLink(phone : Text, message : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can generate WhatsApp links");
    };

    let formattedPhone = cleanPhoneNumber(phone);
    let encodedMessage = replaceSpaces(message);
    "https://wa.me/" # formattedPhone # "?text=" # encodedMessage;
  };

  func cleanPhoneNumber(input : Text) : Text {
    input.toArray().filter(func(char) { char.toNat32() >= 48 and char.toNat32() <= 57 }).toText();
  };

  func replaceSpaces(input : Text) : Text {
    input.toArray().map(func(c) { if (c == ' ') { '+' } else { c } }).toText();
  };

  // GST CALCULATION LOGIC
  func calculateGstBreakup(_customerId : Nat, items : [InvoiceItem]) : [GstBreakup] {
    items.map(
      func(item) {
        switch (products.get(item.productId)) {
          case (null) {
            { taxableAmount = 0; sgst = 0; cgst = 0; igst = 0; totalTax = 0; totalAmount = 0 };
          };
          case (?product) {
            let taxableAmount = item.price * item.quantity;
            let taxRate = product.taxRate;

            if (shouldApplyCgstSgst(?product.hsnSacCode, taxRate)) {
              calculateWithCgstSgst(taxableAmount, taxRate);
            } else {
              calculateWithIgst(taxableAmount, taxRate);
            };
          };
        };
      }
    );
  };

  func calculateWithCgstSgst(taxableAmount : Int, taxRate : Int) : GstBreakup {
    let halfTaxRate = taxRate / 2;
    let sgstAmount = (taxableAmount * halfTaxRate) / 10000;
    let cgstAmount = (taxableAmount * halfTaxRate) / 10000;
    let totalTax = sgstAmount + cgstAmount : Int;
    let totalAmount = taxableAmount + totalTax : Int;

    {
      taxableAmount;
      sgst = sgstAmount;
      cgst = cgstAmount;
      igst = 0;
      totalTax;
      totalAmount;
    };
  };

  func calculateWithIgst(taxableAmount : Int, taxRate : Int) : GstBreakup {
    let taxAmount = (taxableAmount * taxRate) / 10000;
    let totalAmount = taxableAmount + taxAmount : Int;

    {
      taxableAmount;
      sgst = 0;
      cgst = 0;
      igst = taxAmount;
      totalTax = taxAmount;
      totalAmount;
    };
  };

  func shouldApplyCgstSgst(customerState : ?Text, _taxRate : Int) : Bool {
    switch (customerState) {
      case (null) { false };
      case (?state) { not Text.equal(state, "") };
    };
  };
};

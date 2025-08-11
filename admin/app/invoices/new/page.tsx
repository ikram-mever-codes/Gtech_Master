"use client";
import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Trash2,
  Calendar,
  FileText,
  User,
  Package,
  Calculator,
  Loader2,
  ChevronDown,
  Building2,
  Mail,
  Phone,
  Hash,
  Router,
} from "lucide-react";
import { toast } from "react-hot-toast";

// Import your API functions
import { createNewInvoice } from "@/api/invoice";
import { getAllCustomers } from "@/api/customers";
import CustomButton from "@/components/UI/CustomButton";
import { useRouter } from "next/navigation";

// Types based on your code
interface CustomerData {
  id: string;
  companyName: string;
  email: string;
  contactEmail: string;
  contactPhoneNumber: string;
  taxNumber?: string;
  addressLine1: string;
  city: string;
  country: string;
}

interface InvoiceItem {
  quantity: number;
  articleNumber?: string;
  description: string;
  unitPrice: number;
  netPrice: number;
  taxRate: number;
  taxAmount: number;
  grossPrice: number;
}

interface CreateInvoicePayload {
  customerId: string;
  invoiceNumber: string;
  orderNumber: string;
  invoiceDate: string;
  deliveryDate: string;
  taxAmount: number;
  paymentMethod: string;
  shippingMethod: string;
  netTotal: number;
  notes?: string;
  grossTotal: number;
  items: InvoiceItem[];
}

const InvoiceGenerator: React.FC = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(
    null
  );
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerData[]>(
    []
  );
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [invoiceData, setInvoiceData] = useState<
    Omit<CreateInvoicePayload, "customerId" | "items">
  >({
    invoiceNumber: `INV-${Date.now()}`,
    orderNumber: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    deliveryDate: new Date().toISOString().split("T")[0],
    paymentMethod: "bank_transfer",
    shippingMethod: "standard",
    notes: "",
    grossTotal: 0,
    taxAmount: 0,
    netTotal: 0,
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      quantity: 1,
      articleNumber: "",
      description: "",
      unitPrice: 0,
      netPrice: 0,
      taxRate: 19,
      taxAmount: 0,
      grossPrice: 0,
    },
  ]);

  // Load customers on component mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Filter customers based on search term
  useEffect(() => {
    const filtered = customers.filter(
      (customer) =>
        customer.companyName
          .toLowerCase()
          .includes(customerSearchTerm.toLowerCase()) ||
        customer.email
          .toLowerCase()
          .includes(customerSearchTerm.toLowerCase()) ||
        customer.contactEmail
          .toLowerCase()
          .includes(customerSearchTerm.toLowerCase())
    );
    setFilteredCustomers(filtered);
  }, [customerSearchTerm, customers]);

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await getAllCustomers();
      if (response && response.data) {
        setCustomers(response.data);
        setFilteredCustomers(response.data);
      }
    } catch (error) {
      console.error("Failed to load customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Calculate item totals
  const calculateItemTotals = (item: Partial<InvoiceItem>): InvoiceItem => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    const taxRate = item.taxRate || 0;

    const netPrice = quantity * unitPrice;
    const taxAmount = netPrice * (taxRate / 100);
    const grossPrice = netPrice + taxAmount;

    return {
      ...item,
      quantity,
      unitPrice,
      taxRate,
      netPrice: Number(netPrice.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      grossPrice: Number(grossPrice.toFixed(2)),
    } as InvoiceItem;
  };

  // Update item
  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = calculateItemTotals({
      ...updatedItems[index],
      [field]: value,
    });
    setItems(updatedItems);
  };

  // Add new item
  const addItem = () => {
    const newItem: InvoiceItem = {
      quantity: 1,
      articleNumber: "",
      description: "",
      unitPrice: 0,
      netPrice: 0,
      taxRate: 19,
      taxAmount: 0,
      grossPrice: 0,
    };
    setItems([...items, newItem]);
  };

  // Remove item
  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Calculate totals
  const totals = items.reduce(
    (acc, item) => ({
      netTotal: acc.netTotal + item.netPrice,
      taxTotal: acc.taxTotal + item.taxAmount,
      grossTotal: acc.grossTotal + item.grossPrice,
    }),
    { netTotal: 0, taxTotal: 0, grossTotal: 0 }
  );

  const router = useRouter();
  // Handle invoice creation
  const handleCreateInvoice = async () => {
    try {
      // Validation
      if (!selectedCustomer) {
        toast.error("Please select a customer");
        return;
      }

      if (!invoiceData.invoiceNumber.trim()) {
        toast.error("Invoice number is required");
        return;
      }

      const hasValidItems = items.some(
        (item) =>
          item.description.trim() && item.quantity > 0 && item.unitPrice > 0
      );

      if (!hasValidItems) {
        toast.error("Please add at least one valid item");
        return;
      }

      setIsSubmitting(true);

      const payload: CreateInvoicePayload = {
        ...invoiceData,
        customerId: selectedCustomer.id,
        items: items.filter(
          (item) => item.description.trim() && item.quantity > 0
        ),
        taxAmount: totals.taxTotal,
        grossTotal: totals.grossTotal,
        netTotal: totals.netTotal,
      };

      await createNewInvoice(payload);

      setSelectedCustomer(null);
      setCustomerSearchTerm("");
      setInvoiceData({
        invoiceNumber: `INV-${Date.now()}`,
        orderNumber: "",
        invoiceDate: new Date().toISOString().split("T")[0],
        deliveryDate: new Date().toISOString().split("T")[0],
        paymentMethod: "bank_transfer",
        shippingMethod: "standard",
        notes: "",
        taxAmount: 0,
        grossTotal: 0,
        netTotal: 0,
      });
      setItems([
        {
          quantity: 1,
          articleNumber: "",
          description: "",
          unitPrice: 0,
          netPrice: 0,
          taxRate: 19,
          taxAmount: 0,
          grossPrice: 0,
        },
      ]);
      router.push("/invoices");
    } catch (error) {
      console.error("Failed to create invoice:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen font-['Poppins'] text-[#212529]"
      style={{ backgroundColor: "#F8F9FA" }}
    >
      <div className="w-full mx-auto p-0">
        {/* Enhanced Header with Gradient */}
        <div
          className="rounded-md p-8 mb-8 shadow-lg"
          style={{
            background: "linear-gradient(135deg, #8CC21B 0%, #7AB017 100%)",
          }}
        >
          <div className="flex items-center gap-4 mb-3">
            <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl poppins-font  font-bold text-white">
                Create New Invoice
              </h1>
              <p className="text-white/90 text-md font-roboto">
                Generate professional invoices for your customers with ease
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Enhanced Customer Selection */}
          <div
            className="bg-white rounded-md border border-[#E9ECEF] overflow-hidden"
            style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)" }}
          >
            <div
              className="px-8 py-6 border-b border-[#E9ECEF]"
              style={{
                background: "linear-gradient(90deg, #F8F9FA 0%, #F1F3F5 100%)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: "#8CC21B" }}
                >
                  <User className="w-5 h-5 text-white" />
                </div>
                <h2
                  className="text-xl font-semibold"
                  style={{ color: "#212529" }}
                >
                  Customer Information
                </h2>
              </div>
            </div>

            <div className="p-8">
              <div className="">
                <label
                  className="block text-sm font-medium mb-3"
                  style={{ color: "#212529" }}
                >
                  Select Customer *
                </label>
                <div className="relative">
                  <Search
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
                    style={{ color: "#495057" }}
                  />
                  <input
                    type="text"
                    placeholder="Search customers by name or email..."
                    value={customerSearchTerm}
                    onChange={(e) => {
                      setCustomerSearchTerm(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="w-full pl-12 pr-12 py-4 border-2 rounded-md transition-all duration-200 bg-white shadow-sm"
                    style={{
                      borderColor: "#E9ECEF",
                      color: "#212529",
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#E9ECEF";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <ChevronDown
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5"
                    style={{ color: "#495057" }}
                  />
                  {loadingCustomers && (
                    <Loader2
                      className="absolute right-12 top-1/2 transform -translate-y-1/2 w-5 h-5 animate-spin"
                      style={{ color: "#8CC21B" }}
                    />
                  )}
                </div>

                {showCustomerDropdown && (
                  <div
                    className="relative z-[10000] w-full h-[200px] mt-2 bg-white border-2 rounded-md overflow-y-auto"
                    style={{
                      borderColor: "#E9ECEF",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    }}
                  >
                    {customers.length > 0 ? (
                      customers.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setCustomerSearchTerm(customer.companyName);
                            setShowCustomerDropdown(false);
                          }}
                          className="p-4 cursor-pointer border-b last:border-b-0 transition-colors duration-150 hover:bg-[#F8F9FA]"
                          style={{ borderColor: "#F1F3F5" }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="p-2 rounded-lg"
                              style={{ backgroundColor: "#E8F4D6" }}
                            >
                              <Building2
                                className="w-4 h-4"
                                style={{ color: "#8CC21B" }}
                              />
                            </div>
                            <div className="flex-1">
                              <div
                                className="font-semibold"
                                style={{ color: "#212529" }}
                              >
                                {customer.companyName}
                              </div>
                              <div
                                className="text-sm flex items-center gap-2 mt-1"
                                style={{ color: "#495057" }}
                              >
                                <Mail className="w-3 h-3" />
                                {customer.email}
                              </div>
                              <div
                                className="text-xs mt-1"
                                style={{ color: "#ADB5BD" }}
                              >
                                {customer.addressLine1}, {customer.city},{" "}
                                {customer.country}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div
                        className="p-6 text-center"
                        style={{ color: "#495057" }}
                      >
                        <Building2
                          className="w-12 h-12 mx-auto mb-2"
                          style={{ color: "#ADB5BD" }}
                        />
                        <p>No customers found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedCustomer && (
                <div
                  className="mt-6 p-6 rounded-md border-2"
                  style={{
                    background:
                      "linear-gradient(90deg, #E8F4D6 0%, #F0F8E1 100%)",
                    borderColor: "#C5E899",
                  }}
                >
                  <h3
                    className="font-semibold mb-4 flex items-center gap-2"
                    style={{ color: "#6B8F1A" }}
                  >
                    <Building2 className="w-5 h-5" />
                    Selected Customer
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Building2
                        className="w-4 h-4"
                        style={{ color: "#6B8F1A" }}
                      />
                      <span
                        className="font-medium"
                        style={{ color: "#6B8F1A" }}
                      >
                        Company:
                      </span>
                      <span style={{ color: "#212529" }}>
                        {selectedCustomer.companyName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" style={{ color: "#6B8F1A" }} />
                      <span
                        className="font-medium"
                        style={{ color: "#6B8F1A" }}
                      >
                        Email:
                      </span>
                      <span style={{ color: "#212529" }}>
                        {selectedCustomer.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" style={{ color: "#6B8F1A" }} />
                      <span
                        className="font-medium"
                        style={{ color: "#6B8F1A" }}
                      >
                        Phone:
                      </span>
                      <span style={{ color: "#212529" }}>
                        {selectedCustomer.contactPhoneNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4" style={{ color: "#6B8F1A" }} />
                      <span
                        className="font-medium"
                        style={{ color: "#6B8F1A" }}
                      >
                        Tax Number:
                      </span>
                      <span style={{ color: "#212529" }}>
                        {selectedCustomer.taxNumber || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Invoice Details */}
          <div
            className="bg-white rounded-md border border-[#E9ECEF] overflow-hidden"
            style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)" }}
          >
            <div
              className="px-8 py-6 border-b border-[#E9ECEF]"
              style={{
                background: "linear-gradient(90deg, #F8F9FA 0%, #F1F3F5 100%)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: "#8CC21B" }}
                >
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h2
                  className="text-xl font-semibold"
                  style={{ color: "#212529" }}
                >
                  Invoice Details
                </h2>
              </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label
                    className="block text-sm font-medium"
                    style={{ color: "#212529" }}
                  >
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    value={invoiceData.invoiceNumber}
                    onChange={(e) =>
                      setInvoiceData({
                        ...invoiceData,
                        invoiceNumber: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 bg-white shadow-sm"
                    style={{ borderColor: "#E9ECEF", color: "#212529" }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#8CC21B";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(140, 194, 27, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#E9ECEF";
                      e.target.style.boxShadow = "none";
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="block text-sm font-medium"
                    style={{ color: "#212529" }}
                  >
                    Order Number
                  </label>
                  <input
                    type="text"
                    value={invoiceData.orderNumber}
                    onChange={(e) =>
                      setInvoiceData({
                        ...invoiceData,
                        orderNumber: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 bg-white shadow-sm"
                    style={{ borderColor: "#E9ECEF", color: "#212529" }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#8CC21B";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(140, 194, 27, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#E9ECEF";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="block text-sm font-medium"
                    style={{ color: "#212529" }}
                  >
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    value={invoiceData.invoiceDate}
                    onChange={(e) =>
                      setInvoiceData({
                        ...invoiceData,
                        invoiceDate: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 bg-white shadow-sm"
                    style={{ borderColor: "#E9ECEF", color: "#212529" }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#8CC21B";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(140, 194, 27, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#E9ECEF";
                      e.target.style.boxShadow = "none";
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="block text-sm font-medium"
                    style={{ color: "#212529" }}
                  >
                    Delivery Date
                  </label>
                  <input
                    type="date"
                    value={invoiceData.deliveryDate}
                    onChange={(e) =>
                      setInvoiceData({
                        ...invoiceData,
                        deliveryDate: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 bg-white shadow-sm"
                    style={{ borderColor: "#E9ECEF", color: "#212529" }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#8CC21B";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(140, 194, 27, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#E9ECEF";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="block text-sm font-medium"
                    style={{ color: "#212529" }}
                  >
                    Payment Method
                  </label>
                  <select
                    value={invoiceData.paymentMethod}
                    onChange={(e) =>
                      setInvoiceData({
                        ...invoiceData,
                        paymentMethod: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 bg-white shadow-sm"
                    style={{ borderColor: "#E9ECEF", color: "#212529" }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#8CC21B";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(140, 194, 27, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#E9ECEF";
                      e.target.style.boxShadow = "none";
                    }}
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    className="block text-sm font-medium"
                    style={{ color: "#212529" }}
                  >
                    Shipping Method
                  </label>
                  <select
                    value={invoiceData.shippingMethod}
                    onChange={(e) =>
                      setInvoiceData({
                        ...invoiceData,
                        shippingMethod: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 bg-white shadow-sm"
                    style={{ borderColor: "#E9ECEF", color: "#212529" }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#8CC21B";
                      e.target.style.boxShadow =
                        "0 0 0 3px rgba(140, 194, 27, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#E9ECEF";
                      e.target.style.boxShadow = "none";
                    }}
                  >
                    <option value="standard">Standard</option>
                    <option value="express">Express</option>
                    <option value="overnight">Overnight</option>
                    <option value="pickup">Pickup</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <label
                  className="block text-sm font-medium"
                  style={{ color: "#212529" }}
                >
                  Notes
                </label>
                <textarea
                  value={invoiceData.notes}
                  onChange={(e) =>
                    setInvoiceData({ ...invoiceData, notes: e.target.value })
                  }
                  placeholder="Additional notes or comments..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 rounded-lg transition-all duration-200 bg-white shadow-sm resize-none"
                  style={{ borderColor: "#E9ECEF", color: "#212529" }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#8CC21B";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(140, 194, 27, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#E9ECEF";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>
          </div>

          {/* Enhanced Invoice Items */}
          <div
            className="bg-white rounded-md border border-[#E9ECEF] overflow-hidden"
            style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)" }}
          >
            <div
              className="px-8 py-6 border-b border-[#E9ECEF]"
              style={{
                background: "linear-gradient(90deg, #F8F9FA 0%, #F1F3F5 100%)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: "#8CC21B" }}
                  >
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <h2
                    className="text-xl font-semibold"
                    style={{ color: "#212529" }}
                  >
                    Invoice Items
                  </h2>
                </div>
                <CustomButton
                  gradient={true}
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all duration-200 shadow-sm font-medium hover:shadow-md"
                  style={{ backgroundColor: "#8CC21B" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#7AB017";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#8CC21B";
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </CustomButton>
              </div>
            </div>

            <div className="p-8">
              <div className="overflow-x-auto rounded-lg border border-[#E9ECEF]">
                <table className="w-full border-collapse bg-white">
                  <thead>
                    <tr style={{ backgroundColor: "#F8F9FA" }}>
                      <th
                        className="text-left py-4 px-4 text-sm font-semibold border-b border-[#E9ECEF]"
                        style={{ color: "#212529" }}
                      >
                        Article #
                      </th>
                      <th
                        className="text-left py-4 px-4 text-sm font-semibold border-b border-[#E9ECEF] min-w-[200px]"
                        style={{ color: "#212529" }}
                      >
                        Description
                      </th>
                      <th
                        className="text-center py-4 px-4 text-sm font-semibold border-b border-[#E9ECEF]"
                        style={{ color: "#212529" }}
                      >
                        Qty
                      </th>
                      <th
                        className="text-right py-4 px-4 text-sm font-semibold border-b border-[#E9ECEF]"
                        style={{ color: "#212529" }}
                      >
                        Unit Price
                      </th>
                      <th
                        className="text-center py-4 px-4 text-sm font-semibold border-b border-[#E9ECEF]"
                        style={{ color: "#212529" }}
                      >
                        Tax %
                      </th>
                      <th
                        className="text-right py-4 px-4 text-sm font-semibold border-b border-[#E9ECEF]"
                        style={{ color: "#212529" }}
                      >
                        Net
                      </th>
                      <th
                        className="text-right py-4 px-4 text-sm font-semibold border-b border-[#E9ECEF]"
                        style={{ color: "#212529" }}
                      >
                        Tax
                      </th>
                      <th
                        className="text-right py-4 px-4 text-sm font-semibold border-b border-[#E9ECEF]"
                        style={{ color: "#212529" }}
                      >
                        Gross
                      </th>
                      <th
                        className="text-center py-4 px-4 text-sm font-semibold border-b border-[#E9ECEF]"
                        style={{ color: "#212529" }}
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-[#F1F3F5] transition-colors duration-150 hover:bg-[#F8F9FA]"
                      >
                        <td className="py-4 px-4">
                          <input
                            type="text"
                            value={item.articleNumber || ""}
                            onChange={(e) =>
                              updateItem(index, "articleNumber", e.target.value)
                            }
                            className="w-24 px-3 py-2 border rounded-lg text-sm transition-colors"
                            style={{ borderColor: "#CED4DA", color: "#212529" }}
                            placeholder="SKU"
                            onFocus={(e) => {
                              e.target.style.borderColor = "#8CC21B";
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = "#CED4DA";
                            }}
                          />
                        </td>
                        <td className="py-4 px-4">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              updateItem(index, "description", e.target.value)
                            }
                            className="w-full px-3 py-2 border rounded-lg text-sm transition-colors"
                            style={{ borderColor: "#CED4DA", color: "#212529" }}
                            placeholder="Item description"
                            onFocus={(e) => {
                              e.target.style.borderColor = "#8CC21B";
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = "#CED4DA";
                            }}
                            required
                          />
                        </td>
                        <td className="py-4 px-4">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "quantity",
                                Number(e.target.value)
                              )
                            }
                            className="w-20 px-3 py-2 border rounded-lg text-sm text-center transition-colors"
                            style={{ borderColor: "#CED4DA", color: "#212529" }}
                            min="0"
                            step="1"
                            onFocus={(e) => {
                              e.target.style.borderColor = "#8CC21B";
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = "#CED4DA";
                            }}
                          />
                        </td>
                        <td className="py-4 px-4">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "unitPrice",
                                Number(e.target.value)
                              )
                            }
                            className="w-28 px-3 py-2 border rounded-lg text-sm text-right transition-colors"
                            style={{ borderColor: "#CED4DA", color: "#212529" }}
                            min="0"
                            step="0.01"
                            onFocus={(e) => {
                              e.target.style.borderColor = "#8CC21B";
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = "#CED4DA";
                            }}
                          />
                        </td>
                        <td className="py-4 px-4">
                          <input
                            type="number"
                            value={item.taxRate}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "taxRate",
                                Number(e.target.value)
                              )
                            }
                            className="w-20 px-3 py-2 border rounded-lg text-sm text-center transition-colors"
                            style={{ borderColor: "#CED4DA", color: "#212529" }}
                            min="0"
                            max="100"
                            step="0.01"
                            onFocus={(e) => {
                              e.target.style.borderColor = "#8CC21B";
                            }}
                            onBlur={(e) => {
                              e.target.style.borderColor = "#CED4DA";
                            }}
                          />
                        </td>
                        <td
                          className="py-4 px-4 text-right text-sm font-semibold"
                          style={{ color: "#212529" }}
                        >
                          ${item.netPrice.toFixed(2)}
                        </td>
                        <td
                          className="py-4 px-4 text-right text-sm"
                          style={{ color: "#495057" }}
                        >
                          ${item.taxAmount.toFixed(2)}
                        </td>
                        <td
                          className="py-4 px-4 text-right text-sm font-semibold"
                          style={{ color: "#8CC21B" }}
                        >
                          ${item.grossPrice.toFixed(2)}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                            className="p-2 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                            style={{
                              color: items.length === 1 ? "#ADB5BD" : "#F44336",
                              backgroundColor: "transparent",
                            }}
                            onMouseEnter={(e) => {
                              if (items.length > 1) {
                                e.currentTarget.style.backgroundColor =
                                  "#FFEBEE";
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Enhanced Totals */}
          <div
            className="bg-white rounded-md border border-[#E9ECEF] overflow-hidden"
            style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)" }}
          >
            <div
              className="px-8 py-6 border-b border-[#E9ECEF]"
              style={{
                background: "linear-gradient(90deg, #F8F9FA 0%, #F1F3F5 100%)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: "#8CC21B" }}
                >
                  <Calculator className="w-5 h-5 text-white" />
                </div>
                <h2
                  className="text-xl font-semibold"
                  style={{ color: "#212529" }}
                >
                  Invoice Summary
                </h2>
              </div>
            </div>

            <div className="p-8">
              <div className="flex justify-end">
                <div className="w-80 space-y-4">
                  <div className="flex justify-between py-3 border-b border-[#E9ECEF]">
                    <span className="font-medium" style={{ color: "#495057" }}>
                      Net Total:
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: "#212529" }}
                    >
                      ${totals.netTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-[#E9ECEF]">
                    <span className="font-medium" style={{ color: "#495057" }}>
                      Tax Total:
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: "#212529" }}
                    >
                      ${totals.taxTotal.toFixed(2)}
                    </span>
                  </div>
                  <div
                    className="flex justify-between py-4 border-t-2 rounded-lg px-4"
                    style={{
                      borderColor: "#C5E899",
                      background:
                        "linear-gradient(90deg, #E8F4D6 0%, #F0F8E1 100%)",
                    }}
                  >
                    <span
                      className="text-xl font-bold"
                      style={{ color: "#6B8F1A" }}
                    >
                      Gross Total:
                    </span>
                    <span
                      className="text-xl font-bold"
                      style={{ color: "#6B8F1A" }}
                    >
                      ${totals.grossTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Actions */}
          <div className="flex justify-end gap-4 pb-8">
            <button
              type="button"
              className="px-8 py-3 border-2 rounded-md transition-all duration-200 font-medium hover:bg-[#F8F9FA]"
              style={{ borderColor: "#CED4DA", color: "#495057" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#ADB5BD";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#CED4DA";
              }}
            >
              Save as Draft
            </button>
            <CustomButton
              type="button"
              gradient={true}
              onClick={handleCreateInvoice}
              disabled={isSubmitting}
              style={{ backgroundColor: isSubmitting ? "#ADB5BD" : "#8CC21B" }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = "#7AB017";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = "#8CC21B";
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Invoice...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Create Invoice
                </>
              )}
            </CustomButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceGenerator;

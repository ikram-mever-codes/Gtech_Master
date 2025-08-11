"use client";
import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Check,
  X,
  RefreshCw,
  User,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  SortAsc,
  SortDesc,
} from "lucide-react";

// Import your API functions
import {
  getAllInvoices,
  generateInvoicePdf,
  deleteInvoice,
  markInvoiceAsPaid,
  cancelInvoice,
} from "@/api/invoice";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Types
interface Invoice {
  id: string;
  invoiceNumber: string;
  orderNumber?: string;
  invoiceDate: string;
  deliveryDate: string;
  netTotal: number;
  taxAmount: number;
  pdfUrl: string;
  grossTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentMethod: string;
  shippingMethod: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  notes?: string;
  customer: {
    id: string;
    companyName: string;
    email: string;
    contactPhoneNumber: string;
    contactEmail?: string;
    taxNumber?: string;
    addressLine1?: string;
    city?: string;
    country?: string;
  };
  items?: Array<{
    id: string;
    quantity: number;
    articleNumber?: string;
    description: string;
    unitPrice: number;
    netPrice: number;
    taxRate: number;
    taxAmount: number;
    grossPrice: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface FilterOptions {
  status: string;
  dateFrom: string;
  dateTo: string;
  customer: string;
  minAmount: string;
  maxAmount: string;
}

const InvoiceListPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<keyof Invoice>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {}
  );
  const router = useRouter();

  const [filters, setFilters] = useState<FilterOptions>({
    status: "",
    dateFrom: "",
    dateTo: "",
    customer: "",
    minAmount: "",
    maxAmount: "",
  });

  // Load invoices
  useEffect(() => {
    loadInvoices();
  }, []);

  useEffect(() => {
    let filtered = invoices || [];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoiceNumber?.toLowerCase().includes(searchLower) ||
          invoice.customer?.companyName?.toLowerCase().includes(searchLower) ||
          invoice.customer?.email?.toLowerCase().includes(searchLower) ||
          invoice.customer?.contactEmail?.toLowerCase().includes(searchLower) ||
          (invoice.orderNumber &&
            invoice.orderNumber.toLowerCase().includes(searchLower))
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(
        (invoice) => invoice.status === filters.status
      );
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(
        (invoice) => new Date(invoice.invoiceDate) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(
        (invoice) => new Date(invoice.invoiceDate) <= new Date(filters.dateTo)
      );
    }

    // Customer filter
    if (filters.customer) {
      const customerLower = filters.customer.toLowerCase();
      filtered = filtered.filter(
        (invoice) =>
          invoice.customer?.companyName
            ?.toLowerCase()
            .includes(customerLower) ||
          invoice.customer?.email?.toLowerCase().includes(customerLower) ||
          invoice.customer?.contactEmail?.toLowerCase().includes(customerLower)
      );
    }

    // Amount range filter
    if (filters.minAmount) {
      filtered = filtered.filter(
        (invoice) => invoice.grossTotal >= parseFloat(filters.minAmount)
      );
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(
        (invoice) => invoice.grossTotal <= parseFloat(filters.maxAmount)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === "customer") {
        aValue = a.customer?.companyName || "";
        bValue = b.customer?.companyName || "";
      }

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === "asc" ? 1 : -1;
      if (bValue == null) return sortDirection === "asc" ? -1 : 1;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    setFilteredInvoices(filtered);
    setCurrentPage(1);
  }, [searchTerm, filters, invoices, sortField, sortDirection]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await getAllInvoices();
      setInvoices(response?.data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load invoices:", error);

      setLoading(false);
    }
  };

  const handleSort = (field: keyof Invoice) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleDownloadPDF = async (pdfUrl: string) => {
    router.push(`${pdfUrl}`);
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      setActionLoading((prev) => ({ ...prev, [`paid-${invoiceId}`]: true }));
      await markInvoiceAsPaid(invoiceId);
      // Refresh the invoices list
      await loadInvoices();
    } catch (error) {
      console.error("Failed to mark as paid:", error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`paid-${invoiceId}`]: false }));
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    try {
      setActionLoading((prev) => ({ ...prev, [`cancel-${invoiceId}`]: true }));
      await cancelInvoice(invoiceId);
      // Refresh the invoices list
      await loadInvoices();
    } catch (error) {
      console.error("Failed to cancel invoice:", error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`cancel-${invoiceId}`]: false }));
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this invoice? This action cannot be undone."
      )
    ) {
      try {
        setActionLoading((prev) => ({
          ...prev,
          [`delete-${invoiceId}`]: true,
        }));
        await deleteInvoice(invoiceId);
        // Refresh the invoices list
        await loadInvoices();
      } catch (error) {
        console.error("Failed to delete invoice:", error);
      } finally {
        setActionLoading((prev) => ({
          ...prev,
          [`delete-${invoiceId}`]: false,
        }));
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="w-4 h-4" />;
      case "sent":
        return <Clock className="w-4 h-4" />;
      case "overdue":
        return <AlertCircle className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return { backgroundColor: "#E8F5E8", color: "#2E7D32" };
      case "sent":
        return { backgroundColor: "#E3F2FD", color: "#1976D2" };
      case "overdue":
        return { backgroundColor: "#FFF3E0", color: "#F57C00" };
      case "cancelled":
        return { backgroundColor: "#FFEBEE", color: "#D32F2F" };
      default:
        return { backgroundColor: "#F5F5F5", color: "#757575" };
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInvoices = filteredInvoices.slice(startIndex, endIndex);

  // Summary stats - with safe calculations
  const totalAmount = filteredInvoices.reduce(
    (sum, inv) => sum + (Number(inv.grossTotal) || 0),
    0
  );
  const paidAmount = filteredInvoices.reduce(
    (sum, inv) => sum + (Number(inv.paidAmount) || 0),
    0
  );
  const outstandingAmount = filteredInvoices.reduce(
    (sum, inv) => sum + (Number(inv.outstandingAmount) || 0),
    0
  );

  return (
    <div
      className="min-h-screen font-['Poppins']"
      style={{ backgroundColor: "#F8F9FA", color: "#212529" }}
    >
      <div className="w-full mx-auto p-0">
        {/* Header */}
        <div
          className="rounded-md p-6 lg:p-8 mb-6"
          style={{
            background: "linear-gradient(135deg, #8CC21B 0%, #7AB017 100%)",
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">
                Invoice Management
              </h1>
              <p className="text-white/90 text-sm lg:text-base font-roboto">
                Manage and track all your invoices in one place
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setLoading(true);
                  loadInvoices();
                }}
                disabled={loading}
                className="flex items-center font-roboto     justify-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                {loading ? "Loading..." : "Refresh"}
              </button>
              <button
                onClick={() => {
                  router.push("/invoices/new");
                }}
                className="flex items-center font-roboto justify-center gap-2 px-6 py-2 bg-white text-[#8CC21B] rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                New Invoice
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
          <div
            className="bg-white rounded-md p-4 lg:p-6 border border-[#E9ECEF]"
            style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: "#E3F2FD" }}
              >
                <FileText className="w-5 h-5" style={{ color: "#1976D2" }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: "#495057" }}>
                  Total Invoices
                </p>
                <p className="text-xl font-bold" style={{ color: "#212529" }}>
                  {filteredInvoices.length}
                </p>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-md p-4 lg:p-6 border border-[#E9ECEF]"
            style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: "#E8F5E8" }}
              >
                <DollarSign className="w-5 h-5" style={{ color: "#2E7D32" }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: "#495057" }}>
                  Total Amount
                </p>
                <p className="text-xl font-bold" style={{ color: "#212529" }}>
                  ${Number(totalAmount).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-md p-4 lg:p-6 border border-[#E9ECEF]"
            style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: "#E8F4D6" }}
              >
                <CheckCircle className="w-5 h-5" style={{ color: "#8CC21B" }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: "#495057" }}>
                  Paid Amount
                </p>
                <p className="text-xl font-bold" style={{ color: "#212529" }}>
                  ${Number(paidAmount).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div
            className="bg-white rounded-md p-4 lg:p-6 border border-[#E9ECEF]"
            style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: "#FFF3E0" }}
              >
                <Clock className="w-5 h-5" style={{ color: "#F57C00" }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: "#495057" }}>
                  Outstanding
                </p>
                <p className="text-xl font-bold" style={{ color: "#212529" }}>
                  ${Number(outstandingAmount).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div
          className="bg-white rounded-md border border-[#E9ECEF] mb-6"
          style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)" }}
        >
          <div className="p-4 lg:p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                  style={{ color: "#495057" }}
                />
                <input
                  type="text"
                  placeholder="Search invoices, customers, or order numbers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 lg:py-3 border rounded-lg transition-all duration-200"
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

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 lg:py-3 border rounded-lg transition-colors"
                style={{ borderColor: "#E9ECEF", color: "#495057" }}
              >
                <Filter className="w-4 h-4" />
                Filters
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    showFilters ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-[#E9ECEF]">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div>
                    <label
                      className="block text-sm font-medium mb-1"
                      style={{ color: "#212529" }}
                    >
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) =>
                        setFilters({ ...filters, status: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={{ borderColor: "#E9ECEF", color: "#212529" }}
                    >
                      <option value="">All Status</option>
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-1"
                      style={{ color: "#212529" }}
                    >
                      From Date
                    </label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) =>
                        setFilters({ ...filters, dateFrom: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={{ borderColor: "#E9ECEF", color: "#212529" }}
                    />
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-1"
                      style={{ color: "#212529" }}
                    >
                      To Date
                    </label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) =>
                        setFilters({ ...filters, dateTo: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={{ borderColor: "#E9ECEF", color: "#212529" }}
                    />
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-1"
                      style={{ color: "#212529" }}
                    >
                      Customer
                    </label>
                    <input
                      type="text"
                      placeholder="Customer name"
                      value={filters.customer}
                      onChange={(e) =>
                        setFilters({ ...filters, customer: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={{ borderColor: "#E9ECEF", color: "#212529" }}
                    />
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-1"
                      style={{ color: "#212529" }}
                    >
                      Min Amount
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={filters.minAmount}
                      onChange={(e) =>
                        setFilters({ ...filters, minAmount: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={{ borderColor: "#E9ECEF", color: "#212529" }}
                    />
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-1"
                      style={{ color: "#212529" }}
                    >
                      Max Amount
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={filters.maxAmount}
                      onChange={(e) =>
                        setFilters({ ...filters, maxAmount: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={{ borderColor: "#E9ECEF", color: "#212529" }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={() =>
                      setFilters({
                        status: "",
                        dateFrom: "",
                        dateTo: "",
                        customer: "",
                        minAmount: "",
                        maxAmount: "",
                      })
                    }
                    className="px-3 py-1 text-sm border rounded-lg transition-colors"
                    style={{ borderColor: "#E9ECEF", color: "#495057" }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div
          className="bg-white rounded-md border border-[#E9ECEF] overflow-hidden"
          style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)" }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2
                  className="w-8 h-8 animate-spin mx-auto mb-4"
                  style={{ color: "#8CC21B" }}
                />
                <p style={{ color: "#495057" }}>Loading invoices...</p>
              </div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <FileText
                  className="w-12 h-12 mx-auto mb-4"
                  style={{ color: "#ADB5BD" }}
                />
                <h3
                  className="text-lg font-medium mb-2"
                  style={{ color: "#212529" }}
                >
                  No invoices found
                </h3>
                <p style={{ color: "#495057" }}>
                  {searchTerm || Object.values(filters).some((f) => f)
                    ? "Try adjusting your search or filters"
                    : "Create your first invoice to get started"}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead style={{ backgroundColor: "#F8F9FA" }}>
                    <tr>
                      <th
                        className="text-left py-4 px-6 font-semibold text-sm border-b border-[#E9ECEF]"
                        style={{ color: "#212529" }}
                      >
                        <button
                          onClick={() => handleSort("invoiceNumber")}
                          className="flex items-center gap-1 hover:text-[#8CC21B]"
                        >
                          Invoice #
                          {sortField === "invoiceNumber" &&
                            (sortDirection === "asc" ? (
                              <SortAsc className="w-3 h-3" />
                            ) : (
                              <SortDesc className="w-3 h-3" />
                            ))}
                        </button>
                      </th>
                      <th
                        className="text-left py-4 px-6 font-semibold text-sm border-b border-[#E9ECEF]"
                        style={{ color: "#212529" }}
                      >
                        <button
                          onClick={() => handleSort("customer")}
                          className="flex items-center gap-1 hover:text-[#8CC21B]"
                        >
                          Customer
                          {sortField === "customer" &&
                            (sortDirection === "asc" ? (
                              <SortAsc className="w-3 h-3" />
                            ) : (
                              <SortDesc className="w-3 h-3" />
                            ))}
                        </button>
                      </th>
                      <th
                        className="text-left py-4 px-6 font-semibold text-sm border-b border-[#E9ECEF]"
                        style={{ color: "#212529" }}
                      >
                        <button
                          onClick={() => handleSort("invoiceDate")}
                          className="flex items-center gap-1 hover:text-[#8CC21B]"
                        >
                          Date
                          {sortField === "invoiceDate" &&
                            (sortDirection === "asc" ? (
                              <SortAsc className="w-3 h-3" />
                            ) : (
                              <SortDesc className="w-3 h-3" />
                            ))}
                        </button>
                      </th>
                      <th
                        className="text-right py-4 px-6 font-semibold text-sm border-b border-[#E9ECEF]"
                        style={{ color: "#212529" }}
                      >
                        <button
                          onClick={() => handleSort("grossTotal")}
                          className="flex items-center gap-1 hover:text-[#8CC21B] ml-auto"
                        >
                          Amount
                          {sortField === "grossTotal" &&
                            (sortDirection === "asc" ? (
                              <SortAsc className="w-3 h-3" />
                            ) : (
                              <SortDesc className="w-3 h-3" />
                            ))}
                        </button>
                      </th>
                      <th
                        className="text-center py-4 px-6 font-semibold text-sm border-b border-[#E9ECEF]"
                        style={{ color: "#212529" }}
                      >
                        Status
                      </th>
                      <th
                        className="text-center py-4 px-6 font-semibold text-sm border-b border-[#E9ECEF]"
                        style={{ color: "#212529" }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentInvoices.map((invoice, index) => (
                      <tr
                        key={invoice.id}
                        className={`border-b border-[#F1F3F5] hover:bg-[#F8F9FA] transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-[#FAFBFC]"
                        }`}
                      >
                        <td className="py-4 px-6">
                          <div>
                            <div
                              className="font-medium"
                              style={{ color: "#212529" }}
                            >
                              {invoice.invoiceNumber || "N/A"}
                            </div>
                            {invoice.orderNumber && (
                              <div
                                className="text-sm"
                                style={{ color: "#495057" }}
                              >
                                Order: {invoice.orderNumber}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <div
                              className="font-medium"
                              style={{ color: "#212529" }}
                            >
                              {invoice.customer?.companyName || "N/A"}
                            </div>
                            <div
                              className="text-sm"
                              style={{ color: "#495057" }}
                            >
                              {invoice.customer?.email ||
                                invoice.customer?.contactEmail ||
                                "N/A"}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm" style={{ color: "#212529" }}>
                            {new Date(invoice.invoiceDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div
                            className="font-semibold"
                            style={{ color: "#212529" }}
                          >
                            ${Number(invoice.grossTotal).toFixed(2)}
                          </div>
                          {invoice.outstandingAmount > 0 && (
                            <div
                              className="text-sm"
                              style={{ color: "#F57C00" }}
                            >
                              Outstanding: $
                              {Number(invoice.outstandingAmount).toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize"
                            style={getStatusColor(invoice.status)}
                          >
                            {getStatusIcon(invoice.status)}
                            {invoice.status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              href={`https://api.gtech.de${invoice.pdfUrl}`}
                              className="p-2 rounded-lg transition-colors hover:bg-[#E8F4D6]"
                              title="Download PDF"
                            >
                              {actionLoading[`pdf-${invoice.id}`] ? (
                                <Loader2
                                  className="w-4 h-4 animate-spin"
                                  style={{ color: "#8CC21B" }}
                                />
                              ) : (
                                <Download
                                  className="w-4 h-4"
                                  style={{ color: "#8CC21B" }}
                                />
                              )}
                            </Link>
                            <Link
                              href={`https://api.gtech.de${invoice.pdfUrl}`}
                              className="p-2 rounded-lg transition-colors hover:bg-[#E3F2FD]"
                              title="View"
                            >
                              <Eye
                                className="w-4 h-4"
                                style={{ color: "#1976D2" }}
                              />
                            </Link>
                            {/* <button
                              className="p-2 rounded-lg transition-colors hover:bg-[#FFF3E0]"
                              title="Edit"
                            >
                              <Edit
                                className="w-4 h-4"
                                style={{ color: "#F57C00" }}
                              />
                            </button>
                            {invoice.status !== "paid" && (
                              <button
                                onClick={() => handleMarkAsPaid(invoice.id)}
                                disabled={actionLoading[`paid-${invoice.id}`]}
                                className="p-2 rounded-lg transition-colors hover:bg-[#E8F5E8]"
                                title="Mark as Paid"
                              >
                                {actionLoading[`paid-${invoice.id}`] ? (
                                  <Loader2
                                    className="w-4 h-4 animate-spin"
                                    style={{ color: "#2E7D32" }}
                                  />
                                ) : (
                                  <Check
                                    className="w-4 h-4"
                                    style={{ color: "#2E7D32" }}
                                  />
                                )}
                              </button>
                            )} */}
                            <button
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              disabled={actionLoading[`delete-${invoice.id}`]}
                              className="p-2 rounded-lg transition-colors hover:bg-[#FFEBEE]"
                              title="Delete"
                            >
                              {actionLoading[`delete-${invoice.id}`] ? (
                                <Loader2
                                  className="w-4 h-4 animate-spin"
                                  style={{ color: "#D32F2F" }}
                                />
                              ) : (
                                <Trash2
                                  className="w-4 h-4"
                                  style={{ color: "#D32F2F" }}
                                />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden">
                {currentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="p-4 border-b border-[#F1F3F5] last:border-b-0"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div
                          className="font-semibold"
                          style={{ color: "#212529" }}
                        >
                          {invoice.invoiceNumber || "N/A"}
                        </div>
                        <div className="text-sm" style={{ color: "#495057" }}>
                          {invoice.customer?.companyName || "N/A"}
                        </div>
                      </div>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize"
                        style={getStatusColor(invoice.status)}
                      >
                        {getStatusIcon(invoice.status)}
                        {invoice.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                      <div>
                        <div style={{ color: "#495057" }}>Date</div>
                        <div style={{ color: "#212529" }}>
                          {new Date(invoice.invoiceDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: "#495057" }}>Amount</div>
                        <div
                          className="font-semibold"
                          style={{ color: "#212529" }}
                        >
                          ${Number(invoice.grossTotal).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadPDF(invoice.id)}
                        disabled={actionLoading[`pdf-${invoice.id}`]}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                        style={{ backgroundColor: "#E8F4D6", color: "#6B8F1A" }}
                      >
                        {actionLoading[`pdf-${invoice.id}`] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        PDF
                      </button>
                      <button
                        className="p-2 rounded-lg transition-colors"
                        style={{ backgroundColor: "#E3F2FD", color: "#1976D2" }}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded-lg transition-colors"
                        style={{ backgroundColor: "#FFF3E0", color: "#F57C00" }}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded-lg transition-colors"
                        style={{ backgroundColor: "#FFEBEE", color: "#D32F2F" }}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 lg:p-6 border-t border-[#E9ECEF]">
                  <div className="text-sm" style={{ color: "#495057" }}>
                    Showing {startIndex + 1} to{" "}
                    {Math.min(endIndex, filteredInvoices.length)} of{" "}
                    {filteredInvoices.length} invoices
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "#F8F9FA", color: "#495057" }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          currentPage === i + 1 ? "font-medium" : ""
                        }`}
                        style={{
                          backgroundColor:
                            currentPage === i + 1 ? "#8CC21B" : "#F8F9FA",
                          color: currentPage === i + 1 ? "#FFFFFF" : "#495057",
                        }}
                      >
                        {i + 1}
                      </button>
                    ))}

                    <button
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "#F8F9FA", color: "#495057" }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceListPage;

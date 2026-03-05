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
  Printer,
} from "lucide-react";

import {
  getAllInvoices,
  generateInvoicePdf,
  deleteInvoice,
  markInvoiceAsPaid,
  cancelInvoice,
  getExpandedInvoiceDetails,
} from "@/api/invoice";
import SpreadSheet from "@/components/UI/SpreadSheet";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/UI/PageHeader";
import Link from "next/link";
import CargosTab from "@/components/cargos/CargosTab";
import CargoTypesTab from "@/components/cargos/CargoTypesTab";
import { getAllCustomers, CustomerData as APICustomerData } from "@/api/customers";
import { updateOrderItemStatus, splitOrderItem } from "@/api/orders";
import { getAllCargos, CargoType } from "@/api/cargos";
import { toast } from "react-hot-toast";
import CustomModal from "@/components/UI/CustomModal";
import { Pencil, Scissors, MoveRight } from "lucide-react";

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

const invoiceTabs = [
  { id: "open_invoices", label: "Open Invoices" },
  { id: "closed_invoices", label: "Closed Invoices" },
  { id: "billto_shipto", label: "Bill To / Ship To" },
  { id: "cargos", label: "Cargos" },
  { id: "cargo_type", label: "Cargo Type" },
  { id: "packing_list", label: "Packing List" },
] as const;

type InvoiceTab = typeof invoiceTabs[number]["id"];

const InvoiceListPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<APICustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeInvTab, setActiveInvTab] =
    useState<InvoiceTab>("open_invoices");
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

  const [expandedStates, setExpandedStates] = useState<Record<string, { taric?: boolean, items?: boolean, data?: any, loading?: boolean }>>({});

  const [showREModal, setShowREModal] = useState(false);
  const [showSPModal, setShowSPModal] = useState(false);
  const [showQTYModal, setShowQTYModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [cargos, setCargos] = useState<CargoType[]>([]);
  const [splitQty, setSplitQty] = useState<number>(0);
  const [newQty, setNewQty] = useState<number>(0);
  const [targetCargoId, setTargetCargoId] = useState<string>("");

  const toggleExpansion = async (id: string, type: 'taric' | 'items') => {
    const currentState = expandedStates[id] || {};
    const isCurrentlyOpen = type === 'taric' ? currentState.taric : currentState.items;

    const newState = {
      ...currentState,
      [type]: !isCurrentlyOpen
    };

    if (!isCurrentlyOpen && !currentState.data) {
      setExpandedStates(prev => ({ ...prev, [id]: { ...newState, loading: true } }));
      try {
        const response = await getExpandedInvoiceDetails(id);
        if (response.success) {
          setExpandedStates(prev => ({
            ...prev,
            [id]: { ...newState, data: response.data, loading: false }
          }));
        }
      } catch (error) {
        console.error(error);
        setExpandedStates(prev => ({
          ...prev,
          [id]: { ...newState, loading: false }
        }));
      }
    } else {
      setExpandedStates(prev => ({ ...prev, [id]: newState }));
    }
  };

  useEffect(() => {
    getAllCargos().then(res => {
      if (res.success) setCargos(res.data);
    });
  }, []);

  const handleReassignItem = async () => {
    if (!selectedItem || !targetCargoId) return;
    try {
      await updateOrderItemStatus(selectedItem.id, { cargo_id: Number(targetCargoId) });
      toast.success("Item reassigned successfully");
      setShowREModal(false);
      const invId = Object.keys(expandedStates).find(key =>
        expandedStates[key].data?.detailedItems?.some((it: any) => it.id === selectedItem.id)
      );
      if (invId) {
        const res = await getExpandedInvoiceDetails(invId);
        setExpandedStates(prev => ({ ...prev, [invId]: { ...prev[invId], data: res.data } }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSplitItem = async () => {
    if (!selectedItem || splitQty <= 0) return;
    try {
      await splitOrderItem(selectedItem.id, splitQty);
      toast.success("Item split successfully");
      setShowSPModal(false);
      const invId = Object.keys(expandedStates).find(key =>
        expandedStates[key].data?.detailedItems?.some((it: any) => it.id === selectedItem.id)
      );
      if (invId) {
        const res = await getExpandedInvoiceDetails(invId);
        setExpandedStates(prev => ({ ...prev, [invId]: { ...prev[invId], data: res.data } }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateQty = async () => {
    if (!selectedItem || newQty <= 0) return;
    try {
      await updateOrderItemStatus(selectedItem.id, { qty: newQty });
      toast.success("Quantity updated successfully");
      setShowQTYModal(false);
      const invId = Object.keys(expandedStates).find(key =>
        expandedStates[key].data?.detailedItems?.some((it: any) => it.id === selectedItem.id)
      );
      if (invId) {
        const res = await getExpandedInvoiceDetails(invId);
        setExpandedStates(prev => ({ ...prev, [invId]: { ...prev[invId], data: res.data } }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrintLabel = (item: any) => {
    const details = item.item;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Label - ${details?.item_name || 'Item'}</title>
          <style>
            @page { size: 100mm 150mm; margin: 0; }
            body { 
              font-family: 'Poppins', sans-serif; 
              padding: 20px; 
              border: 1px solid #eee; 
              width: 100mm; 
              height: 150mm; 
              box-sizing: border-box; 
              position: relative;
            }
            .header { border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
            .item-name { font-size: 16px; font-weight: bold; margin-bottom: 2px; height: 48px; overflow: hidden; }
            .ean { font-size: 11px; margin-bottom: 5px; color: #555; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
            .label-field { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
            .value-field { font-size: 12px; font-weight: bold; margin-bottom: 2px; }
            .barcode { margin-top: 20px; text-align: center; }
            .qr-placeholder { width: 80px; height: 80px; background: #eee; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 8px; border: 1px dashed #ccc; }
            .footer { position: absolute; bottom: 20px; left: 20px; right: 20px; font-size: 9px; text-align: center; color: #999; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div class="item-name">${details?.item_name || 'N/A'}</div>
            <div class="ean">EAN: ${details?.ean || '-'}</div>
          </div>
          <div class="details">
            <div>
              <div class="label-field">Order / Cargo No.</div>
              <div class="value-field">${item.order?.order_no || '-'}</div>
            </div>
            <div>
              <div class="label-field">QTY Label</div>
              <div class="value-field">${item.qty_label || item.qty}</div>
            </div>
            <div>
              <div class="label-field">SOID</div>
              <div class="value-field">${item.supplier_order_id || '-'}</div>
            </div>
            <div>
              <div class="label-field">Taric</div>
              <div class="value-field">${details?.taric?.code || '-'}</div>
            </div>
          </div>
          <div class="barcode">
            <div class="qr-placeholder">G-TECH LABEL</div>
            <div style="font-size: 9px; margin-top: 5px; font-weight: 500;">Item ID: ${item.id}</div>
          </div>
          <div class="footer">
            Printed on ${new Date().toLocaleString('de-DE')}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    loadInvoices();
    if (activeInvTab === "billto_shipto") {
      fetchCustomers();
    }
  }, [activeInvTab]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response: any = await getAllCustomers();
      if (response?.data?.businesses) {
        setCustomers(response.data.businesses);
      } else if (Array.isArray(response?.data)) {
        setCustomers(response.data);
      } else if (Array.isArray(response)) {
        setCustomers(response);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      if (activeInvTab === "billto_shipto") setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = invoices || [];

    if (activeInvTab === "open_invoices") {
      filtered = filtered.filter(
        (invoice) => invoice.status !== "paid" && invoice.status !== "cancelled"
      );
    } else if (activeInvTab === "closed_invoices") {
      filtered = filtered.filter(
        (invoice) => invoice.status === "paid" || invoice.status === "cancelled"
      );
    }

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

    if (filters.status) {
      filtered = filtered.filter(
        (invoice) => invoice.status === filters.status
      );
    }

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

    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === "customer") {
        aValue = a.customer?.companyName || "";
        bValue = b.customer?.companyName || "";
      }

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
  }, [searchTerm, filters, invoices, sortField, sortDirection, activeInvTab]);

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

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInvoices = filteredInvoices.slice(startIndex, endIndex);

  const totalAmount = filteredInvoices.reduce(
    (sum, inv) => sum + (Number(inv.grossTotal) || 0),
    0
  );
  const totalPaid = filteredInvoices.reduce(
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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-3">
          <div>
            <PageHeader title="Invoice Management" icon={FileText} />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setLoading(true);
                loadInvoices();
                if (activeInvTab === "billto_shipto") fetchCustomers();
              }}
              disabled={loading}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-[4px] font-medium hover:bg-gray-200 transition-all flex items-center gap-2 disabled:opacity-50"
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
              className="px-6 py-2.5 bg-[#8CC21B] text-white rounded-[4px] font-medium hover:bg-[#8CC21B]/90 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Invoice
            </button>
          </div>
        </div>

        <div className="flex overflow-x-auto mb-6 border-b border-gray-200">
          {invoiceTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveInvTab(tab.id)}
              className={`px-6 py-3 text-sm font-semibold transition-all relative min-w-fit ${activeInvTab === tab.id
                ? "text-[#8CC21B]"
                : "text-gray-500 hover:text-gray-700"
                }`}
            >
              {tab.label}
              {activeInvTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#8CC21B]" />
              )}
            </button>
          ))}
        </div>

        {(activeInvTab === "open_invoices" ||
          activeInvTab === "closed_invoices") && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
                <div
                  className="bg-white rounded-[4px] p-4 lg:p-6 border border-[#E9ECEF]"
                  style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-[4px]"
                      style={{ backgroundColor: "#E8F5E8" }}
                    >
                      <FileText className="w-5 h-5" style={{ color: "#059669" }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#6C757D" }}>
                        Total Invoices
                      </p>
                      <p className="text-xl font-bold" style={{ color: "#212529" }}>
                        {filteredInvoices.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="bg-white rounded-[4px] p-4 lg:p-6 border border-[#E9ECEF]"
                  style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-[4px]"
                      style={{ backgroundColor: "#E8F5E8" }}
                    >
                      <DollarSign
                        className="w-5 h-5"
                        style={{ color: "#2E7D32" }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#6C757D" }}>
                        Total Amount
                      </p>
                      <p className="text-xl font-bold" style={{ color: "#212529" }}>
                        ${Number(totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="bg-white rounded-[4px] p-4 lg:p-6 border border-[#E9ECEF]"
                  style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-[4px]"
                      style={{ backgroundColor: "#E8F4D6" }}
                    >
                      <CheckCircle
                        className="w-5 h-5"
                        style={{ color: "#8CC21B" }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#6C757D" }}>
                        Paid Amount
                      </p>
                      <p className="text-xl font-bold" style={{ color: "#212529" }}>
                        ${Number(totalPaid).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="bg-white rounded-[4px] p-4 lg:p-6 border border-[#E9ECEF]"
                  style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-[4px]"
                      style={{ backgroundColor: "#FFF3E0" }}
                    >
                      <Clock className="w-5 h-5" style={{ color: "#F57C00" }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#6C757D" }}>
                        Outstanding
                      </p>
                      <p className="text-xl font-bold" style={{ color: "#212529" }}>
                        ${Number(outstandingAmount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="bg-white rounded-[4px] border border-[#E9ECEF] mb-6"
                style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
              >
                <div className="p-4 lg:p-6">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                        style={{ color: "#ADB5BD" }}
                      />
                      <input
                        type="text"
                        placeholder="Search invoices, customers, or order numbers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-[4px] transition-all duration-200 text-sm"
                        style={{ borderColor: "#E9ECEF", color: "#212529" }}
                      />
                    </div>

                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-2 px-4 py-2 border rounded-[4px] transition-colors text-sm font-medium"
                      style={{ borderColor: "#E9ECEF", color: "#495057" }}
                    >
                      <Filter className="w-4 h-4" />
                      Filters
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""
                          }`}
                      />
                    </button>
                  </div>

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
                            className="w-full px-3 py-2 border rounded-[4px] text-sm"
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
                            className="w-full px-3 py-2 border rounded-[4px] text-sm"
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
                            className="w-full px-3 py-2 border rounded-[4px] text-sm"
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
                            className="w-full px-3 py-2 border rounded-[4px] text-sm"
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
                            className="w-full px-3 py-2 border rounded-[4px] text-sm"
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
                            className="w-full px-3 py-2 border rounded-[4px] text-sm"
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
                          className="px-3 py-1 text-sm border rounded-[4px] transition-colors"
                          style={{ borderColor: "#E9ECEF", color: "#495057" }}
                        >
                          Clear Filters
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div
                className="bg-white rounded-[4px] border border-[#E9ECEF] overflow-hidden"
                style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
              >
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2
                        className="w-8 h-8 animate-spin mx-auto mb-4 text-[#8CC21B]"
                      />
                      <p className="text-xs text-[#6C757D]">Loading invoices...</p>
                    </div>
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-[#ADB5BD]" />
                      <h3 className="text-lg font-medium mb-1 text-[#212529]">No invoices found</h3>
                      <p className="text-xs text-[#6C757D]">Try adjusting your search or filters</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead className="bg-[#F8F9FA] border-b border-[#E9ECEF]">
                          <tr>
                            {activeInvTab === "closed_invoices" && (
                              <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">#</th>
                            )}
                            <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">
                              <div className="flex items-center gap-1.5">
                                ID
                              </div>
                            </th>
                            {activeInvTab === "closed_invoices" && (
                              <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">Invoice No</th>
                            )}
                            <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">Bill To</th>
                            <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">Ship To</th>
                            <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">
                              {activeInvTab === "open_invoices" ? "ID - Cargo No" : "Cargo No."}
                            </th>
                            <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">
                              {activeInvTab === "open_invoices" ? "Date created" : "Closed Date"}
                            </th>
                            <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">
                              {activeInvTab === "open_invoices" ? "Count Item" : "Item Count"}
                            </th>
                            <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">
                              {activeInvTab === "open_invoices" ? "QTY" : "Total Qty"}
                            </th>
                            {activeInvTab === "closed_invoices" && (
                              <th className="text-right py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">Total Price</th>
                            )}
                            <th className="text-center py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F3F5]">
                          {currentInvoices.map((invoice, index) => {
                            const expState = expandedStates[invoice.id] || {};
                            const showExpanded = expState.taric || expState.items;

                            return (
                              <React.Fragment key={invoice.id}>
                                <tr className="hover:bg-[#F8F9FA] transition-colors group">
                                  {activeInvTab === "closed_invoices" && (
                                    <td className="py-4 px-4 text-xs text-[#212529]">{startIndex + index + 1}</td>
                                  )}
                                  <td className="py-4 px-4">
                                    <button
                                      onClick={() => toggleExpansion(invoice.id, 'taric')}
                                      className="flex items-center gap-1.5 px-2.5 py-1 bg-[#495057] text-white text-[10px] font-bold rounded-[4px] hover:bg-[#343A40] transition-colors whitespace-nowrap"
                                    >
                                      {invoice.id.slice(-2)} {expState.taric ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    </button>
                                  </td>
                                  {activeInvTab === "closed_invoices" && (
                                    <td className="py-4 px-4 text-xs font-semibold text-[#212529]">{invoice.invoiceNumber || "N/A"}</td>
                                  )}
                                  <td className="py-4 px-4 text-xs text-[#212529]">{invoice.customer?.companyName || "N/A"}</td>
                                  <td className="py-4 px-4 text-xs text-[#6C757D]">{invoice.customer?.city || "-"}</td>
                                  <td className="py-4 px-4 text-xs text-[#212529]">
                                    {activeInvTab === "open_invoices" ? (
                                      <span className="font-medium">{invoice.id.slice(-2)} - {invoice.orderNumber || "No Cargo"}</span>
                                    ) : (
                                      <span className="font-medium">{invoice.orderNumber || "No Cargo"}</span>
                                    )}
                                  </td>
                                  <td className="py-4 px-4 text-xs text-[#495057]">
                                    {new Date(invoice.invoiceDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                  </td>
                                  <td className="py-4 px-4 text-xs">
                                    <span
                                      onClick={() => toggleExpansion(invoice.id, 'items')}
                                      className="text-[#059669] font-bold hover:underline cursor-pointer"
                                    >
                                      {invoice.items?.length || 0}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-xs text-[#212529] font-medium">
                                    {invoice.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}
                                  </td>
                                  {activeInvTab === "closed_invoices" && (
                                    <td className="py-4 px-4 text-xs text-right font-bold text-[#212529]">
                                      {Number(invoice.grossTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  )}
                                  <td className="py-4 px-4">
                                    <div className="flex items-center justify-center gap-2">
                                      {activeInvTab === "open_invoices" ? (
                                        <button
                                          onClick={() => handleMarkAsPaid(invoice.id)}
                                          className="flex items-center gap-1.5 px-4 py-1.5 bg-[#059669] text-white text-[10px] font-bold rounded-[4px] hover:bg-green-700 transition-all shadow-md"
                                        >
                                          <CheckCircle className="w-3.5 h-3.5" /> VERIFY
                                        </button>
                                      ) : (
                                        <>
                                          <button className="text-[#DC3545] hover:text-red-700 transition-colors" title="Download PDF">
                                            <FileText className="w-5 h-5" />
                                          </button>
                                          <button className="px-3.5 py-1 bg-[#28A745] text-white text-[10px] font-bold rounded-[4px] hover:bg-green-600 transition-colors">
                                            Edit
                                          </button>
                                          <button className="px-3 py-1 border border-[#6C757D] text-[#6C757D] text-[10px] font-bold rounded-[4px] hover:bg-gray-50 transition-colors">
                                            Create PL
                                          </button>
                                          <button className="px-3.5 py-1 bg-[#F15A24] text-white text-[10px] font-bold rounded-[4px] flex items-center gap-1 hover:bg-[#D9481B] transition-colors">
                                            <RefreshCw className="w-3 h-3" /> Ship
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                                {showExpanded && (
                                  <tr>
                                    <td colSpan={activeInvTab === "closed_invoices" ? 11 : 9} className="p-0 bg-[#F8F9FA]">
                                      <div className="p-4 space-y-4">
                                        {expState.loading ? (
                                          <div className="flex justify-center py-4">
                                            <Loader2 className="w-6 h-6 animate-spin text-[#8CC21B]" />
                                          </div>
                                        ) : (
                                          <>
                                            {expState.taric && expState.data?.taricGroups && (
                                              <SpreadSheet
                                                data={expState.data.taricGroups}
                                                showTotals={true}
                                                totalQty={expState.data.taricGroups.reduce((s: any, g: any) => s + g.totalQty, 0)}
                                                totalPrice={expState.data.taricGroups.reduce((s: any, g: any) => s + g.totalPrice, 0)}
                                                columns={[
                                                  { header: "Pos", render: (_: any, idx: number) => idx + 1, width: "40px" },
                                                  { header: "Taric Name EN", render: (it: any) => it.taricNameEn },
                                                  { header: "Taric Code", render: (it: any) => `/ ${it.taricCode}` },
                                                  { header: "Duty rate", render: (it: any) => it.dutyRate ? `${it.dutyRate}%` : "0.00%" },
                                                  { header: "Total Qty", render: (it: any) => it.totalQty, align: "center" },
                                                  { header: "Unit Price", render: (it: any) => `€${it.unitPrice?.toFixed(2)}` },
                                                  { header: "Total Price", render: (it: any) => `€${it.totalPrice?.toFixed(2)}` },
                                                  {
                                                    header: "Operation",
                                                    render: () => (
                                                      <button className="flex items-center gap-1 px-3 py-1 bg-[#1A73E8] text-white text-[10px] font-bold rounded hover:bg-[#1557B0]">
                                                        <RefreshCw className="w-3 h-3" /> Set taric
                                                      </button>
                                                    )
                                                  }
                                                ]}
                                              />
                                            )}
                                            {expState.items && expState.data?.detailedItems && (
                                              <SpreadSheet
                                                data={expState.data.detailedItems}
                                                columns={[
                                                  {
                                                    header: "ID",
                                                    render: (it: any) => (
                                                      <div className="flex flex-col gap-2">
                                                        <div className="px-2 py-1 bg-[#475569] text-white text-[10px] font-bold rounded-[4px] text-center mb-1">
                                                          {it.id}
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                          <button
                                                            onClick={() => {
                                                              setSelectedItem(it);
                                                              setNewQty(it.qty);
                                                              setShowQTYModal(true);
                                                            }}
                                                            className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold bg-[#E2E8F0] text-[#475569] rounded-[4px] hover:bg-gray-200 transition"
                                                          >
                                                            <Pencil className="w-2.5 h-2.5" /> QTY
                                                          </button>
                                                          <button
                                                            onClick={() => {
                                                              setSelectedItem(it);
                                                              setSplitQty(Math.floor(it.qty / 2));
                                                              setShowSPModal(true);
                                                            }}
                                                            className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold bg-[#FFF7ED] text-[#EA580C] rounded-[4px] hover:bg-orange-100 transition"
                                                          >
                                                            <Scissors className="w-2.5 h-2.5" /> Split
                                                          </button>
                                                          <button
                                                            onClick={() => {
                                                              setSelectedItem(it);
                                                              setTargetCargoId(it.cargo_id || "");
                                                              setShowREModal(true);
                                                            }}
                                                            className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold bg-[#F0FDF4] text-[#16A34A] rounded-[4px] hover:bg-green-100 transition"
                                                          >
                                                            <MoveRight className="w-2.5 h-2.5" /> ReAssign
                                                          </button>
                                                          <button
                                                            onClick={() => handlePrintLabel(it)}
                                                            className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold bg-gray-100 text-gray-700 rounded-[4px] hover:bg-gray-200 transition"
                                                          >
                                                            <Printer className="w-2.5 h-2.5" /> Print
                                                          </button>
                                                        </div>
                                                      </div>
                                                    ),
                                                    width: "100px"
                                                  },
                                                  { header: "EAN", render: (it: any) => it.item?.ean },
                                                  { header: "Item Name", render: (it: any) => it.item?.item_name, width: "200px" },
                                                  { header: "Taric code", render: (it: any) => it.item?.taric?.code },
                                                  { header: "Remark", render: (it: any) => it.remark_de },
                                                  { header: "Order_no", render: (it: any) => it.order?.order_no },
                                                  { header: "SOID", render: (it: any) => it.supplier_order_id },
                                                  { header: "Status", render: (it: any) => it.status },
                                                  { header: "V(dm³)", render: (it: any) => it.v?.toFixed(2) },
                                                  { header: "W(kg)", render: (it: any) => it.w?.toFixed(2) },
                                                  { header: "QTY", render: (it: any) => it.qty },
                                                  { header: "RMB", render: (it: any) => it.rmb_special_price },
                                                  { header: "EK", render: (it: any) => it.eur_special_price },
                                                ]}
                                                showTotals={true}
                                                totalCols={[
                                                  { label: "Total Qty", value: expState.data.detailedItems.reduce((s: any, it: any) => s + (it.qty || 0), 0), width: "100px", align: "center" },
                                                  { label: "Total V(dm³)", value: expState.data.detailedItems.reduce((s: any, it: any) => s + (it.v || 0), 0).toFixed(2), width: "120px", align: "center" },
                                                  { label: "Total W(kg)", value: expState.data.detailedItems.reduce((s: any, it: any) => s + (it.w || 0), 0).toFixed(2), width: "120px", align: "center" },
                                                  { label: "Items count", value: expState.data.detailedItems.length, width: "100px", align: "right" }
                                                ]}
                                              />
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="lg:hidden divide-y divide-[#F1F3F5]">
                      {currentInvoices.map((invoice) => (
                        <div key={invoice.id} className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="px-2 py-1 bg-[#495057] text-white text-[10px] font-bold rounded-[4px]">
                                {invoice.id.slice(-2)}
                              </div>
                              <div className="font-bold text-sm text-[#212529]">
                                {activeInvTab === "closed_invoices" ? invoice.invoiceNumber : `ID: ${invoice.id.slice(-5)}`}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] uppercase" style={getStatusColor(invoice.status)}>
                              {invoice.status}
                            </span>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-xs">
                              <span className="text-[#6C757D]">Customer</span>
                              <span className="font-medium text-[#212529]">{invoice.customer?.companyName}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-[#6C757D]">{activeInvTab === "open_invoices" ? "Cargo" : "Cargo No."}</span>
                              <span className="font-medium text-[#212529]">{invoice.orderNumber || "-"}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-[#6C757D]">Items / Qty</span>
                              <span className="font-medium text-[#212529]">
                                {invoice.items?.length || 0} / {invoice.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}
                              </span>
                            </div>
                            {activeInvTab === "closed_invoices" && (
                              <div className="flex justify-between text-xs font-bold pt-1 border-t border-dashed border-gray-100">
                                <span className="text-[#6C757D]">Total Price</span>
                                <span className="text-[#212529]">${Number(invoice.grossTotal).toFixed(2)}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {activeInvTab === "open_invoices" ? (
                              <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#28A745] text-white text-[11px] font-bold rounded-[4px] shadow-md">
                                <CheckCircle className="w-4 h-4" /> VERIFY
                              </button>
                            ) : (
                              <>
                                <button className="flex-1 py-2 bg-[#28A745] text-white text-[11px] font-bold rounded-[4px]">Edit</button>
                                <button className="flex-1 py-2 border border-[#6C757D] text-[#6C757D] text-[11px] font-bold rounded-[4px]">Create PL</button>
                                <button className="p-2 bg-[#F15A24] text-white rounded-[4px]"><RefreshCw className="w-4 h-4" /></button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between p-4 border-t border-[#E9ECEF] bg-[#F8F9FA]">
                        <div className="text-[11px] font-medium text-[#6C757D]">
                          Showing {startIndex + 1} to {Math.min(endIndex, filteredInvoices.length)} of {filteredInvoices.length} invoices
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-[4px] border border-[#DEE2E6] bg-white disabled:opacity-30 hover:bg-gray-50 transition-colors"
                          >
                            <ChevronLeft className="w-3.5 h-3.5 text-[#495057]" />
                          </button>
                          {[...Array(totalPages)].map((_, i) => (
                            <button
                              key={i + 1}
                              onClick={() => setCurrentPage(i + 1)}
                              className={`min-w-[28px] h-7 text-[11px] font-bold rounded-[4px] border transition-all ${currentPage === i + 1
                                ? "bg-[#8CC21B] text-white border-[#8CC21B] shadow-md"
                                : "bg-white text-[#495057] border-[#DEE2E6] hover:bg-gray-50"
                                }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-1.5 rounded-[4px] border border-[#DEE2E6] bg-white disabled:opacity-30 hover:bg-gray-50 transition-colors"
                          >
                            <ChevronRight className="w-3.5 h-3.5 text-[#495057]" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

        {activeInvTab === "cargos" && (
          <div className="bg-white rounded-[4px] border border-[#E9ECEF] p-4" style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}>
            <CargosTab />
          </div>
        )}

        {activeInvTab === "cargo_type" && (
          <div className="bg-white rounded-[4px] border border-[#E9ECEF] p-4" style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}>
            <CargoTypesTab />
          </div>
        )}

        {activeInvTab === "billto_shipto" && (
          <div className="bg-white rounded-[4px] border border-[#E9ECEF] overflow-hidden" style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead style={{ backgroundColor: "#F8F9FA" }}>
                  <tr className="border-b border-[#E9ECEF]">
                    <th className="text-left py-3 px-4 font-semibold text-xs text-[#495057]">ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-xs text-[#495057]">Customer Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-xs text-[#495057]">Bill To</th>
                    <th className="text-left py-3 px-4 font-semibold text-xs text-[#495057]">Ship To</th>
                    <th className="text-left py-3 px-4 font-semibold text-xs text-[#495057]">Delivery address</th>
                    <th className="text-left py-3 px-4 font-semibold text-xs text-[#495057]">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-xs text-[#495057]">Phone</th>
                    <th className="text-left py-3 px-4 font-semibold text-xs text-[#495057]">Website</th>
                    <th className="text-center py-3 px-4 font-semibold text-xs text-[#495057]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F3F5]">
                  {loading ? (
                    <tr><td colSpan={9} className="py-12 text-center text-xs text-[#6C757D]">Loading customers...</td></tr>
                  ) : customers.length === 0 ? (
                    <tr><td colSpan={9} className="py-12 text-center text-xs text-[#6C757D]">No customers found</td></tr>
                  ) : (
                    customers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-[#F8F9FA] transition-colors group">
                        <td className="py-4 px-4">
                          <button className="flex items-center gap-1.5 px-2.5 py-1 bg-[#495057] text-white text-[10px] font-bold rounded-[4px] hover:bg-[#343A40] transition-colors whitespace-nowrap">
                            {customer.id.slice(-2)} <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                        <td className="py-4 px-4 text-xs text-[#212529]">
                          <span className="px-2 py-0.5 bg-gray-100 rounded-[4px] text-[10px] font-medium uppercase text-[#495057]">GT-Warehouse</span>
                        </td>
                        <td className="py-4 px-4 text-xs font-semibold text-[#212529]">GTech</td>
                        <td className="py-4 px-4 text-xs text-[#212529]">{customer.companyName}</td>
                        <td className="py-4 px-4 text-xs text-[#6C757D] max-w-[200px] truncate">
                          {customer.country}, {customer.city}, {customer.addressLine1}
                        </td>
                        <td className="py-4 px-4 text-xs text-[#212529]">{customer.email}</td>
                        <td className="py-4 px-4 text-xs text-[#212529] whitespace-nowrap">{customer.contactPhoneNumber}</td>
                        <td className="py-4 px-4 text-xs text-[#6C757D]">-</td>
                        <td className="py-4 px-4">
                          <div className="flex justify-center">
                            <button
                              onClick={() => router.push(`/customers/${customer.id}`)}
                              className="px-3.5 py-1.5 bg-[#059669] text-white text-[10px] font-bold rounded-[4px] hover:bg-green-600 transition-all shadow-md"
                            >
                              EDIT
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeInvTab === "packing_list" && (
          <div className="bg-white p-6 rounded-[4px] shadow-md border border-gray-200">
            <h2 className="text-lg font-bold mb-2">Packing List</h2>
            <p className="text-xs text-gray-500 mb-6">Manage packing lists for invoices.</p>
            <div className="border-2 border-dashed border-gray-100 rounded-[4px] h-48 flex flex-col items-center justify-center text-gray-300">
              <FileText className="w-10 h-10 mb-2 opacity-10" />
              <p className="text-xs">Packing List functionalities will be added here.</p>
            </div>
          </div>
        )}
        {showREModal && selectedItem && (
          <CustomModal
            isOpen={showREModal}
            onClose={() => setShowREModal(false)}
            title={`Reassign Item ${selectedItem.id}`}
          >
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Cargo</label>
                <select
                  value={targetCargoId}
                  onChange={(e) => setTargetCargoId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-[#059669]"
                >
                  <option value="">-- Choose Cargo --</option>
                  {cargos.map(c => (
                    <option key={c.id} value={c.id}>{c.cargo_no}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowREModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button
                  onClick={handleReassignItem}
                  disabled={!targetCargoId}
                  className="px-4 py-2 text-sm bg-[#059669] text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Reassign
                </button>
              </div>
            </div>
          </CustomModal>
        )}

        {showSPModal && selectedItem && (
          <CustomModal
            isOpen={showSPModal}
            onClose={() => setShowSPModal(false)}
            title={`Split Item ${selectedItem.id}`}
          >
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">Current Qty: <span className="font-bold">{selectedItem.qty}</span></p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Split Quantity (amount to move to new row)</label>
                <input
                  type="number"
                  value={splitQty}
                  onChange={(e) => setSplitQty(Number(e.target.value))}
                  min={1}
                  max={selectedItem.qty - 1}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowSPModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button
                  onClick={handleSplitItem}
                  disabled={splitQty <= 0 || splitQty >= selectedItem.qty}
                  className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  Split Now
                </button>
              </div>
            </div>
          </CustomModal>
        )}

        {showQTYModal && selectedItem && (
          <CustomModal
            isOpen={showQTYModal}
            onClose={() => setShowQTYModal(false)}
            title={`Update Quantity for Item ${selectedItem.id}`}
          >
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Quantity</label>
                <input
                  type="number"
                  value={newQty}
                  onChange={(e) => setNewQty(Number(e.target.value))}
                  min={1}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-[#059669]"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowQTYModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button
                  onClick={handleUpdateQty}
                  disabled={newQty <= 0}
                  className="px-4 py-2 text-sm bg-[#059669] text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Update Qty
                </button>
              </div>
            </div>
          </CustomModal>
        )}
      </div>
    </div>
  );
};

export default InvoiceListPage;

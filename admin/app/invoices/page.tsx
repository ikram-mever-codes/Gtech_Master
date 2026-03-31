"use client";
import React, { useState, useEffect } from "react";
import Select from "react-select";
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
  AlertCircle,
  CheckCircle,
  XCircle,
  PlusCircle,
  Loader2,
  ChevronDown,
  Package,
  Clock,
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
import { getAllCustomers, CustomerData as APICustomerData, updateCustomerProfile } from "@/api/customers";
import { updateOrderItemStatus, splitOrderItem, updateOrderItemPrice } from "@/api/orders";
import { getAllCargos, CargoType, assignOrdersToCargo } from "@/api/cargos";
import { getAllTaricsSimple } from "@/api/items";
import BillToShipToForm, { BillToShipToData, WAREHOUSE_BILL_TO } from "@/components/General/BillToShipToForm";
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
  bill_to?: string;
  ship_to?: string;
  customItemCount?: number;
  customTotalQty?: number;
  description?: string;
  freightCost?: number | string;
  remark?: string;
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
  const [showBTSTModal, setShowBTSTModal] = useState(false);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<any>(null);
  const [btstFormData, setBtstFormData] = useState<Partial<BillToShipToData>>({});

  const [expandedPriceItemId, setExpandedPriceItemId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);

  const [splitRemarks, setSplitRemarks] = useState<string>("");
  const [tarics, setTarics] = useState<any[]>([]);
  const [selectedTaricCode, setSelectedTaricCode] = useState<string>("");
  const [expandedTaricGroupId, setExpandedTaricGroupId] = useState<string | null>(null);

  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [invoiceEditForm, setInvoiceEditForm] = useState({ description: "", freightCost: "", remark: "" });

  const [showTaricModal, setShowTaricModal] = useState(false);
  const [selectedTaricGroup, setSelectedTaricGroup] = useState<any>(null);
  const [qtyRemarks, setQtyRemarks] = useState("");

  const handleSetPrice = async (itemId: string | number) => {
    try {
      const res = await updateOrderItemPrice(itemId, editingPrice);
      if (res.success) {
        setExpandedPriceItemId(null);
        Object.keys(expandedStates).forEach(async (invId) => {
          if (expandedStates[invId].items) {
            const response = await getExpandedInvoiceDetails(invId);
            if (response.success) {
              setExpandedStates(prev => ({
                ...prev,
                [invId]: { ...prev[invId], data: response.data }
              }));
            }
          }
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleExpansion = async (id: string, type: 'taric' | 'items') => {
    const currentState = expandedStates[id] || {};
    let isCurrentlyOpen = type === 'taric' ? currentState.taric : currentState.items;

    let newState: any;
    if (activeInvTab === 'closed_invoices') {
      const bothActive = currentState.taric && currentState.items;
      newState = { ...currentState, taric: !bothActive, items: !bothActive };
      isCurrentlyOpen = bothActive;
    } else {
      newState = { ...currentState, [type]: !isCurrentlyOpen };
    }

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
    getAllCargos({ limit: 1000, availableOnly: true }).then((res) => {
      if (res.success) setCargos(res.data);
    });
    getAllTaricsSimple().then(res => {
      if (res.success) setTarics(res.data);
    });
  }, []);

  const handleReassignItem = async () => {
    if (!selectedItem || !targetCargoId) return;
    try {
      const cargoIdNum = Number(targetCargoId);
      await updateOrderItemStatus(selectedItem.id, { cargo_id: cargoIdNum });

      const orderId = selectedItem.order_id || selectedItem.order?.id;
      if (orderId) {
        await assignOrdersToCargo(cargoIdNum, [Number(orderId)], true);
      }

      toast.success("Item reassigned successfully");
      setShowREModal(false);

      const invId = Object.keys(expandedStates).find(key =>
        expandedStates[key].data?.detailedItems?.some((it: any) => it.id === selectedItem.id)
      );

      if (invId) {
        setExpandedStates(prev => {
          const newState = { ...prev };
          delete newState[invId];
          return newState;
        });
      }

      await loadInvoices();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reassign item refresh");
    }
  };

  const handleSplitItem = async () => {
    if (!selectedItem || splitQty <= 0) return;
    try {
      await splitOrderItem(selectedItem.id, splitQty, targetCargoId, splitRemarks);
      toast.success("Item split and moved successfully");
      setShowSPModal(false);
      setSplitRemarks("");
      const invId = Object.keys(expandedStates).find(key =>
        expandedStates[key].data?.detailedItems?.some((it: any) => it.id === selectedItem.id)
      );
      if (invId) {
        setExpandedStates(prev => {
          const newState = { ...prev };
          delete newState[invId];
          return newState;
        });
      }
      await loadInvoices();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetTaric = async (group: any) => {
    if (!selectedTaricCode || !group) return;
    try {
      const invId = Object.keys(expandedStates).find(key =>
        expandedStates[key].taric && expandedStates[key].data?.taricGroups?.some((g: any) => g.taricId === group.taricId)
      );

      if (!invId) {
        toast.error("Could not find invoice for this taric group");
        return;
      }

      const itemsInGroup = expandedStates[invId].data?.detailedItems?.filter((oi: any) => {
        const itemTaricCode = oi.item?.taric?.code || "";
        const isProjectItem = !itemTaricCode || itemTaricCode === "0" || itemTaricCode === "0000000000";
        let oiGroupKey = "";
        if (oi.set_taric_code) {
          oiGroupKey = `set_${oi.set_taric_code}`;
        } else {
          const taricId = oi.item?.taric?.id;
          oiGroupKey = taricId ? `taric_${taricId}` : "unknown";
        }
        return oiGroupKey === group.taricId;
      });

      if (itemsInGroup && itemsInGroup.length > 0) {
        for (const oi of itemsInGroup) {
          const originalCode = oi.item?.taric?.code;
          const hasOriginal = originalCode && originalCode !== "0" && originalCode !== "0000000000";

          let newTaricValue = "";
          if (hasOriginal) {
            newTaricValue = `${originalCode}/${selectedTaricCode}`;
          } else {
            const priorSet = oi.set_taric_code;
            if (priorSet && priorSet.includes('/')) {
              const parts = priorSet.split('/');
              newTaricValue = `${parts[0]}/${selectedTaricCode}`;
            } else if (priorSet && priorSet !== selectedTaricCode) {
              newTaricValue = `${priorSet}/${selectedTaricCode}`;
            } else {
              newTaricValue = selectedTaricCode;
            }
          }
          await updateOrderItemStatus(oi.id, { set_taric_code: newTaricValue });
        }
        toast.success("Taric codes updated successfully");
        setShowTaricModal(false);
        setSelectedTaricCode("");

        const res = await getExpandedInvoiceDetails(invId);
        if (res.success) {
          setExpandedStates(prev => ({
            ...prev,
            [invId]: { ...prev[invId], data: res.data }
          }));
        }
      } else {
        toast.error("No items found in this group to update");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update taric codes");
    }
  };

  const handleUpdateQty = async () => {
    if (!selectedItem || newQty <= 0) return;
    try {
      await updateOrderItemStatus(selectedItem.id, { qty_label: newQty, remarks_cn: qtyRemarks });
      toast.success("QtyLabel updated successfully");
      setShowQTYModal(false);
      setQtyRemarks("");
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

  const handleOpenBTSTModal = (customer: any) => {
    setSelectedCustomerForEdit(customer);
    setBtstFormData({
      customer_type: customer.customer_type || "GT-Warehouse",
      ...(customer.customer_type === "Other Customer" ? {} : WAREHOUSE_BILL_TO),
      bill_to_company_name: customer.bill_to_company_name || WAREHOUSE_BILL_TO.bill_to_company_name,
      bill_to_display_name: customer.bill_to_display_name || WAREHOUSE_BILL_TO.bill_to_display_name,
      bill_to_phone_no: customer.bill_to_phone_no || WAREHOUSE_BILL_TO.bill_to_phone_no,
      bill_to_tax_no: customer.bill_to_tax_no || WAREHOUSE_BILL_TO.bill_to_tax_no,
      bill_to_email: customer.bill_to_email || WAREHOUSE_BILL_TO.bill_to_email,
      bill_to_website: customer.bill_to_website || WAREHOUSE_BILL_TO.bill_to_website,
      bill_to_contact_person: customer.bill_to_contact_person || WAREHOUSE_BILL_TO.bill_to_contact_person,
      bill_to_contact_phone: customer.bill_to_contact_phone || WAREHOUSE_BILL_TO.bill_to_contact_phone,
      bill_to_contact_mobile: customer.bill_to_contact_mobile || WAREHOUSE_BILL_TO.bill_to_contact_mobile,
      bill_to_contact_email: customer.bill_to_contact_email || WAREHOUSE_BILL_TO.bill_to_contact_email,
      bill_to_country: customer.bill_to_country || WAREHOUSE_BILL_TO.bill_to_country,
      bill_to_city: customer.bill_to_city || WAREHOUSE_BILL_TO.bill_to_city,
      bill_to_postal_code: customer.bill_to_postal_code || WAREHOUSE_BILL_TO.bill_to_postal_code,
      bill_to_full_address: customer.bill_to_full_address || WAREHOUSE_BILL_TO.bill_to_full_address,
      ship_to_company_name: customer.ship_to_company_name || customer.companyName || "",
      ship_to_display_name: customer.ship_to_display_name || customer.companyName || "",
      ship_to_contact_person: customer.ship_to_contact_person || "-",
      ship_to_contact_phone: customer.ship_to_contact_phone || customer.contactPhoneNumber || "",
      ship_to_country: customer.ship_to_country || customer.deliveryCountry || customer.country || "",
      ship_to_city: customer.ship_to_city || customer.deliveryCity || customer.city || "",
      ship_to_postal_code: customer.ship_to_postal_code || customer.deliveryPostalCode || customer.postalCode || "",
      ship_to_full_address: customer.ship_to_full_address || customer.deliveryAddressLine1 || customer.addressLine1 || "",
      ship_to_remarks: customer.ship_to_remarks || "",
    });
    setShowBTSTModal(true);
  };

  const handleSaveBTST = async () => {
    if (!selectedCustomerForEdit) return;
    try {
      const payload = {
        ...selectedCustomerForEdit,
        ...btstFormData,
      };
      const res = await updateCustomerProfile(payload);
      if (res?.success) {
        setShowBTSTModal(false);
        fetchCustomers();
      }
    } catch (error) {
      console.error("Failed to update billto/shipto:", error);
    }
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
                                      {(invoice as any).cargoNo || invoice.orderNumber || invoice.id.slice(-6)} {expState.taric ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    </button>
                                  </td>
                                  {activeInvTab === "closed_invoices" && (
                                    <td className="py-4 px-4 text-xs font-semibold text-[#212529]">{invoice.invoiceNumber || "N/A"}</td>
                                  )}
                                  <td className="py-4 px-4 text-xs text-[#212529]">{invoice.bill_to || "N/A"}</td>
                                  <td className="py-4 px-4 text-xs text-[#6C757D]">{invoice.ship_to || "-"}</td>
                                  <td className="py-4 px-4 text-xs text-[#212529]">
                                    {activeInvTab === "open_invoices" ? (() => {
                                      const cargoData = expandedStates[invoice.id]?.data?.cargo;
                                      if (cargoData) {
                                        return <span className="font-medium">{cargoData.id} - {cargoData.cargo_no}</span>;
                                      }
                                      return <span className="font-medium">{invoice.id.slice(-2)} - {invoice.orderNumber || "No Cargo"}</span>;
                                    })() : (
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
                                      {invoice.customItemCount ?? invoice.items?.length ?? 0}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-xs text-[#212529] font-medium">
                                    {invoice.customTotalQty ?? invoice.items?.reduce((sum: any, item: any) => sum + item.quantity, 0) ?? 0}
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
                                          <button
                                            onClick={() => {
                                              if (editingInvoiceId === invoice.id) setEditingInvoiceId(null);
                                              else {
                                                setEditingInvoiceId(invoice.id);
                                                setInvoiceEditForm({
                                                  description: invoice.description || "",
                                                  freightCost: invoice.freightCost?.toString() || "",
                                                  remark: invoice.remark || ""
                                                });
                                              }
                                            }}
                                            className="px-3.5 py-1 bg-[#28A745] text-white text-[10px] font-bold rounded-[4px] hover:bg-green-600 transition-colors"
                                          >
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
                                    <td colSpan={activeInvTab === "closed_invoices" ? 11 : 8} className="p-0 bg-[#F8F9FA]">
                                      <div className="p-4 space-y-4">
                                        {expState.data?.cargo && (
                                          <div className="flex items-center gap-4 px-4 py-2 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[4px] text-xs">
                                            <span className="font-bold text-[#1D4ED8]">
                                              Cargo: {expState.data.cargo.id} - {expState.data.cargo.cargo_no}
                                            </span>
                                            {expState.data.orderNosInCargo?.length > 0 && (
                                              <span className="text-[#374151]">
                                                Orders: <span className="font-semibold">{expState.data.orderNosInCargo.join(", ")}</span>
                                              </span>
                                            )}
                                            {expState.data.cargo.ship_to && (
                                              <span className="text-[#374151]">Ship To: <span className="font-semibold">{expState.data.cargo.ship_to}</span></span>
                                            )}
                                          </div>
                                        )}
                                        {expState.taric && (
                                          <div className="space-y-2">
                                            <h4 className="text-[11px] font-bold text-[#495057] uppercase tracking-wider mb-2">
                                              Items to be shown in invoice based on Taric
                                            </h4>
                                            <SpreadSheet
                                              data={expState.data?.taricGroups || []}
                                              loading={expState.loading}
                                              showTotals={true}
                                              columns={activeInvTab === 'closed_invoices' ? [
                                                { header: "Position", render: (_: any, idx: number) => idx + 1, width: "70px" },
                                                { header: "Taric Name EN", render: (it: any) => it.taricNameEn, width: "350px" },
                                                {
                                                  header: "Taric Code", render: (it: any) => (
                                                    <span style={it.isProjectItem ? { color: '#F59E0B', fontWeight: 600 } : undefined}>
                                                      {it.taricCode}
                                                    </span>
                                                  ), width: "140px"
                                                },
                                                { header: "Duty rate", render: (it: any) => it.dutyRate ? `${Number(it.dutyRate).toFixed(2)}` : "-", width: "80px" },
                                                { header: "Total Qty", render: (it: any) => it.totalQty, align: "center", width: "100px" },
                                                { header: "Unit Price", render: (it: any) => it.unitPrice || "0.00", width: "100px" },
                                                { header: "Total Price", render: (it: any) => (Number(it.totalPrice) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }), width: "120px" }
                                              ] : [
                                                { header: "Position", render: (_: any, idx: number) => idx + 1, width: "70px" },
                                                { header: "Taric Name EN", render: (it: any) => it.taricNameEn, width: "350px" },
                                                {
                                                  header: "Taric Code", render: (it: any) => (
                                                    <span style={it.isProjectItem ? { color: '#F59E0B', fontWeight: 600 } : undefined}>
                                                      {it.taricCode}
                                                    </span>
                                                  ), width: "140px"
                                                },
                                                { header: "Duty rate", render: (it: any) => it.dutyRate ? `${Number(it.dutyRate).toFixed(2)}` : "-", width: "80px" },
                                                { header: "Total Qty", render: (it: any) => it.totalQty, align: "center", width: "100px" },
                                                { header: "Unit Price", render: (it: any) => it.unitPrice || "0.00", width: "100px" },
                                                { header: "Total Price", render: (it: any) => (Number(it.totalPrice) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }), width: "120px" },
                                                {
                                                  header: "Operation",
                                                  render: (group: any) => (
                                                    <button
                                                      onClick={() => {
                                                        setSelectedTaricGroup(group); setSelectedTaricCode(""); setShowTaricModal(true);
                                                      }}
                                                      className="flex items-center gap-1 px-3 py-1 bg-[#1A73E8] text-white text-[10px] font-bold rounded hover:bg-[#1557B0]"
                                                    >
                                                      <RefreshCw className="w-3 h-3" /> Set taric
                                                    </button>
                                                  ),
                                                  width: "120px"
                                                }
                                              ]}
                                              expandedRowId={null}
                                              totalCols={activeInvTab === 'closed_invoices' ? [
                                                { label: "Grand Total", value: "", width: "740px", align: "left" },
                                                { value: expState.data?.taricGroups?.reduce((s: number, g: any) => s + (g.totalQty || 0), 0) || 0, width: "100px", align: "center" },
                                                { value: "", width: "100px" },
                                                { value: (expState.data?.taricGroups?.reduce((s: number, g: any) => s + (g.totalPrice || 0), 0) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }), width: "120px", align: "left" }
                                              ] : [
                                                { label: "Grand Total", value: "", width: "620px", align: "left" },
                                                { value: expState.data?.taricGroups?.reduce((s: number, g: any) => s + (g.totalQty || 0), 0) || 0, width: "100px", align: "center" },
                                                { value: "", width: "100px" },
                                                { value: (expState.data?.taricGroups?.reduce((s: number, g: any) => s + (g.totalPrice || 0), 0) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }), width: "120px", align: "left" },
                                                { value: "", width: "120px" }
                                              ]}
                                            />
                                          </div>
                                        )}
                                        {expState.items && (
                                          <SpreadSheet
                                            data={expState.data?.detailedItems || []}
                                            loading={expState.loading}
                                            columns={activeInvTab === 'closed_invoices' ? [
                                              { header: "#", render: (_: any, idx: number) => idx + 1, width: "40px" },
                                              { header: "EAN", render: (it: any) => it.item?.ean || "-", width: "110px" },
                                              {
                                                header: "Item Name",
                                                render: (it: any) => (
                                                  <div className="line-clamp-2 leading-tight py-1" title={it.item?.item_name}>
                                                    {it.item?.item_name}
                                                  </div>
                                                ),
                                                width: "350px"
                                              },
                                              { header: "Taric code", render: (it: any) => it.set_taric_code || it.item?.taric?.code || "-", width: "100px" },
                                              {
                                                header: "QTY",
                                                render: (it: any) => (
                                                  <span className="font-bold">{it.qty}</span>
                                                ),
                                                width: "60px",
                                                align: "center"
                                              },
                                              { header: "RMB", render: (it: any) => it.rmb_special_price || "0", width: "60px", align: "center" },
                                              {
                                                header: "EK",
                                                render: (it: any) => it.eur_special_price && Number(it.eur_special_price) > 0 ? (
                                                  <span className="font-bold text-[#10B981]">{Number(it.eur_special_price).toFixed(2)}</span>
                                                ) : "0",
                                                width: "80px",
                                                align: "center"
                                              }
                                            ] : [
                                              {
                                                header: "ID",
                                                render: (it: any) => (
                                                  <div className="flex flex-col gap-1.5 p-1">
                                                    <div className="px-2 py-1 bg-[#495057] text-white text-[10px] font-bold rounded-[4px] text-center mb-1 flex items-center justify-center gap-1.5">
                                                      <FileText className="w-3 h-3" /> {it.id}
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                      <button
                                                        onClick={() => {
                                                          setSelectedItem(it);
                                                          setNewQty(it.qty_label || it.qty);
                                                          setQtyRemarks(it.remarks_cn || "");
                                                          setShowQTYModal(true);
                                                        }}
                                                        className="flex items-center gap-1.5 px-2 py-1.5 text-[9px] font-bold bg-[#495057] text-white rounded-[4px] hover:bg-[#343A40] transition shadow-sm uppercase"
                                                      >
                                                        <div className="bg-white/20 p-0.5 rounded"><Package className="w-2.5 h-2.5" /></div> QtyLabel
                                                      </button>
                                                      <button
                                                        onClick={() => {
                                                          setSelectedItem(it);
                                                          setSplitQty(Math.floor(it.qty * 0.5));
                                                          setTargetCargoId("");
                                                          setSplitRemarks(it.remarks_cn || "");
                                                          setShowSPModal(true);
                                                        }}
                                                        className="flex items-center gap-1.5 px-2 py-1.5 text-[9px] font-bold bg-[#F15A24] text-white rounded-[4px] hover:bg-[#D9481B] transition shadow-sm uppercase"
                                                      >
                                                        <div className="bg-white/20 p-0.5 rounded"><Scissors className="w-2.5 h-2.5" /></div> Split
                                                      </button>
                                                      <button
                                                        onClick={() => {
                                                          setSelectedItem(it);
                                                          setTargetCargoId(it.cargo_id || "");
                                                          setShowREModal(true);
                                                        }}
                                                        className="flex items-center gap-1.5 px-2 py-1.5 text-[9px] font-bold bg-[#4F46E5] text-white rounded-[4px] hover:bg-[#4338CA] transition shadow-sm uppercase"
                                                      >
                                                        <div className="bg-white/20 p-0.5 rounded"><RefreshCw className="w-2.5 h-2.5" /></div> ReAssign
                                                      </button>
                                                    </div>
                                                  </div>
                                                ),
                                                width: "100px"
                                              },
                                              { header: "EAN", render: (it: any) => it.item?.ean, width: "110px" },
                                              {
                                                header: "Item Name",
                                                render: (it: any) => (
                                                  <div className="line-clamp-3 leading-tight break-words" title={it.item?.item_name}>
                                                    {it.item?.item_name}
                                                  </div>
                                                ),
                                                width: "250px"
                                              },
                                              { header: "Taric code", render: (it: any) => it.set_taric_code || it.item?.taric?.code, width: "90px" },
                                              { header: "Remark", render: (it: any) => `// ${it.remark_de || ''}`, width: "80px" },
                                              { header: "Order_no", render: (it: any) => it.order?.order_no || "-", width: "80px" },
                                              { header: "SOID", render: (it: any) => it.supplier_order_id || "-", width: "50px" },
                                              { header: "Status", render: (it: any) => it.status, width: "60px" },
                                              { header: "V(dm³)", render: (it: any) => it.v?.toFixed(2), width: "60px", align: "center" },
                                              { header: "W(kg)", render: (it: any) => it.w?.toFixed(2), width: "60px", align: "center" },
                                                {
                                                  header: "QTY",
                                                  render: (it: any) => (
                                                    <div className="flex flex-col items-center">
                                                      <span className="font-bold">
                                                        {it.qty_label ? `${it.qty_label}/${it.qty}` : it.qty}
                                                      </span>
                                                    </div>
                                                  ),
                                                  width: "60px",
                                                  align: "center"
                                                },
                                              { header: "RMB", render: (it: any) => it.rmb_special_price || "0", width: "45px", align: "center" },
                                              {
                                                header: "EK",
                                                render: (it: any) => it.eur_special_price && Number(it.eur_special_price) > 0 ? (
                                                  <span className="font-bold text-[#10B981]">{Number(it.eur_special_price).toFixed(2)}</span>
                                                ) : "0",
                                                width: "65px",
                                                align: "center"
                                              },
                                              {
                                                header: "Action",
                                                render: (it: any) => (
                                                  (it.item?.is_eur_special === "Y" && (!it.eur_special_price || Number(it.eur_special_price) === 0)) ? (
                                                    <button
                                                      onClick={() => {
                                                        setExpandedPriceItemId(expandedPriceItemId === it.id ? null : it.id);
                                                        setEditingPrice(it.eur_special_price || 0);
                                                      }}
                                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EF4444] text-white text-[10px] font-bold rounded-[4px] hover:bg-red-600 transition-all shadow-md whitespace-nowrap"
                                                    >
                                                      <DollarSign className="w-3.5 h-3.5" /> SET EUR PRICE
                                                    </button>
                                                  ) : null
                                                ),
                                                width: "120px"
                                              }
                                            ]}
                                            expandedRowId={expandedPriceItemId}
                                            renderRowDetails={(it: any) => (
                                              <div className="bg-[#F8F9FA] p-4 rounded-md border border-gray-200 mt-2 shadow-inner">
                                                <h4 className="text-[11px] font-bold text-[#495057] uppercase mb-3 tracking-wider flex items-center gap-2">
                                                  <div className="w-1.5 h-1.5 bg-[#EF4444] rounded-full"></div>
                                                  Set EUR Price for Item {it.id}
                                                </h4>
                                                <div className="space-y-3">
                                                  <div>
                                                    <label className="block text-[10px] font-bold text-[#6C757D] uppercase mb-1.5">EUR Special Price</label>
                                                    <div className="relative">
                                                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 text-xs text-black"></span>
                                                      </div>
                                                      <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editingPrice}
                                                        onChange={(e) => setEditingPrice(Number(e.target.value))}
                                                        className="w-full pl-7 pr-3 py-2 bg-white border border-gray-300 rounded-[4px] text-sm focus:ring-2 focus:ring-[#EF4444] focus:border-transparent outline-none transition-all shadow-sm font-medium text-black"
                                                        placeholder="0.00"
                                                      />
                                                    </div>
                                                  </div>
                                                  <div className="flex gap-2 pt-1">
                                                    <button
                                                      onClick={() => setExpandedPriceItemId(null)}
                                                      className="px-4 py-2 text-[11px] font-bold text-[#495057] bg-white border border-[#DEE2E6] rounded-[4px] hover:bg-gray-50 transition-all uppercase shadow-sm"
                                                    >
                                                      Cancel
                                                    </button>
                                                    <button
                                                      onClick={() => handleSetPrice(it.id)}
                                                      className="px-5 py-2 text-[11px] font-bold text-white bg-[#10B981] rounded-[4px] hover:bg-[#059669] transition-all uppercase shadow-md flex items-center gap-2"
                                                    >
                                                      <Check className="w-3.5 h-3.5" /> Set Price
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                            showTotals={false}
                                          />
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                                {editingInvoiceId === invoice.id && (
                                  <tr>
                                    <td colSpan={activeInvTab === "closed_invoices" ? 11 : 9} className="p-0 border-b border-[#E9ECEF] bg-[#F8F9FA]">
                                      <div className="p-6 flex justify-center w-full">
                                        <div className="bg-white p-6 rounded-[8px] border border-[#E9ECEF] shadow-sm w-full max-w-2xl">
                                          <div className="space-y-4">
                                            <div className="grid grid-cols-1 gap-4">
                                              <div>
                                                <label className="block text-[11px] font-bold text-[#495057] mb-1.5">Description *</label>
                                                <input
                                                  type="text"
                                                  value={invoiceEditForm.description}
                                                  onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, description: e.target.value })}
                                                  className="w-full px-3 py-2 border border-[#DEE2E6] rounded-[4px] text-sm focus:outline-none focus:border-[#8CC21B]"
                                                  placeholder="Freight cost"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[11px] font-bold text-[#495057] mb-1.5">Freight Cost *</label>
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  value={invoiceEditForm.freightCost}
                                                  onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, freightCost: e.target.value })}
                                                  className="w-full px-3 py-2 border border-[#DEE2E6] rounded-[4px] text-sm focus:outline-none focus:border-[#8CC21B]"
                                                  placeholder="Enter Freight Cost"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-[11px] font-bold text-[#495057] mb-1.5">Remark</label>
                                                <textarea
                                                  value={invoiceEditForm.remark}
                                                  onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, remark: e.target.value })}
                                                  rows={3}
                                                  className="w-full px-3 py-2 border border-[#DEE2E6] rounded-[4px] text-sm focus:outline-none focus:border-[#8CC21B]"
                                                  placeholder="Enter extra info"
                                                />
                                              </div>
                                            </div>
                                            <div className="flex justify-center gap-3 pt-4">
                                              <button
                                                onClick={() => setEditingInvoiceId(null)}
                                                className="px-6 py-2 text-[11px] font-bold text-[#495057] bg-white border border-[#DEE2E6] rounded-[20px] hover:bg-gray-50 flex items-center gap-1.5 shadow-sm transition-all"
                                              >
                                                <XCircle className="w-3.5 h-3.5" /> Cancel
                                              </button>
                                              <button
                                                onClick={() => {
                                                  toast.success("Saved successfully");
                                                  setEditingInvoiceId(null);
                                                }}
                                                className="px-6 py-2 text-[11px] font-bold text-white bg-[#059669] rounded-[20px] hover:bg-green-700 flex items-center gap-1.5 shadow-md transition-all"
                                              >
                                                <PlusCircle className="w-3.5 h-3.5" /> Save
                                              </button>
                                            </div>
                                          </div>
                                        </div>
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
                              onClick={() => handleOpenBTSTModal(customer)}
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
                <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                  Select Target Cargo
                </label>
                <Select
                  className="text-sm"
                  options={cargos
                    .map((c) => ({
                      value: String(c.id),
                      label: `${c.cargo_no} ${c.cargo_status ? `(${c.cargo_status})` : ""}`,
                    }))}
                  value={cargos
                    .map((c) => ({
                      value: String(c.id),
                      label: `${c.cargo_no} ${c.cargo_status ? `(${c.cargo_status})` : ""}`,
                    }))
                    .find((opt) => opt.value === String(targetCargoId)) || null}
                  onChange={(opt: any) => setTargetCargoId(opt?.value || "")}
                  placeholder="Search or Select Cargo..."
                  isSearchable
                  isClearable
                />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => setShowREModal(false)}
                  className="px-5 py-2 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-[4px] transition-all uppercase"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReassignItem}
                  disabled={!targetCargoId}
                  className="px-6 py-2 text-sm bg-[#059669] text-white rounded-[4px] hover:bg-green-700 disabled:opacity-50 transition-all font-bold uppercase shadow-md flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Confirm Reassign
                </button>
              </div>
            </div>
          </CustomModal>
        )}

        {showSPModal && selectedItem && (
          <CustomModal
            isOpen={showSPModal}
            onClose={() => setShowSPModal(false)}
            title="Split Item Position Across Cargos"
          >
            <div className="p-4 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Split Quantity:</label>
                <div className="relative">
                  <input
                    type="number"
                    value={splitQty}
                    onChange={(e) => setSplitQty(Number(e.target.value))}
                    min={1}
                    max={selectedItem.qty - 1}
                    className="w-full border-2 border-[#10B981] rounded-xl p-3 text-lg outline-none focus:ring-0 shadow-sm"
                    placeholder="Enter quantity to split"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-2 px-1">Available to split: {selectedItem.qty}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Target Cargo (Optional)</label>
                <Select
                  options={cargos.map(c => ({ value: String(c.id), label: `${c.cargo_no} (${c.cargo_status})` }))}
                  value={cargos.map(c => ({ value: String(c.id), label: `${c.cargo_no} (${c.cargo_status})` })).find(opt => opt.value === targetCargoId) || null}
                  onChange={(opt: any) => setTargetCargoId(opt?.value || "")}
                  placeholder="Select cargo..."
                  isClearable
                  className="text-sm shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Review (CN)</label>
                <textarea
                  value={splitRemarks}
                  onChange={(e) => setSplitRemarks(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[#10B981] min-h-[100px]"
                  placeholder="Chinese review or split notes..."
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSplitItem}
                  disabled={splitQty <= 0 || splitQty >= selectedItem.qty}
                  className="w-full sm:w-auto px-10 py-3 bg-[#10B981] text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                  Split & Move Item Position
                </button>
              </div>
            </div>
          </CustomModal>
        )}

        {showTaricModal && selectedTaricGroup && (
          <CustomModal
            isOpen={showTaricModal}
            onClose={() => setShowTaricModal(false)}
            title="Set Taric Code"
          >
            <div className="p-4 space-y-4">
              <p className="text-[11px] font-bold text-gray-600 mb-1 uppercase tracking-tight">
                Current taric code is : <span className="text-black ml-1">{selectedTaricGroup.taricCode}</span>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select new taric code</label>
                <select
                  value={selectedTaricCode}
                  onChange={(e) => setSelectedTaricCode(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-[#1A73E8] bg-white text-black"
                >
                  <option value="">Select Taric Code</option>
                  {tarics.map(t => (
                    <option key={t.id} value={t.code}>
                      {t.code} - {t.description_de || t.name_de || t.name_en || 'No description available'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowTaricModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 uppercase font-bold text-[10px]">Cancel</button>
                <button
                  onClick={() => handleSetTaric(selectedTaricGroup)}
                  disabled={!selectedTaricCode}
                  className="px-6 py-2 text-sm bg-[#1A73E8] text-white rounded-lg hover:bg-[#1557B0] disabled:opacity-50 uppercase font-bold text-[10px]"
                >
                  Update Taric
                </button>
              </div>
            </div>
          </CustomModal>
        )}

        {showQTYModal && selectedItem && (
          <CustomModal
            isOpen={showQTYModal}
            onClose={() => setShowQTYModal(false)}
            title={`Update QtyLabel for this item`}
          >
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New QtyLabel</label>
                <input
                  type="number"
                  value={newQty}
                  onChange={(e) => setNewQty(Number(e.target.value))}
                  min={1}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-[#8CC21B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enter Remarks</label>
                <textarea
                  value={qtyRemarks}
                  onChange={(e) => setQtyRemarks(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-[#8CC21B]"
                  placeholder="Enter remarks..."
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowQTYModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button
                  onClick={handleUpdateQty}
                  disabled={newQty <= 0}
                  className="px-4 py-2 text-sm bg-[#059669] text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Update QtyLabel
                </button>
              </div>
            </div>
          </CustomModal>
        )}
        {showBTSTModal && (
          <CustomModal
            isOpen={showBTSTModal}
            onClose={() => setShowBTSTModal(false)}
            title="Update Bill To / Ship To Details"
            width="max-w-5xl"
            footer={
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowBTSTModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-[4px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBTST}
                  className="px-6 py-2 text-sm bg-[#8CC21B] text-white rounded-[4px] hover:bg-opacity-90 font-bold transition-all shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            }
          >
            <BillToShipToForm
              data={btstFormData}
              isEditEnabled={true}
              selectedCustomer={selectedCustomerForEdit}
              onChange={(field, value) =>
                setBtstFormData((prev) => ({ ...prev, [field]: value }))
              }
              onBatchChange={(updates) =>
                setBtstFormData((prev) => ({ ...prev, ...updates }))
              }
            />
          </CustomModal>
        )}
      </div>
    </div>
  );
};

export default InvoiceListPage;

import type { CargoType } from "@/api/cargos";
import type { CargoTypeObj } from "@/api/cargo_types";
import type { GtechCompany } from "@/api/gtech_companies";

/**
 * Pure (non-React) helpers for the /invoices page's Open / Closed Invoices
 * tabs — moved out of page.tsx unchanged so the table, the details modal
 * and the page itself share one copy.
 */

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderNumber?: string;
  cargoNo?: string;
  invoiceDate: string;
  deliveryDate: string;
  netTotal: number;
  taxAmount: number;
  dueDate?: string;

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
  description?: string;
  freightCost?: number | string;
  remark?: string;
  customTotalQty?: number;
  cargoId?: number | null;
  cargo?: {
    id: number;
    cargo_no?: string;
    cargo_type?: any;
    cargo_type_id?: number;
    cargo_type_name?: string;
  } | null;
}

export interface FilterOptions {
  status: string;
  dateFrom: string;
  dateTo: string;
  customer: string;
  minAmount: string;
  maxAmount: string;
}

export const initialFilterOptions: FilterOptions = {
  status: "",
  dateFrom: "",
  dateTo: "",
  customer: "",
  minAmount: "",
  maxAmount: "",
};

export type InvoiceSortField = keyof Invoice;

export interface InvoiceEditForm {
  description: string;
  freightCost: string;
  remark: string;
}

export type ExpandedStates = Record<
  string,
  { taric?: boolean; items?: boolean; data?: any; loading?: boolean }
>;

export const getStatusColor = (status: string) => {
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

/** Cargo number shown in the invoice table / modal: only real cargo numbers
 * (starting with "C") are shown, anything else renders as `fallback`. */
export const getDisplayCargoNo = (invoice: Invoice, fallback: string) => {
  const cNo = (invoice.cargo?.cargo_no || invoice.cargoNo || "").trim();
  return cNo.toUpperCase().startsWith("C") ? cNo : fallback;
};

export const getCargoTypeNameFromInvoice = (
  invoice: Invoice,
  cargos: CargoType[],
  cargoTypesList: CargoTypeObj[],
) => {
  const invCargo: any = invoice.cargo;
  const cNo = (invCargo?.cargo_no || invoice.cargoNo || "").trim().toLowerCase();
  const cargoId = invCargo?.id || invoice.cargoId || (invoice as any).cargo_id;

  if (typeof invCargo?.cargo_type === "string" && invCargo.cargo_type.trim()) {
    return invCargo.cargo_type.trim();
  }
  if (typeof invCargo?.cargo_type_name === "string" && invCargo.cargo_type_name.trim()) {
    return invCargo.cargo_type_name.trim();
  }
  if (invCargo?.cargo_type?.type && typeof invCargo.cargo_type.type === "string") {
    return invCargo.cargo_type.type.trim();
  }

  const matchedCargo: any = cargos.find(
    (c: any) =>
      (cNo && c.cargo_no && String(c.cargo_no).trim().toLowerCase() === cNo) ||
      (cargoId && String(c.id) === String(cargoId)),
  );

  if (matchedCargo) {
    if (typeof matchedCargo.cargo_type === "string" && matchedCargo.cargo_type.trim()) {
      return matchedCargo.cargo_type.trim();
    }
    if (typeof matchedCargo.cargo_type_name === "string" && matchedCargo.cargo_type_name.trim()) {
      return matchedCargo.cargo_type_name.trim();
    }
    if (matchedCargo.cargo_type?.type && typeof matchedCargo.cargo_type.type === "string") {
      return matchedCargo.cargo_type.type.trim();
    }
    const typeId = matchedCargo.cargo_type_id || matchedCargo.cargo_type?.id;
    if (typeId !== undefined && typeId !== null) {
      const ct = cargoTypesList.find((t: any) => String(t.id) === String(typeId));
      if (ct) return ct.type || (ct as any).cargo_type || "-";
    }
  }

  const directTypeId = invCargo?.cargo_type_id || (invoice as any).cargo_type_id;
  if (directTypeId !== undefined && directTypeId !== null) {
    const ct = cargoTypesList.find((t: any) => String(t.id) === String(directTypeId));
    if (ct) return ct.type || (ct as any).cargo_type || "-";
  }

  return "-";
};

export const getBillToDisplayName = (
  invoice: Invoice,
  gtechCompanies: GtechCompany[],
) => {
  const billTo = (typeof invoice.bill_to === "string" ? invoice.bill_to : "").trim();
  const custName = (invoice.customer?.companyName || "").trim();
  const raw = billTo || custName;
  if (!raw) return "N/A";

  const matched = gtechCompanies.find(
    (g) =>
      (g.legal_name && g.legal_name.trim().toLowerCase() === raw.toLowerCase()) ||
      (g.display_name && g.display_name.trim().toLowerCase() === raw.toLowerCase()) ||
      (g.legal_name && raw.toLowerCase().includes(g.legal_name.trim().toLowerCase())) ||
      (g.display_name && raw.toLowerCase().includes(g.display_name.trim().toLowerCase())),
  );

  if (matched && matched.display_name) {
    return matched.display_name;
  }

  return raw;
};

/** Tab filter + search + filter options + sort, exactly as the old page's
 * filtering effect did it. Returns a new array (never sorts `invoices` in
 * place). */
export const filterAndSortInvoices = (
  invoices: Invoice[] | undefined | null,
  activeInvTab: string,
  searchTerm: string,
  filters: FilterOptions,
  sortField: InvoiceSortField,
  sortDirection: "asc" | "desc",
): Invoice[] => {
  let filtered = [...(invoices || [])];

  if (activeInvTab === "open_invoices") {
    filtered = filtered.filter((invoice) => {
      const cNo = (invoice.cargoNo || invoice.cargo?.cargo_no || "").trim();
      return (
        invoice.status !== "paid" &&
        invoice.status !== "cancelled" &&
        cNo.toUpperCase().startsWith("C")
      );
    });
  } else if (activeInvTab === "closed_invoices") {
    filtered = filtered.filter((invoice) => {
      const cNo = (invoice.cargoNo || invoice.cargo?.cargo_no || "").trim();
      return (
        (invoice.status === "paid" || invoice.status === "cancelled") &&
        cNo.toUpperCase().startsWith("C")
      );
    });
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
          invoice.orderNumber.toLowerCase().includes(searchLower)) ||
        (invoice.cargoNo &&
          invoice.cargoNo.toLowerCase().includes(searchLower)),
    );
  }

  if (filters.status) {
    filtered = filtered.filter((invoice) => invoice.status === filters.status);
  }

  if (filters.dateFrom) {
    filtered = filtered.filter(
      (invoice) => new Date(invoice.invoiceDate) >= new Date(filters.dateFrom),
    );
  }
  if (filters.dateTo) {
    filtered = filtered.filter(
      (invoice) => new Date(invoice.invoiceDate) <= new Date(filters.dateTo),
    );
  }

  if (filters.customer) {
    const customerLower = filters.customer.toLowerCase();
    filtered = filtered.filter(
      (invoice) =>
        invoice.customer?.companyName?.toLowerCase().includes(customerLower) ||
        invoice.customer?.email?.toLowerCase().includes(customerLower) ||
        invoice.customer?.contactEmail?.toLowerCase().includes(customerLower),
    );
  }

  if (filters.minAmount) {
    filtered = filtered.filter(
      (invoice) => invoice.grossTotal >= parseFloat(filters.minAmount),
    );
  }
  if (filters.maxAmount) {
    filtered = filtered.filter(
      (invoice) => invoice.grossTotal <= parseFloat(filters.maxAmount),
    );
  }

  filtered.sort((a, b) => {
    if (sortField === "createdAt" || sortField === "invoiceDate") {
      const aTime = new Date(a.createdAt || a.invoiceDate || 0).getTime();
      const bTime = new Date(b.createdAt || b.invoiceDate || 0).getTime();
      if (aTime !== bTime) {
        return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
      }
      return sortDirection === "asc"
        ? String(a.id).localeCompare(String(b.id))
        : String(b.id).localeCompare(String(a.id));
    }

    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === "customer") {
      aValue = a.customer?.companyName || a.bill_to || "";
      bValue = b.customer?.companyName || b.bill_to || "";
    } else if (sortField === "cargoNo") {
      aValue = a.cargoNo || a.cargo?.cargo_no || "";
      bValue = b.cargoNo || b.cargo?.cargo_no || "";
    } else if (sortField === "customItemCount") {
      aValue = a.customItemCount ?? a.items?.length ?? 0;
      bValue = b.customItemCount ?? b.items?.length ?? 0;
    } else if (sortField === "customTotalQty") {
      aValue = a.customTotalQty ?? 0;
      bValue = b.customTotalQty ?? 0;
    }

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortDirection === "asc" ? 1 : -1;
    if (bValue == null) return sortDirection === "asc" ? -1 : 1;

    if (typeof aValue === "string" && typeof bValue === "string") {
      const comp = aValue.localeCompare(bValue, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return sortDirection === "asc" ? comp : -comp;
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });

  return filtered;
};

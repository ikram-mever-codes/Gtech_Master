"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  LinkIcon,
  CubeIcon,
  ArrowUpTrayIcon,
  ClipboardDocumentIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import ViewEditToggle from "@/components/UI/ViewEditToggle";
import SystemColourSelect from "@/components/UI/SystemColourSelect";
import {
  getCustomerOrderById,
  updateCustomerOrder,
  deleteCustomerOrder,
  closeCustomerOrder,
  createOrderLineItem,
  updateOrderLineItem,
  deleteOrderLineItem,
  previewOrderLineItemPrice,
  formatCurrency,
} from "@/api/customer_orders";
import { autocompleteItems } from "@/api/items";
import { getAllPaymentMethods } from "@/api/payment_methods";
import { getAllShippingMethods } from "@/api/shipping_methods";
import {
  getWeiterversandServiceProviders,
  WeiterversandServiceProvider,
} from "@/api/weiterversand_service_providers";
import { UserRole } from "@/utils/interfaces";
import { errorStyles, successStyles } from "@/utils/constants";
import {
  parseFlexibleNumber,
  formatUnitPriceCurrency,
  parseAndRoundTo3Decimals,
} from "@/utils/decimal";
import { formatDate } from "@/utils/offers";

interface AuftragPreviewModalProps {
  isOpen: boolean;
  orderId: string | number | null;
  onClose: () => void;
  onChanged?: () => void;
  userRole?: UserRole;
  initialEdit?: boolean;
  onSwitchToOffer?: (offerId: string) => void;
  onSwitchToBestellung?: (bestellungId: string | number) => void;
  onSwitchToRechnung?: (rechnungId: string) => void;
  onSwitchToRechnungK?: (rechnungKId: string) => void;
}

const inputCls =
  "w-full px-2.5 py-1.5 text-sm border border-gray-300/80 bg-white/70 rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default";

const parseLabels = (
  raw?: string | null,
): Array<{ name: string; url: string }> => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    if (typeof raw === "string" && raw.trim()) {
      return [{ name: "Document Label", url: raw.trim() }];
    }
  }
  return [];
};

const ORDER_STATUSES = [
  "Draft",
  "Submitted",
  "In Progress",
  "Completed",
  "Cancelled",
];

const PAYMENT_METHODS = [
  "Prepayment",
  "Bank transfer",
  "Cash on delivery",
  "Invoice",
  "Credit card",
  "PayPal",
];

const SHIPPING_METHODS = [
  "Standard shipping",
  "Express shipping",
  "Freight",
  "Courier",
  "Pickup",
];

const formatWeight = (kg: number): string =>
  `${(isNaN(kg) || !isFinite(kg) ? 0 : kg).toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} kg`;

const toDateInputValue = (value: any): string => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

const COUNTRY_CODES: Record<string, string> = {
  germany: "DE",
  deutschland: "DE",
  austria: "AT",
  österreich: "AT",
  switzerland: "CH",
  schweiz: "CH",
};

const getCountryCode = (country?: string): string => {
  if (!country) return "";
  const trimmed = country.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return COUNTRY_CODES[trimmed.toLowerCase()] || trimmed;
};

/** True if the "same as billing" delivery address should be shown as
 * identical to the customer snapshot — same rule as the Offer modal. */
const normalizeAddrValue = (v: any): string =>
  (v || "").toString().trim().toLowerCase();

const isDeliverySameAsBilling = (deliveryAddr: any, snapshot: any): boolean => {
  const deliveryStreet = normalizeAddrValue(deliveryAddr?.street);
  if (!deliveryStreet) return true;
  const billingStreet = normalizeAddrValue(
    snapshot?.address || snapshot?.street,
  );
  const billingPostal = normalizeAddrValue(snapshot?.postalCode);
  const billingCity = normalizeAddrValue(snapshot?.city);
  const billingCountry = normalizeAddrValue(snapshot?.country);
  return (
    deliveryStreet === billingStreet &&
    normalizeAddrValue(deliveryAddr?.postalCode) === billingPostal &&
    normalizeAddrValue(deliveryAddr?.city) === billingCity &&
    normalizeAddrValue(deliveryAddr?.country) === billingCountry
  );
};

const AddressBlock: React.FC<{ addr: any; emptyText: string }> = ({
  addr,
  emptyText,
}) => {
  if (!addr) return <div className="text-sm text-gray-400">{emptyText}</div>;
  const countryCode = getCountryCode(addr.country);
  const isGermany = countryCode === "DE";

  let street = (addr.street || addr.address || "").trim();
  const postalCode = (addr.postalCode || addr.postal_code || "").trim();
  const city = (addr.city || "").trim();

  if (
    postalCode &&
    city &&
    street.includes(postalCode) &&
    street.includes(city)
  ) {
    street = street
      .replace(new RegExp(`,?\\s*${postalCode}\\s+${city}`, "gi"), "")
      .replace(/,?\s*(Germany|Deutschland|DE)\s*/gi, "")
      .trim()
      .replace(/,\s*$/, "");
  }

  const cityLine = `${postalCode} ${city}`.trim();
  const addressLine = [street, cityLine, !isGermany ? countryCode : ""]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-1 text-sm text-gray-700">
      {addr.legalName && addr.legalName !== addr.companyName && (
        <div>{addr.legalName}</div>
      )}
      {addr.contactName && <div>{addr.contactName}</div>}
      {addressLine && (
        <div className="whitespace-normal break-words">{addressLine}</div>
      )}
      {addr.vatId && !isGermany && (
        <div className="text-gray-500">VAT ID: {addr.vatId}</div>
      )}
      {addr.contactPhone && (
        <div className="text-gray-500">Phone: {addr.contactPhone}</div>
      )}
    </div>
  );
};

const Field: React.FC<{
  label: string;
  edit: boolean;
  value: any;
  children?: React.ReactNode;
}> = ({ label, edit, value, children }) => (
  <div>
    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
      {label}
    </p>
    <div className="text-sm text-gray-900 break-words">
      {edit ? children : value || "—"}
    </div>
  </div>
);

const DecimalInput: React.FC<{
  value: string | number | null | undefined;
  onCommit: (raw: string) => void;
  className?: string;
}> = ({ value, onCommit, className }) => {
  const [local, setLocal] = useState(
    value === null || value === undefined ? "" : String(value),
  );
  useEffect(() => {
    setLocal(value === null || value === undefined ? "" : String(value));
  }, [value]);
  return (
    <input
      type="text"
      inputMode="decimal"
      className={className || inputCls}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
    />
  );
};

const TextCellInput: React.FC<{
  value: string | null | undefined;
  onCommit: (raw: string) => void;
  className?: string;
  placeholder?: string;
}> = ({ value, onCommit, className, placeholder }) => {
  const [local, setLocal] = useState(value || "");
  useEffect(() => {
    setLocal(value || "");
  }, [value]);
  return (
    <input
      type="text"
      className={
        className ||
        "w-full px-1.5 py-1 text-sm border border-gray-300 rounded bg-white"
      }
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
    />
  );
};

const ItemRow: React.FC<{ item: any; onClick: () => void }> = ({
  item,
  onClick,
}) => {
  const name =
    item.item_name_de || item.item_name || item.itemName || "Unnamed item";
  const itemNo = item.de_no || item.ItemID_DE || item.itemNo || "";
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-all border-gray-200 hover:bg-gray-50"
    >
      <div className="w-10 h-10 shrink-0 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
        {item.photo ? (
          <img
            src={item.photo}
            alt="thumb"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900 truncate">{name}</div>
        <div className="text-xs text-gray-500 mt-0.5">{itemNo || "—"}</div>
      </div>
    </div>
  );
};

const isFreetextLine = (item: any): boolean =>
  !item?.itemNo && !item?.sourceItemId; // Changed from itemNO to itemNo
const getLineTaxRate = (item: any, order: any): number => {
  const orderRate = parseFlexibleNumber(order?.tax_rate) ?? 19;
  if (isFreetextLine(item)) {
    const own = parseFlexibleNumber(item?.taxRate);
    return own !== null && own !== undefined ? own : orderRate;
  }
  return orderRate;
};

const getShippingTaxRate = (order: any): number =>
  parseFlexibleNumber(order?.tax_rate) ?? 19;

/** Distinct VAT rates currently in use on the Auftrag (line items + shipping).
 * Pass excludeItemId when checking an edit to an existing line, so that
 * line's own (about-to-change) rate isn't counted against itself. */
const getDistinctVatRates = (
  order: any,
  excludeItemId?: string,
): Set<number> => {
  const items = (order?.orderItems || []) as any[];
  const rates = new Set<number>();
  items.forEach((li: any) => {
    if (excludeItemId && String(li.id) === String(excludeItemId)) return;
    rates.add(getLineTaxRate(li, order));
  });
  if (order?.shipping_method) rates.add(getShippingTaxRate(order));
  return rates;
};

const MAX_DISTINCT_VAT_RATES = 3;

const getLineItemTotal = (item: any): number => {
  const qty = parseFlexibleNumber(item?.quantity) ?? 1;
  const price = parseFlexibleNumber(item?.price) ?? 0;
  return qty * price;
};

/** quantity is the fixed ordered amount; it is never mutated once set.
 * openQuantity is computed backend-side (getCustomerOrderById ->
 * attachDeliveredQuantityToOrders in customer_orders_controller.ts) from
 * rechnung_item — summed delivered quantity across every Rechnung
 * generated off this line, subtracted from quantity. Falls back to
 * deriving it locally from deliveredQuantity, and finally to quantity
 * itself, in case a cached/stale response predates that field. */
const getQtyOpen = (item: any): number => {
  if (item?.openQuantity !== undefined) {
    return Number(item.openQuantity) || 0;
  }
  const ordered = Number(item?.quantity ?? item?.qty) || 0;
  const delivered = Number(item?.deliveredQuantity) || 0;
  return Math.max(0, ordered - delivered);
};

export const AuftragPreviewModal: React.FC<AuftragPreviewModalProps> = ({
  isOpen,
  orderId,
  onClose,
  onChanged,
  userRole,
  initialEdit = false,
  onSwitchToOffer,
  onSwitchToBestellung,
  onSwitchToRechnung,
  onSwitchToRechnungK,
}) => {
  const { user: currentUser } = useSelector((state: RootState) => state.user);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>({});
  const [dbPaymentMethods, setDbPaymentMethods] = useState<any[]>([]);
  const [dbShippingMethods, setDbShippingMethods] = useState<any[]>([]);
  const [showItemPicker, setShowItemPicker] = useState(false);
  // Three-field item search backed by the new autocompleteItems endpoint
  // — same pattern just implemented in BestellungPreviewModal (strict
  // AND-across-words match, debounced, ranked results). Replaces the old
  // single itemPickerSearch client-side filter over a 1000-item preload.
  const [searchEan, setSearchEan] = useState("");
  const [searchItemNo, setSearchItemNo] = useState("");
  const [searchName, setSearchName] = useState("");
  const [itemSearchLoading, setItemSearchLoading] = useState(false);

  const handleFieldSearchChange = (
    field: "ean" | "itemNo" | "name",
    value: string,
  ) => {
    if (field === "ean") setSearchEan(value);
    if (field === "itemNo") setSearchItemNo(value);
    if (field === "name") setSearchName(value);
  };

  const [items, setItems] = useState<any[]>([]);
  const [newLine, setNewLine] = useState({
    itemName: "",
    quantity: "1",
    taxRate: "",
  });

  const [dbServiceProviders, setDbServiceProviders] = useState<
    WeiterversandServiceProvider[]
  >([]);
  const [sameAsBusiness, setSameAsBusiness] = useState(true);

  /** Sorts an array of linked-document records by created_at, newest first. */
  const sortByCreatedAtDesc = (docs: any[]): any[] =>
    [...(docs || [])].sort((a, b) => {
      const timeA = new Date(a?.created_at || a?.createdAt || 0).getTime();
      const timeB = new Date(b?.created_at || b?.createdAt || 0).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });

  const LINKED_DOC_LABELS: Record<string, string> = {
    offers: "Angebot",
    rechnungen: "Rechnung",
    rechnungenK: "RK",
    bestellungen: "Bestellung",
  };

  const linkedDocumentsByType = order?.linkedDocuments || {
    offers: [],
    rechnungen: [],
    rechnungenK: [],
    bestellungen: [],
  };
  const linkedDocsCount = (
    Object.keys(LINKED_DOC_LABELS) as (keyof typeof linkedDocumentsByType)[]
  ).reduce(
    (sum: any, key) => sum + (linkedDocumentsByType[key]?.length || 0),
    0,
  );

  const getLinkedDocDisplayNumber = (kind: string, doc: any): string => {
    if (kind === "offers") return doc.offerNumber || doc.id;
    if (kind === "bestellungen") return doc.order_no || doc.id;
    return doc.invoice_number || doc.id;
  };

  const getLinkedDocDate = (doc: any): string =>
    doc.created_at || doc.createdAt || "";

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const [pmRes, smRes, spRes]: any = await Promise.all([
          getAllPaymentMethods(true).catch(() => ({ data: [] })),
          getAllShippingMethods(true).catch(() => ({ data: [] })),
          getWeiterversandServiceProviders().catch(() => []),
        ]);
        setDbPaymentMethods(
          Array.isArray(pmRes?.data)
            ? pmRes.data.filter((pm: any) => pm.is_active)
            : [],
        );
        setDbShippingMethods(
          Array.isArray(smRes?.data)
            ? smRes.data.filter((sm: any) => sm.is_active)
            : [],
        );
        setDbServiceProviders(Array.isArray(spRes) ? spRes : []);
      } catch (e) {
        console.error("Failed to load payment/shipping/service providers:", e);
      }
    })();
  }, [isOpen]);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await getCustomerOrderById(orderId);
      if (res.success) {
        setOrder(res.data);
        setForm(buildForm(res.data));
        setSameAsBusiness(
          isDeliverySameAsBilling(
            res.data.deliveryAddress,
            res.data.customerSnapshot,
          ),
        );
        const loadedStatus = res.data.auftrag_status || "open";
        const loadedCanEnterEdit =
          loadedStatus === "open" || loadedStatus === "partially_delivered";
        setEdit(initialEdit && loadedCanEnterEdit);
      }
    } catch (e) {
      console.error("Failed to load Auftrag:", e);
    } finally {
      setLoading(false);
    }
  }, [orderId, initialEdit]);

  useEffect(() => {
    if (!isOpen) return;
    setShowItemPicker(false);
    setSearchEan("");
    setSearchItemNo("");
    setSearchName("");
    fetchOrder();
  }, [isOpen, orderId, fetchOrder]);

  useEffect(() => {
    if (!showItemPicker) return;

    const combined = [searchEan, searchItemNo, searchName]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");

    if (!combined) {
      setItems([]);
      return;
    }

    setItemSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res: any = await autocompleteItems(combined, { limit: 30 });
        setItems(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        console.error("Error searching items:", e);
        setItems([]);
      } finally {
        setItemSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [showItemPicker, searchEan, searchItemNo, searchName]);

  if (!isOpen) return null;

  function buildForm(o: any) {
    const item1Title =
      o.orderItems?.[0]?.itemName ||
      o.orderItems?.[0]?.item_name ||
      o.orderItems?.[0]?.description ||
      o.items?.[0]?.itemName ||
      o.items?.[0]?.item_name;

    return {
      title: o.title || item1Title || "",
      ansprechpartner: o.ansprechpartner || "",
      kundenreferenz: o.kundenreferenz || "",
      status: o.status || "Draft",
      currency: o.currency || "EUR",
      taxRate: o.tax_rate ?? 19,
      discountPercentage: o.discount_percentage ?? "",
      shippingCost: o.shipping_cost ?? "",
      shippingQuantity: o.shipping_quantity ?? 1,
      paymentMethod: o.payment_method || "",
      shippingMethod: o.shipping_method || "",
      shippingText:
        o.shipping_text || o.shippingText || o.shipping_method || "",
      paymentTerms: o.payment_terms || "",
      deliveryTerms: o.delivery_terms || "",
      termsConditions: o.terms_conditions || "",
      notes: o.notes || "",
      internalNotes: o.internal_notes || "",
      highlightColor: o.highlight_color || "",
      dateDelivery: o.date_delivery || "",
      customerSnapshot: { ...(o.customerSnapshot || {}) },
      deliveryAddress: { ...(o.deliveryAddress || {}) },
      auftragStatus: o.auftrag_status || "open",
      realDeliveryDate: o.real_delivery_date || "",
      isWeiterversand:
        o.is_weiterversand === true ||
        o.is_weiterversand === 1 ||
        o.is_weiterversand === "true" ||
        o.is_weiterversand === "1" ||
        o.is_weiterversand === "Yes",
      weiterversandServiceProviderId:
        o.weiterversand_service_provider_id ||
        o.weiterversandServiceProvider?.id ||
        "",
      weiterversandLabels: o.weiterversand_labels || "",
      weiterversandTracking: o.weiterversand_tracking || "",
    };
  }

  const patch = (p: any) => setForm((f: any) => ({ ...f, ...p }));

  const refreshLocal = async () => {
    if (!order) return;
    const updated = await getCustomerOrderById(order.id);
    if (updated.success) setOrder(updated.data);
  };

  const handleStartEdit = () => {
    if (!canEnterEditMode) return;
    setEdit(true);
  };
  const handleCancelEdit = () => {
    setForm(buildForm(order));
    setEdit(false);
    setShowItemPicker(false);
  };

  const handleSave = async () => {
    if (!order) return;
    if (!canEnterEditMode) return;
    if (canEditCommercial && !form.title?.trim()) {
      toast.error("Title can't be empty.", errorStyles);
      return;
    }
    setSaving(true);
    try {
      const payload: any = canEditCommercial
        ? {
            title: form.title,
            ansprechpartner: form.ansprechpartner,
            kundenreferenz: (form.kundenreferenz || "").slice(0, 255),
            currency: form.currency,
            taxRate: parseFlexibleNumber(form.taxRate) ?? 19,
            discountPercentage:
              parseFlexibleNumber(form.discountPercentage) ?? 0,
            shippingCost: parseFlexibleNumber(form.shippingCost) ?? 0,
            shippingQuantity: parseFlexibleNumber(form.shippingQuantity) ?? 1,
            paymentMethod: form.paymentMethod || undefined,
            shippingMethod: form.shippingMethod || undefined,
            shippingText:
              form.shippingText !== undefined
                ? form.shippingText
                : form.shippingMethod,
            paymentTerms: form.paymentTerms,
            deliveryTerms: form.deliveryTerms,
            termsConditions: form.termsConditions,
            notes: form.notes,
            internalNotes: form.internalNotes,
            highlightColor: form.highlightColor ?? "",
            dateDelivery: form.dateDelivery,
            customerSnapshot: form.customerSnapshot,
            deliveryAddress: form.deliveryAddress,
            realDeliveryDate: form.realDeliveryDate || null,
            isWeiterversand: form.isWeiterversand,
            weiterversandServiceProviderId: form.weiterversandServiceProviderId
              ? Number(form.weiterversandServiceProviderId)
              : null,
            weiterversandLabels: form.weiterversandLabels,
            weiterversandTracking: form.weiterversandTracking,
          }
        : {
            notes: form.notes,
            internalNotes: form.internalNotes,
            highlightColor: form.highlightColor ?? "",
          };

      const res = await updateCustomerOrder(order.id, payload);
      if (res.success) {
        toast.success("Auftrag updated successfully.", successStyles);
        await refreshLocal();
        setEdit(false);
        onChanged?.();
      } else {
        toast.error(res.message || "Failed to update Auftrag.", errorStyles);
      }
    } catch (e: any) {
      toast.error(e.message || "An error occurred while saving.", errorStyles);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!order) return;
    if (!window.confirm("Delete this Auftrag? This can't be undone.")) return;
    try {
      await deleteCustomerOrder(order.id);
      onClose();
      onChanged?.();
    } catch (e) {
      console.error("Error deleting Auftrag:", e);
    }
  };

  const handleCloseAuftrag = async () => {
    if (!order) return;
    if (
      !window.confirm(`Close Auftrag ${order.order_no}? This can't be undone.`)
    )
      return;
    setClosing(true);
    try {
      const res: any = await closeCustomerOrder(order.id);
      if (res?.success === false) {
        toast.error(res?.message || "Couldn't close the Auftrag.", errorStyles);
        return;
      }
      toast.success("Auftrag closed successfully.", successStyles);
      await refreshLocal();
      setEdit(false);
      onChanged?.();
    } catch (e: any) {
      console.error("Error closing Auftrag:", e);
      toast.error(e.message || "Couldn't close the Auftrag.", errorStyles);
    } finally {
      setClosing(false);
    }
  };

  const setHighlightColor = async (color: string) => {
    if (!order) return;
    try {
      await updateCustomerOrder(order.id, { highlightColor: color });
      patch({ highlightColor: color });
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't update highlight color:", e);
    }
  };

  const persistLine = async (lineItemId: string, payload: any) => {
    if (!canEditCommercial) return;
    try {
      const res: any = await updateOrderLineItem(order.id, lineItemId, payload);
      const updatedItem = res?.data ?? res;
      if (updatedItem?.id) {
        setOrder((prev: any) => ({
          ...prev,
          orderItems: prev.orderItems.map((li: any) =>
            li.id === lineItemId ? updatedItem : li,
          ),
        }));
        await refreshLocal();
      }
    } catch (e) {
      console.error("Couldn't save line item change:", e);
      toast.error("Couldn't save that change.", errorStyles);
    }
  };

  const handleMoveLineItem = async (
    lineItemId: string,
    direction: "up" | "down",
  ) => {
    if (!canEditCommercial) return;
    const sorted = [...visibleLineItems].sort(
      (a: any, b: any) => (Number(a.position) || 0) - (Number(b.position) || 0),
    );
    const idx = sorted.findIndex((li: any) => li.id === lineItemId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const newItems = [...sorted];
    const [moved] = newItems.splice(idx, 1);
    newItems.splice(targetIdx, 0, moved);

    const posMap = new Map<string, number>();
    const updatesToPersist: { id: string; position: number }[] = [];

    newItems.forEach((item, i) => {
      const newPos = i + 1;
      posMap.set(String(item.id), newPos);
      if (Number(item.position) !== newPos) {
        updatesToPersist.push({ id: String(item.id), position: newPos });
      }
    });

    setOrder((prev: any) => ({
      ...prev,
      orderItems: (prev?.orderItems || []).map((li: any) => {
        const newPos = posMap.get(String(li.id));
        return newPos !== undefined ? { ...li, position: newPos } : li;
      }),
    }));

    try {
      await Promise.all(
        updatesToPersist.map((u) =>
          updateOrderLineItem(order.id, u.id, { position: u.position }),
        ),
      );
      await refreshLocal();
    } catch (e) {
      console.error("Couldn't save line item order change:", e);
      toast.error("Couldn't save item order change.", errorStyles);
    }
  };

  const handleQuantityCommit = async (item: any, raw: string) => {
    if (!canEditCommercial) return;
    const newQty = raw.trim() || "1";
    if (!item.sourceItemId) {
      await persistLine(item.id, { quantity: newQty });
      return;
    }
    try {
      const preview: any = await previewOrderLineItemPrice(
        order.id,
        item.id,
        newQty,
      );
      const tieredPrice = preview?.data?.price;
      const currentPrice = parseFlexibleNumber(item.price) ?? 0;

      if (
        tieredPrice !== null &&
        tieredPrice !== undefined &&
        Math.abs(tieredPrice - currentPrice) > 0.0001
      ) {
        const confirmed = window.confirm(
          `There is a sales price for quantity ${newQty}: ${formatCurrency(
            tieredPrice,
            order?.currency || "EUR",
          )}. Override the current price (${formatCurrency(currentPrice, order?.currency || "EUR")}) with it?`,
        );
        if (confirmed) {
          await persistLine(item.id, { quantity: newQty, price: tieredPrice });
        } else {
          await persistLine(item.id, { quantity: newQty, price: currentPrice });
        }
        return;
      }
      await persistLine(item.id, { quantity: newQty });
    } catch (e) {
      console.error("Couldn't check tiered pricing:", e);
      await persistLine(item.id, { quantity: newQty });
    }
  };

  const addLineItem = async () => {
    if (!canEditCommercial) return;
    if (!newLine.itemName.trim()) {
      toast.error("Enter a name for the Freizeile first.", errorStyles);
      return;
    }
    const orderRate = parseFlexibleNumber(order?.tax_rate) ?? 19;
    const requestedRate =
      newLine.taxRate.trim() === ""
        ? orderRate
        : (parseFlexibleNumber(newLine.taxRate) ?? orderRate);

    const currentRates = getDistinctVatRates(order);
    if (
      currentRates.size >= MAX_DISTINCT_VAT_RATES &&
      !currentRates.has(requestedRate)
    ) {
      toast.error(
        `Auftrag darf nicht mehr als ${MAX_DISTINCT_VAT_RATES} unterschiedliche MwSt.-Sätze gleichzeitig haben.`,
        errorStyles,
      );
      return;
    }

    try {
      await createOrderLineItem(order.id, {
        itemName: newLine.itemName.trim(),
        quantity: newLine.quantity?.trim() || "1",
        price: 0,
        taxRate: requestedRate,
      });
      setNewLine({ itemName: "", quantity: "1", taxRate: "" });
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't add the Freizeile:", e);
    }
  };

  const addExistingItem = async (it: any) => {
    if (!canEditCommercial) return;
    try {
      await createOrderLineItem(order.id, {
        itemName: it.item_name_de || it.item_name || it.itemName || "Item",
        material: it.model || (it.ean ? String(it.ean) : undefined),
        itemNo: it.model || undefined,
        price: 0,
        weight: it.weight,
        notes: it.remark_ex || undefined,
        sourceItemId: String(it.id),
      });
      setShowItemPicker(false);
      setSearchEan("");
      setSearchItemNo("");
      setSearchName("");
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't add the item:", e);
    }
  };

  const removeLineItem = async (lineItemId: string) => {
    if (!canEditCommercial) return;
    if (!window.confirm("Remove this line item?")) return;
    try {
      await deleteOrderLineItem(order.id, lineItemId);
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't remove the item:", e);
    }
  };

  if (loading || !order) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white/95 rounded-2xl shadow-xl max-w-[1450px] w-full p-6 py-24 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary" />
          <p className="mt-2 text-sm text-gray-500">Loading Auftrag…</p>
        </div>
      </div>
    );
  }

  const visibleLineItems = (order.orderItems || [])
    .slice()
    .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

  const auftragStatus = order.auftrag_status || "open";
  const isOpenStatus = auftragStatus === "open";
  const isPartiallyDeliveredStatus = auftragStatus === "partially_delivered";
  const canEnterEditMode = isOpenStatus || isPartiallyDeliveredStatus;
  const canEditCommercial = isOpenStatus;
  const effectiveEdit = edit && canEnterEditMode;

  const taxProfile = order?.taxProfile || null;

  const netWeightKg = visibleLineItems.reduce((sum: number, li: any) => {
    const qty = parseFlexibleNumber(li.quantity) ?? 1;
    const weightGrams = parseFlexibleNumber(li.weight) ?? 0;
    return sum + (weightGrams * qty) / 1000;
  }, 0);
  const extraWeightKg = visibleLineItems.reduce(
    (sum: number, li: any) => sum + (parseFlexibleNumber(li.extraWeight) ?? 0),
    0,
  );
  const totalWeightKg = netWeightKg + extraWeightKg;

  const discountPct =
    effectiveEdit && canEditCommercial
      ? parseFlexibleNumber(form.discountPercentage) || 0
      : order.discount_percentage || 0;
  const discountFactor = discountPct > 0 ? 1 - discountPct / 100 : 1;

  const shippingTotalForDisplay =
    effectiveEdit && canEditCommercial
      ? (form.shippingCost || 0) * (form.shippingQuantity || 1)
      : (order.shipping_cost || 0) * (order.shipping_quantity || 1);

  const vatGroups: { rate: number; base: number; tax: number }[] = (() => {
    const byRate = new Map<number, number>();
    visibleLineItems.forEach((li: any) => {
      const rate = getLineTaxRate(li, order);
      const lineTotal = getLineItemTotal(li);
      byRate.set(rate, (byRate.get(rate) || 0) + lineTotal);
    });

    if (shippingTotalForDisplay > 0) {
      const shipRate = getShippingTaxRate(order);
      byRate.set(
        shipRate,
        (byRate.get(shipRate) || 0) + shippingTotalForDisplay,
      );
    }

    return Array.from(byRate.entries())
      .map(([rate, base]) => {
        const adjustedBase = base * discountFactor;
        return { rate, base: adjustedBase, tax: adjustedBase * (rate / 100) };
      })
      .sort((a, b) => b.rate - a.rate);
  })();

  const vatTaxSum = vatGroups.reduce((sum, g) => sum + g.tax, 0);
  const displayTotal =
    (order.subtotal || 0) -
    (order.discount_amount || 0) +
    shippingTotalForDisplay * discountFactor +
    vatTaxSum;

  const currentDeliveryAddress =
    effectiveEdit && canEditCommercial
      ? form.deliveryAddress
      : order.deliveryAddress;
  const deliverySameAsBilling = isDeliverySameAsBilling(
    currentDeliveryAddress,
    order.customerSnapshot,
  );

  const item1Title =
    order.title ||
    visibleLineItems[0]?.itemName ||
    visibleLineItems[0]?.item_name ||
    visibleLineItems[0]?.description ||
    order.orderItems?.[0]?.itemName ||
    order.orderItems?.[0]?.item_name ||
    "—";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-[1450px] w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0 select-none">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <p className="text-lg font-bold text-gray-900 truncate">
                Auftrag {order.order_no}
              </p>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  order.auftrag_status === "delivered" ||
                  order.status === "Completed"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : order.auftrag_status === "partially_delivered" ||
                        order.status === "In Progress"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : order.auftrag_status === "closed"
                        ? "bg-gray-200 text-gray-700 border-gray-300"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                }`}
              >
                {order.auftrag_status === "closed"
                  ? "Closed"
                  : order.auftrag_status === "delivered" ||
                      order.status === "Completed"
                    ? "Delivered"
                    : order.auftrag_status === "partially_delivered" ||
                        order.status === "In Progress"
                      ? "Partially Delivered"
                      : "Open"}
              </span>
            </div>
            <h2 className="text-sm font-medium text-gray-500 truncate mt-0.5 flex items-center gap-1">
              <span>{item1Title}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(item1Title || "");
                  toast.success("Title copied to clipboard!");
                }}
                className="text-gray-400 hover:text-gray-700 transition-colors p-0.5 rounded cursor-pointer shrink-0"
                title="Copy Title"
              >
                <ClipboardDocumentIcon className="w-4 h-4" />
              </button>
            </h2>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <SystemColourSelect
              value={form.highlightColor ?? order.highlight_color}
              onChange={setHighlightColor}
              edit={effectiveEdit}
            />
            <ViewEditToggle
              isEditEnabled={effectiveEdit}
              onToggle={() =>
                effectiveEdit ? handleCancelEdit() : handleStartEdit()
              }
              disabled={saving || !canEnterEditMode}
            />
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
            <div className="md:col-span-1 flex flex-col gap-3">
              <div className="block mb-1">
                {effectiveEdit && canEditCommercial ? (
                  <div className="space-y-1 text-xs">
                    <input
                      className={inputCls}
                      placeholder="Legal name"
                      value={form.customerSnapshot?.legalName || ""}
                      onChange={(e) =>
                        patch({
                          customerSnapshot: {
                            ...form.customerSnapshot,
                            legalName: e.target.value,
                          },
                        })
                      }
                    />
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        className={inputCls}
                        placeholder="Street & No."
                        value={
                          form.customerSnapshot?.address ||
                          form.customerSnapshot?.street ||
                          ""
                        }
                        onChange={(e) =>
                          patch({
                            customerSnapshot: {
                              ...form.customerSnapshot,
                              address: e.target.value,
                              street: e.target.value,
                            },
                          })
                        }
                      />
                      <input
                        className={inputCls}
                        placeholder="Additional line (c/o, floor)"
                        value={
                          form.customerSnapshot?.addressAdditional ||
                          form.customerSnapshot?.address_additional ||
                          ""
                        }
                        onChange={(e) =>
                          patch({
                            customerSnapshot: {
                              ...form.customerSnapshot,
                              addressAdditional: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <input
                        className={inputCls}
                        placeholder="Postal code"
                        value={form.customerSnapshot?.postalCode || ""}
                        onChange={(e) =>
                          patch({
                            customerSnapshot: {
                              ...form.customerSnapshot,
                              postalCode: e.target.value,
                            },
                          })
                        }
                      />
                      <input
                        className={inputCls}
                        placeholder="City"
                        value={form.customerSnapshot?.city || ""}
                        onChange={(e) =>
                          patch({
                            customerSnapshot: {
                              ...form.customerSnapshot,
                              city: e.target.value,
                            },
                          })
                        }
                      />
                      <input
                        className={inputCls}
                        placeholder="Country"
                        value={form.customerSnapshot?.country || ""}
                        onChange={(e) =>
                          patch({
                            customerSnapshot: {
                              ...form.customerSnapshot,
                              country: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <input
                      className={inputCls}
                      placeholder="VAT ID"
                      value={form.customerSnapshot?.vatId || ""}
                      onChange={(e) =>
                        patch({
                          customerSnapshot: {
                            ...form.customerSnapshot,
                            vatId: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                ) : (
                  <AddressBlock
                    addr={order.customerSnapshot}
                    emptyText="No customer snapshot."
                  />
                )}
              </div>

              <div className="block mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-900">
                    Delivery:
                  </span>
                  {effectiveEdit && canEditCommercial && (
                    <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sameAsBusiness}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSameAsBusiness(checked);
                          if (checked) {
                            patch({ deliveryAddress: {} });
                          }
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                      />
                      Same as business
                    </label>
                  )}
                </div>

                {effectiveEdit && canEditCommercial ? (
                  sameAsBusiness ? (
                    <div className="p-1.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500 font-medium italic">
                      Same as business address (blocked from editing)
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs mt-1">
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          className={inputCls}
                          placeholder="Street & No."
                          value={form.deliveryAddress?.street || ""}
                          onChange={(e) =>
                            patch({
                              deliveryAddress: {
                                ...form.deliveryAddress,
                                street: e.target.value,
                              },
                            })
                          }
                        />
                        <input
                          className={inputCls}
                          placeholder="Additional line (c/o, floor)"
                          value={
                            form.deliveryAddress?.addressAdditional ||
                            form.deliveryAddress?.address_additional ||
                            ""
                          }
                          onChange={(e) =>
                            patch({
                              deliveryAddress: {
                                ...form.deliveryAddress,
                                addressAdditional: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <input
                          className={inputCls}
                          placeholder="Postal code"
                          value={form.deliveryAddress?.postalCode || ""}
                          onChange={(e) =>
                            patch({
                              deliveryAddress: {
                                ...form.deliveryAddress,
                                postalCode: e.target.value,
                              },
                            })
                          }
                        />
                        <input
                          className={inputCls}
                          placeholder="City"
                          value={form.deliveryAddress?.city || ""}
                          onChange={(e) =>
                            patch({
                              deliveryAddress: {
                                ...form.deliveryAddress,
                                city: e.target.value,
                              },
                            })
                          }
                        />
                        <input
                          className={inputCls}
                          placeholder="Country"
                          value={form.deliveryAddress?.country || ""}
                          onChange={(e) =>
                            patch({
                              deliveryAddress: {
                                ...form.deliveryAddress,
                                country: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  )
                ) : deliverySameAsBilling ? (
                  <div className="text-xs text-gray-500 italic">
                    Same as billing address
                  </div>
                ) : (
                  <AddressBlock
                    addr={currentDeliveryAddress}
                    emptyText="No delivery address set."
                  />
                )}
              </div>
            </div>

            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <Field
                label="TITLE"
                edit={effectiveEdit && canEditCommercial}
                value={item1Title}
              >
                <input
                  className={inputCls}
                  value={form.title || item1Title}
                  onChange={(e) => patch({ title: e.target.value })}
                />
              </Field>
              <Field
                label="Tax profile"
                edit={false}
                value={
                  taxProfile
                    ? `${taxProfile.name} (${taxProfile.taxRate}%)`
                    : "No tax profile assigned to this customer"
                }
              />
              <Field
                label="Delivery Date"
                edit={effectiveEdit && canEditCommercial}
                value={
                  order.date_delivery ? formatDate(order.date_delivery) : ""
                }
              >
                <input
                  type="date"
                  className={inputCls}
                  value={toDateInputValue(form.dateDelivery)}
                  onChange={(e) => patch({ dateDelivery: e.target.value })}
                />
              </Field>
              <Field
                label="Payment method"
                edit={effectiveEdit && canEditCommercial}
                value={order.payment_method}
              >
                <select
                  className={inputCls}
                  value={form.paymentMethod || ""}
                  onChange={(e) => patch({ paymentMethod: e.target.value })}
                >
                  <option value="">Select…</option>
                  {(dbPaymentMethods.length > 0
                    ? dbPaymentMethods.map((pm: any) => pm.name)
                    : PAYMENT_METHODS
                  ).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              {(() => {
                const currentPmName =
                  form.paymentMethod || order.payment_method || "";
                const selectedPmObj = dbPaymentMethods.find(
                  (pm: any) => pm.name === currentPmName,
                );
                const isDueDaysEditable = selectedPmObj
                  ? !selectedPmObj.is_prepayment
                  : currentPmName
                    ? !/vorkasse|prepayment|paypal|cash|credit/i.test(
                        currentPmName,
                      )
                    : false;

                return (
                  <Field
                    label="Due Days"
                    edit={
                      effectiveEdit && canEditCommercial && isDueDaysEditable
                    }
                    value={order.payment_terms}
                  >
                    <input
                      type="text"
                      inputMode="numeric"
                      className={inputCls}
                      value={form.paymentTerms}
                      placeholder="e.g., 30"
                      disabled={!isDueDaysEditable}
                      onChange={(e) =>
                        patch({
                          paymentTerms: e.target.value.replace(/\D/g, ""),
                        })
                      }
                    />
                  </Field>
                );
              })()}
              <Field
                label="Shipping method"
                edit={effectiveEdit && canEditCommercial}
                value={order.shipping_method}
              >
                <select
                  className={inputCls}
                  value={form.shippingMethod || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    patch({
                      shippingMethod: val,
                      ...(!form.shippingText ||
                      form.shippingText === form.shippingMethod
                        ? { shippingText: val }
                        : {}),
                    });
                  }}
                >
                  <option value="">Select…</option>
                  {(dbShippingMethods.length > 0
                    ? dbShippingMethods.map((sm: any) => sm.name)
                    : SHIPPING_METHODS
                  ).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="col-span-full border-t border-gray-100 pt-3 mt-1">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-28 shrink-0">
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Weiterversand
                    </label>
                    {effectiveEdit && canEditCommercial ? (
                      <select
                        className={inputCls}
                        value={form.isWeiterversand ? "Yes" : "No"}
                        onChange={(e) =>
                          patch({ isWeiterversand: e.target.value === "Yes" })
                        }
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    ) : (
                      <div className="text-sm font-medium text-gray-800 py-1.5">
                        {order.is_weiterversand ? "Yes" : "No"}
                      </div>
                    )}
                  </div>

                  <div className="w-56 shrink-0">
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Ansprechpartner
                    </label>
                    {effectiveEdit && canEditCommercial ? (
                      <input
                        type="text"
                        className={inputCls}
                        value={form.ansprechpartner || ""}
                        placeholder="Ansprechpartner"
                        onChange={(e) =>
                          patch({ ansprechpartner: e.target.value })
                        }
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-800 py-1.5">
                        {order.ansprechpartner || "—"}
                      </div>
                    )}
                  </div>

                  {(order.kundenreferenz || effectiveEdit) && (
                    <div className="w-56 shrink-0">
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Kundenreferenz
                      </label>
                      {effectiveEdit && canEditCommercial ? (
                        <input
                          type="text"
                          maxLength={255}
                          className={inputCls}
                          value={form.kundenreferenz || ""}
                          placeholder="e.g. EURODIMA BE2650931 vom 20.08.2026"
                          onChange={(e) =>
                            patch({ kundenreferenz: e.target.value })
                          }
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-800 py-1.5">
                          {order.kundenreferenz || "—"}
                        </div>
                      )}
                    </div>
                  )}
                  {(effectiveEdit && canEditCommercial
                    ? form.isWeiterversand
                    : order.is_weiterversand === true ||
                      order.is_weiterversand === 1 ||
                      order.is_weiterversand === "true" ||
                      order.is_weiterversand === "1" ||
                      order.is_weiterversand === "Yes") && (
                    <>
                      <div className="w-48 shrink-0">
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Service Provider
                        </label>
                        {effectiveEdit && canEditCommercial ? (
                          <select
                            className={inputCls}
                            value={form.weiterversandServiceProviderId || ""}
                            onChange={(e) =>
                              patch({
                                weiterversandServiceProviderId: e.target.value,
                              })
                            }
                          >
                            <option value="">Select Provider…</option>
                            {dbServiceProviders.map((sp) => (
                              <option key={sp.id} value={sp.id}>
                                {sp.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="text-sm font-medium text-gray-800 py-1.5">
                            {order.weiterversandServiceProvider?.name || "—"}
                          </div>
                        )}
                      </div>

                      <div className="w-40 shrink-0">
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Tracking No.
                        </label>
                        {effectiveEdit && canEditCommercial ? (
                          <input
                            type="text"
                            className={inputCls}
                            placeholder="Tracking No."
                            value={form.weiterversandTracking || ""}
                            onChange={(e) =>
                              patch({ weiterversandTracking: e.target.value })
                            }
                          />
                        ) : (
                          <div className="text-sm font-medium text-gray-800 py-1.5">
                            {order.weiterversand_tracking || "—"}
                          </div>
                        )}
                      </div>

                      {effectiveEdit && canEditCommercial && (
                        <div className="shrink-0 self-end">
                          <label
                            htmlFor="weiterversand-label-file"
                            className="px-3.5 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg cursor-pointer flex items-center gap-1.5 border border-gray-300 transition-colors shadow-2xs"
                          >
                            <ArrowUpTrayIcon className="w-4 h-4 text-gray-600" />
                            Upload Label(s)
                          </label>
                          <input
                            id="weiterversand-label-file"
                            type="file"
                            multiple
                            className="hidden"
                            accept="application/pdf,image/*"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length === 0) return;
                              const currentList = parseLabels(
                                form.weiterversandLabels ||
                                  order.weiterversand_labels,
                              );
                              let count = 0;
                              files.forEach((file) => {
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                  const dataUrl = evt.target?.result as string;
                                  currentList.push({
                                    name: file.name,
                                    url: dataUrl,
                                  });
                                  count++;
                                  if (count === files.length) {
                                    patch({
                                      weiterversandLabels:
                                        JSON.stringify(currentList),
                                    });
                                    toast.success(
                                      `Attached ${files.length} document(s)`,
                                    );
                                  }
                                };
                                reader.readAsDataURL(file);
                              });
                            }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 w-10">
                      Pos
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 w-12">
                      Pic
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 w-28">
                      Art.-Nr.
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600">
                      Bezeichnung
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 w-40">
                      RemarkEx
                    </th>
                    <th className="px-2 py-2 text-center font-semibold text-gray-600 w-20">
                      MwSt.
                    </th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-600 w-20">
                      Qty Open
                    </th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-600 w-20">
                      Menge
                    </th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28 whitespace-nowrap">
                      Netto-Preis €
                    </th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28 whitespace-nowrap">
                      Netto gesamt €
                    </th>
                    {effectiveEdit && canEditCommercial && (
                      <th className="w-10" />
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {visibleLineItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={effectiveEdit && canEditCommercial ? 11 : 10}
                        className="text-center py-6 text-sm text-gray-500"
                      >
                        No line items yet.
                      </td>
                    </tr>
                  )}
                  {visibleLineItems.map((item: any, index: number) => {
                    const freetext = isFreetextLine(item);
                    const total = getLineItemTotal(item);
                    const qtyDisplay = Math.round(
                      parseFlexibleNumber(item.quantity) ?? 1,
                    );
                    const rowColor =
                      item.highlightColor || (freetext ? "#D8964A" : null);
                    const lineTaxRate = getLineTaxRate(item, order);
                    return (
                      <tr
                        key={item.id}
                        style={
                          rowColor ? { backgroundColor: rowColor } : undefined
                        }
                      >
                        <td className="px-2 py-2 text-gray-500 whitespace-nowrap">
                          {effectiveEdit && canEditCommercial ? (
                            <div className="flex items-center gap-1 select-none">
                              <span className="w-4 text-xs font-semibold">
                                {index + 1}
                              </span>
                              <div className="flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() =>
                                    handleMoveLineItem(item.id, "up")
                                  }
                                  className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-colors"
                                  title="Move Up"
                                >
                                  <ChevronUpIcon className="w-3 h-3 stroke-[2.5]" />
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    index === visibleLineItems.length - 1
                                  }
                                  onClick={() =>
                                    handleMoveLineItem(item.id, "down")
                                  }
                                  className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-colors"
                                  title="Move Down"
                                >
                                  <ChevronDownIcon className="w-3 h-3 stroke-[2.5]" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            index + 1
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <div className="w-9 h-9 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                            {item.photo ? (
                              <img
                                src={item.photo}
                                alt="thumb"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-gray-300 text-[10px]">
                                —
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          {effectiveEdit && canEditCommercial ? (
                            <TextCellInput
                              value={item.itemNo || item.material}
                              placeholder="Art.-Nr."
                              onCommit={(raw) =>
                                persistLine(item.id, { itemNo: raw })
                              }
                            />
                          ) : (
                            <span>{item.itemNo || item.material || "—"}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {effectiveEdit && canEditCommercial ? (
                            <TextCellInput
                              value={item.itemName}
                              onCommit={(raw) =>
                                persistLine(item.id, {
                                  itemName: raw || item.itemName,
                                })
                              }
                            />
                          ) : (
                            <span>{item.itemName || "—"}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {effectiveEdit && canEditCommercial ? (
                            <TextCellInput
                              value={item.notes}
                              placeholder="Remark"
                              onCommit={(raw) =>
                                persistLine(item.id, { notes: raw })
                              }
                            />
                          ) : (
                            <span className="text-gray-600">
                              {item.notes || "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center text-gray-600">
                          {effectiveEdit && canEditCommercial && freetext ? (
                            <div className="flex items-center justify-center gap-0.5">
                              <DecimalInput
                                className="w-14 px-1.5 py-1 text-sm border border-gray-300 rounded text-right"
                                value={lineTaxRate}
                                onCommit={(raw) => {
                                  const parsed = parseFlexibleNumber(raw);
                                  const orderRate =
                                    parseFlexibleNumber(order?.tax_rate) ?? 19;
                                  const newRate =
                                    parsed === null ? orderRate : parsed;
                                  const otherRates = getDistinctVatRates(
                                    order,
                                    item.id,
                                  );
                                  if (
                                    otherRates.size >= MAX_DISTINCT_VAT_RATES &&
                                    !otherRates.has(newRate)
                                  ) {
                                    toast.error(
                                      `Auftrag darf nicht mehr als ${MAX_DISTINCT_VAT_RATES} unterschiedliche MwSt.-Sätze gleichzeitig haben.`,
                                      errorStyles,
                                    );
                                    return;
                                  }
                                  persistLine(item.id, {
                                    taxRate: newRate,
                                  });
                                }}
                              />
                              <span>%</span>
                            </div>
                          ) : (
                            `${lineTaxRate}%`
                          )}
                        </td>
                        <td className="px-2 py-2 text-right text-gray-600">
                          {getQtyOpen(item)}
                        </td>
                        <td className="px-2 py-2">
                          {effectiveEdit && canEditCommercial ? (
                            <DecimalInput
                              className="w-full px-1.5 py-1 text-sm border border-gray-300 rounded text-right"
                              value={item.quantity}
                              onCommit={(raw) =>
                                handleQuantityCommit(item, raw)
                              }
                            />
                          ) : (
                            <div className="text-right">{qtyDisplay}</div>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {effectiveEdit && canEditCommercial ? (
                            <DecimalInput
                              className="w-full px-1.5 py-1 text-sm border border-gray-300 rounded text-right"
                              value={item.price}
                              onCommit={(raw) => {
                                const parsed = parseAndRoundTo3Decimals(raw);
                                persistLine(item.id, {
                                  price: parsed === null ? "0" : parsed,
                                });
                              }}
                            />
                          ) : (
                            <div className="text-right font-medium">
                              {formatUnitPriceCurrency(
                                item.price || 0,
                                order?.currency || "EUR",
                                3,
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right font-medium">
                          {formatCurrency(total || 0, order?.currency || "EUR")}
                        </td>
                        {effectiveEdit && canEditCommercial && (
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => removeLineItem(item.id)}
                              className="text-rose-500 hover:text-rose-700"
                              title="Remove line"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {order.shipping_method && (
                    <tr className="bg-gray-50/80 border-t-2 border-gray-200">
                      <td className="px-2 py-2 text-gray-400">
                        {visibleLineItems.length + 1}
                      </td>
                      <td className="px-2 py-2 text-gray-400"></td>
                      <td className="px-2 py-2 text-gray-400">—</td>
                      <td className="px-2 py-2">
                        {effectiveEdit && canEditCommercial ? (
                          <input
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                            value={
                              form.shippingText !== undefined
                                ? form.shippingText
                                : form.shippingMethod || ""
                            }
                            onChange={(e) =>
                              patch({ shippingText: e.target.value })
                            }
                            placeholder="Shipping method description"
                          />
                        ) : (
                          <span className="font-medium text-gray-700">
                            {order.shipping_text ||
                              order.shipping_method ||
                              "No shipping method set"}
                          </span>
                        )}
                      </td>
                      <td className="px-0 py-2 text-center text-gray-400"></td>
                      <td className="px-2 py-2 text-center text-gray-600">
                        {getShippingTaxRate(order)}%
                      </td>
                      <td className="px-2 py-2 text-gray-400"></td>
                      <td className="px-2 py-2">
                        {effectiveEdit && canEditCommercial ? (
                          <DecimalInput
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-right bg-white"
                            value={form.shippingQuantity ?? 1}
                            onCommit={(raw) => {
                              const val = parseFloat(raw.replace(",", "."));
                              if (!isNaN(val) && val > 0)
                                patch({ shippingQuantity: val });
                            }}
                          />
                        ) : (
                          <div className="text-right font-medium">
                            {order.shipping_quantity || 1}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {effectiveEdit && canEditCommercial ? (
                          <DecimalInput
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-right bg-white"
                            value={form.shippingCost ?? 0}
                            onCommit={(raw) => {
                              const val = parseFloat(raw.replace(",", "."));
                              if (!isNaN(val) && val >= 0)
                                patch({ shippingCost: val });
                            }}
                          />
                        ) : (
                          <div className="text-right font-medium">
                            {formatCurrency(
                              order.shipping_cost || 0,
                              order?.currency || "EUR",
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right font-bold text-gray-800">
                        {formatCurrency(
                          (form.shippingCost || 0) *
                            (form.shippingQuantity || 1),
                          order?.currency || "EUR",
                        )}
                      </td>
                      {effectiveEdit && canEditCommercial && <td />}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {effectiveEdit && canEditCommercial && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowItemPicker((s) => !s)}
                    className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1 whitespace-nowrap"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Add existing item
                  </button>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <input
                          className={inputCls}
                          value={newLine.itemName}
                          placeholder="Freizeile — text"
                          onChange={(e) =>
                            setNewLine((n) => ({
                              ...n,
                              itemName: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <button
                        onClick={addLineItem}
                        className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 whitespace-nowrap"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Add Freizeile
                      </button>
                    </div>
                  </div>
                </div>

                {showItemPicker && (
                  <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-2">
                    <div className="w-[70%] flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          EAN
                        </label>
                        <input
                          value={searchEan}
                          onChange={(e) =>
                            handleFieldSearchChange("ean", e.target.value)
                          }
                          placeholder="EAN..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Item No.
                        </label>
                        <input
                          value={searchItemNo}
                          onChange={(e) =>
                            handleFieldSearchChange("itemNo", e.target.value)
                          }
                          placeholder="Item no..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Item Name (EN/DE)
                        </label>
                        <input
                          value={searchName}
                          onChange={(e) =>
                            handleFieldSearchChange("name", e.target.value)
                          }
                          placeholder="Item name..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {itemSearchLoading ? (
                        <div className="text-center text-sm text-gray-400 py-3">
                          Searching…
                        </div>
                      ) : !searchEan.trim() &&
                        !searchItemNo.trim() &&
                        !searchName.trim() ? (
                        <div className="text-center text-sm text-gray-400 py-3">
                          Type in EAN, Item No., or Item Name to search.
                        </div>
                      ) : items.length === 0 ? (
                        <div className="text-center text-sm text-gray-500 py-3">
                          No items match.
                        </div>
                      ) : (
                        items.map((it) => (
                          <ItemRow
                            key={it.id}
                            item={it}
                            onClick={() => addExistingItem(it)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field
                label="Net weight (items)"
                edit={false}
                value={formatWeight(netWeightKg)}
              />
              <Field
                label="Extra weight"
                edit={effectiveEdit && canEditCommercial}
                value={formatWeight(extraWeightKg)}
              >
                <input
                  type="text"
                  inputMode="decimal"
                  className={inputCls}
                  defaultValue={
                    visibleLineItems[0]?.extraWeight === null ||
                    visibleLineItems[0]?.extraWeight === undefined
                      ? ""
                      : (
                          parseFlexibleNumber(
                            visibleLineItems[0].extraWeight,
                          ) ?? 0
                        ).toFixed(1)
                  }
                  placeholder="0"
                  disabled={visibleLineItems.length === 0}
                  onBlur={(e) => {
                    if (!visibleLineItems[0]) return;
                    persistLine(visibleLineItems[0].id, {
                      extraWeight:
                        e.target.value.trim() === "" ? "0" : e.target.value,
                    });
                  }}
                />
              </Field>
              <Field
                label="Total weight"
                edit={false}
                value={formatWeight(totalWeightKg)}
              />
            </div>
            <div className="max-w-sm ml-auto w-full space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">
                  {formatCurrency(
                    (order.subtotal || 0) + shippingTotalForDisplay,
                    order?.currency || "EUR",
                  )}
                </span>
              </div>

              {order.discount_amount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount</span>
                  <span>
                    −
                    {formatCurrency(
                      order.discount_amount,
                      order?.currency || "EUR",
                    )}
                  </span>
                </div>
              )}

              {vatGroups
                .filter((g) => g.rate !== 0)
                .map((g) => (
                  <div key={g.rate} className="flex justify-between">
                    <span className="text-gray-600">VAT ({g.rate}%)</span>
                    <span className="font-medium">
                      {formatCurrency(g.tax, order?.currency || "EUR")}
                    </span>
                  </div>
                ))}
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>
                  {formatCurrency(displayTotal, order?.currency || "EUR")}
                </span>
              </div>

              {(() => {
                const paymentsList =
                  order?.payments || order?.assignedPayments || [];
                if (paymentsList.length === 0) return null;

                const totalPaid = paymentsList.reduce(
                  (sum: number, p: any) => sum + Number(p.amount || 0),
                  0,
                );
                const openAmount = Math.max(0, displayTotal - totalPaid);

                return (
                  <div className="pt-2 space-y-1 text-xs border-t border-dashed border-gray-200">
                    {paymentsList.map((p: any, idx: number) => (
                      <div
                        key={p.id || idx}
                        className="flex justify-between text-gray-600"
                      >
                        <span>
                          Zahlung (
                          {p.paymentMethod || p.method || "Überweisung"}) vom{" "}
                          {formatDate(p.receivedDate || p.createdAt || p.date)}
                        </span>
                        <span className="font-medium text-emerald-700">
                          {formatCurrency(
                            p.amount || 0,
                            order?.currency || "EUR",
                          )}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-sm pt-1 text-gray-900">
                      <span>offener Betrag</span>
                      <span
                        className={
                          openAmount > 0 ? "text-rose-600" : "text-emerald-700"
                        }
                      >
                        {formatCurrency(openAmount, order?.currency || "EUR")}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="bg-white rounded-lg p-4 px-3 border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <LinkIcon className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900">
                  Linked documents
                </h3>
                {linkedDocsCount > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                    {linkedDocsCount}
                  </span>
                )}
              </div>
              {linkedDocsCount > 0 ? (
                <div className="space-y-3">
                  {(
                    Object.keys(
                      LINKED_DOC_LABELS,
                    ) as (keyof typeof linkedDocumentsByType)[]
                  ).map((key: any) => {
                    const docs = sortByCreatedAtDesc(
                      linkedDocumentsByType[key] || [],
                    );
                    if (docs.length === 0) return null;
                    return (
                      <div key={key}>
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          {LINKED_DOC_LABELS[key]}
                        </p>
                        <div className="space-y-1.5 text-sm">
                          {docs.map((doc: any, index: number) => {
                            const displayNumber = getLinkedDocDisplayNumber(
                              key,
                              doc,
                            );
                            const displayDate = getLinkedDocDate(doc);
                            const handleClick = () => {
                              if (key === "offers" && onSwitchToOffer) {
                                onClose();
                                onSwitchToOffer(doc.id);
                              } else if (
                                key === "bestellungen" &&
                                onSwitchToBestellung
                              ) {
                                onClose();
                                onSwitchToBestellung(doc.id);
                              } else if (
                                key === "rechnungen" &&
                                onSwitchToRechnung
                              ) {
                                onClose();
                                onSwitchToRechnung(doc.id);
                              } else if (
                                key === "rechnungenK" &&
                                onSwitchToRechnungK
                              ) {
                                onClose();
                                onSwitchToRechnungK(doc.id);
                              } else {
                                console.warn(
                                  `AuftragPreviewModal: no navigation callback provided for "${key}"`,
                                  doc,
                                );
                              }
                            };
                            return (
                              <div
                                key={doc.id ?? index}
                                className="flex justify-between items-center text-gray-700 hover:bg-gray-50 -mx-1 px-1 py-0.5 rounded"
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleClick();
                                  }}
                                  className="text-sm font-medium text-[#8CC21B] hover:text-[#7ab318] hover:underline cursor-pointer flex items-center gap-1"
                                >
                                  {displayNumber}
                                  <span className="text-xs text-gray-400">
                                    →
                                  </span>
                                </button>
                                {displayDate && (
                                  <span className="text-gray-400 text-xs">
                                    {formatDate(displayDate)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No linked documents yet.
                </p>
              )}
            </div>

            <div className="bg-white rounded-lg px-2 p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <PencilIcon className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1">
                  Comment intern
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(
                        form.internalNotes || order.internal_notes || "",
                      );
                      toast.success("Internal comment copied to clipboard!");
                    }}
                    className="text-gray-400 hover:text-gray-700 transition-colors p-0.5 rounded cursor-pointer font-normal"
                    title="Copy Internal Comment"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  </button>
                </h3>
              </div>
              {effectiveEdit ? (
                <textarea
                  rows={3}
                  className={inputCls}
                  value={form.internalNotes}
                  placeholder="Only visible to the team."
                  onChange={(e) => patch({ internalNotes: e.target.value })}
                />
              ) : (
                <p className="text-sm text-gray-600">
                  {order.internal_notes || "—"}
                </p>
              )}
            </div>
            <div className="bg-white rounded-lg px-2 p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <PencilIcon className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1">
                  Comment extern
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(
                        form.notes || order.notes || "",
                      );
                      toast.success("External comment copied to clipboard!");
                    }}
                    className="text-gray-400 hover:text-gray-700 transition-colors p-0.5 rounded cursor-pointer font-normal"
                    title="Copy External Comment"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  </button>
                </h3>
              </div>
              {effectiveEdit ? (
                <textarea
                  rows={3}
                  className={inputCls}
                  value={form.notes}
                  placeholder="Shown to the customer."
                  onChange={(e) => patch({ notes: e.target.value })}
                />
              ) : (
                <p className="text-sm text-gray-600">{order.notes || "—"}</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          <div>
            {effectiveEdit && userRole === UserRole.ADMIN && isOpenStatus && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm text-red-700 bg-white border border-red-300/80 rounded-lg hover:bg-red-50 flex items-center gap-1 font-semibold"
              >
                <TrashIcon className="h-4 w-4" />
                Delete Auftrag
              </button>
            )}
            {effectiveEdit && isPartiallyDeliveredStatus && (
              <button
                onClick={handleCloseAuftrag}
                disabled={closing}
                className="px-4 py-2 text-sm text-white bg-gray-600 rounded-lg hover:bg-gray-700 flex items-center gap-1 font-semibold disabled:opacity-50"
              >
                <XMarkIcon className="h-4 w-4" />
                {closing ? "Closing…" : "Close Auftrag"}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={effectiveEdit ? handleCancelEdit : onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {effectiveEdit ? "Cancel" : "Close"}
            </button>
            {effectiveEdit && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default AuftragPreviewModal;

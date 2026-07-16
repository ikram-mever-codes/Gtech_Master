"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  PrinterIcon,
  PlusIcon,
  CheckCircleIcon,
  CogIcon,
  ClipboardIcon,
  CalculatorIcon,
  LinkIcon,
  CubeIcon,
  BuildingOfficeIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { DownloadCloudIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import CustomModal from "@/components/UI/CustomModal";
import ViewEditToggle from "@/components/UI/ViewEditToggle";
import { CustomerSearchInput } from "@/components/UI/CustomerSearchInput";
import {
  getOfferById,
  updateOffer,
  deleteOffer,
  generateOfferPdf,
  downloadOfferPdf,
  copyPastePrices,
  updateLineItem,
  addQuantityPrice,
  setActivePrice,
  createOfferLineItem,
  deleteOfferLineItem,
  createOfferFromInquiry,
  createOfferFromItem,
  formatCurrency,
  formatUnitPrice,
  formatTotalPrice,
  formatUnitPriceForOffer,
  calculateLineItemTotal,
  calculateUnitPriceTotal,
  calculateLineTotal,
  getActivePrice,
  getActivePriceType,
  getOfferStatuses,
  getAvailableCurrencies,
  getOfferStatusColor,
  offerUsesUnitPrices,
  type UnitPrice,
} from "@/api/offers";
import { getAllInquiries } from "@/api/inquiry";
import { getAllCustomers } from "@/api/customers";
import { getItems } from "@/api/items";
import { getAllPaymentMethods } from "@/api/payment_methods";
import { getAllShippingMethods } from "@/api/shipping_methods";
import { formatDate, openOutlookWithOffer } from "@/utils/offers";
import { UserRole } from "@/utils/interfaces";
import { errorStyles } from "@/utils/constants";
import { BASE_URL } from "@/utils/constants";

interface OfferDetailModalProps {
  isOpen: boolean;
  /** null => create mode (inline picker); string => view/edit an existing offer. */
  offerId: string | null;
  onClose: () => void;
  /** Called after any change that should refresh the list behind the modal. */
  onChanged?: () => void;
  userRole?: UserRole;
}

type SourceType = "inquiry" | "item";

const inputCls =
  "w-full px-2.5 py-1.5 text-sm border border-gray-300/80 bg-white/70 rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default";

/**
 * Generic, dropdown-fed option lists. Kept on the client so the UX is
 * consistent; the chosen value is stored as free text on the offer, which
 * means these can grow without a DB migration.
 */
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

/**
 * Thumbnail resolution mirrors the Items page so selected items look the same
 * here. Duplicated intentionally to keep this modal self-contained rather than
 * coupling it to the Items page's internal helpers.
 */
const resolveThumbUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.includes("cloudinary.com")) return url;
  if (url.includes("/uploads/")) {
    const fileName = url.split("/uploads/").pop();
    try {
      const apiOrigin = new URL(BASE_URL).origin;
      return `${apiOrigin}/uploads/${fileName}`;
    } catch {
      return url;
    }
  }
  return url;
};

const getItemThumb = (item: any): string | null =>
  resolveThumbUrl(
    item?.photo ||
    item?.pix_path_eBay ||
    item?.pictures?.shopPicture ||
    (item?.pix_path ? item.pix_path.split(",").filter(Boolean)[0] : null) ||
    null,
  );

const getItemCompany = (item: any): string =>
  item?.customer_name ||
  item?.company_display_name ||
  item?.companyDisplayName ||
  item?.customer?.companyName ||
  item?.customer?.company_name ||
  item?.customer?.name ||
  item?.company_name ||
  item?.company ||
  "";

/** Section wrapper for a consistent rhythm across the modal. */
const Section: React.FC<{
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, right, children }) => (
  <section className="border border-gray-200 rounded-xl bg-white">
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      {right}
    </header>
    <div className="p-4">{children}</div>
  </section>
);

/** Read/edit field. Shows plain text in view mode, an input in edit mode. */
const Field: React.FC<{
  label: string;
  edit: boolean;
  value: any;
  render?: () => React.ReactNode;
  children?: React.ReactNode;
}> = ({ label, edit, value, render, children }) => (
  <div>
    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
      {label}
    </p>
    <div className="text-sm text-gray-900 break-words">
      {edit ? children : render ? render() : value || "—"}
    </div>
  </div>
);

/**
 * Selected/selectable item row styled like the Items page: thumbnail, then
 * ItemName over "ItemNo - Company - isLabel".
 */
const ItemRow: React.FC<{
  item: any;
  selected: boolean;
  onClick: () => void;
}> = ({ item, selected, onClick }) => {
  const thumb = getItemThumb(item);
  const name = item.item_name || item.itemName || "Unnamed item";
  const itemNo = item.de_no || item.ItemID_DE || item.itemNo || "";
  const company = getItemCompany(item);
  const isLabel = item.isLabelPrint || item.isLabel === "Y";

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-all ${selected
        ? "border-primary bg-primary/5"
        : "border-gray-200 hover:bg-gray-50"
        }`}
    >
      <div className="w-12 h-12 shrink-0 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
        {thumb ? (
          <img
            src={thumb}
            alt="thumb"
            className="w-full h-full object-cover"
            onError={(e) =>
              ((e.target as HTMLImageElement).style.display = "none")
            }
          />
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900 truncate">{name}</div>
        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-gray-700">{itemNo || "—"}</span>
          <span>-</span>
          <span className="text-blue-600 font-medium truncate max-w-[10rem]">
            {company || "—"}
          </span>
          {isLabel && (
            <>
              <span>-</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 rounded uppercase tracking-wider">
                LABEL
              </span>
            </>
          )}
        </div>
      </div>
      {selected && (
        <CheckCircleIcon className="h-5 w-5 text-primary shrink-0" />
      )}
    </div>
  );
};

/** Small selectable row used by the inquiry picker. */
const PickerRow: React.FC<{
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  meta?: string;
}> = ({ selected, onClick, title, subtitle, meta }) => (
  <div
    onClick={onClick}
    className={`p-3 border rounded-lg cursor-pointer transition-all ${selected
      ? "border-primary bg-primary/5"
      : "border-gray-200 hover:bg-gray-50"
      }`}
  >
    <div className="flex justify-between items-start">
      <div className="min-w-0">
        <div className="font-medium text-gray-900 truncate">{title}</div>
        {subtitle && (
          <div className="text-sm text-gray-600 truncate">{subtitle}</div>
        )}
      </div>
      {meta && (
        <div className="text-xs text-gray-500 shrink-0 ml-2">{meta}</div>
      )}
    </div>
  </div>
);

/** Read-only address block, reused for both customer and delivery address. */
const AddressBlock: React.FC<{ addr: any; emptyText: string }> = ({
  addr,
  emptyText,
}) => {
  if (!addr) {
    return <div className="text-sm text-gray-400">{emptyText}</div>;
  }
  const line2 = `${addr.postalCode || ""} ${addr.city || ""}`.trim();
  return (
    <div className="space-y-1 text-sm text-gray-700">
      {(addr.companyName || addr.contactName) && (
        <div className="font-medium text-gray-900">
          {addr.companyName || addr.contactName}
        </div>
      )}
      {addr.legalName && addr.legalName !== addr.companyName && (
        <div>{addr.legalName}</div>
      )}
      {(addr.address || addr.street) && (
        <div>{addr.address || addr.street}</div>
      )}
      {line2 && <div>{line2}</div>}
      {addr.country && <div>{addr.country}</div>}
      {addr.vatId && <div className="text-gray-500">VAT ID: {addr.vatId}</div>}
      {addr.contactPhone && (
        <div className="text-gray-500">Phone: {addr.contactPhone}</div>
      )}
    </div>
  );
};

export const OfferDetailModal: React.FC<OfferDetailModalProps> = ({
  isOpen,
  offerId,
  onClose,
  onChanged,
  userRole,
}) => {
  const [offer, setOffer] = useState<any>(null);
  const displayInquiryNo = offer?.inquirySnapshot?.referenceNumber ||
    offer?.inquirySnapshot?.inquiryNo ||
    offer?.inquiry?.referenceNumber ||
    offer?.inquiry?.inquiryNo ||
    "";
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState(false);
  const [dbPaymentMethods, setDbPaymentMethods] = useState<any[]>([]);
  const [dbShippingMethods, setDbShippingMethods] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const [pmRes, smRes]: any = await Promise.all([
          getAllPaymentMethods(true).catch(() => ({ data: [] })),
          getAllShippingMethods(true).catch(() => ({ data: [] })),
        ]);
        setDbPaymentMethods(Array.isArray(pmRes?.data) ? pmRes.data.filter((pm: any) => pm.is_active) : []);
        setDbShippingMethods(Array.isArray(smRes?.data) ? smRes.data.filter((sm: any) => sm.is_active) : []);
      } catch (e) {
        console.error("Failed to load payment/shipping methods:", e);
      }
    })();
  }, [isOpen]);

  // create mode = the modal is open with no offer id yet.
  const isCreate = !offerId && !offer;

  // Editable header/detail fields kept in a working copy; pricing persists live.
  const [form, setForm] = useState<any>({});

  // Inline panels (kept inside this single modal instead of separate popups).
  const [showSettings, setShowSettings] = useState(false);
  const [showCopyPaste, setShowCopyPaste] = useState(false);
  const [copyPasteData, setCopyPasteData] = useState("");
  const [newLine, setNewLine] = useState<{
    itemName: string;
    baseQuantity: string;
  }>({ itemName: "", baseQuantity: "1" });

  const [creating, setCreating] = useState(false);
  const [sourceType, setSourceType] = useState<SourceType>("inquiry");
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [filterCustomerId, setFilterCustomerId] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [sourceSearch, setSourceSearch] = useState("");
  const [createForm, setCreateForm] = useState<any>({
    title: "",
    currency: "EUR",
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    paymentMethod: "",
    shippingMethod: "",
    paymentTerms: "",
    useUnitPrices: true,
    unitPriceDecimalPlaces: 3,
    totalPriceDecimalPlaces: 2,
    maxUnitPriceColumns: 3,
  });

  const fetchOffer = useCallback(async () => {
    if (!offerId) return;
    setLoading(true);
    try {
      const res = await getOfferById(offerId);
      if (res.success) {
        setOffer(res.data);
        setForm(buildForm(res.data));
      }
    } catch (e) {
      console.error("Failed to load offer:", e);
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  // Load offer when an id is present; reset everything when the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setEdit(false);
    setShowSettings(false);
    setShowCopyPaste(false);
    setCopyPasteData("");
    if (offerId) {
      fetchOffer();
    } else {
      // entering create mode fresh
      setOffer(null);
      resetCreatePicker();
    }
  }, [isOpen, offerId, fetchOffer]);

  // Lazy-load source lists the first time we're in create mode.
  useEffect(() => {
    if (!isOpen || offerId) return;
    (async () => {
      try {
        const [inqRes, custRes, itemRes]: any = await Promise.all([
          getAllInquiries({ limit: 1000 }),
          getAllCustomers({ limit: 1000 }),
          getItems({ limit: 1000 }).catch(() => ({ data: [] })),
        ]);
        setInquiries(
          Array.isArray(inqRes?.data)
            ? inqRes.data
            : inqRes?.data?.inquiries || [],
        );
        setCustomers(
          Array.isArray(custRes?.data)
            ? custRes.data
            : custRes?.data?.customers || custRes?.data?.businesses || [],
        );
        setItems(
          Array.isArray(itemRes?.data)
            ? itemRes.data
            : itemRes?.data?.items || [],
        );
      } catch (e) {
        console.error("Error loading sources:", e);
      }
    })();
  }, [isOpen, offerId]);

  if (!isOpen) return null;

  function resetCreatePicker() {
    setSourceType("inquiry");
    setFilterCustomerId("");
    setSourceSearch("");
    setSelectedInquiry(null);
    setSelectedItems([]);
    setCreateForm({
      title: "",
      currency: "EUR",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      paymentMethod: "",
      shippingMethod: "",
      paymentTerms: "",
      useUnitPrices: true,
      unitPriceDecimalPlaces: 3,
      totalPriceDecimalPlaces: 2,
      maxUnitPriceColumns: 3,
    });
  }


  function buildForm(o: any) {
    return {
      title: o.title || "",
      status: o.status,
      currency: o.currency,
      validUntil: o.validUntil,
      deliveryTime: o.deliveryTime || "",
      paymentTerms: o.paymentTerms || "",
      paymentMethod: o.paymentMethod || "",
      shippingMethod: o.shippingMethod || "",
      deliveryTerms: o.deliveryTerms || "",
      termsConditions: o.termsConditions || "",
      discountPercentage: o.discountPercentage ?? "",
      shippingCost: o.shippingCost ?? "",
      notes: o.notes || "",
      internalNotes: o.internalNotes || "",
      deliveryAddress: { ...(o.deliveryAddress || {}) },
      useUnitPrices: !!o.useUnitPrices,
      unitPriceDecimalPlaces: o.unitPriceDecimalPlaces || 3,
      totalPriceDecimalPlaces: o.totalPriceDecimalPlaces || 2,
      maxUnitPriceColumns: o.maxUnitPriceColumns || 3,
    };
  }

  const patch = (p: any) => setForm((f: any) => ({ ...f, ...p }));

  const refreshLocal = async () => {
    const updated = await getOfferById(offer.id);
    if (updated.success) setOffer(updated.data);
  };

  // =========================================================================
  // CREATE FLOW (inline picker) — runs only while offerId === null
  // =========================================================================
  const cPatch = (p: any) => setCreateForm((f: any) => ({ ...f, ...p }));

  const visibleInquiries = inquiries.filter((i) => {
    const matchCust = filterCustomerId
      ? i.customer?.id === filterCustomerId
      : true;
    const matchSearch = sourceSearch
      ? i.name?.toLowerCase().includes(sourceSearch.toLowerCase())
      : true;
    return matchCust && matchSearch;
  });

  // Items are decoupled from the offer's customer: the customer is just the
  // recipient. Show every item, filtered only by the search box. (MVP: any
  // company can be offered any item — no cross-restriction.)
  const visibleItems = items.filter((it) => {
    const name = it.item_name || it.itemName || "";
    if (!sourceSearch) return true;
    const q = sourceSearch.toLowerCase();
    return (
      name.toLowerCase().includes(q) ||
      String(it.ean || "").includes(sourceSearch) ||
      String(it.model || "")
        .toLowerCase()
        .includes(q) ||
      String(it.customer?.companyName || "")
        .toLowerCase()
        .includes(q)
    );
  });

  const selectedCustomer = customers.find(
    (c: any) => String(c.id) === String(filterCustomerId),
  );

  const toggleItem = (it: any) => {
    setSelectedItems((prev) => {
      const exists = prev.some((p) => String(p.id) === String(it.id));
      const next = exists
        ? prev.filter((p) => String(p.id) !== String(it.id))
        : [...prev, it];
      setCreateForm((f: any) => {
        if (f.title?.trim()) return f;
        const first = next[0];
        return first
          ? { ...f, title: `Offer for ${first.item_name || first.itemName}` }
          : f;
      });
      return next;
    });
  };

  const canCreate = () => {
    if (!createForm.title?.trim()) return false;
    if (sourceType === "inquiry") return !!selectedInquiry;
    // MVP: recipient customer required for item offers, but any item allowed.
    if (sourceType === "item")
      return !!filterCustomerId && selectedItems.length > 0;
    return false;
  };

  // Creates the offer server-side, then flips THIS modal into edit view on it.
  const handleCreate = async () => {
    if (!canCreate()) return;
    setCreating(true);
    try {
      const common = {
        title: createForm.title,
        currency: createForm.currency,
        validUntil: createForm.validUntil,
        paymentMethod: createForm.paymentMethod || undefined,
        shippingMethod: createForm.shippingMethod || undefined,
        paymentTerms: createForm.paymentTerms || undefined,
        useUnitPrices: createForm.useUnitPrices,
        unitPriceDecimalPlaces: createForm.unitPriceDecimalPlaces,
        totalPriceDecimalPlaces: createForm.totalPriceDecimalPlaces,
        maxUnitPriceColumns: createForm.maxUnitPriceColumns,
      };

      let res: any;
      if (sourceType === "inquiry") {
        res = await createOfferFromInquiry(selectedInquiry.id, common);
      } else {
        res = await createOfferFromItem(String(selectedItems[0].id), {
          ...common,
          customerId: filterCustomerId,
          itemIds: selectedItems.map((it) => String(it.id)),
        });
      }

      if (res?.success && res.data?.id) {
        onChanged?.();
        // Flip into the normal detail/edit view on the brand-new offer.
        setOffer(res.data);
        setForm(buildForm(res.data));
        setEdit(true); // open straight into edit so pricing can be entered
      }
    } catch (e) {
      console.error("Error creating offer:", e);
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!offer) return;
    if (!form.title?.trim()) {
      toast.error("Title can't be empty.", errorStyles);
      return;
    }
    setSaving(true);
    try {
      const res = await updateOffer(offer.id, {
        title: form.title,
        status: form.status,
        currency: form.currency,
        validUntil: form.validUntil,
        deliveryTime: form.deliveryTime,
        paymentTerms: form.paymentTerms,
        paymentMethod: form.paymentMethod || undefined,
        shippingMethod: form.shippingMethod || undefined,
        deliveryTerms: form.deliveryTerms,
        termsConditions: form.termsConditions,
        notes: form.notes,
        internalNotes: form.internalNotes,
        // Delivery address is shown read-only at the top; still persisted as-is.
        deliveryAddress: form.deliveryAddress,
        discountPercentage:
          form.discountPercentage === ""
            ? 0
            : parseFloat(form.discountPercentage),
        shippingCost:
          form.shippingCost === "" ? 0 : parseFloat(form.shippingCost),
        useUnitPrices: form.useUnitPrices,
        unitPriceDecimalPlaces: form.unitPriceDecimalPlaces,
        totalPriceDecimalPlaces: form.totalPriceDecimalPlaces,
        maxUnitPriceColumns: form.maxUnitPriceColumns,
      });
      if (res.success) {
        await refreshLocal();
        setEdit(false);
        onChanged?.();
      }
    } catch (e) {
      console.error("Error saving offer:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setForm(buildForm(offer));
    setEdit(false);
    setShowSettings(false);
    setShowCopyPaste(false);
  };

  const handleDelete = async () => {
    if (!offer) return;
    if (!window.confirm("Delete this offer? This can't be undone.")) return;
    try {
      await deleteOffer(offer.id);
      onClose();
      onChanged?.();
    } catch (e) {
      console.error("Error deleting offer:", e);
    }
  };

  const handlePdf = async () => {
    try {
      const res = await generateOfferPdf(offer.id);
      if (res || res?.success) {
        await downloadOfferPdf(offer.id, offer.offerNumber);
        await refreshLocal();
      }
    } catch (e) {
      console.error("PDF error:", e);
    }
  };

  // --- Pricing handlers (persist immediately while in edit mode) ------------
  const toggleUnitPricing = async (value: boolean) => {
    try {
      await updateOffer(offer.id, { useUnitPrices: value });
      patch({ useUnitPrices: value });
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't switch pricing mode:", e);
    }
  };

  const saveSettings = async () => {
    try {
      await updateOffer(offer.id, {
        unitPriceDecimalPlaces: form.unitPriceDecimalPlaces,
        totalPriceDecimalPlaces: form.totalPriceDecimalPlaces,
        maxUnitPriceColumns: form.maxUnitPriceColumns,
      });
      await refreshLocal();
      setShowSettings(false);
      onChanged?.();
    } catch (e) {
      console.error("Couldn't save settings:", e);
    }
  };

  const setActive = async (
    lineItemId: string,
    type: "quantity" | "unit",
    idx: number,
  ) => {
    try {
      await setActivePrice(lineItemId, type, idx);
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't set the active price:", e);
    }
  };

  const persistLine = async (lineItemId: string, payload: any) => {
    const res = await updateLineItem(offer.id, lineItemId, payload);
    if (res?.success || res?.data) {
      setOffer((prev: any) => ({
        ...prev,
        lineItems: prev.lineItems.map((li: any) =>
          li.id === lineItemId ? res.data : li,
        ),
      }));
    }
  };

  const updateUnitPriceRow = async (
    lineItemId: string,
    upId: string,
    updates: Partial<UnitPrice>,
  ) => {
    const li = offer.lineItems.find((l: any) => l.id === lineItemId);
    if (!li) return;
    const updated = (li.unitPrices || []).map((up: UnitPrice) =>
      up.id === upId ? { ...up, ...updates } : up,
    );
    await persistLine(lineItemId, { unitPrices: updated });
  };

  const deleteUnitPriceRow = async (lineItemId: string, upId: string) => {
    if (!window.confirm("Delete this unit price?")) return;
    const li = offer.lineItems.find((l: any) => l.id === lineItemId);
    if (!li) return;
    const updated = (li.unitPrices || []).filter(
      (up: UnitPrice) => up.id !== upId,
    );
    await persistLine(lineItemId, { unitPrices: updated });
  };

  const addUnitPriceRow = async (lineItemId: string) => {
    const li = offer.lineItems.find((l: any) => l.id === lineItemId);
    if (!li) return;
    const next = [
      ...(li.unitPrices || []),
      {
        id: `up-${Date.now()}`,
        quantity: "1000",
        unitPrice: 0,
        totalPrice: 0,
        isActive: (li.unitPrices || []).length === 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await persistLine(lineItemId, { unitPrices: next });
  };

  // Delete a whole pricing column (a quantity tier) across every line item.
  const deletePriceColumn = async (quantity: string) => {
    if (
      !window.confirm(
        `Delete the ${quantity} column from all items in this offer?`,
      )
    )
      return;
    try {
      // One update per line item so the change is atomic per row and reuses
      // the existing updateLineItem endpoint (no extra API surface required).
      const targets = (offer.lineItems || []).filter(
        (li: any) => !li.isComponent,
      );
      for (const li of targets) {
        if (offer.useUnitPrices) {
          const after = (li.unitPrices || []).filter(
            (up: UnitPrice) => String(up.quantity).trim() !== quantity.trim(),
          );
          if (after.length && !after.some((up: UnitPrice) => up.isActive))
            after[0].isActive = true;
          await updateLineItem(offer.id, li.id, { unitPrices: after });
        } else {
          const after = (li.quantityPrices || []).filter(
            (qp: any) => String(qp.quantity).trim() !== quantity.trim(),
          );
          if (after.length && !after.some((qp: any) => qp.isActive))
            after[0].isActive = true;
          await updateLineItem(offer.id, li.id, { quantityPrices: after });
        }
      }
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't delete the pricing column:", e);
    }
  };

  const updateQuantityPriceRow = async (
    lineItemId: string,
    idx: number,
    updates: any,
  ) => {
    const li = offer.lineItems.find((l: any) => l.id === lineItemId);
    if (!li) return;
    const updated = (li.quantityPrices || []).map((qp: any, i: number) =>
      i === idx ? { ...qp, ...updates } : qp,
    );
    await persistLine(lineItemId, { quantityPrices: updated });
  };

  const deleteQuantityPriceRow = async (lineItemId: string, idx: number) => {
    if (!window.confirm("Delete this price level?")) return;
    const li = offer.lineItems.find((l: any) => l.id === lineItemId);
    if (!li) return;
    const updated = (li.quantityPrices || []).filter(
      (_: any, i: number) => i !== idx,
    );
    await persistLine(lineItemId, { quantityPrices: updated });
  };

  const addQuantityLevel = async (lineItemId: string) => {
    const quantity = prompt("Enter quantity (e.g., 1000):");
    const price = prompt(`Enter price per unit in ${offer.currency}:`);
    if (!quantity || !price) return;
    try {
      await addQuantityPrice(lineItemId, {
        quantity,
        price: parseFloat(price),
        isActive: false,
      });
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't add the price level:", e);
    }
  };

  const addLineItem = async () => {
    if (!newLine.itemName.trim()) {
      toast.error("Enter an item name first.", errorStyles);
      return;
    }
    try {
      await createOfferLineItem(offer.id, {
        itemName: newLine.itemName.trim(),
        baseQuantity: newLine.baseQuantity || "1",
      });
      setNewLine({ itemName: "", baseQuantity: "1" });
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't add the item:", e);
    }
  };

  const removeLineItem = async (lineItemId: string) => {
    if (!window.confirm("Remove this line item?")) return;
    try {
      await deleteOfferLineItem(offer.id, lineItemId);
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't remove the item:", e);
    }
  };

  const handleCopyPaste = async () => {
    if (!copyPasteData.trim()) {
      toast.error("Paste data from your spreadsheet first.", errorStyles);
      return;
    }
    try {
      const res = await copyPastePrices(offer.id, { data: copyPasteData });
      if (res.success) {
        setShowCopyPaste(false);
        setCopyPasteData("");
        await refreshLocal();
        onChanged?.();
      }
    } catch (e) {
      console.error("Couldn't import the pasted prices:", e);
    }
  };

  // ------------------------------------------------------------------------
  const sourceBadge = () => {
    const map: Record<
      string,
      { label: string; cls: string; icon: React.ReactNode }
    > = {
      inquiry: {
        label: "From inquiry",
        cls: "bg-blue-100 text-blue-800",
        icon: <LinkIcon className="h-3 w-3" />,
      },
      item: {
        label: "From item",
        cls: "bg-amber-100 text-amber-800",
        icon: <CubeIcon className="h-3 w-3" />,
      },
      customer: {
        label: "From customer",
        cls: "bg-violet-100 text-violet-800",
        icon: <BuildingOfficeIcon className="h-3 w-3" />,
      },
    };
    const s = map[offer?.sourceType] || map.inquiry;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium ${s.cls}`}
      >
        {s.icon}
        {s.label}
      </span>
    );
  };

  const visibleLineItems =
    offer?.lineItems?.filter((li: any) => !li.isComponent) || [];

  // Collect the distinct quantity tiers so a whole column can be deleted.
  const priceColumns: string[] = (() => {
    const set = new Set<string>();
    visibleLineItems.forEach((li: any) => {
      const rows = offer?.useUnitPrices ? li.unitPrices : li.quantityPrices;
      (rows || []).forEach((r: any) => set.add(String(r.quantity).trim()));
    });
    return Array.from(set).sort(
      (a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0),
    );
  })();

  const sourceTabs: {
    key: SourceType;
    label: string;
    icon: React.ReactNode;
  }[] = [
      {
        key: "inquiry",
        label: "From inquiry",
        icon: <LinkIcon className="h-4 w-4" />,
      },
      {
        key: "item",
        label: "Customer + item(s)",
        icon: <CubeIcon className="h-4 w-4" />,
      },
    ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {isCreate ? (
          <>
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">
                Create new offer
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Source tabs */}
              <div className="grid grid-cols-2 gap-2">
                {sourceTabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => {
                      setSourceType(t.key);
                      setSourceSearch("");
                      setSelectedInquiry(null);
                      setSelectedItems([]);
                    }}
                    className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all ${sourceType === t.key
                      ? "border-primary bg-primary/5 text-primary font-semibold"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offer title *
                </label>
                <input
                  value={createForm.title}
                  onChange={(e) => cPatch({ title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  placeholder={
                    sourceType === "inquiry"
                      ? "Defaults to the inquiry name"
                      : "Defaults to the first item's name"
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {sourceType === "item"
                      ? "Recipient customer * (required)"
                      : "Filter by customer"}
                  </label>
                  <CustomerSearchInput
                    value={filterCustomerId}
                    onChange={(id) => {
                      setFilterCustomerId(id);
                      if (id) {
                        const cust = customers.find((c) => String(c.id) === String(id));
                        if (cust) {
                          cPatch({
                            paymentMethod: cust.defaultPaymentMethod || "",
                            shippingMethod: cust.defaultShippingMethod || "",
                            paymentTerms: `${cust.defaultPaymentDueDays !== undefined && cust.defaultPaymentDueDays !== null ? cust.defaultPaymentDueDays : 7} Tage netto`,
                          });
                        }
                      }
                    }}

                    placeholder={
                      sourceType === "item"
                        ? "Select a customer..."
                        : "All customers"
                    }
                    mode="customers"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Search
                  </label>
                  <input
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                    placeholder={
                      sourceType === "inquiry"
                        ? "Search inquiries…"
                        : "Search items or EAN…"
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {sourceType === "item" && selectedCustomer && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Customer address
                    </p>
                    <AddressBlock
                      addr={{
                        companyName: selectedCustomer.companyName,
                        legalName: selectedCustomer.legalName,
                        address:
                          selectedCustomer.addressLine1 ||
                          selectedCustomer.businessDetails?.address,
                        postalCode:
                          selectedCustomer.postalCode ||
                          selectedCustomer.businessDetails?.postalCode,
                        city:
                          selectedCustomer.city ||
                          selectedCustomer.businessDetails?.city,
                        country:
                          selectedCustomer.country ||
                          selectedCustomer.businessDetails?.country,
                        vatId:
                          selectedCustomer.vatTaxId ||
                          selectedCustomer.taxNumber,
                      }}
                      emptyText="No address on file."
                    />
                  </div>
                  <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Delivery address
                    </p>
                    <AddressBlock
                      addr={
                        selectedCustomer.deliveryAddressLine1
                          ? {
                            contactName:
                              selectedCustomer.legalName ||
                              selectedCustomer.companyName,
                            street: selectedCustomer.deliveryAddressLine1,
                            postalCode: selectedCustomer.deliveryPostalCode,
                            city: selectedCustomer.deliveryCity,
                            country: selectedCustomer.deliveryCountry,
                            contactPhone: selectedCustomer.contactPhoneNumber,
                          }
                          : null
                      }
                      emptyText="Same as customer address."
                    />
                  </div>
                </div>
              )}

              {/* Source list */}
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {sourceType === "inquiry" &&
                  (visibleInquiries.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No inquiries match.
                    </div>
                  ) : (
                    visibleInquiries.map((inq) => (
                      <PickerRow
                        key={inq.id}
                        selected={selectedInquiry?.id === inq.id}
                        onClick={() => {
                          setSelectedInquiry(inq);
                          setCreateForm((f: any) => ({
                            ...f,
                            title: inq.name,
                            paymentMethod: inq.customer?.defaultPaymentMethod || f.paymentMethod || "",
                            shippingMethod: inq.customer?.defaultShippingMethod || f.shippingMethod || "",
                            paymentTerms: inq.customer?.defaultPaymentDueDays !== undefined && inq.customer?.defaultPaymentDueDays !== null ? `${inq.customer.defaultPaymentDueDays} Tage netto` : (f.paymentTerms || ""),
                          }));
                        }}


                        title={inq.name}
                        subtitle={`Customer: ${inq.customer?.companyName || "—"}`}
                        meta={`${inq.requests?.length || 0} items · ${inq.isAssembly ? "Assembly" : "Standard"
                          }`}
                      />
                    ))
                  ))}

                {sourceType === "item" &&
                  (visibleItems.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      {sourceSearch
                        ? "No items match your search."
                        : "No items found."}
                    </div>
                  ) : (
                    visibleItems.map((it) => (
                      <ItemRow
                        key={it.id}
                        item={it}
                        selected={selectedItems.some(
                          (p) => String(p.id) === String(it.id),
                        )}
                        onClick={() => toggleItem(it)}
                      />
                    ))
                  ))}
              </div>

              {/* Selected items list (Items-page styling) */}
              {sourceType === "item" && selectedItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Selected items ({selectedItems.length})
                  </p>
                  <div className="space-y-2">
                    {selectedItems.map((it) => (
                      <div key={it.id} className="flex items-center gap-2">
                        <div className="flex-1">
                          <ItemRow
                            item={it}
                            selected
                            onClick={() => toggleItem(it)}
                          />
                        </div>
                        <button
                          onClick={() => toggleItem(it)}
                          className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 shrink-0"
                          title="Remove from selection"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Common fields — always available once a title exists */}
              <div className="space-y-4 border-t pt-4">


                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment method
                    </label>
                    <select
                      value={createForm.paymentMethod}
                      onChange={(e) =>
                        cPatch({ paymentMethod: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    >
                      <option value="">Select…</option>
                      {(dbPaymentMethods.length > 0 ? dbPaymentMethods.map((pm: any) => pm.name) : PAYMENT_METHODS).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shipping method
                    </label>
                    <select
                      value={createForm.shippingMethod}
                      onChange={(e) =>
                        cPatch({ shippingMethod: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    >
                      <option value="">Select…</option>
                      {(dbShippingMethods.length > 0 ? dbShippingMethods.map((sm: any) => sm.name) : SHIPPING_METHODS).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>


              </div>
            </div>

            {/* Create footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!canCreate() || creating}
                className="px-4 py-2 text-sm bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create offer"}
              </button>
            </div>
          </>
        ) : loading || !offer ? (
          <div className="p-6 py-24 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary" />
            <p className="mt-2 text-sm text-gray-500">Loading offer…</p>
          </div>
        ) : (
          <>
            {/* Header — shows offer title, and inquiry number when applicable */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0 select-none">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-gray-900 truncate">
                    Offer {offer.title}
                  </h2>
                  {offer.revision > 1 && (
                    <span className="text-xs text-gray-500">
                      Rev. {offer.revision}
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${getOfferStatusColor(
                      offer.status,
                    )}`}
                  >
                    {offer.status}
                  </span>
                  {sourceBadge()}
                  {displayInquiryNo && (
                    <span className="text-sm font-bold text-gray-900 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                      <LinkIcon className="h-3 w-3" />
                      {displayInquiryNo}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-500 truncate mt-0.5">
                  Offer {offer.offerNumber}
                </p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <ViewEditToggle
                  isEditEnabled={edit}
                  onToggle={() => (edit ? handleCancelEdit() : setEdit(true))}
                  disabled={saving}
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

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Section
                  title="Customer"
                  icon={
                    <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
                  }
                >
                  <AddressBlock
                    addr={{
                      companyName: offer.customerSnapshot?.companyName,
                      legalName: offer.customerSnapshot?.legalName,
                      address: offer.customerSnapshot?.address,
                      street: offer.customerSnapshot?.street,
                      postalCode: offer.customerSnapshot?.postalCode,
                      city: offer.customerSnapshot?.city,
                      country: offer.customerSnapshot?.country,
                      vatId: offer.customerSnapshot?.vatId,
                    }}
                    emptyText="No customer snapshot."
                  />
                  <p className="text-[11px] text-gray-400 pt-2">
                    Snapshot taken when the offer was created.
                  </p>
                </Section>

                <Section
                  title="Delivery address"
                  icon={
                    <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
                  }
                >
                  {edit && (
                    <label className="flex items-center gap-2 mb-3 cursor-pointer text-xs font-semibold text-gray-600 select-none">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                        checked={
                          !form.deliveryAddress?.street ||
                          form.deliveryAddress?.street === (offer.customerSnapshot?.address || offer.customerSnapshot?.street || "")
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            patch({
                              deliveryAddress: {
                                contactName: offer.customerSnapshot?.legalName || offer.customerSnapshot?.companyName || "",
                                street: offer.customerSnapshot?.address || offer.customerSnapshot?.street || "",
                                postalCode: offer.customerSnapshot?.postalCode || "",
                                city: offer.customerSnapshot?.city || "",
                                country: offer.customerSnapshot?.country || "",
                                contactPhone: offer.customerSnapshot?.contactPhoneNumber || "",
                              }
                            });
                          } else {
                            patch({
                              deliveryAddress: {
                                contactName: "",
                                street: "",
                                postalCode: "",
                                city: "",
                                country: "",
                                contactPhone: "",
                              }
                            });
                          }
                        }}
                      />
                      Delivery address same as billing address
                    </label>
                  )}
                  <AddressBlock
                    addr={edit ? form.deliveryAddress : offer.deliveryAddress}
                    emptyText="No delivery address set."
                  />
                </Section>
              </div>

              <div className="border border-gray-200 rounded-xl bg-white p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                  <Field label="Title" edit={edit} value={offer.title}>
                    <input
                      className={inputCls}
                      value={form.title}
                      onChange={(e) => patch({ title: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="Delivery Date"
                    edit={edit}
                    value={offer.deliveryTime}
                  >
                    <input
                      className={inputCls}
                      value={form.deliveryTime}
                      placeholder="e.g., 4–6 weeks"
                      onChange={(e) => patch({ deliveryTime: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="Payment method"
                    edit={edit}
                    value={offer.paymentMethod}
                  >
                    <select
                      className={inputCls}
                      value={form.paymentMethod || ""}
                      onChange={(e) => patch({ paymentMethod: e.target.value })}
                    >
                      <option value="">Select…</option>
                      {(dbPaymentMethods.length > 0 ? dbPaymentMethods.map((pm: any) => pm.name) : PAYMENT_METHODS).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="Shipping method"
                    edit={edit}
                    value={offer.shippingMethod}
                  >
                    <select
                      className={inputCls}
                      value={form.shippingMethod || ""}
                      onChange={(e) =>
                        patch({ shippingMethod: e.target.value })
                      }
                    >
                      <option value="">Select…</option>
                      {(dbShippingMethods.length > 0 ? dbShippingMethods.map((sm: any) => sm.name) : SHIPPING_METHODS).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="Payment terms"
                    edit={edit}
                    value={offer.paymentTerms}
                  >
                    <input
                      className={inputCls}
                      value={form.paymentTerms}
                      placeholder="e.g., 30 days net"
                      onChange={(e) => patch({ paymentTerms: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
              {/* Source */}
              {/* {(offer.inquirySnapshot || offer.itemSnapshot) && (
                <Section
                  title="Source"
                  icon={<LinkIcon className="h-4 w-4 text-gray-500" />}
                >
                  {offer.inquirySnapshot && (
                    <div className="text-sm text-gray-700">
                      <div className="font-medium text-gray-900">
                        {offer.inquirySnapshot.name}
                        {offer.inquirySnapshot.referenceNumber && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({offer.inquirySnapshot.referenceNumber})
                          </span>
                        )}
                      </div>
                      {offer.inquirySnapshot.description && (
                        <div className="text-gray-600">
                          {offer.inquirySnapshot.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {offer.inquirySnapshot.isAssembly
                          ? "Assembly"
                          : "Standard"}{" "}
                        · {offer.inquirySnapshot.requestsCount || 0} items ·
                        Created {formatDate(offer.inquirySnapshot.createdAt)}
                      </div>
                    </div>
                  )}
                  {offer.itemSnapshot && (
                    <div className="text-sm text-gray-700">
                      <div className="font-medium text-gray-900">
                        {offer.itemSnapshot.itemName}
                        {offer.itemSnapshot.ean && (
                          <span className="ml-2 text-xs text-gray-500">
                            EAN {offer.itemSnapshot.ean}
                          </span>
                        )}
                      </div>
                      {offer.itemSnapshot.description && (
                        <div className="text-gray-600">
                          {offer.itemSnapshot.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        Item ID: {offer.itemSnapshot.id}
                      </div>
                    </div>
                  )}
                </Section>
              )} */}

              {/* PRICING — the focus */}
              <Section
                title="Pricing"
                icon={<CalculatorIcon className="h-4 w-4 text-gray-500" />}
                right={
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">
                        Unit pricing
                      </span>
                      <button
                        disabled={!edit}
                        onClick={() => toggleUnitPricing(!offer.useUnitPrices)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${offer.useUnitPrices ? "bg-green-500" : "bg-gray-300"
                          }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${offer.useUnitPrices
                            ? "translate-x-5"
                            : "translate-x-1"
                            }`}
                        />
                      </button>
                    </div>
                    {offer.useUnitPrices && (
                      <button
                        disabled={!edit}
                        onClick={() => setShowSettings((s) => !s)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
                      >
                        <CogIcon className="h-4 w-4" />
                        Settings
                      </button>
                    )}
                    <button
                      disabled={!edit}
                      onClick={() => setShowCopyPaste((s) => !s)}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
                    >
                      <ClipboardIcon className="h-4 w-4" />
                      Copy/paste
                    </button>
                  </div>
                }
              >
                {/* Delete-a-whole-column controls */}
                {edit && priceColumns.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Delete a pricing column (applies to every item)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {priceColumns.map((q) => (
                        <button
                          key={q}
                          onClick={() => deletePriceColumn(q)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-white border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-colors"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inline settings panel */}
                {showSettings && offer.useUnitPrices && (
                  <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Unit price decimals
                        </label>
                        <select
                          className={inputCls}
                          value={form.unitPriceDecimalPlaces}
                          onChange={(e) =>
                            patch({
                              unitPriceDecimalPlaces: parseInt(e.target.value),
                            })
                          }
                        >
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Total decimals
                        </label>
                        <select
                          className={inputCls}
                          value={form.totalPriceDecimalPlaces}
                          onChange={(e) =>
                            patch({
                              totalPriceDecimalPlaces: parseInt(e.target.value),
                            })
                          }
                        >
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Max columns
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          className={inputCls}
                          value={form.maxUnitPriceColumns}
                          onChange={(e) => {
                            const v = parseInt(e.target.value);
                            if (v > 10) {
                              toast.error("Max columns is 10.", errorStyles);
                              return;
                            }
                            patch({ maxUnitPriceColumns: isNaN(v) ? 0 : v });
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={saveSettings}
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save settings
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline copy/paste panel */}
                {showCopyPaste && (
                  <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-xs text-blue-900 mb-2">
                      One line per price level —{" "}
                      <em>
                        position, quantity,{" "}
                        {offer.useUnitPrices ? "unit price" : "price"}
                      </em>
                      . Example: <code>1, 1000, 4.500</code>
                    </p>
                    <textarea
                      rows={6}
                      value={copyPasteData}
                      onChange={(e) => setCopyPasteData(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono"
                      placeholder={
                        "1, 1000, 4.500\n1, 5000, 4.200\n2, 1000, 8.750"
                      }
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => {
                          setShowCopyPaste(false);
                          setCopyPasteData("");
                        }}
                        className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCopyPaste}
                        disabled={!copyPasteData.trim()}
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        Import prices
                      </button>
                    </div>
                  </div>
                )}

                {/* Line items + their price tables */}
                <div className="space-y-4">
                  {visibleLineItems.length === 0 && (
                    <div className="text-center py-6 text-sm text-gray-500">
                      No line items yet.
                    </div>
                  )}

                  {visibleLineItems.map((item: any) => {
                    const activePrice = getActivePrice(
                      item,
                      offer.useUnitPrices,
                    );
                    const activeType = getActivePriceType(
                      item,
                      offer.useUnitPrices,
                    );
                    const usesUnit = offerUsesUnitPrices(offer);

                    return (
                      <div
                        key={item.id}
                        className="p-4 border border-gray-200 rounded-lg bg-white"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-medium text-gray-900">
                              {item.position}. {item.itemName}
                            </div>
                            {item.description && (
                              <div className="text-sm text-gray-600 mt-0.5">
                                {item.description}
                              </div>
                            )}
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <div className="text-lg font-bold text-gray-900">
                              {formatCurrency(
                                calculateLineItemTotal(
                                  item,
                                  offer.useUnitPrices,
                                ) || 0,
                                offer.currency,
                              )}
                            </div>
                            {activePrice && (
                              <div className="text-[11px] text-gray-500">
                                Active:{" "}
                                {activeType === "unit"
                                  ? "Unit price"
                                  : "Quantity price"}
                              </div>
                            )}
                            {/* Remove-item button — always available in edit */}
                            {edit && (
                              <button
                                onClick={() => removeLineItem(item.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-lg transition-colors"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                                Remove item
                              </button>
                            )}
                          </div>
                        </div>

                        {/* UNIT PRICES */}
                        {usesUnit ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900">
                                Unit prices ({offer.unitPriceDecimalPlaces || 3}{" "}
                                dp)
                              </h4>
                              {edit && (
                                <button
                                  onClick={() => addUnitPriceRow(item.id)}
                                  className="px-2.5 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
                                >
                                  <PlusIcon className="h-3.5 w-3.5" />
                                  Add unit price
                                </button>
                              )}
                            </div>
                            {item.unitPrices?.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                                        Quantity
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                                        Unit price
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                                        Total
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                                        Active
                                      </th>
                                      {edit && <th className="px-3 py-2" />}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {item.unitPrices.map(
                                      (up: UnitPrice, idx: number) => (
                                        <tr
                                          key={up.id}
                                          className="hover:bg-gray-50"
                                        >
                                          <td className="px-3 py-2">
                                            {edit ? (
                                              <input
                                                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                                                value={up.quantity}
                                                onChange={(e) =>
                                                  updateUnitPriceRow(
                                                    item.id,
                                                    up.id,
                                                    {
                                                      quantity: e.target.value,
                                                      totalPrice:
                                                        calculateUnitPriceTotal(
                                                          e.target.value,
                                                          up.unitPrice,
                                                          offer.totalPriceDecimalPlaces ||
                                                          2,
                                                        ),
                                                    },
                                                  )
                                                }
                                              />
                                            ) : (
                                              <span>{up.quantity} pcs</span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2">
                                            {edit ? (
                                              <div className="flex items-center gap-1">
                                                <span className="text-gray-500">
                                                  {offer.currency}
                                                </span>
                                                <input
                                                  type="number"
                                                  step={
                                                    offer.unitPriceDecimalPlaces ===
                                                      4
                                                      ? "0.0001"
                                                      : offer.unitPriceDecimalPlaces ===
                                                        2
                                                        ? "0.01"
                                                        : "0.001"
                                                  }
                                                  className="w-28 px-2 py-1 text-sm border border-gray-300 rounded"
                                                  value={up.unitPrice}
                                                  onChange={(e) =>
                                                    updateUnitPriceRow(
                                                      item.id,
                                                      up.id,
                                                      {
                                                        unitPrice: parseFloat(
                                                          e.target.value,
                                                        ),
                                                        totalPrice:
                                                          calculateUnitPriceTotal(
                                                            up.quantity,
                                                            parseFloat(
                                                              e.target.value,
                                                            ),
                                                            offer.totalPriceDecimalPlaces ||
                                                            2,
                                                          ),
                                                      },
                                                    )
                                                  }
                                                />
                                              </div>
                                            ) : (
                                              <span>
                                                {formatUnitPriceForOffer(
                                                  up.unitPrice,
                                                  offer,
                                                )}
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 font-medium">
                                            {formatTotalPrice(up.totalPrice)}
                                          </td>
                                          <td className="px-3 py-2">
                                            {up.isActive ? (
                                              <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                            ) : edit ? (
                                              <input
                                                type="radio"
                                                name={`active-unit-${item.id}`}
                                                checked={up.isActive}
                                                onChange={() =>
                                                  setActive(
                                                    item.id,
                                                    "unit",
                                                    idx,
                                                  )
                                                }
                                                className="h-4 w-4 text-gray-600"
                                              />
                                            ) : (
                                              <span className="text-gray-300">
                                                —
                                              </span>
                                            )}
                                          </td>
                                          {edit && (
                                            <td className="px-3 py-2 text-right">
                                              <button
                                                onClick={() =>
                                                  deleteUnitPriceRow(
                                                    item.id,
                                                    up.id,
                                                  )
                                                }
                                                className="text-rose-600 hover:text-rose-800 text-xs"
                                              >
                                                Delete
                                              </button>
                                            </td>
                                          )}
                                        </tr>
                                      ),
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-center py-3 text-sm text-gray-500">
                                No unit prices yet.
                              </div>
                            )}
                          </div>
                        ) : (
                          /* QUANTITY PRICES */
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900">
                                Quantity-based prices
                              </h4>
                              {edit && (
                                <button
                                  onClick={() => addQuantityLevel(item.id)}
                                  className="px-2.5 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                >
                                  Add price level
                                </button>
                              )}
                            </div>
                            {item.quantityPrices?.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                                        Quantity
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                                        Unit price
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                                        Total
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                                        Active
                                      </th>
                                      {edit && <th className="px-3 py-2" />}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {item.quantityPrices.map(
                                      (qp: any, idx: number) => (
                                        <tr
                                          key={idx}
                                          className="hover:bg-gray-50"
                                        >
                                          <td className="px-3 py-2">
                                            {edit ? (
                                              <input
                                                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                                                value={qp.quantity}
                                                onChange={(e) =>
                                                  updateQuantityPriceRow(
                                                    item.id,
                                                    idx,
                                                    {
                                                      quantity: e.target.value,
                                                      total: calculateLineTotal(
                                                        e.target.value,
                                                        qp.price,
                                                      ),
                                                    },
                                                  )
                                                }
                                              />
                                            ) : (
                                              <span>{qp.quantity} pcs</span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2">
                                            {edit ? (
                                              <div className="flex items-center gap-1">
                                                <span className="text-gray-500">
                                                  {offer.currency}
                                                </span>
                                                <input
                                                  type="number"
                                                  step="0.001"
                                                  className="w-28 px-2 py-1 text-sm border border-gray-300 rounded"
                                                  value={qp.price}
                                                  onChange={(e) =>
                                                    updateQuantityPriceRow(
                                                      item.id,
                                                      idx,
                                                      {
                                                        price: parseFloat(
                                                          e.target.value,
                                                        ),
                                                        total:
                                                          calculateLineTotal(
                                                            qp.quantity,
                                                            parseFloat(
                                                              e.target.value,
                                                            ),
                                                          ),
                                                      },
                                                    )
                                                  }
                                                />
                                              </div>
                                            ) : (
                                              <span>
                                                {formatCurrency(
                                                  qp.price,
                                                  offer.currency,
                                                )}
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 font-medium">
                                            {formatTotalPrice(qp.total)}
                                          </td>
                                          <td className="px-3 py-2">
                                            {qp.isActive ? (
                                              <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                            ) : edit ? (
                                              <input
                                                type="radio"
                                                name={`active-qty-${item.id}`}
                                                checked={qp.isActive}
                                                onChange={() =>
                                                  setActive(
                                                    item.id,
                                                    "quantity",
                                                    idx,
                                                  )
                                                }
                                                className="h-4 w-4 text-gray-600"
                                              />
                                            ) : (
                                              <span className="text-gray-300">
                                                —
                                              </span>
                                            )}
                                          </td>
                                          {edit && (
                                            <td className="px-3 py-2 text-right">
                                              <button
                                                onClick={() =>
                                                  deleteQuantityPriceRow(
                                                    item.id,
                                                    idx,
                                                  )
                                                }
                                                className="text-rose-600 hover:text-rose-800 text-xs"
                                              >
                                                Delete
                                              </button>
                                            </td>
                                          )}
                                        </tr>
                                      ),
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-center py-3 text-sm text-gray-500">
                                No quantity prices yet.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add line item (edit mode) */}
                  {edit && (
                    <div className="p-3 border border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          New item name
                        </label>
                        <input
                          className={inputCls}
                          value={newLine.itemName}
                          placeholder="e.g., Custom bracket"
                          onChange={(e) =>
                            setNewLine((n) => ({
                              ...n,
                              itemName: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="w-28">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Quantity
                        </label>
                        <input
                          className={inputCls}
                          value={newLine.baseQuantity}
                          onChange={(e) =>
                            setNewLine((n) => ({
                              ...n,
                              baseQuantity: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <button
                        onClick={addLineItem}
                        className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Add item
                      </button>
                    </div>
                  )}
                </div>
              </Section>

              {/* Totals */}
              <Section
                title="Totals"
                icon={<CalculatorIcon className="h-4 w-4 text-gray-500" />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Field
                      label="Discount %"
                      edit={edit}
                      value={`${offer.discountPercentage || 0}%`}
                    >
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className={inputCls}
                        value={form.discountPercentage}
                        onChange={(e) =>
                          patch({ discountPercentage: e.target.value })
                        }
                      />
                    </Field>
                    <Field
                      label="Shipping cost"
                      edit={edit}
                      value={formatCurrency(
                        offer.shippingCost || 0,
                        offer.currency,
                      )}
                    >
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={inputCls}
                        value={form.shippingCost}
                        onChange={(e) =>
                          patch({ shippingCost: e.target.value })
                        }
                      />
                    </Field>
                  </div>
                  <div className="max-w-sm ml-auto w-full space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">
                        {formatCurrency(offer.subtotal || 0, offer.currency)}
                      </span>
                    </div>
                    {offer.discountAmount > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Discount</span>
                        <span>
                          −
                          {formatCurrency(offer.discountAmount, offer.currency)}
                        </span>
                      </div>
                    )}
                    {offer.shippingCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shipping</span>
                        <span className="font-medium">
                          {formatCurrency(offer.shippingCost, offer.currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">VAT (19%)</span>
                      <span className="font-medium">
                        {formatCurrency(offer.taxAmount || 0, offer.currency)}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>
                        {formatCurrency(offer.totalAmount || 0, offer.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </Section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Section
                  title="Comment field"
                  icon={<PencilIcon className="h-4 w-4 text-gray-500" />}
                >
                  {edit ? (
                    <>
                      <textarea
                        rows={3}
                        className={inputCls}
                        value={form.notes}
                        placeholder="Shown to the customer on the offer."
                        onChange={(e) => patch({ notes: e.target.value })}
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        Printed on the offer PDF.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">
                      {offer.notes || "—"}
                    </p>
                  )}
                </Section>

                <Section
                  title="Comment intern"
                  icon={<PencilIcon className="h-4 w-4 text-gray-500" />}
                >
                  {edit ? (
                    <>
                      <textarea
                        rows={3}
                        className={inputCls}
                        value={form.internalNotes}
                        placeholder="Only visible to the team."
                        onChange={(e) =>
                          patch({ internalNotes: e.target.value })
                        }
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        Never shown to the customer.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">
                      {offer.internalNotes || "—"}
                    </p>
                  )}
                </Section>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
              <div>
                {edit && userRole === UserRole.ADMIN && (
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 text-sm text-red-700 bg-white border border-red-300/80 rounded-lg hover:bg-red-50 flex items-center gap-1 font-semibold"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete offer
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={edit ? handleCancelEdit : onClose}
                  className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {edit ? "Cancel" : "Close"}
                </button>
                {edit && (
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
          </>
        )}
      </div>
    </div >
  );
};

export default OfferDetailModal;
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
  ClipboardIcon,
  CalculatorIcon,
  LinkIcon,
  CubeIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import ViewEditToggle from "@/components/UI/ViewEditToggle";
import { CustomerSearchInput } from "@/components/UI/CustomerSearchInput";
import {
  getOfferById,
  updateOffer,
  deleteOffer,
  generateOfferPdf,
  downloadOfferPdf,
  updateLineItem,
  addPriceMatrixEntry,
  setActivePrice,
  pasteMatrixPrices,
  createOfferLineItem,
  deleteOfferLineItem,
  createOfferFromInquiry,
  createOfferFromItem,
  formatCurrency,
  getOfferStatuses,
  getOfferStatusColor,
  deletePriceColumn,
} from "@/api/offers";
import { getAllInquiries } from "@/api/inquiry";
import { getAllCustomers } from "@/api/customers";
import { getItems } from "@/api/items";
import { getAllPaymentMethods } from "@/api/payment_methods";
import { getAllShippingMethods } from "@/api/shipping_methods";
import { UserRole } from "@/utils/interfaces";
import { errorStyles, successStyles } from "@/utils/constants";
import { BASE_URL } from "@/utils/constants";
import { parseFlexibleNumber, formatMatrixPrice } from "@/utils/decimal";
import { PrinterIcon } from "lucide-react";

type PricingMode = "classic" | "matrix";

interface OfferDetailModalProps {
  isOpen: boolean;
  offerId: string | null;
  onClose: () => void;
  onChanged?: () => void;
  userRole?: UserRole;
}

type SourceType = "inquiry" | "item";

const inputCls =
  "w-full px-2.5 py-1.5 text-sm border border-gray-300/80 bg-white/70 rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default";

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

// --- Local pricing helpers (mode-aware, no dependency on legacy api helpers) --
const getActiveMatrixEntry = (item: any) =>
  (item?.priceMatrix || []).find((p: any) => p.isActive) || null;

const getLineItemTotal = (item: any, pricingMode: PricingMode): number => {
  if (pricingMode === "matrix") {
    const active = getActiveMatrixEntry(item);
    return active?.total ?? 0;
  }
  const qty = parseFlexibleNumber(item?.baseQuantity) ?? 1;
  const price = parseFlexibleNumber(item?.basePrice) ?? 0;
  return qty * price;
};

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
      className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-all ${
        selected
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

const PickerRow: React.FC<{
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  meta?: string;
}> = ({ selected, onClick, title, subtitle, meta }) => (
  <div
    onClick={onClick}
    className={`p-3 border rounded-lg cursor-pointer transition-all ${
      selected
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

/** Text input accepting both "," and "." as decimal separator. */
const DecimalInput: React.FC<{
  value: string | number | null | undefined;
  onCommit: (raw: string) => void;
  className?: string;
  placeholder?: string;
}> = ({ value, onCommit, className, placeholder }) => {
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
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
    />
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
  const displayInquiryNo =
    offer?.inquirySnapshot?.referenceNumber ||
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
      } catch (e) {
        console.error("Failed to load payment/shipping methods:", e);
      }
    })();
  }, [isOpen]);

  const isCreate = !offerId && !offer;

  const [form, setForm] = useState<any>({});
  const [showCopyPaste, setShowCopyPaste] = useState(false);
  const [copyPasteData, setCopyPasteData] = useState("");
  const [tierCount, setTierCount] = useState("3");
  const [newLine, setNewLine] = useState<{
    itemName: string;
    baseQuantity: string;
  }>({
    itemName: "",
    baseQuantity: "1",
  });

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
    pricingMode: "classic" as PricingMode,
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

  useEffect(() => {
    if (!isOpen) return;
    setEdit(false);
    setShowCopyPaste(false);
    setCopyPasteData("");
    if (offerId) {
      fetchOffer();
    } else {
      setOffer(null);
      resetCreatePicker();
    }
  }, [isOpen, offerId, fetchOffer]);

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
      pricingMode: "classic",
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
      taxRate: o.taxRate ?? 19,
      notes: o.notes || "",
      internalNotes: o.internalNotes || "",
      deliveryAddress: { ...(o.deliveryAddress || {}) },
      pricingMode: (o.pricingMode || "classic") as PricingMode,
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
    if (sourceType === "item")
      return !!filterCustomerId && selectedItems.length > 0;
    return false;
  };

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
        pricingMode: createForm.pricingMode,
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
        toast.success("Offer created successfully.", successStyles);
        setOffer(res.data);
        setForm(buildForm(res.data));
        setEdit(true);
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
        deliveryAddress: form.deliveryAddress,
        discountPercentage: parseFlexibleNumber(form.discountPercentage) ?? 0,
        shippingCost: parseFlexibleNumber(form.shippingCost) ?? 0,
        taxRate: parseFlexibleNumber(form.taxRate) ?? 19,
        pricingMode: form.pricingMode,
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

  const togglePricingMode = async (mode: PricingMode) => {
    try {
      await updateOffer(offer.id, { pricingMode: mode });
      patch({ pricingMode: mode });
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't switch pricing mode:", e);
    }
  };

  const setActive = async (lineItemId: string, idx: number) => {
    try {
      await setActivePrice(lineItemId, idx);
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

  const updateMatrixEntry = async (
    lineItemId: string,
    entryId: string,
    updates: { quantity?: string; price?: string; isActive?: boolean },
  ) => {
    const li = offer.lineItems.find((l: any) => l.id === lineItemId);
    if (!li) return;
    const updated = (li.priceMatrix || []).map((p: any) => {
      if (p.id !== entryId) return p;
      const quantity =
        updates.quantity !== undefined ? updates.quantity : p.quantity;
      const price =
        updates.price !== undefined
          ? updates.price.trim() === "." || updates.price.trim() === ""
            ? null
            : parseFlexibleNumber(updates.price)
          : p.price;
      return {
        ...p,
        quantity,
        price,
        isActive: updates.isActive ?? p.isActive,
      };
    });
    await persistLine(lineItemId, { priceMatrix: updated });
  };

  const deleteMatrixEntry = async (lineItemId: string, entryId: string) => {
    if (!window.confirm("Delete this price tier?")) return;
    const li = offer.lineItems.find((l: any) => l.id === lineItemId);
    if (!li) return;
    const updated = (li.priceMatrix || []).filter((p: any) => p.id !== entryId);
    await persistLine(lineItemId, { priceMatrix: updated });
  };

  const addMatrixEntry = async (lineItemId: string) => {
    try {
      await addPriceMatrixEntry(lineItemId, { quantity: "1000", price: null });
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't add a price tier:", e);
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
        baseQuantity: newLine.baseQuantity?.trim() || "1",
        basePrice: 0,
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

  const handlePasteMatrix = async () => {
    if (!copyPasteData.trim()) {
      toast.error("Paste the qty/price data first.", errorStyles);
      return;
    }
    const tiers = parseInt(tierCount, 10);
    if (!tiers || tiers < 1) {
      toast.error("Enter how many quantity tiers to expect.", errorStyles);
      return;
    }
    try {
      const res = await pasteMatrixPrices(offer.id, {
        data: copyPasteData,
        tierCount: tiers,
      });
      if (res.success) {
        toast.success(res.message || "Prices imported.", successStyles);
        setShowCopyPaste(false);
        setCopyPasteData("");
        await refreshLocal();
        onChanged?.();
      }
    } catch (e) {
      console.error("Couldn't import the pasted prices:", e);
      toast.error("Couldn't parse that paste — check the format.", errorStyles);
    }
  };

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
  const pricingMode: PricingMode = offer?.pricingMode || "classic";

  const priceTiers: string[] = (() => {
    if (pricingMode !== "matrix") return [];
    const set = new Set<string>();
    visibleLineItems.forEach((li: any) => {
      (li.priceMatrix || []).forEach((r: any) =>
        set.add(String(r.quantity).trim()),
      );
    });
    return Array.from(set).sort(
      (a, b) => (parseFlexibleNumber(a) || 0) - (parseFlexibleNumber(b) || 0),
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
                    className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all ${
                      sourceType === t.key
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pricing mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["classic", "matrix"] as PricingMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => cPatch({ pricingMode: m })}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        createForm.pricingMode === m
                          ? "border-primary bg-primary/5 text-primary font-semibold"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {m === "classic"
                        ? "Classic (1 qty · 1 price)"
                        : "Matrix (many qty/price)"}
                    </button>
                  ))}
                </div>
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
                    onChange={(id) => setFilterCustomerId(id)}
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
                          }));
                        }}
                        title={inq.name}
                        subtitle={`Customer: ${inq.customer?.companyName || "—"}`}
                        meta={`${inq.requests?.length || 0} items · ${inq.isAssembly ? "Assembly" : "Standard"}`}
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
                      {(dbPaymentMethods.length > 0
                        ? dbPaymentMethods.map((pm: any) => pm.name)
                        : PAYMENT_METHODS
                      ).map((m) => (
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
                      {(dbShippingMethods.length > 0
                        ? dbShippingMethods.map((sm: any) => sm.name)
                        : SHIPPING_METHODS
                      ).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

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
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${getOfferStatusColor(offer.status)}`}
                  >
                    {offer.status}
                  </span>
                  {sourceBadge()}
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">
                    {pricingMode === "matrix"
                      ? "Matrix pricing"
                      : "Classic pricing"}
                  </span>
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
              // header actions: handlePdf was defined but had no button — wire
              it up
              <div className="flex items-center gap-4 flex-shrink-0">
                <button
                  type="button"
                  onClick={handlePdf}
                  title="Generate / download PDF"
                  className="text-gray-500 hover:text-gray-700 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
                >
                  <PrinterIcon className="h-5 w-5" />
                </button>
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
                          form.deliveryAddress?.street ===
                            (offer.customerSnapshot?.address ||
                              offer.customerSnapshot?.street ||
                              "")
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            patch({
                              deliveryAddress: {
                                contactName:
                                  offer.customerSnapshot?.legalName ||
                                  offer.customerSnapshot?.companyName ||
                                  "",
                                street:
                                  offer.customerSnapshot?.address ||
                                  offer.customerSnapshot?.street ||
                                  "",
                                postalCode:
                                  offer.customerSnapshot?.postalCode || "",
                                city: offer.customerSnapshot?.city || "",
                                country: offer.customerSnapshot?.country || "",
                                contactPhone:
                                  offer.customerSnapshot?.contactPhoneNumber ||
                                  "",
                              },
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
                              },
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
                  <Field
                    label="Tax rate"
                    edit={edit}
                    value={`${offer.taxRate ?? 19}%`}
                  >
                    <DecimalInput
                      value={form.taxRate}
                      onCommit={(raw) =>
                        patch({ taxRate: parseFlexibleNumber(raw) ?? 19 })
                      }
                    />
                  </Field>
                </div>
              </div>

              {/* PRICING MODE */}
              <Section
                title="Pricing"
                icon={<CalculatorIcon className="h-4 w-4 text-gray-500" />}
                right={
                  <div className="flex items-center gap-2">
                    {(["classic", "matrix"] as PricingMode[]).map((m) => (
                      <button
                        key={m}
                        disabled={!edit}
                        onClick={() => togglePricingMode(m)}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-colors disabled:opacity-50 ${
                          pricingMode === m
                            ? "border-primary bg-primary/5 text-primary font-semibold"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {m === "classic" ? "Classic" : "Matrix"}
                      </button>
                    ))}
                    {pricingMode === "matrix" && (
                      <button
                        disabled={!edit}
                        onClick={() => setShowCopyPaste((s) => !s)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50 ml-2"
                      >
                        <ClipboardIcon className="h-4 w-4" />
                        Paste matrix
                      </button>
                    )}
                  </div>
                }
              >
                {pricingMode === "matrix" && edit && priceTiers.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Delete a tier (applies to every item)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {priceTiers.map((q) => (
                        <button
                          key={q}
                          onClick={async () => {
                            if (
                              !window.confirm(
                                `Delete the ${q} tier from all items?`,
                              )
                            )
                              return;
                            try {
                              await deletePriceColumn(offer.id, q);
                              await refreshLocal();
                              onChanged?.();
                            } catch (e) {
                              console.error("Couldn't delete the tier:", e);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-white border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-colors"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showCopyPaste && pricingMode === "matrix" && (
                  <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-xs text-blue-900 mb-2">
                      One value per line: optional label, then the quantity
                      tiers, then each item's prices in the same tier order (a
                      "." line between items is optional; a "." within a block
                      means "not calculated"). Applied to the line items below,
                      in order — add them first.
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-xs font-medium text-gray-700">
                        Quantity tiers
                      </label>
                      <input
                        type="number"
                        min={1}
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                        value={tierCount}
                        onChange={(e) => setTierCount(e.target.value)}
                      />
                    </div>
                    <textarea
                      rows={8}
                      value={copyPasteData}
                      onChange={(e) => setCopyPasteData(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono"
                      placeholder={
                        "Muster\n50\n100\n200\n20,00\n17,32\n16,57\n.\n34,00\n21,21\n20,3"
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
                        onClick={handlePasteMatrix}
                        disabled={!copyPasteData.trim()}
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        Import prices
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {visibleLineItems.length === 0 && (
                    <div className="text-center py-6 text-sm text-gray-500">
                      No line items yet.
                    </div>
                  )}

                  {visibleLineItems.map((item: any) => {
                    const total = getLineItemTotal(item, pricingMode);

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
                              {formatCurrency(total || 0, offer.currency)}
                            </div>
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

                        {pricingMode === "classic" ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Quantity
                              </label>
                              {edit ? (
                                <DecimalInput
                                  value={item.baseQuantity}
                                  onCommit={(raw) =>
                                    persistLine(item.id, {
                                      baseQuantity: raw.trim() || "1",
                                    })
                                  }
                                />
                              ) : (
                                <div className="text-sm text-gray-900">
                                  {item.baseQuantity || "1"} pcs
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Price / unit ({offer.currency})
                              </label>
                              {edit ? (
                                <DecimalInput
                                  value={item.basePrice}
                                  onCommit={(raw) => {
                                    const parsed = parseFlexibleNumber(raw);
                                    persistLine(item.id, {
                                      basePrice: parsed === null ? "0" : raw,
                                    });
                                  }}
                                />
                              ) : (
                                <div className="text-sm text-gray-900">
                                  {formatCurrency(
                                    item.basePrice || 0,
                                    offer.currency,
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900">
                                Price matrix (
                                {offer.unitPriceDecimalPlaces || 3} dp)
                              </h4>
                              {edit && (
                                <button
                                  onClick={() => addMatrixEntry(item.id)}
                                  className="px-2.5 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
                                >
                                  <PlusIcon className="h-3.5 w-3.5" />
                                  Add tier
                                </button>
                              )}
                            </div>
                            {item.priceMatrix?.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                                        Quantity
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                                        Price
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
                                    {item.priceMatrix.map(
                                      (p: any, idx: number) => (
                                        <tr
                                          key={p.id}
                                          className="hover:bg-gray-50"
                                        >
                                          <td className="px-3 py-2">
                                            {edit ? (
                                              <input
                                                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                                                defaultValue={p.quantity}
                                                onBlur={(e) =>
                                                  updateMatrixEntry(
                                                    item.id,
                                                    p.id,
                                                    {
                                                      quantity: e.target.value,
                                                    },
                                                  )
                                                }
                                              />
                                            ) : (
                                              <span>{p.quantity} pcs</span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2">
                                            {edit ? (
                                              <div className="flex items-center gap-1">
                                                <span className="text-gray-500">
                                                  {offer.currency}
                                                </span>
                                                <input
                                                  type="text"
                                                  inputMode="decimal"
                                                  className="w-28 px-2 py-1 text-sm border border-gray-300 rounded"
                                                  defaultValue={
                                                    p.price === null
                                                      ? "."
                                                      : String(p.price)
                                                  }
                                                  placeholder="."
                                                  onBlur={(e) =>
                                                    updateMatrixEntry(
                                                      item.id,
                                                      p.id,
                                                      { price: e.target.value },
                                                    )
                                                  }
                                                />
                                              </div>
                                            ) : (
                                              <span>
                                                {formatMatrixPrice(
                                                  p.price,
                                                  offer.unitPriceDecimalPlaces ||
                                                    3,
                                                )}
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 font-medium">
                                            {p.total === null
                                              ? "."
                                              : formatCurrency(
                                                  p.total,
                                                  offer.currency,
                                                )}
                                          </td>
                                          <td className="px-3 py-2">
                                            {p.isActive ? (
                                              <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                            ) : edit && p.price !== null ? (
                                              <input
                                                type="radio"
                                                name={`active-${item.id}`}
                                                checked={p.isActive}
                                                onChange={() =>
                                                  setActive(item.id, idx)
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
                                                  deleteMatrixEntry(
                                                    item.id,
                                                    p.id,
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
                                No tiers yet — add one, or paste a matrix above.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

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
                      <DecimalInput
                        value={form.discountPercentage}
                        onCommit={(raw) => patch({ discountPercentage: raw })}
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
                      <DecimalInput
                        value={form.shippingCost}
                        onCommit={(raw) => patch({ shippingCost: raw })}
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
                      <span className="text-gray-600">
                        VAT ({offer.taxRate ?? 19}%)
                      </span>
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
    </div>
  );
};

export default OfferDetailModal;

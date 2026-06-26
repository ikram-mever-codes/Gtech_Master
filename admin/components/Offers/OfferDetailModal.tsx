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
import { formatDate, openOutlookWithOffer } from "@/utils/offers";
import { UserRole } from "@/utils/interfaces";
import { errorStyles } from "@/utils/constants";

interface OfferDetailModalProps {
  isOpen: boolean;
  offerId: string | null;
  onClose: () => void;
  /** Called after any change that should refresh the list behind the modal. */
  onChanged?: () => void;
  userRole?: UserRole;
}

const inputCls =
  "w-full px-2.5 py-1.5 text-sm border border-gray-300/80 bg-white/70 rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default";

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

export const OfferDetailModal: React.FC<OfferDetailModalProps> = ({
  isOpen,
  offerId,
  onClose,
  onChanged,
  userRole,
}) => {
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState(false);

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
      toast.error("Couldn't load the offer. Try again.", errorStyles);
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  useEffect(() => {
    if (!isOpen) return;
    setEdit(false);
    setShowSettings(false);
    setShowCopyPaste(false);
    setCopyPasteData("");
    fetchOffer();
  }, [isOpen, offerId, fetchOffer]);

  if (!isOpen) return null;

  function buildForm(o: any) {
    return {
      title: o.title || "",
      status: o.status,
      currency: o.currency,
      validUntil: o.validUntil,
      deliveryTime: o.deliveryTime || "",
      paymentTerms: o.paymentTerms || "",
      deliveryTerms: o.deliveryTerms || "",
      termsConditions: o.termsConditions || "",
      discountPercentage: o.discountPercentage ?? "",
      shippingCost: o.shippingCost ?? "",
      notes: o.notes || "",
      deliveryAddress: { ...(o.deliveryAddress || {}) },
      useUnitPrices: !!o.useUnitPrices,
      unitPriceDecimalPlaces: o.unitPriceDecimalPlaces || 3,
      totalPriceDecimalPlaces: o.totalPriceDecimalPlaces || 2,
      maxUnitPriceColumns: o.maxUnitPriceColumns || 3,
    };
  }

  const patch = (p: any) => setForm((f: any) => ({ ...f, ...p }));
  const patchDelivery = (p: any) =>
    setForm((f: any) => ({
      ...f,
      deliveryAddress: { ...f.deliveryAddress, ...p },
    }));

  const refreshLocal = async () => {
    const updated = await getOfferById(offer.id);
    if (updated.success) setOffer(updated.data);
  };

  // --- Save header/detail fields -------------------------------------------
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
        deliveryTerms: form.deliveryTerms,
        termsConditions: form.termsConditions,
        notes: form.notes,
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
        toast.success("Offer saved");
        await refreshLocal();
        setEdit(false);
        onChanged?.();
      }
    } catch (e) {
      console.error("Error saving offer:", e);
      toast.error("Couldn't save the offer.", errorStyles);
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
      toast.success("Offer deleted");
      onClose();
      onChanged?.();
    } catch (e) {
      console.error("Error deleting offer:", e);
      toast.error("Couldn't delete the offer.", errorStyles);
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
      toast.error("Couldn't generate the PDF.", errorStyles);
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
      toast.error("Couldn't switch pricing mode.", errorStyles);
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
      toast.success("Pricing settings saved");
      onChanged?.();
    } catch (e) {
      toast.error("Couldn't save settings.", errorStyles);
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
      toast.error("Couldn't set the active price.", errorStyles);
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
      toast.error("Couldn't add the price level.", errorStyles);
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
      toast.error("Couldn't add the item.", errorStyles);
    }
  };

  const removeLineItem = async (lineItemId: string) => {
    if (!window.confirm("Remove this line item?")) return;
    try {
      await deleteOfferLineItem(offer.id, lineItemId);
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      toast.error("Couldn't remove the item.", errorStyles);
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
        toast.success("Prices imported");
      }
    } catch (e) {
      toast.error("Couldn't import the pasted prices.", errorStyles);
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-5xl w-full max-h-[92vh] flex flex-col">
        {loading || !offer ? (
          <div className="p-6 py-24 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary" />
            <p className="mt-2 text-sm text-gray-500">Loading offer…</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0 select-none">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-gray-900 truncate">
                    Offer {offer.offerNumber}
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
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {offer.title}
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

            {/* Action bar */}
            <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap flex-shrink-0">
              <button
                onClick={() => openOutlookWithOffer(offer)}
                className="px-3 py-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-all flex items-center gap-1.5"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Send email
              </button>
              {offer.pdfGenerated ? (
                <>
                  <button
                    onClick={() =>
                      downloadOfferPdf(offer.id, offer.offerNumber)
                    }
                    className="px-3 py-2 text-sm text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-all flex items-center gap-1.5"
                  >
                    <DownloadCloudIcon className="h-4 w-4" />
                    Download PDF
                  </button>
                  <button
                    onClick={handlePdf}
                    className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-1.5"
                  >
                    <ArrowPathIcon className="h-4 w-4 text-gray-500" />
                    Regenerate PDF
                  </button>
                </>
              ) : (
                <button
                  onClick={handlePdf}
                  className="px-3 py-2 text-sm text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-all flex items-center gap-1.5"
                >
                  <PrinterIcon className="h-4 w-4" />
                  Generate PDF
                </button>
              )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Offer details */}
              <Section
                title="Offer details"
                icon={<PencilIcon className="h-4 w-4 text-gray-500" />}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                  <Field label="Title" edit={edit} value={offer.title}>
                    <input
                      className={inputCls}
                      value={form.title}
                      onChange={(e) => patch({ title: e.target.value })}
                    />
                  </Field>
                  <Field label="Status" edit={edit} value={offer.status}>
                    <select
                      className={inputCls}
                      value={form.status}
                      onChange={(e) => patch({ status: e.target.value })}
                    >
                      {getOfferStatuses().map((s: any) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Currency" edit={edit} value={offer.currency}>
                    <select
                      className={inputCls}
                      value={form.currency}
                      onChange={(e) => patch({ currency: e.target.value })}
                    >
                      {getAvailableCurrencies().map((c: any) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="Valid until"
                    edit={edit}
                    value={
                      offer.validUntil ? formatDate(offer.validUntil) : "—"
                    }
                  >
                    <input
                      type="date"
                      className={inputCls}
                      value={
                        form.validUntil
                          ? new Date(form.validUntil)
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        patch({ validUntil: new Date(e.target.value) })
                      }
                    />
                  </Field>
                  <Field
                    label="Delivery time"
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
                    label="Payment terms"
                    edit={edit}
                    value={offer.paymentTerms}
                  >
                    <input
                      className={inputCls}
                      value={form.paymentTerms}
                      onChange={(e) => patch({ paymentTerms: e.target.value })}
                    />
                  </Field>
                </div>
              </Section>

              {/* Customer + delivery */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Section
                  title="Customer"
                  icon={
                    <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
                  }
                >
                  <div className="space-y-1 text-sm text-gray-700">
                    <div className="font-medium text-gray-900">
                      {offer.customerSnapshot?.companyName}
                    </div>
                    {offer.customerSnapshot?.legalName && (
                      <div>{offer.customerSnapshot.legalName}</div>
                    )}
                    {offer.customerSnapshot?.address && (
                      <div>{offer.customerSnapshot.address}</div>
                    )}
                    {(offer.customerSnapshot?.postalCode ||
                      offer.customerSnapshot?.city) && (
                      <div>
                        {offer.customerSnapshot.postalCode}{" "}
                        {offer.customerSnapshot.city}
                      </div>
                    )}
                    {offer.customerSnapshot?.country && (
                      <div>{offer.customerSnapshot.country}</div>
                    )}
                    {offer.customerSnapshot?.vatId && (
                      <div className="text-gray-500">
                        VAT ID: {offer.customerSnapshot.vatId}
                      </div>
                    )}
                    <p className="text-[11px] text-gray-400 pt-1">
                      Snapshot taken when the offer was created.
                    </p>
                  </div>
                </Section>

                <Section
                  title="Delivery address"
                  icon={
                    <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
                  }
                >
                  {edit ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className={inputCls}
                        placeholder="Contact name"
                        value={form.deliveryAddress?.contactName || ""}
                        onChange={(e) =>
                          patchDelivery({ contactName: e.target.value })
                        }
                      />
                      <input
                        className={inputCls}
                        placeholder="Phone"
                        value={form.deliveryAddress?.contactPhone || ""}
                        onChange={(e) =>
                          patchDelivery({ contactPhone: e.target.value })
                        }
                      />
                      <input
                        className={`${inputCls} col-span-2`}
                        placeholder="Street"
                        value={form.deliveryAddress?.street || ""}
                        onChange={(e) =>
                          patchDelivery({ street: e.target.value })
                        }
                      />
                      <input
                        className={inputCls}
                        placeholder="Postal code"
                        value={form.deliveryAddress?.postalCode || ""}
                        onChange={(e) =>
                          patchDelivery({ postalCode: e.target.value })
                        }
                      />
                      <input
                        className={inputCls}
                        placeholder="City"
                        value={form.deliveryAddress?.city || ""}
                        onChange={(e) =>
                          patchDelivery({ city: e.target.value })
                        }
                      />
                      <input
                        className={`${inputCls} col-span-2`}
                        placeholder="Country"
                        value={form.deliveryAddress?.country || ""}
                        onChange={(e) =>
                          patchDelivery({ country: e.target.value })
                        }
                      />
                    </div>
                  ) : (
                    <div className="space-y-1 text-sm text-gray-700">
                      {offer.deliveryAddress?.contactName && (
                        <div className="font-medium text-gray-900">
                          {offer.deliveryAddress.contactName}
                        </div>
                      )}
                      {offer.deliveryAddress?.street && (
                        <div>{offer.deliveryAddress.street}</div>
                      )}
                      {(offer.deliveryAddress?.postalCode ||
                        offer.deliveryAddress?.city) && (
                        <div>
                          {offer.deliveryAddress.postalCode}{" "}
                          {offer.deliveryAddress.city}
                        </div>
                      )}
                      {offer.deliveryAddress?.country && (
                        <div>{offer.deliveryAddress.country}</div>
                      )}
                      {offer.deliveryAddress?.contactPhone && (
                        <div className="text-gray-500">
                          Phone: {offer.deliveryAddress.contactPhone}
                        </div>
                      )}
                      {!offer.deliveryAddress && (
                        <div className="text-gray-400">
                          No delivery address set.
                        </div>
                      )}
                    </div>
                  )}
                </Section>
              </div>

              {/* Source */}
              {(offer.inquirySnapshot || offer.itemSnapshot) && (
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
              )}

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
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                          offer.useUnitPrices ? "bg-green-500" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            offer.useUnitPrices
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
                            {edit && (
                              <button
                                onClick={() => removeLineItem(item.id)}
                                className="text-xs text-rose-600 hover:text-rose-800"
                              >
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

              {/* Notes */}
              <Section
                title="Notes"
                icon={<PencilIcon className="h-4 w-4 text-gray-500" />}
              >
                {edit ? (
                  <textarea
                    rows={3}
                    className={inputCls}
                    value={form.notes}
                    onChange={(e) => patch({ notes: e.target.value })}
                  />
                ) : (
                  <p className="text-sm text-gray-600">{offer.notes || "—"}</p>
                )}
              </Section>
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
    </div>
  );
};

export default OfferDetailModal;

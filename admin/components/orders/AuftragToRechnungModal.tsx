"use client";

import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { createRechnungFromAuftrag } from "@/api/rechnungen";
import { updateCustomerOrder, deleteCustomerOrder } from "@/api/customer_orders";
import { errorStyles, successStyles } from "@/utils/constants";
import { Loader2, Warehouse, ClipboardCheck, Check } from "lucide-react";

interface SelectedItemState {
  id: string;
  lineItemId: string;
  position: number;
  photo?: string;
  artNr?: string;
  itemName: string;
  hinweis?: string;
  mwst: number;
  max_qty: number;
  qty: number;
  price: number;
  selected: boolean;
  is_stock_item?: "Y" | "N" | string;
}

interface AuftragToRechnungModalProps {
  isOpen: boolean;
  onClose: () => void;
  auftrag: any;
  onSuccess: () => void;
  onEditAuftrag?: (auftrag: any) => void;
}

const WAREHOUSE_OPTIONS = [
  { value: "CN", label: "CN — China Warehouse (Default)" },
  { value: "EU", label: "EU — Europe Warehouse" },
];

const PAYMENT_METHODS = [
  "Kauf auf Rechnung",
  "Vorkasse (Prepayment)",
  "Überweisung (Bank transfer)",
  "PayPal",
  "Credit Card",
  "Nachnahme (Cash on delivery)",
];

const SHIPPING_METHODS = [
  "Bahnfracht + GLS",
  "angeliefert durch GTech",
  "Standard shipping",
  "Express shipping",
  "FedEx direkt",
  "DHL Express",
  "Pickup",
];

const inputCls =
  "w-full px-2.5 py-1 text-xs border border-gray-300 bg-white rounded focus:ring-2 focus:ring-emerald-500 font-medium";

const Field: React.FC<{
  label: string;
  value: any;
  highlightOrange?: boolean;
  isEdit?: boolean;
  children?: React.ReactNode;
}> = ({ label, value, highlightOrange, isEdit, children }) => (
  <div>
    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
      {label}
    </p>
    <div className="text-sm text-gray-900 break-words">
      {isEdit && children ? (
        children
      ) : (
        <div
          className={`${highlightOrange
            ? "bg-amber-100/90 border border-amber-400 text-amber-900 font-bold p-1 rounded inline-block min-w-[120px]"
            : ""
            }`}
        >
          {value || "—"}
        </div>
      )}
    </div>
  </div>
);

const Section: React.FC<{
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <section className="border border-gray-200 rounded-lg p-4 bg-white">
    <header className="flex items-center gap-2 pb-2 border-b border-gray-100 font-medium text-sm text-gray-900">
      {icon}
      <span>{title}</span>
    </header>
    <div className="pt-3">{children}</div>
  </section>
);

const formatDeCurrency = (val: number) => {
  const num = isNaN(val) || !isFinite(val) ? 0 : val;
  return `${num.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
};

const formatWeight = (kg: number): string =>
  `${(isNaN(kg) || !isFinite(kg) ? 0 : kg).toLocaleString("de-DE", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} kg`;

export default function AuftragToRechnungModal({
  isOpen,
  onClose,
  auftrag,
  onSuccess,
  onEditAuftrag,
}: AuftragToRechnungModalProps) {
  const [items, setItems] = useState<SelectedItemState[]>([]);
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [isDatePastOrEmpty, setIsDatePastOrEmpty] = useState(false);
  const [warehouse, setWarehouse] = useState<"CN" | "EU">("CN");

  // Inline Edit Mode state (matching OfferDetailModal)
  const [isEditingAuftrag, setIsEditingAuftrag] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editShippingMethod, setEditShippingMethod] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editPaymentTerms, setEditPaymentTerms] = useState("");
  const [savingAuftrag, setSavingAuftrag] = useState(false);
  const [deletingAuftrag, setDeletingAuftrag] = useState(false);

  // Editable Customer Address fields
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editStreet, setEditStreet] = useState("");
  const [editPostalCode, setEditPostalCode] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editCountry, setEditCountry] = useState("DE");
  const [editVatId, setEditVatId] = useState("");

  useEffect(() => {
    if (!isOpen || !auftrag) return;

    const sourceItems = auftrag.orderItems || auftrag.items || [];
    const mapped: SelectedItemState[] = sourceItems.map((it: any, index: number) => {
      const origQty = Number(it.quantity || it.qty) || 1;
      const itemPrice = Number(it.price || 0);
      const isStock =
        it.is_stock_item ||
        it.item?.is_stock_item ||
        it.sourceItem?.is_stock_item ||
        "N";

      return {
        id: String(it.id),
        lineItemId: String(it.id),
        position: index + 1,
        photo: it.photo || it.item?.photo || it.image,
        artNr: it.articleNumber || it.item?.articleNumber || it.ean || it.item?.ean || "—",
        itemName: it.itemName || it.item_name || it.item?.item_name || "Line Item",
        hinweis: it.notes || it.remark_de || it.description || "—",
        mwst: Number(it.taxRate || auftrag.tax_rate || 19),
        max_qty: origQty,
        qty: origQty,
        price: itemPrice,
        selected: true,
        is_stock_item: isStock,
      };
    });

    setItems(mapped);
    setNotes(auftrag.notes || auftrag.comment || "");
    setInternalNotes(auftrag.internalNotes || auftrag.internal_notes || "");

    setEditTitle(auftrag.title || auftrag.comment || auftrag.offer_id || "");
    setEditShippingMethod(auftrag.shippingMethod || auftrag.shipping_method || "angeliefert durch GTech");
    setEditPaymentMethod(auftrag.paymentMethod || auftrag.payment_method || "Kauf auf Rechnung");
    setEditPaymentTerms(auftrag.paymentTerms || auftrag.payment_terms || "30 days net");

    // Populate Customer Address State
    const cust = auftrag.customerSnapshot || auftrag.customer || {};
    setEditCompanyName(cust.companyName || cust.name || auftrag.customer_name || "");
    setEditStreet(cust.address || cust.street || cust.addressLine1 || "");
    setEditPostalCode(cust.postalCode || "37079");
    setEditCity(cust.city || "Göttingen");
    setEditCountry(cust.country || "DE");
    setEditVatId(cust.vatId || cust.vatTaxId || cust.taxNumber || "");

    // Delivery date evaluation logic
    const todayStr = new Date().toISOString().split("T")[0];
    const rawDelivery = auftrag.deliveryTime || auftrag.delivery_date || auftrag.deliveryDate;

    if (!rawDelivery) {
      setDeliveryDate(todayStr);
      setIsDatePastOrEmpty(true);
    } else {
      const parsedDate = new Date(rawDelivery);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);

      if (isNaN(parsedDate.getTime()) || parsedDate < todayDate) {
        setDeliveryDate(todayStr);
        setIsDatePastOrEmpty(true);
      } else {
        setDeliveryDate(parsedDate.toISOString().split("T")[0]);
        setIsDatePastOrEmpty(false);
      }
    }

    setWarehouse("CN");
    setIsEditingAuftrag(false);
  }, [isOpen, auftrag]);

  if (!isOpen || !auftrag) return null;

  const hasStockItems = items.some((it) => it.is_stock_item === "Y");

  const toggleSelect = (lineItemId: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.lineItemId === lineItemId ? { ...it, selected: !it.selected } : it,
      ),
    );
  };

  const updateQty = (lineItemId: string, val: string) => {
    const parsed = parseFloat(val);
    setItems((prev) =>
      prev.map((it) => {
        if (it.lineItemId !== lineItemId) return it;
        const newQty = isNaN(parsed) ? 0 : Math.min(Math.max(0, parsed), it.max_qty);
        return { ...it, qty: newQty };
      }),
    );
  };

  const updateItemField = (lineItemId: string, field: keyof SelectedItemState, val: any) => {
    setItems((prev) =>
      prev.map((it) => (it.lineItemId === lineItemId ? { ...it, [field]: val } : it)),
    );
  };

  const removeItem = (lineItemId: string) => {
    setItems((prev) => prev.filter((it) => it.lineItemId !== lineItemId));
  };

  const selectedItems = items.filter((it) => it.selected && it.qty > 0);
  const subtotal = selectedItems.reduce((acc, it) => acc + it.qty * it.price, 0);
  const taxRate = Number(auftrag.tax_rate ?? 19);
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;

  // Display Customer snapshot
  const cust = auftrag.customerSnapshot || auftrag.customer || {};
  const companyName = editCompanyName || cust.companyName || cust.name || auftrag.customer_name || "Potis GmbH & Co. KG";
  const legalName = cust.legalName || cust.name || "";
  const addressStr = editStreet || cust.address || cust.street || cust.addressLine1 || "August-Spindler-Straße 4";
  const postalCity = `${editPostalCode || cust.postalCode || "37079"} ${editCity || cust.city || "Göttingen"}`.trim();

  // Delivery address
  const deliveryName = cust.deliveryAddressLine1 || cust.ship_to_full_address ? "Same as billing address" : "Same Delivery Address";

  const handleSaveAuftragEdits = async () => {
    try {
      setSavingAuftrag(true);
      const payload = {
        title: editTitle,
        shippingMethod: editShippingMethod,
        paymentMethod: editPaymentMethod,
        paymentTerms: editPaymentTerms,
        deliveryDate,
        notes,
        internalNotes,
        customerSnapshot: {
          ...cust,
          companyName: editCompanyName,
          street: editStreet,
          address: editStreet,
          postalCode: editPostalCode,
          city: editCity,
          country: editCountry,
          vatId: editVatId,
        },
      };
      await updateCustomerOrder(auftrag.id, payload);
      toast.success("Auftrag updated successfully!", successStyles);
      setIsEditingAuftrag(false);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to update Auftrag", errorStyles);
    } finally {
      setSavingAuftrag(false);
    }
  };

  const handleDeleteAuftrag = async () => {
    if (!window.confirm(`Are you sure you want to delete Auftrag ${auftrag.order_no}?`)) {
      return;
    }
    try {
      setDeletingAuftrag(true);
      await deleteCustomerOrder(auftrag.id);
      toast.success(`Auftrag ${auftrag.order_no} deleted successfully!`, successStyles);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to delete Auftrag", errorStyles);
    } finally {
      setDeletingAuftrag(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please select at least 1 item with quantity > 0", errorStyles);
      return;
    }

    try {
      setSubmitting(true);
      const payloadItems = selectedItems.map((it) => ({
        lineItemId: it.lineItemId,
        qty: it.qty,
        price: it.price,
        itemName: it.itemName,
      }));

      const res = await createRechnungFromAuftrag(auftrag.id, payloadItems, notes, {
        deliveryDate,
        warehouse: hasStockItems ? warehouse : undefined,
      } as any);

      if (res?.success) {
        toast.success(
          res.message || `Rechnung & Lieferschein created from ${auftrag.order_no}!`,
          successStyles,
        );
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to generate Rechnung & Lieferschein", errorStyles);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-gray-900 font-sans">

        {/* ── Top Header Bar (Matching OfferDetailModal) ── */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0 select-none">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-gray-900 truncate">
                Auftrag {auftrag.order_no}
              </span>
              {auftrag.offerNumber && (
                <span className="text-sm font-bold text-gray-600">
                  Angebot {auftrag.offerNumber}
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">
                Classic
              </span>
            </div>
            <h2 className="text-sm font-medium text-gray-500 truncate mt-0.5">
              {editTitle || auftrag.title || auftrag.comment || "Direction switch including motor supply cable"}
            </h2>
          </div>

          {/* Close X Button */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Main Body Content ── */}
        <div className="flex-1 bg-white overflow-y-auto p-6 space-y-5">

          {/* ── 4 Column Top Grid (Matching Angebot Layout) ── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">

            {/* Column 1: Customer & Delivery Address */}
            <div className="md:col-span-1 flex flex-col gap-2">
              {isEditingAuftrag ? (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={editCompanyName}
                    onChange={(e) => setEditCompanyName(e.target.value)}
                    placeholder="Company Name"
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={editStreet}
                    onChange={(e) => setEditStreet(e.target.value)}
                    placeholder="Street Address"
                    className={inputCls}
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={editPostalCode}
                      onChange={(e) => setEditPostalCode(e.target.value)}
                      placeholder="Postal Code"
                      className={inputCls}
                    />
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      placeholder="City"
                      className={inputCls}
                    />
                  </div>
                  <input
                    type="text"
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    placeholder="Country (DE)"
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={editVatId}
                    onChange={(e) => setEditVatId(e.target.value)}
                    placeholder="VAT ID (DE...)"
                    className={inputCls}
                  />
                </div>
              ) : (
                <div className="text-sm text-gray-800 space-y-0.5">
                  <div className="font-semibold">{companyName}</div>
                  {legalName && legalName !== companyName && <div>{legalName}</div>}
                  <div>{addressStr}</div>
                  <div>{postalCity}</div>
                  {editCountry && <div>{editCountry}</div>}
                  {editVatId && <div className="text-xs text-gray-500">{editVatId}</div>}
                </div>
              )}

              <div className="text-sm space-y-0.5 pt-1">
                <div className="font-bold text-gray-900 mb-0.5">Delivery:</div>
                {isEditingAuftrag ? (
                  <select className={inputCls}>
                    <option value="same">Same as billing address</option>
                  </select>
                ) : (
                  <div className="text-gray-700">{deliveryName}</div>
                )}
              </div>
            </div>

            {/* Column 2, 3, 4: Fields Grid */}
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">

              <Field
                label="TITLE"
                value={editTitle}
                isEdit={isEditingAuftrag}
              >
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field
                label="TAX PROFILE"
                value={`DE-VAT (${taxRate}%)`}
              />

              {/* Delivery Date */}
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                  DELIVERY DATE
                </p>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => {
                    setDeliveryDate(e.target.value);
                    setIsDatePastOrEmpty(false);
                  }}
                  className={`w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-emerald-500 font-bold transition-all ${isDatePastOrEmpty || !deliveryDate
                    ? "bg-amber-100/90 border-orange-400 text-amber-900 shadow-sm"
                    : "bg-white border-gray-300 text-gray-900"
                    }`}
                />
              </div>

              <Field
                label="PAYMENT METHOD"
                value={editPaymentMethod}
                isEdit={isEditingAuftrag}
              >
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                  className={inputCls}
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="PAYMENT DUE DAYS"
                value={editPaymentTerms}
                isEdit={isEditingAuftrag}
              >
                <input
                  type="text"
                  value={editPaymentTerms}
                  onChange={(e) => setEditPaymentTerms(e.target.value)}
                  placeholder="e.g., 30 days net"
                  className={inputCls}
                />
              </Field>

              <Field
                label="SHIPPING METHOD"
                value={editShippingMethod}
                isEdit={isEditingAuftrag}
              >
                <select
                  value={editShippingMethod}
                  onChange={(e) => setEditShippingMethod(e.target.value)}
                  className={inputCls}
                >
                  {SHIPPING_METHODS.map((sm) => (
                    <option key={sm} value={sm}>
                      {sm}
                    </option>
                  ))}
                </select>
              </Field>

            </div>
          </div>

          {/* ── Line Items Table (Classic Format) ── */}
          <div className="space-y-3">
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b border-gray-200 text-gray-600 text-xs">
                  <tr>
                    <th className="px-2 py-2 text-center font-semibold w-10">
                      ✓
                    </th>
                    <th className="px-2 py-2 text-left font-semibold w-10">
                      Pos
                    </th>
                    <th className="px-2 py-2 text-left font-semibold w-12">
                      Pic
                    </th>
                    <th className="px-2 py-2 text-left font-semibold w-28">
                      Art.-Nr.
                    </th>
                    <th className="px-2 py-2 text-left font-semibold">
                      Bezeichnung
                    </th>
                    <th className="px-2 py-2 text-left font-semibold w-36">
                      Hinweis
                    </th>
                    <th className="px-2 py-2 text-center font-semibold w-16">
                      MwSt.
                    </th>
                    <th className="px-2 py-2 text-right font-semibold w-24">
                      QTY Open
                    </th>
                    <th className="px-2 py-2 text-right font-semibold w-28">
                      Qty Delivered
                    </th>
                    <th className="px-2 py-2 text-right font-semibold w-28">
                      Netto-Preis
                    </th>
                    <th className="px-2 py-2 text-right font-semibold w-28">
                      Netto gesamt
                    </th>
                    {isEditingAuftrag && (
                      <th className="px-2 py-2 text-center font-semibold w-10">

                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={isEditingAuftrag ? 12 : 11} className="text-center py-6 text-sm text-gray-500">
                        No line items found.
                      </td>
                    </tr>
                  )}
                  {items.map((item) => {
                    const lineTotal = item.qty * item.price;
                    const isStock = item.is_stock_item === "Y";

                    const rowBgClass = isStock
                      ? "bg-[#e59837]/90 text-white font-medium"
                      : "bg-[#dff0d8] text-gray-900 font-medium";

                    return (
                      <tr key={item.id} className={`transition-colors ${rowBgClass}`}>

                        {/* Selection Checkbox */}
                        <td className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleSelect(item.lineItemId)}
                            className="w-4 h-4 rounded border-gray-400 text-orange-500 focus:ring-orange-400 cursor-pointer accent-orange-500"
                          />
                        </td>

                        {/* Pos */}
                        <td className="px-2 py-2">{item.position}</td>

                        {/* Pic */}
                        <td className="px-2 py-2">
                          <div className="w-8 h-8 rounded bg-white flex items-center justify-center border border-gray-200 overflow-hidden">
                            {item.photo ? (
                              <img
                                src={item.photo}
                                alt="thumb"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-gray-400 text-[10px]">—</span>
                            )}
                          </div>
                        </td>

                        {/* Art.-Nr. */}
                        <td className="px-2 py-2">
                          {isEditingAuftrag ? (
                            <input
                              type="text"
                              value={item.artNr}
                              onChange={(e) => updateItemField(item.lineItemId, "artNr", e.target.value)}
                              className="w-full px-1.5 py-0.5 text-xs border rounded text-gray-900 bg-white"
                            />
                          ) : (
                            item.artNr || "—"
                          )}
                        </td>

                        {/* Bezeichnung */}
                        <td className="px-2 py-2 font-bold">
                          {isEditingAuftrag ? (
                            <input
                              type="text"
                              value={item.itemName}
                              onChange={(e) => updateItemField(item.lineItemId, "itemName", e.target.value)}
                              className="w-full px-1.5 py-0.5 text-xs border rounded text-gray-900 bg-white font-bold"
                            />
                          ) : (
                            item.itemName
                          )}
                        </td>

                        {/* Hinweis */}
                        <td className="px-2 py-2">
                          {isEditingAuftrag ? (
                            <input
                              type="text"
                              value={item.hinweis}
                              onChange={(e) => updateItemField(item.lineItemId, "hinweis", e.target.value)}
                              className="w-full px-1.5 py-0.5 text-xs border rounded text-gray-900 bg-white"
                              placeholder="Remark..."
                            />
                          ) : (
                            item.hinweis || "—"
                          )}
                        </td>

                        {/* MwSt. */}
                        <td className="px-2 py-2 text-center">{item.mwst}%</td>

                        {/* QTY Open */}
                        <td className="px-2 py-2 text-right font-bold">
                          {isEditingAuftrag ? (
                            <input
                              type="number"
                              value={item.max_qty}
                              onChange={(e) => updateItemField(item.lineItemId, "max_qty", Number(e.target.value) || 0)}
                              className="w-16 px-1 py-0.5 text-xs text-right border rounded text-gray-900 bg-white font-bold"
                            />
                          ) : (
                            item.max_qty
                          )}
                        </td>

                        {/* Qty Delivered */}
                        <td className="px-2 py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            max={item.max_qty}
                            step="any"
                            disabled={!item.selected}
                            value={item.qty}
                            onChange={(e) => updateQty(item.lineItemId, e.target.value)}
                            className="w-20 px-1.5 py-1 text-right border border-orange-400 bg-amber-100 font-bold text-gray-900 rounded focus:ring-2 focus:ring-orange-500 shadow-sm"
                          />
                        </td>

                        {/* Netto-Preis */}
                        <td className="px-2 py-2 text-right">
                          {isEditingAuftrag ? (
                            <input
                              type="number"
                              step="any"
                              value={item.price}
                              onChange={(e) => updateItemField(item.lineItemId, "price", Number(e.target.value) || 0)}
                              className="w-20 px-1 py-0.5 text-xs text-right border rounded text-gray-900 bg-white font-bold"
                            />
                          ) : (
                            formatDeCurrency(item.price)
                          )}
                        </td>

                        {/* Netto gesamt */}
                        <td className="px-2 py-2 text-right font-bold">
                          {formatDeCurrency(lineTotal)}
                        </td>

                        {/* Trash delete icon in edit mode */}
                        {isEditingAuftrag && (
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(item.lineItemId)}
                              className="text-red-500 hover:text-red-700 transition p-1"
                              title="Remove item"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Weights & Totals Section ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field
                label="NET WEIGHT (ITEMS)"
                value={formatWeight(10)}
              />
              <Field
                label="EXTRA WEIGHT"
                value={formatWeight(0)}
              />
              <Field
                label="TOTAL WEIGHT"
                value={formatWeight(10)}
              />
            </div>

            <div className="max-w-sm ml-auto w-full space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium text-gray-900">
                  {formatDeCurrency(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>VAT ({taxRate}%)</span>
                <span className="font-medium text-gray-900">
                  {formatDeCurrency(taxAmount)}
                </span>
              </div>
              <div className="border-t border-gray-900 pt-2 flex justify-between font-bold text-lg text-gray-900">
                <span>Total</span>
                <span>{formatDeCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* ── Comment Fields ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Section
              title="Comment intern"
              icon={<PencilIcon className="h-4 w-4 text-gray-500" />}
            >
              <textarea
                rows={2}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Internal team notes..."
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-400"
              />
            </Section>
            <Section
              title="Comment extern"
              icon={<PencilIcon className="h-4 w-4 text-gray-500" />}
            >
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes shown on invoice..."
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-400"
              />
            </Section>
          </div>

          {/* ── Warehouse Selector (If Stock Items Exist) ── */}
          {hasStockItems && (
            <div className="p-3 border border-amber-400 bg-amber-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <Warehouse className="w-4 h-4 text-orange-600" />
                <span>Stock item(s) present — Choose Warehouse:</span>
              </div>
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value as "CN" | "EU")}
                className="px-3 py-1 text-sm font-bold border border-orange-400 bg-white rounded text-gray-900 focus:ring-2 focus:ring-orange-500"
              >
                {WAREHOUSE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0 bg-gray-50">

          {/* Edit Auftrag Button (Bottom Left) */}
          <div>
            <button
              type="button"
              onClick={() => setIsEditingAuftrag((prev) => !prev)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg border transition flex items-center gap-1.5 shadow-sm ${isEditingAuftrag
                ? "bg-amber-50 border-amber-400 text-amber-900 hover:bg-amber-100"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
            >
              <PencilIcon className="h-4 w-4 text-gray-500" />
              {isEditingAuftrag ? "Cancel Edit Mode" : "Edit Auftrag"}
            </button>
          </div>

          {/* Action Buttons: Cancel / Save changes / Generate */}
          <div className="flex gap-2.5 items-center">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || savingAuftrag}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>

            {isEditingAuftrag ? (
              <button
                type="button"
                onClick={handleSaveAuftragEdits}
                disabled={savingAuftrag}
                className="px-5 py-2 text-sm font-bold bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-all"
              >
                {savingAuftrag ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}

                Save changes
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={selectedItems.length === 0 || submitting || !deliveryDate}
                className="px-5 py-2 text-sm font-bold bg-[#2F6B46] text-white rounded-lg hover:bg-[#255638] disabled:opacity-50 transition flex items-center gap-2 shadow-md"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="w-4 h-4" />
                    Generate Rechnung &amp; Lieferschein
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
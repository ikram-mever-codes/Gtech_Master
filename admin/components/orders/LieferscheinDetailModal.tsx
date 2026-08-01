"use client";

import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  PencilIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { Loader2, Package } from "lucide-react";
import { getRechnungById } from "@/api/rechnungen";
import { formatDate } from "@/utils/date";

const Field: React.FC<{
  label: string;
  value: any;
  highlightOrange?: boolean;
}> = ({ label, value, highlightOrange }) => (
  <div>
    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
      {label}
    </p>
    <div className="text-sm text-gray-900 break-words">
      <div
        className={`${highlightOrange
          ? "bg-amber-100/90 border border-amber-400 text-amber-900 font-bold p-1 rounded inline-block min-w-[120px]"
          : ""
          }`}
      >
        {value || "—"}
      </div>
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

interface LieferscheinDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lieferschein: any;
  onSuccess?: () => void;
}

export default function LieferscheinDetailModal({
  isOpen,
  onClose,
  lieferschein,
}: LieferscheinDetailModalProps) {
  const [detailData, setDetailData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDeliveryDate, setEditDeliveryDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    if (!isOpen || !lieferschein) return;
    setDetailData(null);
    setIsEditing(false);

    const hasItems =
      (lieferschein.items && lieferschein.items.length > 0) ||
      (lieferschein.lineItems && lieferschein.lineItems.length > 0);

    if (!hasItems) {
      setLoading(true);
      getRechnungById(lieferschein.id)
        .then((res: any) => {
          const d = res?.data || lieferschein;
          setDetailData(d);
          setEditDeliveryDate(d.delivery_date || d.deliveryDate || d.invoice_date || "");
          setEditNotes(d.notes || lieferschein.notes || "");
        })
        .catch(() => {
          setDetailData(lieferschein);
          setEditDeliveryDate(lieferschein.deliveryDate || lieferschein.date || "");
          setEditNotes(lieferschein.notes || "");
        })
        .finally(() => setLoading(false));
    } else {
      setDetailData(lieferschein);
      setEditDeliveryDate(lieferschein.deliveryDate || lieferschein.date || lieferschein.invoiceDate || "");
      setEditNotes(lieferschein.notes || "");
    }
  }, [isOpen, lieferschein]);

  if (!isOpen || !lieferschein) return null;

  const data = detailData || lieferschein;

  const invoiceItems: any[] =
    data.items || data.lineItems || lieferschein.items || [];

  const docNumber =
    data.invoiceNumber ||
    data.lieferscheinNumber ||
    lieferschein.invoiceNumber ||
    lieferschein.order_no ||
    lieferschein.id;

  const customer = data.customer || lieferschein.customer || {};
  const companyName =
    customer.company_name ||
    customer.companyName ||
    lieferschein.customerName ||
    lieferschein.bill_to ||
    lieferschein.customer_name ||
    "—";
  const legalName = customer.legalName || customer.name || "";
  const addressStr =
    customer.addressLine1 || customer.address || customer.street ||
    customer.bill_to_address || customer.ship_to_address || "—";
  const postalCode = customer.postalCode || "";
  const city = customer.city || lieferschein.city || "";
  const country = customer.country || lieferschein.country || "";
  const postalCity = `${postalCode} ${city}`.trim();
  const vatId = customer.taxNumber || customer.vatId || customer.tax_number || "";

  const deliveryDate =
    data.deliveryDate ||
    data.delivery_date ||
    lieferschein.deliveryDate ||
    lieferschein.invoiceDate ||
    "";

  const paymentMethod =
    data.paymentMethod ||
    lieferschein.paymentMethod ||
    customer.defaultPaymentMethod ||
    customer.paymentMethod ||
    "—";
  const shippingMethod =
    data.shippingMethod ||
    lieferschein.shippingMethod ||
    customer.defaultShippingMethod ||
    customer.shippingMethod ||
    "—";
  const title =
    data.title || lieferschein.title || lieferschein.notes || lieferschein.description || "";
  const notes = data.notes || lieferschein.notes || "";
  const shipTo =
    data.ship_to ||
    lieferschein.ship_to ||
    customer.ship_to_address ||
    customer.ship_to ||
    customer.deliveryAddressLine1 ||
    companyName;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-gray-900 font-sans">

        {/* ── Top Header Bar ── */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0 select-none">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-gray-900 truncate">
                Lieferschein {docNumber}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                Delivery Note
              </span>
            </div>
            <h2 className="text-sm font-medium text-gray-500 truncate mt-0.5">
              {title || companyName}
            </h2>
          </div>

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

        {/* ── Main Body ── */}
        <div className="flex-1 bg-white overflow-y-auto p-6 space-y-5">

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#8CC21B]" />
                <p className="text-xs text-gray-500">Loading Lieferschein details...</p>
              </div>
            </div>
          ) : (
            <>
              {/* ── 4 Column Top Grid ── */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">

                {/* Column 1: Customer & Delivery Address */}
                <div className="md:col-span-1 flex flex-col gap-2">
                  <div className="text-sm text-gray-800 space-y-0.5">
                    <div className="font-semibold">{companyName}</div>
                    {legalName && legalName !== companyName && (
                      <div>{legalName}</div>
                    )}
                    <div>{addressStr}</div>
                    {postalCity && <div>{postalCity}</div>}
                    {country && <div>{country}</div>}
                    {vatId && (
                      <div className="text-xs text-gray-500">{vatId}</div>
                    )}
                  </div>

                  <div className="text-sm space-y-0.5 pt-1">
                    <div className="font-bold text-gray-900 mb-0.5">Delivery:</div>
                    <div className="text-gray-700">{shipTo}</div>
                  </div>
                </div>

                {/* Column 2, 3, 4: Fields */}
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">

                  <Field
                    label="TITLE"
                    value={title || docNumber}
                  />

                  <Field
                    label="TAX PROFILE"
                    value={`DE-VAT (${data.taxRate || lieferschein.taxRate || data.tax_rate || 19}%)`}
                  />

                  {/* Delivery Date — editable in edit mode */}
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                      DELIVERY DATE
                    </p>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editDeliveryDate ? editDeliveryDate.split("T")[0] : ""}
                        onChange={(e) => setEditDeliveryDate(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-blue-400 rounded font-medium focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    ) : (
                      <div
                        className={`w-full px-2 py-1 text-sm border rounded font-bold ${
                          !editDeliveryDate && !deliveryDate
                            ? "bg-amber-100/90 border-orange-400 text-amber-900"
                            : "bg-white border-gray-300 text-gray-900"
                        }`}
                      >
                        {editDeliveryDate
                          ? formatDate(editDeliveryDate)
                          : deliveryDate
                          ? formatDate(deliveryDate)
                          : "—"}
                      </div>
                    )}
                  </div>

                  <Field
                    label="PAYMENT METHOD"
                    value={paymentMethod}
                  />

                  <Field
                    label="PAYMENT DUE DAYS"
                    value={data.paymentTerms || lieferschein.paymentTerms || "30 days net"}
                  />

                  <Field
                    label="SHIPPING METHOD"
                    value={shippingMethod}
                  />

                </div>
              </div>

              {/* ── Line Items Table — NO money/tax columns ── */}
              <div className="space-y-3">
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200 text-gray-600 text-xs">
                      <tr>
                        <th className="px-2 py-2 text-center font-semibold w-10">
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
                        <th className="px-2 py-2 text-right font-semibold w-24">
                          Menge
                        </th>
                        <th className="px-2 py-2 text-left font-semibold w-48">
                          Hinweis / Remark
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoiceItems.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center py-8 text-sm text-gray-500"
                          >
                            <Package className="w-7 h-7 mx-auto mb-2 text-gray-300" />
                            No line items found.
                          </td>
                        </tr>
                      )}
                      {invoiceItems.map((item: any, idx: number) => {
                        const qty = Number(item.quantity || item.qty || 1);
                        const articleNumber =
                          item.item_no_de ||
                          item.itemNo ||
                          item.articleNumber ||
                          item.artNr ||
                          item.ean ||
                          "—";
                        const itemName =
                          item.item_name ||
                          item.description ||
                          item.itemName ||
                          "Line Item";
                        const remark =
                          item.remark ||
                          item.remark_de ||
                          item.notes ||
                          item.hinweis ||
                          "—";
                        const photo = item.photo || item.image || null;

                        return (
                          <tr
                            key={item.id || idx}
                            className="bg-[#dff0d8] text-gray-900 font-medium transition-colors"
                          >
                            <td className="px-2 py-2 text-center">
                              {idx + 1}
                            </td>

                            <td className="px-2 py-2">
                              <div className="w-8 h-8 rounded bg-white flex items-center justify-center border border-gray-200 overflow-hidden">
                                {photo ? (
                                  <img
                                    src={photo}
                                    alt="thumb"
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <span className="text-gray-400 text-[10px]">
                                    —
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-2 py-2 text-xs">
                              {articleNumber}
                            </td>

                            <td className="px-2 py-2 font-bold">
                              {itemName}
                            </td>

                            <td className="px-2 py-2 text-right font-bold">
                              {qty}
                            </td>

                            <td className="px-2 py-2 text-xs text-gray-700 italic">
                              {remark}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {invoiceItems.length > 0 && (
                      <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                        <tr>
                          <td
                            colSpan={4}
                            className="px-2 py-2 text-xs font-bold text-gray-700"
                          >
                            Total Positions: {invoiceItems.length}
                          </td>
                          <td className="px-2 py-2 text-right text-xs font-bold text-gray-900">
                            {invoiceItems.reduce(
                              (s, it) =>
                                s + Number(it.quantity || it.qty || 1),
                              0,
                            )}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* ── Weights Section ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <Field
                  label="NET WEIGHT (ITEMS)"
                  value={`${(data.netWeightKg || 10).toLocaleString("de-DE", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`}
                />
                <Field
                  label="EXTRA WEIGHT"
                  value={`${(data.extraWeightKg || 0).toLocaleString("de-DE", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`}
                />
                <Field
                  label="TOTAL WEIGHT"
                  value={`${(data.totalWeightKg || 10).toLocaleString("de-DE", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`}
                />
              </div>

              {/* ── Comment Fields ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Section
                  title="Comment intern"
                  icon={<PencilIcon className="h-4 w-4 text-gray-500" />}
                >
                  <div className="text-sm text-gray-700 min-h-[40px]">
                    {lieferschein.internalNotes || data.internalNotes || lieferschein.remark || data.remark || "—"}
                  </div>
                </Section>
                <Section
                  title="Comment extern"
                  icon={<PencilIcon className="h-4 w-4 text-gray-500" />}
                >
                  {isEditing ? (
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={3}
                      className="w-full text-sm border border-blue-400 rounded p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="Notes / Bemerkung..."
                    />
                  ) : (
                    <div className="text-sm text-gray-700 min-h-[40px]">
                      {editNotes || notes || "—"}
                    </div>
                  )}
                </Section>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0 bg-gray-50">
          {/* Left: Edit / Save */}
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm font-medium transition-all"
              >
                <PencilIcon className="w-4 h-4" />
                Edit
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-sm font-medium transition-all"
              >
                <CheckIcon className="w-4 h-4" />
                Save
              </button>
            )}
          </div>

          {/* Right: Close */}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

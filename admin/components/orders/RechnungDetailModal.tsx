"use client";

import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  CheckBadgeIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { errorStyles, successStyles } from "@/utils/constants";
import {
  Loader2,
  FileText,
  CheckCircle,
  Euro,
  Building2,
  CalendarDays,
  Truck,
  CreditCard,
} from "lucide-react";
import { getRechnungById, deleteRechnung } from "@/api/rechnungen";
import { markInvoiceAsPaid, generateInvoicePdf, updateInvoice } from "@/api/invoice";
import { formatDate } from "@/utils/date";

const formatDeCurrency = (val: number) => {
  const num = isNaN(val) || !isFinite(val) ? 0 : val;
  return `${num.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
};

const getStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 border border-gray-300",
    sent: "bg-blue-100 text-blue-700 border border-blue-300",
    paid: "bg-emerald-100 text-emerald-700 border border-emerald-300",
    overdue: "bg-red-100 text-red-700 border border-red-300",
    cancelled: "bg-orange-100 text-orange-700 border border-orange-300",
  };
  return map[status] || "bg-gray-100 text-gray-700 border border-gray-300";
};


const Field: React.FC<{
  label: string;
  value: any;
  highlight?: boolean;
}> = ({ label, value, highlight }) => (
  <div>
    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
      {label}
    </p>
    <div
      className={`text-sm break-words ${highlight
        ? "bg-amber-100/90 border border-amber-400 text-amber-900 font-bold p-1 rounded inline-block min-w-[120px]"
        : "text-gray-900"
        }`}
    >
      {value || "—"}
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


interface RechnungDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  rechnung: any;
  onSuccess: () => void;
}

export default function RechnungDetailModal({
  isOpen,
  onClose,
  rechnung,
  onSuccess,
}: RechnungDetailModalProps) {
  const [detailData, setDetailData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [markingPaid, setMarkingPaid] = useState(false);
  const [deletingRechnung, setDeletingRechnung] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRemark, setEditRemark] = useState("");
  const [editFreightCost, setEditFreightCost] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!isOpen || !rechnung) return;

    setEditNotes(rechnung.notes || "");
    setEditDescription(rechnung.description || "");
    setEditRemark(rechnung.remark || "");
    setEditFreightCost(rechnung.freightCost?.toString() || "");
    setIsEditing(false);

    if (!rechnung.items || rechnung.items.length === 0) {
      setLoading(true);
      getRechnungById(rechnung.id)
        .then((res: any) => {
          if (res?.success && res?.data) setDetailData(res.data);
          else if (res?.data) setDetailData(res.data);
          else setDetailData(rechnung);
        })
        .catch(() => setDetailData(rechnung))
        .finally(() => setLoading(false));
    } else {
      setDetailData(rechnung);
    }
  }, [isOpen, rechnung]);

  if (!isOpen || !rechnung) return null;

  const data = detailData || rechnung;

  const invoiceItems: any[] = data.items || data.lineItems || rechnung.items || [];
  const customer = data.customer || rechnung.customer || rechnung.customerSnapshot || {};
  const companyName = customer.company_name || customer.companyName || customer.name || rechnung.bill_to || rechnung.customer_name || "—";
  const legalName = customer.legalName || customer.legal_name || customer.name || "";
  const email = customer.email || customer.contactEmail || "—";
  const phone = customer.phone || customer.contactPhoneNumber || "—";
  const vatId = customer.tax_number || customer.taxNumber || customer.vatId || customer.vatTaxId || "—";
  const addressLine1 = customer.bill_to_address || customer.addressLine1 || customer.address || customer.street || "—";
  const postalCode = customer.postalCode || customer.postal_code || "";
  const city = customer.city || "";
  const country = customer.country || "";
  const postalCity = `${postalCode} ${city}`.trim() || country || "—";

  const netTotal = Number(data.netTotal || rechnung.netTotal || 0);
  const taxAmount = Number(data.taxAmount || rechnung.taxAmount || 0);
  const grossTotal = Number(data.grossTotal || rechnung.grossTotal || 0);
  const paidAmount = Number(data.paidAmount || rechnung.paidAmount || 0);
  const outstandingAmount = Number(data.outstandingAmount || rechnung.outstandingAmount || 0);

  const invoiceNumber = data.invoiceNumber || rechnung.invoiceNumber || rechnung.id;
  const orderNumber = data.orderNumber || rechnung.orderNumber || "—";
  const invoiceDate = data.invoiceDate || rechnung.invoiceDate || "";
  const deliveryDate = data.deliveryDate || rechnung.deliveryDate || "";
  const paymentMethod =
    data.paymentMethod ||
    rechnung.paymentMethod ||
    customer.defaultPaymentMethod ||
    customer.paymentMethod ||
    "—";
  const shippingMethod =
    data.shippingMethod ||
    rechnung.shippingMethod ||
    customer.defaultShippingMethod ||
    customer.shippingMethod ||
    "—";
  const status = data.status || rechnung.status || "draft";
  const billTo = data.bill_to || rechnung.bill_to || companyName;
  const shipTo =
    data.ship_to ||
    rechnung.ship_to ||
    customer.ship_to_address ||
    customer.ship_to ||
    customer.deliveryAddressLine1 ||
    billTo;

  const handleMarkAsPaid = async () => {
    if (!window.confirm(`Mark Rechnung ${invoiceNumber} as paid?`)) return;
    try {
      setMarkingPaid(true);
      await markInvoiceAsPaid(rechnung.id);
      toast.success(`Rechnung ${invoiceNumber} marked as paid!`, successStyles);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark as paid", errorStyles);
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleDeleteRechnung = async () => {
    if (!window.confirm(`Delete Rechnung ${invoiceNumber}? This cannot be undone.`)) return;
    try {
      setDeletingRechnung(true);
      await deleteRechnung(rechnung.id);
      toast.success(`Rechnung ${invoiceNumber} deleted!`, successStyles);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete Rechnung", errorStyles);
    } finally {
      setDeletingRechnung(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      await generateInvoicePdf(rechnung.id);
      toast.success("PDF download started!", successStyles);
    } catch (err: any) {
      toast.error(err?.message || "Failed to download PDF", errorStyles);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSaveEdits = async () => {
    try {
      setSavingEdit(true);
      await updateInvoice({
        id: rechnung.id,
        notes: editNotes,
        description: editDescription,
        remark: editRemark,
        freightCost: editFreightCost ? Number(editFreightCost) : undefined,
      });
      toast.success("Rechnung updated!", successStyles);
      setIsEditing(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update Rechnung", errorStyles);
    } finally {
      setSavingEdit(false);
    }
  };

  const inputCls =
    "w-full px-2.5 py-1 text-xs border border-gray-300 bg-white rounded focus:ring-2 focus:ring-emerald-500 font-medium";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-gray-900 font-sans">

        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0 select-none">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="w-5 h-5 text-[#8CC21B]" />
              <span className="text-lg font-bold text-gray-900 truncate">
                Rechnung {invoiceNumber}
              </span>

            </div>
            <h2 className="text-sm font-medium text-gray-500 truncate mt-0.5">
              {companyName}
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

        <div className="flex-1 bg-white overflow-y-auto p-6 space-y-5">

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#8CC21B]" />
                <p className="text-xs text-gray-500">Loading Rechnung details...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
                <div className="md:col-span-1 flex flex-col gap-2">
                  <div className="text-sm text-gray-800 space-y-0.5">
                    <div className="font-semibold text-gray-900">{companyName}</div>
                    {addressLine1 !== "—" && <div>{addressLine1}</div>}
                    {postalCity && <div>{postalCity}</div>}
                    {email !== "—" && (
                      <div className="text-xs text-gray-500">{email}</div>
                    )}
                    {phone !== "—" && (
                      <div className="text-xs text-gray-500">{phone}</div>
                    )}
                    {vatId !== "—" && (
                      <div className="text-xs text-gray-500">VAT: {vatId}</div>
                    )}
                  </div>

                  <div className="text-sm space-y-0.5 pt-1">
                    <div className="font-bold text-gray-900 mb-0.5">
                      Bill To:
                    </div>
                    <div className="text-gray-700 text-xs">{billTo}</div>
                    <div className="font-bold text-gray-900 mt-1 mb-0.5">
                      Ship To:
                    </div>
                    <div className="text-gray-700 text-xs">{shipTo}</div>
                  </div>
                </div>
                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                  <Field
                    label="TITLE"
                    value={data.title || rechnung.title || rechnung.description || invoiceNumber}
                  />
                  <Field
                    label="TAX PROFILE"
                    value={`DE-VAT (${data.taxRate || rechnung.taxRate || 19}%)`}
                  />
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                      DELIVERY DATE
                    </p>
                    <div className="text-sm text-gray-900 font-medium">
                      {deliveryDate ? formatDate(deliveryDate) : "—"}
                    </div>
                  </div>
                  <Field
                    label="PAYMENT METHOD"
                    value={paymentMethod}
                  />
                  <Field
                    label="PAYMENT DUE DAYS"
                    value={data.paymentTerms || rechnung.paymentTerms || "30 days net"}
                  />
                  <Field
                    label="SHIPPING METHOD"
                    value={shippingMethod}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200 text-gray-600 text-xs">
                      <tr>
                        <th className="px-2 py-2 text-left font-semibold w-10">Pos</th>
                        <th className="px-2 py-2 text-left font-semibold w-12">Pic</th>
                        <th className="px-2 py-2 text-left font-semibold w-28">Art.-Nr.</th>
                        <th className="px-2 py-2 text-left font-semibold">Bezeichnung</th>
                        <th className="px-2 py-2 text-center font-semibold w-16">MwSt.</th>
                        <th className="px-2 py-2 text-right font-semibold w-24">Menge</th>
                        <th className="px-2 py-2 text-right font-semibold w-28">Netto-Preis</th>
                        <th className="px-2 py-2 text-right font-semibold w-28">Netto gesamt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoiceItems.length === 0 && (
                        <tr>
                          <td
                            colSpan={8}
                            className="text-center py-6 text-sm text-gray-500"
                          >
                            No line items found.
                          </td>
                        </tr>
                      )}
                      {invoiceItems.map((item: any, idx: number) => {
                        const qty = Number(item.quantity || item.qty || 1);
                        const unitPrice = Number(
                          item.unitPrice || item.price || item.netPrice || 0
                        );
                        const lineTotal = qty * unitPrice;
                        const taxRate = Number(item.taxRate || 19);
                        const articleNumber =
                          item.articleNumber ||
                          item.artNr ||
                          item.ean ||
                          "—";
                        const description =
                          item.description ||
                          item.itemName ||
                          item.item_name ||
                          "Line Item";
                        const photo = item.photo || item.image || null;

                        return (
                          <tr
                            key={item.id || idx}
                            className="bg-[#dff0d8] text-gray-900 font-medium transition-colors"
                          >
                            <td className="px-2 py-2">{idx + 1}</td>
                            <td className="px-2 py-2">
                              <div className="w-8 h-8 rounded bg-white flex items-center justify-center border border-gray-200 overflow-hidden">
                                {photo ? (
                                  <img
                                    src={photo}
                                    alt="thumb"
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <span className="text-gray-400 text-[10px]">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-xs">{articleNumber}</td>
                            <td className="px-2 py-2 font-bold">{description}</td>
                            <td className="px-2 py-2 text-center">{taxRate}%</td>
                            <td className="px-2 py-2 text-right font-bold">{qty}</td>
                            <td className="px-2 py-2 text-right">
                              {formatDeCurrency(unitPrice)}
                            </td>
                            <td className="px-2 py-2 text-right font-bold">
                              {formatDeCurrency(lineTotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                <div className="max-w-sm ml-auto w-full space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-900">
                      {formatDeCurrency(netTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>MwSt.</span>
                    <span className="font-medium text-gray-900">
                      {formatDeCurrency(taxAmount)}
                    </span>
                  </div>
                  <div className="border-t border-gray-900 pt-2 flex justify-between font-bold text-lg text-gray-900">
                    <span>Brutto (Total)</span>
                    <span>{formatDeCurrency(grossTotal)}</span>
                  </div>
                </div>
              </div>

              {/* ── Comment Fields ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Section
                  title="Comment intern"
                  icon={<PencilIcon className="h-4 w-4 text-gray-500" />}
                >
                  {isEditing ? (
                    <textarea
                      rows={2}
                      value={editRemark}
                      onChange={(e) => setEditRemark(e.target.value)}
                      placeholder="Internal team notes..."
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-400"
                    />
                  ) : (
                    <div className="text-sm text-gray-700 min-h-[40px]">
                      {rechnung.internalNotes || data.internalNotes || rechnung.remark || data.remark || "—"}
                    </div>
                  )}
                </Section>

                <Section
                  title="Comment extern"
                  icon={<PencilIcon className="h-4 w-4 text-gray-500" />}
                >
                  {isEditing ? (
                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Notes shown on invoice..."
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-400"
                    />
                  ) : (
                    <div className="text-sm text-gray-700 min-h-[40px]">
                      {rechnung.notes || data.notes || "—"}
                    </div>
                  )}
                </Section>
              </div>
            </>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0 bg-gray-50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (isEditing) handleSaveEdits();
                else setIsEditing(true);
              }}
              disabled={savingEdit}
              className={`px-4 py-2 text-sm font-semibold rounded-lg border transition flex items-center gap-1.5 shadow-sm ${isEditing
                ? "bg-[#8CC21B] text-white border-[#8CC21B] hover:bg-[#7ab318]"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
            >
              {savingEdit ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PencilIcon className="h-4 w-4" />
              )}
              {isEditing ? "Save Changes" : "Edit Rechnung"}
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel Edit
              </button>
            )}

            <button
              type="button"
              onClick={handleDeleteRechnung}
              disabled={deletingRechnung}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-red-300 text-red-600 bg-white hover:bg-red-50 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {deletingRechnung ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TrashIcon className="h-4 w-4" />
              )}
              Delete
            </button>
          </div>

          {/* Right: PDF Download & Mark as Paid */}
          <div className="flex gap-2.5 items-center">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-[#DC3545] text-[#DC3545] bg-white hover:bg-red-50 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {downloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <DocumentArrowDownIcon className="h-4 w-4" />
              )}
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
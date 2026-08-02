"use client";

import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { errorStyles, successStyles } from "@/utils/constants";
import { Loader2, FileText, LinkIcon } from "lucide-react";
import { getRechnungById, deleteRechnung } from "@/api/rechnungen";
import {
  markInvoiceAsPaid,
  generateInvoicePdf,
  updateInvoice,
} from "@/api/invoice";
import { formatDate } from "@/utils/date";

const formatDeCurrency = (val: number) => {
  const num = isNaN(val) || !isFinite(val) ? 0 : val;
  return `${num.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
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

/** Copied verbatim from AuftragPreviewModal — same address rendering. */
const AddressBlock: React.FC<{ addr: any; emptyText: string }> = ({
  addr,
  emptyText,
}) => {
  if (!addr) return <div className="text-sm text-gray-400">{emptyText}</div>;
  const countryCode = getCountryCode(addr.country);
  const isGermany = countryCode === "DE";
  const cityLine = `${addr.postalCode || ""} ${addr.city || ""}`.trim();
  const addressLine = [
    addr.address || addr.street,
    cityLine,
    !isGermany ? countryCode : "",
  ]
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

/** Copied verbatim from AuftragPreviewModal — same "same as billing" check. */
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

const Field: React.FC<{
  label: string;
  value: any;
}> = ({ label, value }) => (
  <div>
    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
      {label}
    </p>
    <div className="text-sm text-gray-900 break-words">{value || "—"}</div>
  </div>
);

const inputCls =
  "w-full px-2.5 py-1.5 text-sm border border-gray-300/80 bg-white/70 rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default";

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

  const invoiceItems: any[] =
    data.items || data.lineItems || rechnung.items || [];
  const customer =
    data.customer || rechnung.customer || rechnung.customerSnapshot || {};
  const companyName =
    customer.company_name ||
    customer.companyName ||
    customer.name ||
    rechnung.bill_to ||
    rechnung.customer_name ||
    "—";

  // Reshape into the same customerSnapshot-like object AddressBlock expects
  // in AuftragPreviewModal — no fields invented, just remapped.
  const billingAddr = {
    legalName: customer.legalName || customer.legal_name,
    companyName,
    contactName: customer.contactName || customer.contact_name,
    address:
      customer.bill_to_address ||
      customer.addressLine1 ||
      customer.address ||
      customer.street,
    postalCode: customer.postalCode || customer.postal_code,
    city: customer.city,
    country: customer.country,
    vatId:
      customer.tax_number ||
      customer.taxNumber ||
      customer.vatId ||
      customer.vatTaxId,
    contactPhone: customer.phone || customer.contactPhoneNumber,
  };

  const shipToRaw =
    data.ship_to || rechnung.ship_to || customer.ship_to_address || null;
  const deliveryAddr =
    shipToRaw && typeof shipToRaw === "object"
      ? shipToRaw
      : shipToRaw
        ? { street: shipToRaw }
        : null;

  const netTotal = Number(
    data.subtotal ??
      rechnung.subtotal ??
      data.netTotal ??
      rechnung.netTotal ??
      0,
  );
  const taxAmount = Number(
    data.tax_amount ??
      rechnung.tax_amount ??
      data.taxAmount ??
      rechnung.taxAmount ??
      0,
  );
  const grossTotal = Number(
    data.total_amount ??
      rechnung.total_amount ??
      data.grossTotal ??
      rechnung.grossTotal ??
      0,
  );
  const taxRate = Number(
    data.tax_rate ??
      rechnung.tax_rate ??
      data.taxRate ??
      rechnung.taxRate ??
      19,
  );

  const invoiceNumber =
    data.invoice_number ||
    rechnung.invoice_number ||
    data.invoiceNumber ||
    rechnung.invoiceNumber ||
    rechnung.id;

  const deliveryDate =
    data.delivery_date ||
    rechnung.delivery_date ||
    data.deliveryDate ||
    rechnung.deliveryDate ||
    "";

  const paymentMethod =
    data.payment_method ||
    rechnung.payment_method ||
    data.paymentMethod ||
    rechnung.paymentMethod ||
    customer.defaultPaymentMethod ||
    customer.paymentMethod ||
    "";
  const shippingMethod =
    data.shipping_method ||
    rechnung.shipping_method ||
    data.shippingMethod ||
    rechnung.shippingMethod ||
    customer.defaultShippingMethod ||
    customer.shippingMethod ||
    "";

  const displayTitle =
    data.title || rechnung.title || rechnung.description || invoiceNumber;

  const deliverySameAsBilling = isDeliverySameAsBilling(
    deliveryAddr,
    billingAddr,
  );

  const handleMarkAsPaid = async () => {
    if (!window.confirm(`Mark Rechnung ${invoiceNumber} as paid?`)) return;
    try {
      await markInvoiceAsPaid(rechnung.id);
      toast.success(`Rechnung ${invoiceNumber} marked as paid!`, successStyles);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark as paid", errorStyles);
    }
  };

  const handleDeleteRechnung = async () => {
    if (
      !window.confirm(
        `Delete Rechnung ${invoiceNumber}? This cannot be undone.`,
      )
    )
      return;
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0 select-none">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="w-5 h-5 text-[#8CC21B] shrink-0" />
              <p className="text-lg font-bold text-gray-900 truncate">
                Rechnung {invoiceNumber}
              </p>
            </div>
            <h2 className="text-sm font-medium text-gray-500 truncate mt-0.5">
              {displayTitle}
            </h2>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
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
                <p className="text-xs text-gray-500">
                  Loading Rechnung details...
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
                <div className="md:col-span-1 flex flex-col gap-3">
                  <div className="block mb-1">
                    <AddressBlock
                      addr={billingAddr}
                      emptyText="No customer snapshot."
                    />
                  </div>

                  <div className="block mb-1">
                    {!deliverySameAsBilling && (
                      <span className="text-sm font-bold text-gray-900">
                        Delivery:
                      </span>
                    )}
                    {deliverySameAsBilling ? (
                      <div className="text-sm text-gray-500">
                        Same Delivery Address
                      </div>
                    ) : (
                      <AddressBlock
                        addr={deliveryAddr}
                        emptyText="No delivery address set."
                      />
                    )}
                  </div>
                </div>

                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                  {isEditing ? (
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                        TITLE
                      </p>
                      <input
                        className={inputCls}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                    </div>
                  ) : (
                    <Field label="TITLE" value={displayTitle} />
                  )}
                  <Field label="TAX PROFILE" value={`DE-VAT (${taxRate}%)`} />
                  <Field
                    label="Delivery Date"
                    value={deliveryDate ? formatDate(deliveryDate) : ""}
                  />
                  <Field label="Payment method" value={paymentMethod} />
                  <Field
                    label="Payment terms"
                    value={
                      data.payment_terms ||
                      rechnung.payment_terms ||
                      data.paymentTerms ||
                      rechnung.paymentTerms ||
                      "30 days net"
                    }
                  />
                  <Field label="Shipping method" value={shippingMethod} />
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
                        <th className="px-2 py-2 text-center font-semibold text-gray-600 w-16">
                          MwSt.
                        </th>
                        <th className="px-2 py-2 text-right font-semibold text-gray-600 w-20">
                          Menge
                        </th>
                        <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28">
                          Netto-Preis
                        </th>
                        <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28">
                          Netto gesamt
                        </th>
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
                          item.unitPrice || item.price || item.netPrice || 0,
                        );
                        const lineTotal = qty * unitPrice;
                        const taxRate = Number(item.taxRate || 19);
                        const articleNumber =
                          item.articleNumber || item.artNr || item.ean || "—";
                        const description =
                          item.description ||
                          item.itemName ||
                          item.item_name ||
                          "Line Item";
                        const photo = item.photo || item.image || null;

                        return (
                          <tr key={item.id || idx}>
                            <td className="px-2 py-2 text-gray-500">
                              {idx + 1}
                            </td>
                            <td className="px-2 py-2">
                              <div className="w-9 h-9 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                                {photo ? (
                                  <img
                                    src={photo}
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
                            <td className="px-2 py-2">{articleNumber}</td>
                            <td className="px-2 py-2">{description}</td>
                            <td className="px-2 py-2 text-center text-gray-600">
                              {taxRate}%
                            </td>
                            <td className="px-2 py-2 text-right">{qty}</td>
                            <td className="px-2 py-2 text-right">
                              {formatDeCurrency(unitPrice)}
                            </td>
                            <td className="px-2 py-2 text-right font-medium">
                              {formatDeCurrency(lineTotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field
                    label="Net weight (items)"
                    value={`${(data.netWeightKg || 0).toLocaleString("de-DE", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`}
                  />
                  <Field
                    label="Extra weight"
                    value={`${(data.extraWeightKg || 0).toLocaleString("de-DE", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`}
                  />
                  <Field
                    label="Total weight"
                    value={`${(data.totalWeightKg || 0).toLocaleString("de-DE", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`}
                  />
                </div>
                <div className="max-w-sm ml-auto w-full space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">
                      {formatDeCurrency(netTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">MwSt.</span>
                    <span className="font-medium">
                      {formatDeCurrency(taxAmount)}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{formatDeCurrency(grossTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <div className="bg-white rounded-lg p-4 px-2 border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <LinkIcon className="h-4 w-4 text-gray-500" />
                    <h3 className="text-sm font-bold text-gray-900">
                      Linked documents
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500">
                    No linked documents yet.
                  </p>
                </div>
                <div className="bg-white rounded-lg px-2 p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <PencilIcon className="h-4 w-4 text-gray-500" />
                    <h3 className="text-sm font-bold text-gray-900">
                      Comment intern
                    </h3>
                  </div>
                  {isEditing ? (
                    <textarea
                      rows={3}
                      className={inputCls}
                      value={editRemark}
                      placeholder="Only visible to the team."
                      onChange={(e) => setEditRemark(e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">
                      {rechnung.internalNotes ||
                        data.internalNotes ||
                        rechnung.remark ||
                        data.remark ||
                        "—"}
                    </p>
                  )}
                </div>
                <div className="bg-white rounded-lg px-2 p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <PencilIcon className="h-4 w-4 text-gray-500" />
                    <h3 className="text-sm font-bold text-gray-900">
                      Comment extern
                    </h3>
                  </div>
                  {isEditing ? (
                    <textarea
                      rows={3}
                      className={inputCls}
                      value={editNotes}
                      placeholder="Shown to the customer."
                      onChange={(e) => setEditNotes(e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-gray-600">
                      {rechnung.notes || data.notes || "—"}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          <div>
            <button
              type="button"
              onClick={handleDeleteRechnung}
              disabled={deletingRechnung}
              className="px-4 py-2 text-sm text-red-700 bg-white border border-red-300/80 rounded-lg hover:bg-red-50 flex items-center gap-1 font-semibold disabled:opacity-50"
            >
              {deletingRechnung ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TrashIcon className="h-4 w-4" />
              )}
              Delete
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={isEditing ? () => setIsEditing(false) : onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {isEditing ? "Cancel" : "Close"}
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
            <button
              type="button"
              onClick={() => {
                if (isEditing) handleSaveEdits();
                else setIsEditing(true);
              }}
              disabled={savingEdit}
              className="px-4 py-2 text-sm bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] disabled:opacity-50"
            >
              {savingEdit
                ? "Saving…"
                : isEditing
                  ? "Save changes"
                  : "Edit Rechnung"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import {
  FileText,
  X,
  RefreshCw,
  Check,
  Loader2,
  Package,
  Scissors,
  DollarSign,
  CheckCircle,
} from "lucide-react";
import SpreadSheet from "@/components/UI/SpreadSheet";
import { formatDate } from "@/utils/date";
import { calculateInvoiceTotal } from "@/utils/invoice";

// Same shape as the `Invoice` interface in the original page.tsx.
export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  customer: {
    companyName: string;
    email: string;
    [k: string]: any;
  };
  bill_to?: string;
  ship_to?: string;
  cargo?: { id: number; cargo_no?: string } | null;
  cargoNo?: string;
  customItemCount?: number;
  customTotalQty?: number;
  grossTotal: number;
  description?: string;
  freightCost?: number | string;
  remark?: string;
  [k: string]: any;
}

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

interface InvoiceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedInvoice: Invoice | null;
  activeInvTab: string;
  actionLoading: Record<string, boolean>;
  setActionLoading: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  modalActiveTab: "taric" | "items";
  setModalActiveTab: (tab: "taric" | "items") => void;
  expandedStates: Record<
    string,
    { taric?: boolean; items?: boolean; data?: any; loading?: boolean }
  >;
  invoiceEditForm: { title: string; description: string; freightCost: string; remark: string };
  setInvoiceEditForm: React.Dispatch<
    React.SetStateAction<{
      title: string;
      description: string;
      freightCost: string;
      remark: string;
    }>
  >;
  onMarkAsPaid: (invoiceId: string) => void;
  onSaveInvoiceEdit: (invoiceId: string) => void;
  onDownloadPdf: (invoice: Invoice) => Promise<void>;
  expandedPriceItemId: string | null;
  setExpandedPriceItemId: (id: string | null) => void;
  editingPrice: number;
  setEditingPrice: (price: number) => void;
  onSetPrice: (itemId: string | number) => void;
  onOpenQtyModal: (item: any) => void;
  onOpenSplitModal: (item: any) => void;
  onOpenReassignModal: (item: any) => void;
  onOpenTaricModal: (group: any) => void;
}

// Verbatim port of the `showInvoiceDetailsModal` block from the original
// page.tsx — same markup, same class names, same conditional branches.
// Only the closed-over state/handlers became props.
const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  isOpen,
  onClose,
  selectedInvoice,
  activeInvTab,
  actionLoading,
  setActionLoading,
  modalActiveTab,
  setModalActiveTab,
  expandedStates,
  invoiceEditForm,
  setInvoiceEditForm,
  onMarkAsPaid,
  onSaveInvoiceEdit,
  onDownloadPdf,
  expandedPriceItemId,
  setExpandedPriceItemId,
  editingPrice,
  setEditingPrice,
  onSetPrice,
  onOpenQtyModal,
  onOpenSplitModal,
  onOpenReassignModal,
  onOpenTaricModal,
}) => {
  if (!isOpen || !selectedInvoice) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#8CC21B]" />
              Invoice Details
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              ID: {selectedInvoice.id}{" "}
              {selectedInvoice.invoiceNumber
                ? `| Invoice No: ${selectedInvoice.invoiceNumber}`
                : ""}
            </p>
            {(selectedInvoice.title || invoiceEditForm.title) && (
              <p className="text-xs font-bold text-gray-700 mt-1 flex items-center gap-1">
                <span className="text-gray-400 font-normal">Titel:</span>{" "}
                {selectedInvoice.title || invoiceEditForm.title}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-[4px] uppercase"
              style={getStatusColor(selectedInvoice.status)}
            >
              {selectedInvoice.status}
            </span>

            {activeInvTab === "rechnung" ? (
              <button
                onClick={() => onMarkAsPaid(selectedInvoice.id)}
                disabled={actionLoading[`paid-${selectedInvoice.id}`]}
                className="px-4 py-2 bg-[#059669] text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {actionLoading[`paid-${selectedInvoice.id}`] ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5" />
                )}
                VERIFY
              </button>
            ) : (
              <>
                <button
                  className="px-4 py-2 border border-[#DC3545] text-[#DC3545] text-xs font-bold rounded-lg flex items-center gap-1.5 hover:bg-[#DC3545]/10 transition-colors disabled:opacity-50"
                  title="Download PDF"
                  disabled={actionLoading[`pdf-${selectedInvoice.id}`]}
                  onClick={async () => {
                    try {
                      setActionLoading((prev) => ({
                        ...prev,
                        [`pdf-${selectedInvoice.id}`]: true,
                      }));
                      await onDownloadPdf(selectedInvoice);
                    } catch (error) {
                      console.error("PDF Generation failed", error);
                    } finally {
                      setActionLoading((prev) => ({
                        ...prev,
                        [`pdf-${selectedInvoice.id}`]: false,
                      }));
                    }
                  }}
                >
                  {actionLoading[`pdf-${selectedInvoice.id}`] ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  Download PDF
                </button>
                <button className="px-4 py-2 bg-[#F15A24] text-white text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-[#D9481B] transition-colors">
                  <RefreshCw className="w-3 h-3" /> Ship
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-6 flex-1 text-black">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                Customer
              </span>
              <span className="text-sm font-semibold text-gray-800 block mt-1">
                {selectedInvoice.customer?.companyName || "N/A"}
              </span>
              {selectedInvoice.customer?.email && (
                <span className="text-xs text-gray-500 block mt-0.5">
                  {selectedInvoice.customer.email}
                </span>
              )}
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                Bill To / Ship To
              </span>
              <span className="text-sm font-semibold text-gray-800 block mt-1">
                Bill To:{" "}
                {typeof selectedInvoice.bill_to === "string"
                  ? selectedInvoice.bill_to
                  : "N/A"}
              </span>
              <span className="text-xs text-gray-500 block mt-0.5">
                Ship To:{" "}
                {typeof selectedInvoice.ship_to === "string"
                  ? selectedInvoice.ship_to
                  : "N/A"}
              </span>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                Cargo No / Dates
              </span>
              <span className="text-sm font-semibold text-gray-800 block mt-1">
                Cargo: {selectedInvoice.cargo?.cargo_no || "No Cargo"}
              </span>
              <span className="text-xs text-gray-500 block mt-0.5">
                Date: {formatDate(selectedInvoice.invoiceDate)}
              </span>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                Items / Totals
              </span>
              <span className="text-sm font-semibold text-gray-800 block mt-1">
                {selectedInvoice.customItemCount ??
                  selectedInvoice.items?.length ??
                  0}{" "}
                Items | {selectedInvoice.customTotalQty ?? 0} Qty
              </span>
              {(activeInvTab === "rk" || activeInvTab === "closed_invoices" || activeInvTab === "rechnung" || activeInvTab === "closed") && (
                <div className="space-y-1 mt-1 pt-1 border-t border-gray-200">
                  <span className="text-sm font-bold text-gray-800 block">
                    Gesamt (Brutto): €
                    {(() => {
                      const expData = expandedStates[selectedInvoice.id]?.data;
                      const taricSum = expData?.taricGroups?.reduce(
                        (s: number, g: any) => s + (Number(g.totalPrice) || 0),
                        0,
                      ) || 0;
                      const freight = Number(selectedInvoice.freightCost || 0);
                      if (taricSum > 0) {
                        return (taricSum + freight).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        });
                      }
                      return calculateInvoiceTotal(selectedInvoice).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      });
                    })()}
                  </span>

                  {Array.isArray(selectedInvoice.payments) && selectedInvoice.payments.length > 0 && (
                    <div className="space-y-0.5 text-xs text-gray-600">
                      {selectedInvoice.payments.map((p: any, idx: number) => (
                        <div key={p.id || idx} className="flex justify-between">
                          <span>Zahlung ({p.paymentMethod || "Überweisung"}) vom {formatDate(p.receivedDate || p.createdAt)}:</span>
                          <span className="font-medium text-emerald-700">€{Number(p.amount || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* RKs */}
                  {Array.isArray(selectedInvoice.rks) && selectedInvoice.rks.length > 0 && (
                    <div className="space-y-0.5 text-xs text-amber-700">
                      {selectedInvoice.rks.map((rk: any, idx: number) => (
                        <div key={rk.id || idx} className="flex justify-between">
                          <span>RK ({rk.rkNumber || rk.id}) vom {formatDate(rk.createdAt)}:</span>
                          <span className="font-medium">-€{Number(rk.totalAmount || rk.total || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {(() => {
                    const hasPayments = Array.isArray(selectedInvoice.payments) && selectedInvoice.payments.length > 0;
                    const hasRks = Array.isArray(selectedInvoice.rks) && selectedInvoice.rks.length > 0;
                    if (!hasPayments && !hasRks) return null;

                    const gross = calculateInvoiceTotal(selectedInvoice);
                    const paid = (selectedInvoice.payments || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
                    const rkVal = (selectedInvoice.rks || []).reduce((s: number, rk: any) => s + Number(rk.totalAmount || rk.total || 0), 0);
                    const openAmt = Math.max(0, gross - paid - rkVal);
                    return (
                      <div className="flex justify-between text-xs font-bold pt-1 border-t border-dashed border-gray-200">
                        <span>offener Betrag:</span>
                        <span className={openAmt > 0 ? "text-rose-600" : "text-emerald-700"}>
                          €{openAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
          {activeInvTab === "rechnung" && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Edit Invoice Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#495057] mb-1.5">
                    Titel
                  </label>
                  <input
                    type="text"
                    value={invoiceEditForm.title || ""}
                    onChange={(e) =>
                      setInvoiceEditForm({
                        ...invoiceEditForm,
                        title: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-[4px] text-sm focus:outline-none focus:border-[#8CC21B] text-black"
                    placeholder="Document Title"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#495057] mb-1.5">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={invoiceEditForm.description}
                    onChange={(e) =>
                      setInvoiceEditForm({
                        ...invoiceEditForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-[4px] text-sm focus:outline-none focus:border-[#8CC21B] text-black"
                    placeholder="Description (e.g. Freight cost)"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#495057] mb-1.5">
                    Freight Cost *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoiceEditForm.freightCost}
                    onChange={(e) =>
                      setInvoiceEditForm({
                        ...invoiceEditForm,
                        freightCost: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-[4px] text-sm focus:outline-none focus:border-[#8CC21B] text-black"
                    placeholder="Freight Cost"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#495057] mb-1.5">
                  Remark
                </label>
                <textarea
                  value={invoiceEditForm.remark}
                  onChange={(e) =>
                    setInvoiceEditForm({
                      ...invoiceEditForm,
                      remark: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-[4px] text-sm focus:outline-none focus:border-[#8CC21B] text-black"
                  placeholder="Remark"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => onSaveInvoiceEdit(selectedInvoice.id)}
                  disabled={actionLoading[`save-${selectedInvoice.id}`]}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#059669] rounded-lg hover:bg-green-700 flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {actionLoading[`save-${selectedInvoice.id}`] ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Save Changes
                </button>
              </div>
            </div>
          )}
          <div className="space-y-4">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setModalActiveTab("taric")}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all relative ${modalActiveTab === "taric"
                  ? "border-[#8CC21B] text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                Taric Summary
              </button>
              <button
                onClick={() => setModalActiveTab("items")}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all relative ${modalActiveTab === "items"
                  ? "border-[#8CC21B] text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                Items List
              </button>
            </div>

            <div className="min-h-[300px]">
              {expandedStates[selectedInvoice.id]?.loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#8CC21B]" />
                    <p className="text-xs text-[#6C757D]">
                      Loading data details...
                    </p>
                  </div>
                </div>
              ) : modalActiveTab === "taric" ? (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-[#495057] uppercase tracking-wider mb-2">
                    Items shown in invoice based on Taric
                  </h4>
                  <SpreadSheet
                    data={
                      expandedStates[selectedInvoice.id]?.data?.taricGroups ||
                      []
                    }
                    loading={expandedStates[selectedInvoice.id]?.loading}
                    showTotals={true}
                    columns={
                      activeInvTab === "rk"
                        ? [
                          {
                            header: "Position",
                            render: (_: any, idx: number) => idx + 1,
                            width: "50px",
                          },
                          {
                            header: "Taric Name EN",
                            render: (it: any) => it.taricNameEn,
                            width: "250px",
                          },
                          {
                            header: "Taric Code",
                            render: (it: any) => (
                              <span
                                style={
                                  it.isProjectItem
                                    ? { color: "#F59E0B", fontWeight: 600 }
                                    : undefined
                                }
                              >
                                {it.taricCode}
                              </span>
                            ),
                            width: "110px",
                          },
                          {
                            header: "Duty rate",
                            render: (it: any) =>
                              it.dutyRate
                                ? `${Number(it.dutyRate).toFixed(2)}`
                                : "-",
                            width: "80px",
                          },
                          {
                            header: "Total Qty",
                            render: (it: any) => it.totalQty,
                            align: "center",
                            width: "80px",
                          },
                          {
                            header: "Unit Price",
                            render: (it: any) =>
                              (
                                Number(it.unitPrice || 0) ||
                                (it.totalQty > 0
                                  ? Number(it.totalPrice || 0) / it.totalQty
                                  : 0)
                              ).toFixed(2),
                            width: "80px",
                          },
                          {
                            header: "Total Price",
                            render: (it: any) =>
                              (Number(it.totalPrice) || 0).toLocaleString(
                                undefined,
                                { minimumFractionDigits: 2 },
                              ),
                            width: "100px",
                          },
                        ]
                        : [
                          {
                            header: "Position",
                            render: (_: any, idx: number) => idx + 1,
                            width: "50px",
                          },
                          {
                            header: "Taric Name EN",
                            render: (it: any) => it.taricNameEn,
                            width: "250px",
                          },
                          {
                            header: "Taric Code",
                            render: (it: any) => (
                              <span
                                style={
                                  it.isProjectItem
                                    ? { color: "#F59E0B", fontWeight: 600 }
                                    : undefined
                                }
                              >
                                {it.taricCode}
                              </span>
                            ),
                            width: "110px",
                          },
                          {
                            header: "Duty rate",
                            render: (it: any) =>
                              it.dutyRate
                                ? `${Number(it.dutyRate).toFixed(2)}`
                                : "-",
                            width: "80px",
                          },
                          {
                            header: "Total Qty",
                            render: (it: any) => it.totalQty,
                            align: "center",
                            width: "80px",
                          },
                          {
                            header: "Unit Price",
                            render: (it: any) =>
                              (
                                Number(it.unitPrice || 0) ||
                                (it.totalQty > 0
                                  ? Number(it.totalPrice || 0) / it.totalQty
                                  : 0)
                              ).toFixed(2),
                            width: "80px",
                          },
                          {
                            header: "Total Price",
                            render: (it: any) =>
                              (Number(it.totalPrice) || 0).toLocaleString(
                                undefined,
                                { minimumFractionDigits: 2 },
                              ),
                            width: "100px",
                          },
                          {
                            header: "Operation",
                            render: (group: any) => (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenTaricModal(group);
                                }}
                                className="flex items-center gap-1 px-3 py-1 bg-[#1A73E8] text-white text-[10px] font-bold rounded hover:bg-[#1557B0]"
                              >
                                <RefreshCw className="w-3 h-3" /> Set taric
                              </button>
                            ),
                            width: "110px",
                          },
                        ]
                    }
                    expandedRowId={null}
                    totalCols={
                      activeInvTab === "rk"
                        ? [
                          {
                            label: "Grand Total",
                            value: "",
                            colSpan: 4,
                            align: "left",
                          },
                          {
                            value:
                              expandedStates[
                                selectedInvoice.id
                              ]?.data?.taricGroups?.reduce(
                                (s: number, g: any) => s + (g.totalQty || 0),
                                0,
                              ) || 0,
                            width: "80px",
                            align: "center",
                          },
                          { value: "", width: "80px" },
                          {
                            value: (
                              expandedStates[
                                selectedInvoice.id
                              ]?.data?.taricGroups?.reduce(
                                (s: number, g: any) =>
                                  s + (g.totalPrice || 0),
                                0,
                              ) || 0
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            }),
                            width: "100px",
                            align: "left",
                          },
                        ]
                        : [
                          {
                            label: "Grand Total",
                            value: "",
                            colSpan: 4,
                            align: "left",
                          },
                          {
                            value:
                              expandedStates[
                                selectedInvoice.id
                              ]?.data?.taricGroups?.reduce(
                                (s: number, g: any) => s + (g.totalQty || 0),
                                0,
                              ) || 0,
                            width: "80px",
                            align: "center",
                          },
                          { value: "", width: "80px" },
                          {
                            value: (
                              expandedStates[
                                selectedInvoice.id
                              ]?.data?.taricGroups?.reduce(
                                (s: number, g: any) =>
                                  s + (g.totalPrice || 0),
                                0,
                              ) || 0
                            ).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            }),
                            width: "100px",
                            align: "left",
                          },
                          { value: "", width: "110px" },
                        ]
                    }
                  />
                </div>
              ) : (
                <SpreadSheet
                  data={
                    expandedStates[selectedInvoice.id]?.data?.detailedItems ||
                    []
                  }
                  loading={expandedStates[selectedInvoice.id]?.loading}
                  columns={
                    activeInvTab === "rk"
                      ? [
                        {
                          header: "#",
                          render: (_: any, idx: number) => idx + 1,
                          width: "40px",
                        },
                        {
                          header: "EAN",
                          render: (it: any) =>
                            it._fallbackEan || it.item?.ean || "-",
                          width: "110px",
                        },
                        {
                          header: "Item Name",
                          render: (it: any) => (
                            <div
                              className="line-clamp-2 leading-tight py-1"
                              title={it.item?.item_name}
                            >
                              {it.item?.item_name}
                            </div>
                          ),
                          width: "350px",
                        },
                        {
                          header: "Taric code",
                          render: (it: any) =>
                            it.set_taric_code || it.item?.taric?.code || "-",
                          width: "100px",
                        },
                        {
                          header: "QTY",
                          render: (it: any) => (
                            <span className="font-bold">{it.qty}</span>
                          ),
                          width: "60px",
                          align: "center",
                        },
                        {
                          header: "EUR",
                          render: (it: any) =>
                            it.eur_special_price || it._fallbackEk || "0",
                          width: "60px",
                          align: "center",
                        },
                        {
                          header: "EK",
                          render: (it: any) => {
                            const unitPrice =
                              Number(
                                it.eur_special_price || it._fallbackEk,
                              ) || 0;
                            const totalPrice = (it.qty || 0) * unitPrice;
                            return (
                              <span className="font-bold text-[#10B981]">
                                {totalPrice.toFixed(2)}
                              </span>
                            );
                          },
                          width: "80px",
                          align: "center",
                        },
                      ]
                      : [
                        {
                          header: "ID",
                          render: (it: any) => (
                            <div className="flex flex-col gap-1.5 p-1">
                              <div className="px-2 py-1 bg-[#495057] text-white text-[10px] font-bold rounded-[4px] text-center mb-1 flex items-center justify-center gap-1.5 font-sans">
                                <FileText className="w-3 h-3" /> {it.id}
                              </div>
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenQtyModal(it);
                                  }}
                                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-[9px] font-bold bg-[#495057] text-white rounded-[4px] hover:bg-[#343A40] transition shadow-sm uppercase"
                                >
                                  <Package className="w-2.5 h-2.5" /> QtyLabel
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenSplitModal(it);
                                  }}
                                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-[9px] font-bold bg-[#F15A24] text-white rounded-[4px] hover:bg-[#D9481B] transition shadow-sm uppercase"
                                >
                                  <Scissors className="w-2.5 h-2.5" /> Split
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenReassignModal(it);
                                  }}
                                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-[9px] font-bold bg-[#4F46E5] text-white rounded-[4px] hover:bg-[#4338CA] transition shadow-sm uppercase"
                                >
                                  <RefreshCw className="w-2.5 h-2.5" />{" "}
                                  ReAssign
                                </button>
                              </div>
                            </div>
                          ),
                          width: "100px",
                        },
                        {
                          header: "EAN",
                          render: (it: any) =>
                            it._fallbackEan || it.item?.ean || "-",
                          width: "110px",
                        },
                        {
                          header: "Item Name",
                          render: (it: any) => (
                            <div
                              className="line-clamp-3 leading-tight break-words"
                              title={it.item?.item_name}
                            >
                              {it.item?.item_name}
                            </div>
                          ),
                          width: "250px",
                        },
                        {
                          header: "Taric code",
                          render: (it: any) =>
                            it.set_taric_code || it.item?.taric?.code,
                          width: "90px",
                        },
                        {
                          header: "Remark",
                          render: (it: any) => `// ${it.remark_de || ""}`,
                          width: "80px",
                        },
                        {
                          header: "Order_no",
                          render: (it: any) => it.order?.order_no || "-",
                          width: "80px",
                        },
                        {
                          header: "SOID",
                          render: (it: any) => it.supplier_order_id || "-",
                          width: "50px",
                        },
                        {
                          header: "Status",
                          render: (it: any) => it.status,
                          width: "60px",
                        },
                        {
                          header: "V(dm³)",
                          render: (it: any) => it.v?.toFixed(2),
                          width: "60px",
                          align: "center",
                        },
                        {
                          header: "W(kg)",
                          render: (it: any) => it.w?.toFixed(2),
                          width: "60px",
                          align: "center",
                        },
                        {
                          header: "QTY",
                          render: (it: any) => (
                            <div className="flex flex-col items-center">
                              <span className="font-bold">
                                {it.qty_label
                                  ? `${it.qty_label}/${it.qty}`
                                  : it.qty}
                              </span>
                            </div>
                          ),
                          width: "60px",
                          align: "center",
                        },
                        {
                          header: "EUR",
                          render: (it: any) =>
                            it.eur_special_price || it._fallbackEk || "0",
                          width: "45px",
                          align: "center",
                        },
                        {
                          header: "EK",
                          render: (it: any) => {
                            const unitPrice =
                              Number(
                                it.eur_special_price || it._fallbackEk,
                              ) || 0;
                            const totalPrice = (it.qty || 0) * unitPrice;
                            return (
                              <span className="font-bold text-[#10B981]">
                                {totalPrice.toFixed(2)}
                              </span>
                            );
                          },
                          width: "65px",
                          align: "center",
                        },
                        {
                          header: "Action",
                          render: (it: any) =>
                            it.item?.is_eur_special === "Y" &&
                              (!it.eur_special_price ||
                                Number(it.eur_special_price) === 0) ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedPriceItemId(
                                    expandedPriceItemId === it.id
                                      ? null
                                      : it.id,
                                  );
                                  setEditingPrice(it.eur_special_price || 0);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EF4444] text-white text-[10px] font-bold rounded-[4px] hover:bg-red-600 transition-all shadow-md whitespace-nowrap"
                              >
                                <DollarSign className="w-3.5 h-3.5" /> SET EUR
                                PRICE
                              </button>
                            ) : null,
                          width: "120px",
                        },
                      ]
                  }
                  expandedRowId={expandedPriceItemId}
                  renderRowDetails={(it: any) => (
                    <div className="bg-[#F8F9FA] p-4 rounded-md border border-gray-200 mt-2 shadow-inner">
                      <h4 className="text-[11px] font-bold text-[#495057] uppercase mb-3 tracking-wider flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-[#EF4444] rounded-full"></div>
                        Set EUR Price for Item {it.id}
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-[#6C757D] uppercase mb-1.5">
                            EUR Special Price
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              value={editingPrice}
                              onChange={(e) =>
                                setEditingPrice(Number(e.target.value))
                              }
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-[4px] text-sm focus:ring-2 focus:ring-[#EF4444] focus:border-transparent outline-none transition-all shadow-sm font-medium text-black"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedPriceItemId(null);
                            }}
                            className="px-4 py-2 text-[11px] font-bold text-[#495057] bg-white border border-[#DEE2E6] rounded-[4px] hover:bg-gray-50 transition-all uppercase shadow-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSetPrice(it.id);
                            }}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailsModal;

"use client";

import React from "react";
import {
  FileText,
  X,
  RefreshCw,
  Check,
  Loader2,
  Package,
  CheckCircle,
} from "lucide-react";
import SpreadSheet from "@/components/UI/SpreadSheet";
import { downloadCommercialInvoice } from "@/api/orders";
import { formatDate } from "@/utils/date";
import { calculateInvoiceTotal, getTaricGroupKey } from "@/utils/invoice";
import {
  Invoice,
  InvoiceEditForm,
  ExpandedStates,
  getStatusColor,
  getDisplayCargoNo,
} from "./invoiceHelpers";
import {
  buildTaricGroupColumns,
  buildTaricGroupTotalCols,
} from "./taricGroupColumns";
import { buildInvoiceItemColumns } from "./invoiceItemColumns";
import InvoiceItemActionButtons from "./InvoiceItemActionButtons";

/**
 * Verbatim port of the inline `showInvoiceDetailsModal` block from the
 * original invoices/page.tsx (it has diverged from
 * commercial/InvoiceDetailsModel.tsx — different tab ids, no Titel field,
 * no payments/RK breakdown, "N/A" cargo fallback, delivery/due dates — so
 * it is kept as its own file, structured the same way).
 */

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
  expandedStates: ExpandedStates;
  invoiceEditForm: InvoiceEditForm;
  setInvoiceEditForm: (form: InvoiceEditForm) => void;
  onMarkAsPaid: (invoiceId: string) => void;
  onSaveInvoiceEdit: (invoiceId: string) => void;
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

const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  isOpen,
  onClose,
  selectedInvoice,
  activeInvTab,
  actionLoading,
  setActionLoading,
  modalActiveTab,
  expandedStates,
  invoiceEditForm,
  setInvoiceEditForm,
  onMarkAsPaid,
  onSaveInvoiceEdit,
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
  // Was page-level state that was only ever reset to null on open; kept
  // here (as in commercial/InvoiceDetailsModel.tsx) so SpreadSheet gets the
  // same expandedRowId as before.
  const [expandedTaricGroupKey] = React.useState<string | null>(null);

  if (!isOpen || !selectedInvoice) return null;

  const isClosed = activeInvTab === "closed_invoices";
  const expanded = expandedStates[selectedInvoice.id];

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
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-[4px] uppercase"
              style={getStatusColor(selectedInvoice.status)}
            >
              {selectedInvoice.status}
            </span>

            {activeInvTab === "open_invoices" ? (
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
                      await downloadCommercialInvoice(
                        selectedInvoice.id,
                        selectedInvoice.invoiceNumber,
                        selectedInvoice.cargo?.cargo_no ||
                        selectedInvoice.cargoNo,
                      );
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
                Cargo: {getDisplayCargoNo(selectedInvoice, "N/A")}
              </span>
              <span className="text-xs text-gray-500 block mt-0.5">
                Date: {formatDate(selectedInvoice.invoiceDate)}
              </span>
              <span className="text-xs text-gray-500 block mt-0.5">
                Delivery: {formatDate(selectedInvoice.deliveryDate)}
              </span>
              {selectedInvoice.dueDate && (
                <span className="text-xs font-semibold text-amber-700 block mt-0.5">
                  Due: {formatDate(selectedInvoice.dueDate)}
                </span>
              )}
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
              {isClosed && (
                <span className="text-sm font-bold text-emerald-600 block mt-0.5">
                  Total: €
                  {(() => {
                    const expData = expanded?.data;
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
                    return calculateInvoiceTotal(selectedInvoice).toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      },
                    );
                  })()}
                </span>
              )}
            </div>
          </div>
          {activeInvTab === "open_invoices" && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Edit Invoice Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="min-h-[300px]">
              {expanded?.loading ? (
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
                  <h4 className="text-[11px] font-bold text-[#495057] uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Items shown in invoice based on Taric</span>
                  </h4>
                  <SpreadSheet
                    data={(expanded?.data?.taricGroups || []).map((g: any) => ({
                      ...g,
                      id: g.taricId || g.taricCode || `taric_${g.taricCode}`,
                    }))}
                    loading={expanded?.loading}
                    showTotals={true}
                    columns={buildTaricGroupColumns({
                      isClosed,
                      onOpenTaricModal,
                    })}
                    expandedRowId={expandedTaricGroupKey}
                    renderRowDetails={(group: any) => {
                      const allDetailedItems = expanded?.data?.detailedItems || [];
                      const matchingItems = allDetailedItems.filter(
                        (it: any) => getTaricGroupKey(it) === group.taricId,
                      );

                      return (
                        <div className="bg-[#F8F9FA] p-3 rounded-lg border border-gray-200 my-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h5 className="text-[11px] font-bold text-[#495057] uppercase tracking-wider flex items-center gap-2">
                              <Package className="w-3.5 h-3.5 text-[#8CC21B]" />
                              Order Items under TARIC Code: <span className="font-mono text-xs text-gray-900 font-bold">{group.taricCode}</span> ({matchingItems.length} item{matchingItems.length !== 1 ? 's' : ''})
                            </h5>
                          </div>
                          {matchingItems.length === 0 ? (
                            <p className="text-xs text-gray-500 italic py-1">No detailed order items recorded for this TARIC group.</p>
                          ) : (
                            <div className="overflow-x-auto rounded border border-gray-200 bg-white shadow-sm">
                              <table className="w-full text-xs text-left text-gray-700">
                                <thead className="bg-[#343A40] text-white text-[10px] font-bold uppercase">
                                  <tr>
                                    <th className="py-2 px-3">#</th>
                                    <th className="py-2 px-3">EAN</th>
                                    <th className="py-2 px-3">Item Name</th>
                                    <th className="py-2 px-3">Order No</th>
                                    <th className="py-2 px-3">Remark</th>
                                    <th className="py-2 px-3 text-center">QTY</th>
                                    <th className="py-2 px-3 text-right">Unit Price (€)</th>
                                    <th className="py-2 px-3 text-right">Total (€)</th>
                                    {!isClosed && <th className="py-2 px-3 text-center">Actions</th>}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 font-medium">
                                  {matchingItems.map((it: any, idx: number) => {
                                    const unitPrice = Number(it.eur_special_price || it._fallbackEk || 0);
                                    const totalPrice = Number(it.qty || 0) * unitPrice;
                                    return (
                                      <tr key={it.id || idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-2 px-3 text-gray-500">{idx + 1}</td>
                                        <td className="py-2 px-3 font-mono text-[11px] text-gray-600">{it._fallbackEan || it.item?.ean || "-"}</td>
                                        <td className="py-2 px-3 max-w-[220px] truncate font-semibold text-gray-900" title={it.item?.item_name}>{it.item?.item_name || "Item"}</td>
                                        <td className="py-2 px-3 text-gray-600">{it.order?.order_no || "-"}</td>
                                        <td className="py-2 px-3 text-gray-500 text-[11px] italic">{"// "}{it.remark_de || ""}</td>
                                        <td className="py-2 px-3 text-center font-bold">{it.qty_label ? `${it.qty_label}/${it.qty}` : it.qty}</td>
                                        <td className="py-2 px-3 text-right">€{unitPrice.toFixed(2)}</td>
                                        <td className="py-2 px-3 text-right font-bold text-[#10B981]">€{totalPrice.toFixed(2)}</td>
                                        {!isClosed && (
                                          <td className="py-2 px-3">
                                            <InvoiceItemActionButtons
                                              item={it}
                                              onOpenQtyModal={onOpenQtyModal}
                                              onOpenSplitModal={onOpenSplitModal}
                                              onOpenReassignModal={onOpenReassignModal}
                                            />
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    }}
                    totalCols={buildTaricGroupTotalCols(
                      isClosed,
                      expanded?.data?.taricGroups,
                    )}
                  />
                </div>
              ) : (
                <SpreadSheet
                  data={expanded?.data?.detailedItems || []}
                  loading={expanded?.loading}
                  columns={buildInvoiceItemColumns({
                    isClosed,
                    expandedPriceItemId,
                    setExpandedPriceItemId,
                    setEditingPrice,
                    onOpenQtyModal,
                    onOpenSplitModal,
                    onOpenReassignModal,
                  })}
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

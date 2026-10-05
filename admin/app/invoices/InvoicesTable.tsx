"use client";

import React from "react";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Package,
} from "lucide-react";
import { formatDate } from "@/utils/date";
import { calculateInvoiceTotal } from "@/utils/invoice";
import {
  Invoice,
  InvoiceSortField,
  ExpandedStates,
  getStatusColor,
  getDisplayCargoNo,
} from "./invoiceHelpers";
import InvoiceItemActionButtons from "./InvoiceItemActionButtons";

/**
 * The "Open Invoices" / "Closed Invoices" tab body: desktop table (with
 * per-row order-item expansion), mobile card list and pagination.
 * Verbatim port of the inline JSX from the original invoices/page.tsx.
 */

interface InvoicesTableProps {
  activeInvTab: "open_invoices" | "closed_invoices";
  loading: boolean;
  filteredInvoices: Invoice[];
  currentPage: number;
  itemsPerPage: number;
  setCurrentPage: (page: number) => void;
  sortField: InvoiceSortField;
  sortDirection: "asc" | "desc";
  onSort: (field: InvoiceSortField) => void;
  expandedInvoiceIds: Set<string>;
  expandedStates: ExpandedStates;
  onToggleRowExpand: (invoice: Invoice) => void;
  onOpenInvoiceDetails: (invoice: Invoice) => void;
  getBillToDisplayName: (invoice: Invoice) => string;
  getCargoTypeName: (invoice: Invoice) => string;
  onOpenQtyModal: (item: any) => void;
  onOpenSplitModal: (item: any) => void;
  onOpenReassignModal: (item: any) => void;
}

const SortableTh: React.FC<{
  field: InvoiceSortField;
  sortField: InvoiceSortField;
  sortDirection: "asc" | "desc";
  onSort: (field: InvoiceSortField) => void;
  alignRight?: boolean;
  children: React.ReactNode;
}> = ({ field, sortField, sortDirection, onSort, alignRight, children }) => (
  <th
    onClick={() => onSort(field)}
    className={`${alignRight ? "text-right" : "text-left"} py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057] cursor-pointer select-none hover:text-black transition-colors`}
  >
    <div
      className={`flex items-center ${alignRight ? "justify-end " : ""}gap-1`}
    >
      <span>{children}</span>
      {sortField === field && (
        <span className="text-xs text-emerald-600 font-bold">
          {sortDirection === "asc" ? "↑" : "↓"}
        </span>
      )}
    </div>
  </th>
);

const InvoicesTable: React.FC<InvoicesTableProps> = ({
  activeInvTab,
  loading,
  filteredInvoices,
  currentPage,
  itemsPerPage,
  setCurrentPage,
  sortField,
  sortDirection,
  onSort,
  expandedInvoiceIds,
  expandedStates,
  onToggleRowExpand,
  onOpenInvoiceDetails,
  getBillToDisplayName,
  getCargoTypeName,
  onOpenQtyModal,
  onOpenSplitModal,
  onOpenReassignModal,
}) => {
  const isOpenTab = activeInvTab === "open_invoices";
  const isClosedTab = activeInvTab === "closed_invoices";

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInvoices = filteredInvoices.slice(startIndex, endIndex);

  const sortProps = { sortField, sortDirection, onSort };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#8CC21B]" />
            <p className="text-xs text-[#6C757D]">Loading invoices...</p>
          </div>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-[#ADB5BD]" />
            <h3 className="text-lg font-medium mb-1 text-[#212529]">
              No invoices found
            </h3>
            <p className="text-xs text-[#6C757D]">
              Try adjusting your search or filters
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-[#F8F9FA] border-b border-[#E9ECEF]">
                <tr>
                  <th className="w-10 py-3.5 px-3 text-center"></th>
                  {isClosedTab && (
                    <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">
                      #
                    </th>
                  )}
                  {isClosedTab && (
                    <SortableTh field="id" {...sortProps}>
                      ID
                    </SortableTh>
                  )}
                  {isClosedTab && (
                    <SortableTh field="invoiceNumber" {...sortProps}>
                      Invoice No
                    </SortableTh>
                  )}
                  <SortableTh field="createdAt" {...sortProps}>
                    {isOpenTab ? "Date " : "Closed Date"}
                  </SortableTh>
                  <SortableTh field="customer" {...sortProps}>
                    Bill To
                  </SortableTh>
                  <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">
                    Ship To
                  </th>
                  <SortableTh field="cargoNo" {...sortProps}>
                    Cargo No.
                  </SortableTh>
                  <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">
                    CargoType
                  </th>
                  <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">
                    Remark
                  </th>
                  <SortableTh field="customItemCount" {...sortProps}>
                    {isOpenTab ? "Count Item" : "Item Count"}
                  </SortableTh>
                  <SortableTh field="customTotalQty" {...sortProps}>
                    {isOpenTab ? "QTY" : "Total Qty"}
                  </SortableTh>
                  <SortableTh field="grossTotal" alignRight {...sortProps}>
                    {isOpenTab ? "TotalAmount" : "Total Price"}
                  </SortableTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5]">
                {currentInvoices.map((invoice, index) => {
                  const isExpanded = expandedInvoiceIds.has(invoice.id);
                  const totalCols = isClosedTab ? 13 : 10;
                  return (
                    <React.Fragment key={invoice.id}>
                      <tr
                        onClick={() => onOpenInvoiceDetails(invoice)}
                        className={`hover:bg-[#F8F9FA] transition-colors group cursor-pointer font-medium ${isExpanded ? "bg-[#F8F9FA]" : ""
                          }`}
                      >
                        <td
                          className="py-4 px-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleRowExpand(invoice);
                            }}
                            className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-500 hover:text-black focus:outline-none"
                            title={isExpanded ? "Collapse Order Items" : "Unfold OrderItemList"}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#8CC21B] font-bold" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400 hover:text-gray-700" />
                            )}
                          </button>
                        </td>
                        {isClosedTab && (
                          <td className="py-4 px-4 text-xs text-[#212529]">
                            {startIndex + index + 1}
                          </td>
                        )}
                        {isClosedTab && (
                          <td className="py-4 px-4 text-xs text-[#212529] font-bold">
                            {invoice.id.slice(-5).toUpperCase()}
                          </td>
                        )}
                        {isClosedTab && (
                          <td className="py-4 px-4 text-xs font-semibold text-[#212529]">
                            {invoice.invoiceNumber || "N/A"}
                          </td>
                        )}
                        <td className="py-4 px-4 text-xs text-[#495057]">
                          {formatDate(invoice.invoiceDate, true)}
                        </td>
                        <td className="py-4 px-4 text-xs text-[#212529]">
                          {getBillToDisplayName(invoice)}
                        </td>
                        <td className="py-4 px-4 text-xs text-[#6C757D]">
                          {(() => {
                            const v = invoice.ship_to;
                            if (!v || typeof v === "object") return "-";
                            const s = String(v).trim();
                            return s.length > 1 ? s : "-";
                          })()}
                        </td>
                        <td className="py-4 px-4 text-xs text-[#212529]">
                          {getDisplayCargoNo(invoice, "-")}
                        </td>
                        <td className="py-4 px-4 text-xs text-[#212529]">
                          {getCargoTypeName(invoice)}
                        </td>
                        <td className="py-4 px-4 text-xs text-[#6C757D]">
                          {invoice.remark || "-"}
                        </td>
                        <td className="py-4 px-4 text-xs text-[#212529]">
                          {invoice.customItemCount ?? invoice.items?.length ?? 0}
                        </td>
                        <td className="py-4 px-4 text-xs text-[#212529] font-medium">
                          {invoice.customTotalQty ??
                            invoice.items?.reduce(
                              (sum: any, item: any) => sum + item.quantity,
                              0,
                            ) ??
                            0}
                        </td>
                        <td className="py-4 px-4 text-xs text-right font-bold text-[#212529]">
                          {calculateInvoiceTotal(invoice).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50/90 border-b border-gray-200">
                          <td colSpan={totalCols} className="p-4">
                            {expandedStates[invoice.id]?.loading ? (
                              <div className="flex items-center justify-center p-6 gap-2 text-xs text-gray-500 font-medium">
                                <Loader2 className="w-4 h-4 animate-spin text-[#8CC21B]" /> Loading order items...
                              </div>
                            ) : (() => {
                              const data = expandedStates[invoice.id]?.data;
                              const itemsToRender = data?.detailedItems || data?.items || invoice.items || [];
                              return (
                                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h5 className="text-[11px] font-bold text-[#495057] uppercase tracking-wider flex items-center gap-2">
                                      <Package className="w-3.5 h-3.5 text-[#8CC21B]" />
                                      Order Items List ({itemsToRender.length} item{itemsToRender.length !== 1 ? 's' : ''})
                                    </h5>
                                    <span className="text-[10px] text-gray-400 font-normal">Invoice ID: {invoice.id}</span>
                                  </div>
                                  {itemsToRender.length === 0 ? (
                                    <p className="text-xs text-gray-500 italic py-2 text-center">No order items recorded for this invoice.</p>
                                  ) : (
                                    <div className="overflow-x-auto rounded border border-gray-200 bg-white">
                                      <table className="w-full text-xs text-left text-gray-700">
                                        <thead className="bg-[#343A40] text-white text-[10px] font-bold uppercase">
                                          <tr>
                                            <th className="py-2.5 px-3">#</th>
                                            <th className="py-2.5 px-3">EAN</th>
                                            <th className="py-2.5 px-3">Item Name</th>
                                            <th className="py-2.5 px-3">TARIC</th>
                                            <th className="py-2.5 px-3">Order No</th>
                                            <th className="py-2.5 px-3">Remark</th>
                                            <th className="py-2.5 px-3 text-center">QTY</th>
                                            <th className="py-2.5 px-3 text-right">Unit Price (€)</th>
                                            <th className="py-2.5 px-3 text-right">Total (€)</th>
                                            {isOpenTab && <th className="py-2.5 px-3 text-center">Actions</th>}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 font-medium">
                                          {itemsToRender.map((it: any, idx: number) => {
                                            const ean = it._fallbackEan || it.item?.ean || it.ean || "-";
                                            const itemName = it.item?.item_name || it.itemName || it.item_name || it.description || "Item";
                                            const taricCode = it.set_taric_code || it.item?.taric?.code || it.taricCode || "-";
                                            const orderNo = it.order?.order_no || it.orderNo || "-";
                                            const remark = it.remark_de || it.remark || "";
                                            const qty = Number(it.qty || it.quantity || 0);
                                            const unitPrice = Number(it.eur_special_price || it._fallbackEk || it.unitPrice || it.price || 0);
                                            const totalPrice = Number(it.totalPrice || (qty * unitPrice));

                                            return (
                                              <tr key={it.id || idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="py-2 px-3 text-gray-500">{idx + 1}</td>
                                                <td className="py-2 px-3 font-mono text-[11px] text-gray-600">{ean}</td>
                                                <td className="py-2 px-3 max-w-[240px] truncate font-semibold text-gray-900" title={itemName}>{itemName}</td>
                                                <td className="py-2 px-3 font-mono text-[11px] text-amber-700 font-semibold">{taricCode}</td>
                                                <td className="py-2 px-3 text-gray-600">{orderNo}</td>
                                                <td className="py-2 px-3 text-gray-500 text-[11px] italic">{remark ? `// ${remark}` : "-"}</td>
                                                <td className="py-2 px-3 text-center font-bold">{it.qty_label ? `${it.qty_label}/${qty}` : qty}</td>
                                                <td className="py-2 px-3 text-right">€{unitPrice.toFixed(2)}</td>
                                                <td className="py-2 px-3 text-right font-bold text-[#10B981]">€{totalPrice.toFixed(2)}</td>
                                                {isOpenTab && (
                                                  <td className="py-2 px-3">
                                                    <InvoiceItemActionButtons
                                                      item={it}
                                                      onOpenQtyModal={onOpenQtyModal}
                                                      // The invoice-row Split needs a cargo_id to split
                                                      // from — fall back to the invoice's cargo.
                                                      onOpenSplitModal={(item) =>
                                                        onOpenSplitModal({
                                                          ...item,
                                                          cargo_id:
                                                            item.cargo_id ||
                                                            invoice.cargo?.id ||
                                                            expandedStates[invoice.id]?.data?.cargo?.id,
                                                        })
                                                      }
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
                            })()}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden divide-y divide-[#F1F3F5]">
            {currentInvoices.map((invoice) => (
              <div
                key={invoice.id}
                onClick={() => onOpenInvoiceDetails(invoice)}
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-1 bg-[#495057] text-white text-[10px] font-bold rounded-[4px]">
                      {invoice.id.slice(-5).toUpperCase()}
                    </div>
                    <div className="font-bold text-sm text-[#212529]">
                      {isClosedTab
                        ? invoice.invoiceNumber
                        : `ID: ${invoice.id.slice(-5)}`}
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] uppercase"
                    style={getStatusColor(invoice.status)}
                  >
                    {invoice.status}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#6C757D]">Customer</span>
                    <span className="font-medium text-[#212529]">
                      {invoice.customer?.companyName}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#6C757D]">
                      {isOpenTab ? "Cargo" : "Cargo No."}
                    </span>
                    <span className="font-medium text-[#212529]">
                      {getDisplayCargoNo(invoice, "-")}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#6C757D]">Items / Qty</span>
                    <span className="font-medium text-[#212529]">
                      {invoice.customItemCount ?? invoice.items?.length ?? 0}{" "}
                      /{" "}
                      {invoice.customTotalQty ??
                        invoice.items?.reduce(
                          (sum, item) => sum + item.quantity,
                          0,
                        ) ??
                        0}
                    </span>
                  </div>
                  {isClosedTab && (
                    <div className="flex justify-between text-xs font-bold pt-1 border-t border-dashed border-gray-100">
                      <span className="text-[#6C757D]">Total Price</span>
                      <span className="text-[#212529]">
                        €{calculateInvoiceTotal(invoice).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-[#E9ECEF] bg-[#F8F9FA]">
              <div className="text-[11px] font-medium text-[#6C757D]">
                Showing {startIndex + 1} to{" "}
                {Math.min(endIndex, filteredInvoices.length)} of{" "}
                {filteredInvoices.length} invoices
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-[4px] border border-[#DEE2E6] bg-white disabled:opacity-30 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-[#495057]" />
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`min-w-[28px] h-7 text-[11px] font-bold rounded-[4px] border transition-all ${currentPage === i + 1
                      ? "bg-[#8CC21B] text-white border-[#8CC21B] shadow-md"
                      : "bg-white text-[#495057] border-[#DEE2E6] hover:bg-gray-50"
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-[4px] border border-[#DEE2E6] bg-white disabled:opacity-30 hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#495057]" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InvoicesTable;

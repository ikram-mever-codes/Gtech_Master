"use client";

import React from "react";
import { formatCurrency } from "@/api/offers";

export interface DocumentLineItem {
  id?: string | number;
  itemName?: string;
  item_name?: string;
  title?: string;
  item?: any;
  ean?: string;
  qty?: number | string;
  quantity?: number | string;
  baseQuantity?: number | string;
  price?: number | string;
  unitPrice?: number | string;
  rmb_price?: number | string;
  rmb_special_price?: number | string;
  total?: number | string;
  totalPrice?: number | string;
  supplier_name?: string;
  supplier_id?: number | string;
  status?: string;
  item_status?: string;
  cargo_id?: number | string;
  remarks?: string;
  unitPrices?: any[];
  quantityPrices?: any[];
}

export interface DocumentLineItemsSubTableProps {
  items: DocumentLineItem[];
  currency?: string;
  title?: string;
  totalAmount?: number;
  type?: "offer" | "order" | "invoice";
  getSupplierName?: (id: any) => string;
  getOrderStatusColor?: (status: any) => string;
}

export const DocumentLineItemsSubTable: React.FC<DocumentLineItemsSubTableProps> = ({
  items = [],
  currency = "EUR",
  title,
  totalAmount,
  type = "order",
  getSupplierName,
  getOrderStatusColor,
}) => {
  const visibleItems = items.filter((it: any) => !it.isComponent);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm font-poppins select-text">
      <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          {title || `Line Items (${visibleItems.length})`}
        </h4>
        {totalAmount !== undefined && (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Total: {type === "offer" ? formatCurrency(totalAmount, currency) : `€${totalAmount.toFixed(2)}`}
          </span>
        )}
      </div>

      {visibleItems.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-3 text-center">
          No line items in this document.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-center w-10">#</th>
                {type === "order" && <th className="px-3 py-2">EAN</th>}
                <th className="px-3 py-2">Item Name</th>
                <th className="px-3 py-2 text-right">Price</th>
                <th className="px-3 py-2 text-center">QTY</th>
                <th className="px-3 py-2 text-right">Total</th>
                {type === "order" && <th className="px-3 py-2">Supplier</th>}
                <th className="px-3 py-2 text-center">Status</th>
                {type === "order" && <th className="px-3 py-2 text-center">Cargo ID</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {visibleItems.map((it, idx) => {
                const name =
                  it.itemName ||
                  it.item_name ||
                  it.title ||
                  it.item?.item_name ||
                  it.item?.name ||
                  "Item";

                const ean = it.ean || it.item?.ean || "-";

                const activePrice =
                  it.unitPrices?.find((up: any) => up.isActive) ||
                  it.quantityPrices?.find((qp: any) => qp.isActive);

                const uPrice = Number(
                  activePrice?.unitPrice ??
                  activePrice?.price ??
                  it.rmb_special_price ??
                  it.rmb_price ??
                  it.unitPrice ??
                  it.price ??
                  0
                );

                const qtyVal = Number(
                  activePrice?.quantity ||
                  it.qty ||
                  it.quantity ||
                  it.baseQuantity ||
                  1
                );

                const tPrice = Number(
                  activePrice?.totalPrice ??
                  it.total ??
                  it.totalPrice ??
                  uPrice * qtyVal
                );

                const sname =
                  (it.supplier_id ? getSupplierName?.(it.supplier_id) : null) ||
                  it.supplier_name ||
                  "-";

                const statusVal = it.status || it.item_status || "NSO";
                const statusBadge = getOrderStatusColor ? (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getOrderStatusColor(
                      statusVal
                    )}`}
                  >
                    {statusVal}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700">
                    {statusVal}
                  </span>
                );

                return (
                  <tr key={it.id || idx} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-3 py-2 text-center font-mono text-gray-400">
                      {idx + 1}
                    </td>
                    {type === "order" && (
                      <td className="px-3 py-2 font-mono text-gray-600">
                        {ean}
                      </td>
                    )}
                    <td className="px-3 py-2 font-semibold text-gray-900">
                      {name}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-700">
                      {type === "offer"
                        ? formatCurrency(uPrice, currency)
                        : `€${uPrice.toFixed(2)}`}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="bg-gray-100 px-2 py-0.5 rounded font-mono font-bold text-gray-800">
                        {qtyVal} Stk
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">
                      {type === "offer"
                        ? formatCurrency(tPrice, currency)
                        : `€${tPrice.toFixed(2)}`}
                    </td>
                    {type === "order" && (
                      <td className="px-3 py-2 text-gray-700">{sname}</td>
                    )}
                    <td className="px-3 py-2 text-center">{statusBadge}</td>
                    {type === "order" && (
                      <td className="px-3 py-2 text-center font-mono text-gray-500">
                        {it.cargo_id || "-"}
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
};

export default DocumentLineItemsSubTable;
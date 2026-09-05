"use client";

import React from "react";
import { formatTaxRate } from "@/utils/decimal";

export interface CommercialLineItem {
  id?: string | number;
  position?: number;
  itemNo?: string;
  material?: string;
  photo?: string;
  itemName?: string;
  item_name?: string;
  name?: string;
  notes?: string;
  remark_ex?: string;
  remarkEX?: string;
  remarkEx?: string;
  remark?: string;
  description?: string;
  vatRate?: number | string;
  tax_rate?: number | string;
  quantity?: number | string;
  qty?: number | string;
  baseQuantity?: number | string;
  unitPrice?: number | string;
  basePrice?: number | string;
  price?: number | string;
  lineTotal?: number | string;
  totalPrice?: number | string;
  total?: number | string;
  highlightColor?: string;
  isComponent?: boolean;
}

interface CommercialLineItemsSubTableProps {
  items: CommercialLineItem[];
  currency?: string;
  docType?: "auftrag" | "rechnung" | "rk" | "lieferschein" | "bestellung" | "offer" | string;
  shippingMethod?: string;
  shippingCost?: number | string;
  shippingQuantity?: number | string;
  taxRate?: number | string;
}

const formatUnitPrice = (val: number | string | undefined, currency = "EUR"): string => {
  const n = Number(val ?? 0);
  const rounded3 = Math.round(n * 1000) / 1000;
  const rounded2 = Math.round(n * 100) / 100;
  const has3rdDec = Math.abs(rounded3 - rounded2) > 0.0001;
  const decimals = has3rdDec ? 3 : 2;
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${currency === "EUR" ? "€" : currency}`;
};

const formatPrice = (val: number | string | undefined, currency = "EUR"): string => {
  const n = Number(val ?? 0);
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency === "EUR" ? "€" : currency}`;
};

export const CommercialLineItemsSubTable: React.FC<CommercialLineItemsSubTableProps> = ({
  items = [],
  currency = "EUR",
  docType,
  shippingMethod,
  shippingCost,
  shippingQuantity = 1,
  taxRate,
}) => {
  const visibleItems = items.filter((it) => !it.isComponent);

  const getRemarkEx = (it: CommercialLineItem): string => {
    return (
      it.remark_ex ||
      it.remarkEX ||
      it.remarkEx ||
      it.notes ||
      ""
    );
  };

  const getQty = (it: CommercialLineItem): number => {
    return Number(it.quantity ?? it.qty ?? it.baseQuantity ?? 1);
  };

  const getUnitPrice = (it: CommercialLineItem): number => {
    return Number(it.unitPrice ?? it.basePrice ?? it.price ?? 0);
  };

  const getLineTotal = (it: CommercialLineItem): number => {
    const stored = it.lineTotal ?? it.totalPrice ?? it.total;
    if (stored !== undefined && stored !== null) return Number(stored);
    return getUnitPrice(it) * getQty(it);
  };

  const getVatRate = (it: CommercialLineItem): string => {
    const v = it.vatRate ?? it.tax_rate;
    if (v === undefined || v === null || v === "") return "—";
    return formatTaxRate(v);
  };

  const hasShipping = !!(shippingMethod && String(shippingMethod).trim());
  const shippingCostNum = Number(shippingCost ?? 0);
  const shippingQtyNum = Number(shippingQuantity ?? 1);
  const shippingTaxRate = taxRate !== undefined && taxRate !== null ? Number(taxRate) : 0;

  if (visibleItems.length === 0 && !hasShipping) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center text-xs text-gray-400 italic">
        No line items in this document.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-2 py-2 text-left font-semibold text-gray-600 w-10">Pos</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-600 w-12">Pic</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-600 w-28">Art.-Nr.</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-600">Bezeichnung</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-600 w-16">MwSt.</th>
              <th className="px-2 py-2 text-right font-semibold text-gray-600 w-20">Menge</th>
              <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28">Netto-Preis</th>
              <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28">Netto gesamt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {visibleItems.map((item, idx) => {
              const remarkEx = getRemarkEx(item);
              const qty = getQty(item);
              const unitPrice = getUnitPrice(item);
              const lineTotal = getLineTotal(item);
              const rowColor = item.highlightColor;
              const thumb = item.photo;

              return (
                <tr
                  key={item.id || idx}
                  style={rowColor ? { backgroundColor: rowColor } : undefined}
                >
                  <td className="px-2 py-2 text-gray-500">{item.position ?? idx + 1}</td>
                  <td className="px-2 py-2">
                    <div className="w-9 h-9 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt="thumb"
                          className="w-full h-full object-contain"
                          onError={(e) =>
                            ((e.target as HTMLImageElement).style.display = "none")
                          }
                        />
                      ) : (
                        <span className="text-gray-300 text-[10px]">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-gray-700">
                    {item.itemNo || item.material || "—"}
                  </td>
                  <td className="px-2 py-2">
                    <div className="font-medium text-gray-900">
                      {item.itemName || item.item_name || item.name || "—"}
                    </div>
                    {remarkEx && (
                      <div className="text-xs text-gray-500 mt-0.5 leading-snug">
                        {remarkEx}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center text-gray-600">{getVatRate(item)}</td>
                  <td className="px-2 py-2 text-right font-medium text-gray-800">{qty}</td>
                  <td className="px-2 py-2 text-right text-gray-700">
                    {formatUnitPrice(unitPrice, currency)}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold text-gray-900">
                    {formatPrice(lineTotal, currency)}
                  </td>
                </tr>
              );
            })}

            {hasShipping && (
              <tr className="bg-gray-100/80">
                <td className="px-2 py-2 text-gray-400">{visibleItems.length + 1}</td>
                <td className="px-2 py-2 text-gray-400"></td>
                <td className="px-2 py-2 text-gray-400">—</td>
                <td className="px-2 py-2 text-gray-700">{shippingMethod}</td>
                <td className="px-2 py-2 text-center text-gray-600">
                  {docType === "lieferschein" ? "—" : formatTaxRate(shippingTaxRate)}
                </td>
                <td className="px-2 py-2 text-right text-gray-600">{shippingQtyNum}</td>
                <td className="px-2 py-2 text-right text-gray-600">
                  {docType === "lieferschein" ? "—" : formatPrice(shippingCostNum, currency)}
                </td>
                <td className="px-2 py-2 text-right font-medium text-gray-700">
                  {docType === "lieferschein" ? "—" : formatPrice(shippingCostNum * shippingQtyNum, currency)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CommercialLineItemsSubTable;

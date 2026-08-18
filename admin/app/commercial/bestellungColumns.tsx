"use client";

import React from "react";
import { ColumnDef } from "@/components/UI/DataTable";
import { buildExpandColumn } from "./sharedColumns";
import { formatDate } from "@/utils/date";
import { formatCountryCode } from "@/utils/address";

interface BestellungColumnsArgs {
  expandedDocIds: Set<string | number>;
  setExpandedDocIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  onOpenBestellungPreview: (id: string | number) => void;
  onMarkProcessing: (id: string | number) => void;
}

const valueNetCalc = (row: any) => {
  if (row.isCustomerOrder || row.subtotal !== undefined) {
    return Number(row.subtotal ?? row.total_amount ?? 0);
  }
  return (row.items || []).reduce(
    (sum: number, it: any) => sum + Number(it.price || 0) * Number(it.qty || 0),
    0,
  );
};

const getStatusStyle = (st: string) => {
  switch (st) {
    case "draft":
      return "bg-gray-100 text-gray-800 border-gray-300";
    case "to be processed":
      return "bg-blue-50 text-blue-700 border-blue-300 font-bold";
    case "partially delivered":
      return "bg-amber-50 text-amber-700 border-amber-300 font-bold";
    case "delivered":
      return "bg-emerald-50 text-emerald-700 border-emerald-300 font-bold";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export function buildBestellungColumns({
  expandedDocIds,
  setExpandedDocIds,
  onOpenBestellungPreview,
  onMarkProcessing,
}: BestellungColumnsArgs): ColumnDef<any>[] {
  return [
    buildExpandColumn(expandedDocIds, setExpandedDocIds),
    {
      header: "Datum",
      width: "75px",
      align: "center",
      render: (row) => {
        const rawDate =
          row.date_created || row.createdAt || row.created_at;
        if (
          typeof rawDate === "string" &&
          /^\d{2}\.\d{2}\.\d{4}$/.test(rawDate)
        ) {
          const [d, m] = rawDate.split(".");
          return <span className="text-sm text-gray-800 font-normal">{`${d}.${m}.`}</span>;
        }
        return (
          <span className="text-sm text-gray-800 font-normal">
            {rawDate ? formatDate(rawDate) : "—"}
          </span>
        );
      },
    },
    {
      header: "Nr",
      width: "110px",
      align: "center",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenBestellungPreview(row.id);
          }}
          className="text-green-600 hover:underline font-semibold whitespace-nowrap text-sm cursor-pointer"
        >
          {row.order_no || "N/A"}
        </button>
      ),
    },
    {
      header: "Kunde",
      width: "140px",
      align: "left",
      render: (row) => {
        const text =
          row.customerSnapshot?.companyName ||
          row.customerSnapshot?.name ||
          row.customer?.company_name ||
          row.customer?.name ||
          row.customer_name ||
          row.supplier?.name ||
          "—";
        return (
          <div
            className="truncate max-w-[140px] text-sm font-semibold text-gray-900"
            title={text}
          >
            {text}
          </div>
        );
      },
    },
    {
      header: "Titel",
      width: "140px",
      align: "left",
      render: (row) => {
        const text =
          row.title ||
          row.orderItems?.[0]?.itemName ||
          row.items?.[0]?.name ||
          row.items?.[0]?.itemName ||
          "—";
        return (
          <div
            className="truncate max-w-[140px] text-sm text-gray-600 font-normal"
            title={text}
          >
            {text}
          </div>
        );
      },
    },
    {
      header: "Zweck",
      width: "110px",
      align: "left",
      render: (row) => {
        const text =
          row.receiver ||
          (row.auftrag_no ? `Auftrag ${row.auftrag_no}` : "") ||
          row.notes ||
          "—";
        return (
          <div
            className="truncate max-w-[110px] text-sm text-gray-600 font-normal"
            title={text}
          >
            {text}
          </div>
        );
      },
    },
    {
      header: "Lieferort",
      width: "120px",
      align: "left",
      render: (row) => {
        const city = row.deliveryAddress?.city || "";
        const country = row.deliveryAddress?.country || "";
        const text =
          [city, formatCountryCode(country)].filter(Boolean).join(", ") ||
          row.deliveryAddress?.addressName ||
          "—";
        return (
          <div
            className="truncate max-w-[120px] text-sm text-gray-600 font-normal"
            title={text}
          >
            {text}
          </div>
        );
      },
    },
    {
      header: "Lieferdatum",
      width: "90px",
      align: "center",
      render: (row) => {
        const raw = row.date_delivery || row.deliveryDate;
        if (!raw) return <span className="text-gray-400 font-normal text-sm">—</span>;
        if (typeof raw === "string" && /^\d{2}\.\d{2}\.\d{4}$/.test(raw)) {
          const [d, m] = raw.split(".");
          return <span className="text-sm text-gray-600 font-normal">{`${d}.${m}.`}</span>;
        }
        return <span className="text-sm text-gray-600 font-normal">{formatDate(raw)}</span>;
      },
    },
    {
      header: "Bestellwert netto",
      width: "110px",
      align: "right",
      render: (row) => {
        const val = valueNetCalc(row);
        return (
          <span className="text-sm font-bold text-gray-900">
            {`${val.toLocaleString("de-DE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} €`}
          </span>
        );
      },
    },
    {
      header: "Status",
      width: "90px",
      align: "center",
      render: (row: any) => {
        const currentStatus = row.status || "draft";
        return (
          <span
            className="text-[11px] px-2.5 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-600 font-medium capitalize"
          >
            {currentStatus}
          </span>
        );
      },
    },
    {
      header: "Aktionen",
      width: "90px",
      align: "center",
      render: (row) => {
        const currentStatus = row.status || "draft";
        return (
          <div className="flex items-center justify-center gap-1 font-poppins">
            {currentStatus === "draft" ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkProcessing(row.id);
                }}
                className="px-2 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-[4px] hover:bg-blue-700 transition shadow-xs cursor-pointer"
              >
                Processing
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenBestellungPreview(row.id);
                }}
                className="px-2 py-0.5 text-[10px] font-bold bg-[#2F6B46] text-white rounded-[4px] hover:bg-[#255638] transition shadow-xs cursor-pointer"
              >
                View
              </button>
            )}
          </div>
        );
      },
    },
  ];
}
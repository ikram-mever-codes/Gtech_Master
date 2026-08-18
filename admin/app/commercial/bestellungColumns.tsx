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
      width: "70px",
      align: "center",
      render: (row) => {
        const rawDate =
          row.date_created || row.createdAt || row.created_at;
        if (
          typeof rawDate === "string" &&
          /^\d{2}\.\d{2}\.\d{4}$/.test(rawDate)
        ) {
          const [d, m] = rawDate.split(".");
          return `${d}.${m}.`;
        }
        return rawDate ? formatDate(rawDate) : "-";
      },
    },
    {
      header: "Nr",
      width: "75px",
      align: "center",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenBestellungPreview(row.id);
          }}
          className="text-green-600 hover:underline font-semibold"
        >
          {row.order_no || "N/A"}
        </button>
      ),
    },
    {
      header: "Kunde",
      width: "120px",
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
          <div className="truncate max-w-[120px]" title={text}>
            {text}
          </div>
        );
      },
    },
    {
      header: "Titel",
      width: "130px",
      align: "left",
      render: (row) => {
        const text =
          row.title ||
          row.orderItems?.[0]?.itemName ||
          row.items?.[0]?.name ||
          row.items?.[0]?.itemName ||
          "—";
        return (
          <div className="truncate max-w-[130px]" title={text}>
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
          <div className="truncate max-w-[110px]" title={text}>
            {text}
          </div>
        );
      },
    },
    {
      header: "Lieferort",
      width: "95px",
      align: "left",
      render: (row) => {
        const city = row.deliveryAddress?.city || "";
        const country = row.deliveryAddress?.country || "";
        const text =
          [city, formatCountryCode(country)].filter(Boolean).join(", ") ||
          row.deliveryAddress?.addressName ||
          "—";
        return (
          <div className="truncate max-w-[95px]" title={text}>
            {text}
          </div>
        );
      },
    },
    {
      header: "Lieferdatum",
      width: "80px",
      align: "center",
      render: (row) => {
        const raw = row.date_delivery || row.deliveryDate;
        if (!raw) return "—";
        if (typeof raw === "string" && /^\d{2}\.\d{2}\.\d{4}$/.test(raw)) {
          const [d, m] = raw.split(".");
          return `${d}.${m}.`;
        }
        return formatDate(raw);
      },
    },
    {
      header: "Bestellwert netto",
      width: "100px",
      align: "right",
      render: (row) => {
        const val = valueNetCalc(row);
        return `€${val.toLocaleString("de-DE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      },
    },
    {
      header: "Status",
      width: "110px",
      align: "center",
      render: (row: any) => {
        const currentStatus = row.status || "draft";
        return (
          <span
            className={`text-[11px] px-2 py-0.5 rounded border shadow-xs font-medium ${getStatusStyle(currentStatus)}`}
          >
            {currentStatus}
          </span>
        );
      },
    },
    {
      header: "Aktionen",
      width: "80px",
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
                className="px-2 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-[4px] hover:bg-blue-700 transition shadow-xs"
              >
                Processing
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenBestellungPreview(row.id);
                }}
                className="px-2 py-0.5 text-[10px] font-bold bg-[#2F6B46] text-white rounded-[4px] hover:bg-[#255638] transition shadow-xs"
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
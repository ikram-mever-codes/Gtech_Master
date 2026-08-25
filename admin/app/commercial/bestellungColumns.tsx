"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronRight, FileText, FileDown, Mail } from "lucide-react";
import { downloadCustomerOrderPdf, downloadCustomerOrderEml } from "@/api/customer_orders";
import { ColumnDef } from "@/components/UI/DataTable";
import {
  buildExpandColumn,
  formatLieferort,
  formatTitel35,
  CommentIcons,
} from "./sharedColumns";
import { formatDate } from "@/utils/date";
import { formatCountryCode } from "@/utils/address";
import { formatSupplierDisplayName } from "@/components/orders/BestellungPreviewModal";

const BestellungActionMenu: React.FC<{
  row: any;
  rowIndex?: number;
  onOpenBestellungPreview: (id: string | number) => void;
  onMarkProcessing: (id: string | number) => void;
}> = ({
  row,
  rowIndex,
  onOpenBestellungPreview,
  onMarkProcessing,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const currentStatus = row.status || "draft";
  const isBottom = rowIndex !== undefined && rowIndex >= 5;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all shadow-xs cursor-pointer ${
          isOpen
            ? "border-[#8CC21B] bg-lime-50 text-[#8CC21B] ring-2 ring-[#8CC21B]/20"
            : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900"
        }`}
        title="Aktionen"
      >
        <ChevronRight
          className={`w-4 h-4 transition-transform duration-150 ${
            isOpen ? "rotate-90 text-[#8CC21B]" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 ${
            isBottom ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 z-50 text-left divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-100 font-poppins`}
        >
          {currentStatus === "draft" && (
            <div className="p-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onMarkProcessing(row.id);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-[4px] shrink-0">
                  Processing
                </span>
                <span className="text-xs font-semibold">Mark Processing</span>
              </button>
            </div>
          )}

          <div className="p-1">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                setIsOpen(false);
                try {
                  await downloadCustomerOrderPdf(row.id, row.order_no);
                } catch (_) {}
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-xs font-semibold">PDF öffnen</span>
            </button>
          </div>

          <div className="p-1">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                setIsOpen(false);
                try {
                  await downloadCustomerOrderEml(row.id, row.order_no);
                } catch (_) {}
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4 text-[#8CC21B] shrink-0" />
              <span className="text-xs font-semibold">PDF in Email</span>
            </button>
          </div>

          <div className="p-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onOpenBestellungPreview(row.id);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="text-xs font-semibold">Bestellung öffnen</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface BestellungColumnsArgs {
  expandedDocIds: Set<string | number>;
  setExpandedDocIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  onOpenBestellungPreview: (id: string | number) => void;
  onMarkProcessing: (id: string | number) => void;
  gtechHkDisplayName?: string;
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

const getZweckBadgeStyle = (zweck: string) => {
  switch (zweck) {
    case "direkt":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "periodisch":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "ReserveEU":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "ReserveCN":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200";
  }
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
  gtechHkDisplayName,
}: BestellungColumnsArgs): ColumnDef<any>[] {
  return [
    buildExpandColumn(expandedDocIds, setExpandedDocIds),
    {
      header: "Datum",
      width: "65px",
      align: "center",
      render: (row) => {
        const rawDate =
          row.date_created || row.createdAt || row.created_at;
        if (
          typeof rawDate === "string" &&
          /^\d{2}\.\d{2}\.\d{4}$/.test(rawDate)
        ) {
          const [d, m] = rawDate.split(".");
          return <span className="text-xs text-gray-800 font-normal">{`${d}.${m}.`}</span>;
        }
        return (
          <span className="text-xs text-gray-800 font-normal">
            {rawDate ? formatDate(rawDate) : "—"}
          </span>
        );
      },
    },
    {
      header: "Nr",
      width: "85px",
      align: "center",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenBestellungPreview(row.id);
          }}
          className="text-green-600 hover:underline font-semibold whitespace-nowrap text-xs cursor-pointer truncate max-w-[85px]"
          title={row.order_no || "N/A"}
        >
          {row.order_no || "N/A"}
        </button>
      ),
    },
    {
      header: "Kunde",
      width: "115px",
      align: "left",
      render: (row) => {
        const text =
          row.customerSnapshot?.displayName ||
          row.customerSnapshot?.display_name ||
          row.customer?.displayName ||
          row.customer?.display_name ||
          row.customerSnapshot?.companyName ||
          row.customer?.company_name ||
          row.customer?.companyName ||
          row.customer?.name ||
          row.customer_name ||
          row.supplier?.displayName ||
          row.supplier?.display_name ||
          row.supplier?.name ||
          row.customerSnapshot?.legalName ||
          row.customer?.legalName ||
          "—";
        return (
          <div
            className="truncate max-w-[115px] text-xs font-semibold text-gray-900"
            title={text}
          >
            {text}
          </div>
        );
      },
    },
    {
      header: "Titel",
      width: "185px",
      align: "left",
      render: (row) => {
        const titleStr = String(
          row.title ||
          row.orderItems?.[0]?.itemName ||
          row.items?.[0]?.name ||
          row.items?.[0]?.itemName ||
          ""
        ).trim();
        const displayTitle = formatTitel35(row);
        return (
          <div className="flex items-center gap-1 max-w-[185px] truncate">
            <span
              className="truncate text-xs text-gray-600 font-normal"
              title={titleStr || "—"}
            >
              {displayTitle}
            </span>
            <CommentIcons row={row} />
          </div>
        );
      },
    },
    {
      header: "Zweck",
      width: "85px",
      align: "center",
      render: (row) => {
        const zweck = row.zweck || "direkt";
        return (
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold inline-block whitespace-nowrap ${getZweckBadgeStyle(
              zweck,
            )}`}
          >
            {zweck}
          </span>
        );
      },
    },
    {
      header: "Lieferort",
      width: "110px",
      align: "left",
      render: (row) => {
        const text = formatLieferort(row);
        return (
          <div
            className="truncate max-w-[110px] text-xs text-gray-600 font-normal"
            title={text}
          >
            {text}
          </div>
        );
      },
    },
    {
      header: "Lieferdatum",
      width: "75px",
      align: "center",
      render: (row) => {
        const raw = row.date_delivery || row.deliveryDate;
        if (!raw) return <span className="text-gray-400 font-normal text-xs">—</span>;
        if (typeof raw === "string" && /^\d{2}\.\d{2}\.\d{4}$/.test(raw)) {
          const [d, m] = raw.split(".");
          return <span className="text-xs text-gray-600 font-normal">{`${d}.${m}.`}</span>;
        }
        return <span className="text-xs text-gray-600 font-normal">{formatDate(raw)}</span>;
      },
    },
    {
      header: "Bestellwert netto",
      width: "95px",
      align: "right",
      render: (row) => {
        const val = valueNetCalc(row);
        return (
          <span className="text-xs font-bold text-gray-900">
            {`${val.toLocaleString("de-DE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} €`}
          </span>
        );
      },
    },
    {
      header: "Receiver",
      width: "145px",
      align: "left",
      render: (row) => {
        const text =
          row.receiver === "Supplier"
            ? formatSupplierDisplayName(row.supplier)
            : gtechHkDisplayName || row.receiver || "";
        return (
          <div
            className="truncate max-w-[145px] text-xs text-gray-600 font-normal"
            title={text}
          >
            {text}
          </div>
        );
      },
    },
    {
      header: "Status",
      width: "75px",
      align: "center",
      render: (row: any) => {
        const currentStatus = row.status || "draft";
        return (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-600 font-medium capitalize whitespace-nowrap"
          >
            {currentStatus}
          </span>
        );
      },
    },
    {
      header: "",
      width: "45px",
      align: "center",
      render: (row, index) => (
        <BestellungActionMenu
          row={row}
          rowIndex={index}
          onOpenBestellungPreview={onOpenBestellungPreview}
          onMarkProcessing={onMarkProcessing}
        />
      ),
    },
  ];
}

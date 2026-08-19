"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ChevronRight,
  ShoppingCart,
  Truck,
  Copy,
  FileText,
} from "lucide-react";
import { downloadCustomerOrderPdf } from "@/api/customer_orders";
import { ColumnDef } from "@/components/UI/DataTable";
import {
  buildExpandColumn,
  datumColumn,
  kundeColumn,
  titelColumn,
  lieferortColumn,
  lieferdatumColumn,
  buildNettowertColumn,
} from "./sharedColumns";

interface AuftragColumnsArgs {
  expandedDocIds: Set<string | number>;
  setExpandedDocIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  onOpenAuftragPreview: (id: string | number) => void;
  onConvertToBestellung: (row: any) => void;
  onGenerateRechnung: (row: any) => void;
  onDuplicateAuftrag?: (row: any) => void;
  /**
   * The "Generated N times" badge in the original page reads from the
   * legacy `invoices` array. That array is never populated anywhere in the
   * app (getAllInvoices is imported but never called), so this has always
   * evaluated to an empty list and the badge has always shown "not yet
   * converted". Passing [] here from page.tsx preserves that exact
   * behavior. Wiring a real invoice list back in later is a one-line
   * change at the call site, not a rewrite of this file.
   */
  invoices: any[];
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

const itemCountCalc = (row: any) => row.items?.length || 0;

/**
 * Sum of open quantity across all line items on this Auftrag — the
 * "QTY Open" column. openQuantity is computed backend-side
 * (getAllCustomerOrders -> attachDeliveredQuantityToOrders in
 * customer_orders_controller.ts) from rechnung_item — quantity itself is
 * the fixed ordered amount and is never mutated. Falls back to deriving
 * it locally from deliveredQuantity, and finally to quantity itself, in
 * case a cached/stale row predates that field.
 */
const qtyOpenCalc = (row: any) =>
  (row.items || []).reduce((sum: number, it: any) => {
    if (it.openQuantity !== undefined) {
      return sum + (Number(it.openQuantity) || 0);
    }
    const ordered = Number(it.quantity ?? it.qty) || 0;
    const delivered = Number(it.deliveredQuantity) || 0;
    return sum + Math.max(0, ordered - delivered);
  }, 0);

/**
 * Row-background color per Auftrag status, used for the status highlighting
 * in the Auftrag table. Kept in one place so the table color and any
 * legend/filter UI can't drift out of sync.
 */
export const getStatusBackgroundColor = (status: string): string => {
  if (status === "partially_delivered") {
    return "#ccc";
  }
  if (status === "open") {
    return "#FFFFFF";
  }
  if (status === "delivered") {
    return "#F3F4F6";
  }
  if (status === "closed") {
    return "#6C757D";
  }
  return "#FFFFFF";
};

const getRowStatus = (row: any): string => {
  return row.auftrag_status || row.status || "open";
};

/** Human-readable labels for the four Auftrag statuses, for filter
 * dropdowns and any other UI that needs to present them to a user. */
export const AUFTRAG_STATUS_LABELS: Record<string, string> = {
  partially_delivered: "Partially Delivered",
  open: "Open",
  delivered: "Delivered",
  closed: "Closed",
};

/** Options list (in table sort order) for an Auftrag-status filter dropdown. */
export const AUFTRAG_STATUS_FILTER_OPTIONS = [
  "partially_delivered",
  "open",
  "delivered",
  "closed",
].map((value) => ({ value, label: AUFTRAG_STATUS_LABELS[value] }));

/**
 * Sort priority for Auftrag rows: partially delivered first, then open,
 * then delivered, then closed. Unrecognized/missing statuses sort with
 * "open" so new or malformed rows don't silently jump to the top/bottom.
 */
const STATUS_SORT_PRIORITY: Record<string, number> = {
  partially_delivered: 0,
  open: 1,
  delivered: 2,
  closed: 3,
};

export function getAuftragStatusSortPriority(row: any): number {
  const status = getRowStatus(row);
  return status in STATUS_SORT_PRIORITY ? STATUS_SORT_PRIORITY[status] : 1;
}

/**
 * Returns a new array of Auftrag rows sorted by status: Partially
 * Delivered -> Open -> Delivered -> Closed. Stable for rows sharing the
 * same status (preserves their existing relative order, e.g. by date).
 *
 * Must be applied to the FULL list before pagination, not to a single
 * already-paginated page — sorting a page slice only reorders the ~10
 * items on that page and leaves which items landed on which page decided
 * by whatever the list was ordered by before (date), which defeats the
 * point of a status-based sort across the whole list.
 */
export function sortAuftraegeByStatus<
  T extends { auftrag_status?: string; status?: string },
>(rows: T[]): T[] {
  return [...rows]
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const diff =
        getAuftragStatusSortPriority(a.row) -
        getAuftragStatusSortPriority(b.row);
      return diff !== 0 ? diff : a.index - b.index;
    })
    .map(({ row }) => row);
}

/**
 * Once an Auftrag is Delivered or Closed, it can no longer be converted
 * to a Bestellung or have a Rechnung/Lieferschein generated from it.
 */
const isAuftragActionLocked = (row: any): boolean => {
  const status = getRowStatus(row);
  return status === "delivered" || status === "closed";
};

const AuftragActionMenu: React.FC<{
  row: any;
  rowIndex?: number;
  invoices: any[];
  onConvertToBestellung: (row: any) => void;
  onGenerateRechnung: (row: any) => void;
  onDuplicateAuftrag?: (row: any) => void;
}> = ({
  row,
  rowIndex,
  invoices,
  onConvertToBestellung,
  onGenerateRechnung,
  onDuplicateAuftrag,
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

  const rechnungCount = (invoices || []).filter(
    (inv: any) =>
      (inv.orderNumber &&
        String(inv.orderNumber).trim().toLowerCase() ===
          String(row.order_no || "")
            .trim()
            .toLowerCase()) ||
      (inv.order_number &&
        String(inv.order_number).trim().toLowerCase() ===
          String(row.order_no || "")
            .trim()
            .toLowerCase()) ||
      (inv.auftrag_no &&
        String(inv.auftrag_no).trim().toLowerCase() ===
          String(row.order_no || "")
            .trim()
            .toLowerCase()) ||
      (row.id && (inv.auftrag_id === row.id || inv.auftragId === row.id)),
  ).length;

  const isLocked = isAuftragActionLocked(row);
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
          } w-60 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 z-50 text-left divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-100 font-poppins`}
        >
          {/* Option 1: In Bestellung umwandeln */}
          <div className="p-1">
            <button
              type="button"
              disabled={isLocked}
              onClick={(e) => {
                e.stopPropagation();
                if (isLocked) return;
                setIsOpen(false);
                onConvertToBestellung(row);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                isLocked
                  ? "opacity-50 cursor-not-allowed text-gray-400"
                  : "hover:bg-gray-50 text-gray-700 hover:text-gray-900 cursor-pointer"
              }`}
              title={
                isLocked
                  ? "Auftrag is delivered/closed"
                  : "In Bestellung umwandeln"
              }
            >
              <ShoppingCart className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="text-xs font-semibold">
                In Bestellung umwandeln
              </span>
            </button>
          </div>

          {/* Option 2: Ausliefern - Erstellt Rechnung & Lieferschein */}
          <div className="p-1">
            <button
              type="button"
              disabled={isLocked}
              onClick={(e) => {
                e.stopPropagation();
                if (isLocked) return;
                setIsOpen(false);
                onGenerateRechnung(row);
              }}
              className={`w-full flex items-start gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                isLocked
                  ? "opacity-50 cursor-not-allowed text-gray-400"
                  : "hover:bg-gray-50 text-gray-700 hover:text-gray-900 cursor-pointer"
              }`}
              title={
                isLocked
                  ? "Auftrag is delivered/closed"
                  : "Ausliefern - Rechnung & Lieferschein"
              }
            >
              <Truck className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold">Ausliefern</div>
                <div className="text-[10px] text-gray-400 font-normal leading-tight">
                  Erstellt Rechnung & Lieferschein
                </div>
              </div>
              {rechnungCount > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gray-100 text-gray-600 rounded-full border border-gray-200 shrink-0">
                  {rechnungCount}
                </span>
              )}
            </button>
          </div>

          {/* Option 3: Auftrag duplizieren */}
          {onDuplicateAuftrag && (
            <div className="p-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onDuplicateAuftrag(row);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-xs font-semibold">
                  Auftrag duplizieren
                </span>
              </button>
            </div>
          )}

          {/* Option 4: PDF öffnen */}
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
              <FileText className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="text-xs font-semibold">PDF öffnen</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export function buildAuftragColumns({
  expandedDocIds,
  setExpandedDocIds,
  onOpenAuftragPreview,
  onConvertToBestellung,
  onGenerateRechnung,
  onDuplicateAuftrag,
  invoices,
}: AuftragColumnsArgs): ColumnDef<any>[] {
  return [
    buildExpandColumn(expandedDocIds, setExpandedDocIds),
    datumColumn,
    {
      header: "Nr",
      width: "110px",
      align: "center",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenAuftragPreview(row.id);
          }}
          className="text-green-600 hover:underline font-semibold whitespace-nowrap text-sm cursor-pointer"
        >
          {row.order_no || "N/A"}
        </button>
      ),
    },
    kundeColumn,
    titelColumn,
    lieferortColumn,
    lieferdatumColumn,
    buildNettowertColumn(valueNetCalc),
    {
      header: "QTY Open",
      width: "80px",
      align: "center",
      render: (row) => (
        <span className="text-sm font-semibold text-gray-900">
          {qtyOpenCalc(row)}
        </span>
      ),
    },
    {
      header: "Status",
      width: "90px",
      align: "center",
      render: (row) => {
        const status = getRowStatus(row);
        const label = AUFTRAG_STATUS_LABELS[status] || status;
        const colorClasses: Record<string, string> = {
          open: "bg-blue-50 text-blue-600 border-blue-200",
          partially_delivered: "bg-amber-50 text-amber-600 border-amber-200",
          delivered: "bg-emerald-50 text-emerald-600 border-emerald-200",
          closed: "bg-gray-100 text-gray-600 border-gray-200",
        };
        return (
          <span
            className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${
              colorClasses[status] || "bg-blue-50 text-blue-600 border-blue-200"
            }`}
          >
            {label}
          </span>
        );
      },
    },
    {
      header: "Aktionen",
      width: "55px",
      align: "center",
      render: (row, index) => (
        <AuftragActionMenu
          row={row}
          rowIndex={index}
          invoices={invoices}
          onConvertToBestellung={onConvertToBestellung}
          onGenerateRechnung={onGenerateRechnung}
          onDuplicateAuftrag={onDuplicateAuftrag}
        />
      ),
    },
  ];
}

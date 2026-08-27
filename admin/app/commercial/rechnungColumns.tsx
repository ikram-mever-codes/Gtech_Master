"use client";

import React, { useState, useEffect, useRef } from "react";
import { Loader2, FileDown, ChevronRight, FileText, Mail } from "lucide-react";
import { downloadRechnungPdf, downloadRechnungEml } from "@/api/rechnungen";
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

interface RechnungColumnsArgs {
  expandedDocIds: Set<string | number>;
  setExpandedDocIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  onViewRechnung: (row: any) => void;
  onCreateRechnungK: (row: any) => void; // This will open the modal with correction form
  creatingRkForId: string | null;
  allOpenQuantities?: Record<string, Record<string, number>>;
  rechnungenK?: any[];
}

const valueNetCalc = (row: any) => Number(row.netTotal || row.grossTotal || 0);
const itemCountCalc = (row: any) =>
  row.customItemCount ?? row.items?.length ?? 0;

/**
 * Row-background color per Rechnung payment status, mirroring
 * getStatusBackgroundColor in auftragColumns.tsx so both tables follow
 * the same "status drives row color" convention.
 */
export const getRechnungStatusBackgroundColor = (status: string): string => {
  if (status === "paid") {
    return "#DFF0D8";
  }
  if (status === "partially_paid") {
    return "#FFF3CD";
  }
  if (status === "overdue") {
    return "#F8D7DA";
  }
  // "unpaid" and anything unrecognized — no background.
  return "#FFFFFF";
};

export const RECHNUNG_PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  partially_paid: "Partially Paid",
  unpaid: "Unpaid",
  overdue: "Overdue",
};

/** Options list for a Rechnung payment-status filter dropdown. */
export const RECHNUNG_PAYMENT_STATUS_FILTER_OPTIONS = [
  "overdue",
  "partially_paid",
  "unpaid",
  "paid",
].map((value) => ({ value, label: RECHNUNG_PAYMENT_STATUS_LABELS[value] }));

const PaymentStatusBadge: React.FC<{ row: any }> = ({ row }) => {
  const status = row.payment_status || "unpaid";
  const label = RECHNUNG_PAYMENT_STATUS_LABELS[status] || status;
  const classes: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-800 border-emerald-300",
    partially_paid: "bg-amber-100 text-amber-800 border-amber-300",
    unpaid: "bg-gray-100 text-gray-600 border-gray-300",
    overdue: "bg-rose-100 text-rose-800 border-rose-300",
  };
  return (
    <span
      className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase whitespace-nowrap ${classes[status] || classes.unpaid
        }`}
      title={
        row.paid_amount !== undefined
          ? `Paid: ${Number(row.paid_amount).toFixed(2)} / Open: ${Number(row.open_amount ?? 0).toFixed(2)}`
          : undefined
      }
    >
      {label}
    </span>
  );
};

const RechnungActionMenu: React.FC<{
  row: any;
  rowIndex?: number;
  onViewRechnung: (row: any) => void;
  onCreateRechnungK: (row: any) => void;
  creatingRkForId: string | null;
}> = ({
  row,
  rowIndex,
  onViewRechnung,
  onCreateRechnungK,
  creatingRkForId,
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

    const isCreatingRk = creatingRkForId === row.id;
    const isBottom = rowIndex !== undefined && rowIndex >= 5;

    return (
      <div className="relative inline-block text-left" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all shadow-xs cursor-pointer ${isOpen
              ? "border-[#8CC21B] bg-lime-50 text-[#8CC21B] ring-2 ring-[#8CC21B]/20"
              : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900"
            }`}
          title="Aktionen"
        >
          <ChevronRight
            className={`w-4 h-4 transition-transform duration-150 ${isOpen ? "rotate-90 text-[#8CC21B]" : ""
              }`}
          />
        </button>

        {isOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute right-0 ${isBottom ? "bottom-full mb-1.5" : "top-full mt-1.5"
              } w-60 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 z-50 text-left divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-100 font-poppins`}
          >
            {/* Option 1: Rechnungskorrektur erstellen */}
            <div className="p-1">
              <button
                type="button"
                disabled={isCreatingRk}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onCreateRechnungK(row);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
              >
                {isCreatingRk ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#8CC21B] shrink-0" />
                ) : (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#8CC21B] text-white rounded-[4px] shrink-0">
                    +RK
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold">
                    Rechnungskorrektur (+RK)
                  </span>
                </div>
              </button>
            </div>

            {/* Option 2: PDF öffnen */}
            <div className="p-1">
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  try {
                    await downloadRechnungPdf(
                      row.id,
                      row.invoiceNumber || row.invoice_number,
                    );
                  } catch (_) { }
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
                    await downloadRechnungEml(
                      row.id,
                      row.invoiceNumber || row.invoice_number,
                    );
                  } catch (_) { }
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <Mail className="w-4 h-4 text-[#8CC21B] shrink-0" />
                <span className="text-xs font-semibold">PDF in Email</span>
              </button>
            </div>

            {/* Option 3: Rechnung öffnen */}
            <div className="p-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onViewRechnung(row);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-xs font-semibold">Rechnung öffnen</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

export function buildRechnungColumns({
  expandedDocIds,
  setExpandedDocIds,
  onViewRechnung,
  onCreateRechnungK,
  creatingRkForId,
  allOpenQuantities,
  rechnungenK,
}: RechnungColumnsArgs): ColumnDef<any>[] {
  return [
    buildExpandColumn(expandedDocIds, setExpandedDocIds),
    datumColumn,
    {
      header: "Nr",
      width: "110px",
      align: "center",
      render: (row) => {
        const rowOpenQuantities = allOpenQuantities?.[row.id] || {};
        const isFullyCorrected =
          row.items?.length > 0 &&
          row.items?.every((item: any) => {
            const itemOpenQty = rowOpenQuantities[item.id] || 0;
            return itemOpenQty <= 0;
          });

        const hasRk =
          isFullyCorrected ||
          row.hasRk ||
          row.has_rk ||
          (rechnungenK || []).some(
            (rk: any) =>
              String(rk.rechnungId || rk.rechnung_id || rk.invoiceId || rk.invoice_id) === String(row.id)
          );

        return (
          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
            {hasRk && (
              <span
                className="px-1.5 py-0.5 text-[10px] font-extrabold bg-[#FF6B00] text-white rounded-[4px] uppercase tracking-wider shrink-0 shadow-xs"
                title="Rechnungskorrektur vorhanden"
              >
                RK
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewRechnung(row);
              }}
              className="truncate text-green-600 font-semibold hover:underline cursor-pointer"
              title={row.invoiceNumber || row.id}
            >
              {row.invoiceNumber || row.id}
            </button>
          </div>
        );
      },
    },
    kundeColumn,
    titelColumn,
    lieferortColumn,
    lieferdatumColumn,
    buildNettowertColumn(valueNetCalc),
    {
      header: "Status",
      width: "100px",
      align: "center",
      render: (row) => <PaymentStatusBadge row={row} />,
    },
    {
      header: "",
      width: "45px",
      align: "center",
      render: (row, index) => (
        <RechnungActionMenu
          row={row}
          rowIndex={index}
          onViewRechnung={onViewRechnung}
          onCreateRechnungK={onCreateRechnungK}
          creatingRkForId={creatingRkForId}
        />
      ),
    },
  ];
}

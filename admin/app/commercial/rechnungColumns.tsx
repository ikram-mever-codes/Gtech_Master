"use client";

import React from "react";
import { Loader2, FileDown } from "lucide-react";
import { downloadRechnungPdf } from "@/api/rechnungen";
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
      className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase whitespace-nowrap ${
        classes[status] || classes.unpaid
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

export function buildRechnungColumns({
  expandedDocIds,
  setExpandedDocIds,
  onViewRechnung,
  onCreateRechnungK,
  creatingRkForId,
}: RechnungColumnsArgs): ColumnDef<any>[] {
  return [
    buildExpandColumn(expandedDocIds, setExpandedDocIds),
    datumColumn,
    {
      header: "Nr",
      width: "80px",
      align: "center",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewRechnung(row);
          }}
          className="truncate max-w-[80px] text-green-600 font-semibold hover:underline cursor-pointer"
          title={row.invoiceNumber || row.id}
        >
          {row.invoiceNumber || row.id}
        </button>
      ),
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
      header: "Aktionen",
      width: "100px",
      align: "center",
      render: (row) => {
        const isCreatingRk = creatingRkForId === row.id;
        return (
          <div className="flex items-center justify-center gap-1 font-poppins">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // This opens the Rechnung detail modal with the correction form
                onCreateRechnungK(row);
              }}
              disabled={isCreatingRk}
              className="px-2 py-0.5 text-[10px] font-bold bg-[#8CC21B] text-white rounded-[4px] hover:bg-[#7ab318] transition shadow-xs disabled:opacity-50 flex items-center gap-1 cursor-pointer"
            >
              {isCreatingRk ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                "+RK"
              )}
            </button>

            <button
              title="Download Rechnung PDF"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await downloadRechnungPdf(
                    row.id,
                    row.invoiceNumber || row.invoice_number,
                  );
                } catch (_) {}
              }}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-[4px] transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileDown className="h-3 w-3" /> PDF
            </button>
          </div>
        );
      },
    },
  ];
}

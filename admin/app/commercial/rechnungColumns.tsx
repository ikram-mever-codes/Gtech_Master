"use client";

import React from "react";
import { Loader2, FileDown } from "lucide-react";
import { downloadRechnungPdf } from "@/api/rechnungen";
import { ColumnDef } from "@/components/UI/DataTable";
import {
  buildExpandColumn,
  dateCreatedColumn,
  companyColumn,
  personColumn,
  postalCodeColumn,
  cityColumn,
  buildValueNetColumn,
  buildItemCountColumn,
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
    dateCreatedColumn,
    {
      header: "No",
      width: "110px",
      align: "center",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewRechnung(row);
          }}
          className="truncate max-w-[110px] text-[#8CC21B] font-semibold hover:underline cursor-pointer"
          title={row.invoiceNumber || row.id}
        >
          {row.invoiceNumber || row.id}
        </button>
      ),
    },
    companyColumn,
    personColumn,
    postalCodeColumn,
    cityColumn,
    buildValueNetColumn(valueNetCalc),
    buildItemCountColumn(itemCountCalc),
    {
      header: "Payment",
      width: "120px",
      align: "center",
      render: (row) => <PaymentStatusBadge row={row} />,
    },
    {
      header: "Actions",
      width: "100px",
      align: "center",
      render: (row) => {
        const isCreatingRk = creatingRkForId === row.id;
        return (
          <div className="flex items-center justify-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // This opens the Rechnung detail modal with the correction form
                onCreateRechnungK(row);
              }}
              disabled={isCreatingRk}
              className="px-2 py-1 text-[10px] font-bold bg-[#8CC21B] text-white rounded-[4px] hover:bg-[#7ab318] transition shadow-md disabled:opacity-50 flex items-center gap-1"
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
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-[4px] transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileDown className="h-3.5 w-3.5" /> PDF
            </button>
          </div>
        );
      },
    },
  ];
}

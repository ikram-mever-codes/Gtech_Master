"use client";

import React from "react";
import { MoveRight, FileDown } from "lucide-react";
import { downloadCustomerOrderPdf } from "@/api/customer_orders";
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

interface AuftragColumnsArgs {
  expandedDocIds: Set<string | number>;
  setExpandedDocIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  onOpenAuftragPreview: (id: string | number) => void;
  onConvertToBestellung: (row: any) => void;
  onGenerateRechnung: (row: any) => void;
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

export const getStatusBackgroundColor = (status: string): string => {
  if (status === "partially_delivered") {
    return "#E5B080";
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

export function buildAuftragColumns({
  expandedDocIds,
  setExpandedDocIds,
  onOpenAuftragPreview,
  onConvertToBestellung,
  onGenerateRechnung,
  invoices,
}: AuftragColumnsArgs): ColumnDef<any>[] {
  return [
    buildExpandColumn(expandedDocIds, setExpandedDocIds),
    dateCreatedColumn,
    {
      header: "No",
      width: "100px",
      align: "center",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenAuftragPreview(row.id);
          }}
          className="text-green-600 hover:underline font-semibold"
        >
          {row.order_no || "N/A"}
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
      header: "Actions",
      width: "160px",
      align: "center",
      render: (row) => {
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
        const isConverted = rechnungCount > 0;
        const status = getRowStatus(row);
        const isClosed = status === "closed";

        return (
          <div className="flex items-center justify-center gap-1.5 font-poppins">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConvertToBestellung(row);
              }}
              title="Convert Auftrag directly to Bestellung"
              className="px-2 py-1 text-[10px] font-bold bg-[#8CC21B] text-white rounded-[4px] hover:bg-[#7ab015] transition shadow-md flex items-center gap-1"
            >
              <MoveRight className="w-3.5 h-3.5" />
              <span>Convert</span>
            </button>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateRechnung(row);
                }}
                title={
                  isConverted
                    ? `Generated ${rechnungCount} time${rechnungCount > 1 ? "s" : ""} to Rechnung/Lieferschein`
                    : "Generate Rechnung & Lieferschein"
                }
                className={`px-2 py-1 text-[10px] font-bold text-white rounded-[4px] transition shadow-md flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  isConverted
                    ? "bg-gray-500 hover:bg-gray-600 text-white"
                    : "bg-[#2F6B46] hover:bg-[#255638] text-white"
                }`}
              >
                <MoveRight className="w-3.5 h-3.5" />
              </button>

              {rechnungCount > 0 && (
                <span
                  title={`Generated ${rechnungCount} time${rechnungCount > 1 ? "s" : ""}`}
                  className="px-1.5 py-0.5 text-[9px] font-black bg-gray-200 text-gray-700 rounded-full border border-gray-300 shadow-sm shrink-0"
                >
                  {rechnungCount}
                </span>
              )}
            </div>

            <button
              title="Download Auftrag PDF"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await downloadCustomerOrderPdf(row.id, row.order_no);
                } catch (_) {}
              }}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-[4px] transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileDown className="h-3.5 w-3.5" /> PDF
            </button>

            {!isClosed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // This will trigger the close action in the parent
                  const event = new CustomEvent("closeAuftrag", {
                    detail: row,
                  });
                  document.dispatchEvent(event);
                }}
                title="Close Auftrag"
                className="px-2 py-1 text-[10px] font-bold bg-gray-600 hover:bg-gray-700 text-white rounded-[4px] transition shadow-md flex items-center gap-1"
              >
                Close
              </button>
            )}
          </div>
        );
      },
    },
  ];
}

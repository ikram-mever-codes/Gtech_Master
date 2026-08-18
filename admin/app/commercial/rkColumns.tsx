"use client";

import React from "react";
import { FileDown } from "lucide-react";
import { downloadRechnungKPdf } from "@/api/rechnungen_k";
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

interface RkColumnsArgs {
  expandedDocIds: Set<string | number>;
  setExpandedDocIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  onView: (row: any) => void;
}

const valueNetCalc = (row: any) => Number(row.netTotal || row.grossTotal || 0);

export function buildRkColumns({
  expandedDocIds,
  setExpandedDocIds,
  onView,
}: RkColumnsArgs): ColumnDef<any>[] {
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
            onView(row);
          }}
          className="truncate max-w-[80px] text-green-600 font-semibold hover:underline cursor-pointer"
          title={row.invoiceNumber || row.order_no || row.id}
        >
          {row.invoiceNumber || row.order_no || row.id}
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
      width: "90px",
      align: "center",
      render: (row) => (
        <span className="text-[11px] px-2 py-0.5 rounded border shadow-xs font-medium bg-rose-50 text-rose-700 border-rose-200 uppercase">
          {row.status || "RK"}
        </span>
      ),
    },
    {
      header: "Aktionen",
      width: "90px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1 font-poppins">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView(row);
            }}
            className="px-2 py-0.5 text-[10px] font-bold bg-[#2F6B46] text-white rounded-[4px] hover:bg-[#255638] transition shadow-xs cursor-pointer"
          >
            View
          </button>
          <button
            title="Download Rechnungskorrektur PDF"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await downloadRechnungKPdf(
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
      ),
    },
  ];
}

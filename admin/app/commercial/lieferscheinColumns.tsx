"use client";

import React from "react";
import { FileDown } from "lucide-react";
import { downloadLieferscheinPdf } from "@/api/lieferscheine";
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

interface LieferscheinColumnsArgs {
  expandedDocIds: Set<string | number>;
  setExpandedDocIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  onView: (row: any) => void;
}

export function buildLieferscheinColumns({
  expandedDocIds,
  setExpandedDocIds,
  onView,
}: LieferscheinColumnsArgs): ColumnDef<any>[] {
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
          title={row.deliveryNoteNo || row.id}
        >
          {row.deliveryNoteNo || row.id}
        </button>
      ),
    },
    kundeColumn,
    titelColumn,
    lieferortColumn,
    lieferdatumColumn,
    buildNettowertColumn((row) =>
      Number(row.subtotal || row.netTotal || row.total_amount || 0),
    ),
    {
      header: "Status",
      width: "100px",
      align: "center",
      render: (row) => {
        const status = row.status || "open";
        const getStatusColor = (status: string) => {
          switch (status?.toLowerCase()) {
            case "open":
              return "bg-blue-50 text-blue-700 border-blue-200";
            case "in progress":
            case "processing":
              return "bg-amber-50 text-amber-700 border-amber-200";
            case "completed":
            case "delivered":
              return "bg-emerald-50 text-emerald-700 border-emerald-200";
            case "cancelled":
              return "bg-rose-50 text-rose-700 border-rose-200";
            default:
              return "bg-gray-100 text-gray-700 border-gray-200";
          }
        };
        return (
          <span
            className={`text-[11px] px-2 py-0.5 rounded border shadow-xs font-medium ${getStatusColor(
              status,
            )}`}
          >
            {status}
          </span>
        );
      },
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
            className="px-2 py-0.5 text-[10px] font-bold bg-[#2F6B46] hover:bg-[#255638] text-white rounded-[4px] transition shadow-xs cursor-pointer"
          >
            View
          </button>

          <button
            title="Download Lieferschein PDF"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await downloadLieferscheinPdf(
                  row.id,
                  row.deliveryNoteNo || row.delivery_note_number,
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
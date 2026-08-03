"use client";

import React from "react";
import { Loader2 } from "lucide-react";
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
  onCreateRechnungK: (row: any) => void;
  creatingRkForId: string | null;
  onViewRechnung: (row: any) => void; // New: view handler for Rechnung
}

const valueNetCalc = (row: any) => Number(row.netTotal || row.grossTotal || 0);
const itemCountCalc = (row: any) =>
  row.customItemCount ?? row.items?.length ?? 0;

export function buildRechnungColumns({
  expandedDocIds,
  setExpandedDocIds,
  onCreateRechnungK,
  creatingRkForId,
  onViewRechnung,
}: RechnungColumnsArgs): ColumnDef<any>[] {
  return [
    buildExpandColumn(expandedDocIds, setExpandedDocIds),
    dateCreatedColumn,
    {
      // Clickable invoice number that opens the Rechnung detail
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
          </div>
        );
      },
    },
  ];
}

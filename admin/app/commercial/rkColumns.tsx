"use client";

import React from "react";
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

interface RkColumnsArgs {
  expandedDocIds: Set<string | number>;
  setExpandedDocIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  onView: (row: any) => void;
  onDelete: (row: any) => void;
}

const valueNetCalc = (row: any) => Number(row.netTotal || row.grossTotal || 0);
const itemCountCalc = (row: any) =>
  row.customItemCount ?? row.items?.length ?? 0;

export function buildRkColumns({
  expandedDocIds,
  setExpandedDocIds,
  onView,
  onDelete,
}: RkColumnsArgs): ColumnDef<any>[] {
  return [
    buildExpandColumn(expandedDocIds, setExpandedDocIds),
    dateCreatedColumn,
    {
      // Clickable RK number that opens the RK detail
      header: "No",
      width: "110px",
      align: "center",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(row);
          }}
          className="truncate max-w-[110px] text-[#8CC21B] font-semibold hover:underline cursor-pointer"
          title={row.invoiceNumber || row.order_no || row.id}
        >
          {row.invoiceNumber || row.order_no || row.id}
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
      width: "90px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row);
            }}
            className="px-2 py-1 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-[4px] transition shadow-md"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];
}

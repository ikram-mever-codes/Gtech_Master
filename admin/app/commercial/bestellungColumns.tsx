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

interface BestellungColumnsArgs {
  expandedDocIds: Set<string | number>;
  setExpandedDocIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  onOpenBestellungPreview: (id: string | number) => void;
  onMarkProcessing: (id: string | number) => void;
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
}: BestellungColumnsArgs): ColumnDef<any>[] {
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
            onOpenBestellungPreview(row.id);
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
      header: "Status",
      width: "130px",
      align: "center",
      render: (row: any) => {
        const currentStatus = row.status || "draft";
        return (
          <span
            className={`text-[11px] px-2 py-1 rounded border shadow-sm font-medium ${getStatusStyle(currentStatus)}`}
          >
            {currentStatus}
          </span>
        );
      },
    },
    {
      header: "Actions",
      width: "120px",
      align: "center",
      render: (row) => {
        const currentStatus = row.status || "draft";
        return (
          <div className="flex items-center justify-center gap-1.5 font-poppins">
            {currentStatus === "draft" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkProcessing(row.id);
                }}
                className="px-2 py-1 text-[10px] font-bold bg-blue-600 text-white rounded-[4px] hover:bg-blue-700 transition shadow-md"
              >
                Processing
              </button>
            )}
          </div>
        );
      },
    },
  ];
}

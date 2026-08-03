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

interface PaymentInboundColumnsArgs {
  expandedDocIds: Set<string | number>;
  setExpandedDocIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  onOpenDetails: (row: any) => void;
  onDelete: (row: any) => void;
}

const valueNetCalc = (row: any) => Number(row.netTotal || row.grossTotal || 0);
const itemCountCalc = (row: any) =>
  row.customItemCount ?? row.items?.length ?? 0;

export function buildPaymentInboundColumns({
  expandedDocIds,
  setExpandedDocIds,
  onOpenDetails,
  onDelete,
}: PaymentInboundColumnsArgs): ColumnDef<any>[] {
  return [
    buildExpandColumn(expandedDocIds, setExpandedDocIds),
    dateCreatedColumn,
    {
      // The original switch statement has no explicit "payment_inbound"
      // case for the "No" column — it falls through to the generic
      // invoice-details opener. Preserved exactly, including opening the
      // Rechnung-shaped modal against a payment-inbound row. See the
      // README, section 1, for the note on this behavior.
      header: "No",
      width: "100px",
      align: "center",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails(row);
          }}
          className="text-green-600 hover:underline font-semibold"
        >
          {row.invoiceNumber || String(row.id).slice(-5).toUpperCase()}
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
      width: "120px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={async (e) => {
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

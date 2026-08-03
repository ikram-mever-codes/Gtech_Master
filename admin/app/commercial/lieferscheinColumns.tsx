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
  buildItemCountColumn,
  buildViewActionColumn,
} from "./sharedColumns";

interface LieferscheinColumnsArgs {
  expandedDocIds: Set<string | number>;
  setExpandedDocIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  onView: (row: any) => void;
}

const itemCountCalc = (row: any) =>
  row.customItemCount ?? row.items?.length ?? 0;

export function buildLieferscheinColumns({
  expandedDocIds,
  setExpandedDocIds,
  onView,
}: LieferscheinColumnsArgs): ColumnDef<any>[] {
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
            onView(row);
          }}
          className="text-green-600 hover:underline font-semibold"
        >
          {row.invoiceNumber ||
            row.order_no ||
            String(row.id).slice(-5).toUpperCase()}
        </button>
      ),
    },
    companyColumn,
    personColumn,
    postalCodeColumn,
    cityColumn,
    // No Value_net column here — the original explicitly excludes it for
    // activeInvTab === "lieferschein" (`...(activeInvTab !== "lieferschein" ? [...] : [])`).
    buildItemCountColumn(itemCountCalc),
    buildViewActionColumn(onView),
  ];
}

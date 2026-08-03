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
  buildViewActionColumn,
} from "./sharedColumns";

interface RkColumnsArgs {
  expandedDocIds: Set<string | number>;
  setExpandedDocIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  onView: (row: any) => void;
}

const valueNetCalc = (row: any) => Number(row.netTotal || row.grossTotal || 0);
const itemCountCalc = (row: any) =>
  row.customItemCount ?? row.items?.length ?? 0;

export function buildRkColumns({
  expandedDocIds,
  setExpandedDocIds,
  onView,
}: RkColumnsArgs): ColumnDef<any>[] {
  return [
    buildExpandColumn(expandedDocIds, setExpandedDocIds),
    dateCreatedColumn,
    // Original rk case renders the exact same "View" button in both the
    // "No" and "Actions" slots — reusing buildViewActionColumn for both,
    // just with a different header label for the first one.
    buildViewActionColumn(onView, "No"),
    companyColumn,
    personColumn,
    postalCodeColumn,
    cityColumn,
    buildValueNetColumn(valueNetCalc),
    buildItemCountColumn(itemCountCalc),
    buildViewActionColumn(onView),
  ];
}

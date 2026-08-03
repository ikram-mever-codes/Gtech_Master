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
    dateCreatedColumn,
    {
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
          title={row.deliveryNoteNo || row.id}
        >
          {row.deliveryNoteNo || row.id}
        </button>
      ),
    },
    companyColumn,
    personColumn,
    postalCodeColumn,
    cityColumn,
    buildItemCountColumn(
      (row) => row.customItemCount ?? row.items?.length ?? 0,
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
              return "bg-blue-100 text-blue-700";
            case "in progress":
            case "processing":
              return "bg-yellow-100 text-yellow-700";
            case "completed":
            case "delivered":
              return "bg-green-100 text-green-700";
            case "cancelled":
              return "bg-red-100 text-red-700";
            default:
              return "bg-gray-100 text-gray-700";
          }
        };
        return (
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusColor(
              status,
            )}`}
          >
            {status}
          </span>
        );
      },
    },
    {
      header: "Actions",
      width: "90px",
      align: "center",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(row);
          }}
          className="px-2 py-1 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-[4px] transition shadow-md"
        >
          View
        </button>
      ),
    },
  ];
}

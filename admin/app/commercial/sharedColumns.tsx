"use client";

import React from "react";
import { ColumnDef } from "@/components/UI/DataTable";
import ExpandRowArrow from "@/components/UI/ExpandRowArrow";
import { formatDate } from "@/utils/date";
import { formatCountryCode } from "@/utils/address";

// Every column below is byte-for-byte the same render logic as the
// corresponding branch in the original single 400-line commercialColumns
// useMemo — only pulled out so each tab file only imports what it uses.

export function buildExpandColumn(
  expandedDocIds: Set<string | number>,
  setExpandedDocIds: React.Dispatch<React.SetStateAction<Set<string | number>>>,
): ColumnDef<any> {
  return {
    header: "",
    width: "36px",
    align: "center",
    render: (row) => {
      const keys = [row.id, row._id, row.order_no, row.invoiceNumber].filter(
        Boolean,
      );
      const isExpanded = keys.some((k) => expandedDocIds.has(k));
      const items = row.items || row.lineItems || [];
      const count =
        items.length > 0
          ? items.length
          : row.item_count !== undefined
            ? Number(row.item_count)
            : row.itemsCount !== undefined
              ? Number(row.itemsCount)
              : 0;
      const isEmpty = count === 0;

      return (
        <ExpandRowArrow
          isExpanded={isExpanded}
          isEmpty={isEmpty}
          title={
            isEmpty
              ? "No items in this document"
              : isExpanded
                ? "Collapse items"
                : "Expand items"
          }
          onToggle={(e) => {
            e.stopPropagation();
            setExpandedDocIds((prev) => {
              const next = new Set(prev);
              if (isExpanded) {
                keys.forEach((k) => next.delete(k));
              } else {
                keys.forEach((k) => next.add(k));
              }
              return next;
            });
          }}
        />
      );
    },
  };
}

export const dateCreatedColumn: ColumnDef<any> = {
  header: "Created",
  width: "60px",
  align: "center",
  render: (row) => {
    const rawDate =
      row.createdAt ||
      row.created_at ||
      row.date_created ||
      row.invoiceDate ||
      row.deliveryDate;
    if (typeof rawDate === "string" && /^\d{2}\.\d{2}\.\d{4}$/.test(rawDate)) {
      const [d, m] = rawDate.split(".");
      return `${d}.${m}.`;
    }
    return rawDate ? formatDate(rawDate) : "-";
  },
};

export const companyColumn: ColumnDef<any> = {
  header: "Company",
  width: "90px",
  align: "left",
  render: (row) => {
    const text =
      row.customerSnapshot?.companyName ||
      row.customerSnapshot?.name ||
      row.customer?.companyName ||
      row.customer?.name ||
      row.customer_name ||
      row.bill_to ||
      row.ship_to ||
      "N/A";
    return (
      <div className="truncate max-w-[90px]" title={text}>
        {text}
      </div>
    );
  },
};

export const personColumn: ColumnDef<any> = {
  header: "Person",
  width: "90px",
  align: "left",
  render: (row) => {
    const text =
      row.customer?.contactName ||
      row.customer?.contactPhoneNumber ||
      row.customer?.email ||
      row.customer?.contactEmail ||
      row.customer?.contactPhoneNumber ||
      row.customer?.contactName ||
      row.ship_to ||
      "-";
    return (
      <div className="truncate max-w-[90px]" title={text}>
        {text}
      </div>
    );
  },
};

export const postalCodeColumn: ColumnDef<any> = {
  header: "Postal",
  width: "55px",
  align: "center",
  render: (row) =>
    row.deliveryAddress?.postalCode ||
    row.customerSnapshot?.postalCode ||
    row.customer?.postalCode ||
    row.cargo?.customer?.postalCode ||
    row.postalCode ||
    "-",
};

export const cityColumn: ColumnDef<any> = {
  header: "City",
  width: "75px",
  align: "left",
  render: (row) => {
    const city =
      row.deliveryAddress?.city ||
      row.customerSnapshot?.city ||
      row.customer?.city ||
      row.cargo?.customer?.city ||
      row.city ||
      "";
    const country =
      row.deliveryAddress?.country ||
      row.customerSnapshot?.country ||
      row.customer?.country ||
      row.cargo?.customer?.country ||
      row.country ||
      "";
    const text =
      [city, formatCountryCode(country)].filter(Boolean).join(", ") || "-";
    return (
      <div className="truncate max-w-[75px]" title={text}>
        {text}
      </div>
    );
  },
};

export function buildValueNetColumn(
  calc: (row: any) => number,
): ColumnDef<any> {
  return {
    header: "Net",
    width: "65px",
    align: "right",
    render: (row: any) => {
      const val = calc(row);
      return `€${val.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
  };
}

export function buildItemCountColumn(
  calc: (row: any) => number,
): ColumnDef<any> {
  return {
    header: "Items",
    width: "40px",
    align: "center",
    render: (row: any) => calc(row),
  };
}

/** The "View" button was identical markup in three separate places in the
 * original (rechnung Actions, rk No + Actions, lieferschein Actions) —
 * one source of truth for it here. `header` lets rk reuse it for the "No"
 * column slot too, exactly as the original did. */
export function buildViewActionColumn(
  onView: (row: any) => void,
  header: string = "Actions",
): ColumnDef<any> {
  return {
    header,
    width: "120px",
    align: "center",
    render: (row) => (
      <div className="flex items-center justify-center gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(row);
          }}
          className="px-2 py-1 text-[10px] font-bold bg-[#2F6B46] text-white rounded-[4px] hover:bg-[#255638] transition shadow-md"
        >
          View
        </button>
      </div>
    ),
  };
}

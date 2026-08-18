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

export const formatLieferort = (row: any): string => {
  const city = (
    row.deliveryAddress?.city ||
    row.delivery_address?.city ||
    row.customerSnapshot?.city ||
    row.customer?.city ||
    row.cargo?.customer?.city ||
    row.city ||
    ""
  ).trim();
  const postal = (
    row.deliveryAddress?.postalCode ||
    row.delivery_address?.postal_code ||
    row.customerSnapshot?.postalCode ||
    row.customer?.postalCode ||
    row.cargo?.customer?.postalCode ||
    row.postalCode ||
    row.postal_code ||
    ""
  ).trim();
  const rawCountry = (
    row.deliveryAddress?.country ||
    row.delivery_address?.country ||
    row.customerSnapshot?.country ||
    row.customer?.country ||
    row.cargo?.customer?.country ||
    row.country ||
    ""
  ).trim();
  const countryCode = formatCountryCode(rawCountry);

  if (countryCode && postal && city) {
    return `${countryCode}-${postal} ${city}`;
  }
  if (countryCode && postal) {
    return `${countryCode}-${postal}`;
  }
  if (countryCode && city) {
    return `${countryCode}, ${city}`;
  }
  if (postal && city) {
    return `${postal} ${city}`;
  }
  return (
    city || postal || countryCode || row.deliveryAddress?.addressName || "—"
  );
};

export const formatTitel35 = (row: any): string => {
  const rawTitle =
    row.title ||
    row.orderItems?.[0]?.itemName ||
    row.items?.[0]?.itemName ||
    row.items?.[0]?.item_name ||
    row.items?.[0]?.name ||
    row.lineItems?.[0]?.itemName ||
    row.description ||
    "";
  const titleStr = String(rawTitle || "").trim();
  if (!titleStr) return "—";
  return titleStr.length > 35 ? titleStr.slice(0, 35) + "..." : titleStr;
};

export const datumColumn: ColumnDef<any> = {
  header: "Datum",
  width: "75px",
  align: "center",
  render: (row) => {
    const rawDate =
      row.createdAt ||
      row.created_at ||
      row.date_created ||
      row.invoiceDate ||
      row.invoice_date ||
      row.offer_date ||
      row.date;
    if (typeof rawDate === "string" && /^\d{2}\.\d{2}\.\d{4}$/.test(rawDate)) {
      const [d, m] = rawDate.split(".");
      return <span className="text-sm text-gray-800 font-normal">{`${d}.${m}.`}</span>;
    }
    return (
      <span className="text-sm text-gray-800 font-normal">
        {rawDate ? formatDate(rawDate) : "—"}
      </span>
    );
  },
};

export const dateCreatedColumn: ColumnDef<any> = datumColumn;

export const kundeColumn: ColumnDef<any> = {
  header: "Kunde",
  width: "140px",
  align: "left",
  render: (row) => {
    const text =
      row.customerSnapshot?.companyName ||
      row.customerSnapshot?.name ||
      row.customer?.company_name ||
      row.customer?.companyName ||
      row.customer?.name ||
      row.customer_name ||
      row.supplier?.name ||
      row.bill_to ||
      row.ship_to ||
      "—";
    return (
      <div
        className="truncate max-w-[140px] text-sm font-bold text-gray-900"
        title={text}
      >
        {text}
      </div>
    );
  },
};

export const companyColumn: ColumnDef<any> = kundeColumn;

export const titelColumn: ColumnDef<any> = {
  header: "Titel",
  width: "150px",
  align: "left",
  render: (row) => {
    const rawTitle =
      row.title ||
      row.orderItems?.[0]?.itemName ||
      row.items?.[0]?.itemName ||
      row.items?.[0]?.item_name ||
      row.items?.[0]?.name ||
      row.lineItems?.[0]?.itemName ||
      row.description ||
      "";
    const titleStr = String(rawTitle || "").trim();
    const displayTitle = formatTitel35(row);
    return (
      <div
        className="truncate max-w-[150px] text-sm text-gray-600 font-normal"
        title={titleStr || "—"}
      >
        {displayTitle}
      </div>
    );
  },
};

export const lieferortColumn: ColumnDef<any> = {
  header: "Lieferort",
  width: "130px",
  align: "left",
  render: (row) => {
    const text = formatLieferort(row);
    return (
      <div
        className="truncate max-w-[130px] text-sm text-gray-600 font-normal"
        title={text}
      >
        {text}
      </div>
    );
  },
};

export const lieferdatumColumn: ColumnDef<any> = {
  header: "Lieferdatum",
  width: "90px",
  align: "center",
  render: (row) => {
    const rawDate =
      row.date_delivery ||
      row.deliveryDate ||
      row.delivery_date ||
      row.real_delivery_date ||
      row.due_date ||
      row.dueDate;
    if (!rawDate) return <span className="text-gray-400 font-normal text-sm">—</span>;
    if (typeof rawDate === "string" && /^\d{2}\.\d{2}\.\d{4}$/.test(rawDate)) {
      const [d, m] = rawDate.split(".");
      return <span className="text-sm text-gray-600 font-normal">{`${d}.${m}.`}</span>;
    }
    return <span className="text-sm text-gray-600 font-normal">{formatDate(rawDate)}</span>;
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
      <div className="truncate max-w-[90px] text-sm text-gray-600" title={text}>
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

export function buildNettowertColumn(
  calc: (row: any) => number,
): ColumnDef<any> {
  return {
    header: "Nettowert",
    width: "110px",
    align: "right",
    render: (row: any) => {
      const val = calc(row);
      return (
        <span className="text-sm font-bold text-gray-900">
          {`${val.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} €`}
        </span>
      );
    },
  };
}

export const buildValueNetColumn = buildNettowertColumn;

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

export function buildViewActionColumn(
  onView: (row: any) => void,
  header: string = "Aktionen",
): ColumnDef<any> {
  return {
    header,
    width: "90px",
    align: "center",
    render: (row) => (
      <div className="flex items-center justify-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(row);
          }}
          className="px-2 py-0.5 text-[10px] font-bold bg-[#2F6B46] text-white rounded-[4px] hover:bg-[#255638] transition shadow-xs cursor-pointer"
        >
          View
        </button>
      </div>
    ),
  };
}

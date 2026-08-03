"use client";

import React from "react";
import { ColumnDef } from "@/components/UI/DataTable";
import { formatDate } from "@/utils/date";

interface PaymentInboundColumnsArgs {
  onOpenDetails: (row: any) => void;
  onDelete: (row: any) => void;
}

export function buildPaymentInboundColumns({
  onOpenDetails,
  onDelete,
}: PaymentInboundColumnsArgs): ColumnDef<any>[] {
  return [
    {
      header: "Received Date",
      width: "120px",
      align: "center",
      render: (row) => {
        const rawDate =
          row.received_date ||
          row.receivedDate ||
          row.createdAt ||
          row.created_at;
        return rawDate ? formatDate(rawDate) : "-";
      },
    },
    {
      header: "Reference / ID",
      width: "150px",
      align: "center",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails(row);
          }}
          className="text-green-600 hover:underline font-semibold"
        >
          {row.reference ||
            row.external_transaction_id ||
            row.invoiceNumber ||
            String(row.id).slice(-6)}
        </button>
      ),
    },
    {
      header: "Payer Name",
      width: "200px",
      align: "left",
      render: (row) => {
        const text =
          row.payer_name ||
          row.customer_name ||
          row.customerSnapshot?.companyName ||
          row.customer?.companyName ||
          "—";
        return (
          <div className="truncate max-w-[200px] font-medium text-gray-800" title={text}>
            {text}
          </div>
        );
      },
    },
    {
      header: "Payment Account",
      width: "160px",
      align: "left",
      render: (row) => {
        const accName =
          row.paymentAccount?.name || row.payment_account_name || "—";
        return <span className="text-gray-700 font-medium">{accName}</span>;
      },
    },
    {
      header: "Amount",
      width: "120px",
      align: "right",
      render: (row) => {
        const val = Number(row.amount ?? row.grossTotal ?? 0);
        const curr = row.currency_code || row.currencyCode || "EUR";
        const symbol = curr === "EUR" ? "€" : curr === "USD" ? "$" : `${curr} `;
        return (
          <span className="font-bold text-gray-900">
            {symbol}
            {val.toLocaleString("de-DE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        );
      },
    },
    {
      header: "Source",
      width: "100px",
      align: "center",
      render: (row) => {
        const src = row.source || "manual";
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-600 uppercase border border-gray-200">
            {src}
          </span>
        );
      },
    },
    {
      header: "Actions",
      width: "140px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(row);
            }}
            className="px-2.5 py-1 text-[11px] font-bold bg-[#2F6B46] hover:bg-[#255638] text-white rounded-[4px] transition shadow-sm"
          >
            Edit
          </button>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              onDelete(row);
            }}
            className="px-2.5 py-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-[4px] transition shadow-sm"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];
}

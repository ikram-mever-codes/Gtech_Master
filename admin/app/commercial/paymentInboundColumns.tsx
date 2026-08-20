"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronRight, Pencil, Trash2, Link } from "lucide-react";
import { ColumnDef } from "@/components/UI/DataTable";
import { formatDate } from "@/utils/date";

interface PaymentInboundColumnsArgs {
  onOpenDetails: (row: any) => void;
  onDelete: (row: any) => void;
  onAssign: (row: any) => void;
}

const PaymentInboundActionMenu: React.FC<{
  row: any;
  rowIndex?: number;
  onOpenDetails: (row: any) => void;
  onDelete: (row: any) => void;
  onAssign: (row: any) => void;
}> = ({ row, rowIndex, onOpenDetails, onDelete, onAssign }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const total = Number(row.amount ?? row.grossTotal ?? 0);
  const openAmount =
    row.open_amount !== undefined && row.open_amount !== null
      ? Number(row.open_amount)
      : total;
  const canAssign = openAmount > 0.005;
  const isBottom = rowIndex !== undefined && rowIndex >= 5;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all shadow-xs cursor-pointer ${
          isOpen
            ? "border-[#8CC21B] bg-lime-50 text-[#8CC21B] ring-2 ring-[#8CC21B]/20"
            : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900"
        }`}
        title="Aktionen"
      >
        <ChevronRight
          className={`w-4 h-4 transition-transform duration-150 ${
            isOpen ? "rotate-90 text-[#8CC21B]" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 ${
            isBottom ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 z-50 text-left divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-100 font-poppins`}
        >
          {canAssign && (
            <div className="p-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onAssign(row);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <Link className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs font-semibold">Assign Payment</span>
              </button>
            </div>
          )}

          <div className="p-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onOpenDetails(row);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <Pencil className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="text-xs font-semibold">Edit Payment</span>
            </button>
          </div>

          <div className="p-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onDelete(row);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-red-50 text-rose-600 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="text-xs font-semibold">Delete Payment</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const formatMoney = (val: number, currencyCode: string) => {
  const curr = currencyCode || "EUR";
  const symbol = curr === "EUR" ? "€" : curr === "USD" ? "$" : `${curr} `;
  return `${symbol}${val.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export function buildPaymentInboundColumns({
  onOpenDetails,
  onDelete,
  onAssign,
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
          <div
            className="truncate max-w-[200px] font-medium text-gray-800"
            title={text}
          >
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
        return (
          <span className="font-bold text-gray-900">
            {formatMoney(val, curr)}
          </span>
        );
      },
    },
    {
      header: "Open Amount",
      width: "130px",
      align: "right",
      render: (row) => {
        const total = Number(row.amount ?? row.grossTotal ?? 0);
        // open_amount is attached server-side; fall back to "fully open"
        // if a row somehow arrives without it (e.g. optimistic state).
        const openAmount =
          row.open_amount !== undefined && row.open_amount !== null
            ? Number(row.open_amount)
            : total;
        const curr = row.currency_code || row.currencyCode || "EUR";
        const isFullyAssigned = openAmount <= 0.005;
        return (
          <span
            className={`font-bold ${isFullyAssigned ? "text-gray-400" : "text-amber-600"}`}
          >
            {formatMoney(Math.max(openAmount, 0), curr)}
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
      header: "",
      width: "45px",
      align: "center",
      render: (row, index) => (
        <PaymentInboundActionMenu
          row={row}
          rowIndex={index}
          onOpenDetails={onOpenDetails}
          onDelete={onDelete}
          onAssign={onAssign}
        />
      ),
    },
  ];
}

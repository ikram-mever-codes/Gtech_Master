import React from "react";
import { RefreshCw } from "lucide-react";
import type { ColumnDef } from "@/components/UI/DataTable";

/**
 * Columns for the "Items shown in invoice based on Taric" SpreadSheet inside
 * the Invoice Details modal. Verbatim port of the two inline column arrays
 * (closed invoices = read-only, open invoices = with "Set taric" operation).
 */

interface BuildTaricGroupColumnsArgs {
  isClosed: boolean;
  onOpenTaricModal: (group: any) => void;
}

const positionColumn: ColumnDef<any> = {
  header: "Position",
  render: (_: any, idx: number) => idx + 1,
  width: "50px",
};

const taricCodeColumn: ColumnDef<any> = {
  header: "Taric Code",
  render: (it: any) => (
    <span
      className="font-mono text-xs"
      style={
        it.isProjectItem
          ? {
            color: "#F59E0B",
            fontWeight: 700,
          }
          : { fontWeight: 600 }
      }
    >
      {it.taricCode}
    </span>
  ),
  width: "110px",
};

const dutyRateColumn: ColumnDef<any> = {
  header: "Duty rate",
  render: (it: any) =>
    it.dutyRate !== null && it.dutyRate !== undefined
      ? `${Number(it.dutyRate).toFixed(2)}%`
      : "-",
  width: "80px",
};

const totalQtyColumn: ColumnDef<any> = {
  header: "Total Qty",
  render: (it: any) => (
    <span className="font-bold text-gray-900">{it.totalQty}</span>
  ),
  align: "center",
  width: "80px",
};

const unitPriceColumn: ColumnDef<any> = {
  header: "Unit Price",
  render: (it: any) => `€${Number(it.unitPrice || 0).toFixed(2)}`,
  width: "90px",
};

const totalPriceColumn: ColumnDef<any> = {
  header: "Total Price",
  render: (it: any) =>
    `€${(Number(it.totalPrice) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
  width: "110px",
};

export function buildTaricGroupColumns({
  isClosed,
  onOpenTaricModal,
}: BuildTaricGroupColumnsArgs): ColumnDef<any>[] {
  const taricNameColumn: ColumnDef<any> = {
    header: "Taric Name EN",
    render: (it: any) => (
      <div className="font-semibold text-gray-900">{it.taricNameEn}</div>
    ),
    width: isClosed ? "230px" : "210px",
  };

  const columns: ColumnDef<any>[] = [
    positionColumn,
    taricNameColumn,
    taricCodeColumn,
    dutyRateColumn,
    totalQtyColumn,
    unitPriceColumn,
    totalPriceColumn,
  ];

  if (isClosed) return columns;

  return [
    ...columns,
    {
      header: "Operation",
      render: (group: any) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenTaricModal(group);
          }}
          className="flex items-center gap-1 px-3 py-1 bg-[#1A73E8] text-white text-[10px] font-bold rounded hover:bg-[#1557B0] transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Set taric
        </button>
      ),
      width: "100px",
    },
  ];
}

/** Footer ("Grand Total") row of the taric SpreadSheet. */
export function buildTaricGroupTotalCols(
  isClosed: boolean,
  taricGroups: any[] | undefined,
) {
  const cols: {
    label?: string;
    value?: string | number;
    width?: string;
    align?: "left" | "center" | "right";
    colSpan?: number;
  }[] = [
      {
        label: "Grand Total",
        value: "",
        colSpan: 4,
        align: "left",
      },
      {
        value:
          taricGroups?.reduce((s: number, g: any) => s + (g.totalQty || 0), 0) ||
          0,
        width: "80px",
        align: "center",
      },
      {
        value: "",
        width: "90px",
      },
      {
        value: `€${(
          taricGroups?.reduce(
            (s: number, g: any) => s + (g.totalPrice || 0),
            0,
          ) || 0
        ).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        width: "110px",
        align: "left",
      },
    ];

  if (!isClosed) {
    cols.push({
      value: "",
      width: "100px",
    });
  }

  return cols;
}

import React from "react";
import type { ColumnDef } from "@/components/UI/DataTable";

/**
 * Columns for the detailed order-items SpreadSheet inside the Invoice
 * Details modal (the "items" view). Verbatim port of the two inline column
 * arrays: closed invoices (read-only) and open invoices (with Qty / Split /
 * ReAssign / SET PRICE actions).
 */

interface BuildInvoiceItemColumnsArgs {
  isClosed: boolean;
  expandedPriceItemId: string | null;
  setExpandedPriceItemId: (id: string | null) => void;
  setEditingPrice: (price: number) => void;
  onOpenQtyModal: (item: any) => void;
  onOpenSplitModal: (item: any) => void;
  onOpenReassignModal: (item: any) => void;
}

const eanColumn = (width: string): ColumnDef<any> => ({
  header: "EAN",
  render: (it: any) => it._fallbackEan || it.item?.ean || "-",
  width,
});

const taricColumn = (width: string): ColumnDef<any> => ({
  header: "Taric code",
  render: (it: any) => (
    <span className="font-mono text-xs">
      {it.set_taric_code || it.item?.taric?.code || "-"}
    </span>
  ),
  width,
});

const eurColumn = (width: string): ColumnDef<any> => ({
  header: "EUR",
  render: (it: any) =>
    `€${Number(it.eur_special_price || it._fallbackEk || 0).toFixed(2)}`,
  width,
  align: "center",
});

const ekColumn = (width: string): ColumnDef<any> => ({
  header: "EK",
  render: (it: any) => {
    const unitPrice = Number(it.eur_special_price || it._fallbackEk) || 0;
    const totalPrice = (it.qty || 0) * unitPrice;
    return (
      <span className="font-bold text-[#10B981]">€{totalPrice.toFixed(2)}</span>
    );
  },
  width,
  align: "center",
});

export function buildInvoiceItemColumns({
  isClosed,
  expandedPriceItemId,
  setExpandedPriceItemId,
  setEditingPrice,
  onOpenQtyModal,
  onOpenSplitModal,
  onOpenReassignModal,
}: BuildInvoiceItemColumnsArgs): ColumnDef<any>[] {
  if (isClosed) {
    return [
      {
        header: "#",
        render: (_: any, idx: number) => idx + 1,
        width: "40px",
      },
      eanColumn("110px"),
      {
        header: "Item Name",
        render: (it: any) => (
          <div
            className="line-clamp-2 leading-tight py-1 font-semibold text-gray-900"
            title={it.item?.item_name}
          >
            {it.item?.item_name}
          </div>
        ),
        width: "350px",
      },
      taricColumn("100px"),
      {
        header: "QTY",
        render: (it: any) => <span className="font-bold">{it.qty}</span>,
        width: "60px",
        align: "center",
      },
      eurColumn("70px"),
      ekColumn("80px"),
    ];
  }

  return [
    {
      header: "ID",
      render: (it: any) => (
        <div className="px-2 py-0.5 bg-[#495057] text-white text-[10px] font-bold rounded text-center inline-block font-sans">
          {it.id}
        </div>
      ),
      width: "70px",
    },
    eanColumn("100px"),
    {
      header: "Item Name",
      render: (it: any) => (
        <div
          className="line-clamp-2 leading-tight break-words font-semibold text-gray-900 py-0.5"
          title={it.item?.item_name}
        >
          {it.item?.item_name}
        </div>
      ),
      width: "220px",
    },
    taricColumn("90px"),
    {
      header: "Remark",
      render: (it: any) => (
        <span className="text-[11px] text-gray-500 italic">
          {it.remark_de ? `// ${it.remark_de}` : "-"}
        </span>
      ),
      width: "100px",
    },
    {
      header: "Order_no",
      render: (it: any) => it.order?.order_no || "-",
      width: "80px",
    },
    {
      header: "SOID",
      render: (it: any) => it.supplier_order_id || "-",
      width: "50px",
    },
    {
      header: "Status",
      render: (it: any) => (
        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded border">
          {it.status}
        </span>
      ),
      width: "60px",
    },
    {
      header: "V(dm³)",
      render: (it: any) => it.v?.toFixed(2),
      width: "50px",
      align: "center",
    },
    {
      header: "W(kg)",
      render: (it: any) => it.w?.toFixed(2),
      width: "50px",
      align: "center",
    },
    {
      header: "QTY",
      render: (it: any) => (
        <span className="font-bold">
          {it.qty_label ? `${it.qty_label}/${it.qty}` : it.qty}
        </span>
      ),
      width: "60px",
      align: "center",
    },
    eurColumn("60px"),
    ekColumn("70px"),
    {
      header: "Actions",
      render: (it: any) => (
        <div className="flex flex-wrap items-center gap-1 py-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenQtyModal(it);
            }}
            className="px-2 py-1 text-[9px] font-bold bg-[#495057] text-white rounded hover:bg-[#343A40] transition shadow-sm"
            title="QtyLabel"
          >
            Qty
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenSplitModal(it);
            }}
            className="px-2 py-1 text-[9px] font-bold bg-[#F15A24] text-white rounded hover:bg-[#D9481B] transition shadow-sm"
            title="Split"
          >
            Split
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenReassignModal(it);
            }}
            className="px-2 py-1 text-[9px] font-bold bg-[#4F46E5] text-white rounded hover:bg-[#4338CA] transition shadow-sm"
            title="ReAssign"
          >
            ReAssign
          </button>
          {it.item?.is_eur_special === "Y" &&
            (!it.eur_special_price || Number(it.eur_special_price) === 0) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedPriceItemId(
                    expandedPriceItemId === it.id ? null : it.id,
                  );
                  setEditingPrice(it.eur_special_price || 0);
                }}
                className="px-2 py-1 bg-[#EF4444] text-white text-[9px] font-bold rounded hover:bg-red-600 transition shadow-sm whitespace-nowrap"
              >
                SET PRICE
              </button>
            )}
        </div>
      ),
      width: "160px",
    },
  ];
}

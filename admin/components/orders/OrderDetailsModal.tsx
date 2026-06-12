"use client";

import React from "react";
import CustomModal from "@/components/UI/CustomModal";
import { DataTable } from "@/components/UI/DataTable";

type OrderDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  viewOrder: any;
  viewItems: any[];
  getCategoryName: (id: any) => string;
  getSupplierName: (id: any) => string;
};

export default function OrderDetailsModal({
  isOpen,
  onClose,
  viewOrder,
  viewItems,
  getCategoryName,
  getSupplierName,
}: OrderDetailsModalProps) {
  if (!viewOrder) return null;

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Order ${viewOrder.order_no}`}
      width="max-w-4xl"
      footer={
        <button
          onClick={onClose}
          className="px-6 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-bold text-black"
        >
          Close
        </button>
      }
    >
      <div className="space-y-6 text-black">
        <div>
          <p className="text-sm font-semibold text-gray-500">
            Status: {viewOrder.status || "20"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-400 block uppercase tracking-wide">
              Category
            </label>
            <p className="text-gray-900 font-bold">
              {viewOrder.category_name ||
                getCategoryName(viewOrder.category_id) ||
                "-"}
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-400 block uppercase tracking-wide">
              Customer
            </label>
            <p className="text-gray-900 font-bold">
              {viewOrder.customer_name || "-"}
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-400 block uppercase tracking-wide">
              Supplier
            </label>
            <p className="text-gray-900 font-bold">
              {viewOrder.supplier_name && viewOrder.supplier_name !== "Unassigned"
                ? viewOrder.supplier_name
                : viewOrder.supplier_id
                  ? getSupplierName(viewOrder.supplier_id)
                  : "Unassigned"}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-bold text-gray-400 block uppercase tracking-wide">
            Comment
          </label>
          <p className="text-gray-800 text-sm font-medium leading-relaxed">
            {viewOrder.comment || "-"}
          </p>
        </div>

        <div className="mt-8">
          <DataTable
            data={viewItems}
            loading={false}
            emptyMessage="No items found in this order"
            columns={[
              {
                header: "EAN",
                width: "120px",
                render: (row) => {
                  const ean = row.ean || row.item?.ean || "-";
                  if (!ean || ean === "-") return "-";
                  return (
                    <span className="text-gray-900 font-bold">
                      {ean}
                    </span>
                  );
                },
                align: "center",
              },
              {
                header: "Item Name",
                width: "120px",
                render: (row) => (
                  <div className="font-bold text-gray-900 line-clamp-2 leading-tight">
                    {row.itemName}
                  </div>
                ),
              },
              {
                header: "3-level remark",
                render: (row) => (
                  <div className="text-xs text-gray-500 font-medium italic space-y-0.5">
                    {row.remark_de && (
                      <div className="text-blue-600">
                        DE: {row.remark_de}
                      </div>
                    )}
                    {row.remarks_cn && (
                      <div className="text-red-600">
                        CN: {row.remarks_cn}
                      </div>
                    )}
                    {row.remark_en && (
                      <div className="text-green-600">
                        EN: {row.remark_en}
                      </div>
                    )}
                    {!row.remark_de &&
                      !row.remarks_cn &&
                      !row.remark_en && (
                        <span className="text-gray-300">-</span>
                      )}
                  </div>
                ),
              },
              {
                header: "Status",
                width: "120px",
                render: (row) => (
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${row.status === "NSO"
                      ? "bg-amber-100 text-amber-700"
                      : row.status === "SO"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                      }`}
                  >
                    {row.status || "NSO"}
                  </span>
                ),
                align: "center",
              },
              {
                header: "Taric",
                width: "100px",
                render: (row) =>
                  row.taric_code || row.item?.taric?.code || "-",
                align: "center",
              },
              {
                header: "Supplier",
                width: "120px",
                render: (row) => {
                  const nameFromBackend = (row as any).supplier_name;
                  if (nameFromBackend && nameFromBackend !== "-" && nameFromBackend !== "Unassigned") {
                    return nameFromBackend;
                  }
                  const sid = (row as any).supplier_id || (row as any).item?.supplier_id;
                  const name = sid ? getSupplierName(sid) : null;
                  return name && name !== "-" ? name : "-";
                },
                align: "center",
              },
            ]}
          />
        </div>
      </div>
    </CustomModal>
  );
}

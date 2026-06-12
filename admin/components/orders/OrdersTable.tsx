"use client";

import React, { useState } from "react";
import Select from "react-select";
import { toast } from "react-hot-toast";
import { DataTable, ColumnDef } from "@/components/UI/DataTable";

const hasChinese = (str: string) => /[\u4e00-\u9fa5]/.test(str || "");

export type OrdersTableProps = {
  orders: any[];
  loading: boolean;
  getCategoryName: (id: any) => string;
  getSupplierName?: (id: any) => string;
  getOrderStatusColor: (status: any) => string;
  onView: (o: any) => void;
  onEdit: (o: any) => void;
  onDelete?: (id: string | number) => void;
  onGoToItems: (orderNo: string) => void;
  canDelete: boolean;
  showConvert?: boolean;
  onConvert?: (o: any) => void;
  onReassign: (o: any) => void;
  activeTab: string;
  itemById: Map<string, any>;
  onSplit: (row: any) => void;
  suppliers: any[];
  onAssignSupplier: (itemId: number | string, supplierId: number, baseItemId?: number | string) => Promise<void>;
  router: any;
};

export default function OrdersTable({
  orders,
  loading,
  getCategoryName,
  getSupplierName,
  getOrderStatusColor,
  onView,
  onEdit,
  onDelete,
  canDelete,
  onConvert,
  onReassign,
  onGoToItems,
  activeTab,
  itemById,
  onSplit,
  suppliers,
  onAssignSupplier,
  router,
}: OrdersTableProps) {
  const [editingSupplierId, setEditingSupplierId] = useState<number | string | null>(null);

  const isOrderItems = activeTab === "order_items";

  const itemColumns: ColumnDef<any>[] = [
    {
      header: "S. No",
      width: "30px",
      render: (_, i) => i + 1,
      align: "center",
    },
    {
      header: "EAN",
      width: "120px",
      render: (row) => {
        const ean =
          row.ean ||
          row.item?.ean ||
          itemById.get(String(row.item_id))?.ean ||
          "-";
        if (!ean || ean === "-") return "-";
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const itemId = row.item_id || row.item?.id || (row as any).id;
              if (itemId) {
                router.push(`/items/${itemId}`);
              } else {
                toast.error("Item details not found");
              }
            }}
            className="text-blue-600 hover:underline font-bold text-xs"
          >
            {ean}
          </button>
        );
      },
    },
    {
      header: "Item name",
      width: "200px",
      render: (row) => (
        <div
          className="line-clamp-3 leading-tight break-words"
          title={
            row.item_name ||
            row.itemName ||
            row.item?.item_name ||
            row.item?.name
          }
        >
          {row.item_name ||
            row.itemName ||
            row.item?.item_name ||
            row.item?.name ||
            "Unknown"}
        </div>
      ),
    },
    {
      header: "Price",
      width: "80px",
      render: (row) => {
        const val = row.rmb_special_price || row.rmb_price || row.item?.rmb_price || row.item?.rmb_special_price || row.item?.RMB_Price || row.item?.others?.rmbPrice || row.price || row.item?.price || 0;
        return <div className="font-semibold">{Number(val).toFixed(2)}</div>;
      },
    },
    { header: "QTY", width: "40px", render: (row) => row.qty, align: "center" },
    {
      header: "Total",
      width: "80px",
      render: (row) => {
        const p = Number(
          row.rmb_special_price || row.rmb_price || row.item?.rmb_price || row.item?.rmb_special_price || row.item?.RMB_Price || row.item?.others?.rmbPrice || row.price || row.item?.price || 0,
        );
        return !isNaN(p) ? (p * row.qty).toFixed(2) : "0.00";
      },
      align: "center",
    },
    {
      header: "Supplier",
      width: "180px",
      render: (row) => {
        const itemDetails = itemById.get(String(row.item_id));
        const sid = Number(row.supplier_id || row.item?.supplier_id || itemDetails?.supplier_id || 0);

        let sname = null;
        if (sid > 0) {
          sname = getSupplierName?.(sid);
          if (sname === "-" || sname === String(sid)) sname = null;
        }

        if (!sname && row.supplier_name && row.supplier_name !== "Unassigned" && row.supplier_name !== "-") {
          sname = row.supplier_name;
        }
        if (!sname && row.item?.supplier_name && row.item?.supplier_name !== "Unassigned" && row.item?.supplier_name !== "-") {
          sname = row.item?.supplier_name;
        }
        if (!sname && itemDetails?.supplier_name && itemDetails?.supplier_name !== "Unassigned" && itemDetails?.supplier_name !== "-") {
          sname = itemDetails?.supplier_name;
        }

        if (editingSupplierId === row.id) {
          const supplierOptions = suppliers.map(s => {
            let englishName = !hasChinese(s.name) ? s.name : (!hasChinese(s.company_name) ? s.company_name : null);
            let finalName = englishName || s.company_name || s.name || s.name_cn || `Supplier #${s.id}`;

            return {
              value: s.id,
              label: `[ID: ${s.id}] ${finalName}`
            };
          });

          return (
            <div
              className="w-[260px]"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Select
                autoFocus
                menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                options={supplierOptions}
                onChange={async (opt: any) => {
                  setEditingSupplierId(null);
                  if (opt) {
                    await onAssignSupplier(row.id, opt.value, row.item_id);
                  }
                }}
                onBlur={() => setEditingSupplierId(null)}
                styles={{
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  control: (base) => ({
                    ...base,
                    minHeight: '34px',
                    height: '34px',
                    fontSize: '11px',
                    borderColor: '#cbd5e1',
                    boxShadow: 'none',
                    '&:hover': { borderColor: '#94a3b8' }
                  }),
                  option: (base, state) => ({
                    ...base,
                    fontSize: '11px',
                    backgroundColor: state.isFocused ? '#f1f5f9' : 'white',
                    color: '#334155',
                    cursor: 'pointer'
                  }),
                  menu: (base) => ({
                    ...base,
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                    border: '1px solid #e2e8f0',
                    zIndex: 9999
                  }),
                }}
              />
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <div className="truncate max-w-[120px] font-medium text-gray-700">
              {sname ? (
                sname
              ) : sid && sid !== 0 ? (
                <span className="text-gray-600 text-[11px] font-bold">ID: {sid}</span>
              ) : (
                <span className="text-gray-400 text-[10px] italic">Unassigned</span>
              )}
            </div>
            {(!sname && (!sid || sid === 0)) && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setEditingSupplierId(row.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-blue-700 transition-all whitespace-nowrap shadow-sm hover:shadow-md"
              >
                Set Supplier
              </button>
            )}
          </div>
        );
      },
    },
    { header: "Order No.", width: "80px", render: (row) => row.order_no },
    {
      header: "Remarks",
      width: "150px",
      render: (row) => (
        <div className="line-clamp-2" title={row.remarks_cn || row.remark_de}>
          {row.remarks_cn || row.remark_de || "-"}
        </div>
      ),
    },
    {
      header: "Status",
      width: "60px",
      render: (row) => row.item_status || row.status || "-",
      align: "center",
    },
    {
      header: "Cargo",
      width: "40px",
      render: (row) => row.cargo_id || "-",
      align: "center",
    },
    {
      header: "SOID",
      width: "40px",
      render: (row) => row.supplier_order_id || "-",
      align: "center",
    },
    {
      header: "Actions",
      width: "135px",
      align: "center",
      render: (row) => {
        const hasCargo = !!row.cargo_id;
        return (
          <div className="flex items-center justify-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReassign(row);
              }}
              title={hasCargo ? "Re-assign to Cargo" : "Assign to Cargo"}
              className="px-2 py-1 text-[10px] font-bold bg-[#8CC21B] text-white rounded-[4px] hover:bg-green-700 transition shadow-md flex items-center gap-1"
            >
              <span>&#8617;</span> {hasCargo ? "Reassign" : "Assign"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSplit(row);
              }}
              title="Split Order Item"
              className="px-2 py-1 text-[10px] font-bold bg-amber-600 text-white rounded-[4px] hover:bg-amber-700 transition shadow-md"
            >
              Split
            </button>
          </div>
        );
      },
    },
  ];

  const getCount = (items: any[] | undefined, ...statuses: string[]) => {
    return (
      items?.filter((i) => statuses.includes(i.status || "NSO")).length || 0
    );
  };

  const CountCell = ({ count }: { count: number }) => (
    <span
      className={count > 0 ? "text-green-600 font-semibold" : "text-gray-800"}
    >
      {count}
    </span>
  );

  const ActionCell = ({ row }: { row: any }) => {
    const hasCargo = !!row.cargo_id;
    return (
      <div className="flex items-center justify-center gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReassign(row);
          }}
          title={hasCargo ? "Re-assign to Cargo" : "Assign to Cargo"}
          className="px-2 py-1 text-[10px] font-bold bg-[#8CC21B] text-white rounded-[4px] hover:bg-green-700 transition shadow-md flex items-center gap-1"
        >
          <span>&#8617;</span> {hasCargo ? "Reassign" : "Assign"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row);
          }}
          title="Edit Order"
          className="px-2 py-1 text-[10px] font-bold bg-[#059669] text-white rounded-[4px] hover:bg-green-700 transition shadow-md"
        >
          Edit
        </button>
      </div>
    );
  };

  const orderColumns: ColumnDef<any>[] = [
    {
      header: "No",
      width: "40px",
      render: (_, i) => i + 1,
      align: "center",
      renderTotal: () => <span className="text-transparent">Total</span>,
    },
    {
      header: "Actions",
      width: "150px",
      align: "center",
      render: (row) => <ActionCell row={row} />,
    },
    {
      header: "Order No.",
      width: "90px",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onGoToItems(String(row.order_no));
          }}
          className="text-green-600 hover:underline font-semibold whitespace-nowrap"
          title="Click to see all items in this order"
        >
          {row.order_no}
        </button>
      ),
      align: "center",
    },
    {
      header: "Catgy",
      width: "65px",
      render: (row) => getCategoryName(row.category_id),
      align: "center",
    },
    {
      header: "Cargo",
      width: "55px",
      render: (row) => row.cargo_id ?? "-",
      align: "center",
    },
    {
      header: "Comment",
      width: "250px",
      render: (row) => (
        <div className="line-clamp-2 leading-tight" title={row.comment}>
          {row.comment || "-"}
        </div>
      ),
      align: "left",
    },
    {
      header: "Created",
      width: "65px",
      render: (row) =>
        row.created_at
          ? new Intl.DateTimeFormat("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }).format(new Date(row.created_at))
          : "-",
      align: "center",
    },
    {
      header: "Emailed",
      width: "65px",
      render: (row) =>
        row.date_emailed && row.date_emailed !== "-"
          ? new Intl.DateTimeFormat("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }).format(new Date(row.date_emailed))
          : "-",
      align: "center",
    },
    {
      header: "Delivery",
      width: "65px",
      render: (row) =>
        row.date_delivery && row.date_delivery !== "-"
          ? new Intl.DateTimeFormat("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }).format(new Date(row.date_delivery))
          : "-",
      align: "center",
    },
    {
      header: "Total",
      width: "35px",
      render: (row) => (
        <span className="font-semibold">{row.items?.length || 0}</span>
      ),
      align: "center",
      renderTotal: (data) => (
        <CountCell
          count={data.reduce((acc, row) => acc + (row.items?.length || 0), 0)}
        />
      ),
    },
    {
      header: "NSO",
      width: "35px",
      render: (row) => <CountCell count={getCount(row.items, "NSO")} />,
      align: "center",
      renderTotal: (data) => (
        <CountCell
          count={data.reduce((acc, row) => acc + getCount(row.items, "NSO"), 0)}
        />
      ),
    },
    {
      header: "SO",
      width: "35px",
      render: (row) => <CountCell count={getCount(row.items, "SO")} />,
      align: "center",
      renderTotal: (data) => (
        <CountCell
          count={data.reduce((acc, row) => acc + getCount(row.items, "SO"), 0)}
        />
      ),
    },
    {
      header: "Problem",
      width: "35px",
      render: (row) => (
        <CountCell count={getCount(row.items, "Problem", "problem")} />
      ),
      align: "center",
      renderTotal: (data) => (
        <CountCell
          count={data.reduce(
            (acc, row) => acc + getCount(row.items, "Problem", "problem"),
            0,
          )}
        />
      ),
    },
    {
      header: "Purchase",
      width: "35px",
      render: (row) => (
        <CountCell
          count={getCount(
            row.items,
            "Purchase",
            "Purchased",
            "purchase",
            "purchased",
          )}
        />
      ),
      align: "center",
      renderTotal: (data) => (
        <CountCell
          count={data.reduce(
            (acc, row) =>
              acc +
              getCount(
                row.items,
                "Purchase",
                "Purchased",
                "purchase",
                "purchased",
              ),
            0,
          )}
        />
      ),
    },
    {
      header: "Paid",
      width: "35px",
      render: (row) => (
        <span className="text-gray-800">{getCount(row.items, "Paid", "paid")}</span>
      ),
      align: "center",
      renderTotal: (data) => (
        <CountCell
          count={data.reduce((acc, row) => acc + getCount(row.items, "Paid", "paid"), 0)}
        />
      ),
    },
    {
      header: "Checked",
      width: "35px",
      render: (row) => (
        <span className="text-gray-800">{getCount(row.items, "Checked", "checked")}</span>
      ),
      align: "center",
      renderTotal: (data) => (
        <CountCell
          count={data.reduce(
            (acc, row) => acc + getCount(row.items, "Checked", "checked"),
            0,
          )}
        />
      ),
    },
    {
      header: "Printed",
      width: "35px",
      render: (row) => (
        <span className="text-gray-800">{getCount(row.items, "Printed", "printed")}</span>
      ),
      align: "center",
      renderTotal: (data) => (
        <CountCell
          count={data.reduce(
            (acc, row) => acc + getCount(row.items, "Printed", "printed"),
            0,
          )}
        />
      ),
    },
    {
      header: "Invoiced",
      width: "35px",
      render: (row) => (
        <span className="text-gray-800">{getCount(row.items, "Invoiced", "invoiced")}</span>
      ),
      align: "center",
      renderTotal: (data) => (
        <CountCell
          count={data.reduce(
            (acc, row) => acc + getCount(row.items, "Invoiced", "invoiced"),
            0,
          )}
        />
      ),
    },
    {
      header: "Shipped",
      width: "35px",
      render: (row) => (
        <span className="text-gray-800">{getCount(row.items, "Shipped", "shipped")}</span>
      ),
      align: "center",
      renderTotal: (data) => (
        <CountCell
          count={data.reduce(
            (acc, row) => acc + getCount(row.items, "Shipped", "shipped"),
            0,
          )}
        />
      ),
    },
  ];

  return (
    <DataTable
      data={orders}
      columns={isOrderItems ? itemColumns : orderColumns}
      loading={loading}
      emptyMessage={isOrderItems ? "No Order Items Found" : "No Orders Found"}
      showTotals={!isOrderItems}
      getRowClassName={(row) => {
        const isExpress = (row.comment || "").toLowerCase().includes("express");
        return isExpress ? "bg-red-50" : "";
      }}
      onRowClick={(row, idx, e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, a, input, select, textarea, [role="button"], .interactive')) {
          return;
        }

        if (isOrderItems) {
          const targetOrder = row.parentOrder || {
            id: row.order_id,
            order_no: row.order_no,
          };
          if (targetOrder && (targetOrder.id || targetOrder.order_id)) {
            onView(targetOrder);
          } else {
            toast.error("Order details not found for this item");
          }
        } else {
          onView(row);
        }
      }}
    />
  );
}

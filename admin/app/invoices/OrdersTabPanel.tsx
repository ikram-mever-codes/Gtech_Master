"use client";

import React from "react";
import OrdersTable from "@/components/orders/OrdersTable";
import { getOrderStatusColor } from "@/api/orders";

/**
 * Body of the "Orders" and "Order Items" tabs: the "Showing items for
 * order" banner plus the shared OrdersTable. Verbatim port of the inline
 * JSX from the original invoices/page.tsx.
 */

interface OrdersTabPanelProps {
  activeInvTab: "orders" | "order_items";
  orderNoFilter: string;
  onClearOrderNoFilter: () => void;
  orders: any[];
  loading: boolean;
  getCategoryName: (id: any) => string;
  getSupplierName: (id: any) => string;
  onView: (order: any) => void;
  onEdit: (order: any) => void;
  onDelete: (id: string | number) => void;
  canDelete: boolean;
  onReassign: (row: any) => void;
  onGoToItems: (orderNo: string) => void;
  itemById: Map<string, any>;
  suppliers: any[];
  onAssignSupplier: (
    itemId: number | string,
    supplierId: number,
    baseItemId?: number | string,
  ) => Promise<void>;
  onSplit: (row: any) => void;
  router: any;
  cargos: any[];
}

const OrdersTabPanel: React.FC<OrdersTabPanelProps> = ({
  activeInvTab,
  orderNoFilter,
  onClearOrderNoFilter,
  orders,
  loading,
  getCategoryName,
  getSupplierName,
  onView,
  onEdit,
  onDelete,
  canDelete,
  onReassign,
  onGoToItems,
  itemById,
  suppliers,
  onAssignSupplier,
  onSplit,
  router,
  cargos,
}) => (
  <div className="bg-white rounded-md border border-gray-200 p-4 shadow-sm mb-6">
    {activeInvTab === "order_items" && orderNoFilter && (
      <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-100 mb-4 rounded-[4px]">
        <span className="text-xs text-blue-700 font-medium">
          🔍 Showing items for order:&nbsp;
          <span className="font-bold bg-blue-100 px-1.5 py-0.5 rounded text-blue-800">
            {orderNoFilter}
          </span>
        </span>
        <button
          onClick={onClearOrderNoFilter}
          className="text-[10px] text-blue-600 hover:text-blue-800 underline font-semibold ml-1"
        >
          Clear filter (show all)
        </button>
      </div>
    )}
    <OrdersTable
      orders={orders}
      loading={loading}
      getCategoryName={getCategoryName}
      getSupplierName={getSupplierName}
      getOrderStatusColor={getOrderStatusColor}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
      canDelete={canDelete}
      showConvert={false}
      onConvert={undefined}
      onReassign={onReassign}
      onGoToItems={onGoToItems}
      activeTab={activeInvTab}
      itemById={itemById}
      suppliers={suppliers}
      onAssignSupplier={onAssignSupplier}
      onSplit={onSplit}
      router={router}
      cargos={cargos}
    />
  </div>
);

export default OrdersTabPanel;

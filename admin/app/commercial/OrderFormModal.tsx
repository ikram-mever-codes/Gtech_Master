"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import CustomModal from "@/components/UI/CustomModal";
import ItemSelectorWithQuantity from "@/components/orders/ItemSelectorWithQuantity";

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit" | "convert";
  categories: any[];
  suppliers: any[];
  form: {
    comment: string;
    customer_id: string;
    category_id: string;
    supplier_id: string;
    status: string;
    ref_no: string;
  };
  onCategoryChange: (categoryId: string) => void;
  onSupplierChange: (supplierId: string) => void;
  onCommentChange: (comment: string) => void;
  effectiveItems: any[];
  selectedItemId: string;
  setSelectedItemId: (id: string) => void;
  onAddItem: (itemId: string, qty: number) => void;
  loadingItems: boolean;
  orderItems: any[];
  onUpdateOrderItemQty: (itemId: string, qty: number) => void;
  onUpdateOrderItemRemark: (itemId: string, remark: string) => void;
  onRemoveOrderItem: (itemId: string) => void;
  onSubmit: () => void;
}

// Verbatim port of the `showModal` block from the original page.tsx.
const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  onClose,
  mode,
  categories,
  suppliers,
  form,
  onCategoryChange,
  onSupplierChange,
  onCommentChange,
  effectiveItems,
  selectedItemId,
  setSelectedItemId,
  onAddItem,
  loadingItems,
  orderItems,
  onUpdateOrderItemQty,
  onUpdateOrderItemRemark,
  onRemoveOrderItem,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      width="max-w-4xl"
      title={mode === "edit" ? "Edit Order" : "Create New Order"}
      footer={
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="px-6 py-2 rounded-lg bg-[#059669] text-white font-semibold hover:bg-green-700 shadow-md transition-all font-bold"
          >
            {mode === "edit" ? "Update Order" : "Create Order"}
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-black">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Category:
            </label>
            <select
              value={form.category_id}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50 text-black"
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Supplier:
            </label>
            <select
              value={form.supplier_id}
              onChange={(e) => onSupplierChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50 text-black"
            >
              <option value="">Select Supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.company_name || s.name || "Unnamed Supplier"}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Item then quantity:
          </label>
          <ItemSelectorWithQuantity
            items={effectiveItems}
            selectedItemId={selectedItemId}
            onItemChange={setSelectedItemId}
            onAdd={onAddItem}
            disabled={loadingItems}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comment:
          </label>
          <textarea
            value={form.comment}
            onChange={(e) => onCommentChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50 text-black"
            placeholder="Enter order comment..."
            rows={3}
          />
        </div>
        {orderItems.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-[4px] shadow-md">
              <thead className="bg-gray-100 text-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium border-b">
                    ID
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium border-b w-[120px]">
                    Item name
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium border-b">
                    Qty
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium border-b">
                    Item remark
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium border-b">
                    Price
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-medium border-b">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {orderItems.map((row) => (
                  <tr key={row.item_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm border-b">
                      {row.item_id}
                    </td>
                    <td className="px-4 py-2 text-sm border-b">
                      <div className="line-clamp-2 leading-tight max-w-[120px]">
                        {row.itemName}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm border-b">
                      <input
                        type="number"
                        min={1}
                        value={row.qty}
                        onChange={(e) =>
                          onUpdateOrderItemQty(
                            row.item_id,
                            Number(e.target.value),
                          )
                        }
                        className="w-16 px-2 py-1 border border-gray-300 rounded-[4px] text-black"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm border-b">
                      <input
                        type="text"
                        value={row.remark_de}
                        onChange={(e) =>
                          onUpdateOrderItemRemark(row.item_id, e.target.value)
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded-[4px] text-black"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm border-b">
                      {row.price} {row.currency}
                    </td>
                    <td className="px-4 py-2 text-center border-b">
                      <button
                        onClick={() => onRemoveOrderItem(row.item_id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CustomModal>
  );
};

export default OrderFormModal;

"use client";

import React, { useState, useMemo } from "react";
import Select from "react-select";
import { toast } from "react-hot-toast";

export type Item = {
  id: string | number;
  item_name?: string;
  name?: string;
  ean?: number | string;
  RMB_Price?: number;
  supplier_id?: string | number;
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  item: any;
  taric?: any;
  price?: number;
  currency?: string;
  supplier_name?: string;
};

type Option = { value: string; label: string };

type ItemSelectorProps = {
  items: Item[];
  selectedItemId: string;
  onItemChange: (item_id: string) => void;
  onAdd: (item_id: string, qty: number) => void;
  disabled?: boolean;
};

export default function ItemSelectorWithQuantity({
  items,
  selectedItemId,
  onItemChange,
  onAdd,
  disabled = false,
}: ItemSelectorProps) {
  const [quantity, setQuantity] = useState<string>("");

  const options: Option[] = useMemo(
    () => [
      { value: "", label: "Search or select item" },
      ...items.map((item) => ({
        value: String(item.id),
        label: item.item_name || item.name || "Unnamed Item",
      })),
    ],
    [items],
  );

  const handleAdd = () => {
    if (disabled) return;
    if (!selectedItemId || !quantity.trim()) return;

    const qty = Number(quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    onAdd(selectedItemId, qty);
    setQuantity("");
    onItemChange("");
  };

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <Select
          className="text-sm"
          classNames={{
            control: () =>
              "border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500",
          }}
          options={options}
          value={options.find((opt) => opt.value === selectedItemId) || null}
          onChange={(newValue) => onItemChange(newValue?.value ?? "")}
          placeholder="Search or select item..."
          isSearchable
          isClearable
          isDisabled={disabled}
        />
      </div>

      <input
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="Qty"
        className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50 text-black"
        min="1"
        disabled={disabled}
      />

      <button
        type="button"
        onClick={handleAdd}
        disabled={disabled || !selectedItemId || !quantity}
        className="px-4 py-2 text-sm bg-green-700 text-white rounded-[4px] hover:bg-green-600 disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}

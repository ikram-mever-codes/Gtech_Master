"use client";
import React, { useState, useEffect } from "react";
import ReactSelect from "react-select";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import {
  createItem,
  getParents,
  getAllTarics,
  Parent,
  Taric,
} from "@/api/items";
import { createRequestedItem } from "@/api/requested_items";
import { getAllSuppliers, Supplier } from "@/api/suppliers";
import { getCategories } from "@/api/categories";
import { TagPickerInput, type Tag } from "@/components/Tags/TagManager";
import { syncEntityTags } from "@/api/tags";

interface ItemCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRequest?: boolean;
  businessId?: string;
  inquiryId?: string;
  onCreated?: (createdItem: any) => void;
}

const errorStyles = {
  style: {
    background: "#fff",
    color: "#e53e3e",
    border: "1px solid #fed7d7",
  },
};

export const ItemCreateModal: React.FC<ItemCreateModalProps> = ({
  isOpen,
  onClose,
  isRequest = false,
  businessId = "",
  inquiryId,
  onCreated,
}) => {
  const [refParents, setRefParents] = useState<Parent[]>([]);
  const [refTarics, setRefTarics] = useState<Taric[]>([]);
  const [refSuppliers, setRefSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [newItemTags, setNewItemTags] = useState<Tag[]>([]);
  const [itemFormData, setItemFormData] = useState<any>({
    item_name: "",
    item_name_cn: "",
    ean: "",
    parent_id: 0,
    taric_id: 0,
    cat_id: 0,
    supplier_id: 0,
    weight: 0,
    length: 0,
    width: 0,
    height: 0,
    remark: "",
    model: "",
    price: 0,
    currency: isRequest ? "EUR" : "CNY",
    isActive: true,
    is_eur_special: false,
    is_rmb_special: false,
    item_no_de: "",
    item_name_de: "",
    qty: "",
    interval: "Monatlich",
    priority: "Normal",
    requestStatus: "Open",
  });

  useEffect(() => {
    if (!isOpen) return;

    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const [parentsRes, taricsRes, suppliersRes, categoriesRes] = await Promise.all([
          getParents({ page: 1, limit: 100000 }),
          getAllTarics({ page: 1, limit: 100000 }),
          getAllSuppliers({ page: 1, limit: 100000 }),
          getCategories(),
        ]);
        setRefParents(parentsRes.data || []);
        setRefTarics(taricsRes.data || []);
        setRefSuppliers(suppliersRes.data || []);
        setCategories(categoriesRes?.data || []);
      } catch (err) {
        console.error("Failed to load select options in ItemCreateModal:", err);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, [isOpen]);

  if (!isOpen) return null;

  const hasChinese = (str: string) => /[\u4e00-\u9fa5]/.test(str || "");
  const getSupplierLabel = (s: any) => {
    const name = s.name || "";
    const isEnglish = name && !hasChinese(name);
    return `[ID: ${s.id}]${isEnglish ? " " + name : ""}`;
  };

  const calculateEAN13Checksum = (ean12: string) => {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const d = parseInt(ean12[i], 10);
      sum += i % 2 === 0 ? d : d * 3;
    }
    const r = sum % 10;
    return r === 0 ? 0 : 10 - r;
  };

  const generateEAN13 = () => {
    let ean12 = "";
    for (let i = 0; i < 12; i++) ean12 += Math.floor(Math.random() * 10);
    return `${ean12}${calculateEAN13Checksum(ean12)}`;
  };

  const handleSubmit = async () => {
    if (!itemFormData.item_name?.trim()) {
      return toast.error("Item name is required", errorStyles);
    }
    if (!itemFormData.parent_id) {
      return toast.error("Parent is required", errorStyles);
    }
    if (!itemFormData.supplier_id) {
      return toast.error("Supplier is required", errorStyles);
    }
    if (isRequest) {
      if (!businessId) {
        return toast.error("Business ID is required for requested items", errorStyles);
      }
      if (!itemFormData.qty?.trim()) {
        return toast.error("Quantity is required for requested items", errorStyles);
      }
    }

    try {
      let result: any;
      if (isRequest) {
        result = await createRequestedItem({
          businessId,
          inquiryId,
          itemName: itemFormData.item_name,
          item_name_cn: itemFormData.item_name_cn,
          ean: itemFormData.ean,
          parent_id: itemFormData.parent_id,
          taric_id: itemFormData.taric_id || undefined,
          cat_id: itemFormData.cat_id || undefined,
          supplier_id: itemFormData.supplier_id || undefined,
          weight: itemFormData.weight || undefined,
          length: itemFormData.length || undefined,
          width: itemFormData.width || undefined,
          height: itemFormData.height || undefined,
          remark: itemFormData.remark,
          extraNote: itemFormData.remark,
          model: itemFormData.model,
          purchasePrice: Number(itemFormData.price) || 0,
          currency: itemFormData.currency || "EUR",
          isActive: itemFormData.isActive ? "Y" : "N",
          itemNo: itemFormData.item_no_de || undefined,
          item_name_de: itemFormData.item_name_de || undefined,
          is_eur_special: itemFormData.is_eur_special ? "Y" : "N",
          is_rmb_special: itemFormData.is_rmb_special ? "Y" : "N",
          qty: itemFormData.qty,
          interval: itemFormData.interval,
          priority: itemFormData.priority,
          requestStatus: itemFormData.requestStatus,
        });
      } else {
        result = await createItem({
          item_name: itemFormData.item_name,
          item_name_cn: itemFormData.item_name_cn,
          ean: itemFormData.ean,
          parent_id: itemFormData.parent_id,
          taric_id: itemFormData.taric_id || undefined,
          cat_id: itemFormData.cat_id || undefined,
          supplier_id: itemFormData.supplier_id || undefined,
          weight: itemFormData.weight || undefined,
          length: itemFormData.length || undefined,
          width: itemFormData.width || undefined,
          height: itemFormData.height || undefined,
          remark: itemFormData.remark,
          model: itemFormData.model,
          price: Number(itemFormData.price) || 0,
          currency: itemFormData.currency || "CNY",
          isActive: itemFormData.isActive ? "Y" : "N",
          item_no_de: itemFormData.item_no_de || undefined,
          item_name_de: itemFormData.item_name_de || undefined,
          is_eur_special: itemFormData.is_eur_special ? "Y" : "N",
          is_rmb_special: itemFormData.is_rmb_special ? "Y" : "N",
        });
      }
      const createdId = result?.data?.id || result?.data?.data?.id || result?.id;
      if (createdId && newItemTags.length > 0) {
        await syncEntityTags(
          createdId,
          isRequest ? "request_item" : "item",
          newItemTags.map((t) => t.id)
        );
      }
      toast.success(`${isRequest ? "Request item" : "Item"} created successfully`);
      if (onCreated) onCreated(result?.data || result);
      onClose();
    } catch (e: any) {
      toast.error(e.message || `Failed to create ${isRequest ? "request item" : "item"}`, errorStyles);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex-grow overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {isRequest ? "Create New Request Item" : "Create New Item"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          {loadingOptions ? (
            <div className="py-20 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary" />
              <p className="mt-2 text-sm text-gray-500">Loading form options...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  value={itemFormData.item_name}
                  onChange={(e) =>
                    setItemFormData({
                      ...itemFormData,
                      item_name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter item name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chinese Name
                </label>
                <input
                  value={itemFormData.item_name_cn}
                  onChange={(e) =>
                    setItemFormData({
                      ...itemFormData,
                      item_name_cn: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  EAN
                </label>
                <div className="flex gap-2">
                  <input
                    value={itemFormData.ean}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        ean: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Leave empty to auto-generate"
                  />
                  <button
                    onClick={() =>
                      setItemFormData((p: any) => ({
                        ...p,
                        ean: generateEAN13(),
                      }))
                    }
                    className="px-2 text-xs bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Gen
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DE Number
                </label>
                <input
                  value={itemFormData.item_no_de}
                  onChange={(e) =>
                    setItemFormData({
                      ...itemFormData,
                      item_no_de: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g. DE1024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DE Item Name
                </label>
                <input
                  value={itemFormData.item_name_de}
                  onChange={(e) =>
                    setItemFormData({
                      ...itemFormData,
                      item_name_de: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent *
                </label>
                <ReactSelect
                  options={
                    refParents?.map((p) => ({
                      value: p.id,
                      label: `${p.name_de} (${p.de_no})`,
                    })) || []
                  }
                  value={
                    itemFormData.parent_id
                      ? {
                        value: itemFormData.parent_id,
                        label: (() => {
                          const p = refParents?.find(
                            (x) => x.id === itemFormData.parent_id
                          );
                          return p
                            ? `${p.name_de} (${p.de_no})`
                            : "Unknown";
                        })(),
                      }
                      : null
                  }
                  onChange={(opt: any) =>
                    setItemFormData({
                      ...itemFormData,
                      parent_id: opt ? opt.value : 0,
                    })
                  }
                  isClearable
                  isSearchable
                  placeholder="Select Parent..."
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TARIC
                </label>
                <ReactSelect
                  options={
                    refTarics?.map((t) => ({
                      value: t.id,
                      label: `${t.code} - ${t.name_de}`,
                    })) || []
                  }
                  value={
                    itemFormData.taric_id
                      ? {
                        value: itemFormData.taric_id,
                        label: (() => {
                          const t = refTarics?.find(
                            (x) => x.id === itemFormData.taric_id
                          );
                          return t ? `${t.code} - ${t.name_de}` : "Unknown";
                        })(),
                      }
                      : null
                  }
                  onChange={(opt: any) =>
                    setItemFormData({
                      ...itemFormData,
                      taric_id: opt ? opt.value : 0,
                    })
                  }
                  isClearable
                  isSearchable
                  placeholder="Select a Taric..."
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <ReactSelect
                  options={
                    categories?.map((c) => ({
                      value: c.id,
                      label: c.name,
                    })) || []
                  }
                  value={
                    itemFormData.cat_id
                      ? {
                        value: itemFormData.cat_id,
                        label:
                          categories?.find(
                            (x) => x.id === itemFormData.cat_id
                          )?.name || "Unknown",
                      }
                      : null
                  }
                  onChange={(opt: any) =>
                    setItemFormData({
                      ...itemFormData,
                      cat_id: opt ? opt.value : 0,
                    })
                  }
                  isClearable
                  isSearchable
                  placeholder="Select Category..."
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier *
                </label>
                <ReactSelect
                  options={
                    refSuppliers?.map((s) => ({
                      value: s.id,
                      label: getSupplierLabel(s),
                    })) || []
                  }
                  value={
                    itemFormData.supplier_id
                      ? {
                        value: itemFormData.supplier_id,
                        label: (() => {
                          const s = refSuppliers?.find(
                            (x) => x.id === itemFormData.supplier_id
                          );
                          return s ? getSupplierLabel(s) : "Unknown";
                        })(),
                      }
                      : null
                  }
                  onChange={(opt: any) =>
                    setItemFormData({
                      ...itemFormData,
                      supplier_id: opt ? opt.value : 0,
                    })
                  }
                  isClearable
                  isSearchable
                  placeholder="Select Supplier..."
                  className="text-sm"
                />
              </div>
              {(["weight", "length", "width", "height"] as const).map(
                (dim) => (
                  <div key={dim}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {dim[0].toUpperCase() + dim.slice(1)} (
                      {dim === "weight" ? "kg" : "cm"})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={(itemFormData as any)[dim]}
                      onChange={(e) =>
                        setItemFormData({
                          ...itemFormData,
                          [dim]: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                )
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <input
                  value={itemFormData.model}
                  onChange={(e) =>
                    setItemFormData({
                      ...itemFormData,
                      model: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={itemFormData.price}
                  onChange={(e) =>
                    setItemFormData({
                      ...itemFormData,
                      price:
                        e.target.value === ""
                          ? 0
                          : parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <ReactSelect
                  options={[
                    { value: "CNY", label: "CNY (¥)" },
                    { value: "EUR", label: "EUR (€)" },
                    { value: "USD", label: "USD ($)" },
                    { value: "GBP", label: "GBP (£)" },
                  ]}
                  value={{
                    value: itemFormData.currency,
                    label: itemFormData.currency,
                  }}
                  onChange={(opt: any) =>
                    setItemFormData({
                      ...itemFormData,
                      currency: opt ? opt.value : (isRequest ? "EUR" : "CNY"),
                    })
                  }
                  className="text-sm"
                />
              </div>

              {isRequest && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      value={itemFormData.qty}
                      onChange={(e) =>
                        setItemFormData({
                          ...itemFormData,
                          qty: e.target.value,
                        })
                      }
                      placeholder="e.g. 100 Stk"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Interval
                    </label>
                    <select
                      value={itemFormData.interval}
                      onChange={(e) =>
                        setItemFormData({
                          ...itemFormData,
                          interval: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                    >
                      <option value="Monatlich">Monatlich</option>
                      <option value="2 monatlich">2 monatlich</option>
                      <option value="Quartal">Quartal</option>
                      <option value="halbjährlich">halbjährlich</option>
                      <option value="jährlich">jährlich</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={itemFormData.priority}
                      onChange={(e) =>
                        setItemFormData({
                          ...itemFormData,
                          priority: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Request Status
                    </label>
                    <select
                      value={itemFormData.requestStatus}
                      onChange={(e) =>
                        setItemFormData({
                          ...itemFormData,
                          requestStatus: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                    >
                      <option value="Open">Open</option>
                      <option value="supplier search">Supplier search</option>
                      <option value="stopped">Stopped</option>
                      <option value="successful">Successful</option>
                    </select>
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks
                </label>
                <textarea
                  value={itemFormData.remark}
                  onChange={(e) =>
                    setItemFormData({
                      ...itemFormData,
                      remark: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={itemFormData.isActive ? "Y" : "N"}
                  onChange={(e) =>
                    setItemFormData({
                      ...itemFormData,
                      isActive: e.target.value === "Y",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                >
                  <option value="Y">Active</option>
                  <option value="N">Inactive</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="is_special"
                  checked={itemFormData.is_eur_special}
                  onChange={(e) =>
                    setItemFormData({
                      ...itemFormData,
                      is_eur_special: e.target.checked,
                      is_rmb_special: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-green-600 border-gray-300 rounded"
                />
                <label
                  htmlFor="is_special"
                  className="text-sm font-medium text-gray-700"
                >
                  Special Item
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <TagPickerInput
                  category={isRequest ? "request_item" : "item"}
                  selectedTags={newItemTags}
                  onChange={setNewItemTags}
                />
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-6 mt-6 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                loadingOptions ||
                !itemFormData.item_name?.trim() ||
                !itemFormData.parent_id ||
                !itemFormData.supplier_id ||
                (isRequest && (!businessId || !itemFormData.qty?.trim()))
              }
              className="flex-1 px-4 py-2 bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] disabled:opacity-50 font-medium"
            >
              {isRequest ? "Create Request Item" : "Create Item"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ItemCreateModal;
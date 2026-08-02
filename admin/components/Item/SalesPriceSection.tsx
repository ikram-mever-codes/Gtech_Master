"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { PlusIcon, TrashIcon, PencilIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { CustomerSearchInput } from "@/components/UI/CustomerSearchInput";
import {
  getSalesPricesForItem,
  createSalesPrice,
  updateSalesPrice,
  deleteSalesPrice,
  type SalesPricesForItem,
  type CustomerSalesPriceRow,
} from "@/api/sales_price";
import { errorStyles, successStyles } from "@/utils/constants";

const inputCls =
  "w-full px-2.5 py-1.5 text-sm border border-gray-300/80 bg-white/70 rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all";

interface SalesPriceSectionProps {
  itemId: number | string;
  isEditEnabled?: boolean;
}

const formatPrice = (v: number) => v.toFixed(4);

export const SalesPriceSection: React.FC<SalesPriceSectionProps> = ({
  itemId,
  isEditEnabled = true,
}) => {

  const [data, setData] = useState<SalesPricesForItem | null>(null);
  const [loading, setLoading] = useState(false);

  // Cell-edit / add-tier popup
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalCustomerId, setModalCustomerId] = useState<string>("");
  const [modalCustomerName, setModalCustomerName] = useState<string>("");
  const [modalIsIndividual, setModalIsIndividual] = useState(true);
  const [modalTierId, setModalTierId] = useState<number | null>(null);
  const [modalQty, setModalQty] = useState("");
  const [modalPrice, setModalPrice] = useState("");

  // Add-customer popup
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState<string>("");
  const [newCustomerName, setNewCustomerName] = useState<string>("");
  const [selectedCustomerData, setSelectedCustomerData] = useState<any>(null);

  const load = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    try {
      const res: any = await getSalesPricesForItem(itemId);
      if (res.success) {
        // Filter out the global row
        const filteredRows = (res.data?.rows || []).filter(
          (row: any) => row.customerId !== null,
        );
        setData({
          ...res.data,
          rows: filteredRows,
        });
      }
    } catch (e) {
      console.error("Failed to load sales prices:", e);
      toast.error("Failed to load sales prices", errorStyles);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    load();
  }, [load]);

  // Column headers: the union of every tier quantity across every customer row
  const tierQuantities = useMemo(() => {
    const set = new Set<number>();
    (data?.rows || []).forEach((row) =>
      row.tiers.forEach((t) => set.add(t.minQuantity)),
    );
    return Array.from(set).sort((a, b) => a - b);
  }, [data]);

  const rowsWithData = data?.rows || [];

  const openIndividualModal = (row: CustomerSalesPriceRow) => {
    setModalTitle(
      row.individual
        ? `Edit individual price — ${row.customerName}`
        : `Add individual price — ${row.customerName}`,
    );
    setModalCustomerId(row.customerId === null ? "" : String(row.customerId));
    setModalCustomerName(row.customerName);
    setModalIsIndividual(true);
    setModalTierId(row.individual?.id ?? null);
    setModalQty("1");
    setModalPrice(row.individual ? String(row.individual.unitPriceEur) : "");
    setShowModal(true);
  };

  const openTierModal = (
    row: CustomerSalesPriceRow,
    existing?: { id: number; minQuantity: number; unitPriceEur: number },
  ) => {
    setModalTitle(
      existing
        ? `Edit tier — ${row.customerName}`
        : `Add tier — ${row.customerName}`,
    );
    setModalCustomerId(row.customerId === null ? "" : String(row.customerId));
    setModalCustomerName(row.customerName);
    setModalIsIndividual(false);
    setModalTierId(existing?.id ?? null);
    setModalQty(existing ? String(existing.minQuantity) : "");
    setModalPrice(existing ? String(existing.unitPriceEur) : "");
    setShowModal(true);
  };

  const submitModal = async () => {
    const priceStr = modalPrice.trim().replace(",", ".");
    const price = Number(priceStr);

    if (!priceStr || isNaN(price) || price < 0) {
      toast.error("Enter a valid unit price.", errorStyles);
      return;
    }

    let qty: number | undefined;
    if (!modalIsIndividual) {
      const qtyStr = modalQty.trim().replace(",", ".");
      qty = Number(qtyStr);
      if (!qtyStr || isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
        toast.error(
          "Enter a valid positive integer for minimum quantity.",
          errorStyles,
        );
        return;
      }
    }

    try {
      const customerId = modalCustomerId ? modalCustomerId : null;

      if (modalTierId) {
        await updateSalesPrice(modalTierId, {
          minQuantity: qty,
          unitPriceEur: price,
        });
      } else {
        await createSalesPrice({
          itemId: Number(itemId),
          customerId: customerId,
          isIndividual: modalIsIndividual,
          minQuantity: qty,
          unitPriceEur: price,
        });
      }

      toast.success("Sales price saved successfully.", successStyles);
      setShowModal(false);
      await load();
    } catch (e: any) {
      console.error("Couldn't save sales price:", e);
      toast.error(
        e.message || "Failed to save sales price. Please try again.",
        errorStyles,
      );
    }
  };

  const removeEntry = async (id: number, label: string) => {
    if (!window.confirm(`Delete ${label}?`)) return;
    try {
      await deleteSalesPrice(id);
      toast.success("Deleted successfully.", successStyles);
      await load();
    } catch (e) {
      console.error("Couldn't delete sales price:", e);
      toast.error("Failed to delete sales price.", errorStyles);
    }
  };

  const addTierColumnFor = (row: CustomerSalesPriceRow) => openTierModal(row);

  const startAddCustomer = () => {
    setNewCustomerId("");
    setNewCustomerName("");
    setSelectedCustomerData(null);
    setShowAddCustomer(true);
  };

  const confirmAddCustomer = async () => {
    if (!newCustomerId || newCustomerId === "" || newCustomerId === "0") {
      toast.error("Please select a customer first.", errorStyles);
      return;
    }

    let customerIdToSend = newCustomerId;

    if (selectedCustomerData && selectedCustomerData.id) {
      customerIdToSend = String(selectedCustomerData.id);
    }

    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    const isValidUUID = uuidRegex.test(customerIdToSend);

    if (!isValidUUID) {
      toast.error(
        `Invalid customer ID format. Please select a different customer.`,
        errorStyles,
      );
      return;
    }

    try {
      const payload = {
        itemId: Number(itemId),
        customerId: customerIdToSend,
        isIndividual: true,
        minQuantity: 1,
        unitPriceEur: 0,
      };

      await createSalesPrice(payload);

      toast.success(
        "Customer price entry created. You can now add tiers.",
        successStyles,
      );
      setShowAddCustomer(false);
      setNewCustomerId("");
      setNewCustomerName("");
      setSelectedCustomerData(null);
      await load();
    } catch (e: any) {
      console.error("Couldn't create customer price:", e);
      toast.error(
        e.message || "Failed to create customer price. Please try again.",
        errorStyles,
      );
    }
  };

  const handleCustomerSelect = (customerId: string, customerData?: any) => {
    setNewCustomerId(customerId);

    if (customerData) {
      setSelectedCustomerData(customerData);
      setNewCustomerName(
        customerData.companyName ||
        customerData.legalName ||
        "Selected customer",
      );
    } else {
      setSelectedCustomerData(null);
      setNewCustomerName("");
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Sales prices</h3>
        </div>
        <div className="text-sm text-gray-500 py-4">Loading prices…</div>
      </div>
    );
  }

  return (
    <div className="space-y-3  mt-3">
      {isEditEnabled && (
        <div className="w-full justify-between">
          <button
            onClick={startAddCustomer}
            className="text-xs font-medium text-blue-700 hover:text-blue-900 flex items-center gap-1 transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add customer price
          </button>
        </div>
      )}
      {rowsWithData.length === 0 ? (
        <div className="text-sm text-gray-400 py-4 text-center border border-gray-200 rounded-lg bg-gray-50">
          No customer-specific prices. Click "Add customer price" to create one.
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600 text-xs uppercase tracking-wider">
                  Base Price
                </th>
                {tierQuantities.map((q) => (
                  <th
                    key={q}
                    className="px-3 py-2 text-right font-semibold text-gray-600 text-xs uppercase tracking-wider"
                  >
                    {q}+
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-semibold text-gray-600 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rowsWithData.map((row) => (
                <tr
                  key={row.customerId ?? "global"}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900 text-sm truncate max-w-[150px]">
                      {row.customerName}
                    </div>
                    {row.customerNumber && (
                      <div className="text-xs text-gray-500">
                        #{row.customerNumber}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => openIndividualModal(row)}
                      className={`px-2 py-0.5 rounded transition-colors text-sm ${row.individual
                          ? "font-semibold text-gray-900 hover:bg-gray-100"
                          : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        }`}
                    >
                      {row.individual
                        ? formatPrice(row.individual.unitPriceEur)
                        : "+ add"}
                    </button>
                  </td>
                  {tierQuantities.map((q) => {
                    const tier = row.tiers.find((t) => t.minQuantity === q);
                    return (
                      <td key={q} className="px-3 py-2 text-right">
                        {tier ? (
                          <div className="inline-flex items-center gap-1 group">
                            <button
                              onClick={() => openTierModal(row, tier)}
                              className="font-medium text-gray-900 hover:bg-gray-100 px-2 py-0.5 rounded text-sm"
                            >
                              {formatPrice(tier.unitPriceEur)}
                            </button>
                            <button
                              onClick={() =>
                                removeEntry(tier.id, `the ${q} tier`)
                              }
                              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-rose-600 transition-opacity"
                            >
                              <TrashIcon className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => addTierColumnFor(row)}
                      title="Add a new quantity tier"
                      className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Individual price / tier add-edit popup */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h4 className="text-lg font-bold text-gray-900">{modalTitle}</h4>
            {!modalIsIndividual && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Minimum quantity
                </label>
                <input
                  className={inputCls}
                  value={modalQty}
                  onChange={(e) => setModalQty(e.target.value)}
                  placeholder="e.g., 10"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Net unit price (€)
              </label>
              <input
                className={inputCls}
                value={modalPrice}
                onChange={(e) => setModalPrice(e.target.value)}
                placeholder="e.g., 15.50"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitModal}
                className="flex-1 px-4 py-2 text-sm bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer picker */}
      {showAddCustomer && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
          onClick={(e) =>
            e.target === e.currentTarget && setShowAddCustomer(false)
          }
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h4 className="text-lg font-bold text-gray-900">
              Add customer price
            </h4>
            <p className="text-xs text-gray-500">
              Select a customer to add sales prices for them.
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Customer
              </label>
              <CustomerSearchInput
                value={newCustomerId}
                onChange={handleCustomerSelect}
                placeholder="Search customer..."
                mode="customers"
                className="w-full"
              />
            </div>
            {newCustomerName && (
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                Selected: <span className="font-medium">{newCustomerName}</span>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowAddCustomer(false);
                  setNewCustomerId("");
                  setNewCustomerName("");
                  setSelectedCustomerData(null);
                }}
                className="flex-1 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddCustomer}
                className="flex-1 px-4 py-2 text-sm bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] transition-colors"
              >
                Create & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPriceSection;

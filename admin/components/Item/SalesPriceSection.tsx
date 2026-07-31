"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PlusIcon, TrashIcon, PencilIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { CustomerSearchInput } from "@/components/UI/CustomerSearchInput";
import {
  getSalesPricesForItem,
  createSalesPrice,
  updateSalesPrice,
  deleteSalesPrice,
  type SalesPricesForItem,
  type SalesPriceTier,
} from "@/api/sales_price";
import { errorStyles, successStyles } from "@/utils/constants";

const inputCls =
  "w-full px-2.5 py-1.5 text-sm border border-gray-300/80 bg-white/70 rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all";

interface SalesPriceSectionProps {
  itemId: number | string;
}

interface PriceCardProps {
  title: string;
  subtitle?: string;
  tiers: SalesPriceTier[];
  onAddTier: () => void;
  onEditTier: (tier: SalesPriceTier) => void;
  onDeleteTier: (tier: SalesPriceTier) => void;
  accent?: "global" | "customer";
}

/** One customer's (or the item's global) price ladder — a small card in
 * the horizontally-scrolling row. Shown sorted by quantity, with quick
 * edit/delete per tier and an "Add tier" affordance. */
const PriceCard: React.FC<PriceCardProps> = ({
  title,
  subtitle,
  tiers,
  onAddTier,
  onEditTier,
  onDeleteTier,
  accent = "customer",
}) => {
  const sortedTiers = React.useMemo(
    () => [...tiers].sort((a, b) => a.minQuantity - b.minQuantity),
    [tiers],
  );

  return (
    <div className="shrink-0 w-64 border border-gray-200 rounded-lg bg-white overflow-hidden flex flex-col">
      <div
        className={`px-3 py-2 border-b ${
          accent === "global"
            ? "bg-gray-50 border-gray-200"
            : "bg-blue-50/60 border-blue-100"
        }`}
      >
        <div className="text-sm font-semibold text-gray-900 truncate">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-gray-500 truncate">{subtitle}</div>
        )}
      </div>
      <div className="flex-1 divide-y divide-gray-100">
        {sortedTiers.length === 0 ? (
          <div className="px-3 py-3 text-xs text-gray-400">
            No price tiers yet.
          </div>
        ) : (
          sortedTiers.map((t) => (
            <div
              key={t.id}
              className="px-3 py-1.5 flex items-center justify-between text-sm hover:bg-gray-50 group"
            >
              <span className="text-gray-600">From {t.minQuantity}</span>
              <span className="font-medium text-gray-900">
                {t.unitPriceEur.toFixed(4)} €
              </span>
              <div className="hidden group-hover:flex items-center gap-1 ml-2">
                <button
                  type="button"
                  onClick={() => onEditTier(t)}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                  aria-label="Edit tier"
                >
                  <PencilIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteTier(t)}
                  className="text-gray-400 hover:text-rose-600 transition-colors"
                  aria-label="Delete tier"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <button
        type="button"
        onClick={onAddTier}
        className="px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 border-t border-gray-100 flex items-center gap-1 transition-colors"
      >
        <PlusIcon className="w-3.5 h-3.5" />
        Add tier
      </button>
    </div>
  );
};

export const SalesPriceSection: React.FC<SalesPriceSectionProps> = ({
  itemId,
}) => {
  const [data, setData] = useState<SalesPricesForItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Popup state — covers "add a tier to an existing scope" and "add a
  // brand-new customer's first tier" in one modal.
  const [showModal, setShowModal] = useState(false);
  const [modalScope, setModalScope] = useState<{
    customerId: string; // "" = global
  }>({ customerId: "" });
  const [modalTierId, setModalTierId] = useState<number | null>(null);
  const [modalQty, setModalQty] = useState("1");
  const [modalPrice, setModalPrice] = useState("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState("");

  const load = useCallback(async () => {
    if (!itemId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await getSalesPricesForItem(itemId);

      if (res?.success && res.data) {
        setData(res.data);
      } else {
        setError("Failed to load sales prices");
      }
    } catch (e) {
      console.error("Failed to load sales prices:", e);
      setError("An error occurred while loading sales prices");
      toast.error("Failed to load sales prices", errorStyles);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    load();
  }, [load]);

  const openAddTier = (customerId: string) => {
    setModalScope({ customerId });
    setModalTierId(null);
    setModalQty("1");
    setModalPrice("");
    setShowModal(true);
  };

  const openEditTier = (customerId: string, tier: SalesPriceTier) => {
    setModalScope({ customerId });
    setModalTierId(tier.id);
    setModalQty(String(tier.minQuantity));
    setModalPrice(String(tier.unitPriceEur));
    setShowModal(true);
  };

  const submitModal = async () => {
    // Validate inputs
    const qtyStr = modalQty.trim().replace(",", ".");
    const priceStr = modalPrice.trim().replace(",", ".");

    const qty = Number(qtyStr);
    const price = Number(priceStr);

    if (!qtyStr || isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
      toast.error(
        "Enter a valid positive integer for minimum quantity.",
        errorStyles,
      );
      return;
    }

    if (!priceStr || isNaN(price) || price < 0) {
      toast.error("Enter a valid non-negative unit price.", errorStyles);
      return;
    }

    try {
      if (modalTierId) {
        await updateSalesPrice(modalTierId, {
          minQuantity: qty,
          unitPriceEur: price,
        });
      } else {
        await createSalesPrice({
          itemId: Number(itemId),
          customerId: modalScope.customerId
            ? Number(modalScope.customerId)
            : null,
          minQuantity: qty,
          unitPriceEur: price,
        });
      }

      toast.success("Price tier saved successfully.", successStyles);
      setShowModal(false);
      await load();
    } catch (e) {
      console.error("Couldn't save price tier:", e);
      toast.error("Failed to save price tier. Please try again.", errorStyles);
    }
  };

  const removeTier = async (tier: SalesPriceTier) => {
    if (!window.confirm(`Delete the tier at ${tier.minQuantity}+ units?`)) {
      return;
    }

    try {
      await deleteSalesPrice(tier.id);
      toast.success("Price tier deleted successfully.", successStyles);
      await load();
    } catch (e) {
      console.error("Couldn't delete price tier:", e);
      toast.error(
        "Failed to delete price tier. Please try again.",
        errorStyles,
      );
    }
  };

  const addCustomerPrice = async () => {
    if (!newCustomerId) {
      toast.error("Please select a customer first.", errorStyles);
      return;
    }

    setShowAddCustomer(false);
    openAddTier(newCustomerId);
    setNewCustomerId("");
  };

  const sortedCustomers = React.useMemo(() => {
    if (!data?.customers) return [];
    return [...data.customers].sort((a, b) =>
      a.customerName.localeCompare(b.customerName),
    );
  }, [data?.customers]);

  // Modal component for better organization
  const renderTierModal = () => {
    if (!showModal) return null;

    return (
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
        onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
      >
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
          <h4 className="text-lg font-bold text-gray-900">
            {modalTierId ? "Edit price tier" : "Add price tier"}
          </h4>
          <p className="text-xs text-gray-500">
            {modalScope.customerId
              ? "Customer-specific tier — overrides the global ladder for this customer."
              : "Global tier — the default suggestion for every customer without their own pricing."}
          </p>
          <div>
            <label
              className="block text-xs font-medium text-gray-700 mb-1"
              htmlFor="minQuantity"
            >
              Minimum quantity
            </label>
            <input
              id="minQuantity"
              className={inputCls}
              value={modalQty}
              onChange={(e) => setModalQty(e.target.value)}
              type="text"
              inputMode="numeric"
            />
          </div>
          <div>
            <label
              className="block text-xs font-medium text-gray-700 mb-1"
              htmlFor="unitPrice"
            >
              Net unit price (€)
            </label>
            <input
              id="unitPrice"
              className={inputCls}
              value={modalPrice}
              onChange={(e) => setModalPrice(e.target.value)}
              type="text"
              inputMode="decimal"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitModal}
              className="flex-1 px-4 py-2 text-sm bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAddCustomerModal = () => {
    if (!showAddCustomer) return null;

    return (
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
          <div>
            <label
              className="block text-xs font-medium text-gray-700 mb-1"
              htmlFor="customerSearch"
            >
              Customer
            </label>
            <CustomerSearchInput
              value={newCustomerId}
              onChange={(id: string) => setNewCustomerId(id)}
              placeholder="Search customer..."
              mode="customers"
              className="w-full"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddCustomer(false)}
              className="flex-1 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addCustomerPrice}
              className="flex-1 px-4 py-2 text-sm bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
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

  if (error && !data) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Sales prices</h3>
        </div>
        <div className="text-sm text-red-500 py-4">{error}</div>
        <button
          type="button"
          onClick={load}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Sales prices</h3>
        <button
          type="button"
          onClick={() => setShowAddCustomer(true)}
          className="text-xs font-medium text-blue-700 hover:text-blue-900 flex items-center gap-1 transition-colors"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Add customer price
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        <PriceCard
          title="Global (default)"
          tiers={data?.global || []}
          accent="global"
          onAddTier={() => openAddTier("")}
          onEditTier={(t) => openEditTier("", t)}
          onDeleteTier={removeTier}
        />
        {sortedCustomers.map((c) => (
          <PriceCard
            key={c.customerId}
            title={c.customerName}
            subtitle={c.customerNumber ? `#${c.customerNumber}` : undefined}
            tiers={c.tiers}
            accent="customer"
            onAddTier={() => openAddTier(String(c.customerId))}
            onEditTier={(t) => openEditTier(String(c.customerId), t)}
            onDeleteTier={removeTier}
          />
        ))}
      </div>

      {renderTierModal()}
      {renderAddCustomerModal()}
    </div>
  );
};

export default SalesPriceSection;

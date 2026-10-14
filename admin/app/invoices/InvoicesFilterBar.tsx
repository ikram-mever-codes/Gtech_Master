"use client";

import React from "react";
import { X } from "lucide-react";
import FilterResetIcon from "@/components/UI/FilterResetIcon";
import SegmentedControl from "@/components/UI/SegmentedControl";
import { CustomerSearchInput } from "@/components/UI/CustomerSearchInput";
import type { FilterOptions } from "./invoiceHelpers";

interface InvoicesFilterBarProps {
  activeInvTab: string;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  orderNoFilter: string;
  setOrderNoFilter: (value: string) => void;
  filters: FilterOptions;
  cargoStatusFilter: string;
  setCargoStatusFilter: (value: string) => void;
  /** Orders / Order Items only: item name + customer filters. */
  itemNameFilter: string;
  setItemNameFilter: (value: string) => void;
  companyId: string;
  companyName: string;
  onCompanyChange: (id: string, name: string) => void;
  onReset: () => void;
}

const InvoicesFilterBar: React.FC<InvoicesFilterBarProps> = ({
  activeInvTab,
  searchTerm,
  setSearchTerm,
  orderNoFilter,
  setOrderNoFilter,
  filters,
  cargoStatusFilter,
  setCargoStatusFilter,
  itemNameFilter,
  setItemNameFilter,
  companyId,
  companyName,
  onCompanyChange,
  onReset,
}) => {
  const isInvoiceTab =
    activeInvTab === "open_invoices" || activeInvTab === "closed_invoices";
  const searchValue = isInvoiceTab ? searchTerm : orderNoFilter;
  const setSearchValue = isInvoiceTab ? setSearchTerm : setOrderNoFilter;
  const isOrdersTab =
    activeInvTab === "orders" || activeInvTab === "order_items";

  return (
    <div className="mb-6 p-3 bg-white border border-gray-200 rounded-md shadow-sm flex flex-wrap items-center justify-between gap-2 overflow-visible">
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 flex-1">
        <div className="flex items-center gap-1 shrink-0 select-none px-0.5">
          <FilterResetIcon
            isActive={
              !!(
                searchTerm ||
                orderNoFilter ||
                filters.status ||
                filters.dateFrom ||
                filters.dateTo ||
                filters.customer ||
                filters.minAmount ||
                filters.maxAmount ||
                itemNameFilter ||
                companyId ||
                companyName ||
                (cargoStatusFilter && cargoStatusFilter !== "Open")
              )
            }
            onReset={onReset}
          />
        </div>
        <div className="relative w-80 shrink-0">
          <input
            type="text"
            placeholder={
              isInvoiceTab
                ? "Search invoices, customers, or order numbers..."
                : activeInvTab === "cargos"
                  ? "Search cargos..."
                  : activeInvTab === "cargo_type"
                    ? "Search cargo types..."
                    : activeInvTab === "packing_list"
                      ? "Search packing lists..."
                      : "Search..."
            }
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className={`w-full px-2.5 h-8 text-xs border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${
              searchValue
                ? "font-bold text-emerald-600 border-emerald-500 bg-emerald-50/20"
                : "text-gray-900 border-gray-300 bg-white"
            }`}
          />
          {searchValue && (
            <button
              onClick={() => setSearchValue("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isOrdersTab && (
          <>
            <div className="relative w-[155px] flex-shrink-0">
              <input
                type="text"
                placeholder="Name..."
                value={itemNameFilter}
                onChange={(e) => setItemNameFilter(e.target.value)}
                className={`w-full px-2.5 h-8 text-xs border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${
                  itemNameFilter
                    ? "font-bold text-emerald-600 border-emerald-500 bg-emerald-50/20"
                    : "text-gray-900 border-gray-300 bg-white"
                }`}
              />
              {itemNameFilter && (
                <button
                  onClick={() => setItemNameFilter("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="relative w-[155px] flex-shrink-0">
              <CustomerSearchInput
                value={companyId || companyName || ""}
                onChange={(id, name) => onCompanyChange(id, name)}
                placeholder="Company..."
                mode="customers"
                initialLabel={companyName || ""}
              />
            </div>
          </>
        )}

        {activeInvTab === "cargos" && (
          <SegmentedControl
            options={[
              { value: "Open", label: "Open" },
              { value: "Shipped", label: "Shipped" },
              { value: "Delivered", label: "Delivered" },
            ]}
            value={cargoStatusFilter}
            onChange={setCargoStatusFilter}
          />
        )}
      </div>
    </div>
  );
};

export default InvoicesFilterBar;

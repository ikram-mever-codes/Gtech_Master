"use client";

import React from "react";
import { X } from "lucide-react";
import FilterResetIcon from "@/components/UI/FilterResetIcon";
import SegmentedControl from "@/components/UI/SegmentedControl";
import type { FilterOptions } from "./invoiceHelpers";

/**
 * Filter bar of the /invoices page (reset icon + search box + cargo status
 * segmented control). Props-driven like commercial/CommercialFilterBar.tsx,
 * but the invoices page has its own (much smaller) filter shape, so it is
 * not shared. Verbatim port of the inline JSX from the original page.
 *
 * On the invoice tabs the search box edits `searchTerm`; on every other tab
 * it edits `orderNoFilter` (which the Orders / Cargos / Cargo Type /
 * Packing List tabs use as their search term).
 */

interface InvoicesFilterBarProps {
  activeInvTab: string;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  orderNoFilter: string;
  setOrderNoFilter: (value: string) => void;
  filters: FilterOptions;
  cargoStatusFilter: string;
  setCargoStatusFilter: (value: string) => void;
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
  onReset,
}) => {
  const isInvoiceTab =
    activeInvTab === "open_invoices" || activeInvTab === "closed_invoices";
  const searchValue = isInvoiceTab ? searchTerm : orderNoFilter;
  const setSearchValue = isInvoiceTab ? setSearchTerm : setOrderNoFilter;

  return (
    <div className="mb-6 p-3 bg-white border border-gray-200 rounded-md shadow-sm flex flex-wrap items-center justify-between gap-2 overflow-visible">
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 flex-1">
        <div className="flex items-center gap-1 shrink-0 select-none px-0.5">
          <FilterResetIcon
            isActive={!!(
              searchTerm ||
              orderNoFilter ||
              filters.status ||
              filters.dateFrom ||
              filters.dateTo ||
              filters.customer ||
              filters.minAmount ||
              filters.maxAmount ||
              (cargoStatusFilter && cargoStatusFilter !== "Open")
            )}
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
            className={`w-full px-2.5 h-8 text-xs border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${searchValue
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

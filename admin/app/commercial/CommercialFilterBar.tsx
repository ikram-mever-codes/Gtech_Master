"use client";

import React from "react";
import { FunnelIcon, ArrowPathIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { CommercialFilters } from "@/utils/commercialFilters";
import type { InvoiceTab } from "../../hooks/useCommercialTabData";

// Mirrors the string status values InvoiceListPage actually filters on
// (item.auftrag_status, and STATUS_ORDER for the Auftrag tab's default
// sort) — the old generic numeric options (1-4) never matched these.
export enum AuftragStatus {
  OPEN = "open",
  PARTIALLY_DELIVERED = "partially_delivered",
  DELIVERED = "delivered",
  CLOSED = "closed",
}

const getInputClass = (hasValue: boolean, isEmptySelect: boolean = false) => {
  return `w-full px-2.5 h-8 text-xs border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${
    hasValue
      ? "font-bold text-emerald-600 border-emerald-500 bg-emerald-50/20"
      : isEmptySelect
        ? "text-gray-400 border-gray-300 bg-white"
        : "text-gray-900 border-gray-300 bg-white"
  }`;
};

interface CommercialFilterBarProps {
  activeInvTab: InvoiceTab;
  docFilters: CommercialFilters;
  setDocFilters: React.Dispatch<React.SetStateAction<CommercialFilters>>;
  isAnyFilterActive: boolean;
  onReset: () => void;
}

const CommercialFilterBar: React.FC<CommercialFilterBarProps> = ({
  activeInvTab,
  docFilters,
  setDocFilters,
  isAnyFilterActive,
  onReset,
}) => {
  return (
    <div className="mb-6 p-3 bg-white border border-gray-200 rounded-md shadow-sm overflow-visible">
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-1.5 w-full py-0.5 relative z-10">
        <div className="flex items-center gap-1 shrink-0 select-none px-0.5">
          {isAnyFilterActive ? (
            <button
              type="button"
              onClick={onReset}
              className="w-6 h-6 rounded-md bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
              title="Reset all filters"
            >
              <XMarkIcon className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          ) : (
            <FunnelIcon className="w-4 h-4 text-primary" />
          )}
        </div>

        <div className="w-32 shrink-0">
          <input
            type="text"
            placeholder="DocumentNo..."
            value={docFilters.documentNo}
            onChange={(e) =>
              setDocFilters((p) => ({ ...p, documentNo: e.target.value }))
            }
            className={getInputClass(!!docFilters.documentNo)}
          />
        </div>

        <div className="w-28 shrink-0">
          <input
            type="text"
            placeholder="CustomerNo..."
            value={docFilters.customerNo}
            onChange={(e) =>
              setDocFilters((p) => ({ ...p, customerNo: e.target.value }))
            }
            className={getInputClass(!!docFilters.customerNo)}
          />
        </div>

        <div className="w-36 shrink-0">
          <input
            type="text"
            placeholder="CustomerName..."
            value={docFilters.customerName}
            onChange={(e) =>
              setDocFilters((p) => ({ ...p, customerName: e.target.value }))
            }
            className={getInputClass(!!docFilters.customerName)}
          />
        </div>

        <div className="flex items-center gap-1 w-36 shrink-0">
          <select
            value={docFilters.valueOperator}
            onChange={(e) =>
              setDocFilters((p) => ({
                ...p,
                valueOperator: e.target.value as any,
              }))
            }
            className="w-10 px-1 h-8 text-xs border border-gray-300 rounded-md bg-white font-bold text-gray-700 focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all"
          >
            <option value="=">=</option>
            <option value="&gt;">{">"}</option>
            <option value="&lt;">{"<"}</option>
          </select>
          <input
            type="text"
            placeholder="Value..."
            value={docFilters.valueAmount}
            onChange={(e) =>
              setDocFilters((p) => ({ ...p, valueAmount: e.target.value }))
            }
            className={getInputClass(!!docFilters.valueAmount)}
          />
        </div>

        <div className="w-32 shrink-0">
          <select
            value={docFilters.status}
            onChange={(e) =>
              setDocFilters((p) => ({ ...p, status: e.target.value }))
            }
            className={getInputClass(!!docFilters.status, !docFilters.status)}
          >
            <option value="" className="text-gray-400">
              All Statuses...
            </option>
            {activeInvTab === "angebot" ? (
              <>
                <option value="draft" className="text-gray-900 font-normal">
                  Draft
                </option>
                <option value="sent" className="text-gray-900 font-normal">
                  Sent
                </option>
                <option value="approved" className="text-gray-900 font-normal">
                  Approved
                </option>
                <option value="rejected" className="text-gray-900 font-normal">
                  Rejected
                </option>
              </>
            ) : activeInvTab === "rechnung" || activeInvTab === "rk" ? (
              <>
                <option
                  value="partially_paid"
                  className="text-gray-900 font-normal"
                >
                  Partially Paid{" "}
                </option>

                <option value="paid" className="text-gray-900 font-normal">
                  Paid
                </option>
                <option value="unpaid" className="text-gray-900 font-normal">
                  Unpaid
                </option>
                <option value="overdue" className="text-gray-900 font-normal">
                  Overdue
                </option>
              </>
            ) : activeInvTab === "auftrag" ? (
              <>
                <option
                  value={AuftragStatus.OPEN}
                  className="text-gray-900 font-normal"
                >
                  Open
                </option>
                <option
                  value={AuftragStatus.PARTIALLY_DELIVERED}
                  className="text-gray-900 font-normal"
                >
                  Partially Delivered
                </option>
                <option
                  value={AuftragStatus.DELIVERED}
                  className="text-gray-900 font-normal"
                >
                  Delivered
                </option>
                <option
                  value={AuftragStatus.CLOSED}
                  className="text-gray-900 font-normal"
                >
                  Closed
                </option>
              </>
            ) : (
              <>
                <option value="1" className="text-gray-900 font-normal">
                  Draft / New
                </option>
                <option value="2" className="text-gray-900 font-normal">
                  In Progress
                </option>
                <option value="3" className="text-gray-900 font-normal">
                  Completed
                </option>
                <option value="4" className="text-gray-900 font-normal">
                  Converted
                </option>
              </>
            )}
          </select>
        </div>

        <div className="w-32 shrink-0">
          <select
            value={docFilters.datePreset}
            onChange={(e) =>
              setDocFilters((p) => ({
                ...p,
                datePreset: e.target.value as any,
              }))
            }
            className={getInputClass(
              docFilters.datePreset !== "all",
              docFilters.datePreset === "all",
            )}
          >
            <option value="all" className="text-gray-400">
              All Dates...
            </option>
            <option value="today" className="text-gray-900 font-normal">
              Today
            </option>
            <option value="this_month" className="text-gray-900 font-normal">
              This Month
            </option>
            <option value="last_month" className="text-gray-900 font-normal">
              Last Month
            </option>
            <option value="this_year" className="text-gray-900 font-normal">
              This Year
            </option>
            <option value="last_year" className="text-gray-900 font-normal">
              Last Year
            </option>
            <option value="custom" className="text-gray-900 font-normal">
              Custom Range
            </option>
          </select>
        </div>
      </div>

      {docFilters.datePreset === "custom" && (
        <div className="flex flex-wrap items-center gap-2 pt-2 mt-2 border-t border-gray-100 text-xs">
          <span className="font-bold text-gray-500 uppercase tracking-wider text-[11px]">
            Custom Date Range:
          </span>
          <div className="w-36">
            <input
              type="text"
              placeholder="From (dd.mm.yyyy)..."
              value={docFilters.dateFrom}
              onChange={(e) =>
                setDocFilters((p) => ({ ...p, dateFrom: e.target.value }))
              }
              className={getInputClass(!!docFilters.dateFrom)}
            />
          </div>
          <span className="text-gray-400 font-bold text-xs">to</span>
          <div className="w-36">
            <input
              type="text"
              placeholder="To (dd.mm.yyyy)..."
              value={docFilters.dateTo}
              onChange={(e) =>
                setDocFilters((p) => ({ ...p, dateTo: e.target.value }))
              }
              className={getInputClass(!!docFilters.dateTo)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CommercialFilterBar;

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowPathIcon,
  PlusIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import {
  BadgePercent,
  FileDown,
  ChevronRight,
  ChevronDown,
  Filter,
} from "lucide-react";
import PageHeader from "@/components/UI/PageHeader";
import CustomButton from "@/components/UI/CustomButton";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import {
  getAllOffers,
  formatCurrency,
  getOfferStatuses,
  getOfferStatusColor,
  downloadOfferPdf,
  type Offer,
  type OfferSearchFilters,
} from "@/api/offers";
import { formatDate } from "@/utils/offers";
import OfferDetailModal from "@/components/Offers/OfferDetailModal";
import ExpandRowArrow from "@/components/UI/ExpandRowArrow";
import DocumentLineItemsSubTable from "@/components/UI/DocumentLineItemsSubTable";

const getInputClass = (hasValue: boolean, isEmptySelect = false) =>
  `w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${hasValue
    ? "font-bold text-emerald-600 border-emerald-500 bg-emerald-50/20"
    : isEmptySelect
      ? "text-gray-400 border-gray-300 bg-white"
      : "text-gray-900 border-gray-300 bg-white"
  }`;

const getContrastTextColor = (hex: string): string => {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#111827";
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111827" : "#ffffff";
};

const OffersPage: React.FC<any> = ({ embedded = false }) => {
  const { user } = useSelector((state: RootState) => state.user);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const itemsPerPage = 20;

  const [filters, setFilters] = useState<OfferSearchFilters>({
    search: "",
    status: "",
    page: 1,
    limit: 20,
  });

  const [detailOfferId, setDetailOfferId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [expandedOfferIds, setExpandedOfferIds] = useState<Set<string>>(
    new Set(),
  );

  const toggleExpandOffer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedOfferIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllOffers(filters);
      if (res.success) {
        setOffers(res.data);
        setTotalRecords(res.pagination?.total || res.data.length);
        setTotalPages(res.pagination?.pages || 1);
      }
    } catch (e) {
      console.error("Error fetching offers:", e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const openCreate = () => {
    setDetailOfferId(null);
    setShowDetail(true);
  };
  const openDetail = (offer: Offer) => {
    setDetailOfferId(offer.id);
    setShowDetail(true);
  };

  const mainContent = (
    <>
      {!embedded && (
        <div className="mb-6 flex justify-between items-center">
          <PageHeader title="Offers" icon={BadgePercent} />
          <div className="flex gap-2">
            <CustomButton
              gradient
              onClick={openCreate}
              size="small"
              startIcon={<PlusIcon className="h-4 w-4" />}
            >
              New offer
            </CustomButton>
          </div>
        </div>
      )}

      <div className="mb-6 p-3 bg-white border border-gray-200 rounded-md shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 flex-1">
          <FunnelIcon className="w-5 h-5 text-primary shrink-0" />
          <div className="w-64 shrink-0">
            <input
              type="text"
              placeholder="Search offers…"
              value={filters.search || ""}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value, page: 1 })
              }
              className={getInputClass(!!filters.search)}
            />
          </div>
          <div className="w-48 shrink-0">
            <select
              value={filters.status || ""}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value, page: 1 })
              }
              className={getInputClass(!!filters.status, !filters.status)}
            >
              <option value="">All statuses</option>
              {getOfferStatuses().map((s: any) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() =>
              setFilters({ ...filters, search: "", status: "", page: 1 })
            }
            className="px-3 py-2 text-sm font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Reset
          </button>
        </div>

        {!embedded && (
          <div className="flex gap-2 shrink-0">
            <CustomButton
              onClick={fetchOffers}
              disabled={loading}
              gradient
              size="small"
              startIcon={
                <ArrowPathIcon
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              }
            >
              Refresh
            </CustomButton>
            <CustomButton
              gradient
              onClick={openCreate}
              size="small"
              startIcon={<PlusIcon className="h-4 w-4" />}
            >
              New offer
            </CustomButton>
          </div>
        )}
      </div>

      <div className="bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center gap-3">
              <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-500" />
              <span className="text-gray-600">Loading offers…</span>
            </div>
          </div>
        ) : offers.length === 0 ? (
          <div className="p-8 text-center">
            <DocumentTextIcon className="h-10 w-10 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No offers found</p>
            <p className="text-gray-500 text-sm mt-2">
              Create one from an inquiry, or from a customer and item(s).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-9 px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Offer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status &amp; expiry
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {offers.map((offer: any) => {
                  const isExpanded = expandedOfferIds.has(offer.id);
                  const lineItems = offer.lineItems?.filter((li: any) => !li.isComponent) || [];
                  const rowColor = offer.highlightColor || null;
                  const rowTextColor = rowColor
                    ? getContrastTextColor(rowColor)
                    : undefined;

                  return (
                    <React.Fragment key={offer.id}>
                      <tr
                        onClick={() => openDetail(offer)}
                        className={`transition-colors cursor-pointer ${rowColor ? "" : "hover:bg-gray-50"
                          }`}
                        style={
                          rowColor
                            ? { backgroundColor: rowColor, color: rowTextColor }
                            : undefined
                        }
                      >
                        <td
                          className="px-2 py-3 text-center"
                          onClick={(e) => toggleExpandOffer(offer.id, e)}
                        >
                          <ExpandRowArrow
                            isExpanded={isExpanded}
                            isEmpty={lineItems.length === 0}
                            title={lineItems.length === 0 ? "No items in this offer" : isExpanded ? "Collapse items" : "Expand items"}
                            onToggle={(e) => toggleExpandOffer(offer.id, e)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className="text-sm font-medium"
                            style={{ color: rowTextColor }}
                          >
                            {!rowColor && (
                              <span className="text-gray-900">
                                {offer.offerNumber}
                              </span>
                            )}
                            {rowColor && offer.offerNumber}
                            {offer.revision > 1 && (
                              <span
                                className={`ml-2 text-xs ${rowColor ? "" : "text-gray-500"
                                  }`}
                              >
                                Rev. {offer.revision}
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-sm truncate max-w-[16rem] ${rowColor ? "" : "text-gray-600"
                              }`}
                          >
                            {offer.title}
                          </div>
                          <div
                            className={`text-xs mt-1 flex items-center gap-2 ${rowColor ? "opacity-80" : "text-gray-400"
                              }`}
                          >
                            Created {formatDate(offer.createdAt)}
                            {offer.useUnitPrices && (
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded">
                                Unit pricing
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <BuildingOfficeIcon
                              className={`h-4 w-4 ${rowColor ? "opacity-70" : "text-gray-400"
                                }`}
                            />
                            <div
                              className={`text-sm font-medium truncate max-w-[12rem] ${rowColor ? "" : "text-gray-900"
                                }`}
                            >
                              {offer.customerSnapshot?.companyName}
                            </div>
                          </div>
                          {offer.customerSnapshot?.vatId && (
                            <div
                              className={`text-xs mt-0.5 ${rowColor ? "opacity-80" : "text-gray-500"
                                }`}
                            >
                              VAT: {offer.customerSnapshot.vatId}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-sm font-bold">
                            {formatCurrency(
                              offer.totalAmount || 0,
                              offer.currency,
                            )}
                          </div>
                          <div
                            className={`text-xs ${rowColor ? "opacity-80" : "text-gray-500"
                              }`}
                          >
                            {lineItems.length} items
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 items-center">
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${getOfferStatusColor(
                                offer.status,
                              )}`}
                            >
                              {offer.status}
                            </span>
                            {offer.validUntil && (
                              <div
                                className={`flex items-center gap-1 text-xs ${rowColor ? "opacity-80" : "text-gray-600"
                                  }`}
                              >
                                <CalendarIcon
                                  className={`h-3 w-3 ${rowColor ? "" : "text-gray-500"
                                    }`}
                                />
                                {formatDate(offer.validUntil)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td
                          className="px-4 py-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            title="Download Angebot PDF"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await downloadOfferPdf(
                                  offer.id,
                                  offer.offerNumber,
                                );
                              } catch (_) { }
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors whitespace-nowrap"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            PDF
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-emerald-50/20 border-b border-gray-200">
                          <td colSpan={6} className="px-6 py-4">
                            <DocumentLineItemsSubTable
                              items={lineItems}
                              currency={offer.currency}
                              title={`Line Items List (${lineItems.length}) — Offer ${offer.offerNumber}`}
                              totalAmount={offer.totalAmount}
                              type="offer"
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(currentPage - 1) * itemsPerPage + 1}–
              {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
              {totalRecords}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const p = Math.max(1, currentPage - 1);
                  setCurrentPage(p);
                  setFilters({ ...filters, page: p });
                }}
                disabled={currentPage === 1}
                className="px-2 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => {
                      setCurrentPage(p);
                      setFilters({ ...filters, page: p });
                    }}
                    className={`px-2 py-1 text-sm rounded-lg ${currentPage === p
                      ? "bg-gray-600 text-white"
                      : "bg-white border border-gray-300 hover:bg-gray-50"
                      }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => {
                  const p = Math.min(totalPages, currentPage + 1);
                  setCurrentPage(p);
                  setFilters({ ...filters, page: p });
                }}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {embedded ? (
        mainContent
      ) : (
        <div className="min-h-screen bg-white shadow-xl rounded-lg p-6">
          <div className="max-w-7xl mx-auto">{mainContent}</div>
        </div>
      )}

      {showDetail && (
        <OfferDetailModal
          isOpen={showDetail}
          offerId={detailOfferId}
          onClose={() => {
            setShowDetail(false);
            setDetailOfferId(null);
          }}
          onChanged={fetchOffers}
          userRole={user?.role}
        />
      )}
    </>
  );
};

export default OffersPage;
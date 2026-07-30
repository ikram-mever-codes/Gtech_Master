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
  MoveRight,
} from "lucide-react";
import PageHeader from "@/components/UI/PageHeader";
import CustomButton from "@/components/UI/CustomButton";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import { toast } from "react-hot-toast";
import { createOrder } from "@/api/orders";
import {
  getAllOffers,
  updateOffer,
  formatCurrency,
  getOfferStatuses,
  getOfferStatusColor,
  downloadOfferPdf,
  type Offer,
  type OfferSearchFilters,
} from "@/api/offers";
import { formatDate } from "@/utils/offers";
import { parseFlexibleNumber } from "@/utils/decimal";
import { BASE_URL } from "@/utils/constants";
import OfferDetailModal from "@/components/Offers/OfferDetailModal";
import ExpandRowArrow from "@/components/UI/ExpandRowArrow";

import { isValueMatching, isDateInPreset } from "@/utils/commercialFilters";
// WEIGHT
// Taric
// Price
// Item name
// Item Number

const getInputClass = (hasValue: boolean, isEmptySelect = false) =>
  `w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${
    hasValue
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

// --- Mirrors the classic-mode line items table in OfferDetailModal --------
// Kept here (read-only) so the expanded row on the Offers list looks
// identical to what you see inside the offer detail modal, instead of the
// generic DocumentLineItemsSubTable used for orders/invoices.
const isFreetextLine = (item: any): boolean =>
  !item?.sourceItemId && !item?.requestedItemId;

const getClassicLineTotal = (item: any): number => {
  const qty = parseFlexibleNumber(item?.baseQuantity) ?? 1;
  const price = parseFlexibleNumber(item?.basePrice) ?? 0;
  return qty * price;
};

const OfferLineItemsTable: React.FC<{ offer: any; lineItems: any[] }> = ({
  offer,
  lineItems,
}) => (
  <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
    <table className="w-full text-sm">
      <thead className="bg-gray-100 border-b border-gray-200">
        <tr>
          <th className="px-2 py-2 text-left font-semibold text-gray-600 w-12">
            Pic
          </th>
          <th className="px-2 py-2 text-left font-semibold text-gray-600 w-10">
            Pos
          </th>
          <th className="px-2 py-2 text-left font-semibold text-gray-600 w-28">
            Art.-Nr.
          </th>
          <th className="px-2 py-2 text-left font-semibold text-gray-600">
            Bezeichnung
          </th>
          <th className="px-2 py-2 text-left font-semibold text-gray-600 w-40">
            Hinweis
          </th>
          <th className="px-2 py-2 text-center font-semibold text-gray-600 w-16">
            MwSt.
          </th>
          <th className="px-2 py-2 text-right font-semibold text-gray-600 w-20">
            Menge
          </th>
          <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28">
            Netto-Preis
          </th>
          <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28">
            Netto gesamt
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {lineItems.length === 0 && (
          <tr>
            <td colSpan={9} className="text-center py-6 text-sm text-gray-500">
              No line items yet.
            </td>
          </tr>
        )}
        {lineItems.map((item: any) => {
          const freetext = isFreetextLine(item);
          const total = getClassicLineTotal(item);
          const qtyDisplay = Math.round(
            parseFlexibleNumber(item.baseQuantity) ?? 1,
          );
          const rowColor = item.highlightColor || (freetext ? "#D8964A" : null);
          const thumb = item.photo;
          return (
            <tr
              key={item.id}
              style={rowColor ? { backgroundColor: rowColor } : undefined}
            >
              <td className="px-2 py-2">
                <div className="w-9 h-9 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt="thumb"
                      className="w-full h-full object-cover"
                      onError={(e) =>
                        ((e.target as HTMLImageElement).style.display = "none")
                      }
                    />
                  ) : (
                    <span className="text-gray-300 text-[10px]">—</span>
                  )}
                </div>
              </td>
              <td className="px-2 py-2 text-gray-500">{item.position}</td>
              <td className="px-2 py-2">
                <span>{item.itemNo || item.material || "—"}</span>
              </td>
              <td className="px-2 py-2">
                <span>{item.itemName || "—"}</span>
              </td>
              <td className="px-2 py-2">
                <span className="text-gray-600">{item.notes || "—"}</span>
              </td>
              <td className="px-2 py-2 text-center text-gray-600">
                {offer.taxRate ?? 19}%
              </td>
              <td className="px-2 py-2">
                <div className="text-right">{qtyDisplay}</div>
              </td>
              <td className="px-2 py-2">
                <div className="text-right">
                  {formatCurrency(item.basePrice || 0, offer.currency)}
                </div>
              </td>
              <td className="px-2 py-2 text-right font-medium">
                {formatCurrency(total || 0, offer.currency)}
              </td>
            </tr>
          );
        })}

        {/* Shipping method — always the last row, same as OfferDetailModal */}
        <tr className="bg-gray-100/80">
          <td className="px-2 py-2 text-gray-400"></td>
          <td className="px-2 py-2 text-gray-400">{lineItems.length + 1}</td>
          <td className="px-2 py-2 text-gray-400">—</td>
          <td className="px-2 py-2 text-gray-700">
            {offer.shippingMethod || "No shipping method set"}
          </td>
          <td className="px-0 py-2 text-center text-gray-400"></td>
          <td className="px-2 py-2 text-center text-gray-600">
            {offer.taxRate ?? 19}%
          </td>
          <td className="px-2 py-2 text-right text-gray-600">1</td>
          <td className="px-2 py-2 text-right text-gray-600">
            {formatCurrency(offer.shippingCost || 0, offer.currency)}
          </td>
          <td className="px-2 py-2 text-right font-medium text-gray-700">
            {formatCurrency(offer.shippingCost || 0, offer.currency)}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);

const OffersPage: React.FC<any> = ({
  embedded = false,
  docFilters,
  onOrderConverted,
  refreshTrigger,
}) => {
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
  }, [fetchOffers, refreshTrigger]);

  const openCreate = () => {
    setDetailOfferId(null);
    setShowDetail(true);
  };
  const openDetail = (offer: Offer) => {
    setDetailOfferId(offer.id);
    setShowDetail(true);
  };
  const handleConvertOfferToAuftrag = async (
    offer: any,
    e?: React.MouseEvent,
  ) => {
    if (e) e.stopPropagation();
    const prompt = window.confirm(
      "Do you want to convert this offer to an Auftrag?",
    );
    if (!prompt) return;

    try {
      const lineItems =
        offer.lineItems?.filter((li: any) => !li.isComponent) || [];
      const validItems = lineItems.map((x: any) => {
        const rawId = x.sourceItemId || x.itemId || x.item_id;
        const numericId =
          rawId !== null && rawId !== undefined ? Number(rawId) : NaN;
        const validItemId =
          Number.isFinite(numericId) && numericId > 0 ? numericId : null;
        return {
          item_id: validItemId,
          qty: Number(x.baseQuantity || x.quantity || x.qty || 1) || 1,
          price: Number(x.basePrice || x.unitPrice || x.price || 0),
          remark_de: x.itemName || x.notes || x.description || "Line Item",
        };
      });

      const payload = {
        customer_id: offer.customer_id || offer.customerSnapshot?.id || null,
        comment: `Converted from Offer ${offer.offerNumber}${offer.discountAmount ? ` [Discount: €${offer.discountAmount}]` : offer.discountPercentage ? ` [Discount: ${offer.discountPercentage}%]` : ""}`,
        status: 1,
        items: validItems.length > 0 ? validItems : [{ item_id: null, qty: 1, price: 0, remark_de: offer.title || "Offer Conversion" }],
        source_offer_id: offer.id,
      };
      await createOrder(payload as any);
      const nextCount =
        (offer.conversionCount ||
          (offer.highlightColor === "#ECEAE6" ? 1 : 0)) + 1;

      setOffers((prevOffers) =>
        prevOffers.map((o) =>
          o.id === offer.id
            ? {
                ...o,
                highlightColor: "#ECEAE6",
                conversionCount: nextCount,
              }
            : o,
        ),
      );

      try {
        await updateOffer(offer.id, {
          highlightColor: "#ECEAE6",
          conversionCount: nextCount,
        } as any);
      } catch (_) {}
      fetchOffers();
      onOrderConverted?.();
    } catch (err) {
      console.error(err);
      toast.error("Failed to convert offer to Auftrag", {
        id: "convert-offer-toast",
      });
    }
  };

  const displayOffers = React.useMemo(() => {
    let list = offers;
    if (!docFilters) return list;
    const {
      documentNo,
      customerNo,
      customerName,
      valueOperator,
      valueAmount,
      status,
      datePreset,
      dateFrom,
      dateTo,
    } = docFilters;

    return list.filter((offer: any) => {
      if (documentNo?.trim()) {
        const s = documentNo.toLowerCase().trim();
        if (
          !String(offer.offerNumber || "")
            .toLowerCase()
            .includes(s)
        )
          return false;
      }
      if (customerNo?.trim()) {
        const s = customerNo.toLowerCase().trim();
        const cNo = String(
          offer.customerSnapshot?.customerNumber ||
            offer.customerSnapshot?.id ||
            "",
        ).toLowerCase();
        if (!cNo.includes(s)) return false;
      }
      if (customerName?.trim()) {
        const s = customerName.toLowerCase().trim();
        const cName = String(
          offer.customerSnapshot?.companyName ||
            offer.customerSnapshot?.name ||
            "",
        ).toLowerCase();
        if (!cName.includes(s)) return false;
      }
      if (valueAmount?.trim()) {
        const val = Number(offer.subtotal || offer.totalAmount || 0);
        if (!isValueMatching(val, valueOperator, valueAmount)) return false;
      }
      if (status) {
        if (String(offer.status || "").toLowerCase() !== status.toLowerCase())
          return false;
      }
      if (datePreset && datePreset !== "all") {
        if (!isDateInPreset(offer.createdAt, datePreset, dateFrom, dateTo))
          return false;
      }
      return true;
    });
  }, [offers, docFilters]);

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

      {!embedded && (
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
        </div>
      )}

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
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>

                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displayOffers.map((offer: any) => {
                  const isExpanded = expandedOfferIds.has(offer.id);
                  const lineItems =
                    offer.lineItems?.filter((li: any) => !li.isComponent) || [];
                  const rowColor =
                    offer.highlightColor && offer.highlightColor !== "#ECEAE6"
                      ? offer.highlightColor
                      : null;
                  const rowTextColor = rowColor
                    ? getContrastTextColor(rowColor)
                    : undefined;
                  const conversionCount =
                    Number(offer.conversionCount) ||
                    (offer.highlightColor === "#ECEAE6" ? 1 : 0);
                  const isConverted = conversionCount > 0;

                  return (
                    <React.Fragment key={offer.id}>
                      <tr
                        onClick={() => openDetail(offer)}
                        className={`transition-colors cursor-pointer ${
                          rowColor ? "" : "hover:bg-gray-50"
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
                            title={
                              lineItems.length === 0
                                ? "No items in this offer"
                                : isExpanded
                                  ? "Collapse items"
                                  : "Expand items"
                            }
                            onToggle={(e) => toggleExpandOffer(offer.id, e)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className={`text-sm ${
                              rowColor ? "" : "text-gray-700"
                            }`}
                            style={
                              rowColor ? { color: rowTextColor } : undefined
                            }
                          >
                            {formatDate(offer.createdAt)}
                          </div>
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
                                className={`ml-2 text-xs ${
                                  rowColor ? "" : "text-gray-500"
                                }`}
                              >
                                Rev. {offer.revision}
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-sm truncate max-w-[16rem] ${
                              rowColor ? "" : "text-gray-600"
                            }`}
                          >
                            {offer.title}
                          </div>
                          {offer.useUnitPrices && (
                            <div className="mt-1">
                              <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800 rounded">
                                Unit pricing
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={`text-sm font-medium truncate max-w-[12rem] ${
                                rowColor ? "" : "text-gray-900"
                              }`}
                            >
                              {offer.customerSnapshot?.companyName}
                            </div>
                          </div>
                          {offer.customerSnapshot.country !== "DE" &&
                            offer.customerSnapshot?.country !== "Germany" &&
                            offer.customerSnapshot?.vatId && (
                              <div
                                className={`text-xs mt-0.5 ${
                                  rowColor ? "opacity-80" : "text-gray-500"
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
                            className={`text-xs ${
                              rowColor ? "opacity-80" : "text-gray-500"
                            }`}
                          >
                            {lineItems.length} items
                          </div>
                        </td>

                        <td
                          className="px-4 py-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5 font-poppins">
                            <button
                              title={
                                isConverted
                                  ? `Converted ${conversionCount} time${conversionCount > 1 ? "s" : ""} to Auftrag (Click to convert again)`
                                  : "Convert Offer to Auftrag Order"
                              }
                              onClick={(e) =>
                                handleConvertOfferToAuftrag(offer, e)
                              }
                              className={`relative inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold rounded-[4px] transition shadow-md whitespace-nowrap cursor-pointer ${
                                isConverted
                                  ? "bg-gray-500 hover:bg-gray-600 text-white"
                                  : "bg-[#2F6B46] hover:bg-[#255638] text-white"
                              }`}
                            >
                              <MoveRight className="h-3.5 w-3.5" />
                              {conversionCount > 0 && (
                                <span className="ml-0.5 px-1.5 py-0.2 text-[9px] font-black bg-white text-gray-900 rounded-full shadow-sm border border-gray-300">
                                  {conversionCount}
                                </span>
                              )}
                            </button>
                            <button
                              title="Download Angebot PDF"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await downloadOfferPdf(
                                    offer.id,
                                    offer.offerNumber,
                                  );
                                } catch (_) {}
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-[4px] transition-colors whitespace-nowrap"
                            >
                              <FileDown className="h-3.5 w-3.5" /> PDF
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-emerald-50/20 border-b border-gray-200">
                          <td colSpan={6} className="px-6 py-4">
                            <OfferLineItemsTable
                              offer={offer}
                              lineItems={lineItems}
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
                    className={`px-2 py-1 text-sm rounded-lg ${
                      currentPage === p
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
            fetchOffers();
          }}
          onChanged={fetchOffers}
          userRole={user?.role}
        />
      )}
    </>
  );
};

export default OffersPage;

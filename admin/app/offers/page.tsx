"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  ArrowPathIcon,
  PlusIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  FunnelIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  BadgePercent,
  FileDown,
  ChevronRight,
  ChevronDown,
  Filter,
  MoveRight,
  FileText,
  Mail,
} from "lucide-react";
import PageHeader from "@/components/UI/PageHeader";
import CustomButton from "@/components/UI/CustomButton";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import { toast } from "react-hot-toast";
import {
  createAuftragFromOffer,
  getOfferDraftItemsPreview,
} from "@/api/customer_orders";
import {
  getAllOffers,
  updateOffer,
  formatCurrency,
  getOfferStatuses,
  getOfferStatusColor,
  downloadOfferPdf,
  downloadOfferEml,
  type Offer,
  type OfferSearchFilters,
} from "@/api/offers";
import { formatDate } from "@/utils/offers";
import { parseFlexibleNumber } from "@/utils/decimal";
import { BASE_URL } from "@/utils/constants";
import OfferDetailModal from "@/components/Offers/OfferDetailModal";
import DraftItemConversionModal from "@/components/orders/DraftItemConversionModal";
import ExpandRowArrow from "@/components/UI/ExpandRowArrow";
import { DataTable, ColumnDef } from "@/components/UI/DataTable";
import {
  datumColumn,
  kundeColumn,
  titelColumn,
  lieferortColumn,
  buildNettowertColumn,
  buildExpandColumn,
} from "@/app/commercial/sharedColumns";

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

// --- Mirrors the classic-mode line items table + tax logic in
// OfferDetailModal ------------------------------------------------------
// Kept here (read-only) so the expanded row on the Offers list looks and
// calculates identically to what you see inside the offer detail modal.
const isFreetextLine = (item: any): boolean =>
  !item?.sourceItemId && !item?.requestedItemId;

const getClassicLineTotal = (item: any): number => {
  const qty = parseFlexibleNumber(item?.baseQuantity) ?? 1;
  const price = parseFlexibleNumber(item?.basePrice) ?? 0;
  return qty * price;
};

/** Effective VAT rate for a line item.
 * - Freizeile (freetext) lines: their own stored `taxRate`, editable in the
 *   detail modal — falls back to the tax profile's rate if never set.
 * - Every other line (catalog item or inquiry request): always the
 *   customer's live tax profile rate, never the line's own `taxRate`. */
const getLineTaxRate = (item: any, offer: any): number => {
  const taxProfileRate = parseFlexibleNumber(offer?.taxProfile?.taxRate) ?? 19;
  if (isFreetextLine(item)) {
    const own = parseFlexibleNumber(item?.taxRate);
    return own !== null && own !== undefined ? own : taxProfileRate;
  }
  return taxProfileRate;
};

/** Shipping always follows the live tax profile rate — never editable. */
const getShippingTaxRate = (offer: any): number =>
  parseFlexibleNumber(offer?.taxProfile?.taxRate) ?? 19;

/** One VAT group per distinct effective rate among the visible line items
 * (plus shipping, grouped under its own rate), each summed independently —
 * same logic as OfferDetailModal's `vatGroups`. */
const getVatGroups = (
  offer: any,
  lineItems: any[],
): { rate: number; base: number; tax: number }[] => {
  const byRate = new Map<number, number>();
  lineItems.forEach((li: any) => {
    const rate = getLineTaxRate(li, offer);
    const lineTotal = getClassicLineTotal(li);
    byRate.set(rate, (byRate.get(rate) || 0) + lineTotal);
  });

  if (offer?.shippingCost > 0) {
    const shipRate = getShippingTaxRate(offer);
    byRate.set(shipRate, (byRate.get(shipRate) || 0) + offer.shippingCost);
  }

  const discountFactor =
    offer?.discountPercentage > 0 ? 1 - offer.discountPercentage / 100 : 1;

  return Array.from(byRate.entries())
    .map(([rate, base]) => {
      const adjustedBase = base * discountFactor;
      return {
        rate,
        base: adjustedBase,
        tax: adjustedBase * (rate / 100),
      };
    })
    .sort((a, b) => b.rate - a.rate);
};

const OfferLineItemsTable: React.FC<{ offer: any; lineItems: any[] }> = ({
  offer,
  lineItems,
}) => {
  const sortedLineItems = [...lineItems].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );
  const vatGroups = getVatGroups(offer, lineItems);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-2 py-2 text-left font-semibold text-gray-600 w-10">
                Pos
              </th>
              <th className="px-2 py-2 text-left font-semibold text-gray-600 w-12">
                Pic
              </th>
              <th className="px-2 py-2 text-left font-semibold text-gray-600 w-28">
                Art.-Nr.
              </th>
              <th className="px-2 py-2 text-left font-semibold text-gray-600">
                Bezeichnung
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
            {sortedLineItems.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="text-center py-6 text-sm text-gray-500"
                >
                  No line items yet.
                </td>
              </tr>
            )}
            {sortedLineItems.map((item: any) => {
              const freetext = isFreetextLine(item);
              const total = getClassicLineTotal(item);
              const qtyDisplay = Math.round(
                parseFlexibleNumber(item.baseQuantity) ?? 1,
              );
              const rowColor = item.highlightColor;
              const thumb = item.photo;
              const lineTaxRate = getLineTaxRate(item, offer);
              return (
                <tr
                  key={item.id}
                  style={rowColor ? { backgroundColor: rowColor } : undefined}
                >
                  <td className="px-2 py-2 text-gray-500">{item.position}</td>
                  <td className="px-2 py-2">
                    <div className="w-9 h-9 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt="thumb"
                          className="w-full h-full object-contain"
                          onError={(e) =>
                            ((e.target as HTMLImageElement).style.display =
                              "none")
                          }
                        />
                      ) : (
                        <span className="text-gray-300 text-[10px]">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <span>{item.itemNo || item.material || "—"}</span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="font-medium text-gray-900">
                      {item.itemName || "—"}
                    </div>
                    {item.notes && (
                      <div className="text-xs text-gray-500 mt-0.5 leading-snug">
                        {item.notes}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center text-gray-600">
                    {lineTaxRate}%
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
              <td className="px-2 py-2 text-gray-400">
                {lineItems.length + 1}
              </td>
              <td className="px-2 py-2 text-gray-400"></td>
              <td className="px-2 py-2 text-gray-400">—</td>
              <td className="px-2 py-2 text-gray-700">
                {offer.shippingMethod || "No shipping method set"}
              </td>
              <td className="px-2 py-2 text-center text-gray-600">
                {getShippingTaxRate(offer)}%
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
    </div>
  );
};

const OfferActionMenu: React.FC<{
  row: any;
  rowIndex?: number;
  onConvert: (row: any, e?: React.MouseEvent) => void;
  onOpenDetail: (row: any) => void;
}> = ({ row, rowIndex, onConvert, onOpenDetail }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const conversionCount =
    Number(row.conversionCount) || (row.highlightColor === "#ECEAE6" ? 1 : 0);
  const isConverted = conversionCount > 0;
  const isBottom = rowIndex !== undefined && rowIndex >= 5;

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all shadow-xs cursor-pointer ${
          isOpen
            ? "border-[#8CC21B] bg-lime-50 text-[#8CC21B] ring-2 ring-[#8CC21B]/20"
            : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900"
        }`}
        title="Aktionen"
      >
        <ChevronRight
          className={`w-4 h-4 transition-transform duration-150 ${
            isOpen ? "rotate-90 text-[#8CC21B]" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 ${
            isBottom ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } w-60 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 z-50 text-left divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-100 font-poppins`}
        >
          <div className="p-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onConvert(row, e);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <span
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded-[4px] shrink-0 text-white flex items-center justify-center ${isConverted ? "bg-gray-500" : "bg-[#2F6B46]"}`}
              >
                <MoveRight className="h-3 w-3" />
              </span>
              <div className="flex-1 min-w-0 flex items-center justify-between">
                <span className="text-xs font-semibold">
                  In Auftrag umwandeln
                </span>
                {conversionCount > 0 && (
                  <span className="px-1 py-0.5 text-[9px] font-black bg-gray-200 text-gray-700 rounded-full border border-gray-300">
                    {conversionCount}
                  </span>
                )}
              </div>
            </button>
          </div>

          <div className="p-1">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                setIsOpen(false);
                try {
                  await downloadOfferPdf(row.id, row.offerNumber);
                } catch (_) {}
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-xs font-semibold">PDF öffnen</span>
            </button>
          </div>

          <div className="p-1">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                setIsOpen(false);
                try {
                  await downloadOfferEml(row.id, row.offerNumber);
                } catch (_) {}
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4 text-[#8CC21B] shrink-0" />
              <span className="text-xs font-semibold">PDF in Email</span>
            </button>
          </div>

          <div className="p-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onOpenDetail(row);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="text-xs font-semibold">Angebot öffnen</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const OffersPage: React.FC<any> = ({
  embedded = false,
  docFilters,
  onOrderConverted,
  refreshTrigger,
  onAuftragCreated,
  onSwitchToAuftrag,
}) => {
  const { user } = useSelector((state: RootState) => state.user);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const itemsPerPage = 20;

  // Draft-item conversion flow state. draftConversionOffer holds the
  // offer currently being converted (once we know it has draft items);
  // draftItemsPreview holds the resolved draft-item rows fetched from
  // getOfferDraftItemsPreview for that offer.
  const [draftConversionOffer, setDraftConversionOffer] = useState<any | null>(
    null,
  );
  const [draftItemsPreview, setDraftItemsPreview] = useState<any[]>([]);

  const [filters, setFilters] = useState<OfferSearchFilters>({
    search: "",
    status: "",
    page: 1,
    limit: 20,
  });

  const [detailOfferId, setDetailOfferId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [expandedOfferIds, setExpandedOfferIds] = useState<any>(new Set());

  const toggleExpandOffer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedOfferIds((prev: any) => {
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

  /**
   * Creates the Auftrag from an offer. `selectedItemsOverride` — when
   * supplied by DraftItemConversionModal — carries every non-component
   * line plus a `convertDraft` flag on whichever lines are backed by a
   * draft Item; the backend (createAuftragFromOffer) resolves each
   * line's backing Item, applies the sales_price fallback, and flips
   * isDraft to false for every line where convertDraft !== false.
   * Without an override (the plain, no-draft-items path), it's built the
   * same way it always was: one entry per non-component line, straight
   * from the offer's own current values.
   *
   * Returns true on success so callers (including the draft modal) know
   * whether to close/reset their own state.
   */
  const runDirectConversion = async (
    offer: any,
    selectedItemsOverride?: any[],
  ): Promise<boolean> => {
    try {
      const lineItems =
        offer.lineItems?.filter((li: any) => !li.isComponent) || [];

      const selectedItems =
        selectedItemsOverride ||
        lineItems.map((x: any) => ({
          lineItemId: x.id,
          quantity: Number(x.baseQuantity || x.quantity || x.qty || 1) || 1,
          price: Number(x.basePrice || x.unitPrice || x.price || 0),
          itemName: x.itemName || x.notes || x.description || "Line Item",
        }));

      if (selectedItems.length === 0) {
        toast.error(
          `Offer ${offer.offerNumber} has no line items to convert.`,
          {
            id: "convert-offer-toast",
          },
        );
        return false;
      }

      const res = await createAuftragFromOffer(offer.id, selectedItems);
      const createdAuftragId = res?.data?.id;

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

      // Open the newly created Auftrag directly, switching the parent tab
      // to "auftrag" first — the caller decides what "switching tabs"
      // means, this component only reports the new id.
      if (createdAuftragId) {
        onAuftragCreated?.(createdAuftragId);
      }
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Failed to convert offer to Auftrag", {
        id: "convert-offer-toast",
      });
      return false;
    }
  };

  const handleConvertOfferToAuftrag = async (
    offer: any,
    e?: React.MouseEvent,
  ) => {
    if (e) e.stopPropagation();
    const companyName =
      offer.customerSnapshot?.companyName ||
      offer.customerSnapshot?.legalName ||
      offer.customerSnapshot?.name ||
      offer.customer?.companyName ||
      "";

    const prompt = window.confirm(
      `Auftrag erstellen für ${companyName} aus Angebot ${offer.offerNumber} ?`,
    );
    if (!prompt) return;

    try {
      const draftRes = await getOfferDraftItemsPreview(offer.id);
      const draftItems = draftRes?.data || [];
      if (draftItems.length > 0) {
        setDraftItemsPreview(draftItems);
        setDraftConversionOffer(offer);
        return;
      }
    } catch (err) {
      console.error(
        "Couldn't check for draft items, proceeding directly:",
        err,
      );
    }

    await runDirectConversion(offer);
  };

  const getContrastTextColor = (bgColor?: string) => {
    if (!bgColor) return undefined;
    const hex = bgColor.replace("#", "");
    if (hex.length !== 6) return undefined;
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128 ? "#ffffff" : "#1f2937";
  };

  const displayOffers = useMemo(() => {
    if (!docFilters) return offers;
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

    return offers.filter((offer: any) => {
      if (documentNo) {
        const no = String(offer.offerNumber || "");
        if (!no.toLowerCase().includes(documentNo.toLowerCase())) return false;
      }
      if (customerNo) {
        const cNo = String(
          offer.customerSnapshot?.customerNumber ||
            (offer as any).customer?.customer_number ||
            "",
        );
        if (!cNo.toLowerCase().includes(customerNo.toLowerCase())) return false;
      }
      if (customerName) {
        const name = String(
          offer.customerSnapshot?.companyName ||
            offer.customerSnapshot?.name ||
            (offer as any).customer?.company_name ||
            (offer as any).customer?.name ||
            "",
        );
        if (!name.toLowerCase().includes(customerName.toLowerCase()))
          return false;
      }
      if (valueAmount) {
        const val = Number(
          offer.totalAmount !== undefined && offer.totalAmount !== null
            ? offer.totalAmount
            : offer.subtotal || 0,
        );
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

  const offerColumns: ColumnDef<any>[] = useMemo(
    () => [
      buildExpandColumn(expandedOfferIds, setExpandedOfferIds),
      datumColumn,
      {
        header: "Nr",
        width: "110px",
        align: "center",
        render: (row: any) => (
          <div className="text-sm font-semibold text-green-600 hover:underline whitespace-nowrap cursor-pointer">
            {row.offerNumber}
            {row.revision > 1 && (
              <span className="ml-1 text-xs text-gray-500 font-normal">
                R{row.revision}
              </span>
            )}
          </div>
        ),
      },
      kundeColumn,
      titelColumn,
      lieferortColumn,
      {
        header: "Lieferdatum",
        width: "90px",
        align: "center",
        render: (row: any) => {
          const raw = row.date_delivery || row.validUntil;
          if (!raw)
            return <span className="text-gray-400 font-normal text-sm">—</span>;
          if (typeof raw === "string" && /^\d{2}\.\d{2}\.\d{4}$/.test(raw)) {
            const [d, m] = raw.split(".");
            return (
              <span className="text-sm text-gray-600 font-normal">{`${d}.${m}.`}</span>
            );
          }
          return (
            <span className="text-sm text-gray-600 font-normal">
              {formatDate(raw)}
            </span>
          );
        },
      },
      buildNettowertColumn((row: any) => {
        if (row.subtotal !== undefined && row.subtotal !== null) {
          return Number(row.subtotal) + Number(row.shippingCost || 0);
        }
        // totalAmount already includes shippingCost (see Offer.calculateTotals())
        return Number(row.totalAmount || 0);
      }),
      {
        header: "Status",
        width: "90px",
        align: "center",
        render: (row: any) => (
          <span className="text-[11px] px-2.5 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-600 font-medium capitalize">
            {row.status || "Draft"}
          </span>
        ),
      },
      {
        header: "",
        width: "45px",
        align: "center",
        render: (row: any, index: number) => (
          <OfferActionMenu
            row={row}
            rowIndex={index}
            onConvert={handleConvertOfferToAuftrag}
            onOpenDetail={openDetail}
          />
        ),
      },
    ],
    [expandedOfferIds, handleConvertOfferToAuftrag],
  );

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
            {Boolean(filters.search || filters.status) ? (
              <button
                type="button"
                onClick={() =>
                  setFilters({ ...filters, search: "", status: "", page: 1 })
                }
                className="w-6 h-6 rounded-md bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
                title="Reset all filters"
              >
                <XMarkIcon className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            ) : (
              <FunnelIcon className="w-5 h-5 text-primary shrink-0" />
            )}
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

      <div className="mb-6">
        <DataTable
          data={displayOffers}
          columns={offerColumns}
          loading={loading}
          emptyMessage="Kein Angebot gefunden"
          onRowClick={(row) => openDetail(row)}
          expandedRowIds={expandedOfferIds}
          summaryCount={displayOffers.length}
          summaryTotal={displayOffers.reduce((sum: number, off: any) => {
            const val =
              typeof off.subtotal === "number"
                ? off.subtotal
                : typeof off.netTotal === "number"
                  ? off.netTotal
                  : parseFloat(off.subtotal || off.sub_total || off.netTotal || off.net_total || "0");
            return sum + (isNaN(val) ? 0 : val);
          }, 0)}
          renderRowDetails={(row) => (
            <OfferLineItemsTable
              offer={row}
              lineItems={
                row.lineItems?.filter((li: any) => !li.isComponent) || []
              }
            />
          )}
          getRowStyle={(offer: any) => {
            const rowColor =
              offer.highlightColor && offer.highlightColor !== "#ECEAE6"
                ? offer.highlightColor
                : null;
            if (!rowColor) return undefined;
            return {
              backgroundColor: rowColor,
              color: getContrastTextColor(rowColor),
            };
          }}
        />
      </div>

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
          onSwitchToAuftrag={onSwitchToAuftrag}
        />
      )}

      {draftConversionOffer && (
        <DraftItemConversionModal
          isOpen={!!draftConversionOffer}
          offer={draftConversionOffer}
          draftItems={draftItemsPreview}
          onClose={() => {
            setDraftConversionOffer(null);
            setDraftItemsPreview([]);
          }}
          onSubmit={async (selectedItems) => {
            const ok = await runDirectConversion(
              draftConversionOffer,
              selectedItems,
            );
            if (ok) {
              setDraftConversionOffer(null);
              setDraftItemsPreview([]);
            }
            return ok;
          }}
        />
      )}
    </>
  );
};

export default OffersPage;

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
  ClipboardIcon,
  CalculatorIcon,
  LinkIcon,
  CubeIcon,
  BuildingOfficeIcon,
  ClipboardDocumentIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import ViewEditToggle from "@/components/UI/ViewEditToggle";
import SystemColourSelect from "@/components/UI/SystemColourSelect";
import { CustomerSearchInput } from "@/components/UI/CustomerSearchInput";
import {
  getOfferById,
  updateOffer,
  deleteOffer,
  generateOfferPdf,
  downloadOfferPdf,
  updateLineItem,
  addPriceMatrixEntry,
  setActivePrice,
  pasteMatrixPrices,
  createOfferLineItem,
  deleteOfferLineItem,
  createOfferFromInquiry,
  createOfferFromItem,
  formatCurrency,
  getOfferStatuses,
  getOfferStatusColor,
  deletePriceColumn,
  getCustomerShippingAddresses,
  type CustomerShippingAddress,
  previewLineItemPrice,
} from "@/api/offers";
import { getAllInquiries } from "@/api/inquiry";
import { getAllCustomers } from "@/api/customers";
import { autocompleteItems } from "@/api/items";
import { getAllPaymentMethods } from "@/api/payment_methods";
import { getAllShippingMethods } from "@/api/shipping_methods";
import { UserRole } from "@/utils/interfaces";
import { errorStyles, successStyles, BASE_URL } from "@/utils/constants";
import {
  parseFlexibleNumber,
  formatUnitPriceCurrency,
  parseAndRoundTo3Decimals,
  formatMatrixPrice,
} from "@/utils/decimal";
import { formatDate } from "@/utils/offers";
import { PrinterIcon } from "lucide-react";

type PricingMode = "classic" | "matrix";

type SourceType = "inquiry" | "item";

interface OfferDetailModalProps {
  isOpen: boolean;
  offerId: string | null;
  onClose: () => void;
  onChanged?: () => void;
  userRole?: UserRole;
  fetchOffers?: any;
  onSwitchToAuftrag?: (auftragId: string | number) => void;
}

const inputCls =
  "w-full px-2.5 py-1.5 text-sm border border-gray-300/80 bg-white/70 rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default";

const PAYMENT_METHODS = [
  "Prepayment",
  "Bank transfer",
  "Cash on delivery",
  "Invoice",
  "Credit card",
  "PayPal",
];

const SHIPPING_METHODS = [
  "Standard shipping",
  "Express shipping",
  "Freight",
  "Courier",
  "Pickup",
];

const formatWeight = (kg: number): string =>
  `${(isNaN(kg) || !isFinite(kg) ? 0 : kg).toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} kg`;
/** Converts any date-ish value to the "yyyy-MM-dd" shape a native
 * <input type="date"> expects; returns "" when there's nothing valid. */
const toDateInputValue = (value: any): string => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

const resolveThumbUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.includes("cloudinary.com")) return url;
  if (url.includes("/uploads/")) {
    const fileName = url.split("/uploads/").pop();
    try {
      const apiOrigin = new URL(BASE_URL).origin;
      return `${apiOrigin}/uploads/${fileName}`;
    } catch {
      return url;
    }
  }
  return url;
};

const getItemCompany = (item: any): string =>
  item?.customer_name ||
  item?.company_display_name ||
  item?.companyDisplayName ||
  item?.customer?.companyName ||
  item?.customer?.company_name ||
  item?.customer?.name ||
  item?.company_name ||
  item?.company ||
  "";

// --- Local pricing helpers (mode-aware, no dependency on legacy api helpers) --
const getActiveMatrixEntry = (item: any) =>
  (item?.priceMatrix || []).find((p: any) => p.isActive) || null;

const getLineItemTotal = (item: any, pricingMode: PricingMode): number => {
  if (pricingMode === "matrix") {
    const active = getActiveMatrixEntry(item);
    return active?.total ?? 0;
  }
  const qty = parseFlexibleNumber(item?.baseQuantity) ?? 1;
  const price = parseFlexibleNumber(item?.basePrice) ?? 0;
  return qty * price;
};

/** An item counts as "Artikel" if it traces back to a catalog item (either
 * picked directly or inherited from an inquiry request); anything added by
 * hand with just a name is a "Freitext" line (a "Freizeile"). This is also
 * the line type that's allowed a custom, editable VAT rate — everything
 * else always follows the customer's live tax profile. */
const isFreetextLine = (item: any): boolean =>
  !item?.sourceItemId && !item?.requestedItemId;

/** Effective VAT rate for a line item.
 * - Freizeile (freetext) lines: their own stored `taxRate` — editable,
 *   persisted on the line item — falling back to the tax profile's rate
 *   only if the line has never had one set.
 * - Every other line (from a catalog item or an inquiry request): always
 *   the customer's currently-assigned tax profile rate, resolved fresh on
 *   every load. Never the line's own `taxRate` field — tax rates change
 *   often, and these line types must never show a stale, cached one. */
const getLineTaxRate = (item: any, offer: any): number => {
  const taxProfileRate = parseFlexibleNumber(offer?.taxProfile?.taxRate) ?? 19;
  if (isFreetextLine(item)) {
    const own = parseFlexibleNumber(item?.taxRate);
    return own !== null && own !== undefined ? own : taxProfileRate;
  }
  return taxProfileRate;
};

/** Shipping is always taxed at the customer's live tax profile rate —
 * never editable, never stored separately on the offer. */
const getShippingTaxRate = (offer: any): number =>
  parseFlexibleNumber(offer?.taxProfile?.taxRate) ?? 19;

/** All distinct VAT rates currently active on the offer: the tax profile's
 * rate (counted once, if any non-Freizeile line or shipping cost exists)
 * plus each Freizeile's own rate. Pass `excludeItemId` when checking
 * whether a NEW rate for that specific item would be allowed, so its own
 * current rate doesn't count against itself. */
const getActiveTaxRates = (offer: any, excludeItemId?: string): Set<number> => {
  const rates = new Set<number>();
  const lineItems =
    offer?.lineItems?.filter((li: any) => !li.isComponent) || [];

  const hasNonFreetext = lineItems.some(
    (li: any) => !isFreetextLine(li) && li.id !== excludeItemId,
  );
  const hasShipping = (offer?.shippingCost || 0) > 0;
  if (hasNonFreetext || hasShipping) {
    rates.add(parseFlexibleNumber(offer?.taxProfile?.taxRate) ?? 19);
  }

  lineItems.forEach((li: any) => {
    if (isFreetextLine(li) && li.id !== excludeItemId) {
      rates.add(getLineTaxRate(li, offer));
    }
  });

  return rates;
};

/** True if `rate` is already one of the offer's active rates (no new slot
 * needed), or if there's still room for a new one — max 3 distinct VAT
 * rates per offer, total. */
const canUseTaxRate = (
  offer: any,
  rate: number,
  excludeItemId?: string,
): boolean => {
  const rates = getActiveTaxRates(offer, excludeItemId);
  if (rates.has(rate)) return true;
  return rates.size < 3;
};

// --- Delivery-address-vs-billing comparison ---------------------------------
const normalizeAddrValue = (v: any): string =>
  (v || "").toString().trim().toLowerCase();

/** True when the delivery address has nothing set of its own, or when it
 * matches the billing (customer snapshot) address on street/postal/city/
 * country — i.e. there's nothing distinct to show the user. */
const isDeliverySameAsBilling = (deliveryAddr: any, snapshot: any): boolean => {
  const deliveryStreet = normalizeAddrValue(deliveryAddr?.street);
  if (!deliveryStreet) return true;

  const billingStreet = normalizeAddrValue(
    snapshot?.address || snapshot?.street,
  );
  const billingPostal = normalizeAddrValue(snapshot?.postalCode);
  const billingCity = normalizeAddrValue(snapshot?.city);
  const billingCountry = normalizeAddrValue(snapshot?.country);

  return (
    deliveryStreet === billingStreet &&
    normalizeAddrValue(deliveryAddr?.postalCode) === billingPostal &&
    normalizeAddrValue(deliveryAddr?.city) === billingCity &&
    normalizeAddrValue(deliveryAddr?.country) === billingCountry
  );
};

const Section: React.FC<{
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, right, children }) => (
  <section className=" bg-white">
    <header className="flex items-center justify-between  border-b border-gray-100">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      {right}
    </header>
    <div className="p-0 py-3">{children}</div>
  </section>
);

const Field: React.FC<{
  label: string;
  edit: boolean;
  value: any;
  render?: () => React.ReactNode;
  children?: React.ReactNode;
}> = ({ label, edit, value, render, children }) => (
  <div>
    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
      {label}
    </p>
    <div className="text-sm text-gray-900 break-words">
      {edit ? children : render ? render() : value || "—"}
    </div>
  </div>
);

const ItemRow: React.FC<{
  item: any;
  selected: boolean;
  onClick: () => void;
}> = ({ item, selected, onClick }) => {
  const thumb = item.photo;
  const name = item.item_name_de || "Unnamed item";
  const itemNo = item.de_no || item.ItemID_DE || item.itemNo || "";
  const company = getItemCompany(item);
  const isLabel = item.isLabelPrint || item.isLabel === "Y";

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-all ${selected
        ? "border-primary bg-primary/5"
        : "border-gray-200 hover:bg-gray-50"
        }`}
    >
      <div className="w-12 h-12 shrink-0 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
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
          <span className="text-gray-300 text-xs">—</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900 truncate">{name}</div>
        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-gray-700">{itemNo || "—"}</span>
          <span>-</span>
          <span className="text-blue-600 font-medium truncate max-w-[10rem]">
            {company || "—"}
          </span>
          {isLabel && (
            <>
              <span>-</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 rounded uppercase tracking-wider">
                LABEL
              </span>
            </>
          )}
        </div>
      </div>
      {selected && (
        <CheckCircleIcon className="h-5 w-5 text-primary shrink-0" />
      )}
    </div>
  );
};

const PickerRow: React.FC<{
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  meta?: string;
}> = ({ selected, onClick, title, subtitle, meta }) => (
  <div
    onClick={onClick}
    className={`p-3 border rounded-lg cursor-pointer transition-all ${selected
      ? "border-primary bg-primary/5"
      : "border-gray-200 hover:bg-gray-50"
      }`}
  >
    <div className="flex justify-between items-start">
      <div className="min-w-0">
        <div className="font-medium text-gray-900 truncate">{title}</div>
        {subtitle && (
          <div className="text-sm text-gray-600 truncate">{subtitle}</div>
        )}
      </div>
      {meta && (
        <div className="text-xs text-gray-500 shrink-0 ml-2">{meta}</div>
      )}
    </div>
  </div>
);

const COUNTRY_CODES: Record<string, string> = {
  germany: "DE",
  deutschland: "DE",
  austria: "AT",
  österreich: "AT",
  switzerland: "CH",
  schweiz: "CH",
  france: "FR",
  frankreich: "FR",
  italy: "IT",
  italien: "IT",
  spain: "ES",
  spanien: "ES",
  netherlands: "NL",
  niederlande: "NL",
  belgium: "BE",
  belgien: "BE",
  poland: "PL",
  polen: "PL",
  "united kingdom": "GB",
  uk: "GB",
  "united states": "US",
  usa: "US",
  china: "CN",
};

const getCountryCode = (country?: string): string => {
  if (!country) return "";
  const trimmed = country.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return COUNTRY_CODES[trimmed.toLowerCase()] || trimmed;
};

const AddressBlock: React.FC<{ addr: any; emptyText: string }> = ({
  addr,
  emptyText,
}) => {
  if (!addr) {
    return <div className="text-sm text-gray-400">{emptyText}</div>;
  }

  const countryCode = getCountryCode(addr.country);
  const isGermany = countryCode === "DE";

  let street = (addr.street || addr.address || "").trim();
  const postalCode = (addr.postalCode || addr.postal_code || "").trim();
  const city = (addr.city || "").trim();

  if (postalCode && city && street.includes(postalCode) && street.includes(city)) {
    street = street
      .replace(new RegExp(`,?\\s*${postalCode}\\s+${city}`, "gi"), "")
      .replace(/,?\s*(Germany|Deutschland|DE)\s*/gi, "")
      .trim()
      .replace(/,\s*$/, "");
  }

  const cityLine = `${postalCode} ${city}`.trim();

  const addressLine = [
    street,
    cityLine,
    !isGermany ? countryCode : "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-1 text-sm text-gray-700">
      {addr.addressName && (
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {addr.addressName}
        </div>
      )}
      {addr.legalName && addr.legalName !== addr.companyName && (
        <div>{addr.legalName}</div>
      )}
      {addr.contactName && <div>{addr.contactName}</div>}
      {addressLine && (
        <div className="whitespace-normal break-words">{addressLine}</div>
      )}
      {addr.vatId && !isGermany && (
        <div className="text-gray-500">VAT ID: {addr.vatId}</div>
      )}
      {addr.contactPhone && (
        <div className="text-gray-500">Phone: {addr.contactPhone}</div>
      )}
    </div>
  );
};
/** Text input accepting both "," and "." as decimal separator. */
const DecimalInput: React.FC<{
  value: string | number | null | undefined;
  onCommit: (raw: string) => void;
  className?: string;
  placeholder?: string;
}> = ({ value, onCommit, className, placeholder }) => {
  const [local, setLocal] = useState(
    value === null || value === undefined ? "" : String(value),
  );

  useEffect(() => {
    setLocal(value === null || value === undefined ? "" : String(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className || inputCls}
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
    />
  );
};

/** Plain text input that commits on blur — used for the classic spreadsheet
 * cells (item no., name, remark) so every keystroke doesn't trigger a save. */
const TextCellInput: React.FC<{
  value: string | null | undefined;
  onCommit: (raw: string) => void;
  className?: string;
  placeholder?: string;
}> = ({ value, onCommit, className, placeholder }) => {
  const [local, setLocal] = useState(value || "");

  useEffect(() => {
    setLocal(value || "");
  }, [value]);

  return (
    <input
      type="text"
      className={
        className ||
        "w-full px-1.5 py-1 text-sm border border-gray-300 rounded bg-white"
      }
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
    />
  );
};

/** Sorts an array of linked Auftrag records by created_at, newest first.
 * Falls back gracefully if created_at is missing/unparseable on a row. */
const sortByCreatedAtDesc = (docs: any[]): any[] =>
  [...(docs || [])].sort((a, b) => {
    const timeA = new Date(a?.created_at || 0).getTime();
    const timeB = new Date(b?.created_at || 0).getTime();
    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
  });

export const OfferDetailModal: React.FC<OfferDetailModalProps> = ({
  isOpen,
  offerId,
  onClose,
  onChanged,
  userRole,
  onSwitchToAuftrag,
  fetchOffers,
}) => {
  const [offer, setOffer] = useState<any>(null);
  const displayInquiryNo =
    offer?.inquirySnapshot?.referenceNumber ||
    offer?.inquirySnapshot?.inquiryNo ||
    offer?.inquiry?.referenceNumber ||
    offer?.inquiry?.inquiryNo ||
    "";
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState(false);
  const [dbPaymentMethods, setDbPaymentMethods] = useState<any[]>([]);
  const [dbShippingMethods, setDbShippingMethods] = useState<any[]>([]);

  const [showItemPicker, setShowItemPicker] = useState(false);
  // Three-field search for "add existing item" picker - using autocompleteItems.
  // Shared by both the edit-mode "Add existing item" picker (gated by
  // showItemPicker) AND the create-mode "Customer + item(s)" source picker
  // (gated by isCreate && sourceType === "item") — same fields, same
  // debounced call, same result list, no separate implementation.
  const [searchEan, setSearchEan] = useState("");
  const [searchItemNo, setSearchItemNo] = useState("");
  const [searchName, setSearchName] = useState("");
  const [itemSearchLoading, setItemSearchLoading] = useState(false);
  const [pickerItems, setPickerItems] = useState<any[]>([]);

  // Saved shipping addresses for the offer's customer, used by the
  // delivery-address dropdown below (only fetched once editing starts).
  const [shippingAddresses, setShippingAddresses] = useState<any[]>([]);
  // "__same__" = use billing address; otherwise a CompanyShippingAddress id.
  const [selectedShippingAddressId, setSelectedShippingAddressId] =
    useState("__same__");

  // Moved up from further down in the original file so the debounce effect
  // below (which needs to know whether we're in create mode) can reference
  // it without a reference-before-declaration error.
  const isCreate = !offerId && !offer;

  // Debounced search for the item picker using autocompleteItems — drives
  // BOTH the edit-mode "Add existing item" picker and the create-mode item
  // source picker. Active whenever either context is showing.

  const handleFieldSearchChange = (
    field: "ean" | "itemNo" | "name",
    value: string,
  ) => {
    if (field === "ean") setSearchEan(value);
    if (field === "itemNo") setSearchItemNo(value);
    if (field === "name") setSearchName(value);
  };

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const [pmRes, smRes]: any = await Promise.all([
          getAllPaymentMethods(true).catch(() => ({ data: [] })),
          getAllShippingMethods(true).catch(() => ({ data: [] })),
        ]);
        setDbPaymentMethods(
          Array.isArray(pmRes?.data)
            ? pmRes.data.filter((pm: any) => pm.is_active)
            : [],
        );
        setDbShippingMethods(
          Array.isArray(smRes?.data)
            ? smRes.data.filter((sm: any) => sm.is_active)
            : [],
        );
      } catch (e) {
        console.error("Failed to load payment/shipping methods:", e);
      }
    })();
  }, [isOpen]);

  const [form, setForm] = useState<any>({});
  const [showCopyPaste, setShowCopyPaste] = useState(false);
  const [copyPasteData, setCopyPasteData] = useState("");
  const [tierCount, setTierCount] = useState("3");
  const [newLine, setNewLine] = useState<{
    itemName: string;
    baseQuantity: string;
    taxRate: string;
  }>({
    itemName: "",
    baseQuantity: "1",
    // Empty by default — falls back to the tax profile's rate at submit
    // time (shown as the input's placeholder) unless the user overrides it.
    taxRate: "",
  });

  const [creating, setCreating] = useState(false);
  const [sourceType, setSourceType] = useState<SourceType>("inquiry");
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [filterCustomerId, setFilterCustomerId] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  // Per-item quantity entered directly in the create picker, keyed by
  // item id (as string). Defaults to "1" as soon as an item is selected,
  // and is sent along with itemIds when creating the offer so line items
  // are created with the right baseQuantity right away — no need to edit
  // the quantity again after the offer is created.
  const [itemQuantities, setItemQuantities] = useState<Record<string, string>>(
    {},
  );
  const [sourceSearch, setSourceSearch] = useState("");
  const [createForm, setCreateForm] = useState<any>({
    title: "",
    currency: "EUR",
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    paymentMethod: "",
    shippingMethod: "",
    pricingMode: "classic" as PricingMode,
    paymentTerms: "",
    useUnitPrices: true,
    unitPriceDecimalPlaces: 3,
    totalPriceDecimalPlaces: 2,
    maxUnitPriceColumns: 3,
  });

  const fetchOffer = useCallback(async () => {
    if (!offerId) return;
    setLoading(true);
    try {
      const res = await getOfferById(offerId);
      if (res.success) {
        setOffer(res.data);
        setForm(buildForm(res.data));
      }
    } catch (e) {
      console.error("Failed to load offer:", e);
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  useEffect(() => {
    if (!isOpen) return;
    setEdit(false);
    setShowCopyPaste(false);
    setCopyPasteData("");
    setShowItemPicker(false);
    setSearchEan("");
    setSearchItemNo("");
    setSearchName("");
    setPickerItems([]);
    if (offerId) {
      fetchOffer();
    } else {
      setOffer(null);
      resetCreatePicker();
    }
  }, [isOpen, offerId, fetchOffer]);

  useEffect(() => {
    if (!isOpen || offerId) return;
    (async () => {
      try {
        const [inqRes, custRes]: any = await Promise.all([
          getAllInquiries({ limit: 1000 }),
          getAllCustomers({ limit: 1000 }),
        ]);

        setInquiries(
          Array.isArray(inqRes?.data)
            ? inqRes.data
            : inqRes?.data?.inquiries || [],
        );
        setCustomers(
          Array.isArray(custRes?.data)
            ? custRes.data
            : custRes?.data?.customers || custRes?.data?.businesses || [],
        );
      } catch (e) {
        console.error("Error loading sources:", e);
      }
    })();
  }, [isOpen, offerId]);

  useEffect(() => {
    const itemPickerActive =
      showItemPicker || (isCreate && sourceType === "item");

    if (!itemPickerActive) {
      setPickerItems([]);
      return;
    }

    const combined = [searchEan, searchItemNo, searchName]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");

    if (!combined) {
      setPickerItems([]);
      return;
    }

    setItemSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res: any = await autocompleteItems(combined, { limit: 30 });
        setPickerItems(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        console.error("Error searching items:", e);
        setPickerItems([]);
      } finally {
        setItemSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    showItemPicker,
    isCreate,
    sourceType,
    searchEan,
    searchItemNo,
    searchName,
  ]);
  // Saved shipping addresses for this offer's customer — only fetched while
  // editing, since that's the only place the picker is shown.
  useEffect(() => {
    if (!edit || !offer?.customerId) {
      setShippingAddresses([]);
      return;
    }
    getCustomerShippingAddresses(offer.customerId)
      .then((res) => setShippingAddresses(res.success ? res.data : []))
      .catch((e) => console.error("Couldn't load shipping addresses:", e));
  }, [edit, offer?.customerId]);

  if (!isOpen) return null;

  function resetCreatePicker() {
    setSourceType("inquiry");
    setFilterCustomerId("");
    setSourceSearch("");
    setSelectedInquiry(null);
    setSelectedItems([]);
    setItemQuantities({});
    setSearchEan("");
    setSearchItemNo("");
    setSearchName("");
    setPickerItems([]);
    setCreateForm({
      title: "",
      currency: "EUR",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      paymentMethod: "",
      shippingMethod: "",
      pricingMode: "classic",
      paymentTerms: "",
      useUnitPrices: true,
      unitPriceDecimalPlaces: 3,
      totalPriceDecimalPlaces: 2,
      maxUnitPriceColumns: 3,
    });
  }

  /** Commits a quantity change on a classic line item. If the item is
   * catalog-sourced, first checks whether a sales-price tier applies to
   * the new quantity; if that resolved price differs from the current
   * one, asks for confirmation before overriding it. Either way, the
   * quantity itself is always saved. */
  const handleQuantityCommit = async (item: any, raw: string) => {
    const newQty = raw.trim() || "1";

    if (!item.sourceItemId) {
      await persistLine(item.id, { baseQuantity: newQty });
      return;
    }

    try {
      const preview: any = await previewLineItemPrice(
        offer.id,
        item.id,
        newQty,
      );
      const tieredPrice = preview?.data?.price;
      const currentPrice = parseFlexibleNumber(item.basePrice) ?? 0;

      if (
        tieredPrice !== null &&
        tieredPrice !== undefined &&
        Math.abs(tieredPrice - currentPrice) > 0.0001
      ) {
        const confirmed = window.confirm(
          `There is a sales price for quantity ${newQty}: ${formatCurrency(
            tieredPrice,
            offer.currency,
          )}. Override the current price (${formatCurrency(
            currentPrice,
            offer.currency,
          )}) with it?`,
        );

        if (confirmed) {
          await persistLine(item.id, {
            baseQuantity: newQty,
            basePrice: tieredPrice,
          });
        } else {
          // Declined — keep the current price explicitly so the backend
          // doesn't silently re-resolve it from the new quantity.
          await persistLine(item.id, {
            baseQuantity: newQty,
            basePrice: currentPrice,
          });
        }
        return;
      }

      await persistLine(item.id, { baseQuantity: newQty });
    } catch (e) {
      console.error("Couldn't check tiered pricing:", e);
      await persistLine(item.id, { baseQuantity: newQty });
    }
  };
  function buildForm(o: any) {
    return {
      title: o.title || "",
      status: o.status,
      currency: o.currency,
      validUntil: o.validUntil,
      deliveryTime: o.deliveryTime || "",
      paymentTerms: o.paymentTerms || "",
      paymentMethod: o.paymentMethod || "",
      shippingMethod: o.shippingMethod || "",
      deliveryTerms: o.deliveryTerms || "",
      termsConditions: o.termsConditions || "",
      discountPercentage: o.discountPercentage ?? "",
      shippingCost: o.shippingCost ?? "",
      shippingQuantity: o.shippingQuantity ?? 1,
      taxRate: o.taxRate ?? 19,
      notes: o.notes || "",
      deliveryAddress: { ...(o.deliveryAddress || {}) },
      customerSnapshot: { ...(o.customerSnapshot || {}) },
      pricingMode: (o.pricingMode || "classic") as PricingMode,
      internalNotes: o.internalNotes || "",
      highlightColor: o.highlightColor || "",
      unitPriceDecimalPlaces: o.unitPriceDecimalPlaces || 3,
      totalPriceDecimalPlaces: o.totalPriceDecimalPlaces || 2,
      maxUnitPriceColumns: o.maxUnitPriceColumns || 3,
    };
  }

  const patch = (p: any) => setForm((f: any) => ({ ...f, ...p }));

  const refreshLocal = async () => {
    const updated = await getOfferById(offer.id);
    if (updated.success) setOffer(updated.data);
  };

  const cPatch = (p: any) => setCreateForm((f: any) => ({ ...f, ...p }));

  // Called from the header's edit toggle. Seeds the dropdown selection from
  // the offer's current state so it starts on the right option.
  const handleStartEdit = () => {
    setSelectedShippingAddressId(
      isDeliverySameAsBilling(offer?.deliveryAddress, offer?.customerSnapshot)
        ? "__same__"
        : "__custom__",
    );
    setEdit(true);
  };

  // Single handler for the delivery-address dropdown. "__same__" reverts to
  // the billing address; any other value is a saved shipping address id.
  // Only updates local form state — nothing is persisted until "Save
  // changes" (handleSave -> updateOffer) is clicked.
  const handleDeliveryAddressSelect = (value: string) => {
    setSelectedShippingAddressId(value);

    if (value === "__same__") {
      patch({
        deliveryAddress: {
          addressName: "",
          contactName:
            offer?.customerSnapshot?.legalName ||
            offer?.customerSnapshot?.companyName ||
            "",
          street:
            offer?.customerSnapshot?.address ||
            offer?.customerSnapshot?.street ||
            "",
          postalCode: offer?.customerSnapshot?.postalCode || "",
          city: offer?.customerSnapshot?.city || "",
          country: offer?.customerSnapshot?.country || "",
          contactPhone: offer?.customerSnapshot?.contactPhoneNumber || "",
        },
      });
      return;
    }

    const addr = shippingAddresses.find((a: any) => a.id === value);
    if (!addr) return;
    patch({
      deliveryAddress: {
        addressName: addr.name,
        contactName:
          offer.customerSnapshot?.legalName ||
          offer.customerSnapshot?.companyName ||
          "",
        street: addr.street,
        postalCode: addr.postalCode,
        city: addr.city,
        country: addr.country,
        additionalInfo: addr.additionalInfo,
        contactPhone: offer.customerSnapshot?.contactPhoneNumber || "",
      },
    });
  };

  const visibleInquiries = inquiries.filter((i) => {
    const matchCust = filterCustomerId
      ? i.customer?.id === filterCustomerId
      : true;
    const matchSearch = sourceSearch
      ? i.name?.toLowerCase().includes(sourceSearch.toLowerCase())
      : true;
    return matchCust && matchSearch;
  });

  const selectedCustomer = customers.find(
    (c: any) => String(c.id) === String(filterCustomerId),
  );

  useEffect(() => {
    if (sourceType !== "item") return;
    if (!selectedCustomer) return;
    setCreateForm((f: any) => ({
      ...f,
      paymentMethod: selectedCustomer.defaultPaymentMethod || f.paymentMethod,
      shippingMethod:
        selectedCustomer.defaultShippingMethod || f.shippingMethod,
      paymentTerms:
        selectedCustomer.defaultPaymentDueDays !== undefined &&
          selectedCustomer.defaultPaymentDueDays !== null
          ? `${selectedCustomer.defaultPaymentDueDays}`
          : f.paymentTerms,
    }));
  }, [selectedCustomer, sourceType]);

  const toggleItem = (it: any) => {
    setSelectedItems((prev) => {
      const exists = prev.some((p) => String(p.id) === String(it.id));
      const next = exists
        ? prev.filter((p) => String(p.id) !== String(it.id))
        : [...prev, it];
      setCreateForm((f: any) => {
        if (f.title?.trim()) return f;
        const first = next[0];
        return first ? { ...f, title: `${first.item_name_de || ""}` } : f;
      });
      return next;
    });
    // Keep a "1" quantity ready as soon as an item is selected, and drop it
    // again if the item is deselected.
    setItemQuantities((prev) => {
      const key = String(it.id);
      const alreadySelected = prev[key] !== undefined;
      if (alreadySelected) {
        const { [key]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: "1" };
    });
  };
  const setItemQuantity = (itemId: string | number, qty: string) =>
    setItemQuantities((prev) => ({ ...prev, [String(itemId)]: qty }));

  const canCreate = () => {
    if (!createForm.title?.trim()) return false;
    if (sourceType === "inquiry") return !!selectedInquiry;
    if (sourceType === "item")
      return !!filterCustomerId && selectedItems.length > 0;
    return false;
  };
  const handleCreate = async () => {
    if (!canCreate()) return;
    setCreating(true);
    try {
      const common = {
        title: createForm.title,
        currency: createForm.currency,
        validUntil: createForm.validUntil,
        paymentMethod: createForm.paymentMethod || undefined,
        shippingMethod: createForm.shippingMethod || undefined,
        pricingMode: createForm.pricingMode,
        paymentTerms: createForm.paymentTerms || undefined,
        useUnitPrices: createForm.useUnitPrices,
        unitPriceDecimalPlaces: createForm.unitPriceDecimalPlaces,
        totalPriceDecimalPlaces: createForm.totalPriceDecimalPlaces,
        maxUnitPriceColumns: createForm.maxUnitPriceColumns,
      };

      let res: any;
      if (sourceType === "inquiry") {
        res = await createOfferFromInquiry(selectedInquiry.id, common);
      } else {
        res = await createOfferFromItem(String(selectedItems[0].id), {
          ...common,
          customerId: filterCustomerId,
          itemIds: selectedItems.map((it) => String(it.id)),
          // Per-item quantities entered directly in the picker above, keyed
          // by item id — the backend uses these for each line's
          // baseQuantity instead of a single shared default.
          itemQuantities: selectedItems.reduce(
            (acc: Record<string, string>, it) => {
              acc[String(it.id)] = itemQuantities[String(it.id)]?.trim()
                ? itemQuantities[String(it.id)]
                : "1";
              return acc;
            },
            {},
          ),
        });
      }

      toast.success("Offer created successfully.", successStyles);
      onChanged?.();

      // Open the newly created offer directly in this modal's preview
      // instead of reloading the whole page.
      if (res?.data) {
        setOffer(res.data);
        setForm(buildForm(res.data));
      }
    } catch (e) {
      console.error("Error creating offer:", e);
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!offer) return;
    if (!form.title?.trim()) {
      toast.error("Title can't be empty.", errorStyles);
      return;
    }

    setSaving(true);

    // Add a timeout to prevent infinite loading
    const saveTimeout = setTimeout(() => {
      setSaving(false);
      toast.error("Save operation timed out. Please try again.", errorStyles);
    }, 30000); // 30 second timeout

    try {
      const isSameAsBilling =
        selectedShippingAddressId === "__same__" ||
        shippingAddresses.length === 0;

      const payload = {
        title: form.title,
        status: form.status,
        currency: form.currency,
        validUntil: form.validUntil,
        deliveryTime: form.deliveryTime,
        paymentTerms: form.paymentTerms,
        deliveryAddress: isSameAsBilling
          ? {
            addressName: "",
            contactName:
              form.customerSnapshot?.legalName ||
              form.customerSnapshot?.companyName ||
              offer?.customerSnapshot?.legalName ||
              offer?.customerSnapshot?.companyName ||
              "",
            street:
              form.customerSnapshot?.address ||
              form.customerSnapshot?.street ||
              offer?.customerSnapshot?.address ||
              offer?.customerSnapshot?.street ||
              "",
            postalCode:
              form.customerSnapshot?.postalCode ||
              offer?.customerSnapshot?.postalCode ||
              "",
            city:
              form.customerSnapshot?.city ||
              offer?.customerSnapshot?.city ||
              "",
            country:
              form.customerSnapshot?.country ||
              offer?.customerSnapshot?.country ||
              "",
            contactPhone:
              form.customerSnapshot?.contactPhoneNumber ||
              offer?.customerSnapshot?.contactPhoneNumber ||
              "",
          }
          : form.deliveryAddress,
        customerSnapshot: form.customerSnapshot,
        discountPercentage: parseFlexibleNumber(form.discountPercentage) ?? 0,
        paymentMethod: form.paymentMethod || undefined,
        shippingMethod: form.shippingMethod || undefined,
        shippingText: form.shippingText !== undefined ? form.shippingText : form.shippingMethod,
        deliveryTerms: form.deliveryTerms,
        termsConditions: form.termsConditions,
        notes: form.notes,
        internalNotes: form.internalNotes,
        highlightColor: form.highlightColor ?? "",
        shippingCost: parseFlexibleNumber(form.shippingCost) ?? 0,
        shippingQuantity: parseFlexibleNumber(form.shippingQuantity) ?? 1,
        taxRate: parseFlexibleNumber(form.taxRate) ?? 19,
        pricingMode: form.pricingMode,
        unitPriceDecimalPlaces: form.unitPriceDecimalPlaces,
        totalPriceDecimalPlaces: form.totalPriceDecimalPlaces,
        maxUnitPriceColumns: form.maxUnitPriceColumns,
      };

      console.log("Saving offer with payload:", payload);

      const res = await updateOffer(offer.id, payload);

      clearTimeout(saveTimeout); // Clear the timeout since we got a response

      if (res.success) {
        toast.success("Offer updated successfully.", successStyles);
        await refreshLocal();
        setEdit(false);
        onChanged?.();
      } else {
        toast.error(res.message || "Failed to update offer.", errorStyles);
      }
    } catch (e: any) {
      clearTimeout(saveTimeout);
      console.error("Error saving offer:", e);
      toast.error(
        e.message || "An error occurred while saving. Please try again.",
        errorStyles,
      );
    } finally {
      // Ensure saving is set to false even if there's an error
      setSaving(false);
    }
  };
  const handleCancelEdit = () => {
    setForm(buildForm(offer));
    setEdit(false);
    setShowCopyPaste(false);
    setShowItemPicker(false);
    setSearchEan("");
    setSearchItemNo("");
    setSearchName("");
    setPickerItems([]);
    setSelectedShippingAddressId("__same__");
  };

  const handleDelete = async () => {
    if (!offer) return;
    if (!window.confirm("Delete this offer? This can't be undone.")) return;
    try {
      await deleteOffer(offer.id);
      onClose();
      onChanged?.();
    } catch (e) {
      console.error("Error deleting offer:", e);
    }
  };

  /** Persists the highlight color immediately — available from the header
   * regardless of edit/view mode, so the offer's list-row color can be
   * changed without entering edit mode. */
  const setHighlightColor = async (color: string) => {
    try {
      await updateOffer(offer.id, { highlightColor: color });
      patch({ highlightColor: color });
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't update highlight color:", e);
    }
  };

  const setActive = async (lineItemId: string, idx: number) => {
    try {
      await setActivePrice(lineItemId, idx);
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't set the active price:", e);
    }
  };

  const persistLine = async (lineItemId: string, payload: any) => {
    try {
      const res: any = await updateLineItem(offer.id, lineItemId, payload);
      const updatedItem = res?.data ?? res;
      if (updatedItem?.id) {
        setOffer((prev: any) => ({
          ...prev,
          lineItems: prev.lineItems.map((li: any) =>
            li.id === lineItemId ? updatedItem : li,
          ),
        }));
        // Totals (subtotal/tax/total) change server-side whenever a line's
        // price, quantity, or tax rate changes — refresh so the summary
        // panel and per-rate VAT breakdown reflect the saved state.
        await refreshLocal();
      }
    } catch (e) {
      console.error("Couldn't save line item change:", e);
      toast.error("Couldn't save that change.", errorStyles);
    }
  };

  const handleMoveLineItem = async (lineItemId: string, direction: "up" | "down") => {
    const sorted = [...visibleLineItems].sort(
      (a: any, b: any) => (Number(a.position) || 0) - (Number(b.position) || 0)
    );
    const idx = sorted.findIndex((li: any) => li.id === lineItemId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const newItems = [...sorted];
    const [moved] = newItems.splice(idx, 1);
    newItems.splice(targetIdx, 0, moved);

    const posMap = new Map<string, number>();
    const updatesToPersist: { id: string; position: number }[] = [];

    newItems.forEach((item, i) => {
      const newPos = i + 1;
      posMap.set(String(item.id), newPos);
      if (Number(item.position) !== newPos) {
        updatesToPersist.push({ id: String(item.id), position: newPos });
      }
    });

    setOffer((prev: any) => ({
      ...prev,
      lineItems: (prev?.lineItems || []).map((li: any) => {
        const newPos = posMap.get(String(li.id));
        return newPos !== undefined ? { ...li, position: newPos } : li;
      }),
    }));

    try {
      await Promise.all(
        updatesToPersist.map((u) =>
          updateLineItem(offer.id, u.id, { position: u.position })
        )
      );
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't save line item order change:", e);
      toast.error("Couldn't save item order change.", errorStyles);
    }
  };

  const updateMatrixEntry = async (
    lineItemId: string,
    entryId: string,
    updates: { quantity?: string; price?: string; isActive?: boolean },
  ) => {
    const li = offer.lineItems.find((l: any) => l.id === lineItemId);
    if (!li) return;
    const updated = (li.priceMatrix || []).map((p: any) => {
      if (p.id !== entryId) return p;
      const quantity =
        updates.quantity !== undefined ? updates.quantity : p.quantity;
      const price =
        updates.price !== undefined
          ? updates.price.trim() === "." || updates.price.trim() === ""
            ? null
            : parseFlexibleNumber(updates.price)
          : p.price;
      return {
        ...p,
        quantity,
        price,
        isActive: updates.isActive ?? p.isActive,
      };
    });
    await persistLine(lineItemId, { priceMatrix: updated });
  };

  const deleteMatrixEntry = async (lineItemId: string, entryId: string) => {
    if (!window.confirm("Delete this price tier?")) return;
    const li = offer.lineItems.find((l: any) => l.id === lineItemId);
    if (!li) return;
    const updated = (li.priceMatrix || []).filter((p: any) => p.id !== entryId);
    await persistLine(lineItemId, { priceMatrix: updated });
  };

  const addMatrixEntry = async (lineItemId: string) => {
    try {
      await addPriceMatrixEntry(lineItemId, { quantity: "1000", price: null });
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't add a price tier:", e);
    }
  };

  const addLineItem = async () => {
    if (!newLine.itemName.trim()) {
      toast.error("Enter a name for the Freizeile first.", errorStyles);
      return;
    }

    // Empty input -> fall back to the tax profile's rate; anything typed
    // is the user's explicit override for this Freizeile only.
    const taxProfileRate =
      parseFlexibleNumber(offer?.taxProfile?.taxRate) ?? 19;
    const requestedRate =
      newLine.taxRate.trim() === ""
        ? taxProfileRate
        : (parseFlexibleNumber(newLine.taxRate) ?? taxProfileRate);

    if (!canUseTaxRate(offer, requestedRate)) {
      toast.error(
        "Only 3 different VAT rates are allowed on one offer.",
        errorStyles,
      );
      return;
    }

    try {
      await createOfferLineItem(offer.id, {
        itemName: newLine.itemName.trim(),
        baseQuantity: newLine.baseQuantity?.trim() || "1",
        basePrice: 0,
        taxRate: requestedRate,
      } as any);
      setNewLine({ itemName: "", baseQuantity: "1", taxRate: "" });
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't add the Freizeile:", e);
    }
  };

  const addExistingItem = async (it: any) => {
    try {
      await createOfferLineItem(offer.id, {
        itemName: it.item_name_de || "Item",
        material: it.model || (it.ean ? String(it.ean) : undefined),
        basePrice: 0,
        weight: it.weight,
        notes: it.remark_ex || it.remark || undefined,
        sourceItemId: String(it.id),
      });
      setShowItemPicker(false);
      setSearchEan("");
      setSearchItemNo("");
      setSearchName("");
      setPickerItems([]);
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't add the item:", e);
    }
  };

  const removeLineItem = async (lineItemId: string) => {
    if (!window.confirm("Remove this line item?")) return;
    try {
      await deleteOfferLineItem(offer.id, lineItemId);
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't remove the item:", e);
    }
  };

  const handlePasteMatrix = async () => {
    if (!copyPasteData.trim()) {
      toast.error("Paste the qty/price data first.", errorStyles);
      return;
    }
    const tiers = parseInt(tierCount, 10);
    if (!tiers || tiers < 1) {
      toast.error("Enter how many quantity tiers to expect.", errorStyles);
      return;
    }
    try {
      const res = await pasteMatrixPrices(offer.id, {
        data: copyPasteData,
        tierCount: tiers,
      });
      if (res.success) {
        toast.success(res.message || "Prices imported.", successStyles);
        setShowCopyPaste(false);
        setCopyPasteData("");
        await refreshLocal();
        onChanged?.();
      }
    } catch (e) {
      console.error("Couldn't import the pasted prices:", e);
      toast.error("Couldn't parse that paste — check the format.", errorStyles);
    }
  };

  const sourceBadge = (source: string) => {
    const map: Record<
      string,
      { label: string; cls: string; icon: React.ReactNode }
    > = {
      inquiry: {
        label: "From inquiry",
        cls: "bg-blue-100 text-blue-800",
        icon: <LinkIcon className="h-3 w-3" />,
      },
      item: {
        label: "From item",
        cls: "bg-amber-100 text-amber-800",
        icon: <CubeIcon className="h-3 w-3" />,
      },
      customer: {
        label: "From customer",
        cls: "bg-violet-100 text-violet-800",
        icon: <BuildingOfficeIcon className="h-3 w-3" />,
      },
    };

    const s = map[offer?.sourceType] || map.inquiry;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium ${s.cls}`}
      >
        {s.icon}
        {s.label}
      </span>
    );
  };

  const visibleLineItems = (
    offer?.lineItems?.filter((li: any) => !li.isComponent) || []
  ).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
  const pricingMode: PricingMode = offer?.pricingMode || "classic";

  const priceTiers: string[] = (() => {
    if (pricingMode !== "matrix") return [];
    const set = new Set<string>();
    visibleLineItems.forEach((li: any) => {
      (li.priceMatrix || []).forEach((r: any) =>
        set.add(String(r.quantity).trim()),
      );
    });
    return Array.from(set).sort(
      (a, b) => (parseFlexibleNumber(a) || 0) - (parseFlexibleNumber(b) || 0),
    );
  })();

  const netWeightKg = visibleLineItems.reduce((sum: number, li: any) => {
    const qty =
      pricingMode === "matrix"
        ? (parseFlexibleNumber(getActiveMatrixEntry(li)?.quantity) ?? 1)
        : (parseFlexibleNumber(li.baseQuantity) ?? 1);
    const weightGrams = parseFlexibleNumber(li.weight) ?? 0;
    return sum + (weightGrams * qty) / 1000;
  }, 0);
  const extraWeightKg = visibleLineItems.reduce(
    (sum: number, li: any) => sum + (parseFlexibleNumber(li.extraWeight) ?? 0),
    0,
  );
  const totalWeightKg = netWeightKg + extraWeightKg;

  const taxProfile = offer?.taxProfile || null;

  // Discount reduces each group's base proportionally.
  const discountFactor =
    offer?.discountPercentage > 0 ? 1 - offer.discountPercentage / 100 : 1;

  const vatGroups: { rate: number; base: number; tax: number }[] = (() => {
    const byRate = new Map<number, number>();
    visibleLineItems.forEach((li: any) => {
      const rate = getLineTaxRate(li, offer);
      const lineTotal = getLineItemTotal(li, pricingMode);
      byRate.set(rate, (byRate.get(rate) || 0) + lineTotal);
    });

    const shippingTotal = edit
      ? (form.shippingCost || 0) * (form.shippingQuantity || 1)
      : (offer?.shippingCost || 0) * (offer?.shippingQuantity || 1);

    if (shippingTotal > 0) {
      const shipRate = getShippingTaxRate(offer);
      byRate.set(shipRate, (byRate.get(shipRate) || 0) + shippingTotal);
    }

    return Array.from(byRate.entries())
      .map(([rate, base]) => {
        const adjustedBase = base * discountFactor;
        return { rate, base: adjustedBase, tax: adjustedBase * (rate / 100) };
      })
      .sort((a, b) => b.rate - a.rate);
  })();

  const shippingTotalForDisplay = edit
    ? (form.shippingCost || 0) * (form.shippingQuantity || 1)
    : (offer?.shippingCost || 0) * (offer?.shippingQuantity || 1);
  const vatTaxSum = vatGroups.reduce((sum, g) => sum + g.tax, 0);
  const displayTotal =
    (offer?.subtotal || 0) -
    (offer?.discountAmount || 0) +
    shippingTotalForDisplay * discountFactor +
    vatTaxSum;

  // --- Linked documents (Aufträge) -----------------------------------------
  // offer.linkedDocuments is now an array of full CustomerOrder records
  // ({ id, order_no, created_at, offer_id }) coming straight from
  // getOfferById / getAllOffers on the backend — sorted newest first here.
  const linkedDocuments = sortByCreatedAtDesc(offer?.linkedDocuments || []);

  const sourceTabs: {
    key: SourceType;
    label: string;
    icon: React.ReactNode;
  }[] = [
      {
        key: "inquiry",
        label: "From inquiry",
        icon: <LinkIcon className="h-4 w-4" />,
      },
      {
        key: "item",
        label: "Customer + item(s)",
        icon: <CubeIcon className="h-4 w-4" />,
      },
    ];

  // --- Delivery-address-vs-billing state (used below in the address block) --
  const currentDeliveryAddress = offer
    ? edit
      ? form.deliveryAddress
      : offer.deliveryAddress
    : null;
  const deliverySameAsBilling = offer
    ? isDeliverySameAsBilling(currentDeliveryAddress, offer.customerSnapshot)
    : true;
  const showAsSame = edit
    ? selectedShippingAddressId === "__same__" || shippingAddresses.length === 0
    : deliverySameAsBilling;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-[1260px] w-full max-h-[92vh] flex flex-col overflow-hidden">
        {isCreate ? (
          <>
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900">
                Create new offer
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {sourceTabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => {
                      setSourceType(t.key);
                      setSourceSearch("");
                      setSelectedInquiry(null);
                      setSelectedItems([]);
                      setItemQuantities({});
                      setSearchEan("");
                      setSearchItemNo("");
                      setSearchName("");
                      setPickerItems([]);
                    }}
                    className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all ${sourceType === t.key
                      ? "border-primary bg-primary/5 text-primary font-semibold"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offer title *
                </label>
                <input
                  value={createForm.title}
                  onChange={(e) => cPatch({ title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  placeholder={
                    sourceType === "inquiry"
                      ? "Defaults to the inquiry name"
                      : "Defaults to the first item's name"
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pricing mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["classic", "matrix"] as PricingMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => cPatch({ pricingMode: m })}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${createForm.pricingMode === m
                        ? "border-primary bg-primary/5 text-primary font-semibold"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                    >
                      {m === "classic"
                        ? "Classic (1 qty · 1 price)"
                        : "Matrix (many qty/price)"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {sourceType === "item"
                      ? "Recipient customer * (required)"
                      : "Filter by customer"}
                  </label>
                  <CustomerSearchInput
                    value={filterCustomerId}
                    onChange={(id) => setFilterCustomerId(id)}
                    placeholder={
                      sourceType === "item"
                        ? "Select a customer..."
                        : "All customers"
                    }
                    mode="customers"
                    className="w-full"
                  />
                </div>
                {sourceType === "inquiry" && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Search
                    </label>
                    <input
                      value={sourceSearch}
                      onChange={(e) => setSourceSearch(e.target.value)}
                      placeholder="Search inquiries…"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Three-field item search — identical to the edit-mode
                  "Add existing item" picker (same fields, same debounced
                  autocompleteItems call, same result list via pickerItems). */}
              {sourceType === "item" && (
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      EAN
                    </label>
                    <input
                      value={searchEan}
                      onChange={(e) =>
                        handleFieldSearchChange("ean", e.target.value)
                      }
                      placeholder="EAN..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Item No.
                    </label>
                    <input
                      value={searchItemNo}
                      onChange={(e) =>
                        handleFieldSearchChange("itemNo", e.target.value)
                      }
                      placeholder="Item no..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Item Name (EN/DE)
                    </label>
                    <input
                      value={searchName}
                      onChange={(e) =>
                        handleFieldSearchChange("name", e.target.value)
                      }
                      placeholder="Item name..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {sourceType === "item" && selectedCustomer && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Customer address
                    </p>

                    <div className="md:col-span-1 flex flex-col gap-3">
                      <div className="block mb-1">
                        {edit ? (
                          <div className="space-y-1 text-xs">
                            <input
                              className={inputCls}
                              placeholder="Legal name"
                              value={form.customerSnapshot?.legalName || ""}
                              onChange={(e) =>
                                patch({
                                  customerSnapshot: {
                                    ...form.customerSnapshot,
                                    legalName: e.target.value,
                                  },
                                })
                              }
                            />
                            <div className="grid grid-cols-2 gap-1">
                              <input
                                className={inputCls}
                                placeholder="Street & No."
                                value={
                                  form.customerSnapshot?.address ||
                                  form.customerSnapshot?.street ||
                                  ""
                                }
                                onChange={(e) =>
                                  patch({
                                    customerSnapshot: {
                                      ...form.customerSnapshot,
                                      address: e.target.value,
                                      street: e.target.value,
                                    },
                                  })
                                }
                              />
                              <input
                                className={inputCls}
                                placeholder="Additional line (c/o, floor)"
                                value={
                                  form.customerSnapshot?.addressAdditional ||
                                  form.customerSnapshot?.address_additional ||
                                  ""
                                }
                                onChange={(e) =>
                                  patch({
                                    customerSnapshot: {
                                      ...form.customerSnapshot,
                                      addressAdditional: e.target.value,
                                    },
                                  })
                                }
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              <input
                                className={inputCls}
                                placeholder="Postal code"
                                value={form.customerSnapshot?.postalCode || ""}
                                onChange={(e) =>
                                  patch({
                                    customerSnapshot: {
                                      ...form.customerSnapshot,
                                      postalCode: e.target.value,
                                    },
                                  })
                                }
                              />
                              <input
                                className={inputCls}
                                placeholder="City"
                                value={form.customerSnapshot?.city || ""}
                                onChange={(e) =>
                                  patch({
                                    customerSnapshot: {
                                      ...form.customerSnapshot,
                                      city: e.target.value,
                                    },
                                  })
                                }
                              />
                              <input
                                className={inputCls}
                                placeholder="Country"
                                value={form.customerSnapshot?.country || ""}
                                onChange={(e) =>
                                  patch({
                                    customerSnapshot: {
                                      ...form.customerSnapshot,
                                      country: e.target.value,
                                    },
                                  })
                                }
                              />
                            </div>
                            <input
                              className={inputCls}
                              placeholder="VAT ID"
                              value={form.customerSnapshot?.vatId || ""}
                              onChange={(e) =>
                                patch({
                                  customerSnapshot: {
                                    ...form.customerSnapshot,
                                    vatId: e.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                        ) : (
                          <AddressBlock
                            addr={{
                              companyName: offer?.customerSnapshot?.companyName,
                              legalName: offer?.customerSnapshot?.legalName,
                              address: offer?.customerSnapshot?.address,
                              street: offer?.customerSnapshot?.street,
                              postalCode: offer?.customerSnapshot?.postalCode,
                              city: offer?.customerSnapshot?.city,
                              country: offer?.customerSnapshot?.country,
                              vatId: offer?.customerSnapshot?.vatId,
                            }}
                            emptyText="No customer snapshot."
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                    {selectedCustomer.deliveryAddressLine1 && (
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Delivery:
                      </p>
                    )}
                    <AddressBlock
                      addr={
                        selectedCustomer.deliveryAddressLine1
                          ? {
                            contactName:
                              selectedCustomer.legalName ||
                              selectedCustomer.companyName,
                            street: selectedCustomer.deliveryAddressLine1,
                            postalCode: selectedCustomer.deliveryPostalCode,
                            city: selectedCustomer.deliveryCity,
                            country: selectedCustomer.deliveryCountry,
                            contactPhone: selectedCustomer.contactPhoneNumber,
                          }
                          : null
                      }
                      emptyText="Same as customer address."
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {sourceType === "inquiry" &&
                  (visibleInquiries.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No inquiries match.
                    </div>
                  ) : (
                    visibleInquiries.map((inq) => (
                      <PickerRow
                        key={inq.id}
                        selected={selectedInquiry?.id === inq.id}
                        onClick={() => {
                          setSelectedInquiry(inq);
                          setCreateForm((f: any) => ({
                            ...f,
                            title: inq.name,
                            paymentMethod:
                              inq.customer?.defaultPaymentMethod ||
                              f.paymentMethod ||
                              "",
                            shippingMethod:
                              inq.customer?.defaultShippingMethod ||
                              f.shippingMethod ||
                              "",
                            paymentTerms:
                              inq.customer?.defaultPaymentDueDays !==
                                undefined &&
                                inq.customer?.defaultPaymentDueDays !== null
                                ? `${inq.customer.defaultPaymentDueDays}`
                                : f.paymentTerms || "",
                          }));
                        }}
                        title={inq.name}
                        subtitle={`Customer: ${inq.customer?.companyName || "—"}`}
                        meta={`${inq.requests?.length || 0} items · ${inq.isAssembly ? "Assembly" : "Standard"}`}
                      />
                    ))
                  ))}

                {sourceType === "item" &&
                  (itemSearchLoading ? (
                    <div className="text-center text-sm text-gray-400 py-3">
                      Searching…
                    </div>
                  ) : !searchEan.trim() &&
                    !searchItemNo.trim() &&
                    !searchName.trim() ? (
                    <div className="text-center text-sm text-gray-400 py-3">
                      Type in EAN, Item No., or Item Name to search.
                    </div>
                  ) : pickerItems.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No items match.
                    </div>
                  ) : (
                    pickerItems.map((it) => (
                      <ItemRow
                        key={it.id}
                        item={it}
                        selected={selectedItems.some(
                          (p) => String(p.id) === String(it.id),
                        )}
                        onClick={() => toggleItem(it)}
                      />
                    ))
                  ))}
              </div>

              {sourceType === "item" && selectedItems.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Selected items ({selectedItems.length})
                  </p>
                  <div className="space-y-2">
                    {selectedItems.map((it) => (
                      <div key={it.id} className="flex items-center gap-2">
                        <div className="flex-1">
                          <ItemRow
                            item={it}
                            selected
                            onClick={() => toggleItem(it)}
                          />
                        </div>
                        <div className="w-20 shrink-0">
                          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                            Qty
                          </label>
                          <input
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                            value={itemQuantities[String(it.id)] ?? "1"}
                            onChange={(e) =>
                              setItemQuantity(it.id, e.target.value)
                            }
                          />
                        </div>
                        <button
                          onClick={() => toggleItem(it)}
                          className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 shrink-0"
                          title="Remove from selection"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment method
                </label>
                <select
                  value={createForm.paymentMethod}
                  onChange={(e) => cPatch({ paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="">Select…</option>
                  {createForm.paymentMethod &&
                    !(
                      dbPaymentMethods.length > 0
                        ? dbPaymentMethods.map((pm: any) => pm.name)
                        : PAYMENT_METHODS
                    ).includes(createForm.paymentMethod) && (
                      <option value={createForm.paymentMethod}>
                        {createForm.paymentMethod}
                      </option>
                    )}
                  {(dbPaymentMethods.length > 0
                    ? dbPaymentMethods.map((pm: any) => pm.name)
                    : PAYMENT_METHODS
                  ).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shipping method
                </label>
                <select
                  value={createForm.shippingMethod}
                  onChange={(e) => cPatch({ shippingMethod: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="">Select…</option>
                  {createForm.shippingMethod &&
                    !(
                      dbShippingMethods.length > 0
                        ? dbShippingMethods.map((sm: any) => sm.name)
                        : SHIPPING_METHODS
                    ).includes(createForm.shippingMethod) && (
                      <option value={createForm.shippingMethod}>
                        {createForm.shippingMethod}
                      </option>
                    )}
                  {(dbShippingMethods.length > 0
                    ? dbShippingMethods.map((sm: any) => sm.name)
                    : SHIPPING_METHODS
                  ).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!canCreate() || creating}
                className="px-4 py-2 text-sm bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create offer"}
              </button>
            </div>
          </>
        ) : loading || !offer ? (
          <div className="p-6 py-24 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary" />
            <p className="mt-2 text-sm text-gray-500">Loading offer…</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0 select-none">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-lg font-bold text-gray-900 truncate">
                    Angebot {offer.offerNumber}
                  </p>
                  {offer.revision > 1 && (
                    <span className="text-xs text-gray-500">
                      Rev. {offer.revision}
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">
                    {pricingMode === "matrix" ? "Matrix" : "Classic"}
                  </span>
                  {displayInquiryNo && (
                    <span className="text-sm font-bold text-gray-900 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                      <LinkIcon className="h-3 w-3" />
                      {displayInquiryNo}
                    </span>
                  )}
                </div>
                <h2 className="text-sm font-medium text-gray-500 truncate mt-0.5 flex items-center gap-1">
                  <span>{offer.title}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(offer.title || "");
                      toast.success("Title copied to clipboard!");
                    }}
                    className="text-gray-400 hover:text-gray-700 transition-colors p-0.5 rounded cursor-pointer shrink-0"
                    title="Copy Title"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  </button>
                </h2>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <SystemColourSelect
                  value={offer.highlightColor}
                  onChange={setHighlightColor}
                  edit={edit}
                />
                <ViewEditToggle
                  isEditEnabled={edit}
                  onToggle={() =>
                    edit ? handleCancelEdit() : handleStartEdit()
                  }
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-white overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
                <div className="md:col-span-1 flex flex-col gap-3">
                  <div className="md:col-span-1 flex flex-col gap-3">
                    <div className="block mb-1">
                      {edit ? (
                        <div className="space-y-1 text-xs">
                          <input
                            className={inputCls}
                            placeholder="Legal name"
                            value={form.customerSnapshot?.legalName || ""}
                            onChange={(e) =>
                              patch({
                                customerSnapshot: {
                                  ...form.customerSnapshot,
                                  legalName: e.target.value,
                                },
                              })
                            }
                          />
                          <div className="grid grid-cols-2 gap-1">
                            <input
                              className={inputCls}
                              placeholder="Street & No."
                              value={
                                form.customerSnapshot?.address ||
                                form.customerSnapshot?.street ||
                                ""
                              }
                              onChange={(e) =>
                                patch({
                                  customerSnapshot: {
                                    ...form.customerSnapshot,
                                    address: e.target.value,
                                    street: e.target.value,
                                  },
                                })
                              }
                            />
                            <input
                              className={inputCls}
                              placeholder="Additional line (c/o, floor)"
                              value={
                                form.customerSnapshot?.addressAdditional ||
                                form.customerSnapshot?.address_additional ||
                                ""
                              }
                              onChange={(e) =>
                                patch({
                                  customerSnapshot: {
                                    ...form.customerSnapshot,
                                    addressAdditional: e.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            <input
                              className={inputCls}
                              placeholder="Postal code"
                              value={form.customerSnapshot?.postalCode || ""}
                              onChange={(e) =>
                                patch({
                                  customerSnapshot: {
                                    ...form.customerSnapshot,
                                    postalCode: e.target.value,
                                  },
                                })
                              }
                            />
                            <input
                              className={inputCls}
                              placeholder="City"
                              value={form.customerSnapshot?.city || ""}
                              onChange={(e) =>
                                patch({
                                  customerSnapshot: {
                                    ...form.customerSnapshot,
                                    city: e.target.value,
                                  },
                                })
                              }
                            />
                            <input
                              className={inputCls}
                              placeholder="Country"
                              value={form.customerSnapshot?.country || ""}
                              onChange={(e) =>
                                patch({
                                  customerSnapshot: {
                                    ...form.customerSnapshot,
                                    country: e.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                          <input
                            className={inputCls}
                            placeholder="VAT ID"
                            value={form.customerSnapshot?.vatId || ""}
                            onChange={(e) =>
                              patch({
                                customerSnapshot: {
                                  ...form.customerSnapshot,
                                  vatId: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      ) : (
                        <AddressBlock
                          addr={{
                            companyName: offer.customerSnapshot?.companyName,
                            legalName: offer.customerSnapshot?.legalName,
                            address: offer.customerSnapshot?.address,
                            street: offer.customerSnapshot?.street,
                            postalCode: offer.customerSnapshot?.postalCode,
                            city: offer.customerSnapshot?.city,
                            country: offer.customerSnapshot?.country,
                            vatId: offer.customerSnapshot?.vatId,
                          }}
                          emptyText="No customer snapshot."
                        />
                      )}
                    </div>
                  </div>

                  <div className="block mb-1">
                    {(edit || !showAsSame) && (
                      <span className="text-sm font-bold text-gray-900">
                        Delivery:
                      </span>
                    )}

                    {edit && (
                      <select
                        className={`${inputCls} mt-1 mb-2`}
                        value={selectedShippingAddressId}
                        onChange={(e) =>
                          handleDeliveryAddressSelect(e.target.value)
                        }
                      >
                        <option value="__same__">
                          Same as billing address
                        </option>
                        {shippingAddresses.map((a: any) => (
                          <option key={a.id} value={a.id}>
                            {a.name} — {a.street}, {a.city}
                            {a.isDefault ? " (Default)" : ""}
                          </option>
                        ))}
                      </select>
                    )}

                    {showAsSame ? (
                      <div className="text-sm text-gray-500">
                        Same Delivery Address
                      </div>
                    ) : (
                      <AddressBlock
                        addr={{
                          addressName: currentDeliveryAddress?.addressName,
                          companyName:
                            currentDeliveryAddress?.companyName ||
                            currentDeliveryAddress?.contactName,
                          legalName: currentDeliveryAddress?.contactName,
                          address: currentDeliveryAddress?.street,
                          street: currentDeliveryAddress?.street,
                          postalCode: currentDeliveryAddress?.postalCode,
                          city: currentDeliveryAddress?.city,
                          country: currentDeliveryAddress?.country,
                          contactPhone: currentDeliveryAddress?.contactPhone,
                        }}
                        emptyText="No delivery address set."
                      />
                    )}
                  </div>
                </div>

                <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                  <Field label="Title" edit={edit} value={offer.title}>
                    <input
                      className={inputCls}
                      value={form.title}
                      onChange={(e) => patch({ title: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="Tax profile"
                    edit={false}
                    value={
                      taxProfile
                        ? `${taxProfile.name} (${taxProfile.taxRate}%)`
                        : "No tax profile assigned to this customer"
                    }
                  />
                  <Field
                    label="Delivery Date"
                    edit={edit}
                    value={
                      offer.deliveryTime ? formatDate(offer.deliveryTime) : ""
                    }
                  >
                    <input
                      type="date"
                      className={inputCls}
                      value={toDateInputValue(form.deliveryTime)}
                      onChange={(e) => patch({ deliveryTime: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="Payment method"
                    edit={edit}
                    value={offer.paymentMethod}
                  >
                    <select
                      className={inputCls}
                      value={form.paymentMethod || ""}
                      onChange={(e) => patch({ paymentMethod: e.target.value })}
                    >
                      <option value="">Select…</option>
                      {(dbPaymentMethods.length > 0
                        ? dbPaymentMethods.map((pm: any) => pm.name)
                        : PAYMENT_METHODS
                      ).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    label="Payment Due Days"
                    edit={edit}
                    value={offer.paymentDueDays}
                  >
                    <input
                      className={inputCls}
                      value={form.paymentTerms}
                      placeholder="e.g., 30 days net"
                      onChange={(e) => patch({ paymentTerms: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="Shipping method"
                    edit={edit}
                    value={offer.shippingMethod}
                  >
                    <select
                      className={inputCls}
                      value={form.shippingMethod || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        patch({
                          shippingMethod: val,
                          ...(!form.shippingText || form.shippingText === form.shippingMethod
                            ? { shippingText: val }
                            : {}),
                        });
                      }}
                    >
                      <option value="">Select…</option>
                      {(dbShippingMethods.length > 0
                        ? dbShippingMethods.map((sm: any) => sm.name)
                        : SHIPPING_METHODS
                      ).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              {/* PRICING MODE */}
              {pricingMode === "matrix" && (
                <button
                  disabled={!edit}
                  onClick={() => setShowCopyPaste((s) => !s)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50 ml-2"
                >
                  <ClipboardIcon className="h-4 w-4" />
                  Paste matrix
                </button>
              )}

              {pricingMode === "matrix" && edit && priceTiers.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Delete a tier (applies to every item)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {priceTiers.map((q) => (
                      <button
                        key={q}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `Delete the ${q} tier from all items?`,
                            )
                          )
                            return;
                          try {
                            await deletePriceColumn(offer.id, q);
                            await refreshLocal();
                            onChanged?.();
                          } catch (e) {
                            console.error("Couldn't delete the tier:", e);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-white border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-colors"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showCopyPaste && pricingMode === "matrix" && (
                <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-xs text-blue-900 mb-2">
                    One value per line: optional label, then the quantity tiers,
                    then each item's prices in the same tier order (a "." line
                    between items is optional; a "." within a block means "not
                    calculated"). Applied to the line items below, in order —
                    add them first.
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-xs font-medium text-gray-700">
                      Quantity tiers
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                      value={tierCount}
                      onChange={(e) => setTierCount(e.target.value)}
                    />
                  </div>
                  <textarea
                    rows={8}
                    value={copyPasteData}
                    onChange={(e) => setCopyPasteData(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono"
                    placeholder={
                      "Muster\n50\n100\n200\n20,00\n17,32\n16,57\n.\n34,00\n21,21\n20,3"
                    }
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => {
                        setShowCopyPaste(false);
                        setCopyPasteData("");
                      }}
                      className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePasteMatrix}
                      disabled={!copyPasteData.trim()}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Import prices
                    </button>
                  </div>
                </div>
              )}

              {pricingMode === "classic" ? (
                <div className="space-y-3">
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
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
                          <th className="px-2 py-2 text-left font-semibold text-gray-600 w-40">
                            RemarkEx
                          </th>
                          <th className="px-2 py-2 text-center font-semibold text-gray-600 w-20">
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
                          {edit && <th className="w-10" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {visibleLineItems.length === 0 && (
                          <tr>
                            <td
                              colSpan={edit ? 10 : 9}
                              className="text-center py-6 text-sm text-gray-500"
                            >
                              No line items yet.
                            </td>
                          </tr>
                        )}
                        {visibleLineItems.map((item: any, index: number) => {
                          const freetext = isFreetextLine(item);
                          const total = getLineItemTotal(item, "classic");
                          const qtyDisplay = Math.round(
                            parseFlexibleNumber(item.baseQuantity) ?? 1,
                          );
                          const rowColor =
                            item.highlightColor ||
                            (freetext ? "#D8964A" : null);
                          const thumb = item.photo;
                          const lineTaxRate = getLineTaxRate(item, offer);
                          // Only Freizeile (freetext) lines get an editable
                          // VAT rate — catalog/inquiry-sourced lines always
                          // follow the live tax profile and can't be
                          // overridden here.
                          const taxRateEditable = freetext;
                          return (
                            <tr
                              key={item.id}
                              style={{
                                ...(rowColor
                                  ? { backgroundColor: rowColor }
                                  : {}),
                                // Draft-item indicator — a thin colored
                                // stripe on the extreme left of the row,
                                // independent of the background color
                                // logic above. Purely visual; doesn't
                                // affect layout width since it replaces
                                // the row's own left border.
                                ...(item.isDraft
                                  ? { borderLeft: "4px solid #D8964A" }
                                  : {}),
                              }}
                            >
                              <td className="px-2 py-2 text-gray-500 whitespace-nowrap">
                                {edit ? (
                                  <div className="flex items-center gap-1 select-none">
                                    <span className="w-4 text-xs font-semibold">{index + 1}</span>
                                    <div className="flex flex-col gap-0.5">
                                      <button
                                        type="button"
                                        disabled={index === 0}
                                        onClick={() => handleMoveLineItem(item.id, "up")}
                                        className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-colors"
                                        title="Move Up"
                                      >
                                        <ChevronUpIcon className="w-3 h-3 stroke-[2.5]" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={index === visibleLineItems.length - 1}
                                        onClick={() => handleMoveLineItem(item.id, "down")}
                                        className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-colors"
                                        title="Move Down"
                                      >
                                        <ChevronDownIcon className="w-3 h-3 stroke-[2.5]" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  index + 1
                                )}
                              </td>
                              <td className="px-2 py-2">
                                <div className="w-9 h-9 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                                  {thumb ? (
                                    <img
                                      src={thumb}
                                      alt="thumb"
                                      className="w-full h-full object-contain"
                                      onError={(e) =>
                                      ((
                                        e.target as HTMLImageElement
                                      ).style.display = "none")
                                      }
                                    />
                                  ) : (
                                    <span className="text-gray-300 text-[10px]">
                                      —
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 py-2">
                                {edit ? (
                                  <TextCellInput
                                    value={item.itemNo}
                                    placeholder="Art.-Nr."
                                    onCommit={(raw) =>
                                      persistLine(item.id, { material: raw })
                                    }
                                  />
                                ) : (
                                  <span>{item.itemNo || "—"}</span>
                                )}
                              </td>
                              <td className="px-2 py-2">
                                {edit ? (
                                  <TextCellInput
                                    value={item.itemName}
                                    onCommit={(raw) =>
                                      persistLine(item.id, {
                                        itemName: raw || item.itemName,
                                      })
                                    }
                                  />
                                ) : (
                                  <span>{item.itemName || "—"}</span>
                                )}
                              </td>
                              <td className="px-2 py-2">
                                {edit ? (
                                  <TextCellInput
                                    value={item.notes}
                                    placeholder="Remark"
                                    onCommit={(raw) =>
                                      persistLine(item.id, { notes: raw })
                                    }
                                  />
                                ) : (
                                  <span className="text-gray-600">
                                    {item.notes || "—"}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center text-gray-600">
                                {edit && taxRateEditable ? (
                                  <div className="flex items-center justify-center gap-0.5">
                                    <DecimalInput
                                      className="w-14 px-1.5 py-1 text-sm border border-gray-300 rounded text-right"
                                      value={lineTaxRate}
                                      onCommit={(raw) => {
                                        const parsed = parseFlexibleNumber(raw);
                                        const taxProfileRate =
                                          parseFlexibleNumber(
                                            offer?.taxProfile?.taxRate,
                                          ) ?? 19;
                                        const newRate =
                                          parsed === null
                                            ? taxProfileRate
                                            : parsed;
                                        if (
                                          !canUseTaxRate(
                                            offer,
                                            newRate,
                                            item.id,
                                          )
                                        ) {
                                          toast.error(
                                            "Only 3 different VAT rates are allowed on one offer.",
                                            errorStyles,
                                          );
                                          return;
                                        }
                                        persistLine(item.id, {
                                          taxRate: newRate,
                                        });
                                      }}
                                    />
                                    <span>%</span>
                                  </div>
                                ) : (
                                  `${lineTaxRate}%`
                                )}
                              </td>
                              <td className="px-2 py-2">
                                {edit ? (
                                  <DecimalInput
                                    className="w-full px-1.5 py-1 text-sm border border-gray-300 rounded text-right"
                                    value={item.baseQuantity}
                                    onCommit={(raw) =>
                                      handleQuantityCommit(item, raw)
                                    }
                                  />
                                ) : (
                                  <div className="text-right">{qtyDisplay}</div>
                                )}
                              </td>
                              <td className="px-2 py-2">
                                {edit ? (
                                  <DecimalInput
                                    className="w-full px-1.5 py-1 text-sm border border-gray-300 rounded text-right"
                                    value={item.basePrice}
                                    onCommit={(raw) => {
                                      const parsed = parseAndRoundTo3Decimals(raw);
                                      persistLine(item.id, {
                                        basePrice: parsed === null ? "0" : parsed,
                                      });
                                    }}
                                  />
                                ) : (
                                  <div className="text-right">
                                    {formatUnitPriceCurrency(
                                      item.basePrice || 0,
                                      offer.currency,
                                      3,
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-2 py-2 text-right font-medium">
                                {formatCurrency(total || 0, offer.currency)}
                              </td>
                              {edit && (
                                <td className="px-2 py-2 text-center">
                                  <button
                                    onClick={() => removeLineItem(item.id)}
                                    className="text-rose-500 hover:text-rose-700"
                                    title="Remove line"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}

                        {/* Shipping method row with editable quantity and price */}
                        {offer.shippingMethod && (
                          <tr className="bg-gray-50/80 border-t-2 border-gray-200">
                            <td className="px-2 py-2 text-gray-400">
                              {visibleLineItems.length + 1}
                            </td>
                            <td className="px-2 py-2 text-gray-400"></td>
                            <td className="px-2 py-2 text-gray-400">—</td>
                            <td className="px-2 py-2">
                              {edit ? (
                                <input
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                                  value={
                                    form.shippingText !== undefined
                                      ? form.shippingText
                                      : form.shippingMethod || ""
                                  }
                                  onChange={(e) =>
                                    patch({ shippingText: e.target.value })
                                  }
                                  placeholder="Shipping method description"
                                />
                              ) : (
                                <span className="font-medium text-gray-700">
                                  {offer.shippingText ||
                                    offer.shippingMethod ||
                                    "No shipping method set"}
                                </span>
                              )}
                            </td>
                            <td className="px-0 py-2 text-center text-gray-400"></td>
                            <td className="px-2 py-2 text-center text-gray-600">
                              {getShippingTaxRate(offer)}%
                            </td>
                            <td className="px-2 py-2">
                              {edit ? (
                                <DecimalInput
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-right bg-white"
                                  value={form.shippingQuantity ?? 1}
                                  onCommit={(raw) => {
                                    const val = parseFloat(
                                      raw.replace(",", "."),
                                    );
                                    if (!isNaN(val) && val > 0) {
                                      patch({ shippingQuantity: val });
                                    }
                                  }}
                                />
                              ) : (
                                <div className="text-right font-medium">
                                  {offer.shippingQuantity || 1}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {edit ? (
                                <DecimalInput
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-right bg-white"
                                  value={form.shippingCost ?? 0}
                                  onCommit={(raw) => {
                                    const val = parseFloat(
                                      raw.replace(",", "."),
                                    );
                                    if (!isNaN(val) && val >= 0) {
                                      patch({ shippingCost: val });
                                    }
                                  }}
                                />
                              ) : (
                                <div className="text-right font-medium">
                                  {formatCurrency(
                                    offer.shippingCost || 0,
                                    offer.currency,
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-2 text-right font-bold text-gray-800">
                              {formatCurrency(
                                (form.shippingCost || 0) *
                                (form.shippingQuantity || 1),
                                offer.currency,
                              )}
                            </td>
                            {edit && <td />}
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {edit && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setShowItemPicker((s) => !s)}
                          className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1 whitespace-nowrap"
                        >
                          <PlusIcon className="h-3.5 w-3.5" />
                          Add existing item
                        </button>

                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <input
                                className={inputCls}
                                value={newLine.itemName}
                                placeholder="Freizeile — text"
                                onChange={(e) =>
                                  setNewLine((n) => ({
                                    ...n,
                                    itemName: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <button
                              onClick={addLineItem}
                              className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 whitespace-nowrap"
                            >
                              <PlusIcon className="h-4 w-4" />
                              Add Freizeile
                            </button>
                          </div>
                        </div>
                      </div>

                      {showItemPicker && (
                        <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-2">
                          <div className="w-[70%] flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                EAN
                              </label>
                              <input
                                value={searchEan}
                                onChange={(e) =>
                                  handleFieldSearchChange("ean", e.target.value)
                                }
                                placeholder="EAN..."
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Item No.
                              </label>
                              <input
                                value={searchItemNo}
                                onChange={(e) =>
                                  handleFieldSearchChange(
                                    "itemNo",
                                    e.target.value,
                                  )
                                }
                                placeholder="Item no..."
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Item Name (EN/DE)
                              </label>
                              <input
                                value={searchName}
                                onChange={(e) =>
                                  handleFieldSearchChange(
                                    "name",
                                    e.target.value,
                                  )
                                }
                                placeholder="Item name..."
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-1.5">
                            {itemSearchLoading ? (
                              <div className="text-center text-sm text-gray-400 py-3">
                                Searching…
                              </div>
                            ) : !searchEan.trim() &&
                              !searchItemNo.trim() &&
                              !searchName.trim() ? (
                              <div className="text-center text-sm text-gray-400 py-3">
                                Type in EAN, Item No., or Item Name to search.
                              </div>
                            ) : pickerItems.length === 0 ? (
                              <div className="text-center text-sm text-gray-500 py-3">
                                No items match.
                              </div>
                            ) : (
                              pickerItems.map((it) => (
                                <ItemRow
                                  key={it.id}
                                  item={it}
                                  selected={false}
                                  onClick={() => addExistingItem(it)}
                                />
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {visibleLineItems.length === 0 && (
                    <div className="text-center py-6 text-sm text-gray-500">
                      No line items yet.
                    </div>
                  )}
                  {visibleLineItems.map((item: any) => {
                    const total = getLineItemTotal(item, pricingMode);
                    const thumb = item.photo;
                    return (
                      <div
                        key={item.id}
                        className="p-4 border border-gray-200 rounded-lg bg-white"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 shrink-0 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt="thumb"
                                  className="w-full h-full object-cover"
                                  onError={(e) =>
                                  ((
                                    e.target as HTMLImageElement
                                  ).style.display = "none")
                                  }
                                />
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900">
                                {item.position}. {item.itemName}
                              </div>
                              {item.description && (
                                <div className="text-sm text-gray-600 mt-0.5">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <div className="text-lg font-bold text-gray-900">
                              {formatCurrency(total || 0, offer.currency)}
                            </div>
                            {edit && (
                              <button
                                onClick={() => removeLineItem(item.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-lg transition-colors"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                                Remove item
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900">
                              Price matrix ({offer.unitPriceDecimalPlaces || 3}{" "}
                              dp)
                            </h4>
                            {edit && (
                              <button
                                onClick={() => addMatrixEntry(item.id)}
                                className="px-2.5 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1"
                              >
                                <PlusIcon className="h-3.5 w-3.5" />
                                Add tier
                              </button>
                            )}
                          </div>
                          {item.priceMatrix?.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium text-gray-700">
                                      Quantity
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-700">
                                      Price
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-700">
                                      Total
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-700">
                                      Active
                                    </th>
                                    {edit && <th className="px-3 py-2" />}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {item.priceMatrix.map(
                                    (p: any, idx: number) => (
                                      <tr
                                        key={p.id}
                                        className="hover:bg-gray-50"
                                      >
                                        <td className="px-3 py-2">
                                          {edit ? (
                                            <input
                                              className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                                              defaultValue={p.quantity}
                                              onBlur={(e) =>
                                                updateMatrixEntry(
                                                  item.id,
                                                  p.id,
                                                  {
                                                    quantity: e.target.value,
                                                  },
                                                )
                                              }
                                            />
                                          ) : (
                                            <span>{p.quantity} pcs</span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2">
                                          {edit ? (
                                            <div className="flex items-center gap-1">
                                              <span className="text-gray-500">
                                                {offer.currency}
                                              </span>
                                              <input
                                                type="text"
                                                inputMode="decimal"
                                                className="w-28 px-2 py-1 text-sm border border-gray-300 rounded"
                                                defaultValue={
                                                  p.price === null
                                                    ? "."
                                                    : String(p.price)
                                                }
                                                placeholder="."
                                                onBlur={(e) =>
                                                  updateMatrixEntry(
                                                    item.id,
                                                    p.id,
                                                    { price: e.target.value },
                                                  )
                                                }
                                              />
                                            </div>
                                          ) : (
                                            <span>
                                              {formatMatrixPrice(
                                                p.price,
                                                offer.unitPriceDecimalPlaces ||
                                                3,
                                              )}
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 font-medium">
                                          {p.total === null
                                            ? "."
                                            : formatCurrency(
                                              p.total,
                                              offer.currency,
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                          {p.isActive ? (
                                            <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                          ) : edit && p.price !== null ? (
                                            <input
                                              type="radio"
                                              name={`active-${item.id}`}
                                              checked={p.isActive}
                                              onChange={() =>
                                                setActive(item.id, idx)
                                              }
                                              className="h-4 w-4 text-gray-600"
                                            />
                                          ) : (
                                            <span className="text-gray-300">
                                              —
                                            </span>
                                          )}
                                        </td>
                                        {edit && (
                                          <td className="px-3 py-2 text-right">
                                            <button
                                              onClick={() =>
                                                deleteMatrixEntry(item.id, p.id)
                                              }
                                              className="text-rose-600 hover:text-rose-800 text-xs"
                                            >
                                              Delete
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    ),
                                  )}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-3 text-sm text-gray-500">
                              No tiers yet — add one, or paste a matrix above.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {edit && (
                    <div className="p-3 border border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          New item name
                        </label>
                        <input
                          className={inputCls}
                          value={newLine.itemName}
                          placeholder="e.g., Custom bracket"
                          onChange={(e) =>
                            setNewLine((n) => ({
                              ...n,
                              itemName: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="w-28">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Quantity
                        </label>
                        <input
                          className={inputCls}
                          value={newLine.baseQuantity}
                          onChange={(e) =>
                            setNewLine((n) => ({
                              ...n,
                              baseQuantity: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <button
                        onClick={addLineItem}
                        className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Add item
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field
                    label="Net weight (items)"
                    edit={false}
                    value={formatWeight(netWeightKg)}
                  />
                  <Field
                    label="Extra weight"
                    edit={edit}
                    value={formatWeight(extraWeightKg)}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      className={inputCls}
                      defaultValue={
                        visibleLineItems[0]?.extraWeight === null ||
                          visibleLineItems[0]?.extraWeight === undefined
                          ? ""
                          : String(visibleLineItems[0].extraWeight)
                      }
                      placeholder="0"
                      disabled={visibleLineItems.length === 0}
                      onBlur={(e) => {
                        if (!visibleLineItems[0]) return;
                        const raw = e.target.value.trim();
                        const kgValue =
                          raw === ""
                            ? 0
                            : (parseFlexibleNumber(raw.replace(",", ".")) ?? 0);
                        persistLine(visibleLineItems[0].id, {
                          extraWeight: String(kgValue),
                        });
                      }}
                    />
                  </Field>
                  <Field
                    label="Total weight"
                    edit={false}
                    value={formatWeight(totalWeightKg)}
                  />
                </div>
                <div className="max-w-sm ml-auto w-full space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">
                      {formatCurrency(
                        (offer.subtotal || 0) + shippingTotalForDisplay,
                        offer.currency,
                      )}
                    </span>
                  </div>

                  {offer.discountAmount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount</span>
                      <span>
                        −{formatCurrency(offer.discountAmount, offer.currency)}
                      </span>
                    </div>
                  )}

                  {vatGroups
                    .filter((g) => g.rate !== 0)
                    .map((g) => (
                      <div key={g.rate} className="flex justify-between">
                        <span className="text-gray-600">VAT ({g.rate}%)</span>
                        <span className="font-medium">
                          {formatCurrency(g.tax, offer.currency)}
                        </span>
                      </div>
                    ))}
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(displayTotal, offer.currency)}</span>
                  </div>
                </div>
              </div>

              {/* LINKED DOCUMENTS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
                {/* LINKED DOCUMENTS */}
                <div className="bg-white rounded-lg p-4 px-2">
                  <div className="flex items-center gap-2 mb-3">
                    <LinkIcon className="h-4 w-4 text-gray-500" />
                    <h3 className="text-sm font-bold text-gray-900">
                      Linked Documents
                    </h3>
                    {linkedDocuments.length > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {linkedDocuments.length}
                      </span>
                    )}
                  </div>
                  {linkedDocuments.length > 0 ? (
                    <div className="space-y-1.5 text-sm">
                      {linkedDocuments.map((doc: any, index: number) => (
                        <div
                          key={doc.id ?? index}
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!onSwitchToAuftrag) {
                              console.warn(
                                "OfferDetailModal: onSwitchToAuftrag callback is not provided; can't navigate to Auftrag",
                                doc,
                              );
                              return;
                            }
                            onClose();
                            onSwitchToAuftrag(doc.id);
                          }}
                          className="flex justify-between items-center text-gray-700 hover:bg-gray-50 -mx-1 px-1 py-1 rounded cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium text-[#8CC21B] group-hover:text-[#7ab318] group-hover:underline truncate">
                              {doc.order_no || doc.id}
                            </span>
                            <span className="text-xs text-gray-400 shrink-0">
                              →
                            </span>
                          </div>
                          {doc.created_at && (
                            <span className="text-gray-400 text-xs shrink-0 ml-2">
                              {formatDate(doc.created_at)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No linked documents yet.
                    </p>
                  )}
                </div>
                <div className="bg-white rounded-lg px-2 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <PencilIcon className="h-4 w-4 text-gray-500" />
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1">
                      Comment intern
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(
                            form.internalNotes || offer.internalNotes || "",
                          );
                          toast.success(
                            "Internal comment copied to clipboard!",
                          );
                        }}
                        className="text-gray-400 hover:text-gray-700 transition-colors p-0.5 rounded cursor-pointer font-normal"
                        title="Copy Internal Comment"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4" />
                      </button>
                    </h3>
                  </div>
                  {edit ? (
                    <>
                      <textarea
                        rows={3}
                        className={inputCls}
                        value={form.internalNotes}
                        placeholder="Only visible to the team."
                        onChange={(e) =>
                          patch({ internalNotes: e.target.value })
                        }
                      />
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">
                      {offer.internalNotes || "—"}
                    </p>
                  )}
                </div>

                {/* Comment field */}
                <div className="bg-white rounded-lg px-2 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <PencilIcon className="h-4 w-4 text-gray-500" />
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1">
                      Comment extern
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(
                            form.notes || offer.notes || "",
                          );
                          toast.success(
                            "External comment copied to clipboard!",
                          );
                        }}
                        className="text-gray-400 hover:text-gray-700 transition-colors p-0.5 rounded cursor-pointer font-normal"
                        title="Copy External Comment"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4" />
                      </button>
                    </h3>
                  </div>
                  {edit ? (
                    <>
                      <textarea
                        rows={3}
                        className={inputCls}
                        value={form.notes}
                        placeholder="Shown to the customer on the offer."
                        onChange={(e) => patch({ notes: e.target.value })}
                      />
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">
                      {offer.notes || "—"}
                    </p>
                  )}
                </div>

                {/* Comment intern */}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
              <div>
                {edit && userRole === UserRole.ADMIN && (
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 text-sm text-red-700 bg-white border border-red-300/80 rounded-lg hover:bg-red-50 flex items-center gap-1 font-semibold"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete offer
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={edit ? handleCancelEdit : onClose}
                  className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {edit ? "Cancel" : "Close"}
                </button>
                {edit && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 text-sm bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OfferDetailModal;

"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import {
  createRechnungFromAuftrag,
  downloadRechnungEml,
  getPrepaymentsForAuftrag,
} from "@/api/rechnungen";
import {
  updateCustomerOrder,
  deleteCustomerOrder,
} from "@/api/customer_orders";
import { errorStyles, successStyles } from "@/utils/constants";
import {
  Loader2,
  Warehouse,
  ClipboardCheck,
  Check,
  AlertTriangle,
  Building,
} from "lucide-react";
import { getAllPaymentMethods } from "@/api/payment_methods";
import { getAllShippingMethods } from "@/api/shipping_methods";

interface SelectedItemState {
  id: string;
  lineItemId: string;
  position: number;
  photo?: string;
  artNr?: string;
  itemName: string;
  hinweis?: string;
  mwst: number;
  max_qty: number;
  qty: number;
  price: number;
  selected: boolean;
  is_stock_item?: "Y" | "N" | string;
  stock_eu?: number | null;
  stock_cn?: number | null;
  weight?: number;
  extraWeight?: number;
}

interface PrepaymentInfo {
  available: number;
  prepayments: {
    id: string;
    invoice_number: string;
    total_amount: number;
    invoice_date?: string;
  }[];
}

interface AuftragToRechnungModalProps {
  isOpen: boolean;
  onClose: () => void;
  auftrag: any;
  onSuccess: () => void;
  onEditAuftrag?: (auftrag: any) => void;
}

const WAREHOUSE_OPTIONS = [
  { value: "CN", label: "CN — China Warehouse" },
  { value: "EU", label: "EU — Europe Warehouse" },
];

const PAYMENT_METHODS = [
  "Kauf auf Rechnung",
  "Vorkasse (Prepayment)",
  "Überweisung (Bank transfer)",
  "PayPal",
  "Credit Card",
  "Nachnahme (Cash on delivery)",
];

const SHIPPING_METHODS = [
  "Bahnfracht + GLS",
  "angeliefert durch GTech",
  "Standard shipping",
  "Express shipping",
  "FedEx direkt",
  "DHL Express",
  "Pickup",
];

const inputCls =
  "w-full px-2.5 py-1 text-xs border border-gray-300 bg-white rounded focus:ring-2 focus:ring-emerald-500 font-medium";

const Field: React.FC<{
  label: string;
  value: any;
  highlightOrange?: boolean;
  isEdit?: boolean;
  children?: React.ReactNode;
}> = ({ label, value, highlightOrange, isEdit, children }) => (
  <div>
    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
      {label}
    </p>
    <div className="text-sm text-gray-900 break-words">
      {isEdit && children ? (
        children
      ) : (
        <div
          className={`${
            highlightOrange
              ? "bg-amber-100/90 border border-amber-400 text-amber-900 font-bold p-1 rounded inline-block min-w-[120px]"
              : ""
          }`}
        >
          {value || "—"}
        </div>
      )}
    </div>
  </div>
);

const Section: React.FC<{
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <section className="border border-gray-200 rounded-lg p-4 bg-white">
    <header className="flex items-center gap-2 pb-2 border-b border-gray-100 font-medium text-sm text-gray-900">
      {icon}
      <span>{title}</span>
    </header>
    <div className="pt-3">{children}</div>
  </section>
);

const formatDeCurrency = (val: number) => {
  const num = isNaN(val) || !isFinite(val) ? 0 : val;
  return `${num.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
};

const formatWeight = (kg: number): string =>
  `${(isNaN(kg) || !isFinite(kg) ? 0 : kg).toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} kg`;

export default function AuftragToRechnungModal({
  isOpen,
  onClose,
  auftrag,
  onSuccess,
  onEditAuftrag,
}: AuftragToRechnungModalProps) {
  const [items, setItems] = useState<SelectedItemState[]>([]);
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [isDatePastOrEmpty, setIsDatePastOrEmpty] = useState(false);
  // Single source of truth for the selected warehouse — used both by the
  // header selector and by the per-line stock validation. Previously this
  // was split across two states ("warehouse" and "stockWhere"), which let
  // the selector and the validation drift out of sync.
  const [stockWhere, setStockWhere] = useState<"CN" | "EU">("CN");

  // --- Shipping line (this delivery only) ---------------------------------
  // Editable per-delivery override for shipping cost/quantity/inclusion —
  // seeded from the Auftrag's own shipping values but NOT written back to
  // the Auftrag on submit; only sent along with this specific Rechnung.
  const [shippingIncluded, setShippingIncluded] = useState(true);
  const [shippingCostInput, setShippingCostInput] = useState<number>(0);
  const [shippingQuantityInput, setShippingQuantityInput] = useState<number>(1);

  // Prepayment credit ("Rechnung ohne Ausliefern") outstanding on this
  // Auftrag — fetched fresh every time the modal opens for it. Purely
  // informational on the client: the server recomputes and applies the
  // deduction independently when the Rechnung is generated.
  const [prepaymentInfo, setPrepaymentInfo] = useState<PrepaymentInfo | null>(
    null,
  );
  const [loadingPrepayments, setLoadingPrepayments] = useState(false);

  // Inline Edit Mode state (matching OfferDetailModal)
  const [isEditingAuftrag, setIsEditingAuftrag] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editAnsprechpartner, setEditAnsprechpartner] = useState("");
  const [editShippingMethod, setEditShippingMethod] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editPaymentTerms, setEditPaymentTerms] = useState("");
  const [savingAuftrag, setSavingAuftrag] = useState(false);
  const [deletingAuftrag, setDeletingAuftrag] = useState(false);

  // Editable Customer Address fields
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editStreet, setEditStreet] = useState("");
  const [editPostalCode, setEditPostalCode] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editCountry, setEditCountry] = useState("DE");
  const [editVatId, setEditVatId] = useState("");
  const [dbPaymentMethods, setDbPaymentMethods] = useState<any[]>([]);
  const [dbShippingMethods, setDbShippingMethods] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setShowNoEmailWarning(false);
    setUserApprovedNoEmail(false);
    Promise.all([
      getAllPaymentMethods(true).catch(() => ({ data: [] })),
      getAllShippingMethods(true).catch(() => ({ data: [] })),
    ]).then(([pmRes, smRes]: any) => {
      if (pmRes?.data)
        setDbPaymentMethods(
          Array.isArray(pmRes.data)
            ? pmRes.data.filter((pm: any) => pm.is_active)
            : [],
        );
      if (smRes?.data)
        setDbShippingMethods(
          Array.isArray(smRes.data)
            ? smRes.data.filter((sm: any) => sm.is_active)
            : [],
        );
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !auftrag) return;

    const sourceItems = auftrag.orderItems || auftrag.items || [];

    const mapped: SelectedItemState[] = sourceItems.map(
      (it: any, index: number) => {
        // it.openQuantity is computed backend-side (quantity minus
        // everything already delivered via past Rechnungen — see
        // attachDeliveredQuantityToOrders). Fall back to computing it
        // locally from deliveredQuantity in case an older cached response
        // only has that field, and finally to quantity itself for a
        // response that predates both (nothing delivered yet).
        const orderedQty = Number(it.quantity || it.qty) || 1;
        const openQty =
          it.openQuantity !== undefined
            ? Number(it.openQuantity) || 0
            : Math.max(0, orderedQty - (Number(it.deliveredQuantity) || 0));
        const itemPrice = Number(it.price || 0);
        const isStock =
          it.is_stock_item ||
          it.item?.is_stock_item ||
          it.sourceItem?.is_stock_item ||
          "N";
        const stockEu = it.stock_eu ?? it.item?.stock_eu ?? null;
        const stockCn = it.stock_cn ?? it.item?.stock_cn ?? null;

        return {
          id: String(it.id),
          lineItemId: String(it.id),
          position: index + 1,
          photo: it.photo || it.item?.photo || it.image,
          artNr:
            it.articleNumber ||
            it.item?.articleNumber ||
            it.ean ||
            it.item?.ean ||
            "—",
          itemName:
            it.itemName || it.item_name || it.item?.item_name || "Line Item",
          hinweis: it.notes || it.remark_de || it.description || "—",
          mwst: Number(it.taxRate || auftrag.tax_rate || 19),
          // "QTY Open" column and the ceiling for "Qty Delivered" — this is
          // what's still open to invoice right now, NOT the original
          // ordered amount. quantity itself is never mutated once set.
          max_qty: openQty,
          qty: openQty,
          price: itemPrice,
          selected: true,
          is_stock_item: isStock,
          stock_eu: stockEu,
          stock_cn: stockCn,
          // weight is stored in grams on the source (Item/CustomerOrderItem),
          // extraWeight is stored directly in kg — kept as-is here, converted
          // at the point of calculation below.
          weight: Number(it.weight) || 0,
          extraWeight: Number(it.extraWeight) || 0,
        };
      },
    );
    setItems(mapped);
    setNotes(auftrag.notes || auftrag.comment || "");
    setInternalNotes(auftrag.internalNotes || auftrag.internal_notes || "");
    setEditTitle(auftrag.title || auftrag.comment || "");
    setEditAnsprechpartner(auftrag.ansprechpartner || "");
    // Populate Customer Address & Defaults State
    const cust = auftrag.customerSnapshot || auftrag.customer || {};
    setEditCompanyName(
      cust.companyName || cust.name || auftrag.customer_name || "",
    );
    setEditStreet(
      cust.address ||
        cust.street ||
        cust.addressLine1 ||
        cust.bill_to_address ||
        "",
    );
    setEditPostalCode(cust.postalCode || cust.postal_code || "37079");
    setEditCity(cust.city || "Göttingen");
    setEditCountry(cust.country || "DE");
    setEditVatId(
      cust.vatId || cust.vatTaxId || cust.taxNumber || cust.tax_number || "",
    );

    const sMethod =
      auftrag.shippingMethod ||
      auftrag.shipping_method ||
      cust.defaultShippingMethod ||
      cust.shippingMethod ||
      cust.shipping_method ||
      "angeliefert durch GTech";

    const pMethod =
      auftrag.paymentMethod ||
      auftrag.payment_method ||
      cust.defaultPaymentMethod ||
      cust.paymentMethod ||
      cust.payment_method ||
      "Kauf auf Rechnung";

    const pTerms =
      auftrag.paymentTerms ||
      auftrag.payment_terms ||
      (cust.defaultPaymentDueDays
        ? `${cust.defaultPaymentDueDays} days net`
        : undefined) ||
      cust.defaultPaymentTerms ||
      cust.paymentTerms ||
      "30 days net";

    setEditShippingMethod(sMethod);
    setEditPaymentMethod(pMethod);
    setEditPaymentTerms(pTerms);

    // Seed the per-delivery shipping override from the Auftrag's own
    // shipping cost/quantity — included by default whenever a shipping
    // method exists on the Auftrag.
    setShippingCostInput(Number(auftrag.shipping_cost) || 0);
    setShippingQuantityInput(Number(auftrag.shipping_quantity) || 1);
    setShippingIncluded(
      !!(auftrag.shipping_text || auftrag.shipping_method || sMethod),
    );

    // Delivery date evaluation logic
    const todayStr = new Date().toISOString().split("T")[0];
    const rawDelivery =
      auftrag.deliveryTime || auftrag.delivery_date || auftrag.deliveryDate;

    if (!rawDelivery) {
      setDeliveryDate(todayStr);
      setIsDatePastOrEmpty(true);
    } else {
      const parsedDate = new Date(rawDelivery);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);

      if (isNaN(parsedDate.getTime()) || parsedDate < todayDate) {
        setDeliveryDate(todayStr);
        setIsDatePastOrEmpty(true);
      } else {
        setDeliveryDate(parsedDate.toISOString().split("T")[0]);
        setIsDatePastOrEmpty(false);
      }
    }

    // Set warehouse from existing order if available, else default to CN
    setStockWhere((auftrag.stock_where as "CN" | "EU") || "CN");

    setIsEditingAuftrag(false);

    // Fetch any outstanding prepayment credit ("Rechnung ohne
    // Ausliefern") for this Auftrag, to preview the deduction in the
    // totals section below before generating the delivery Rechnung.
    setPrepaymentInfo(null);
    setLoadingPrepayments(true);
    getPrepaymentsForAuftrag(auftrag.id)
      .then((res: any) => {
        if (res?.success) {
          setPrepaymentInfo({
            available: Number(res.data.available) || 0,
            prepayments: res.data.prepayments || [],
          });
        }
      })
      .catch((err) => {
        console.error("Could not load prepayments for Auftrag:", err);
      })
      .finally(() => setLoadingPrepayments(false));
  }, [isOpen, auftrag]);

  if (!isOpen || !auftrag) return null;
  const hasStockItems = items.some((it) => it.is_stock_item === "Y");
  const hasShippingMethod = !!(
    editShippingMethod ||
    auftrag.shipping_text ||
    auftrag.shipping_method
  );

  /** The actual on-hand quantity for a stock item at the currently
   * selected warehouse — null for non-stock lines. */
  const getAvailableStock = (item: SelectedItemState): number | null => {
    if (item.is_stock_item !== "Y") return null;
    const val = stockWhere === "CN" ? item.stock_cn : item.stock_eu;
    return val ?? 0;
  };

  /** True if this line, as currently selected/quantified, would block
   * "Generate Rechnung & Lieferschein" — only stock lines can be invalid,
   * and only while selected with a qty exceeding what's on hand. */
  const isStockInvalid = (item: SelectedItemState): boolean => {
    if (item.is_stock_item !== "Y" || !item.selected) return false;
    const available = getAvailableStock(item);
    return available !== null && item.qty > available;
  };

  const toggleSelect = (lineItemId: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.lineItemId === lineItemId ? { ...it, selected: !it.selected } : it,
      ),
    );
  };

  const updateQty = (lineItemId: string, val: string) => {
    const parsed = parseFloat(val);
    setItems((prev) =>
      prev.map((it) => {
        if (it.lineItemId !== lineItemId) return it;
        const newQty = isNaN(parsed)
          ? 0
          : Math.min(Math.max(0, parsed), it.max_qty);
        return { ...it, qty: newQty };
      }),
    );
  };

  const updateItemField = (
    lineItemId: string,
    field: keyof SelectedItemState,
    val: any,
  ) => {
    setItems((prev) =>
      prev.map((it) =>
        it.lineItemId === lineItemId ? { ...it, [field]: val } : it,
      ),
    );
  };

  const removeItem = (lineItemId: string) => {
    setItems((prev) => prev.filter((it) => it.lineItemId !== lineItemId));
  };

  const selectedItems = items.filter((it) => it.selected && it.qty > 0);
  const itemsSubtotal = selectedItems.reduce(
    (acc, it) => acc + it.qty * it.price,
    0,
  );
  const shippingLineTotal = shippingIncluded
    ? (shippingCostInput || 0) * (shippingQuantityInput || 0)
    : 0;
  const subtotal = itemsSubtotal + shippingLineTotal;
  const taxRate = Number(auftrag.tax_rate ?? 19);
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;

  // Tax profile display — the Auftrag's taxProfile is resolved
  // server-side: live from the customer while status is OPEN, frozen
  // (matched only by rate, never re-derived) once Partially
  // Delivered/Delivered/Closed. This is purely a display label; taxRate
  // above always drives the actual calculation.
  const taxProfileLabel = auftrag.taxProfile?.name
    ? `${auftrag.taxProfile.name} (${taxRate}%)`
    : `${taxRate}%`;

  // Prepayment credit applied to THIS delivery — capped at what's
  // actually available and at the invoice total itself (never negative,
  // never more than what's owed). Purely a client-side preview; the
  // server recomputes and applies this independently from auftrag.id
  // when the Rechnung is generated.
  const prepaymentAmount = Math.min(
    prepaymentInfo?.available || 0,
    totalAmount,
  );
  const restbetrag = Math.max(0, totalAmount - prepaymentAmount);

  const netWeightKg = selectedItems.reduce((sum, it) => {
    // it.weight is in grams — convert to kg here.
    return sum + ((it.weight || 0) / 1000) * it.qty;
  }, 0);
  const extraWeightKg = selectedItems.reduce(
    // extraWeight is already stored in kg — no conversion.
    (sum, it) => sum + (it.extraWeight || 0),
    0,
  );
  const totalWeightKg = netWeightKg + extraWeightKg;

  // Whether any currently-selected line would block generation because it
  // requests more stock than is available at the chosen warehouse.
  const hasInvalidSelection = selectedItems.some((it) => isStockInvalid(it));

  const cust = auftrag.customerSnapshot || auftrag.customer || {};
  const companyName =
    editCompanyName ||
    cust.companyName ||
    cust.name ||
    auftrag.customer_name ||
    "Potis GmbH & Co. KG";
  const legalName = cust.legalName || cust.name || "";
  const addressStr =
    editStreet ||
    cust.address ||
    cust.street ||
    cust.addressLine1 ||
    "August-Spindler-Straße 4";
  const postalCity =
    `${editPostalCode || cust.postalCode || "37079"} ${editCity || cust.city || "Göttingen"}`.trim();

  const deliveryName =
    auftrag.ship_to ||
    auftrag.shipTo ||
    cust.ship_to ||
    cust.ship_to_address ||
    cust.ship_to_full_address ||
    cust.deliveryAddressLine1 ||
    cust.shippingAddress ||
    (cust.deliveryStreet
      ? `${cust.deliveryCompanyName || companyName}, ${cust.deliveryStreet} ${cust.deliveryPostalCode || ""} ${cust.deliveryCity || ""}`.trim()
      : "Same as billing address");

  const handleSaveAuftragEdits = async () => {
    try {
      setSavingAuftrag(true);
      const payload = {
        title: editTitle,
        ansprechpartner: editAnsprechpartner,
        shippingMethod: editShippingMethod,
        paymentMethod: editPaymentMethod,
        paymentTerms: editPaymentTerms,
        deliveryDate,
        notes,
        internalNotes,
        stock_where: hasStockItems ? stockWhere : undefined,
        customerSnapshot: {
          ...cust,
          companyName: editCompanyName,
          street: editStreet,
          address: editStreet,
          postalCode: editPostalCode,
          city: editCity,
          country: editCountry,
          vatId: editVatId,
        },
      };
      await updateCustomerOrder(auftrag.id, payload);
      toast.success("Auftrag updated successfully!", successStyles);
      setIsEditingAuftrag(false);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to update Auftrag", errorStyles);
    } finally {
      setSavingAuftrag(false);
    }
  };

  const handleDeleteAuftrag = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete Auftrag ${auftrag.order_no}?`,
      )
    ) {
      return;
    }
    try {
      setDeletingAuftrag(true);
      await deleteCustomerOrder(auftrag.id);
      toast.success(
        `Auftrag ${auftrag.order_no} deleted successfully!`,
        successStyles,
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to delete Auftrag", errorStyles);
    } finally {
      setDeletingAuftrag(false);
    }
  };

  const [showNoEmailWarning, setShowNoEmailWarning] = useState(false);
  const [userApprovedNoEmail, setUserApprovedNoEmail] = useState(false);

  const checkHasContactEmail = () => {
    if (!auftrag) return true;
    const cust = auftrag.customer;
    const snap = auftrag.customerSnapshot;

    const directEmail = (cust?.email || snap?.email || "").trim();
    if (directEmail && directEmail.includes("@")) return true;

    const ansprechpartner = (
      editAnsprechpartner ||
      auftrag.ansprechpartner ||
      ""
    ).trim();
    if (ansprechpartner && ansprechpartner.includes("@")) return true;

    const contacts =
      cust?.contactPersons ||
      cust?.starBusinessDetails?.contactPersons ||
      snap?.contactPersons;
    if (Array.isArray(contacts)) {
      const found = contacts.find(
        (c: any) => c?.email && String(c.email).trim().includes("@"),
      );
      if (found) return true;
    }

    return false;
  };

  const proceedWithSubmit = async () => {
    try {
      setSubmitting(true);
      const payloadItems = selectedItems.map((it) => ({
        lineItemId: it.lineItemId,
        qty: it.qty,
        price: it.price,
        itemName: it.itemName,
      }));

      const res = await createRechnungFromAuftrag(
        auftrag.id,
        payloadItems,
        notes,
        {
          deliveryDate,
          warehouse: hasStockItems ? stockWhere : undefined,
          include_shipping: shippingIncluded,
          shippingCost: shippingCostInput,
          shippingQuantity: shippingQuantityInput,
          shippingMethod: editShippingMethod || undefined,
          ansprechpartner: editAnsprechpartner || auftrag.ansprechpartner,
        } as any,
      );

      if (res?.success) {
        toast.success(
          res.message ||
            `Rechnung & Lieferschein created from ${auftrag.order_no}!`,
          successStyles,
        );
        const newRechnungId = res?.data?.id;
        if (newRechnungId) {
          try {
            await downloadRechnungEml(newRechnungId, res?.data?.invoice_number);
          } catch (emlErr) {
            console.warn("Could not auto-download EML:", emlErr);
          }
        }
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.message || "Failed to generate Rechnung & Lieferschein",
        errorStyles,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error(
        "Please select at least 1 item with quantity > 0",
        errorStyles,
      );
      return;
    }
    if (hasInvalidSelection) {
      toast.error(
        "One or more stock items exceed available stock.",
        errorStyles,
      );
      return;
    }

    const hasEmail = checkHasContactEmail();
    if (!hasEmail && !userApprovedNoEmail) {
      setShowNoEmailWarning(true);
      return;
    }

    await proceedWithSubmit();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-[1260px] w-full max-h-[92vh] flex flex-col overflow-hidden text-gray-900 font-sans">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0 select-none">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-gray-900 truncate">
                Ausliefern {auftrag.order_no}
              </span>
              {auftrag.offerNumber && (
                <span className="text-sm font-bold text-gray-600">
                  Angebot {auftrag.offerNumber}
                </span>
              )}
              {prepaymentAmount > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full border font-semibold bg-amber-50 text-amber-700 border-amber-200">
                  Anzahlung vorhanden
                </span>
              )}
            </div>
            <h2 className="text-sm font-medium text-gray-500 truncate mt-0.5">
              {editTitle ||
                auftrag.title ||
                auftrag.comment ||
                "Direction switch including motor supply cable"}
            </h2>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {hasStockItems && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg">
                <Warehouse className="w-4 h-4 text-amber-600" />
                <select
                  value={stockWhere}
                  onChange={(e) => setStockWhere(e.target.value as "CN" | "EU")}
                  className="text-xs font-bold bg-transparent border-none focus:ring-0 text-gray-800 cursor-pointer"
                >
                  {WAREHOUSE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Main Body Content ── */}
        <div className="flex-1 bg-white overflow-y-auto p-6 space-y-5">
          {/* ── 4 Column Top Grid (Matching Angebot Layout) ── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
            {/* Column 1: Customer & Delivery Address */}
            <div className="md:col-span-1 flex flex-col gap-2">
              {isEditingAuftrag ? (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={editCompanyName}
                    onChange={(e) => setEditCompanyName(e.target.value)}
                    placeholder="Company Name"
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={editStreet}
                    onChange={(e) => setEditStreet(e.target.value)}
                    placeholder="Street Address"
                    className={inputCls}
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={editPostalCode}
                      onChange={(e) => setEditPostalCode(e.target.value)}
                      placeholder="Postal Code"
                      className={inputCls}
                    />
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      placeholder="City"
                      className={inputCls}
                    />
                  </div>
                  <input
                    type="text"
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    placeholder="Country (DE)"
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={editVatId}
                    onChange={(e) => setEditVatId(e.target.value)}
                    placeholder="VAT ID (DE...)"
                    className={inputCls}
                  />
                </div>
              ) : (
                <div className="text-sm text-gray-800 space-y-0.5">
                  <div className="font-semibold">{companyName}</div>
                  {legalName && legalName !== companyName && (
                    <div>{legalName}</div>
                  )}
                  <div>{addressStr}</div>
                  <div>{postalCity}</div>
                  {editCountry && <div>{editCountry}</div>}
                  {editVatId && (
                    <div className="text-xs text-gray-500">{editVatId}</div>
                  )}
                </div>
              )}

              <div className="text-sm space-y-0.5 pt-1">
                <div className="font-bold text-gray-900 mb-0.5">Delivery:</div>
                {isEditingAuftrag ? (
                  <select className={inputCls}>
                    <option value="same">Same as billing address</option>
                  </select>
                ) : (
                  <div className="text-gray-700">{deliveryName}</div>
                )}
              </div>
            </div>

            {/* Column 2, 3, 4: Fields Grid */}
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="TITLE" value={editTitle} isEdit={isEditingAuftrag}>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field
                label="ANSPRECHPARTNER"
                value={editAnsprechpartner}
                isEdit={isEditingAuftrag}
              >
                <input
                  type="text"
                  value={editAnsprechpartner}
                  onChange={(e) => setEditAnsprechpartner(e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label="TAX PROFILE" value={taxProfileLabel} />

              {/* Delivery Date */}
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                  DELIVERY DATE
                </p>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => {
                    setDeliveryDate(e.target.value);
                    setIsDatePastOrEmpty(false);
                  }}
                  className={`w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-emerald-500 font-bold transition-all ${
                    isDatePastOrEmpty || !deliveryDate
                      ? "bg-amber-100/90 border-orange-400 text-amber-900 shadow-sm"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              <Field
                label="PAYMENT METHOD"
                value={editPaymentMethod}
                isEdit={isEditingAuftrag}
              >
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select…</option>
                  {editPaymentMethod &&
                    !(
                      dbPaymentMethods.length > 0
                        ? dbPaymentMethods.map((pm: any) => pm.name)
                        : PAYMENT_METHODS
                    ).includes(editPaymentMethod) && (
                      <option value={editPaymentMethod}>
                        {editPaymentMethod}
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
              </Field>

              {(() => {
                const selectedPmObj = dbPaymentMethods.find(
                  (pm: any) => pm.name === editPaymentMethod,
                );
                const isDueDaysEditable = selectedPmObj
                  ? !selectedPmObj.is_prepayment
                  : editPaymentMethod
                    ? !/vorkasse|prepayment|paypal|cash|credit/i.test(
                        editPaymentMethod,
                      )
                    : false;

                return (
                  <Field
                    label="DUE DAYS"
                    value={editPaymentTerms}
                    isEdit={isEditingAuftrag && isDueDaysEditable}
                  >
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editPaymentTerms}
                      disabled={!isDueDaysEditable}
                      onChange={(e) =>
                        setEditPaymentTerms(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="e.g. 30"
                      className={inputCls}
                    />
                  </Field>
                );
              })()}

              <Field
                label="SHIPPING METHOD"
                value={editShippingMethod}
                isEdit={isEditingAuftrag}
              >
                <select
                  value={editShippingMethod}
                  onChange={(e) => setEditShippingMethod(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select…</option>
                  {editShippingMethod &&
                    !(
                      dbShippingMethods.length > 0
                        ? dbShippingMethods.map((sm: any) => sm.name)
                        : SHIPPING_METHODS
                    ).includes(editShippingMethod) && (
                      <option value={editShippingMethod}>
                        {editShippingMethod}
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
              </Field>
            </div>
          </div>

          {/* ── Line Items Table (Classic Format) ── */}
          <div className="space-y-3">
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b border-gray-200 text-gray-600 text-xs">
                  <tr>
                    <th className="px-2 py-2 text-center font-semibold w-10">
                      ✓
                    </th>
                    <th className="px-2 py-2 text-left font-semibold w-10">
                      Pos
                    </th>
                    <th className="px-2 py-2 text-left font-semibold w-12">
                      Pic
                    </th>
                    <th className="px-2 py-2 text-left font-semibold w-28">
                      Art.-Nr.
                    </th>
                    <th className="px-2 py-2 text-left font-semibold">
                      Bezeichnung
                    </th>
                    <th className="px-2 py-2 text-left font-semibold w-36">
                      RemarkEx
                    </th>
                    <th className="px-2 py-2 text-center font-semibold w-16">
                      MwSt.
                    </th>
                    <th className="px-2 py-2 text-right font-semibold w-24">
                      QTY Open
                    </th>
                    <th className="px-2 py-2 text-right font-semibold w-20">
                      Stock
                    </th>
                    <th className="px-2 py-2 text-right font-semibold w-28">
                      Qty
                    </th>
                    <th className="px-2 py-2 text-right font-semibold w-28">
                      Netto-Preis
                    </th>
                    <th className="px-2 py-2 text-right font-semibold w-28">
                      Netto gesamt
                    </th>
                    {isEditingAuftrag && (
                      <th className="px-2 py-2 text-center font-semibold w-10" />
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={isEditingAuftrag ? 13 : 12}
                        className="text-center py-6 text-sm text-gray-500"
                      >
                        No line items found.
                      </td>
                    </tr>
                  )}
                  {items.map((item) => {
                    const lineTotal = item.qty * item.price;
                    const isStock = item.is_stock_item === "Y";
                    const availableStock = getAvailableStock(item);
                    const invalid = isStockInvalid(item);

                    const rowBgClass = invalid
                      ? "bg-rose-200/70 text-rose-900 font-medium"
                      : "bg-[#dff0d8] text-gray-900 font-medium";

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${rowBgClass}`}
                      >
                        {/* Selection Checkbox */}
                        <td className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleSelect(item.lineItemId)}
                            className="w-4 h-4 rounded border-gray-400 text-orange-500 focus:ring-orange-400 cursor-pointer accent-orange-500"
                          />
                        </td>

                        {/* Pos */}
                        <td className="px-2 py-2">{item.position}</td>

                        {/* Pic */}
                        <td className="px-2 py-2">
                          <div className="w-8 h-8 rounded bg-white flex items-center justify-center border border-gray-200 overflow-hidden">
                            {item.photo ? (
                              <img
                                src={item.photo}
                                alt="thumb"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-gray-400 text-[10px]">
                                —
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Art.-Nr. */}
                        <td className="px-2 py-2">
                          {isEditingAuftrag ? (
                            <input
                              type="text"
                              value={item.artNr}
                              onChange={(e) =>
                                updateItemField(
                                  item.lineItemId,
                                  "artNr",
                                  e.target.value,
                                )
                              }
                              className="w-full px-1.5 py-0.5 text-xs border rounded text-gray-900 bg-white"
                            />
                          ) : (
                            item.artNr || "—"
                          )}
                        </td>

                        {/* Bezeichnung */}
                        <td className="px-2 py-2 font-bold">
                          {isEditingAuftrag ? (
                            <input
                              type="text"
                              value={item.itemName}
                              onChange={(e) =>
                                updateItemField(
                                  item.lineItemId,
                                  "itemName",
                                  e.target.value,
                                )
                              }
                              className="w-full px-1.5 py-0.5 text-xs border rounded text-gray-900 bg-white font-bold"
                            />
                          ) : (
                            item.itemName
                          )}
                        </td>

                        {/* Hinweis */}
                        <td className="px-2 py-2">
                          {isEditingAuftrag ? (
                            <input
                              type="text"
                              value={item.hinweis}
                              onChange={(e) =>
                                updateItemField(
                                  item.lineItemId,
                                  "hinweis",
                                  e.target.value,
                                )
                              }
                              className="w-full px-1.5 py-0.5 text-xs border rounded text-gray-900 bg-white"
                              placeholder="Remark..."
                            />
                          ) : (
                            item.hinweis || "—"
                          )}
                        </td>

                        {/* MwSt. */}
                        <td className="px-2 py-2 text-center">{item.mwst}%</td>

                        {/* QTY Open */}
                        <td className="px-2 py-2 text-right font-bold">
                          {isEditingAuftrag ? (
                            <input
                              type="number"
                              value={item.max_qty}
                              onChange={(e) =>
                                updateItemField(
                                  item.lineItemId,
                                  "max_qty",
                                  Number(e.target.value) || 0,
                                )
                              }
                              className="w-16 px-1 py-0.5 text-xs text-right border rounded text-gray-900 bg-white font-bold"
                            />
                          ) : (
                            item.max_qty
                          )}
                        </td>

                        {/* Stock */}
                        <td className="px-2 py-2 text-right">
                          {isStock ? (
                            <span
                              className={
                                invalid
                                  ? "font-bold text-rose-700"
                                  : "font-medium text-gray-700"
                              }
                            >
                              {availableStock}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Qty Delivered */}
                        <td className="px-2 py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            max={item.max_qty}
                            step="any"
                            disabled={!item.selected}
                            value={item.qty}
                            onChange={(e) =>
                              updateQty(item.lineItemId, e.target.value)
                            }
                            className={`w-20 px-1.5 py-1 text-right border font-bold rounded focus:ring-2 shadow-sm ${
                              invalid
                                ? "border-rose-400 bg-rose-100 text-rose-900 focus:ring-rose-500"
                                : "border-orange-400 bg-amber-100 text-gray-900 focus:ring-orange-500"
                            }`}
                          />
                        </td>

                        {/* Netto-Preis */}
                        <td className="px-2 py-2 text-right">
                          {isEditingAuftrag ? (
                            <input
                              type="number"
                              step="any"
                              value={item.price}
                              onChange={(e) =>
                                updateItemField(
                                  item.lineItemId,
                                  "price",
                                  Number(e.target.value) || 0,
                                )
                              }
                              className="w-20 px-1 py-0.5 text-xs text-right border rounded text-gray-900 bg-white font-bold"
                            />
                          ) : (
                            formatDeCurrency(item.price)
                          )}
                        </td>

                        {/* Netto gesamt */}
                        <td className="px-2 py-2 text-right font-bold">
                          {formatDeCurrency(lineTotal)}
                        </td>

                        {isEditingAuftrag && (
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(item.lineItemId)}
                              className="text-red-500 hover:text-red-700 transition p-1"
                              title="Remove item"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {/* Shipping row — editable per this delivery only. Cost and
                      quantity here override the Auftrag's own values just
                      for this Rechnung; they are never saved back onto the
                      Auftrag. Shown whenever the Auftrag has a shipping
                      method, mirroring Auftrag/Rechnung detail modals. */}
                  {hasShippingMethod && (
                    <tr className="bg-gray-50/80 border-t-2 border-gray-200">
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={shippingIncluded}
                          onChange={(e) =>
                            setShippingIncluded(e.target.checked)
                          }
                          className="w-4 h-4 rounded border-gray-400 text-orange-500 focus:ring-orange-400 cursor-pointer accent-orange-500"
                        />
                      </td>
                      <td className="px-2 py-2 text-gray-400">
                        {items.length + 1}
                      </td>
                      <td className="px-2 py-2 text-gray-400"></td>
                      <td className="px-2 py-2 text-gray-400">—</td>
                      <td className="px-2 py-2 font-bold text-gray-700">
                        {editShippingMethod ||
                          auftrag.shipping_text ||
                          auftrag.shipping_method ||
                          "Shipping"}
                      </td>
                      <td className="px-2 py-2 text-gray-400"></td>
                      <td className="px-2 py-2 text-center text-gray-600">
                        {taxRate}%
                      </td>
                      <td className="px-2 py-2 text-gray-400"></td>
                      <td className="px-2 py-2 text-gray-400"></td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          disabled={!shippingIncluded}
                          value={shippingQuantityInput}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setShippingQuantityInput(isNaN(val) ? 0 : val);
                          }}
                          className="w-20 px-1.5 py-1 text-right border font-bold rounded focus:ring-2 border-orange-400 bg-amber-100 text-gray-900 focus:ring-orange-500 disabled:opacity-50 disabled:bg-gray-100"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="any"
                          disabled={!shippingIncluded}
                          value={shippingCostInput}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setShippingCostInput(isNaN(val) ? 0 : val);
                          }}
                          className="w-24 px-1.5 py-1 text-right border font-bold rounded focus:ring-2 border-orange-400 bg-amber-100 text-gray-900 focus:ring-orange-500 disabled:opacity-50 disabled:bg-gray-100"
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-bold">
                        {formatDeCurrency(shippingLineTotal)}
                      </td>
                      {isEditingAuftrag && <td />}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Weights & Totals Section ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field
                label="NET WEIGHT (ITEMS)"
                value={formatWeight(netWeightKg)}
              />
              <Field label="EXTRA WEIGHT" value={formatWeight(extraWeightKg)} />
              <Field label="TOTAL WEIGHT" value={formatWeight(totalWeightKg)} />
            </div>

            <div className="max-w-sm ml-auto w-full space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Items subtotal</span>
                <span className="font-medium text-gray-900">
                  {formatDeCurrency(itemsSubtotal)}
                </span>
              </div>
              {hasShippingMethod && shippingIncluded && (
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className="font-medium text-gray-900">
                    {formatDeCurrency(shippingLineTotal)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>VAT ({taxRate}%)</span>
                <span className="font-medium text-gray-900">
                  {formatDeCurrency(taxAmount)}
                </span>
              </div>

              {loadingPrepayments && (
                <div className="flex justify-between text-gray-400 text-xs italic">
                  <span>Anzahlung wird geprüft…</span>
                </div>
              )}

              {!loadingPrepayments && prepaymentAmount > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>
                    Rechnung
                    {prepaymentInfo!.prepayments.length === 1
                      ? ` ${prepaymentInfo!.prepayments[0].invoice_number}`
                      : prepaymentInfo!.prepayments.length > 1
                        ? ` (${prepaymentInfo!.prepayments.length}x)`
                        : ""}
                  </span>
                  <span className="font-medium">
                    - {formatDeCurrency(prepaymentAmount)}
                  </span>
                </div>
              )}

              <div className="border-t border-gray-900 pt-2 flex justify-between font-bold text-lg text-gray-900">
                <span>{prepaymentAmount > 0 ? "Restbetrag" : "Total"}</span>
                <span>{formatDeCurrency(restbetrag)}</span>
              </div>
            </div>
          </div>

          {/* ── Comment Fields ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Section
              title="Comment intern"
              icon={<PencilIcon className="h-4 w-4 text-gray-500" />}
            >
              <textarea
                rows={2}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Internal team notes..."
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-400"
              />
            </Section>
            <Section
              title="Comment extern"
              icon={<PencilIcon className="h-4 w-4 text-gray-500" />}
            >
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes shown on invoice..."
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-400"
              />
            </Section>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0 bg-gray-50">
          {/* Edit Auftrag Button (Bottom Left) */}
          <div>
            <button
              type="button"
              onClick={() => {
                onEditAuftrag?.(auftrag);
                onClose();
              }}
              className="px-4 py-2 text-sm font-semibold rounded-lg border transition flex items-center gap-1.5 shadow-sm bg-white border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              <PencilIcon className="h-4 w-4 text-gray-500" />
              Edit Auftrag
            </button>
          </div>
          {/* Action Buttons: Cancel / Save changes / Generate */}
          <div className="flex gap-2.5 items-center">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || savingAuftrag}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>

            {isEditingAuftrag ? (
              <button
                type="button"
                onClick={handleSaveAuftragEdits}
                disabled={savingAuftrag}
                className="px-5 py-2 text-sm font-bold bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-all"
              >
                {savingAuftrag ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save changes
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  selectedItems.length === 0 ||
                  submitting ||
                  !deliveryDate ||
                  hasInvalidSelection
                }
                className="px-5 py-2 text-sm font-bold bg-[#2F6B46] text-white rounded-lg hover:bg-[#255638] disabled:opacity-50 transition flex items-center gap-2 shadow-md"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="w-4 h-4" />
                    Generate Rechnung &amp; Lieferschein
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {showNoEmailWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 select-none">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-gray-900 font-sans">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
              <h3 className="text-base font-bold text-gray-900">
                No Contact Person Email Address
              </h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-6">
              No contact person email address. Do you want to continue
              Ausliefern?
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  const customerId =
                    auftrag.customer_id ||
                    auftrag.customer?.id ||
                    auftrag.customerSnapshot?.id ||
                    auftrag.customerSnapshot?.customer_id;
                  const targetUrl = customerId
                    ? `/bussinesses?id=${customerId}`
                    : `/bussinesses`;
                  window.open(targetUrl, "_blank");
                }}
                className="px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Building className="w-4 h-4 text-amber-600" />
                Business Details
              </button>
              <button
                type="button"
                onClick={() => setShowNoEmailWarning(false)}
                className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNoEmailWarning(false);
                  setUserApprovedNoEmail(true);
                  proceedWithSubmit();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 shadow-sm"
              >
                Ja, trotzdem ausliefern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

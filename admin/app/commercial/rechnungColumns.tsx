"use client";

import React, { useState, useEffect, useRef } from "react";
import { Loader2, FileDown, ChevronRight, FileText, Mail, Upload } from "lucide-react";
import { downloadRechnungPdf, downloadRechnungEml, uploadGelangenheitsbestaetigung } from "@/api/rechnungen";
import { toast } from "react-hot-toast";
import { ColumnDef } from "@/components/UI/DataTable";
import {
  buildExpandColumn,
  datumColumn,
  kundeColumn,
  titelColumn,
  lieferortColumn,
  lieferdatumColumn,
  buildNettowertColumn,
  hasContactPersonEmail,
} from "./sharedColumns";

interface RechnungColumnsArgs {
  expandedDocIds: Set<string | number>;
  setExpandedDocIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  onViewRechnung: (row: any) => void;
  onCreateRechnungK: (row: any) => void;
  creatingRkForId: string | null;
  allOpenQuantities?: Record<string, Record<string, number>>;
  rechnungenK?: any[];
  onRefreshRechnungen?: () => void;
}

export const getRechnungGrossTotal = (row: any): number => {
  if (!row) return 0;

  const gross = Number(row.grossTotal ?? row.gross_total ?? 0);
  if (gross > 0) return gross;

  const subtotal = Number(row.subtotal ?? row.netTotal ?? row.sub_total ?? 0);
  const taxAmount = Number(row.taxAmount ?? row.tax_amount ?? 0);
  if (subtotal > 0 || taxAmount > 0) {
    return subtotal + taxAmount;
  }

  const totalAmt = Number(row.totalAmount ?? row.total_amount ?? 0);
  if (totalAmt > 0) return totalAmt;

  const items = row.items || row.orderItems || [];
  if (items.length > 0) {
    const defaultTaxRate = Number(row.tax_rate ?? row.taxRate ?? 19);
    const shipping = Number(row.shipping_cost ?? row.shippingCost ?? 0);
    const itemsNet = items.reduce((sum: number, it: any) => {
      const qty = Number(it.quantity ?? it.qty ?? 1);
      const price = Number(it.price ?? it.unitPrice ?? 0);
      return sum + qty * price;
    }, 0);
    const netSum = itemsNet + shipping;
    return netSum * (1 + defaultTaxRate / 100);
  }

  return 0;
};

const valueNetCalc = (row: any) => getRechnungGrossTotal(row);
const itemCountCalc = (row: any) =>
  row.customItemCount ?? row.items?.length ?? 0;

/**
 * Row-background color per Rechnung payment status, mirroring
 * getStatusBackgroundColor in auftragColumns.tsx so both tables follow
 * the same "status drives row color" convention.
 */
export const getRechnungStatusBackgroundColor = (status: string): string => {
  if (status === "paid") {
    return "#DFF0D8";
  }
  if (status === "partially_paid") {
    return "#FFF3CD";
  }
  if (status === "overdue") {
    return "#F8D7DA";
  }
  // "unpaid" and anything unrecognized — no background.
  return "#FFFFFF";
};

export const RECHNUNG_PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  partially_paid: "Partially Paid",
  unpaid: "Unpaid",
  overdue: "Overdue",
};

const formatDeCurrency = (val: number): string => {
  const num = isNaN(val) || !isFinite(val) ? 0 : val;
  return `${num.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
};

export const RECHNUNG_PAYMENT_STATUS_FILTER_OPTIONS = [
  "overdue",
  "partially_paid",
  "unpaid",
  "paid",
].map((value) => ({ value, label: RECHNUNG_PAYMENT_STATUS_LABELS[value] }));

export function checkIsExportInvoice(row: any): boolean {
  if (!row) return false;
  const rawTaxCase = String(
    row.tax_profile_case ||
    row.taxProfile?.case ||
    row.taxProfile?.key ||
    row.taxProfile ||
    row.customerSnapshot?.tax_profile_case ||
    row.customer?.defaultTaxProfile?.case ||
    "",
  ).toUpperCase();

  const country = String(
    row.customerSnapshot?.country ||
    row.customer?.country ||
    row.customer_country ||
    row.lieferort ||
    ""
  ).trim().toUpperCase();

  const countryCode = country.split(/[-,\s]/)[0].trim();

  return (
    rawTaxCase.includes("EU_IGL") ||
    rawTaxCase.includes("THIRD_COUNTRY") ||
    (countryCode !== "" && !["DE", "DEUTSCHLAND", "DEU"].includes(countryCode))
  );
}

const PaymentStatusBadge: React.FC<{ row: any; rechnungenK?: any[] }> = ({
  row,
  rechnungenK,
}) => {
  const status = row.payment_status || "unpaid";
  const label = RECHNUNG_PAYMENT_STATUS_LABELS[status] || status;
  const classes: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-800 border-emerald-300",
    partially_paid: "bg-amber-100 text-amber-800 border-amber-300",
    unpaid: "bg-gray-100 text-gray-600 border-gray-300",
    overdue: "bg-rose-100 text-rose-800 border-rose-300",
  };

  const hasRk =
    Boolean(row.hasRk || row.has_rk) ||
    (Array.isArray(row.rks) && row.rks.length > 0) ||
    (Array.isArray(rechnungenK) &&
      rechnungenK.length > 0 &&
      rechnungenK.some(
        (rk: any) =>
          String(
            rk.rechnungId || rk.rechnung_id || rk.invoiceId || rk.invoice_id,
          ) === String(row.id),
      ));

  const isExportInvoice = checkIsExportInvoice(row);

  const hasGlDoc = Boolean(
    row.gelangenheitsbestaetigung_doc &&
    row.gelangenheitsbestaetigung_doc !== "null" &&
    row.gelangenheitsbestaetigung_doc !== ""
  );

  const isGlMissing = isExportInvoice && !hasGlDoc;

  const openAmount = Number(row.open_amount ?? 0);
  const showOpenAmount = status !== "paid" && openAmount > 0.005;

  return (
    <div className="flex flex-col items-center justify-center gap-1 whitespace-nowrap">
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <span
          className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase whitespace-nowrap ${classes[status] || classes.unpaid
            }`}
          title={
            row.paid_amount !== undefined
              ? `Paid: ${Number(row.paid_amount).toFixed(2)} / Corrected: ${Number(row.corrected_amount ?? 0).toFixed(2)} / Open: ${openAmount.toFixed(2)}`
              : undefined
          }
        >
          {label}
        </span>
        {hasRk && (
          <span
            className="px-1.5 py-0.5 text-[10px] font-extrabold bg-[#FF6B00] text-white rounded-[4px] uppercase tracking-wider shrink-0 shadow-xs"
            title="Rechnungskorrektur vorhanden"
          >
            RK
          </span>
        )}
        {isGlMissing && (
          <span
            className="px-1.5 py-0.5 text-[10px] font-extrabold bg-red-600 text-white rounded-[4px] uppercase tracking-wider shrink-0 shadow-xs"
            title="Gelangensnachweis fehlt (EU_IGL / Third Country)"
          >
            GL
          </span>
        )}
      </div>
      {showOpenAmount && (
        <span className="text-[10px] font-semibold text-gray-500 whitespace-nowrap">
          {formatDeCurrency(openAmount)}
        </span>
      )}
    </div>
  );
};
const RechnungActionMenu: React.FC<{
  row: any;
  rowIndex?: number;
  onViewRechnung: (row: any) => void;
  onCreateRechnungK: (row: any) => void;
  creatingRkForId: string | null;
  onRefreshRechnungen?: () => void;
}> = ({
  row,
  rowIndex,
  onViewRechnung,
  onCreateRechnungK,
  creatingRkForId,
  onRefreshRechnungen,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isUploadingGl, setIsUploadingGl] = useState(false);
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

    const isCreatingRk = creatingRkForId === row.id;
    const isBottom = rowIndex !== undefined && rowIndex >= 5;

    const isExportInvoice = checkIsExportInvoice(row);

    return (
      <div className="relative inline-block text-left" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all shadow-xs cursor-pointer ${isOpen
            ? "border-[#8CC21B] bg-lime-50 text-[#8CC21B] ring-2 ring-[#8CC21B]/20"
            : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900"
            }`}
          title="Aktionen"
        >
          <ChevronRight
            className={`w-4 h-4 transition-transform duration-150 ${isOpen ? "rotate-90 text-[#8CC21B]" : ""
              }`}
          />
        </button>

        {isOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute right-0 ${isBottom ? "bottom-full mb-1.5" : "top-full mt-1.5"
              } w-64 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 z-50 text-left divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-100 font-poppins`}
          >
            {/* Option 1: Rechnungskorrektur erstellen */}
            <div className="p-1">
              <button
                type="button"
                disabled={isCreatingRk}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onCreateRechnungK(row);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
              >
                {isCreatingRk ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#8CC21B] shrink-0" />
                ) : (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#8CC21B] text-white rounded-[4px] shrink-0">
                    +RK
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold">
                    Rechnungskorrektur (+RK)
                  </span>
                </div>
              </button>
            </div>

            {/* Option: Gelangensnachweis (Upload / View) for EU_IGL or THIRD_COUNTRY */}
            {isExportInvoice && (
              <div className="p-1">
                {row.gelangenheitsbestaetigung_doc ? (
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || ""}${row.gelangenheitsbestaetigung_doc}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-[#8CC21B] shrink-0" />
                    <span className="text-xs font-semibold">
                      Gelangensnachweis öffnen
                    </span>
                  </a>
                ) : (
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    {isUploadingGl ? (
                      <Loader2 className="w-4 h-4 animate-spin text-orange-500 shrink-0" />
                    ) : (
                      <Upload className="w-4 h-4 text-orange-500 shrink-0" />
                    )}
                    <span className="text-xs font-semibold">
                      {isUploadingGl ? "Uploading…" : "Gelangensnachweis hochladen"}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      disabled={isUploadingGl}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          setIsUploadingGl(true);
                          await uploadGelangenheitsbestaetigung(row.id, file);
                          toast.success("Gelangensnachweis uploaded successfully!");
                          onRefreshRechnungen?.();
                        } catch (err) {
                          console.error("Upload error:", err);
                        } finally {
                          setIsUploadingGl(false);
                          setIsOpen(false);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            )}

            {/* Option 2: PDF öffnen */}
            <div className="p-1">
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  try {
                    await downloadRechnungPdf(
                      row.id,
                      row.invoiceNumber || row.invoice_number,
                    );
                  } catch (_) { }
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-semibold">PDF öffnen</span>
              </button>
            </div>

            <div className="p-1">
              {hasContactPersonEmail(row) ? (
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    try {
                      await downloadRechnungEml(
                        row.id,
                        row.invoiceNumber || row.invoice_number,
                      );
                    } catch (_) { }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-[#8CC21B] shrink-0" />
                  <span className="text-xs font-semibold">PDF in Email</span>
                </button>
              ) : (
                <div
                  className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg bg-orange-50/60 cursor-not-allowed select-none"
                  title="No contact person email address set"
                >
                  <Mail className="w-4 h-4 text-orange-500 shrink-0" />
                  <span className="text-xs font-semibold text-orange-500">
                    keine Emailadresse
                  </span>
                </div>
              )}
            </div>

            {/* Option 3: Rechnung öffnen */}
            <div className="p-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onViewRechnung(row);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-xs font-semibold">Rechnung öffnen</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

export function buildRechnungColumns({
  expandedDocIds,
  setExpandedDocIds,
  onViewRechnung,
  onCreateRechnungK,
  creatingRkForId,
  allOpenQuantities,
  rechnungenK,
  onRefreshRechnungen,
}: RechnungColumnsArgs): ColumnDef<any>[] {
  return [
    buildExpandColumn(expandedDocIds, setExpandedDocIds),
    datumColumn,
    {
      header: "Nr",
      width: "110px",
      align: "center",
      sortKey: "invoiceNumber",
      sortValue: (row) =>
        String(
          row.invoiceNumber || row.invoice_number || row.id || "",
        ).toLowerCase(),
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewRechnung(row);
            }}
            className="truncate text-green-600 font-semibold hover:underline cursor-pointer"
            title={row.invoiceNumber || row.id}
          >
            {row.invoiceNumber || row.id}
          </button>
        </div>
      ),
    },
    kundeColumn,
    titelColumn,
    lieferortColumn,
    lieferdatumColumn,
    buildNettowertColumn(valueNetCalc),
    {
      header: "Status",
      width: "140px",
      align: "center",
      sortKey: "status",
      sortValue: (row) => (row.payment_status || "unpaid").toLowerCase(),
      render: (row) => (
        <PaymentStatusBadge row={row} rechnungenK={rechnungenK} />
      ),
    },
    {
      header: "",
      width: "45px",
      align: "center",
      render: (row, index) => (
        <RechnungActionMenu
          row={row}
          rowIndex={index}
          onViewRechnung={onViewRechnung}
          onCreateRechnungK={onCreateRechnungK}
          creatingRkForId={creatingRkForId}
          onRefreshRechnungen={onRefreshRechnungen}
        />
      ),
    },
  ];
}
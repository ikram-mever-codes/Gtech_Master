"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import {
  Loader2,
  Receipt,
  CheckCircle,
  Percent,
  DollarSign,
} from "lucide-react";
import {
  createRechnungOhneAusliefern,
  downloadRechnungOnlyEml,
} from "@/api/rechnungen";
import { errorStyles, successStyles } from "@/utils/constants";

interface RechnungOhneAusliefernModalProps {
  isOpen: boolean;
  onClose: () => void;
  auftrag: any;
  onSuccess: () => void;
}

export default function RechnungOhneAusliefernModal({
  isOpen,
  onClose,
  auftrag,
  onSuccess,
}: RechnungOhneAusliefernModalProps) {
  const [amountType, setAmountType] = useState<"full" | "partial">("full");
  const [calculationType, setCalculationType] = useState<
    "percentage" | "fixed"
  >("percentage");
  const [value, setValue] = useState<string>("30");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (auftrag) {
      setAmountType("full");
      setCalculationType("percentage");
      setValue("30");
      setNotes("");
    }
  }, [auftrag, isOpen]);

  if (!isOpen || !auftrag) return null;

  const orderItems = auftrag.orderItems || auftrag.items || [];
  const totalSubtotal = orderItems.reduce(
    (sum: number, item: any) =>
      sum +
      (Number(item.price) || 0) * (Number(item.quantity || item.qty) || 1),
    0,
  );
  const taxRate = Number(auftrag.tax_rate ?? 19);
  // Auftrag already carries a live-resolved (while OPEN) or frozen (once
  // Partially Delivered/Delivered/Closed) taxProfile from the backend —
  // same object the Ausliefern window reads. Purely informational here;
  // the Rechnung this modal creates always copies auftrag.tax_rate as-is.
  const taxProfileLabel = auftrag.taxProfile?.name
    ? `${auftrag.taxProfile.name} (${taxRate}%)`
    : `${taxRate}%`;

  let netAmount = totalSubtotal;

  if (amountType === "partial") {
    const numVal = parseFloat(value) || 0;
    if (calculationType === "percentage") {
      const pct = Math.min(100, Math.max(0, numVal));
      netAmount = (totalSubtotal * pct) / 100;
    } else {
      netAmount = Math.max(0, numVal);
    }
  }

  const taxAmount = (netAmount * taxRate) / 100;
  const grossAmount = netAmount + taxAmount;

  const formatDeCurrency = (val: number) => {
    const num = isNaN(val) || !isFinite(val) ? 0 : val;
    return `${num.toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} €`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (amountType === "partial") {
      const numVal = parseFloat(value);
      if (isNaN(numVal) || numVal <= 0) {
        toast.error("Please enter a valid amount or percentage.", errorStyles);
        return;
      }
    }

    try {
      setSubmitting(true);

      const res = await createRechnungOhneAusliefern(auftrag.id, {
        amountType,
        calculationType: amountType === "partial" ? calculationType : undefined,
        value: amountType === "partial" ? parseFloat(value) : undefined,
        notes,
      });

      if (res?.success) {
        toast.success(
          res.message ||
            `Rechnung created successfully for ${auftrag.order_no}!`,
          successStyles,
        );
        const newRechnungId = res?.data?.id;
        if (newRechnungId) {
          try {
            await downloadRechnungOnlyEml(
              newRechnungId,
              res?.data?.invoice_number,
            );
          } catch (emlErr) {
            console.warn("Could not auto-download EML:", emlErr);
          }
        }
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create Rechnung.", errorStyles);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col font-poppins">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Rechnung ohne Ausliefern
              </h2>
              <p className="text-xs text-gray-500 font-semibold">
                Auftrag: {auftrag.order_no || auftrag.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Betrag Auswählen
              </label>
              <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
                Tax profile: {taxProfileLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  amountType === "full"
                    ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="amountType"
                  value="full"
                  checked={amountType === "full"}
                  onChange={() => setAmountType("full")}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="text-sm font-bold text-gray-900">
                    Gesamtbetrag (100%)
                  </div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">
                    Voller Auftrag-Nettowert: {formatDeCurrency(totalSubtotal)}
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  amountType === "partial"
                    ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="amountType"
                  value="partial"
                  checked={amountType === "partial"}
                  onChange={() => setAmountType("partial")}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-900">
                    Teilbetrag (Teil von Auftrag Gesamtbetrag)
                  </div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">
                    Prozentualen Anteil oder festen Betrag eingeben
                  </div>

                  {amountType === "partial" && (
                    <div
                      className="mt-3 pt-3 border-t border-emerald-200/60 space-y-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setCalculationType("percentage");
                            setValue("30");
                          }}
                          className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                            calculationType === "percentage"
                              ? "bg-white text-gray-900 shadow-xs"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          <Percent className="w-3.5 h-3.5" />
                          Percentage (%)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCalculationType("fixed");
                            setValue(
                              (totalSubtotal * 0.3).toFixed(2).toString(),
                            );
                          }}
                          className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                            calculationType === "fixed"
                              ? "bg-white text-gray-900 shadow-xs"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Fixed Amount (€)
                        </button>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-gray-600 uppercase mb-1 block">
                          {calculationType === "percentage"
                            ? "Prozentsatz (%)"
                            : "Fester Netto-Betrag (€)"}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            max={
                              calculationType === "percentage"
                                ? "100"
                                : undefined
                            }
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-bold pr-8"
                            placeholder={
                              calculationType === "percentage" ? "30" : "500"
                            }
                          />
                          <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">
                            {calculationType === "percentage" ? "%" : "€"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
              Rechnung Comment Extern
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Zusätzliche Hinweistexte für die Rechnung..."
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-600 font-medium">
              <span>Netto-Betrag (Subtotal):</span>
              <span className="font-bold text-gray-900">
                {formatDeCurrency(netAmount)}
              </span>
            </div>
            <div className="flex justify-between text-gray-600 font-medium">
              <span>MwSt ({taxRate}%):</span>
              <span className="font-bold text-gray-900">
                {formatDeCurrency(taxAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-1.5 border-t border-gray-200">
              <span>Gesamtbetrag (Brutto):</span>
              <span className="text-emerald-600">
                {formatDeCurrency(grossAmount)}
              </span>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Erstelle Rechnung
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

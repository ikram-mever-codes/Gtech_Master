"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { XMarkIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  createPaymentAllocation,
  deletePaymentAllocation,
  getPaymentInboundAllocations,
  PaymentAllocation,
  PaymentAllocationTargetType,
} from "@/api/payment_allocations";
import { errorStyles, successStyles } from "@/utils/constants";

interface PaymentInboundAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentInbound: any | null;
  /** Auftrag candidates — expects order_no, id, total_amount, customer_name/customerSnapshot. */
  auftraege: any[];
  /** Rechnung candidates — expects invoice_number, id, total_amount, customer_name/customerSnapshot. */
  rechnungen: any[];
  onSuccess: () => void;
}

const formatMoney = (val: number, currencyCode: string) => {
  const curr = currencyCode || "EUR";
  const symbol = curr === "EUR" ? "€" : curr === "USD" ? "$" : `${curr} `;
  return `${symbol}${(isNaN(val) ? 0 : val).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getDocLabel = (doc: any, type: PaymentAllocationTargetType) =>
  type === "auftrag" ? doc.order_no || doc.id : doc.invoice_number || doc.id;

const getDocCustomerName = (doc: any): string =>
  doc.customer_name ||
  doc.customerSnapshot?.companyName ||
  doc.customer?.companyName ||
  doc.customer?.company_name ||
  "—";

const getDocTotal = (doc: any): number =>
  Number(doc.total_amount ?? doc.grossTotal ?? 0);

export const PaymentInboundAssignModal: React.FC<
  PaymentInboundAssignModalProps
> = ({ isOpen, onClose, paymentInbound, auftraege, rechnungen, onSuccess }) => {
  const [targetType, setTargetType] =
    useState<PaymentAllocationTargetType>("auftrag");
  const [search, setSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);
  const [loadingAllocations, setLoadingAllocations] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const totalAmount = Number(paymentInbound?.amount || 0);
  const currencyCode = paymentInbound?.currency_code || "EUR";
  const allocatedAmount = allocations.reduce(
    (sum, a) => sum + Number(a.amount || 0),
    0,
  );
  const openAmount = Math.max(totalAmount - allocatedAmount, 0);

  const loadAllocations = async () => {
    if (!paymentInbound?.id) return;
    setLoadingAllocations(true);
    try {
      const res: any = await getPaymentInboundAllocations(paymentInbound.id);
      if (res?.success) {
        setAllocations(res.data?.allocations || []);
      }
    } catch (e) {
      console.error("Failed to load allocations:", e);
    } finally {
      setLoadingAllocations(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setTargetType("auftrag");
    setSearch("");
    setSelectedDoc(null);
    setAmount("");
    setNotes("");
    loadAllocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, paymentInbound?.id]);

  const candidates = targetType === "auftrag" ? auftraege : rechnungen;

  const filteredCandidates = useMemo(() => {
    const list = candidates || [];
    if (!search.trim()) return list.slice(0, 30);
    const q = search.toLowerCase();
    return list
      .filter((doc: any) => {
        const label = String(getDocLabel(doc, targetType)).toLowerCase();
        const customer = getDocCustomerName(doc).toLowerCase();
        return label.includes(q) || customer.includes(q);
      })
      .slice(0, 30);
  }, [candidates, search, targetType]);

  if (!isOpen || !paymentInbound) return null;

  const handleSelectDoc = (doc: any) => {
    setSelectedDoc(doc);
    const docTotal = getDocTotal(doc);
    // Best-effort default: the smaller of what's still open on the
    // payment and the target document's own total. This does NOT net
    // out prior payments already covering that target — just a sane
    // starting point the user can adjust.
    const suggested = Math.min(openAmount, docTotal || openAmount);
    setAmount(suggested > 0 ? suggested.toFixed(2) : "");
  };

  const handleAssign = async () => {
    if (!selectedDoc) {
      toast.error("Select an Auftrag or Rechnung first.", errorStyles);
      return;
    }
    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Enter an amount greater than 0.", errorStyles);
      return;
    }
    if (parsedAmount > openAmount + 0.005) {
      toast.error(
        `Only ${formatMoney(openAmount, currencyCode)} is still open on this payment.`,
        errorStyles,
      );
      return;
    }

    setSubmitting(true);
    try {
      const res: any = await createPaymentAllocation({
        paymentInboundId: paymentInbound.id,
        targetType,
        targetId: selectedDoc.id,
        amount: parsedAmount,
        notes: notes.trim() || undefined,
      });
      if (res?.success) {
        setSelectedDoc(null);
        setAmount("");
        setNotes("");
        setSearch("");
        await loadAllocations();
        onSuccess();
      } else {
        toast.error(res?.message || "Couldn't assign payment.", errorStyles);
      }
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Couldn't assign payment.",
        errorStyles,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAllocation = async (allocation: PaymentAllocation) => {
    if (
      !window.confirm(
        `Remove the ${formatMoney(Number(allocation.amount), currencyCode)} assignment to ${allocation.target_label || "this document"}?`,
      )
    )
      return;
    setRemovingId(allocation.id);
    try {
      await deletePaymentAllocation(allocation.id);
      await loadAllocations();
      onSuccess();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ||
          e?.message ||
          "Couldn't remove assignment.",
        errorStyles,
      );
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Assign Payment</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {paymentInbound.payer_name || "Unnamed payer"} ·{" "}
              {formatMoney(totalAmount, currencyCode)} total
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <div className="text-sm text-gray-600">Open (unassigned)</div>
            <div
              className={`text-lg font-bold ${openAmount > 0.005 ? "text-amber-600" : "text-gray-400"}`}
            >
              {loadingAllocations ? "…" : formatMoney(openAmount, currencyCode)}
            </div>
          </div>

          {allocations.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Already assigned
              </p>
              <div className="space-y-1.5">
                {allocations.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between text-sm bg-white border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-600 uppercase">
                        {a.target_type}
                      </span>
                      <span className="font-medium text-gray-800">
                        {a.target_label || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">
                        {formatMoney(Number(a.amount), currencyCode)}
                      </span>
                      <button
                        onClick={() => handleRemoveAllocation(a)}
                        disabled={removingId === a.id}
                        title="Remove assignment"
                        className="text-rose-500 hover:text-rose-700 disabled:opacity-50"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {openAmount > 0.005 ? (
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTargetType("auftrag");
                    setSelectedDoc(null);
                    setAmount("");
                  }}
                  className={`flex-1 px-3 py-1.5 text-sm font-semibold rounded-lg border transition ${
                    targetType === "auftrag"
                      ? "bg-[#8CC21B]/10 border-[#8CC21B] text-[#5b8014]"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Auftrag
                </button>
                <button
                  onClick={() => {
                    setTargetType("rechnung");
                    setSelectedDoc(null);
                    setAmount("");
                  }}
                  className={`flex-1 px-3 py-1.5 text-sm font-semibold rounded-lg border transition ${
                    targetType === "rechnung"
                      ? "bg-[#8CC21B]/10 border-[#8CC21B] text-[#5b8014]"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Rechnung
                </button>
              </div>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  targetType === "auftrag"
                    ? "Search Auftrag no. or customer…"
                    : "Search Rechnung no. or customer…"
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/30 focus:border-[#8CC21B]"
              />

              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {filteredCandidates.length === 0 ? (
                  <div className="text-center text-sm text-gray-400 py-4">
                    No matches.
                  </div>
                ) : (
                  filteredCandidates.map((doc: any) => {
                    const isSelected = selectedDoc?.id === doc.id;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => handleSelectDoc(doc)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition ${
                          isSelected
                            ? "bg-[#8CC21B]/10"
                            : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-gray-800">
                            {getDocLabel(doc, targetType)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {getDocCustomerName(doc)}
                          </div>
                        </div>
                        <div className="text-xs font-medium text-gray-600">
                          {formatMoney(getDocTotal(doc), doc.currency || "EUR")}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {selectedDoc && (
                <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Assigning to</span>
                    <span className="font-semibold text-gray-900">
                      {getDocLabel(selectedDoc, targetType)}
                    </span>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                      Amount
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-right font-semibold focus:ring-2 focus:ring-[#8CC21B]/30 focus:border-[#8CC21B]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                      Note (optional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. partial payment"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/30 focus:border-[#8CC21B]"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-sm text-gray-500 border-t border-gray-100 pt-4">
              This payment is fully assigned.
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          {openAmount > 0.005 && (
            <button
              onClick={handleAssign}
              disabled={!selectedDoc || submitting}
              className="px-4 py-2 text-sm bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] disabled:opacity-50 font-semibold"
            >
              {submitting ? "Assigning…" : "Assign"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentInboundAssignModal;

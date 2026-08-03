"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import CustomModal from "@/components/UI/CustomModal";
import {
  createPaymentInbound,
  updatePaymentInbound,
} from "@/api/payment_inbounds";
import { PaymentAccountData } from "@/api/payment_accounts";

interface PaymentInboundModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingInbound: any | null;
  paymentAccounts: PaymentAccountData[];
  onSuccess: () => void;
}

export const PaymentInboundModal: React.FC<PaymentInboundModalProps> = ({
  isOpen,
  onClose,
  editingInbound,
  paymentAccounts,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    paymentAccountId: "",
    receivedDate: new Date().toISOString().split("T")[0],
    amount: "",
    currencyCode: "EUR",
    payerName: "",
    reference: "",
  });

  useEffect(() => {
    if (editingInbound) {
      let dateStr = new Date().toISOString().split("T")[0];
      const rawDate =
        editingInbound.received_date ||
        editingInbound.receivedDate ||
        editingInbound.createdAt ||
        editingInbound.created_at;
      if (rawDate) {
        try {
          dateStr = new Date(rawDate).toISOString().split("T")[0];
        } catch (e) { }
      }
      setForm({
        paymentAccountId:
          editingInbound.payment_account_id ||
          editingInbound.paymentAccountId ||
          editingInbound.paymentAccount?.id ||
          "",
        receivedDate: dateStr,
        amount: String(editingInbound.amount ?? editingInbound.grossTotal ?? ""),
        currencyCode:
          editingInbound.currency_code || editingInbound.currencyCode || "EUR",
        payerName:
          editingInbound.payer_name ||
          editingInbound.customer_name ||
          editingInbound.customerSnapshot?.companyName ||
          "",
        reference:
          editingInbound.reference ||
          editingInbound.payer_account_reference ||
          "",
      });
    } else {
      setForm({
        paymentAccountId: paymentAccounts[0]?.id || "",
        receivedDate: new Date().toISOString().split("T")[0],
        amount: "",
        currencyCode: "EUR",
        payerName: "",
        reference: "",
      });
    }
  }, [editingInbound, isOpen, paymentAccounts]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Please enter a valid amount > 0");
      return;
    }

    try {
      setSubmitting(true);
      let res: any;
      if (editingInbound?.id) {
        res = await updatePaymentInbound(editingInbound.id, {
          payment_account_id: form.paymentAccountId || undefined,
          received_date: form.receivedDate,
          amount: Number(form.amount),
          currency_code: form.currencyCode || "EUR",
          payer_name: form.payerName,
          reference: form.reference,
        });
      } else {
        res = await createPaymentInbound({
          payment_account_id: form.paymentAccountId || undefined,
          received_date: form.receivedDate,
          amount: Number(form.amount),
          currency_code: form.currencyCode || "EUR",
          payer_name: form.payerName,
          reference: form.reference,
          source: "manual",
        });
      }

      if (res?.success) {
        onClose();
        onSuccess();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingInbound ? "Edit Payment Inbound Entry" : "Manual Payment Inbound Entry"}
      width="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-poppins text-black">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
            Payment Account
          </label>
          <select
            value={form.paymentAccountId}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, paymentAccountId: e.target.value }))
            }
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white font-medium"
          >
            <option value="">-- Select Account (Optional) --</option>
            {paymentAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.currency_code || "EUR"})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Received Date *
            </label>
            <input
              type="date"
              value={form.receivedDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, receivedDate: e.target.value }))
              }
              required
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Amount *
            </label>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, amount: e.target.value }))
              }
              placeholder="0.00"
              required
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Currency Code
            </label>
            <input
              type="text"
              value={form.currencyCode}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, currencyCode: e.target.value }))
              }
              placeholder="EUR"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white uppercase font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Payer Name
            </label>
            <input
              type="text"
              value={form.payerName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, payerName: e.target.value }))
              }
              placeholder="e.g. Customer GmbH"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white font-medium"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
            Reference (Invoice No / Memo)
          </label>
          <input
            type="text"
            value={form.reference}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, reference: e.target.value }))
            }
            placeholder="e.g. R2608-10 / INV-2026-001"
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white font-medium"
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#8CC21B] rounded-xl hover:bg-[#7ab015] transition-colors shadow-sm disabled:opacity-50"
          >
            {submitting ? "Saving..." : editingInbound ? "Update Entry" : "Save Entry"}
          </button>
        </div>
      </form>
    </CustomModal>
  );
};

export default PaymentInboundModal;
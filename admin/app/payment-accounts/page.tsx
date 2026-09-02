"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  X,
} from "lucide-react";
import { FunnelIcon } from "@heroicons/react/24/outline";
import FilterResetIcon from "@/components/UI/FilterResetIcon";
import {
  getAllPaymentAccounts,
  createPaymentAccount,
  updatePaymentAccount,
  deletePaymentAccount,
  PaymentAccountData,
} from "@/api/payment_accounts";
import { toast } from "react-hot-toast";
import MasterPageLayout from "@/components/General/MasterPageLayout";
import CustomModal from "@/components/UI/CustomModal";
import CustomButton from "@/components/UI/CustomButton";
import ModalHeader from "@/components/UI/ModalHeader";
import ModalFooter from "@/components/UI/ModalFooter";

export default function PaymentAccountsPage() {
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form State (Create)
  const [name, setName] = useState("");
  const [currencyCode, setCurrencyCode] = useState("EUR");
  const [externalAccountId, setExternalAccountId] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Form State (Edit)
  const [selectedAccount, setSelectedAccount] = useState<PaymentAccountData | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isEditEnabled, setIsEditEnabled] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCurrencyCode, setEditCurrencyCode] = useState("EUR");
  const [editExternalAccountId, setEditExternalAccountId] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res: any = await getAllPaymentAccounts(true);
      if (res && res.success) {
        setPaymentAccounts(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load payment accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setName("");
    setCurrencyCode("EUR");
    setExternalAccountId("");
    setIsActive(true);
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Payment account name is required");
      return;
    }

    setSubmitting(true);
    const payload = {
      name: name.trim(),
      currency_code: (currencyCode || "EUR").trim().toUpperCase(),
      external_account_id: externalAccountId.trim() || undefined,
      is_active: isActive,
    };

    try {
      const res: any = await createPaymentAccount(payload);
      if (res && res.success) {
        toast.success("Payment account created successfully");
        fetchData();
        resetForm();
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.response?.data?.message || "Operation failed";
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowClick = (account: PaymentAccountData) => {
    setSelectedAccount(account);
    setEditName(account.name);
    setEditCurrencyCode(account.currency_code || "EUR");
    setEditExternalAccountId(account.external_account_id || "");
    setEditIsActive(account.is_active);
    setIsEditEnabled(false);
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!selectedAccount?.id) return;
    if (!editName.trim()) {
      toast.error("Payment account name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res: any = await updatePaymentAccount(selectedAccount.id, {
        name: editName.trim(),
        currency_code: (editCurrencyCode || "EUR").trim().toUpperCase(),
        external_account_id: editExternalAccountId.trim() || undefined,
        is_active: editIsActive,
      });
      if (res && res.success) {
        toast.success("Payment account updated successfully");
        fetchData();
        setShowEditModal(false);
        setSelectedAccount(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to update payment account"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDelete = async () => {
    if (!selectedAccount?.id) return;
    if (
      !confirm(
        `Are you sure you want to delete the payment account "${selectedAccount.name}"? This action cannot be undone.`
      )
    )
      return;
    setSubmitting(true);
    try {
      const res: any = await deletePaymentAccount(selectedAccount.id);
      if (res && res.success) {
        toast.success("Payment account deleted successfully");
        fetchData();
        setShowEditModal(false);
        setSelectedAccount(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to delete payment account"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCancel = () => {
    if (!isEditEnabled) {
      setShowEditModal(false);
      setSelectedAccount(null);
    } else {
      setIsEditEnabled(false);
      if (selectedAccount) {
        setEditName(selectedAccount.name);
        setEditCurrencyCode(selectedAccount.currency_code || "EUR");
        setEditExternalAccountId(selectedAccount.external_account_id || "");
        setEditIsActive(selectedAccount.is_active);
      }
    }
  };

  const filteredAccounts = paymentAccounts.filter((account) => {
    const q = searchQuery.toLowerCase().trim();
    const nameVal = (account.name || "").toLowerCase();
    const extVal = (account.external_account_id || "").toLowerCase();
    const currVal = (account.currency_code || "").toLowerCase();
    return nameVal.includes(q) || extVal.includes(q) || currVal.includes(q);
  });

  const actionButtons = (
    <CustomButton
      startIcon={<Plus className="w-5 h-5" />}
      gradient={true}
      onClick={() => {
        resetForm();
        setShowModal(true);
      }}
    >
      Payment Account
    </CustomButton>
  );

  const filterBar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 shrink-0 select-none px-0.5">
        <FilterResetIcon
          isActive={!!searchQuery}
          onReset={() => setSearchQuery("")}
        />
      </div>
      <div className="relative w-80 shrink-0">
        <input
          type="text"
          placeholder="Search payment accounts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full px-2.5 h-8 text-xs border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${
            searchQuery
              ? "font-bold text-emerald-600 border-emerald-500 bg-emerald-50/20"
              : "text-gray-900 border-gray-300 bg-white"
          }`}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  const tableContent = (
    <>
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-[#8CC21B] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-gray-500">
            Loading payment accounts...
          </span>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="p-12 text-center">
          <Wallet className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium font-poppins">
            No payment accounts found.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Try a different search or create a new payment account.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Id</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4 text-center">CurrencyCode</th>
                <th className="px-6 py-4 text-center">ExternalAccountId</th>
                <th className="px-6 py-4 text-center">IsActive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredAccounts.map((account) => (
                <tr
                  key={account.id}
                  onClick={() => handleRowClick(account)}
                  className={`hover:bg-gray-50/50 cursor-pointer transition-all ${!account.is_active ? "opacity-60" : ""
                    }`}
                >
                  <td className="px-6 py-4 font-mono text-xs text-gray-500 max-w-[120px] truncate">
                    {account.id}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {account.name}
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                      {account.currency_code || "EUR"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-gray-600 font-mono text-xs">
                    {account.external_account_id || "—"}
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    {account.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                        <CheckCircle className="h-3 w-3" />
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                        <XCircle className="h-3 w-3" />
                        No
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const modalContent = (
    <>
      <CustomModal
        isOpen={showModal}
        onClose={resetForm}
        title="Create New Payment Account"
        width="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="account_name"
              className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
            >
              Name *
            </label>
            <input
              id="account_name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Commerzbank Dortmund"
              required
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="currency_code"
              className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
            >
              Currency Code (default EUR)
            </label>
            <input
              id="currency_code"
              type="text"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              placeholder="e.g. EUR, USD, CNY"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50 uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="external_account_id"
              className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
            >
              External Account ID
            </label>
            <input
              id="external_account_id"
              type="text"
              value={externalAccountId}
              onChange={(e) => setExternalAccountId(e.target.value)}
              placeholder="e.g. DE16 4404 0037 0210 9288 00"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50"
            />
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded text-[#8CC21B] focus:ring-[#8CC21B]/20 h-4.5 w-4.5 border-gray-300"
              />
              <span className="text-xs font-semibold text-gray-700">
                Is Active (Yes / No)
              </span>
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-[#8CC21B] hover:bg-[#7ab318] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              Create Account
            </button>
          </div>
        </form>
      </CustomModal>

      {selectedAccount && (
        <CustomModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAccount(null);
          }}
          title=""
          showHeader={false}
          noPadding={true}
          width="max-w-md"
        >
          <div className="bg-white rounded-2xl overflow-hidden">
            <ModalHeader
              entityName="Payment Account"
              entityNo={selectedAccount.name}
              icon={Wallet}
              isEditMode={true}
              isEditEnabled={isEditEnabled}
              onToggleEdit={() => setIsEditEnabled((prev) => !prev)}
              onClose={() => {
                setShowEditModal(false);
                setSelectedAccount(null);
              }}
            />
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Name
                  </label>
                  {isEditEnabled ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all"
                    />
                  ) : (
                    <div className="px-3.5 py-2.5 text-sm font-semibold text-gray-900">
                      {selectedAccount.name}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Currency Code
                  </label>
                  {isEditEnabled ? (
                    <input
                      type="text"
                      value={editCurrencyCode}
                      onChange={(e) => setEditCurrencyCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all uppercase"
                    />
                  ) : (
                    <div className="px-3.5 py-2.5 text-sm font-semibold text-gray-900">
                      {selectedAccount.currency_code || "EUR"}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    External Account ID
                  </label>
                  {isEditEnabled ? (
                    <input
                      type="text"
                      value={editExternalAccountId}
                      onChange={(e) => setEditExternalAccountId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all"
                    />
                  ) : (
                    <div className="px-3.5 py-2.5 text-sm font-semibold text-gray-900 font-mono text-xs">
                      {selectedAccount.external_account_id || "—"}
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-100">
                  {isEditEnabled ? (
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editIsActive}
                          onChange={(e) => setEditIsActive(e.target.checked)}
                          className="rounded text-[#8CC21B] focus:ring-[#8CC21B]/20 h-4 w-4 border-gray-300"
                        />
                        <span className="text-xs font-semibold text-gray-700">
                          Is Active (Yes / No)
                        </span>
                      </label>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${selectedAccount.is_active
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-gray-100 text-gray-400 border border-gray-200"
                          }`}
                      >
                        {selectedAccount.is_active ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {selectedAccount.is_active ? "Active (Yes)" : "Inactive (No)"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <ModalFooter
              isEditMode={true}
              isEditEnabled={isEditEnabled}
              onDelete={handleEditDelete}
              onCancel={handleEditCancel}
              onSave={handleEditSave}
              loading={submitting}
              saveDisabled={submitting}
              saveLabel="Save Changes"
            />
          </div>
        </CustomModal>
      )}
    </>
  );

  return (
    <MasterPageLayout
      title="Payment Account"
      icon={Wallet}
      actionButtons={actionButtons}
      filterBar={filterBar}
      tableContent={tableContent}
      modalContent={modalContent}
    />
  );
}

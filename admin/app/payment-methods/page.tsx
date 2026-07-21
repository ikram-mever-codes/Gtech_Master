"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  getAllPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  PaymentMethod,
} from "@/api/payment_methods";
import { toast } from "react-hot-toast";
import MasterPageLayout from "@/components/General/MasterPageLayout";
import CustomModal from "@/components/UI/CustomModal";
import CustomButton from "@/components/UI/CustomButton";
import ModalHeader from "@/components/UI/ModalHeader";
import ModalFooter from "@/components/UI/ModalFooter";

export default function PaymentMethodsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [isPrepayment, setIsPrepayment] = useState(false);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isEditEnabled, setIsEditEnabled] = useState(false);
  const [editName, setEditName] = useState("");
  const [editIsPrepayment, setEditIsPrepayment] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res: any = await getAllPaymentMethods(true);
      if (res && res.success) {
        setPaymentMethods(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setName("");
    setIsPrepayment(false);
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Payment method name is required");
      return;
    }

    setSubmitting(true);
    const payload = {
      name: name.trim(),
      is_prepayment: isPrepayment,
    };

    try {
      const res: any = await createPaymentMethod(payload);
      if (res && res.success) {
        toast.success("Payment method created successfully");
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

  const handleRowClick = (pm: PaymentMethod) => {
    setSelectedMethod(pm);
    setEditName(pm.name);
    setEditIsPrepayment(pm.is_prepayment);
    setEditIsActive(pm.is_active);
    setIsEditEnabled(false);
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!selectedMethod) return;
    if (!editName.trim()) {
      toast.error("Payment method name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res: any = await updatePaymentMethod(selectedMethod.id, {
        name: editName.trim(),
        is_prepayment: editIsPrepayment,
        is_active: editIsActive,
      });
      if (res && res.success) {
        toast.success("Payment method updated successfully");
        fetchData();
        setShowEditModal(false);
        setSelectedMethod(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update payment method");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDelete = async () => {
    if (!selectedMethod) return;
    if (
      !confirm(
        `Are you sure you want to delete the payment method "${selectedMethod.name}"? This action cannot be undone.`
      )
    )
      return;
    setSubmitting(true);
    try {
      const res: any = await deletePaymentMethod(selectedMethod.id);
      if (res && res.success) {
        toast.success("Payment method deleted successfully");
        fetchData();
        setShowEditModal(false);
        setSelectedMethod(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete payment method");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCancel = () => {
    if (!isEditEnabled) {
      setShowEditModal(false);
      setSelectedMethod(null);
    } else {
      setIsEditEnabled(false);
      if (selectedMethod) {
        setEditName(selectedMethod.name);
        setEditIsPrepayment(selectedMethod.is_prepayment);
        setEditIsActive(selectedMethod.is_active);
      }
    }
  };

  const filteredMethods = paymentMethods.filter((pm) => {
    const q = searchQuery.toLowerCase().trim();
    const nameVal = (pm.name || "").toLowerCase();
    return nameVal.includes(q);
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
      Add Payment Method
    </CustomButton>
  );

  const filterBar = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search payment methods..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-white"
        />
      </div>
    </div>
  );

  const tableContent = (
    <>
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-[#8CC21B] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-gray-500">
            Loading payment methods...
          </span>
        </div>
      ) : filteredMethods.length === 0 ? (
        <div className="p-12 text-center">
          <CreditCard className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium font-poppins">No payment methods found.</p>
          <p className="text-xs text-gray-400 mt-1">
            Try a different search or create a new payment method.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4 text-center">Prepayment Required</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredMethods.map((pm) => (
                <tr
                  key={pm.id}
                  onClick={() => handleRowClick(pm)}
                  className={`hover:bg-gray-50/50 cursor-pointer transition-all ${
                    !pm.is_active ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {pm.name}
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    {pm.is_prepayment ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    {pm.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                        <XCircle className="h-3 w-3" />
                        Inactive
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
        title="Create New Payment Method"
        width="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="method_name"
              className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
            >
              Payment Method Name
            </label>
            <input
              id="method_name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PayPal"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50"
            />
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrepayment}
                onChange={(e) => setIsPrepayment(e.target.checked)}
                className="rounded text-[#8CC21B] focus:ring-[#8CC21B]/20 h-4.5 w-4.5 border-gray-300"
              />
              <span className="text-xs font-semibold text-gray-700">
                Prepayment Required
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
              Create Method
            </button>
          </div>
        </form>
      </CustomModal>

      {selectedMethod && (
        <CustomModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedMethod(null);
          }}
          title=""
          showHeader={false}
          noPadding={true}
          width="max-w-md"
        >
          <div className="bg-white rounded-2xl overflow-hidden">
            <ModalHeader
              entityName="Payment Method"
              entityNo={selectedMethod.name}
              icon={CreditCard}
              isEditMode={true}
              isEditEnabled={isEditEnabled}
              onToggleEdit={() => setIsEditEnabled((prev) => !prev)}
              onClose={() => {
                setShowEditModal(false);
                setSelectedMethod(null);
              }}
            />
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Payment Method Name
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
                      {selectedMethod.name}
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-100">
                  {isEditEnabled ? (
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editIsPrepayment}
                          onChange={(e) => setEditIsPrepayment(e.target.checked)}
                          className="rounded text-[#8CC21B] focus:ring-[#8CC21B]/20 h-4 w-4 border-gray-300"
                        />
                        <span className="text-xs font-semibold text-gray-700">
                          Prepayment Required
                        </span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editIsActive}
                          onChange={(e) => setEditIsActive(e.target.checked)}
                          className="rounded text-[#8CC21B] focus:ring-[#8CC21B]/20 h-4 w-4 border-gray-300"
                        />
                        <span className="text-xs font-semibold text-gray-700">Active</span>
                      </label>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          selectedMethod.is_prepayment
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-gray-100 text-gray-400 border border-gray-200"
                        }`}
                      >
                        {selectedMethod.is_prepayment ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        Prepayment Required
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          selectedMethod.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-gray-100 text-gray-400 border border-gray-200"
                        }`}
                      >
                        {selectedMethod.is_active ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        Active
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
      title="Payment Method Settings"
      icon={CreditCard}
      actionButtons={actionButtons}
      filterBar={filterBar}
      tableContent={tableContent}
      modalContent={modalContent}
    />
  );
}
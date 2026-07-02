"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Percent, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import {
  getTaxProfileById,
  updateTaxProfile,
  deleteTaxProfile,
  TaxProfile,
} from "@/api/tax_profiles";
import { toast } from "react-hot-toast";
import { ModalHeader } from "@/components/UI/ModalHeader";
import { ModalFooter } from "@/components/UI/ModalFooter";

export default function TaxProfileDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const taxProfileId = params?.taxProfileId as string;

  const [taxProfile, setTaxProfile] = useState<TaxProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditEnabled, setIsEditEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [taxCase, setTaxCase] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [taxCode, setTaxCode] = useState("");
  const [revenueAccountNo, setRevenueAccountNo] = useState("");
  const [requiresVatId, setRequiresVatId] = useState(false);
  const [requiresConfirmedVatId, setRequiresConfirmedVatId] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState("");

  const fetchTaxProfileDetails = async () => {
    setLoading(true);
    try {
      const res: any = await getTaxProfileById(taxProfileId);
      if (res && res.success && res.data) {
        setTaxProfile(res.data);
        populateForm(res.data);
      } else {
        toast.error("Tax profile details not found");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tax profile details");
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (data: TaxProfile) => {
    setName(data.name);
    setTaxCase(data.tax_case || "DE-VAT");
    setTaxRate(data.tax_rate);
    setTaxCode(data.tax_code || "");
    setRevenueAccountNo(data.revenue_account_no || "");
    setRequiresVatId(data.requires_vat_id);
    setRequiresConfirmedVatId(data.requires_confirmed_vat_id);
    setIsActive(data.is_active);
    setDescription(data.description || "");
  };

  useEffect(() => {
    if (taxProfileId) fetchTaxProfileDetails();
  }, [taxProfileId]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Profile name is required");
      return;
    }
    if (taxRate < 0) {
      toast.error("Tax rate cannot be negative");
      return;
    }

    setSubmitting(true);
    try {
      const res: any = await updateTaxProfile(taxProfileId, {
        name: name.trim(),
        tax_case: taxCase.trim() || null,
        tax_rate: Number(taxRate),
        tax_code: taxCode.trim() || null,
        revenue_account_no: revenueAccountNo.trim() || null,
        requires_vat_id: requiresVatId,
        requires_confirmed_vat_id: requiresConfirmedVatId,
        is_active: isActive,
        description: description.trim() || undefined,
      });
      if (res && res.success) {
        toast.success("Tax profile updated successfully");
        setTaxProfile(res.data);
        setIsEditEnabled(false);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update tax profile");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!taxProfile) return;
    if (!confirm(`Are you sure you want to delete the profile "${taxProfile.name}"? This action cannot be undone.`)) return;
    try {
      const res: any = await deleteTaxProfile(taxProfile.id);
      if (res && res.success) {
        toast.success(res.message || "Tax profile deleted successfully");
        router.push("/tax-profiles");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete tax profile");
    }
  };

  const handleCancel = () => {
    setIsEditEnabled(false);
    if (taxProfile) populateForm(taxProfile);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-gray-200 border-t-[#8CC21B] animate-spin mx-auto" />
          <p className="mt-4 text-sm font-semibold text-gray-500">Loading details...</p>
        </div>
      </div>
    );
  }

  if (!taxProfile) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-red-100 p-8 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Tax Profile Not Found</h3>
          <button
            onClick={() => router.push("/tax-profiles")}
            className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold transition-all"
          >
            Back to Tax Profiles
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            onClick={() => router.push("/tax-profiles")}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span
            className="hover:underline cursor-pointer"
            onClick={() => router.push("/tax-profiles")}
          >
            Tax Profiles
          </span>
          <span>/</span>
          <span className="text-gray-900 font-medium">{taxProfile.name}</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <ModalHeader
            entityName={taxProfile.name}
            icon={Percent}
            isEditMode={true}
            isEditEnabled={isEditEnabled}
            onToggleEdit={() => setIsEditEnabled((prev) => !prev)}
            onClose={() => router.push("/tax-profiles")}
          />
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Profile Name
                </label>
                {isEditEnabled ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all"
                  />
                ) : (
                  <div className="px-3.5 py-2.5 text-sm font-semibold text-gray-900">
                    {taxProfile.name}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Tax Case
                </label>
                {isEditEnabled ? (
                  <select
                    value={taxCase}
                    onChange={(e) => setTaxCase(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all"
                  >
                    <option value="DE-VAT">DE-VAT</option>
                    <option value="EU_IGL">EU_IGL</option>
                    <option value="EU_no_valid_VAT_ID">EU_no_valid_VAT_ID</option>
                    <option value="third_country">third_country</option>
                  </select>
                ) : (
                  <div className="px-3.5 py-2.5 text-sm font-semibold text-gray-900 font-mono">
                    {taxProfile.tax_case || "—"}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Tax Rate (%)
                </label>
                {isEditEnabled ? (
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all"
                  />
                ) : (
                  <div className="px-3.5 py-2.5 text-sm font-semibold text-gray-900">
                    {taxProfile.tax_rate}%
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Tax Code
                </label>
                {isEditEnabled ? (
                  <input
                    type="text"
                    value={taxCode}
                    onChange={(e) => setTaxCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all"
                  />
                ) : (
                  <div className="px-3.5 py-2.5 text-sm font-semibold text-gray-900 font-mono">
                    {taxProfile.tax_code || "—"}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Revenue Account
                </label>
                {isEditEnabled ? (
                  <input
                    type="text"
                    value={revenueAccountNo}
                    onChange={(e) => setRevenueAccountNo(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all"
                  />
                ) : (
                  <div className="px-3.5 py-2.5 text-sm font-semibold text-gray-900 font-mono">
                    {taxProfile.revenue_account_no || "—"}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Description
                </label>
                {isEditEnabled ? (
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all"
                  />
                ) : (
                  <div className="px-3.5 py-2.5 text-sm font-semibold text-gray-900">
                    {taxProfile.description || "—"}
                  </div>
                )}
              </div>
              <div className="space-y-3 pt-4 md:col-span-2 border-t border-gray-100">
                {isEditEnabled ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requiresVatId}
                        onChange={(e) => setRequiresVatId(e.target.checked)}
                        className="rounded text-[#8CC21B] focus:ring-[#8CC21B]/20 h-4 w-4 border-gray-300"
                      />
                      <span className="text-sm font-semibold text-gray-700">Requires VAT ID</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requiresConfirmedVatId}
                        onChange={(e) => setRequiresConfirmedVatId(e.target.checked)}
                        className="rounded text-[#8CC21B] focus:ring-[#8CC21B]/20 h-4 w-4 border-gray-300"
                      />
                      <span className="text-sm font-semibold text-gray-700">Requires Confirmed VAT ID</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded text-[#8CC21B] focus:ring-[#8CC21B]/20 h-4 w-4 border-gray-300"
                      />
                      <span className="text-sm font-semibold text-gray-700">Active Status</span>
                    </label>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${taxProfile.requires_vat_id ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>
                      {taxProfile.requires_vat_id ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      Requires VAT ID
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${taxProfile.requires_confirmed_vat_id ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>
                      {taxProfile.requires_confirmed_vat_id ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      Requires Confirmed VAT ID
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${taxProfile.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>
                      {taxProfile.is_active ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
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
            onDelete={handleDelete}
            onCancel={handleCancel}
            onSave={handleSave}
            loading={submitting}
            saveDisabled={submitting}
            saveLabel="Save Changes"
          />
        </div>

      </div>
    </div>
  );
}
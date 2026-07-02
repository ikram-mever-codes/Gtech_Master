"use client";

import React, { useState, useEffect } from "react";
import {
  Percent,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  getAllTaxProfiles,
  createTaxProfile,
  TaxProfile,
} from "@/api/tax_profiles";
import { toast } from "react-hot-toast";
import MasterPageLayout from "@/components/General/MasterPageLayout";
import CustomModal from "@/components/UI/CustomModal";
import CustomButton from "@/components/UI/CustomButton";
import { useRouter } from "next/navigation";

export default function TaxProfilesPage() {
  const router = useRouter();
  const [taxProfiles, setTaxProfiles] = useState<TaxProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form & Modal States
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [taxCase, setTaxCase] = useState("DE-VAT"); // default to first option
  const [taxRate, setTaxRate] = useState(0);
  const [taxCode, setTaxCode] = useState("");
  const [revenueAccountNo, setRevenueAccountNo] = useState("");
  const [requiresVatId, setRequiresVatId] = useState(false);
  const [requiresConfirmedVatId, setRequiresConfirmedVatId] = useState(false);
  const [description, setDescription] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res: any = await getAllTaxProfiles(true);
      if (res && res.success) {
        setTaxProfiles(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tax profiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setName("");
    setTaxCase("DE-VAT");
    setTaxRate(0);
    setTaxCode("");
    setRevenueAccountNo("");
    setRequiresVatId(false);
    setRequiresConfirmedVatId(false);
    setDescription("");
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Profile name is required");
      return;
    }
    if (taxRate < 0) {
      toast.error("Tax rate cannot be negative");
      return;
    }

    setSubmitting(true);
    const payload = {
      name: name.trim(),
      tax_case: taxCase.trim() || null,
      tax_rate: Number(taxRate),
      tax_code: taxCode.trim() || null,
      revenue_account_no: revenueAccountNo.trim() || null,
      requires_vat_id: requiresVatId,
      requires_confirmed_vat_id: requiresConfirmedVatId,
      description: description.trim() || undefined,
    };

    try {
      const res: any = await createTaxProfile(payload);
      if (res && res.success) {
        toast.success("Tax profile created successfully");
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

  const filteredProfiles = taxProfiles.filter((p) => {
    if (!p.is_active) return false;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.tax_case && p.tax_case.toLowerCase().includes(q)) ||
      (p.tax_code && p.tax_code.toLowerCase().includes(q)) ||
      (p.revenue_account_no && p.revenue_account_no.toLowerCase().includes(q))
    );
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
      Add Tax Profile
    </CustomButton>
  );

  const filterBar = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search profiles, account numbers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-white"
        />
      </div>
      <button
        onClick={fetchData}
        className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 transition-all flex items-center gap-1.5 text-sm font-semibold"
        title="Refresh"
      >
        <RefreshCw className="h-4.5 w-4.5" />
        Refresh
      </button>
    </div>
  );

  const tableContent = (
    <>
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-[#8CC21B] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-gray-500">
            Loading profiles...
          </span>
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="p-12 text-center">
          <Percent className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium font-poppins">No tax profiles found.</p>
          <p className="text-xs text-gray-400 mt-1">
            Try a different search or create a new profile.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Case</th>
                <th className="px-6 py-4 text-center">Rate</th>
                <th className="px-6 py-4">Rev Account</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredProfiles.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/tax-profiles/${p.id}`)}
                  className={`hover:bg-gray-50/50 cursor-pointer transition-all ${!p.is_active ? "opacity-60" : ""
                    }`}
                >
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    <div>
                      <span className="block">{p.name}</span>
                      {p.description && (
                        <span className="text-[10px] text-gray-400 block font-normal mt-0.5">
                          {p.description}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700 font-mono text-xs font-bold">
                    {p.tax_case || "—"}
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-gray-800">
                    {p.tax_rate}%
                  </td>
                  <td className="px-6 py-4 text-gray-700 font-mono font-bold">
                    {p.revenue_account_no || "—"}
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    {p.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
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
    <CustomModal
      isOpen={showModal}
      onClose={resetForm}
      title="Create New Tax Profile"
      width="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="profile_name"
            className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
          >
            Profile Name
          </label>
          <input
            id="profile_name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. DE 19% Standard"
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="profile_case"
              className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
            >
              Tax Case
            </label>
            <select
              id="profile_case"
              value={taxCase}
              onChange={(e) => setTaxCase(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50"
            >
              <option value="DE-VAT">DE-VAT</option>
              <option value="EU_IGL">EU_IGL</option>
              <option value="EU_no_valid_VAT_ID">EU_no_valid_VAT_ID</option>
              <option value="third_country">third_country</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="profile_rate"
              className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
            >
              Tax Rate (%)
            </label>
            <input
              id="profile_rate"
              type="number"
              step="0.01"
              min="0"
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              placeholder="19.00"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="profile_code"
              className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
            >
              Tax Code
            </label>
            <input
              id="profile_code"
              type="text"
              value={taxCode}
              onChange={(e) => setTaxCode(e.target.value)}
              placeholder="DE-VAT19"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="profile_account"
              className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
            >
              Revenue Account
            </label>
            <input
              id="profile_account"
              type="text"
              value={revenueAccountNo}
              onChange={(e) => setRevenueAccountNo(e.target.value)}
              placeholder="8400"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="profile_desc"
            className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
          >
            Description
          </label>
          <input
            id="profile_desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Standard German VAT rate profile"
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50"
          />
        </div>

        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={requiresVatId}
              onChange={(e) => setRequiresVatId(e.target.checked)}
              className="rounded text-[#8CC21B] focus:ring-[#8CC21B]/20 h-4.5 w-4.5 border-gray-300"
            />
            <span className="text-xs font-semibold text-gray-700">
              Requires VAT ID
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={requiresConfirmedVatId}
              onChange={(e) => setRequiresConfirmedVatId(e.target.checked)}
              className="rounded text-[#8CC21B] focus:ring-[#8CC21B]/20 h-4.5 w-4.5 border-gray-300"
            />
            <span className="text-xs font-semibold text-gray-700">
              Requires Confirmed VAT ID (e.g. Qualified VIES)
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
            Create Profile
          </button>
        </div>
      </form>
    </CustomModal>
  );
  return (
    <MasterPageLayout
      title="Tax Profile Settings"
      icon={Percent}
      actionButtons={actionButtons}
      filterBar={filterBar}
      tableContent={tableContent}
      modalContent={modalContent}
    />
  );
}
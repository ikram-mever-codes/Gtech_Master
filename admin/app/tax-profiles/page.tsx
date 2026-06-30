"use client";

import React, { useState, useEffect } from "react";
import {
  Percent,
  Trash2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  getAllTaxProfiles,
  createTaxProfile,
  updateTaxProfile,
  TaxProfile,
} from "@/api/tax_profiles";
import { getAllCountries, Country } from "@/api/countries";
import { toast } from "react-hot-toast";
import PageHeader from "@/components/UI/PageHeader";

export default function TaxProfilesPage() {
  const [taxProfiles, setTaxProfiles] = useState<TaxProfile[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [countryId, setCountryId] = useState("");
  const [taxCase, setTaxCase] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [taxCode, setTaxCode] = useState("");
  const [revenueAccountNo, setRevenueAccountNo] = useState("");
  const [requiresVatId, setRequiresVatId] = useState(false);
  const [requiresConfirmedVatId, setRequiresConfirmedVatId] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profilesRes, countriesRes]: [any, any] = await Promise.all([
        getAllTaxProfiles(true),
        getAllCountries(false),
      ]);

      if (profilesRes && profilesRes.success) {
        setTaxProfiles(profilesRes.data || []);
      }
      if (countriesRes && countriesRes.success) {
        setCountries(countriesRes.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load settings data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setName("");
    setCountryId("");
    setTaxCase("");
    setTaxRate(0);
    setTaxCode("");
    setRevenueAccountNo("");
    setRequiresVatId(false);
    setRequiresConfirmedVatId(false);
    setIsActive(true);
    setDescription("");
    setIsEditing(false);
    setEditingId(null);
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
      country_id: countryId || null,
      tax_case: taxCase.trim() || null,
      tax_rate: Number(taxRate),
      tax_code: taxCode.trim() || null,
      revenue_account_no: revenueAccountNo.trim() || null,
      requires_vat_id: requiresVatId,
      requires_confirmed_vat_id: requiresConfirmedVatId,
      description: description.trim() || undefined,
    };

    try {
      if (isEditing && editingId) {
        const res: any = await updateTaxProfile(editingId, {
          ...payload,
          is_active: isActive,
        });
        if (res && res.success) {
          toast.success("Tax profile updated successfully");
          fetchData();
          resetForm();
        }
      } else {
        const res: any = await createTaxProfile(payload);
        if (res && res.success) {
          toast.success("Tax profile created successfully");
          fetchData();
          resetForm();
        }
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.response?.data?.message || "Operation failed";
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (profile: TaxProfile) => {
    setIsEditing(true);
    setEditingId(profile.id);
    setName(profile.name);
    setCountryId(profile.country?.id || "");
    setTaxCase(profile.tax_case || "");
    setTaxRate(profile.tax_rate);
    setTaxCode(profile.tax_code || "");
    setRevenueAccountNo(profile.revenue_account_no || "");
    setRequiresVatId(profile.requires_vat_id);
    setRequiresConfirmedVatId(profile.requires_confirmed_vat_id);
    setIsActive(profile.is_active);
    setDescription(profile.description || "");
  };

  const handleToggleActive = async (profile: TaxProfile) => {
    const actionText = profile.is_active ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${actionText} the profile "${profile.name}"?`)) {
      return;
    }

    try {
      const res: any = await updateTaxProfile(profile.id, {
        is_active: !profile.is_active,
      });
      if (res && res.success) {
        toast.success(`Tax profile ${actionText}d successfully`);
        fetchData();
        if (editingId === profile.id) {
          setIsActive(!profile.is_active);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update profile status");
    }
  };

  const filteredProfiles = taxProfiles.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.tax_case && p.tax_case.toLowerCase().includes(q)) ||
      (p.tax_code && p.tax_code.toLowerCase().includes(q)) ||
      (p.revenue_account_no && p.revenue_account_no.toLowerCase().includes(q)) ||
      (p.country?.name && p.country.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <PageHeader title="Tax Profile Settings" icon={Percent} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 h-fit lg:sticky lg:top-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {isEditing ? "Edit Tax Profile" : "Create New Tax Profile"}
            </h3>
          </div>

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

            <div className="space-y-1.5">
              <label
                htmlFor="profile_country"
                className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
              >
                Country
              </label>
              <select
                id="profile_country"
                value={countryId}
                onChange={(e) => setCountryId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50"
              >
                <option value="">No Specific Country (Global Default)</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.iso2} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="profile_case"
                  className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
                >
                  Tax Case
                </label>
                <input
                  id="profile_case"
                  type="text"
                  value={taxCase}
                  onChange={(e) => setTaxCase(e.target.value)}
                  placeholder="Standard, IGL, Export"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50"
                />
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

              {isEditing && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-[#8CC21B] focus:ring-[#8CC21B]/20 h-4.5 w-4.5 border-gray-300"
                  />
                  <span className="text-xs font-semibold text-gray-700">
                    Active (shows in defaults selection)
                  </span>
                </label>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-[#8CC21B] hover:bg-[#7ab318] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {isEditing ? "Save Changes" : "Create Profile"}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search profiles, account numbers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all"
              />
            </div>
            <button
              onClick={fetchData}
              className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 transition-all self-end sm:self-auto flex items-center gap-1.5 text-xs font-semibold"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-[#8CC21B] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-semibold text-gray-500">
                Loading profiles...
              </span>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
              <Percent className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No tax profiles found.</p>
              <p className="text-xs text-gray-400 mt-1">
                Try a different search or create a new profile on the left.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Country</th>
                      <th className="px-6 py-4">Case</th>
                      <th className="px-6 py-4 text-center">Rate</th>
                      <th className="px-6 py-4">Rev Account</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredProfiles.map((p) => (
                      <tr
                        key={p.id}
                        className={`hover:bg-gray-50/50 transition-all ${!p.is_active ? "opacity-60" : ""
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
                        <td className="px-6 py-4 text-gray-600 font-medium">
                          {p.country ? (
                            <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md font-mono text-xs">
                              {p.country.iso2} - {p.country.name}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">Global Default</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-700 font-mono text-xs">
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
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(p)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title="Edit Profile"
                            >
                              <Pencil className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(p)}
                              className={`p-1.5 rounded-xl transition-all ${p.is_active
                                ? "text-gray-400 hover:text-red-600 hover:bg-red-50"
                                : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                                }`}
                              title={
                                p.is_active
                                  ? "Deactivate Profile"
                                  : "Activate Profile"
                              }
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

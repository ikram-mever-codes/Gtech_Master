"use client";

import React, { useState, useEffect } from "react";
import {
  Globe2,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  getAllCountries,
  createCountry,
  updateCountry,
  deleteCountry,
  Country,
} from "@/api/countries";
import { toast } from "react-hot-toast";
import MasterPageLayout from "@/components/General/MasterPageLayout";
import CustomModal from "@/components/UI/CustomModal";
import CustomButton from "@/components/UI/CustomButton";
import ModalHeader from "@/components/UI/ModalHeader";
import ModalFooter from "@/components/UI/ModalFooter";

export default function CountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [iso2, setIso2] = useState("");
  const [name, setName] = useState("");
  const [nameDe, setNameDe] = useState("");
  const [isEu, setIsEu] = useState(false);
  const [isIglCountry, setIsIglCountry] = useState(false);

  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isEditEnabled, setIsEditEnabled] = useState(false);
  const [editIso2, setEditIso2] = useState("");
  const [editName, setEditName] = useState("");
  const [editNameDe, setEditNameDe] = useState("");
  const [editIsEu, setEditIsEu] = useState(false);
  const [editIsIglCountry, setEditIsIglCountry] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);

  const fetchCountries = async () => {
    setLoading(true);
    try {
      const res: any = await getAllCountries(true);
      if (res && res.success) {
        setCountries(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load countries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  const resetForm = () => {
    setIso2("");
    setName("");
    setNameDe("");
    setIsEu(false);
    setIsIglCountry(false);
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!iso2.trim() || iso2.trim().length !== 2) {
      toast.error("ISO2 code must be exactly 2 characters");
      return;
    }
    if (!name.trim()) {
      toast.error("Country name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res: any = await createCountry({
        iso2: iso2.trim().toUpperCase(),
        name: name.trim(),
        name_de: nameDe.trim() || undefined,
        is_eu: isEu,
        is_igl_country: isIglCountry,
      });
      if (res && res.success) {
        toast.success("Country created successfully");
        fetchCountries();
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

  const handleRowClick = (country: Country) => {
    setSelectedCountry(country);
    setEditIso2(country.iso2);
    setEditName(country.name);
    setEditNameDe(country.name_de || "");
    setEditIsEu(country.is_eu);
    setEditIsIglCountry(country.is_igl_country);
    setEditIsActive(country.is_active);
    setIsEditEnabled(false);
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!selectedCountry) return;
    if (!editIso2.trim() || editIso2.trim().length !== 2) {
      toast.error("ISO2 code must be exactly 2 characters");
      return;
    }
    if (!editName.trim()) {
      toast.error("Country name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res: any = await updateCountry(selectedCountry.id, {
        iso2: editIso2.trim().toUpperCase(),
        name: editName.trim(),
        name_de: editNameDe.trim() || undefined,
        is_eu: editIsEu,
        is_igl_country: editIsIglCountry,
        is_active: editIsActive,
      });
      if (res && res.success) {
        toast.success("Country updated successfully");
        fetchCountries();
        setShowEditModal(false);
        setSelectedCountry(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update country");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDelete = async () => {
    if (!selectedCountry) return;
    if (!confirm(`Are you sure you want to delete ${selectedCountry.name}? This action cannot be undone.`)) return;
    setSubmitting(true);
    try {
      const res: any = await deleteCountry(selectedCountry.id);
      if (res && res.success) {
        toast.success(res.message || "Country deleted successfully");
        fetchCountries();
        setShowEditModal(false);
        setSelectedCountry(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete country");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCancel = () => {
    if (!isEditEnabled) {
      setShowEditModal(false);
      setSelectedCountry(null);
    } else {
      setIsEditEnabled(false);
      if (selectedCountry) {
        setEditIso2(selectedCountry.iso2);
        setEditName(selectedCountry.name);
        setEditNameDe(selectedCountry.name_de || "");
        setEditIsEu(selectedCountry.is_eu);
        setEditIsIglCountry(selectedCountry.is_igl_country);
        setEditIsActive(selectedCountry.is_active);
      }
    }
  };

  const filteredCountries = countries.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.name_de && c.name_de.toLowerCase().includes(q)) ||
      c.iso2.toLowerCase().includes(q)
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
      Add Country
    </CustomButton>
  );

  const filterBar = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by code or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-white"
        />
      </div>
      <button
        onClick={fetchCountries}
        className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 transition-all flex items-center gap-1.5 text-sm font-semibold"
        title="Refresh"
      >
        <RefreshCw className="h-4.5 w-4.5 animate-duration-1000" />
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
            Loading countries...
          </span>
        </div>
      ) : filteredCountries.length === 0 ? (
        <div className="p-12 text-center">
          <Globe2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium font-poppins">No countries found.</p>
          <p className="text-xs text-gray-400 mt-1">
            Try a different search or create a new country.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">ISO2</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Name DE</th>
                <th className="px-6 py-4 text-center">EU Member</th>
                <th className="px-6 py-4 text-center">IGL Country</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredCountries.map((country) => (
                <tr
                  key={country.id}
                  onClick={() => handleRowClick(country)}
                  className={`hover:bg-gray-50/50 cursor-pointer transition-all ${!country.is_active ? "opacity-60" : ""
                    }`}
                >
                  <td className="px-6 py-4 font-mono font-bold text-gray-700">
                    {country.iso2}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {country.name}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {country.name_de || "—"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {country.is_eu ? (
                      <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700">
                        EU
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {country.is_igl_country ? (
                      <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full bg-green-50 text-green-700">
                        IGL
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {country.is_active ? (
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
    <>
      <CustomModal
        isOpen={showModal}
        onClose={resetForm}
        title="Create New Country"
        width="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="country_iso2"
              className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
            >
              ISO2 Code (e.g. DE)
            </label>
            <input
              id="country_iso2"
              type="text"
              maxLength={2}
              disabled={false}
              value={iso2}
              onChange={(e) => setIso2(e.target.value.toUpperCase())}
              placeholder="DE"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50 disabled:opacity-60 disabled:cursor-not-allowed uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="country_name"
              className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
            >
              Name
            </label>
            <input
              id="country_name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Germany"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="country_name_de"
              className="text-xs font-bold text-gray-700 uppercase tracking-wider block"
            >
              Name DE
            </label>
            <input
              id="country_name_de"
              type="text"
              value={nameDe}
              onChange={(e) => setNameDe(e.target.value)}
              placeholder="Deutschland"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-gray-50/50"
            />
          </div>

          <div className="space-y-4 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isEu}
                onChange={(e) => setIsEu(e.target.checked)}
                className="rounded text-[#8CC21B] focus:ring-[#8CC21B]/20 h-4.5 w-4.5 border-gray-300"
              />
              <span className="text-sm font-semibold text-gray-700">
                EU Member Country
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isIglCountry}
                onChange={(e) => setIsIglCountry(e.target.checked)}
                className="rounded text-[#8CC21B] focus:ring-[#8CC21B]/20 h-4.5 w-4.5 border-gray-300"
              />
              <span className="text-sm font-semibold text-gray-700">
                IGL Country (Internal Group List)
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
              Create Country
            </button>
          </div>
        </form>
      </CustomModal>

      {selectedCountry && (
        <CustomModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCountry(null);
          }}
          title=""
          showHeader={false}
          noPadding={true}
          width="max-w-xl"
        >
          <div className="bg-white rounded-2xl overflow-hidden">
            <ModalHeader
              entityName="Country"
              entityNo={`${selectedCountry.name} ${selectedCountry.iso2}`}
              icon={Globe2}
              isEditMode={true}
              isEditEnabled={isEditEnabled}
              onToggleEdit={() => setIsEditEnabled((prev) => !prev)}
              onClose={() => {
                setShowEditModal(false);
                setSelectedCountry(null);
              }}
            />
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    ISO2 Code
                  </label>
                  {isEditEnabled ? (
                    <input
                      type="text"
                      maxLength={2}
                      value={editIso2}
                      onChange={(e) => setEditIso2(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all uppercase font-mono font-bold"
                    />
                  ) : (
                    <div className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-gray-700 text-sm">
                      {selectedCountry.iso2}
                    </div>
                  )}
                </div>

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
                      {selectedCountry.name}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Name DE
                  </label>
                  {isEditEnabled ? (
                    <input
                      type="text"
                      value={editNameDe}
                      onChange={(e) => setEditNameDe(e.target.value)}
                      placeholder="e.g. Deutschland"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all"
                    />
                  ) : (
                    <div className="px-3.5 py-2.5 text-sm font-semibold text-gray-900">
                      {selectedCountry.name_de || "—"}
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-1">
                  {isEditEnabled ? (
                    <>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editIsEu}
                          onChange={(e) => setEditIsEu(e.target.checked)}
                          className="rounded text-[#8CC21B] focus:ring-[#8CC21B]/20 h-4 w-4 border-gray-300"
                        />
                        <span className="text-sm font-semibold text-gray-700">EU Member Country</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editIsIglCountry}
                          onChange={(e) => setEditIsIglCountry(e.target.checked)}
                          className="rounded text-[#8CC21B] focus:ring-[#8CC21B]/20 h-4 w-4 border-gray-300"
                        />
                        <span className="text-sm font-semibold text-gray-700">IGL Country</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editIsActive}
                          onChange={(e) => setEditIsActive(e.target.checked)}
                          className="rounded text-[#8CC21B] focus:ring-[#8CC21B]/20 h-4 w-4 border-gray-300"
                        />
                        <span className="text-sm font-semibold text-gray-700">Active (shows in dropdowns)</span>
                      </label>
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${selectedCountry.is_eu ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>
                        {selectedCountry.is_eu ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        EU Member
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${selectedCountry.is_igl_country ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>
                        {selectedCountry.is_igl_country ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        IGL Country
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${selectedCountry.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>
                        {selectedCountry.is_active ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
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
      title="Country Settings"
      icon={Globe2}
      actionButtons={actionButtons}
      filterBar={filterBar}
      tableContent={tableContent}
      modalContent={modalContent}
    />
  );
}
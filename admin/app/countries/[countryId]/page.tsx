"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Globe2, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import {
  getCountryById,
  updateCountry,
  deleteCountry,
  Country,
} from "@/api/countries";
import { toast } from "react-hot-toast";
import { ModalHeader } from "@/components/UI/ModalHeader";
import { ModalFooter } from "@/components/UI/ModalFooter";

export default function CountryDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const countryId = params?.countryId as string;

  const [country, setCountry] = useState<Country | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditEnabled, setIsEditEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [nameDe, setNameDe] = useState("");
  const [isEu, setIsEu] = useState(false);
  const [isIglCountry, setIsIglCountry] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const fetchCountryDetails = async () => {
    setLoading(true);
    try {
      const res: any = await getCountryById(countryId);
      if (res && res.success && res.data) {
        setCountry(res.data);
        populateForm(res.data);
      } else {
        toast.error("Country details not found");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load country details");
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (data: Country) => {
    setName(data.name);
    setNameDe(data.name_de || "");
    setIsEu(data.is_eu);
    setIsIglCountry(data.is_igl_country);
    setIsActive(data.is_active);
  };

  useEffect(() => {
    if (countryId) fetchCountryDetails();
  }, [countryId]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Country name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res: any = await updateCountry(countryId, {
        name: name.trim(),
        name_de: nameDe.trim() || undefined,
        is_eu: isEu,
        is_igl_country: isIglCountry,
        is_active: isActive,
      });
      if (res && res.success) {
        toast.success("Country updated successfully");
        setCountry(res.data);
        setIsEditEnabled(false);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update country");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!country) return;
    if (!confirm(`Are you sure you want to delete ${country.name}? This action cannot be undone.`)) return;
    try {
      const res: any = await deleteCountry(country.id);
      if (res && res.success) {
        toast.success(res.message || "Country deleted successfully");
        router.push("/countries");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete country");
    }
  };

  const handleCancel = () => {
    setIsEditEnabled(false);
    if (country) populateForm(country);
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

  if (!country) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-red-100 p-8 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Country Not Found</h3>
          <button
            onClick={() => router.push("/countries")}
            className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold transition-all"
          >
            Back to Countries
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-4">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            onClick={() => router.push("/countries")}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span
            className="hover:underline cursor-pointer"
            onClick={() => router.push("/countries")}
          >
            Country Settings
          </span>
          <span>/</span>
          <span className="text-gray-900 font-medium">{country.name}</span>
        </div>

        {/* Detail Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Reusable ModalHeader — has title, icon, ViewEditToggle toggle */}
          <ModalHeader
            entityName={country.name}
            entityNo={country.iso2}
            icon={Globe2}
            isEditMode={true}
            isEditEnabled={isEditEnabled}
            onToggleEdit={() => setIsEditEnabled((prev) => !prev)}
            onClose={() => router.push("/countries")}
          />

          {/* Form Body */}
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* ISO2 — always read-only */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  ISO2 Code
                </label>
                <div className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold text-gray-700 text-sm">
                  {country.iso2}
                </div>
              </div>

              {/* Country Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  Country Name (English)
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
                    {country.name}
                  </div>
                )}
              </div>

              {/* German Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  German Country Name (Name DE)
                </label>
                {isEditEnabled ? (
                  <input
                    type="text"
                    value={nameDe}
                    onChange={(e) => setNameDe(e.target.value)}
                    placeholder="e.g. Deutschland"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all"
                  />
                ) : (
                  <div className="px-3.5 py-2.5 text-sm font-semibold text-gray-900">
                    {country.name_de || "—"}
                  </div>
                )}
              </div>

              {/* Flags / Checkboxes */}
              <div className="space-y-3 pt-1">
                {isEditEnabled ? (
                  <>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isEu}
                        onChange={(e) => setIsEu(e.target.checked)}
                        className="rounded text-[#8CC21B] focus:ring-[#8CC21B]/20 h-4 w-4 border-gray-300"
                      />
                      <span className="text-sm font-semibold text-gray-700">EU Member Country</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isIglCountry}
                        onChange={(e) => setIsIglCountry(e.target.checked)}
                        className="rounded text-[#8CC21B] focus:ring-[#8CC21B]/20 h-4 w-4 border-gray-300"
                      />
                      <span className="text-sm font-semibold text-gray-700">IGL Country</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded text-[#8CC21B] focus:ring-[#8CC21B]/20 h-4 w-4 border-gray-300"
                      />
                      <span className="text-sm font-semibold text-gray-700">Active (shows in dropdowns)</span>
                    </label>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${country.is_eu ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>
                      {country.is_eu ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      EU Member
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${country.is_igl_country ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>
                      {country.is_igl_country ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      IGL Country
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${country.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>
                      {country.is_active ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      Active
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reusable ModalFooter — Delete on lower left, Save/Cancel on right */}
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

"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Globe2,
  ArrowLeft,
  Pencil,
  Trash2,
  Save,
  X,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  getCountryById,
  updateCountry,
  deleteCountry,
  Country,
} from "@/api/countries";
import { toast } from "react-hot-toast";
import CustomButton from "@/components/UI/CustomButton";

export default function CountryDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const countryId = params?.countryId as string;

  const [country, setCountry] = useState<Country | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
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
        setName(res.data.name);
        setNameDe(res.data.name_de || "");
        setIsEu(res.data.is_eu);
        setIsIglCountry(res.data.is_igl_country);
        setIsActive(res.data.is_active);
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

  useEffect(() => {
    if (countryId) {
      fetchCountryDetails();
    }
  }, [countryId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
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
        toast.success("Country details updated successfully");
        setCountry(res.data);
        setEditMode(false);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update country");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!country) return;
    if (!confirm(`Are you sure you want to delete ${country.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res: any = await deleteCountry(country.id);
      if (res && res.success) {
        toast.success(res.message || "Country deleted successfully");
        router.push("/countries");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete country");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-gray-200 border-t-[#8CC21B] animate-spin mx-auto"></div>
          <p className="mt-4 text-sm font-semibold text-gray-500 font-poppins">Loading details...</p>
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
            Back to Countries List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/countries")}
              className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="hover:underline cursor-pointer" onClick={() => router.push("/countries")}>
                  Country Settings
                </span>
                <span>&gt;</span>
                <span className="text-gray-900 font-medium">{country.name}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2">
                <Globe2 className="w-6 h-6 text-[#8CC21B]" />
                {country.name}
              </h1>
            </div>
          </div>
          <div>
            {!editMode && (
              <CustomButton
                gradient={true}
                onClick={() => setEditMode(true)}
                startIcon={<Pencil className="w-4 h-4" />}
              >
                Edit Country
              </CustomButton>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden p-6">
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  ISO2 Code
                </label>
                <div className="px-3.5 py-2.5 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl font-mono font-bold w-full select-none">
                  {country.iso2}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Country Name (English)
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-white"
                  />
                ) : (
                  <div className="px-3.5 py-2.5 bg-white text-gray-900 border border-transparent rounded-xl font-semibold">
                    {country.name}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  German Country Name (Name DE)
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={nameDe}
                    onChange={(e) => setNameDe(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-white"
                  />
                ) : (
                  <div className="px-3.5 py-2.5 bg-white text-gray-900 border border-transparent rounded-xl font-semibold">
                    {country.name_de || "—"}
                  </div>
                )}
              </div>
              <div className="space-y-4 pt-6 md:pt-8">
                {editMode ? (
                  <div className="space-y-4">
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

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded text-[#8CC21B] focus:ring-[#8CC21B]/20 h-4.5 w-4.5 border-gray-300"
                      />
                      <span className="text-sm font-semibold text-gray-700">
                        Active (shows in dropdowns)
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${country.is_eu
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                        }`}
                    >
                      {country.is_eu ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      EU Member
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${country.is_igl_country
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                        }`}
                    >
                      {country.is_igl_country ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      IGL Country
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${country.is_active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                        }`}
                    >
                      {country.is_active ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      Active Status
                    </span>
                  </div>
                )}
              </div>
            </div>
            {editMode && (
              <div className="flex justify-between items-center pt-6 border-t border-gray-100 mt-6">
                <div>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Country
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(false);
                      setName(country.name);
                      setNameDe(country.name_de || "");
                      setIsEu(country.is_eu);
                      setIsIglCountry(country.is_igl_country);
                      setIsActive(country.is_active);
                    }}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2.5 bg-[#8CC21B] hover:bg-[#7ab318] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

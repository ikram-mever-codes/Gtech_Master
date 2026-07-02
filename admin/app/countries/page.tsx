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
  Country,
} from "@/api/countries";
import { toast } from "react-hot-toast";
import MasterPageLayout from "@/components/General/MasterPageLayout";
import CustomModal from "@/components/UI/CustomModal";
import CustomButton from "@/components/UI/CustomButton";
import { useRouter } from "next/navigation";

export default function CountriesPage() {
  const router = useRouter();
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
                  onClick={() => router.push(`/countries/${country.id}`)}
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
            Country Name
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
            German Country Name (Name DE)
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
"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Search,
  Pencil,
  Trash2,
  MapPin,
  FileText,
  User,
  Phone,
  Mail,
  Calendar,
} from "lucide-react";
import {
  getAllGtechCompanies,
  createGtechCompany,
  updateGtechCompany,
  deleteGtechCompany,
  GtechCompany,
  GtechCompanyPayload,
} from "@/api/gtech_companies";
import { toast } from "react-hot-toast";
import MasterPageLayout from "@/components/General/MasterPageLayout";
import CustomModal from "@/components/UI/CustomModal";
import CustomButton from "@/components/UI/CustomButton";
import ModalHeader from "@/components/UI/ModalHeader";
import ModalFooter from "@/components/UI/ModalFooter";

const initialFormState: GtechCompanyPayload = {
  legal_name: "",
  display_name: "",
  additional_address: "",
  street: "",
  postal_code: "",
  city: "",
  country: "",
  shipping_additional_address: "",
  shipping_street: "",
  shipping_postal_code: "",
  shipping_city: "",
  shipping_country: "",
  registry_no: "",
  vat_id: "",
  tax_no: "",
  official_no1: "",
  official_no2: "",
  date_of_incorporation: "",
  contact_person_name: "",
  contact_phone: "",
  contact_email: "",
};

export default function GtechCompaniesPage() {
  const [companies, setCompanies] = useState<GtechCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<GtechCompanyPayload>(initialFormState);
  const [selectedCompany, setSelectedCompany] = useState<GtechCompany | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isEditEnabled, setIsEditEnabled] = useState(false);
  const [editFormData, setEditFormData] = useState<GtechCompanyPayload>(initialFormState);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res: any = await getAllGtechCompanies();
      if (res && res.success) {
        setCompanies(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load GTech companies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    isEdit = false
  ) => {
    const { name, value } = e.target;
    if (isEdit) {
      setEditFormData((prev) => ({ ...prev, [name]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.legal_name.trim()) {
      toast.error("Legal name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res: any = await createGtechCompany(formData);
      if (res && res.success) {
        toast.success("GTech company created successfully");
        fetchData();
        setFormData(initialFormState);
        setShowCreateModal(false);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to create company");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowClick = (company: GtechCompany) => {
    setSelectedCompany(company);
    setEditFormData({
      legal_name: company.legal_name || "",
      display_name: company.display_name || "",
      additional_address: company.additional_address || "",
      street: company.street || "",
      postal_code: company.postal_code || "",
      city: company.city || "",
      country: company.country || "",
      shipping_additional_address: company.shipping_additional_address || "",
      shipping_street: company.shipping_street || "",
      shipping_postal_code: company.shipping_postal_code || "",
      shipping_city: company.shipping_city || "",
      shipping_country: company.shipping_country || "",
      registry_no: company.registry_no || "",
      vat_id: company.vat_id || "",
      tax_no: company.tax_no || "",
      official_no1: company.official_no1 || "",
      official_no2: company.official_no2 || "",
      date_of_incorporation: company.date_of_incorporation
        ? new Date(company.date_of_incorporation).toISOString().split("T")[0]
        : "",
      contact_person_name: company.contact_person_name || "",
      contact_phone: company.contact_phone || "",
      contact_email: company.contact_email || "",
    });
    setIsEditEnabled(false);
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!selectedCompany) return;
    if (!editFormData.legal_name.trim()) {
      toast.error("Legal name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res: any = await updateGtechCompany(selectedCompany.id, editFormData);
      if (res && res.success) {
        toast.success("GTech company updated successfully");
        fetchData();
        setShowEditModal(false);
        setSelectedCompany(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to update company");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDelete = async () => {
    if (!selectedCompany) return;
    if (
      !confirm(
        `Are you sure you want to delete "${selectedCompany.legal_name}"? This action cannot be undone.`
      )
    )
      return;

    setSubmitting(true);
    try {
      const res: any = await deleteGtechCompany(selectedCompany.id);
      if (res && res.success) {
        toast.success("GTech company deleted successfully");
        fetchData();
        setShowEditModal(false);
        setSelectedCompany(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete company");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCompanies = companies.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      (c.legal_name || "").toLowerCase().includes(q) ||
      (c.display_name || "").toLowerCase().includes(q) ||
      (c.city || "").toLowerCase().includes(q) ||
      (c.country || "").toLowerCase().includes(q) ||
      (c.vat_id || "").toLowerCase().includes(q)
    );
  });

  const actionButtons = (
    <CustomButton
      startIcon={<Plus className="w-5 h-5" />}
      gradient={true}
      onClick={() => {
        setFormData(initialFormState);
        setShowCreateModal(true);
      }}
    >
      +GTech
    </CustomButton>
  );

  const filterBar = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by legal name, display name, city, country, VAT ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-white"
        />
      </div>
    </div>
  );

  const renderCompanyFieldsForm = (isEdit = false) => {
    const data = isEdit ? editFormData : formData;
    return (
      <div className="space-y-6">
        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-3">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#8CC21B]" /> Basic Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Legal Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="legal_name"
                value={data.legal_name}
                onChange={(e) => handleInputChange(e, isEdit)}
                placeholder="e.g. GTech Industries GmbH"
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Display Name
              </label>
              <input
                type="text"
                name="display_name"
                value={data.display_name || ""}
                onChange={(e) => handleInputChange(e, isEdit)}
                placeholder="e.g. GTech Germany"
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-3">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#8CC21B]" /> Main Address
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Street & Street No
              </label>
              <input
                type="text"
                name="street"
                value={data.street || ""}
                onChange={(e) => handleInputChange(e, isEdit)}
                placeholder="e.g. Main Street 123"
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Additional Address Line
              </label>
              <input
                type="text"
                name="additional_address"
                value={data.additional_address || ""}
                onChange={(e) => handleInputChange(e, isEdit)}
                placeholder="e.g. Building B, Floor 4"
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Postal Code
              </label>
              <input
                type="text"
                name="postal_code"
                value={data.postal_code || ""}
                onChange={(e) => handleInputChange(e, isEdit)}
                placeholder="e.g. 10115"
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                City
              </label>
              <input
                type="text"
                name="city"
                value={data.city || ""}
                onChange={(e) => handleInputChange(e, isEdit)}
                placeholder="e.g. Berlin"
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Country
              </label>
              <input
                type="text"
                name="country"
                value={data.country || ""}
                onChange={(e) => handleInputChange(e, isEdit)}
                placeholder="e.g. Germany"
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
          </div>
        </div>
        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-3">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-blue-500" /> Shipping Address
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Shipping Street & Street No
              </label>
              <input
                type="text"
                name="shipping_street"
                value={data.shipping_street || ""}
                onChange={(e) => handleInputChange(e, isEdit)}
                placeholder="e.g. Warehouse Str 45"
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Shipping Additional Address Line
              </label>
              <input
                type="text"
                name="shipping_additional_address"
                value={data.shipping_additional_address || ""}
                onChange={(e) => handleInputChange(e, isEdit)}
                placeholder="e.g. Gate 3"
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Shipping Postal Code
              </label>
              <input
                type="text"
                name="shipping_postal_code"
                value={data.shipping_postal_code || ""}
                onChange={(e) => handleInputChange(e, isEdit)}
                placeholder="e.g. 10115"
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Shipping City
              </label>
              <input
                type="text"
                name="shipping_city"
                value={data.shipping_city || ""}
                onChange={(e) => handleInputChange(e, isEdit)}
                placeholder="e.g. Berlin"
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Shipping Country
              </label>
              <input
                type="text"
                name="shipping_country"
                value={data.shipping_country || ""}
                onChange={(e) => handleInputChange(e, isEdit)}
                placeholder="e.g. Germany"
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-3">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-purple-500" /> Legal & Tax Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Registry No
              </label>
              <input
                type="text"
                name="registry_no"
                value={data.registry_no || ""}
                onChange={(e) => handleInputChange(e, isEdit)}
                placeholder="HRB 123456"
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                VAT-ID
              </label>
              <input
                type="text"
                name="vat_id"
                value={data.vat_id || ""}
                onChange={(e) => handleInputChange(e, isEdit)}
                placeholder="DE123456789"
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Tax No
              </label>
              <input
                type="text"
                name="tax_no"
                value={data.tax_no || ""}
                onChange={(e) => handleInputChange(e, isEdit)}
                placeholder="27/123/45678"
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Date of Incorporation
              </label>
              <input
                type="date"
                name="date_of_incorporation"
                value={data.date_of_incorporation || ""}
                onChange={(e) => handleInputChange(e, isEdit)}
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Official No 1
              </label>
              <input
                type="text"
                name="official_no1"
                value={data.official_no1 || ""}
                onChange={(e) => handleInputChange(e, isEdit)}
                placeholder="Official No 1"
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Official No 2
              </label>
              <input
                type="text"
                name="official_no2"
                value={data.official_no2 || ""}
                onChange={(e) => handleInputChange(e, isEdit)}
                placeholder="Official No 2"
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
          </div>
        </div>
        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-3">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4 text-emerald-500" /> Contact Person
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Contact Person Name
              </label>
              <input
                type="text"
                name="contact_person_name"
                value={data.contact_person_name || ""}
                onChange={(e) => handleInputChange(e, isEdit)}
                placeholder="John Doe"
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Phone
              </label>
              <input
                type="text"
                name="contact_phone"
                value={data.contact_phone || ""}
                onChange={(e) => handleInputChange(e, isEdit)}
                placeholder="+49 30 123456"
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Email
              </label>
              <input
                type="email"
                name="contact_email"
                value={data.contact_email || ""}
                onChange={(e) => handleInputChange(e, isEdit)}
                placeholder="contact@gtech.de"
                disabled={isEdit && !isEditEnabled}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white disabled:bg-gray-100"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tableContent = (
    <>
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-[#8CC21B] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-gray-500">
            Loading GTech companies...
          </span>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="p-12 text-center">
          <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium font-poppins">
            No GTech companies found.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Click "+GTech" to create a new GTech company record.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">Legal & Display Name</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">VAT & Registry No</th>
                <th className="px-6 py-4">Contact Person</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredCompanies.map((comp) => (
                <tr
                  key={comp.id}
                  onClick={() => handleRowClick(comp)}
                  className="hover:bg-gray-50/50 cursor-pointer transition-all"
                >
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    <div>
                      <span className="block">{comp.legal_name}</span>
                      {comp.display_name && (
                        <span className="text-xs text-gray-400 font-normal block mt-0.5">
                          {comp.display_name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    <div className="text-xs space-y-0.5">
                      <p className="font-medium text-gray-900">
                        {[comp.city, comp.country].filter(Boolean).join(", ") || "—"}
                      </p>
                      {comp.street && (
                        <p className="text-gray-400">{comp.street}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700 font-mono text-xs">
                    <div>
                      {comp.vat_id && <span className="block font-semibold">VAT: {comp.vat_id}</span>}
                      {comp.registry_no && (
                        <span className="block text-gray-400">Reg: {comp.registry_no}</span>
                      )}
                      {!comp.vat_id && !comp.registry_no && "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    <div className="text-xs space-y-0.5">
                      {comp.contact_person_name && (
                        <p className="font-semibold text-gray-900">
                          {comp.contact_person_name}
                        </p>
                      )}
                      {comp.contact_email && (
                        <p className="text-gray-500">{comp.contact_email}</p>
                      )}
                      {comp.contact_phone && (
                        <p className="text-gray-400">{comp.contact_phone}</p>
                      )}
                      {!comp.contact_person_name && !comp.contact_email && !comp.contact_phone && "—"}
                    </div>
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
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create GTech Company"
        width="max-w-3xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-6 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {renderCompanyFieldsForm(false)}
          <div className="flex gap-3 pt-4 border-t border-gray-100 sticky bottom-0 bg-white z-10 pb-1">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-[#8CC21B] hover:bg-[#7ab318] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              Create GTech Company
            </button>
          </div>
        </form>
      </CustomModal>

      {selectedCompany && (
        <CustomModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCompany(null);
          }}
          title=""
          showHeader={false}
          noPadding={true}
          width="max-w-3xl"
        >
          <div className="bg-white rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <ModalHeader
              entityName="GTech Company"
              entityNo={selectedCompany.legal_name}
              icon={Building2}
              isEditMode={true}
              isEditEnabled={isEditEnabled}
              onToggleEdit={() => setIsEditEnabled((prev) => !prev)}
              onClose={() => {
                setShowEditModal(false);
                setSelectedCompany(null);
              }}
            />
            <div className="p-6 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {renderCompanyFieldsForm(true)}
            </div>
            <ModalFooter
              isEditMode={true}
              isEditEnabled={isEditEnabled}
              onDelete={handleEditDelete}
              onCancel={() => {
                if (!isEditEnabled) {
                  setShowEditModal(false);
                  setSelectedCompany(null);
                } else {
                  setIsEditEnabled(false);
                }
              }}
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
      title="GTech Companies"
      icon={Building2}
      actionButtons={actionButtons}
      filterBar={filterBar}
      tableContent={tableContent}
      modalContent={modalContent}
    />
  );
}
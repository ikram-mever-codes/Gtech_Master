"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    ArrowPathIcon,
    XMarkIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    TruckIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/UI/PageHeader";
import { Truck } from "lucide-react";
import { toast } from "react-hot-toast";
import {
    getAllSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    Supplier,
} from "@/api/suppliers";
import { loadingStyles, successStyles, errorStyles } from "@/utils/constants";

interface PaginationState {
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
}

const initialFormData: Partial<Supplier> = {
    name: "",
    name_cn: "",
    company_name: "",
    extra_note: "",
    min_order_value: 0,
    order_type_id: 1,
    is_fully_prepared: "",
    is_tax_included: "",
    is_freight_included: "",
    province: "",
    city: "",
    street: "",
    full_address: "",
    contact_person: "",
    phone: "",
    mobile: "",
    email: "",
    website: "",
    bank_name: "",
    account_number: "",
    beneficiary: "",
    deposit: 0,
    bbgd: 0,
    bagd: 0,
    percentage: 0,
    percentage2: 0,
    percentage3: 0,
};

const SuppliersPage: React.FC = () => {
    const router = useRouter();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [pagination, setPagination] = useState<PaginationState>({
        page: 1,
        limit: 30,
        totalRecords: 0,
        totalPages: 1,
    });

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<Partial<Supplier>>(initialFormData);
    const [isEditEnabled, setIsEditEnabled] = useState(false);
    const [activeSection, setActiveSection] = useState<"general" | "address" | "contact" | "banking" | "financial">("general");

    const formatDate = (dateString: string | Date | undefined) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const fetchSuppliers = useCallback(async () => {
        setLoading(true);
        try {
            const response: any = await getAllSuppliers({
                page: pagination.page,
                limit: pagination.limit,
                search,
            });
            setSuppliers(response.data || []);
            if (response.pagination) {
                setPagination(response.pagination);
            }
        } catch (error) {
            console.error("Error fetching suppliers:", error);
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search]);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > pagination.totalPages) return;
        setPagination({ ...pagination, page: newPage });
    };

    const handleOpenCreate = () => {
        setModalMode("create");
        setFormData({ ...initialFormData });
        setIsEditEnabled(true);
        setActiveSection("general");
        setEditingId(null);
        setShowModal(true);
    };

    const handleOpenEdit = async (id: number) => {
        try {
            setLoading(true);
            const response: any = await getSupplierById(id);
            if (response.success && response.data) {
                setFormData(response.data);
                setModalMode("edit");
                setEditingId(id);
                setIsEditEnabled(false);
                setActiveSection("general");
                setShowModal(true);
            }
        } catch (error) {
            toast.error("Failed to load supplier", errorStyles);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.name?.trim()) {
            toast.error("Supplier name is required", errorStyles);
            return;
        }

        try {
            setLoading(true);
            if (modalMode === "create") {
                await createSupplier(formData);
                toast.success("Supplier created successfully", successStyles);
            } else if (modalMode === "edit" && editingId) {
                await updateSupplier(editingId, formData);
                toast.success("Supplier updated successfully", successStyles);
            }
            setShowModal(false);
            fetchSuppliers();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Operation failed", errorStyles);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this supplier? This action cannot be undone.")) return;

        try {
            setLoading(true);
            await deleteSupplier(id);
            toast.success("Supplier deleted successfully", successStyles);
            fetchSuppliers();
        } catch (error) {
            toast.error("Failed to delete supplier", errorStyles);
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field: string, value: any) => {
        setFormData({ ...formData, [field]: value });
    };

    const sectionTabs = [
        { key: "general", label: "General", icon: "📋" },
        { key: "address", label: "Address", icon: "📍" },
        { key: "contact", label: "Contact", icon: "📞" },
        { key: "banking", label: "Banking", icon: "🏦" },
        { key: "financial", label: "Financial", icon: "💰" },
    ] as const;

    return (
        <div className="w-full mx-auto">
            <div
                className="bg-white min-h-[80vh] rounded-lg shadow-sm pb-8 p-6"
                style={{
                    border: "1px solid #e0e0e0",
                    background: "linear-gradient(to bottom, #ffffff, #f9f9f9)",
                }}
            >
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push("/items")}
                            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                        </button>
                        <PageHeader title="Suppliers Management" icon={Truck} />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={fetchSuppliers}
                            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
                        >
                            <ArrowPathIcon className="w-5 h-5" />
                            Refresh
                        </button>

                        <button
                            onClick={handleOpenCreate}
                            className="px-4 py-2.5 bg-[#8CC21B] text-white rounded-lg font-medium hover:bg-[#7ab318] transition-all flex items-center gap-2 shadow-sm"
                        >
                            <PlusIcon className="w-5 h-5" />
                            New Supplier
                        </button>
                    </div>
                </div>

                <div className="mb-6">
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-6 h-6 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search suppliers by name, company, email, contact..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8CC21B] focus:border-[#8CC21B] transition-all text-gray-700 placeholder-gray-400"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="p-20 flex justify-center items-center">
                            <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#8CC21B]" />
                                <p className="mt-4 text-gray-600">Loading suppliers...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto w-full">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                #
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Name
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Chinese Name
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Company
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Contact Person
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                City
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Email
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Phone
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Created
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {suppliers.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={10}
                                                    className="px-4 py-12 text-center text-gray-500"
                                                >
                                                    <TruckIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                                    <p className="text-lg font-medium">No suppliers found</p>
                                                    <p className="text-sm mt-1">Click &quot;New Supplier&quot; to add one.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            suppliers.map((supplier, index) => (
                                                <tr
                                                    key={supplier.id}
                                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                                    onClick={() => handleOpenEdit(supplier.id)}
                                                >
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm text-gray-500">
                                                            {(pagination.page - 1) * pagination.limit + index + 1}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-gray-900">
                                                            {supplier.name || "-"}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm text-gray-900">
                                                            {supplier.name_cn || "-"}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm text-gray-900">
                                                            {supplier.company_name || "-"}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm text-gray-900">
                                                            {supplier.contact_person || "-"}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm text-gray-900">
                                                            {supplier.city || "-"}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm text-gray-900">
                                                            {supplier.email || "-"}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm text-gray-900">
                                                            {supplier.phone || "-"}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm text-gray-600 text-nowrap">
                                                            {formatDate(supplier.created_at)}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenEdit(supplier.id);
                                                                }}
                                                                className="text-green-600 hover:text-green-900 p-1.5 rounded-md hover:bg-green-50 transition-all"
                                                                title="Edit"
                                                            >
                                                                <PencilIcon className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDelete(supplier.id);
                                                                }}
                                                                className="text-red-600 hover:text-red-900 p-1.5 rounded-md hover:bg-red-50 transition-all"
                                                                title="Delete"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                    Showing{" "}
                                    {Math.min(
                                        (pagination.page - 1) * pagination.limit + 1,
                                        pagination.totalRecords
                                    )}{" "}
                                    to{" "}
                                    {Math.min(
                                        pagination.page * pagination.limit,
                                        pagination.totalRecords
                                    )}{" "}
                                    of {pagination.totalRecords} suppliers
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-all flex items-center gap-1"
                                    >
                                        <ChevronLeftIcon className="w-4 h-4" />
                                        Previous
                                    </button>
                                    <span className="text-sm text-gray-600 px-3">
                                        Page {pagination.page} of {pagination.totalPages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page === pagination.totalPages}
                                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-all flex items-center gap-1"
                                    >
                                        Next
                                        <ChevronRightIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#8CC21B]/10 flex items-center justify-center">
                                    <TruckIcon className="w-5 h-5 text-[#8CC21B]" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {modalMode === "edit" ? "Edit Supplier" : "Create New Supplier"}
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        {modalMode === "edit"
                                            ? "Toggle edit mode to modify supplier details"
                                            : "Fill in the details to create a new supplier"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {modalMode === "edit" && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-600">
                                            {isEditEnabled ? "Editing" : "View Only"}
                                        </span>
                                        <button
                                            onClick={() => setIsEditEnabled(!isEditEnabled)}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isEditEnabled ? "bg-[#8CC21B]" : "bg-gray-300"
                                                }`}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEditEnabled ? "translate-x-5" : "translate-x-0"
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                )}
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-2 border-b border-gray-200 bg-gray-50/50 flex-shrink-0">
                            <nav className="flex space-x-1">
                                {sectionTabs.map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveSection(tab.key)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeSection === tab.key
                                            ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                                            : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                                            }`}
                                    >
                                        <span>{tab.icon}</span>
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {activeSection === "general" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Supplier Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name || ""}
                                            onChange={(e) => updateField("name", e.target.value)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter supplier name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Chinese Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name_cn || ""}
                                            onChange={(e) => updateField("name_cn", e.target.value)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter Chinese name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Company Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.company_name || ""}
                                            onChange={(e) => updateField("company_name", e.target.value)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter company name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Order Type ID
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.order_type_id || 1}
                                            onChange={(e) => updateField("order_type_id", Number(e.target.value))}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Min Order Value
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.min_order_value || 0}
                                            onChange={(e) => updateField("min_order_value", Number(e.target.value))}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter minimum order value"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Extra Note
                                        </label>
                                        <textarea
                                            value={formData.extra_note || ""}
                                            onChange={(e) => updateField("extra_note", e.target.value)}
                                            disabled={!isEditEnabled}
                                            rows={3}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed resize-none"
                                            placeholder="Enter extra notes"
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 md:col-span-2">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                Fully Prepared
                                            </label>
                                            <select
                                                value={formData.is_fully_prepared || ""}
                                                onChange={(e) => updateField("is_fully_prepared", e.target.value)}
                                                disabled={!isEditEnabled}
                                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            >
                                                <option value="">Select</option>
                                                <option value="Yes">Yes</option>
                                                <option value="No">No</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                Tax Included
                                            </label>
                                            <select
                                                value={formData.is_tax_included || ""}
                                                onChange={(e) => updateField("is_tax_included", e.target.value)}
                                                disabled={!isEditEnabled}
                                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            >
                                                <option value="">Select</option>
                                                <option value="Y">Yes</option>
                                                <option value="N">No</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                Freight Included
                                            </label>
                                            <select
                                                value={formData.is_freight_included || ""}
                                                onChange={(e) => updateField("is_freight_included", e.target.value)}
                                                disabled={!isEditEnabled}
                                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            >
                                                <option value="">Select</option>
                                                <option value="Y">Yes</option>
                                                <option value="N">No</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === "address" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Province
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.province || ""}
                                            onChange={(e) => updateField("province", e.target.value)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter province"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            City
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.city || ""}
                                            onChange={(e) => updateField("city", e.target.value)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter city"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Street
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.street || ""}
                                            onChange={(e) => updateField("street", e.target.value)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter street address"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Full Address
                                        </label>
                                        <textarea
                                            value={formData.full_address || ""}
                                            onChange={(e) => updateField("full_address", e.target.value)}
                                            disabled={!isEditEnabled}
                                            rows={3}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed resize-none"
                                            placeholder="Enter full address"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeSection === "contact" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Contact Person
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.contact_person || ""}
                                            onChange={(e) => updateField("contact_person", e.target.value)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter contact person name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Phone
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.phone || ""}
                                            onChange={(e) => updateField("phone", e.target.value)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter phone number"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Mobile
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.mobile || ""}
                                            onChange={(e) => updateField("mobile", e.target.value)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter mobile number"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email || ""}
                                            onChange={(e) => updateField("email", e.target.value)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter email address"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Website
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.website || ""}
                                            onChange={(e) => updateField("website", e.target.value)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter website URL"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeSection === "banking" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Bank Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.bank_name || ""}
                                            onChange={(e) => updateField("bank_name", e.target.value)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter bank name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Account Number
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.account_number || ""}
                                            onChange={(e) => updateField("account_number", e.target.value)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter account number"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Beneficiary
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.beneficiary || ""}
                                            onChange={(e) => updateField("beneficiary", e.target.value)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter beneficiary name"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeSection === "financial" && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Deposit
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.deposit || 0}
                                            onChange={(e) => updateField("deposit", Number(e.target.value))}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter deposit"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            BBGD
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.bbgd || 0}
                                            onChange={(e) => updateField("bbgd", Number(e.target.value))}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter BBGD value"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            BAGD
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.bagd || 0}
                                            onChange={(e) => updateField("bagd", Number(e.target.value))}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter BAGD value"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Percentage
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.percentage || 0}
                                            onChange={(e) => updateField("percentage", Number(e.target.value))}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter percentage"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Percentage 2
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.percentage2 || 0}
                                            onChange={(e) => updateField("percentage2", Number(e.target.value))}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter percentage 2"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Percentage 3
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.percentage3 || 0}
                                            onChange={(e) => updateField("percentage3", Number(e.target.value))}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/50 focus:border-[#8CC21B] transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter percentage 3"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/80 flex-shrink-0">
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                                >
                                    {isEditEnabled ? "Cancel" : "Close"}
                                </button>
                                {isEditEnabled && (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!formData.name?.trim() || loading}
                                        className="px-5 py-2.5 text-sm font-medium bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
                                    >
                                        {loading && (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        )}
                                        {modalMode === "edit" ? "Update Supplier" : "Create Supplier"}
                                    </button>
                                )}
                                {modalMode === "edit" && !isEditEnabled && (
                                    <button
                                        onClick={() => handleDelete(editingId!)}
                                        className="px-5 py-2.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all flex items-center gap-2"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                        Delete Supplier
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuppliersPage;

"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
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
    ChevronUpIcon,
    ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useTableSort, sortData } from "@/hooks/useTableSort";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/UI/PageHeader";
import ModalHeader from "@/components/UI/ModalHeader";
import ModalFooter from "@/components/UI/ModalFooter";
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
import { EntityTagSelector, TagBadge, sortTags, type Tag } from "@/components/Tags/TagManager";
import { TagFilterSelector } from "@/components/Tags/TagFilterSelector";
import { formatDate as centralFormatDate } from "@/utils/date";

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

export const SuppliersPage = React.forwardRef<
    { openCreate: () => void },
    { isEmbedded?: boolean }
>((props, ref) => {
    const { isEmbedded = false } = props;
    const router = useRouter();
    const searchParams = useSearchParams();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [pagination, setPagination] = useState<PaginationState>({
        page: 1,
        limit: 30,
        totalRecords: 0,
        totalPages: 1,
    });

    const [tagsFilter, setTagsFilter] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<Partial<Supplier>>(initialFormData);
    const [isEditEnabled, setIsEditEnabled] = useState(false);
    const [activeSection, setActiveSection] = useState<"general" | "address" | "contact" | "banking" | "financial">("general");

    const { sortBy, sortOrder, handleSort } = useTableSort();

    const sortedSuppliers = useMemo(() => {
        return sortData(suppliers, sortBy, sortOrder, {
            name: (s) => (s.name || '').toLowerCase(),
            name_cn: (s) => (s.name_cn || '').toLowerCase(),
            company_name: (s) => (s.company_name || '').toLowerCase(),
            contact_person: (s) => (s.contact_person || '').toLowerCase(),
            city: (s) => (s.city || '').toLowerCase(),
            email: (s) => (s.email || '').toLowerCase(),
            phone: (s) => (s.phone || '').toLowerCase(),
            created_at: (s) => (s.created_at ? new Date(s.created_at).getTime() : 0),
        });
    }, [suppliers, sortBy, sortOrder]);

    const renderSortIcon = (field: string) => {
        if (sortBy === field) {
            if (sortOrder === 'ASC') {
                return <ChevronUpIcon className="h-3.5 w-3.5 text-[#8CC21B] stroke-[3px]" />;
            }
            if (sortOrder === 'DESC') {
                return <ChevronDownIcon className="h-3.5 w-3.5 text-[#8CC21B] stroke-[3px]" />;
            }
        }
        return (
            <span className="text-gray-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10l5-5 5 5M7 14l5 5 5-5" />
                </svg>
            </span>
        );
    };

    const formatDate = (dateString: string | Date | undefined) => {
        return centralFormatDate(dateString);
    };

    const fetchSuppliers = useCallback(async () => {
        setLoading(true);
        try {
            const response: any = await getAllSuppliers({
                page: pagination.page,
                limit: pagination.limit,
                search,
                tags: tagsFilter,
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
    }, [pagination.page, pagination.limit, search, tagsFilter]);

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

    React.useImperativeHandle(ref, () => ({
        openCreate: handleOpenCreate
    }));

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

    useEffect(() => {
        const supplierId = searchParams.get("supplierId");
        if (supplierId) {
            handleOpenEdit(Number(supplierId));
        }
    }, [searchParams]);

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

    const renderContent = () => (
        <>
            <div className="mb-6 p-3 bg-white border border-gray-200 rounded-md shadow-sm">
                <div className="flex flex-wrap items-center gap-2 w-full">
                    <div className="flex items-center gap-1.5 text-gray-400 shrink-0 select-none px-1">
                        <FunnelIcon className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="relative flex-grow flex-shrink flex-1 min-w-[240px]">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search suppliers by name, company, email, contact..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-[#8CC21B]/40 focus:border-transparent transition-all ${
                                    search
                                        ? "font-bold text-emerald-600 border-emerald-500 bg-emerald-50/20"
                                        : "text-gray-900 border-gray-300 bg-white"
                                }`}
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                                >
                                    <XMarkIcon className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex-grow flex-shrink flex-1 min-w-[200px]">
                        <TagFilterSelector
                            category="supplier"
                            compact={true}
                            onChange={(tagString) => setTagsFilter(tagString)}
                            onReset={() => setTagsFilter("")}
                        />
                    </div>
                    {(search || tagsFilter) && (
                        <button
                            onClick={() => {
                                setSearch("");
                                setTagsFilter("");
                            }}
                            className="px-3 py-2 text-sm font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                            Reset
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
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        <th className="px-3 py-3 w-10 text-center">#</th>
                                        <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-900 group" onClick={() => handleSort('name')}>
                                            <div className="inline-flex items-center gap-1.5">
                                                <span>Name</span>
                                                {renderSortIcon('name')}
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-900 group" onClick={() => handleSort('name_cn')}>
                                            <div className="inline-flex items-center gap-1.5">
                                                <span>Chinese Name</span>
                                                {renderSortIcon('name_cn')}
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-900 group" onClick={() => handleSort('company_name')}>
                                            <div className="inline-flex items-center gap-1.5">
                                                <span>Company</span>
                                                {renderSortIcon('company_name')}
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-900 group" onClick={() => handleSort('contact_person')}>
                                            <div className="inline-flex items-center gap-1.5">
                                                <span>Contact</span>
                                                {renderSortIcon('contact_person')}
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-900 group" onClick={() => handleSort('city')}>
                                            <div className="inline-flex items-center gap-1.5">
                                                <span>City</span>
                                                {renderSortIcon('city')}
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-900 group" onClick={() => handleSort('email')}>
                                            <div className="inline-flex items-center gap-1.5">
                                                <span>Email</span>
                                                {renderSortIcon('email')}
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-900 group" onClick={() => handleSort('phone')}>
                                            <div className="inline-flex items-center gap-1.5">
                                                <span>Phone</span>
                                                {renderSortIcon('phone')}
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-900 group" onClick={() => handleSort('created_at')}>
                                            <div className="inline-flex items-center gap-1.5">
                                                <span>Created</span>
                                                {renderSortIcon('created_at')}
                                            </div>
                                        </th>
                                        <th className="px-4 py-3">Tags</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {sortedSuppliers.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={11}
                                                className="px-4 py-12 text-center text-gray-500"
                                            >
                                                <TruckIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                                <p className="text-lg font-medium">No suppliers found</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        sortedSuppliers.map((supplier, index) => (
                                            <tr
                                                key={supplier.id}
                                                className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                                                onClick={() => handleOpenEdit(supplier.id)}
                                            >
                                                <td className="px-3 py-4 text-center text-gray-400 font-mono">
                                                    {(pagination.page - 1) * pagination.limit + index + 1}
                                                </td>
                                                <td className="px-4 py-4 font-semibold text-gray-900 truncate max-w-[120px]" title={supplier.name}>
                                                    {supplier.name || "-"}
                                                </td>
                                                <td className="px-4 py-4 text-gray-600 truncate max-w-[100px]" title={supplier.name_cn}>
                                                    {supplier.name_cn || "-"}
                                                </td>
                                                <td className="px-4 py-4 text-gray-600 truncate max-w-[130px]" title={supplier.company_name}>
                                                    {supplier.company_name || "-"}
                                                </td>
                                                <td className="px-4 py-4 text-gray-600 truncate max-w-[110px]" title={supplier.contact_person}>
                                                    {supplier.contact_person || "-"}
                                                </td>
                                                <td className="px-4 py-4 text-gray-600">
                                                    {supplier.city || "-"}
                                                </td>
                                                <td className="px-4 py-4 text-gray-600 truncate max-w-[120px]" title={supplier.email}>
                                                    {supplier.email || "-"}
                                                </td>
                                                <td className="px-4 py-4 text-gray-600 font-mono">
                                                    {supplier.phone || "-"}
                                                </td>
                                                <td className="px-4 py-4 text-gray-500 whitespace-nowrap text-xs">
                                                    {formatDate(supplier.created_at)}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                                                        {sortTags(supplier.tags || [], supplier.tagOrder).map((tag: Tag) => (
                                                            <TagBadge key={tag.id} tag={tag} size="sm" />
                                                        ))}
                                                        {(!supplier.tags || supplier.tags.length === 0) && (
                                                            <span className="text-xs text-gray-400">—</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenEdit(supplier.id);
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                            title="Edit"
                                                        >
                                                            <PencilIcon className="w-4.5 h-4.5" />
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

            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
                        <ModalHeader
                            entityName="Supplier"
                            entityNo={modalMode === "edit" ? editingId : null}
                            icon={TruckIcon}
                            isEditMode={modalMode === "edit"}
                            isEditEnabled={isEditEnabled}
                            onToggleEdit={() => setIsEditEnabled(!isEditEnabled)}
                            onClose={() => setShowModal(false)}
                        />

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

                                    {modalMode === "edit" && editingId && (
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                Tags
                                            </label>
                                            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50/50 min-h-[44px] flex items-center">
                                                <EntityTagSelector
                                                    entityId={editingId}
                                                    entityType="supplier"
                                                    initialTags={(formData.tags as Tag[]) || []}
                                                    tagOrder={formData.tagOrder}
                                                    disabled={!isEditEnabled}
                                                    onTagsUpdated={(tags) => {
                                                        updateField("tags", tags);
                                                        updateField("tagOrder", tags.map((t) => t.id).join(","));
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}

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
                                            Phone Number
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
                                            Mobile Number
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
                                            Email Address
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
                                            type="url"
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

                        <ModalFooter
                            isEditMode={modalMode === "edit"}
                            isEditEnabled={isEditEnabled}
                            onDelete={() => handleDelete(editingId!)}
                            onCancel={() => setShowModal(false)}
                            onSave={handleSubmit}
                            saveLabel={modalMode === "edit" ? "Update Supplier" : "Create Supplier"}
                            loading={loading}
                            saveDisabled={!formData.name?.trim() || loading}
                        />
                    </div>
                </div>
            )}
        </>
    );

    if (isEmbedded) {
        return <div className="w-full">{renderContent()}</div>;
    }

    return (
        <div className="w-full mx-auto">
            <div
                className="bg-white min-h-[80vh] rounded-lg shadow-sm pb-8 p-6"
                style={{
                    border: "1px solid #e0e0e0",
                    background: "linear-gradient(to bottom, #ffffff, #f9f9f9)",
                }}
            >
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
                {renderContent()}
            </div>
        </div>
    );
});

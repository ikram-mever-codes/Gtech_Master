"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Select from "react-select";
import {
    ArrowPathIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    EyeIcon,
    XMarkIcon,
    TruckIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import {
    getAllCargos,
    getCargoById,
    createCargo,
    updateCargo,
    deleteCargo,
    assignOrdersToCargo,
    removeOrderFromCargo,
    getCargoOrders,
    CargoType,
    CARGO_STATUSES,
    getCargoStatusColor,
} from "@/api/cargos";
import { getAllOrders, type Order } from "@/api/orders";
import { getAllCustomers } from "@/api/customers";
import { errorStyles, successStyles } from "@/utils/constants";
import BillToShipToForm, { BillToShipToData } from "../General/BillToShipToForm";
import { getAllCargoTypes, CargoTypeObj } from "@/api/cargo_types";


type Customer = {
    id: string | number;
    companyName: string;
    deliveryCity?: string;
    deliveryCountry?: string;
    city?: string;
    country?: string;
    addressLine1?: string;
    contactEmail?: string;
    email?: string;
    legalName?: string;
    contactPhoneNumber?: string;
    deliveryAddressLine1?: string;
};

interface CargosTabProps {
    customers?: Customer[];
}

const formatDate = (dateString: string | Date | undefined | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const formatDateInput = (dateString: string | Date | undefined | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
};

const CargosTab: React.FC<CargosTabProps> = ({ customers: externalCustomers }) => {
    const [cargos, setCargos] = useState<CargoType[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 30,
        totalRecords: 0,
        totalPages: 1,
    });

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isEditEnabled, setIsEditEnabled] = useState(false);

    const [formData, setFormData] = useState<Partial<CargoType>>({
        customer_id: undefined,
        cargo_type_id: undefined,
        cargo_no: "",
        pickup_date: "",
        dep_date: "",
        eta: "",
        note: "",
        online_track: "",
        remark: "",
        cargo_status: "Open",
        shipped_at: "",
        customer_type: "Other Customer",
        bill_to_company_name: "",
        bill_to_display_name: "",
        bill_to_phone_no: "",
        bill_to_tax_no: "",
        bill_to_email: "",
        bill_to_website: "",
        bill_to_contact_person: "",
        bill_to_contact_phone: "",
        bill_to_contact_mobile: "",
        bill_to_contact_email: "",
        bill_to_country: "",
        bill_to_city: "",
        bill_to_postal_code: "",
        bill_to_full_address: "",
        ship_to_company_name: "",
        ship_to_display_name: "",
        ship_to_contact_person: "",
        ship_to_contact_phone: "",
        ship_to_country: "",
        ship_to_city: "",
        ship_to_postal_code: "",
        ship_to_full_address: "",
        ship_to_remarks: "",
    });

    const [assignedOrderIds, setAssignedOrderIds] = useState<number[]>([]);
    const [cargoOrderItems, setCargoOrderItems] = useState<any[]>([]);
    const [cargoOrders, setCargoOrders] = useState<any[]>([]);

    const [allOrders, setAllOrders] = useState<Order[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [cargoTypes, setCargoTypes] = useState<CargoTypeObj[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    useEffect(() => {
        if (externalCustomers && externalCustomers.length > 0) {
            setCustomers(externalCustomers);
        }
    }, [externalCustomers]);

    const [activeSection, setActiveSection] = useState<"details" | "billto_shipto" | "orders">("details");

    const fetchCargos = useCallback(async () => {
        setLoading(true);
        try {
            const response: any = await getAllCargos({
                page: pagination.page,
                limit: pagination.limit,
                search,
            });
            setCargos(response.data || []);
            if (response.pagination) {
                setPagination(response.pagination);
            }
        } catch (error) {
            console.error("Error fetching cargos:", error);
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search]);

    const fetchOrders = useCallback(async () => {
        setLoadingOrders(true);
        try {
            const response: any = await getAllOrders();
            if (response?.success) setAllOrders(response.data || []);
            else if (response?.data) setAllOrders(response.data || []);
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setLoadingOrders(false);
        }
    }, []);

    const fetchCargoTypesData = useCallback(async () => {
        try {
            const response: any = await getAllCargoTypes();
            const data = response?.data?.data || response?.data || response;
            setCargoTypes(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Error fetching cargo types:", e);
        }
    }, []);

    const fetchCustomersIfNeeded = useCallback(async () => {
        if (externalCustomers && externalCustomers.length > 0) return;
        try {
            const response = await getAllCustomers();
            const data = response?.data ?? response;
            const arr = Array.isArray(data) ? data : data?.customers || [];
            setCustomers(arr);
        } catch (e) {
            console.error("Error fetching customers:", e);
        }
    }, [externalCustomers]);

    useEffect(() => {
        fetchCargos();
    }, [fetchCargos]);

    useEffect(() => {
        fetchOrders();
        fetchCustomersIfNeeded();
        fetchCargoTypesData();
    }, [fetchOrders, fetchCustomersIfNeeded, fetchCargoTypesData]);

    const handlePageChange = (newPage: number) => {
        if (newPage < 1 || newPage > pagination.totalPages) return;
        setPagination({ ...pagination, page: newPage });
    };

    const getCustomerName = useCallback(
        (customerId: any) =>
            customers.find((c) => String(c.id) === String(customerId))?.companyName ?? "-",
        [customers]
    );

    const availableOrders = useMemo(() => {
        return allOrders.filter((o) => !assignedOrderIds.includes(o.id));
    }, [allOrders, assignedOrderIds]);

    const getCargoTypeName = useCallback(
        (id: any) =>
            cargoTypes.find((ct) => String(ct.id) === String(id))?.type ?? "-",
        [cargoTypes]
    );

    const orderOptions = useMemo(
        () =>
            availableOrders.map((o) => ({
                value: String(o.id),
                label: `${o.order_no} (ID: ${o.id})`,
            })),
        [availableOrders]
    );

    const cargoTypeOptions = useMemo(
        () =>
            cargoTypes.map((ct) => ({
                value: String(ct.id),
                label: `${ct.type} (${ct.duration || 0} days)`,
            })),
        [cargoTypes]
    );

    const customerOptions = useMemo(
        () =>
            customers.map((c) => ({
                value: String(c.id),
                label: `${c.id} - ${c.companyName} - ${c.deliveryCity || c.city || "-"}`,
            })),
        [customers]
    );

    const resetForm = () => {
        setFormData({
            customer_id: undefined,
            cargo_type_id: undefined,
            cargo_no: "",
            pickup_date: "",
            dep_date: "",
            eta: "",
            note: "",
            online_track: "",
            remark: "",
            cargo_status: "Open",
            shipped_at: "",
            customer_type: "Other Customer",
            bill_to_company_name: "",
            bill_to_display_name: "",
            bill_to_phone_no: "",
            bill_to_tax_no: "",
            bill_to_email: "",
            bill_to_website: "",
            bill_to_contact_person: "",
            bill_to_contact_phone: "",
            bill_to_contact_mobile: "",
            bill_to_contact_email: "",
            bill_to_country: "",
            bill_to_city: "",
            bill_to_postal_code: "",
            bill_to_full_address: "",
            ship_to_company_name: "",
            ship_to_display_name: "",
            ship_to_contact_person: "",
            ship_to_contact_phone: "",
            ship_to_country: "",
            ship_to_city: "",
            ship_to_postal_code: "",
            ship_to_full_address: "",
            ship_to_remarks: "",
        });
        setAssignedOrderIds([]);
        setCargoOrderItems([]);
        setCargoOrders([]);
        setActiveSection("details");
    };

    const handleOpenCreate = () => {
        resetForm();
        setModalMode("create");
        setIsEditEnabled(true);
        setEditingId(null);
        setShowModal(true);
    };

    const handleOpenEdit = async (id: number) => {
        try {
            setLoading(true);
            const response: any = await getCargoById(id);
            if (response.success && response.data) {
                const cargo = response.data;
                setFormData({
                    customer_id: cargo.customer_id,
                    cargo_type_id: cargo.cargo_type_id,
                    cargo_no: cargo.cargo_no || "",
                    pickup_date: formatDateInput(cargo.pickup_date),
                    dep_date: formatDateInput(cargo.dep_date),
                    eta: formatDateInput(cargo.eta),
                    note: cargo.note || "",
                    online_track: cargo.online_track || "",
                    remark: cargo.remark || "",
                    cargo_status: cargo.cargo_status || "Open",
                    shipped_at: formatDateInput(cargo.shipped_at),
                    customer_type: cargo.customer_type || "Other Customer",
                    bill_to_company_name: cargo.bill_to_company_name || "",
                    bill_to_display_name: cargo.bill_to_display_name || "",
                    bill_to_phone_no: cargo.bill_to_phone_no || "",
                    bill_to_tax_no: cargo.bill_to_tax_no || "",
                    bill_to_email: cargo.bill_to_email || "",
                    bill_to_website: cargo.bill_to_website || "",
                    bill_to_contact_person: cargo.bill_to_contact_person || "",
                    bill_to_contact_phone: cargo.bill_to_contact_phone || "",
                    bill_to_contact_mobile: cargo.bill_to_contact_mobile || "",
                    bill_to_contact_email: cargo.bill_to_contact_email || "",
                    bill_to_country: cargo.bill_to_country || "",
                    bill_to_city: cargo.bill_to_city || "",
                    bill_to_postal_code: cargo.bill_to_postal_code || "",
                    bill_to_full_address: cargo.bill_to_full_address || "",
                    ship_to_company_name: cargo.ship_to_company_name || "",
                    ship_to_display_name: cargo.ship_to_display_name || "",
                    ship_to_contact_person: cargo.ship_to_contact_person || "",
                    ship_to_contact_phone: cargo.ship_to_contact_phone || "",
                    ship_to_country: cargo.ship_to_country || "",
                    ship_to_city: cargo.ship_to_city || "",
                    ship_to_postal_code: cargo.ship_to_postal_code || "",
                    ship_to_full_address: cargo.ship_to_full_address || "",
                    ship_to_remarks: cargo.ship_to_remarks || "",
                });
                setAssignedOrderIds((cargo.orders || []).map((o: any) => o.id));
                setCargoOrders(cargo.orders || []);
                setCargoOrderItems(cargo.orderItems || []);
                setModalMode("edit");
                setEditingId(id);
                setIsEditEnabled(false);
                setActiveSection("details");
                setShowModal(true);
            }
        } catch (error) {
            toast.error("Failed to load cargo", errorStyles);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenView = async (id: number) => {
        await handleOpenEdit(id);
        setModalMode("view");
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const payload: any = {
                ...formData,
                orders: assignedOrderIds,
            };

            if (modalMode === "create") {
                await createCargo(payload);
            } else if (modalMode === "edit" && editingId) {
                await updateCargo(editingId, payload);
            }
            setShowModal(false);
            fetchCargos();
        } catch (error: any) {
            // error already handled in API
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this cargo? This action cannot be undone.")) return;
        try {
            setLoading(true);
            await deleteCargo(id);
            fetchCargos();
        } catch (error) {
            // error already handled
        } finally {
            setLoading(false);
        }
    };

    const handleAddOrder = (orderId: string) => {
        if (!orderId) return;
        const id = Number(orderId);
        if (assignedOrderIds.includes(id)) return;

        setAssignedOrderIds([...assignedOrderIds, id]);
        const order = allOrders.find((o) => o.id === id);
        if (order) {
            setCargoOrders([...cargoOrders, order]);
        }
    };

    const handleRemoveOrder = (orderId: number) => {
        setAssignedOrderIds(assignedOrderIds.filter((id) => id !== orderId));
        setCargoOrders(cargoOrders.filter((o: any) => o.id !== orderId));
    };

    const updateField = (field: string, value: any) => {
        setFormData({ ...formData, [field]: value });
    };

    const selectedCustomer = useMemo(() => {
        if (!formData.customer_id) return null;
        return (customers as any[]).find((c) => String(c.id) === String(formData.customer_id)) || null;
    }, [formData.customer_id, customers]);

    const sectionTabs = [
        { key: "details" as const, label: "Cargo Details", icon: "📦" },
        { key: "billto_shipto" as const, label: "Bill To / Ship To", icon: "📄" },
        { key: "orders" as const, label: "Assigned Orders", icon: "📋" },
    ];

    const handleBatchChange = (updates: Partial<BillToShipToData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
                <div className="relative flex-1 max-w-md">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search cargos..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-[4px] focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all text-sm"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchCargos}
                        disabled={loading}
                        className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-[4px] hover:bg-gray-50 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="px-3 py-2 text-sm bg-gray-600 text-white rounded-[4px] hover:bg-gray-700 transition-all flex items-center gap-2"
                    >
                        <PlusIcon className="h-4 w-4" />
                        New Cargo
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                {loading && cargos.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="inline-flex items-center gap-3">
                            <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-500" />
                            <span className="text-gray-600">Loading Cargos...</span>
                        </div>
                    </div>
                ) : cargos.length === 0 ? (
                    <div className="p-8 text-center">
                        <TruckIcon className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No Cargos Found</p>
                        <p className="text-sm text-gray-400 mt-1">Click &quot;New Cargo&quot; to create one.</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    ID
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Cargo No
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Cargo Type
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Customer
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Pickup
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Departure
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    ETA
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Note
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {cargos.map((cargo) => (
                                <tr
                                    key={cargo.id}
                                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                                    onClick={() => handleOpenEdit(cargo.id)}
                                >
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-medium text-gray-900">{cargo.id}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-900 font-medium">
                                            {cargo.cargo_no || "-"}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-900">
                                            {cargo.cargo_type_id ? getCargoTypeName(cargo.cargo_type_id) : "-"}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-900">
                                            {cargo.customer_id ? getCustomerName(cargo.customer_id) : "-"}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span
                                            className={`text-xs px-2 py-1 rounded-[4px] font-medium ${getCargoStatusColor(
                                                cargo.cargo_status
                                            )}`}
                                        >
                                            {cargo.cargo_status || "Open"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-600 text-nowrap">
                                            {formatDate(cargo.pickup_date)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-600 text-nowrap">
                                            {formatDate(cargo.dep_date)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-600 text-nowrap">
                                            {formatDate(cargo.eta)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-600 truncate max-w-[150px]">
                                            {cargo.note || "-"}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenEdit(cargo.id);
                                                }}
                                                className="text-gray-600 hover:text-gray-800 transition-colors p-1"
                                                title="Edit"
                                            >
                                                <PencilIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(cargo.id);
                                                }}
                                                className="text-red-600 hover:text-red-800 transition-colors p-1"
                                                title="Delete"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {pagination.totalPages > 1 && (
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Showing{" "}
                        {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.totalRecords)} to{" "}
                        {Math.min(pagination.page * pagination.limit, pagination.totalRecords)} of{" "}
                        {pagination.totalRecords} cargos
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-all flex items-center gap-1"
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
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-all flex items-center gap-1"
                        >
                            Next
                            <ChevronRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[4px] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                    <TruckIcon className="w-5 h-5 text-gray-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {modalMode === "view"
                                            ? "View Cargo"
                                            : modalMode === "edit"
                                                ? "Edit Cargo"
                                                : "Create New Cargo"}
                                    </h2>
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
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-[4px] border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isEditEnabled ? "bg-gray-600" : "bg-gray-300"
                                                }`}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-[4px] bg-white shadow ring-0 transition duration-200 ease-in-out ${isEditEnabled ? "translate-x-5" : "translate-x-0"
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                )}
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-[4px] hover:bg-gray-100"
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
                                        className={`px-4 py-2 rounded-[4px] text-sm font-medium transition-all flex items-center gap-2 ${activeSection === tab.key
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
                            {activeSection === "details" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Cargo No
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.cargo_no || ""}
                                            onChange={(e) => updateField("cargo_no", e.target.value)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter cargo number"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Cargo Type
                                        </label>
                                        <Select
                                            className="text-sm"
                                            classNames={{
                                                control: () =>
                                                    "border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500",
                                            }}
                                            options={cargoTypeOptions}
                                            value={cargoTypeOptions.find((opt) => opt.value === String(formData.cargo_type_id)) || null}
                                            onChange={(newValue) => updateField("cargo_type_id", newValue?.value ? Number(newValue.value) : undefined)}
                                            placeholder="Select cargo type..."
                                            isSearchable
                                            isClearable
                                            isDisabled={!isEditEnabled}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                                        <select
                                            value={formData.cargo_status || "Open"}
                                            onChange={(e) => updateField("cargo_status", e.target.value)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                        >
                                            {CARGO_STATUSES.map((s) => (
                                                <option key={s.value} value={s.value}>
                                                    {s.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Customer (ID - BillTo - ShipTo)
                                        </label>
                                        <Select
                                            className="text-sm"
                                            classNames={{
                                                control: () =>
                                                    "border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500",
                                            }}
                                            options={customerOptions}
                                            value={customerOptions.find((opt) => opt.value === String(formData.customer_id)) || null}
                                            onChange={(newValue) => updateField("customer_id", newValue?.value || undefined)}
                                            placeholder="Search or select customer..."
                                            isSearchable
                                            isClearable
                                            isDisabled={!isEditEnabled}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Pickup Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formatDateInput(formData.pickup_date)}
                                            onChange={(e) => updateField("pickup_date", e.target.value || null)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Departure Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formatDateInput(formData.dep_date)}
                                            onChange={(e) => updateField("dep_date", e.target.value || null)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            ETA (Estimated Arrival)
                                        </label>
                                        <input
                                            type="date"
                                            value={formatDateInput(formData.eta)}
                                            onChange={(e) => updateField("eta", e.target.value || null)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Shipped At
                                        </label>
                                        <input
                                            type="date"
                                            value={formatDateInput(formData.shipped_at)}
                                            onChange={(e) => updateField("shipped_at", e.target.value || null)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Note</label>
                                        <input
                                            type="text"
                                            value={formData.note || ""}
                                            onChange={(e) => updateField("note", e.target.value)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter note"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Online Track
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.online_track || ""}
                                            onChange={(e) => updateField("online_track", e.target.value)}
                                            disabled={!isEditEnabled}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            placeholder="Enter tracking URL or ID"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Remark</label>
                                        <textarea
                                            value={formData.remark || ""}
                                            onChange={(e) => updateField("remark", e.target.value)}
                                            disabled={!isEditEnabled}
                                            rows={2}
                                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed resize-none"
                                            placeholder="Enter remark"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeSection === "billto_shipto" && (
                                <BillToShipToForm
                                    data={formData}
                                    onChange={updateField as any}
                                    onBatchChange={handleBatchChange}
                                    isEditEnabled={isEditEnabled}
                                    selectedCustomer={selectedCustomer}
                                />
                            )}

                            {activeSection === "orders" && (
                                <div className="space-y-4">
                                    {isEditEnabled && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                Assign Order to Cargo
                                            </label>
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <Select
                                                        className="text-sm"
                                                        classNames={{
                                                            control: () =>
                                                                "border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500",
                                                        }}
                                                        options={orderOptions}
                                                        onChange={(newValue) => {
                                                            if (newValue) handleAddOrder(newValue.value);
                                                        }}
                                                        placeholder="Search or select order..."
                                                        isSearchable
                                                        isClearable
                                                        isLoading={loadingOrders}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {cargoOrders.length > 0 ? (
                                        <div className="border border-gray-200 rounded-[4px] overflow-hidden">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                                                            Order ID
                                                        </th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                                                            Order #
                                                        </th>
                                                        <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">
                                                            Status
                                                        </th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">
                                                            Comment
                                                        </th>
                                                        {isEditEnabled && (
                                                            <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase">
                                                                Actions
                                                            </th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {cargoOrders.map((order: any) => (
                                                        <tr key={order.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-2.5 text-sm text-gray-900">{order.id}</td>
                                                            <td className="px-4 py-2.5 text-sm font-medium text-gray-900">
                                                                {order.order_no || "-"}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-center">
                                                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                                                    {order.status || "-"}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-sm text-gray-600">
                                                                {order.comment || "-"}
                                                            </td>
                                                            {isEditEnabled && (
                                                                <td className="px-4 py-2.5 text-center">
                                                                    <button
                                                                        onClick={() => handleRemoveOrder(order.id)}
                                                                        className="text-red-600 hover:text-red-800 transition-colors p-1"
                                                                        title="Remove from cargo"
                                                                    >
                                                                        <TrashIcon className="h-4 w-4" />
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-gray-400">
                                            <p className="text-sm">
                                                No orders assigned to this cargo yet.
                                                {isEditEnabled && " Use the dropdown above to add orders."}
                                            </p>
                                        </div>
                                    )}

                                    {cargoOrderItems.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                                Order Items ({cargoOrderItems.length})
                                            </h4>
                                            <div className="border border-gray-200 rounded-[4px] overflow-hidden">
                                                <table className="w-full">
                                                    <thead className="bg-gray-50 border-b border-gray-200">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                Item ID
                                                            </th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                Item Name
                                                            </th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                Order ID
                                                            </th>
                                                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                                                Qty
                                                            </th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                                Remark
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {cargoOrderItems.map((oi: any, idx: number) => (
                                                            <tr key={idx} className="hover:bg-gray-50">
                                                                <td className="px-4 py-2 text-sm text-gray-900">{oi.item_id}</td>
                                                                <td className="px-4 py-2 text-sm text-gray-900">
                                                                    {oi.item?.item_name || oi.item?.name || "-"}
                                                                </td>
                                                                <td className="px-4 py-2 text-sm text-gray-600">{oi.order_id}</td>
                                                                <td className="px-4 py-2 text-center text-sm font-medium text-gray-900">
                                                                    {oi.qty}
                                                                </td>
                                                                <td className="px-4 py-2 text-sm text-gray-600">
                                                                    {oi.remark_de || "-"}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/80 flex-shrink-0">
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-[4px] hover:bg-gray-50 transition-all"
                                >
                                    {isEditEnabled ? "Cancel" : "Close"}
                                </button>
                                {isEditEnabled && modalMode !== "view" && (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="px-5 py-2.5 text-sm font-medium bg-gray-600 text-white rounded-[4px] hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
                                    >
                                        {loading && (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        )}
                                        {modalMode === "edit" ? "Update Cargo" : "Create Cargo"}
                                    </button>
                                )}
                                {modalMode === "edit" && !isEditEnabled && (
                                    <button
                                        onClick={() => handleDelete(editingId!)}
                                        className="px-5 py-2.5 text-sm font-medium bg-red-600 text-white rounded-[4px] hover:bg-red-700 transition-all flex items-center gap-2"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                        Delete Cargo
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

export default CargosTab;

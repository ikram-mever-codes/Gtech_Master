"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Select from "react-select";
import {
    ArrowPathIcon,
    PlusIcon,
    TrashIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Truck } from "lucide-react";
import PageHeader from "@/components/UI/PageHeader";
import ModalHeader from "@/components/UI/ModalHeader";
import ModalFooter from "@/components/UI/ModalFooter";
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
import BillToShipToForm, { BillToShipToData, WAREHOUSE_BILL_TO } from "../General/BillToShipToForm";
import { getAllCargoTypes, CargoTypeObj } from "@/api/cargo_types";
import SegmentedControl from "@/components/UI/SegmentedControl";
import { formatDate } from "@/utils/date";
import CustomModal from "@/components/UI/CustomModal";
import { CustomerSearchInput } from "@/components/UI/CustomerSearchInput";
import { getShippingAddresses } from "@/api/shipping_addresses";
import { formatCountryCode } from "@/utils/address";
import { ClipboardList } from "lucide-react";


type Customer = {
    id: string | number;
    companyName: string;
    legalName?: string;
    email?: string;
    contactEmail?: string;
    contactPhoneNumber?: string;
    taxNumber?: string;
    addressLine1?: string;
    addressLine2?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    deliveryAddressLine1?: string;
    deliveryAddressLine2?: string;
    deliveryCity?: string;
    deliveryCountry?: string;
    deliveryPostalCode?: string;
};

interface CargosTabProps {
    customers?: Customer[];
    searchTerm?: string;
}

const formatDateInput = (dateString: string | Date | undefined | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
};

const formatCargoDateShort = (dateString: string | Date | undefined | null) => {
    return formatDate(dateString);
};

const CargosTab = React.forwardRef<any, CargosTabProps>(({ customers: externalCustomers, searchTerm: externalSearchTerm }, ref) => {
    const [cargos, setCargos] = useState<CargoType[]>([]);
    const [loading, setLoading] = useState(false);
    const [localSearch, setLocalSearch] = useState("");
    const search = externalSearchTerm !== undefined ? externalSearchTerm : localSearch;
    const [statusFilter, setStatusFilter] = useState("Open");
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 30,
        totalRecords: 0,
        totalPages: 1,
    });

    const handleStatusFilterChange = (newStatus: string) => {
        setStatusFilter(newStatus);
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    const [showModal, setShowModal] = useState(false);
    const [expandedCargoIds, setExpandedCargoIds] = useState<Set<number>>(new Set());
    const [cargoDetailsMap, setCargoDetailsMap] = useState<Record<number, { orders: any[]; orderItems: any[]; loading: boolean }>>({});

    const toggleExpandCargo = async (cargoId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const newExpanded = new Set(expandedCargoIds);
        if (newExpanded.has(cargoId)) {
            newExpanded.delete(cargoId);
            setExpandedCargoIds(newExpanded);
        } else {
            newExpanded.add(cargoId);
            setExpandedCargoIds(newExpanded);

            if (!cargoDetailsMap[cargoId]) {
                setCargoDetailsMap(prev => ({
                    ...prev,
                    [cargoId]: { orders: [], orderItems: [], loading: true }
                }));
                try {
                    const res: any = await getCargoOrders(cargoId);
                    if (res && res.success) {
                        setCargoDetailsMap(prev => ({
                            ...prev,
                            [cargoId]: {
                                orders: res.data?.orders || [],
                                orderItems: res.data?.orderItems || [],
                                loading: false
                            }
                        }));
                    } else {
                        setCargoDetailsMap(prev => ({
                            ...prev,
                            [cargoId]: { orders: [], orderItems: [], loading: false }
                        }));
                    }
                } catch (err) {
                    console.error("Failed to load cargo orders", err);
                    setCargoDetailsMap(prev => ({
                        ...prev,
                        [cargoId]: { orders: [], orderItems: [], loading: false }
                    }));
                }
            }
        }
    };

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
        customer_type: "GT-Warehouse",
        ...WAREHOUSE_BILL_TO,
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
                status: statusFilter,
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
    }, [pagination.page, pagination.limit, search, statusFilter]);

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
            const response = await getAllCustomers({ limit: 1000 });
            const data = response?.data ?? response;
            let arr = [];
            if (Array.isArray(data)) {
                arr = data;
            } else if (data?.businesses && Array.isArray(data.businesses)) {
                arr = data.businesses;
            } else if (data?.customers && Array.isArray(data.customers)) {
                arr = data.customers;
            }
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
                label: c.companyName || "-",
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
            customer_type: "GT-Warehouse",
            ...WAREHOUSE_BILL_TO,
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
            const cleanFormData = { ...formData };
            const dateFields = ["pickup_date", "dep_date", "eta", "shipped_at"] as const;

            dateFields.forEach(field => {
                if (cleanFormData[field] === "") {
                    cleanFormData[field] = null as any;
                }
            });

            const payload: any = {
                ...cleanFormData,
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

    const handleCustomerChange = async (customerId: string | undefined) => {
        if (!customerId) {
            setFormData(prev => ({
                ...prev,
                customer_id: undefined,
                customer_type: "GT-Warehouse",
                ...WAREHOUSE_BILL_TO,
                ship_to_company_name: "",
                ship_to_display_name: "",
                ship_to_contact_person: "",
                ship_to_contact_phone: "",
                ship_to_country: "",
                ship_to_city: "",
                ship_to_postal_code: "",
                ship_to_full_address: "",
                ship_to_remarks: "",
            }));
            return;
        }

        const customer = customers.find(c => String(c.id) === String(customerId));
        if (!customer) {
            setFormData(prev => ({ ...prev, customer_id: customerId }));
            return;
        }

        const billTo = {
            customer_type: "Other Customer",
            bill_to_company_name: customer.companyName || "",
            bill_to_display_name: customer.companyName || "",
            bill_to_phone_no: customer.contactPhoneNumber || customer.email || "",
            bill_to_tax_no: customer.taxNumber || "",
            bill_to_email: customer.email || "",
            bill_to_website: "",
            bill_to_contact_person: customer.legalName || "",
            bill_to_contact_phone: customer.contactPhoneNumber || "",
            bill_to_contact_mobile: "",
            bill_to_contact_email: customer.contactEmail || "",
            bill_to_country: customer.country || "",
            bill_to_city: customer.city || "",
            bill_to_postal_code: customer.postalCode || "",
            bill_to_full_address: [customer.addressLine1 || customer.address || "", customer.addressLine2 || ""].filter(Boolean).join(" "),
        };

        let shipTo = {
            ship_to_company_name: customer.companyName || "",
            ship_to_display_name: customer.companyName || "",
            ship_to_contact_person: customer.legalName || "",
            ship_to_contact_phone: customer.contactPhoneNumber || "",
            ship_to_country: "",
            ship_to_city: "",
            ship_to_postal_code: "",
            ship_to_full_address: "",
            ship_to_remarks: "",
        };

        try {
            const res: any = await getShippingAddresses(String(customer.id));
            const dbAddresses = res && res.success ? (res.data || []) : [];
            const defaultAddress = dbAddresses.find((a: any) => a.is_default);

            if (defaultAddress) {
                const fullAddressStr = [
                    defaultAddress.street,
                    defaultAddress.address_additional_line || ""
                ].filter(Boolean).join(" ");
                shipTo.ship_to_country = defaultAddress.country?.name || "";
                shipTo.ship_to_city = defaultAddress.city || "";
                shipTo.ship_to_postal_code = defaultAddress.postal_code || "";
                shipTo.ship_to_full_address = fullAddressStr;
            } else {
                const hasDelivery = !!(customer.deliveryAddressLine1 || customer.deliveryCity || customer.deliveryCountry);
                if (hasDelivery) {
                     shipTo.ship_to_country = customer.deliveryCountry || "";
                     shipTo.ship_to_city = customer.deliveryCity || "";
                     shipTo.ship_to_postal_code = customer.deliveryPostalCode || "";
                     shipTo.ship_to_full_address = [customer.deliveryAddressLine1 || "", customer.deliveryAddressLine2 || ""].filter(Boolean).join(" ");
                } else {
                     shipTo.ship_to_country = customer.country || "";
                     shipTo.ship_to_city = customer.city || "";
                     shipTo.ship_to_postal_code = customer.postalCode || "";
                     shipTo.ship_to_full_address = [customer.addressLine1 || customer.address || "", customer.addressLine2 || ""].filter(Boolean).join(" ");
                }
            }
        } catch (err) {
            console.error("Failed to load customer shipping addresses", err);
            const hasDelivery = !!(customer.deliveryAddressLine1 || customer.deliveryCity || customer.deliveryCountry);
            if (hasDelivery) {
                 shipTo.ship_to_country = customer.deliveryCountry || "";
                 shipTo.ship_to_city = customer.deliveryCity || "";
                 shipTo.ship_to_postal_code = customer.deliveryPostalCode || "";
                 shipTo.ship_to_full_address = [customer.deliveryAddressLine1 || "", customer.deliveryAddressLine2 || ""].filter(Boolean).join(" ");
            } else {
                 shipTo.ship_to_country = customer.country || "";
                 shipTo.ship_to_city = customer.city || "";
                 shipTo.ship_to_postal_code = customer.postalCode || "";
                 shipTo.ship_to_full_address = [customer.addressLine1 || customer.address || "", customer.addressLine2 || ""].filter(Boolean).join(" ");
            }
        }

        setFormData(prev => ({
            ...prev,
            customer_id: customerId,
            ...billTo,
            ...shipTo,
        }));
    };

    const selectedCustomer = useMemo(() => {
        if (!formData.customer_id) return null;
        return (customers as any[]).find((c) => String(c.id) === String(formData.customer_id)) || null;
    }, [formData.customer_id, customers]);

    const sectionTabs = [
        { key: "details" as const, label: "Cargo Details", icon: "📦" },
        { key: "orders" as const, label: "Assigned Orders", icon: "📋" },
    ];

    const handleBatchChange = (updates: Partial<BillToShipToData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    React.useImperativeHandle(ref, () => ({
        handleOpenCreate,
        fetchCargos,
    }));

    return (
        <div>
            <div className="mb-6 mx-6 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex flex-row items-center gap-3 w-full">
                    {externalSearchTerm === undefined && (
                        <div className="flex-1 w-full relative">
                            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search cargos..."
                                value={localSearch}
                                onChange={(e) => setLocalSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8CC21B]/40 focus:border-transparent outline-none text-black transition-all"
                            />
                        </div>
                    )}
                    <div className="shrink-0">
                        <SegmentedControl
                            options={[
                                { value: "Open", label: "Open" },
                                { value: "Shipped", label: "Shipped" },
                                { value: "Delivered", label: "Delivered" },
                            ]}
                            value={statusFilter}
                            onChange={handleStatusFilterChange}
                        />
                    </div>
                    {(search || statusFilter !== "Open") && (
                        <button
                            onClick={() => {
                                setLocalSearch("");
                                handleStatusFilterChange("Open");
                            }}
                            className="px-3.5 py-2 text-sm font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 shrink-0 shadow-sm justify-center"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                            Reset
                        </button>
                    )}
                </div>
            </div>
            <div className="overflow-x-auto px-6 pb-6">
                {loading && cargos.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <div className="inline-flex items-center gap-3">
                            <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-500" />
                            <span className="text-gray-600">Loading Cargos...</span>
                        </div>
                    </div>
                ) : cargos.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 overflow-hidden">
                        <Truck className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No Cargos Found</p>
                        <p className="text-sm text-gray-400 mt-1">Click &quot;New Cargo&quot; to create one.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="w-10 px-4 py-3"></th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                        ID
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                        CARGO NO
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                        STATUS
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                        CARGO TYPE
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                        SHIP TO
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                        EST. DEPARTURE
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                        SHIPPED
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                        EST. ARRIVAL
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                        ARRIVED (DAYS)
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                        ONLINE TRACK
                                    </th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                                        REMARKS
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {cargos.map((cargo) => (
                                    <React.Fragment key={cargo.id}>
                                        <tr
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                            onClick={() => handleOpenEdit(cargo.id)}
                                        >
                                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={(e) => toggleExpandCargo(cargo.id, e)}
                                                    className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                                                >
                                                    <ChevronRightIcon
                                                        className={`h-4.5 w-4.5 transition-transform duration-200 ${
                                                            expandedCargoIds.has(cargo.id) ? "rotate-90" : ""
                                                        } ${
                                                            (cargo.assignedItemsCount ?? 0) === 0
                                                                ? "text-red-500 font-bold stroke-[3px]"
                                                                : "text-gray-400"
                                                        }`}
                                                    />
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-800 font-bold">
                                                {cargo.id}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-800 font-semibold">
                                                {cargo.cargo_no || "-"}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className="text-[10px] font-bold text-[#495057]">
                                                    {cargo.cargo_status || "Open"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-800">
                                                {cargo.cargo_type_id ? getCargoTypeName(cargo.cargo_type_id) : "-"}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-800">
                                                {cargo.ship_to_company_name || (cargo.customer_id ? getCustomerName(cargo.customer_id) : "-")}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-800">
                                                {formatCargoDateShort(cargo.dep_date)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-800">
                                                {formatCargoDateShort(cargo.shipped_at)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-800">
                                                {formatCargoDateShort(cargo.eta)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-800">
                                                -
                                            </td>
                                            <td className="px-4 py-3 text-sm max-w-[120px] truncate">
                                                {cargo.online_track ? (
                                                    <a
                                                        href={cargo.online_track}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 hover:underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {cargo.online_track}
                                                    </a>
                                                ) : "-"}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-800 max-w-[150px] truncate">
                                                {cargo.remark || cargo.note || "-"}
                                            </td>
                                        </tr>
                                        {expandedCargoIds.has(cargo.id) && (
                                            <tr className="bg-gray-50/50 border-t border-b border-gray-100">
                                                <td colSpan={12} className="px-6 py-4">
                                                    <div>
                                                        <div className="text-xs font-semibold text-gray-500 mb-2.5 uppercase tracking-wider flex items-center gap-1.5 select-none">
                                                            <ClipboardList className="h-4 w-4 text-blue-500" />
                                                            <span>
                                                                Assigned Orders &amp; Items for Cargo No:{" "}
                                                                <strong className="text-gray-800">
                                                                    {cargo.cargo_no || cargo.id}
                                                                </strong>
                                                            </span>
                                                        </div>

                                                        {(() => {
                                                            const details = cargoDetailsMap[cargo.id] || { orders: [], orderItems: [], loading: false };
                                                            if (details.loading) {
                                                                return (
                                                                    <div className="flex items-center gap-2 py-2 text-sm text-gray-500">
                                                                        <ArrowPathIcon className="h-4 w-4 animate-spin text-gray-500 animate-infinite" />
                                                                        <span>Loading orders and items...</span>
                                                                    </div>
                                                                );
                                                            }
                                                            if (details.orders.length === 0 && details.orderItems.length === 0) {
                                                                return (
                                                                    <div className="text-sm text-gray-400 py-2">
                                                                        No assigned orders or items.
                                                                    </div>
                                                                );
                                                            }
                                                            return (
                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                                    {/* Orders List */}
                                                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                                                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                                                            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Assigned Orders ({details.orders.length})</h4>
                                                                        </div>
                                                                        <div className="divide-y divide-gray-100 max-h-[250px] overflow-y-auto">
                                                                            {details.orders.map((o: any) => (
                                                                                <div key={o.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                                                    <div>
                                                                                        <div className="text-sm font-semibold text-gray-800">{o.order_no}</div>
                                                                                        <div className="text-xs text-gray-400">ID: {o.id}</div>
                                                                                    </div>
                                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${o.order_status === "Delivered" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
                                                                                        {o.order_status}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>

                                                                    {/* Order Items List */}
                                                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                                                                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                                                            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Assigned Order Items ({details.orderItems.length})</h4>
                                                                        </div>
                                                                        <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
                                                                            <table className="w-full text-left text-xs text-gray-600">
                                                                                <thead className="bg-gray-100 border-b border-gray-200">
                                                                                    <tr>
                                                                                        <th className="px-3 py-2 font-semibold uppercase text-gray-500">Item Name</th>
                                                                                        <th className="px-3 py-2 font-semibold uppercase text-gray-500">Model / EAN</th>
                                                                                        <th className="px-3 py-2 font-semibold uppercase text-gray-500 text-center">Qty</th>
                                                                                        <th className="px-3 py-2 font-semibold uppercase text-gray-500 text-right">Price</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-gray-100">
                                                                                    {details.orderItems.map((oi: any) => (
                                                                                        <tr key={oi.id} className="hover:bg-gray-50 transition-colors">
                                                                                            <td className="px-3 py-2 font-medium text-gray-800 max-w-[180px] truncate">{oi.item?.item_name || "Unknown"}</td>
                                                                                            <td className="px-3 py-2 text-gray-500">
                                                                                                <div>{oi.item?.model || "-"}</div>
                                                                                                <div className="text-[10px] text-gray-400">{oi.item?.ean || "-"}</div>
                                                                                            </td>
                                                                                            <td className="px-3 py-2 text-center text-gray-800 font-semibold">{oi.qty || 1}</td>
                                                                                            <td className="px-3 py-2 text-right text-gray-800 font-semibold">€{(oi.eur_special_price || oi.price || 0).toFixed(2)}</td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {pagination.totalPages > 1 && (
                <div className="mx-6 mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-between shadow-sm">
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
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-all flex items-center gap-1 text-black font-semibold bg-white"
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
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-[4px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-all flex items-center gap-1 text-black font-semibold bg-white"
                        >
                            Next
                            <ChevronRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            <CustomModal
                title=""
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                width="max-w-4xl"
                showHeader={false}
                noPadding={true}
            >
                <div className="flex flex-col max-h-[92vh]">
                    <ModalHeader
                        entityName="Cargo"
                        entityNo={modalMode !== "create" ? formData.cargo_no : undefined}
                        icon={Truck}
                        isEditMode={modalMode !== "create"}
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

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Customer
                                    </label>
                                    <CustomerSearchInput
                                        value={formData.customer_id || ""}
                                        onChange={(id) => handleCustomerChange(id || undefined)}
                                        disabled={!isEditEnabled}
                                        placeholder="Search or select customer..."
                                        mode="customers"
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

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Remark</label>
                                    <textarea
                                        value={formData.remark || formData.note || ""}
                                        onChange={(e) => {
                                            updateField("remark", e.target.value);
                                            updateField("note", e.target.value);
                                        }}
                                        disabled={!isEditEnabled}
                                        rows={3}
                                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500/50 focus:border-gray-500 transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed resize-none"
                                        placeholder="Enter remark"
                                    />
                                </div>
                            </div>
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
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-[200px]">
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
                                                                    <div className="line-clamp-3 leading-tight break-words">
                                                                        {oi.item?.item_name || oi.item?.name || "-"}
                                                                    </div>
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

                        <ModalFooter
                            isEditMode={modalMode !== "create"}
                            isEditEnabled={isEditEnabled}
                            onDelete={modalMode === "edit" ? () => handleDelete(editingId!) : undefined}
                            onCancel={() => setShowModal(false)}
                            onSave={handleSubmit}
                            saveLabel={modalMode === "edit" ? "Update Cargo" : "Create Cargo"}
                            loading={loading}
                        />
                </div>
            </CustomModal>
        </div>
    );
});

export default CargosTab;
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Select from 'react-select';
import {
    MagnifyingGlassIcon,
    ArrowPathIcon,
    PlusIcon,
    DocumentDuplicateIcon,
    PencilIcon,
    TrashIcon,
    EyeIcon,
    PrinterIcon,
    ChevronRightIcon,
    DocumentTextIcon,
    ClipboardIcon,
    CalculatorIcon,
    CurrencyEuroIcon,
    CheckCircleIcon,
    XMarkIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    LinkIcon,
    UserCircleIcon,
    BuildingOfficeIcon,
    CalendarIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    CogIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import {
    getAllOrders,
    getOrderById,
    createOrder,
    updateOrder,
    deleteOrder,

    type Order,
    type CreateOrderPayload,
    type OrderSearchFilters,

    getOrderStatusColor,
    getOrderStatuses,
} from "@/api/orders";

import { downloadOrderPdf } from "@/api/items";


import { getAllCustomers, type CustomerData as Customer } from "@/api/customers";
import { getItems, getItemByCategory, type Item } from "@/api/items";


import CustomButton from "@/components/UI/CustomButton";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import { UserRole } from "@/utils/interfaces";
import { DownloadCloudIcon, ToggleLeft, ToggleRight } from "lucide-react";


interface Option {
    value: string | number;
    label: string;
}

interface Props {
    items: Item[];
    selectedItemId: string;
    onItemChange: (itemId: string) => void;
    onAdd: (itemId: string, qty: number) => void;
}



function ItemSelectorWithQuantity({
    items,
    selectedItemId,
    onItemChange,
    onAdd,
}: Props) {
    const [quantity, setQuantity] = useState<string>('');

    const options: Option[] = [
        { value: '', label: 'All Items / Clear' },
        ...items.map(item => ({
            value: item.id.toString(),
            label: item.item_name || 'Unnamed Item'
        }))
    ];


    const handleAdd = () => {
        if (!selectedItemId || !quantity.trim()) return;

        const qty = Number(quantity);
        if (isNaN(qty) || qty <= 0) {
            toast.error("Please enter a valid quantity");
            return;
        }

        onAdd(selectedItemId, qty);
        setQuantity('');
    };

    return (
        <div className="flex gap-2 items-end">
            <div className="flex-1">
                <Select
                    className="text-sm"
                    classNames={{
                        control: () => "border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500",
                    }}
                    options={options}
                    value={options.find(opt => opt.value === selectedItemId)}
                    onChange={(newValue) => onItemChange(newValue?.value?.toString() ?? "")}
                    placeholder="Search or select item..."
                    isSearchable
                    isClearable
                />
            </div>
            <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Qty"
                className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                min="1"
            />
            <button
                onClick={handleAdd}
                disabled={!selectedItemId || !quantity}
                className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
                Add
            </button>
        </div>
    );
}

const OrderPage = () => {

    const [Orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [selectedOrderType, setSelectedOrderType] = useState<string>("");

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [categories, setCategories] = useState<string[]>([]);

    const { user } = useSelector((state: RootState) => state.user);

    const [OrderFormData, setOrderFormData] = useState({
        comment: "",
        orderNo: "",
        customerId: "",
        categoryId: "",
        itemId: "",
        qty: "",
    });

    const [filters, setFilters] = useState<OrderSearchFilters>({
        search: "",
        status: "",
        page: 1,
        limit: 20,
    });

    const resetCreateForm = () => {
        setOrderFormData({
            comment: "",
            orderNo: "DE00125",
            customerId: "",
            categoryId: "",
            itemId: "",
            qty: "",
        });
        setSelectedOrderType("");
    };

    const handleViewOrder = (order: any) => {
        setSelectedOrder(order);
        setShowViewModal(true);
    };

    const handleEditOrder = (order: any) => {
        setSelectedOrder(order);
        setShowEditModal(true);
    };

    const handleGeneratePdf = async (orderId: string | number) => {
        toast.error("Generate PDF not implemented for Orders yet");
    };

    const handleDeleteOrder = async (orderId: string | number) => {
        if (!window.confirm("Are you sure you want to delete this order?")) return;
        try {
            await deleteOrder(orderId);
            fetchOrders();
            toast.success("Order deleted successfully");
        } catch (error) {
            console.error("Error deleting order:", error);
            toast.error("Failed to delete order");
        }
    };


    const isCreateOrderEnabled =
        OrderFormData.comment &&
        (selectedOrderType === "InternalOrder" ? OrderFormData.categoryId : OrderFormData.customerId) &&
        OrderFormData.itemId &&
        OrderFormData.qty;
    OrderFormData.orderNo = "DE00125";


    const tmpCategories = [
        { id: 1, catName: 'STD' }, { id: 2, catName: 'PRO' }, { id: 3, catName: 'TBD' },
    ];
    const handleOpenCreateModal = () => {
        setSelectedOrderType("");
        setShowCreateModal(true);
    };

    const handleCustomerChange = (customerId: string) => {
        setOrderFormData(prev => ({ ...prev, customerId }));
    };
    const handleOrderTypeChange = (value: string) => {
        setSelectedOrderType(value);
    };

    const handleCategoryChange = (categoryId: string) => {
        //setCategories(value);
        setOrderFormData(prev => ({ ...prev, categoryId }));
    };


    const handleItemChange = (itemId: string) => {
        setOrderFormData(prev => ({ ...prev, itemId }));
    };

    const handleAddItemToOrder = (itemId: string, qty: number) => {
        setOrderFormData(prev => ({
            ...prev,
            itemId: itemId,
            qty: qty.toString()
        }));
        const item = items.find(i => i.id.toString() === itemId);
        toast.success(`Added ${qty}x ${item?.item_name || 'item'} to order`);
    };
    const handleCreateOrder = async () => {
        try {
            const payload: CreateOrderPayload = {
                customer_id: OrderFormData.customerId,
                category_id: OrderFormData.categoryId,
                comment: OrderFormData.comment,
                items: [
                    {
                        item_id: parseInt(OrderFormData.itemId, 10),
                        qty: parseInt(OrderFormData.qty, 10),
                    }
                ]
            };

            const response = await createOrder(payload);
            if (response.success) {
                setShowCreateModal(false);
                //   resetCreateForm();
                //   fetchOrders();
                toast.success("Order created successfully!");
            }
        } catch (error) {
            console.error("Error creating Order:", error);
            toast.error("Failed to create order");
        }
    };

    const fetchItems = async () => {
        if (!OrderFormData.categoryId) return;
        const catId = parseInt(OrderFormData.categoryId as string);
        try {
            const response = await getItemByCategory(catId);

            if (response?.data) {
                setItems(
                    Array.isArray(response.data)
                        ? response.data
                        : response.data.items || []
                );
            }
        } catch (error) {
            console.error("Error while fetching items", error);
            toast.error("Failed to fetch items");
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await getAllCustomers();
            if (response?.data) {
                setCustomers(
                    Array.isArray(response.data)
                        ? response.data
                        : response.data.customers || []
                );
            }
        } catch (error) {
            console.error("Error fetching customers:", error);
            toast.error("Failed to fetch customers");
        }
    };
    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getAllOrders(filters);
            if (response.success) {
                setOrders(response.data);
                setTotalRecords(response.pagination?.total || response.data.length);
                setTotalPages(response.pagination?.pages || 1);
            }
        } catch (error) {
            console.error("Error fetching Orders:", error);
            toast.error("Failed to fetch orders");
        } finally {
            setLoading(false);
        }
    }, [filters]);
    useEffect(() => {
        fetchOrders();
    }, [filters, fetchOrders]);

    useEffect(() => {
        fetchItems();
    }, [OrderFormData.categoryId]);

    useEffect(() => {
        fetchCustomers();
    }, []);


    return (
        <div className="min-h-screen bg-white shadow-xl rounded-lg p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">Orders</h1>
                            <p className="text-gray-600 text-sm">
                                Create and manage Orders
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Search Orders..."
                                    value={filters.search || ""}
                                    onChange={(e) =>
                                        setFilters({ ...filters, search: e.target.value, page: 1 })
                                    }
                                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                                />
                                <select
                                    value={filters.status || ""}
                                    onChange={(e) =>
                                        setFilters({ ...filters, status: e.target.value, page: 1 })
                                    }
                                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                                >
                                    <option value="">All Status</option>
                                    {getOrderStatuses().map((status) => (
                                        <option key={status.value} value={status.value}>
                                            {status.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={fetchOrders}
                                disabled={loading}
                                className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                <ArrowPathIcon
                                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                                />
                                Refresh
                            </button>

                            <CustomButton
                                gradient={true}
                                onClick={handleOpenCreateModal}
                                className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all flex items-center gap-2"
                            >
                                <PlusIcon className="h-4 w-4" />
                                New Order
                            </CustomButton>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="inline-flex items-center gap-3">
                                <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-500" />
                                <span className="text-gray-600">Loading Orders...</span>
                            </div>
                        </div>
                    ) : Orders.length === 0 ? (
                        <div className="p-8 text-center">
                            <DocumentTextIcon className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">No Orders found</p>
                            <p className="text-gray-500 text-sm mt-2">
                                Create your first Order
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Order ID
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Order Type
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Order #
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Category & Status
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Comment
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {Orders.map((Order: any) => (
                                        <React.Fragment key={Order.id}>
                                            <tr className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {Order.id}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    External
                                                </td>
                                                <td className="px-4 py-3">
                                                    {Order.orderNo}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-row items-center gap-2 justify-center">
                                                        <div>{Order.categoryId}</div>
                                                        <div
                                                            className={`text-xs px-2 py-1 rounded-full font-medium ${getOrderStatusColor(
                                                                Order.status
                                                            )}`}
                                                        >
                                                            {Order.status}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {Order.comment}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleViewOrder(Order)}
                                                            className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                                                            title="View details"
                                                        >
                                                            <EyeIcon className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditOrder(Order)}
                                                            className="text-gray-600 hover:text-gray-800 transition-colors p-1"
                                                            title="Edit Order"
                                                        >
                                                            <PencilIcon className="h-4 w-4" />
                                                        </button>
                                                        {Order.pdfGenerated ? (
                                                            <button
                                                                onClick={() => downloadOrderPdf(Order.id)}
                                                                className="text-purple-600 hover:text-purple-800 transition-colors p-1"
                                                                title="Download PDF"
                                                            >
                                                                <DownloadCloudIcon className="h-4 w-4" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleGeneratePdf(Order.id)}
                                                                className="text-purple-600 hover:text-purple-800 transition-colors p-1"
                                                                title="Generate PDF"
                                                            >
                                                                <PrinterIcon className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {user?.role === UserRole.ADMIN && (
                                                            <button
                                                                onClick={() => handleDeleteOrder(Order.id)}
                                                                className="text-red-600 hover:text-red-800 transition-colors p-1"
                                                                title="Delete Order"
                                                            >
                                                                <TrashIcon className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900">
                                    Create New Order
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        resetCreateForm();
                                    }}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select Order Type:
                                    </label>
                                    <select
                                        value={selectedOrderType}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                                        onChange={(e) => handleOrderTypeChange(e.target.value)}
                                    >
                                        <option value="">Select Order Type</option>
                                        <option value="InternalOrder">Internal Order</option>
                                        <option value="ExternalOrder">External Order</option>
                                    </select>
                                </div>

                                {selectedOrderType === "InternalOrder" && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Select Category:
                                        </label>
                                        <select
                                            value={OrderFormData.categoryId}
                                            onChange={(e) => handleCategoryChange(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                                        >
                                            <option value="">Select Category</option>
                                            {tmpCategories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.catName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {selectedOrderType === "ExternalOrder" && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Select Customer:
                                        </label>
                                        <select
                                            value={OrderFormData.customerId}
                                            onChange={(e) => handleCustomerChange(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                                        >
                                            <option value="">Select Customer</option>
                                            {customers.map((customer) => (
                                                <option key={customer.id} value={customer.id}>
                                                    {customer.companyName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Comment:
                                    </label>
                                    <textarea
                                        value={OrderFormData.comment}
                                        onChange={(e) => setOrderFormData(prev => ({ ...prev, comment: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                                        placeholder="Enter order comment..."
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select Item & qty:
                                    </label>
                                    <ItemSelectorWithQuantity
                                        items={items}
                                        selectedItemId={OrderFormData.itemId}
                                        onItemChange={handleItemChange}
                                        onAdd={handleAddItemToOrder}
                                    />
                                </div>

                                {OrderFormData.itemId && OrderFormData.qty && (
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-700">
                                            <span className="font-medium">Selected Item:</span>
                                            {items.find(i => i.id.toString() === OrderFormData.itemId)?.item_name}
                                        </p>
                                        <p className="text-sm text-gray-700 mt-1">
                                            <span className="font-medium">qty:</span> {OrderFormData.qty}
                                        </p>
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 pt-4">
                                    <button
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            resetCreateForm();
                                        }}
                                        className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <CustomButton
                                        gradient={true}
                                        onClick={handleCreateOrder}
                                        disabled={!isCreateOrderEnabled}
                                        className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all disabled:opacity-50"
                                    >
                                        Create Order
                                    </CustomButton>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderPage

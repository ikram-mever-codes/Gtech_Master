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
  createOrderRevision,
  generateOrderPdf,
  downloadOrderPdf,
  copyPastePrices,
  getOrdersByInquiry,
  type Order,
  type CreateOrderPayload,
  type OrderSearchFilters,
  getOrderStatuses,
  getAvailableCurrencies,
  formatCurrency,
  formatUnitPrice,
  formatTotalPrice,
  calculateLineTotal,
  calculateUnitPriceTotal,
  getOrderStatusColor,
} from "@/api/orders";

import { getAllCustomers } from "@/api/customers";
import { getItems } from "@/api/items";
import CustomButton from "@/components/UI/CustomButton";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import { UserRole } from "@/utils/interfaces";
import { DownloadCloudIcon, ToggleLeft, ToggleRight } from "lucide-react";

interface Customer {
  id: string;
  companyName: string;
  legalName?: string;
  email?: string;
}

interface Item {
  id: string;
  item_name?: string;
  qty?: string;
  email?: string;
}

type Option = {
  value: string;
  label: string;
}

type Props = {
  items: Item[];
  selectedItemId: string;
  onItemChange: (itemId: string) => void;
  onAdd: (itemId: string, quantity: number) => void;
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
      value: item.id,
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
    // Clear quantity for next entry, but keep item selected for visual feedback
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
          onChange={(newValue) => onItemChange(newValue?.value ?? "")}
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

const OrdersPage: React.FC = () => {
  // State management
  const [Orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Selected Orders
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Data lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  // ✅ MODIFIED: Form state with required fields for order creation
  const [OrderFormData, setOrderFormData] = useState({
    comment: "",  
    order_no: "",
    customerId: "",
    itemId: "",
    quantity: "",
  });

  // Filters
  const [filters, setFilters] = useState<OrderSearchFilters>({
    search: "",
    status: "",
    page: 1,
    limit: 20,
  });

  const [selectedOrderType, setselectedOrderType] = useState<string>("");

  const { user } = useSelector((state: RootState) => state.user);

  // ✅ MODIFIED: Check if all required fields have values
  const isCreateOrderEnabled = OrderFormData.comment && 
                               OrderFormData.order_no && 
                               OrderFormData.customerId && 
                               OrderFormData.itemId && 
                               OrderFormData.quantity;

  // Fetch data on mount
  useEffect(() => {
    fetchOrders();
    fetchItems();
    fetchCustomers();
  }, [filters]);

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

  const fetchItems = async () => {
    try {
      const response = await getItems();
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

  const handleCustomerChange = (customerId: string) => {
    setOrderFormData(prev => ({ ...prev, customerId }));
  };

  const handleOrderTypeChange = (value: string) => {
    setselectedOrderType(value);
  };

  const handleItemChange = (itemId: string) => {
    setOrderFormData(prev => ({ ...prev, itemId }));
  };

  // ✅ MODIFIED: Update form data when adding item
  const handleAddItemToOrder = (itemId: string, quantity: number) => {
    setOrderFormData(prev => ({
      ...prev,
      itemId: itemId,
      quantity: quantity.toString()
    }));
    const item = items.find(i => i.id === itemId);
    toast.success(`Added ${quantity}x ${item?.item_name || 'item'} to order`);
  };

  const handleOpenCreateModal = () => {
    setselectedOrderType("");
    setShowCreateModal(true);
  };

  // Handle Order creation
  const handleCreateOrder = async () => {
    try {
      // ✅ MODIFIED: Prepare payload with all required fields
      const payload = {
        ...OrderFormData,
        quantity: parseInt(OrderFormData.quantity, 10),
        orderType: selectedOrderType,
        // Add any additional fields required by your API
        title: OrderFormData.comment.substring(0, 50), // Generate title from comment
        currency: "EUR",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };
      
      const response = await createOrder(payload);
      if (response.success) {
        setShowCreateModal(false);
        resetCreateForm();
        fetchOrders();
        toast.success("Order created successfully!");
      }
    } catch (error) {
      console.error("Error creating Order:", error);
      toast.error("Failed to create order");
    }
  };

  // Handle Order deletion
  const handleDeleteOrder = async (OrderId: string) => {
    if (window.confirm("Are you sure you want to delete this Order?")) {
      try {
        await deleteOrder(OrderId);
        fetchOrders();
        toast.success("Order deleted successfully");
      } catch (error) {
        console.error("Error deleting Order:", error);
        toast.error("Failed to delete order");
      }
    }
  };

  // Handle PDF generation
  const handleGeneratePdf = async (OrderId: string) => {
    try {
      const response = await generateOrderPdf(OrderId);
      if (response.success) {
        await downloadOrderPdf(OrderId);
        toast.success("PDF generated and downloaded");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  // Handle viewing Order details
  const handleViewOrder = async (Order: Order) => {
    try {
      const response = await getOrderById(Order.id);
      if (response.success) {
        setSelectedOrder(response.data);
        setShowViewModal(true);
      }
    } catch (error) {
      console.error("Error fetching Order details:", error);
      toast.error("Failed to load order details");
    }
  };

  // Handle editing Order
  const handleEditOrder = (Order: Order) => {
    setSelectedOrder(Order);
    setShowEditModal(true);
  };

  const resetCreateForm = () => {
    setOrderFormData({
      comment: "",  
      order_no: "",
      customerId: "",
      itemId: "",
      quantity: "",
    });
    setselectedOrderType("");
  };

  // Format date
  const formatDate = (dateString: string | Date) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-white shadow-xl rounded-lg p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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

        {/* Orders Table */}
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
                          {Order.order_no}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-row items-center gap-2 justify-center">
                            <div>{Order.category_id}</div>
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
                {/* Order Type Selection */}
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

                {/* Customer Selection (for External Orders) */}
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

                {/* ✅ MODIFIED: Item Selector with integrated quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Item & Quantity:
                  </label>
                  <ItemSelectorWithQuantity
                    items={items}
                    selectedItemId={OrderFormData.itemId}
                    onItemChange={handleItemChange}
                    onAdd={handleAddItemToOrder}
                  />
                </div>

                {/* ✅ MODIFIED: Order Number Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order Number:
                  </label>
                  <input
                    type="text"
                    value={OrderFormData.order_no}
                    onChange={(e) => setOrderFormData(prev => ({ ...prev, order_no: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="Enter order number..."
                  />
                </div>

                {/* ✅ MODIFIED: Comment Input */}
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

                {/* Display selected item summary */}
                {OrderFormData.itemId && OrderFormData.quantity && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Selected Item:</span> {items.find(i => i.id === OrderFormData.itemId)?.item_name}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      <span className="font-medium">Quantity:</span> {OrderFormData.quantity}
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
                  {/* ✅ MODIFIED: Button disabled until all fields have values */}
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

export default OrdersPage;
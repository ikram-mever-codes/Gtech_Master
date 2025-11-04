"use client";
import React, { useState, useEffect, useCallback, use } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PauseIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import {
  getAllRequestedItems,
  createRequestedItem,
  updateRequestedItem,
  deleteRequestedItem,
  bulkUpdateRequestedItemsStatus,
  bulkUpdateRequestedItemsPriority,
  exportRequestedItemsToCSV,
  getRequestedItemsStatistics,
  getAvailableIntervals,
  getAvailablePriorities,
  getAvailableStatuses,
  type RequestedItem,
  type RequestedItemCreatePayload,
  type RequestedItemUpdatePayload,
  type RequestedItemsSearchFilters,
  type RequestedItemsStatistics,
} from "@/api/requested_items";
import CustomButton from "@/components/UI/CustomButton";
import { getAllContactPersons } from "@/api/contacts";
import { Delete } from "@mui/icons-material";
import { RootState } from "../Redux/store";
import { useSelector } from "react-redux";
import { UserRole } from "@/utils/interfaces";

// Add interface for ContactPerson
interface ContactPerson {
  id: string;
  name: string;
  familyName: string;
  position: string;
  email?: string;
  starBusinessDetailsId: string;
  starBusinessDetails?: {
    id: string;
    companyName: string;
  };
}

const RequestedItemsPage: React.FC = () => {
  // State management
  const [requestedItems, setRequestedItems] = useState<RequestedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<RequestedItemsStatistics | null>(
    null
  );
  const { user } = useSelector((state: RootState) => state.user);

  const [showFilters, setShowFilters] = useState(false);
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  // Add state for contact persons
  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);
  const [loadingContactPersons, setLoadingContactPersons] = useState(false);

  const itemsPerPage = 20;

  // Filter state
  const [filters, setFilters] = useState<RequestedItemsSearchFilters>({
    search: "",
    requestStatus: "",
    priority: "",
    interval: "",
    extraItems: "" as any,
    sortBy: "",
    sortOrder: "DESC",
    page: 1,
    limit: itemsPerPage,
  });

  // Create/Edit form state
  const [formData, setFormData] = useState<RequestedItemCreatePayload>({
    businessId: "",
    contactPersonId: "",
    itemName: "",
    material: "",
    specification: "",
    extraItems: "NO",
    extraItemsDescriptions: "",
    qty: "",
    interval: "Monatlich",
    sampleQty: "",
    expectedDelivery: "",
    priority: "Normal",
    requestStatus: "open",
    comment: "",
  });

  // Fetch contact persons on component mount
  useEffect(() => {
    const fetchContactPersons = async () => {
      setLoadingContactPersons(true);
      try {
        const response: any = await getAllContactPersons();
        console.log("Contact persons response:", response);
        if (response?.data?.contactPersons) {
          setContactPersons(response.data.contactPersons);
        } else {
          console.error("Unexpected response structure:", response);
          setContactPersons([]);
        }
      } catch (error) {
        console.error("Error fetching contact persons:", error);
        toast.error("Failed to fetch contact persons");
        setContactPersons([]);
      } finally {
        setLoadingContactPersons(false);
      }
    };

    fetchContactPersons();
  }, []);

  // Handle contact person selection
  const handleContactPersonChange = (contactPersonId: string) => {
    const selectedContactPerson = contactPersons.find(
      (person) => person.id === contactPersonId
    );

    if (selectedContactPerson) {
      setFormData({
        ...formData,
        contactPersonId: selectedContactPerson.id,
        businessId: selectedContactPerson.starBusinessDetailsId,
      });
    } else {
      setFormData({
        ...formData,
        contactPersonId: "",
        businessId: "",
      });
    }
  };

  // Fetch requested items
  const fetchRequestedItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAllRequestedItems({
        ...filters,
        page: currentPage,
        limit: itemsPerPage,
      });

      setRequestedItems(response || []);
    } catch (error) {
      console.error("Error fetching requested items:", error);
      toast.error("Failed to fetch requested items");
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage]);

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const response = await getRequestedItemsStatistics();
      if (response?.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  useEffect(() => {
    fetchRequestedItems();
    fetchStatistics();
  }, [fetchRequestedItems]);

  // Handle item click - open modal in view mode
  const handleItemClick = (item: RequestedItem) => {
    setModalMode("edit");
    setEditingItemId(item.id);
    setEditModeEnabled(false);

    setFormData({
      businessId: item.businessId,
      contactPersonId: item.contactPersonId || "",
      itemName: item.itemName,
      material: item.material || "",
      specification: item.specification || "",
      extraItems: item.extraItems || "NO",
      extraItemsDescriptions: item.extraItemsDescriptions || "",
      qty: item.qty,
      interval: item.interval,
      sampleQty: item.sampleQty || "",
      expectedDelivery: item.expectedDelivery || "",
      priority: item.priority,
      requestStatus: item.requestStatus,
      comment: item.comment || "",
    });

    setShowCreateModal(true);
  };

  // Handle create/edit submission
  const handleSubmit = async () => {
    // Validation
    if (!formData.businessId || !formData.itemName || !formData.qty) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (modalMode === "edit" && editingItemId) {
        await updateRequestedItem(
          editingItemId,
          formData as RequestedItemUpdatePayload
        );
      } else {
        await createRequestedItem(formData);
      }

      resetForm();
      setShowCreateModal(false);
      fetchRequestedItems();
      fetchStatistics();
    } catch (error) {
      console.error(
        `Error ${modalMode === "edit" ? "updating" : "creating"} item:`,
        error
      );
    }
  };

  // Handle status update
  const handleStatusUpdate = async (itemId: string, newStatus: string) => {
    try {
      await updateRequestedItem(itemId, { requestStatus: newStatus as any });
      fetchRequestedItems();
      fetchStatistics();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // Handle priority update
  const handlePriorityUpdate = async (itemId: string, newPriority: string) => {
    try {
      await updateRequestedItem(itemId, { priority: newPriority as any });
      fetchRequestedItems();
      fetchStatistics();
    } catch (error) {
      console.error("Error updating priority:", error);
    }
  };

  // Export to CSV
  const handleExportToCSV = async () => {
    try {
      await exportRequestedItemsToCSV(filters);
    } catch (error) {
      console.error("Error exporting items:", error);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      businessId: "",
      contactPersonId: "",
      itemName: "",
      material: "",
      specification: "",
      extraItems: "NO",
      extraItemsDescriptions: "",
      qty: "",
      interval: "Monatlich",
      sampleQty: "",
      expectedDelivery: "",
      priority: "Normal",
      requestStatus: "open",
      comment: "",
    });
    setEditModeEnabled(false);
    setEditingItemId(null);
    setModalMode("create");
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-blue-100 text-blue-800",
      "supplier search": "bg-yellow-100 text-yellow-800",
      stopped: "bg-red-100 text-red-800",
      successful: "bg-green-100 text-green-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    return priority === "High"
      ? "bg-red-100 text-red-800"
      : "bg-gray-100 text-gray-800";
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "successful":
        return <CheckCircleIcon className="h-4 w-4" />;
      case "stopped":
        return <PauseIcon className="h-4 w-4" />;
      case "supplier search":
        return <MagnifyingGlassIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Requested Items Management
          </h1>
          <p className="text-gray-600">
            Manage and track all requested items across businesses
          </p>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.total}
                  </p>
                </div>
                <div className="bg-gray-100 rounded-full p-3">
                  <ClockIcon className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </div>
            {statistics.byStatus.map((stat: any) => (
              <div
                key={stat.status}
                className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 capitalize">
                      {stat.status}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.count}
                    </p>
                  </div>
                  <div
                    className={`rounded-full p-3 ${
                      getStatusColor(stat.status).split(" ")[0]
                    }`}
                  >
                    {getStatusIcon(stat.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters & Actions */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100/50 mb-6">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="w-full lg:w-96 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by item name, material, or specification..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-2 text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all flex items-center gap-2"
                >
                  <FunnelIcon className="h-5 w-5" />
                  Filters
                  {(filters.requestStatus ||
                    filters.priority ||
                    filters.interval) && (
                    <span className="bg-gray-500 text-white px-2 py-0.5 rounded-full text-xs">
                      Active
                    </span>
                  )}
                </button>

                <button
                  onClick={fetchRequestedItems}
                  disabled={loading}
                  className="px-4 py-2 text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <ArrowPathIcon
                    className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>

                <CustomButton
                  gradient={true}
                  onClick={() => {
                    resetForm();
                    setShowCreateModal(true);
                  }}
                  className="px-4 py-2 bg-gray-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-gray-700/90 transition-all flex items-center gap-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add Request
                </CustomButton>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-gray-200/50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={filters.requestStatus || ""}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          requestStatus: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                    >
                      <option value="">All Statuses</option>
                      {getAvailableStatuses().map((status: any) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={filters.priority || ""}
                      onChange={(e) =>
                        setFilters({ ...filters, priority: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                    >
                      <option value="">All Priorities</option>
                      {getAvailablePriorities().map((priority: any) => (
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Interval
                    </label>
                    <select
                      value={filters.interval || ""}
                      onChange={(e) =>
                        setFilters({ ...filters, interval: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                    >
                      <option value="">All Intervals</option>
                      {getAvailableIntervals().map((interval: any) => (
                        <option key={interval.value} value={interval.value}>
                          {interval.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Extra Items
                    </label>
                    <select
                      value={filters.extraItems || ""}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          extraItems: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                    >
                      <option value="">All</option>
                      <option value="YES">Yes</option>
                      <option value="NO">No</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setFilters({
                        search: "",
                        requestStatus: "",
                        priority: "",
                        interval: "",
                        extraItems: "" as any,
                        sortBy: "",
                        sortOrder: "DESC",
                        page: 1,
                        limit: itemsPerPage,
                      });
                      setCurrentPage(1);
                    }}
                    className="px-4 py-2 text-gray-600 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100/50 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center gap-3">
                <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-500" />
                <span className="text-gray-600">Loading items...</span>
              </div>
            </div>
          ) : requestedItems.length === 0 ? (
            <div className="p-12 text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No requested items found</p>
              <p className="text-gray-500 text-sm mt-2">
                Try adjusting your filters or add a new item
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/50 border-b border-gray-200/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact Person
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Business
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Interval
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Extra Items
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions{" "}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {requestedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => handleItemClick(item)}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.itemName}
                          </div>
                          {item.material && (
                            <div className="text-xs text-gray-500">
                              Material: {item.material}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {item.contactPerson?.name +
                            " " +
                            item.contactPerson?.familyName || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={`/bussinesses/new?businessId=${item.business.customer.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800
                          text-left"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {" "}
                          {item.business?.customer.companyName || "-"}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {item.qty}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          {item.interval}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <select
                          value={item.priority}
                          onChange={(e) => {
                            e.stopPropagation();
                            handlePriorityUpdate(item.id, e.target.value);
                          }}
                          className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${getPriorityColor(
                            item.priority
                          )}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {getAvailablePriorities().map((priority) => (
                            <option key={priority.value} value={priority.value}>
                              {priority.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <select
                          value={item.requestStatus}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleStatusUpdate(item.id, e.target.value);
                          }}
                          className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${getStatusColor(
                            item.requestStatus
                          )}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {getAvailableStatuses().map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.extraItems === "YES" ? (
                          <span className="inline-flex text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(item.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {user?.role === UserRole.ADMIN && (
                          <button
                            onClick={async () => {
                              await deleteRequestedItem(item.id);
                            }}
                          >
                            <Delete sx={{ fontSize: 16, color: "red" }} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200/50 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
                {totalRecords} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 text-sm rounded-lg transition-all ${
                          currentPage === pageNum
                            ? "bg-gray-600 text-white"
                            : "bg-white/80 backdrop-blur-sm border border-gray-300/80 hover:bg-white/60"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="px-2 text-gray-500">...</span>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className={`px-3 py-1 text-sm rounded-lg transition-all ${
                          currentPage === totalPages
                            ? "bg-gray-600 text-white"
                            : "bg-white/80 backdrop-blur-sm border border-gray-300/80 hover:bg-white/60"
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {modalMode === "edit"
                      ? "Edit Requested Item"
                      : "Add New Requested Item"}
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Edit Mode Switch */}
                {modalMode === "edit" && (
                  <div className="mb-6 flex items-center justify-between bg-gray-50 rounded-lg p-4">
                    <span className="text-sm font-medium text-gray-700">
                      Edit Mode
                    </span>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 mr-3">
                        {editModeEnabled ? "Enabled" : "Disabled"}
                      </span>
                      <button
                        type="button"
                        className={`${
                          editModeEnabled ? "bg-gray-600" : "bg-gray-200"
                        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2`}
                        onClick={() => setEditModeEnabled(!editModeEnabled)}
                      >
                        <span
                          className={`${
                            editModeEnabled ? "translate-x-5" : "translate-x-0"
                          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Contact Person Dropdown - Now comes first */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Person *
                      </label>
                      <select
                        value={formData.contactPersonId}
                        onChange={(e) =>
                          handleContactPersonChange(e.target.value)
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Select Contact Person</option>
                        {loadingContactPersons ? (
                          <option value="" disabled>
                            Loading contact persons...
                          </option>
                        ) : contactPersons.length > 0 ? (
                          contactPersons.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.name} {person.familyName}
                              {person.position ? ` - ${person.position}` : ""}
                              {person.email ? ` (${person.email})` : ""}
                              {person.starBusinessDetails?.companyName
                                ? ` - ${person.starBusinessDetails.companyName}`
                                : ""}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>
                            No contact persons found
                          </option>
                        )}
                      </select>
                    </div>

                    {/* Business ID - Now auto-populated and read-only */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Business ID *
                      </label>
                      <input
                        type="text"
                        value={formData.businessId}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300/80 bg-gray-100 rounded-lg cursor-not-allowed"
                        placeholder="Will be auto-filled when you select a contact person"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Business ID is automatically set from the selected
                        contact person
                      </p>
                    </div>

                    {/* Item Name */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item Name *
                      </label>
                      <input
                        type="text"
                        value={formData.itemName}
                        onChange={(e) =>
                          setFormData({ ...formData, itemName: e.target.value })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Enter item name"
                      />
                    </div>

                    {/* Rest of the form remains the same */}
                    {/* Material & Specification */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Material
                      </label>
                      <input
                        type="text"
                        value={formData.material}
                        onChange={(e) =>
                          setFormData({ ...formData, material: e.target.value })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Enter material"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Specification
                      </label>
                      <input
                        type="text"
                        value={formData.specification}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            specification: e.target.value,
                          })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Enter specification"
                      />
                    </div>

                    {/* Quantity & Interval */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="text"
                        value={formData.qty}
                        onChange={(e) =>
                          setFormData({ ...formData, qty: e.target.value })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="e.g., 100 Stk"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Interval
                      </label>
                      <select
                        value={formData.interval}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            interval: e.target.value as any,
                          })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        {getAvailableIntervals().map((interval) => (
                          <option key={interval.value} value={interval.value}>
                            {interval.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Priority & Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            priority: e.target.value as any,
                          })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        {getAvailablePriorities().map((priority) => (
                          <option key={priority.value} value={priority.value}>
                            {priority.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={formData.requestStatus}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            requestStatus: e.target.value as any,
                          })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        {getAvailableStatuses().map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Extra Items */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Extra Items
                      </label>
                      <select
                        value={formData.extraItems}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            extraItems: e.target.value as any,
                          })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="NO">No</option>
                        <option value="YES">Yes</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sample Quantity
                      </label>
                      <input
                        type="text"
                        value={formData.sampleQty}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sampleQty: e.target.value,
                          })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="e.g., 10 Stk"
                      />
                    </div>

                    {/* Extra Items Description */}
                    {formData.extraItems === "YES" && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Extra Items Description
                        </label>
                        <textarea
                          value={formData.extraItemsDescriptions}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              extraItemsDescriptions: e.target.value,
                            })
                          }
                          rows={2}
                          disabled={modalMode === "edit" && !editModeEnabled}
                          className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Describe the extra items..."
                        />
                      </div>
                    )}

                    {/* Expected Delivery */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expected Delivery
                      </label>
                      <input
                        type="text"
                        value={formData.expectedDelivery}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            expectedDelivery: e.target.value,
                          })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="e.g., Within 2 weeks"
                      />
                    </div>

                    {/* Comments */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Comments
                      </label>
                      <textarea
                        value={formData.comment}
                        onChange={(e) =>
                          setFormData({ ...formData, comment: e.target.value })
                        }
                        rows={3}
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Additional comments..."
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowCreateModal(false);
                        resetForm();
                      }}
                      className="px-4 py-2 text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all"
                    >
                      {modalMode === "edit" && !editModeEnabled
                        ? "Close"
                        : "Cancel"}
                    </button>
                    {(modalMode === "create" ||
                      (modalMode === "edit" && editModeEnabled)) && (
                      <CustomButton
                        gradient={true}
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-gray-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-gray-700/90 transition-all"
                      >
                        {modalMode === "edit"
                          ? "Update Request"
                          : "Add Request"}
                      </CustomButton>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestedItemsPage;

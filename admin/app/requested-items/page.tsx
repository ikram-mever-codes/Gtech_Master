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
  ChatBubbleLeftIcon,
  CubeIcon,
  LinkIcon,
  DocumentTextIcon,
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
import { getAllBusinesses } from "@/api/bussiness";
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
  const [allRequestedItems, setAllRequestedItems] = useState<RequestedItem[]>(
    []
  ); // Store all items for frontend filtering
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
  const [businessesWithRequests, setBusinessesWithRequests] = useState<any[]>(
    []
  );
  const [loadingBusinessesWithRequests, setLoadingBusinessesWithRequests] =
    useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  // Add state for contact persons
  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);
  const [loadingContactPersons, setLoadingContactPersons] = useState(false);
  const [filteredContactPersons, setFilteredContactPersons] = useState<
    ContactPerson[]
  >([]);

  // Add state for businesses
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");

  // Add state for notes popup
  const [showNotesPopup, setShowNotesPopup] = useState(false);
  const [selectedItemNotes, setSelectedItemNotes] =
    useState<RequestedItem | null>(null);

  const itemsPerPage = 20;

  const getBusinessesWithRequests = useCallback((items: RequestedItem[]) => {
    const businessMap = new Map();

    items.forEach((item) => {
      if (item.business?.customer) {
        const businessId = item.business.customer.id;
        if (!businessMap.has(businessId)) {
          businessMap.set(businessId, {
            id: businessId,
            displayName:
              item.business.customer.companyName ||
              item.business.customer.legalName,
            companyName: item.business.customer.companyName,
            legalName: item.business.customer.legalName,
          });
        }
      }
    });

    return Array.from(businessMap.values());
  }, []);
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
    extraNote: "",
    material: "",
    specification: "",
    extraItems: "NO",
    extraItemsDescriptions: "",
    qty: "",
    interval: "Monatlich",
    sampleQty: "",
    expectedDelivery: "",
    priority: "Normal",
    requestStatus: "Open",
    comment: "",
    asanaLink: "",
  });

  // Fetch businesses on component mount
  useEffect(() => {
    const fetchBusinesses = async () => {
      setLoadingBusinesses(true);
      try {
        const response: any = await getAllBusinesses();
        console.log("Businesses response:", response);
        if (response?.data?.businesses) {
          setBusinesses(response.data.businesses);
        } else if (Array.isArray(response?.data)) {
          setBusinesses(response.data);
        } else {
          console.error("Unexpected response structure:", response);
          setBusinesses([]);
        }
      } catch (error) {
        console.error("Error fetching businesses:", error);
        toast.error("Failed to fetch businesses");
        setBusinesses([]);
      } finally {
        setLoadingBusinesses(false);
      }
    };

    fetchBusinesses();
  }, []);

  // Fetch contact persons on component mount
  useEffect(() => {
    const fetchContactPersons = async () => {
      setLoadingContactPersons(true);
      try {
        const response: any = await getAllContactPersons();
        console.log("Contact persons response:", response);
        if (response?.data?.contactPersons) {
          setContactPersons(response.data.contactPersons);
          setFilteredContactPersons(response.data.contactPersons); // Initialize filtered list
        } else {
          console.error("Unexpected response structure:", response);
          setContactPersons([]);
          setFilteredContactPersons([]);
        }
      } catch (error) {
        console.error("Error fetching contact persons:", error);
        toast.error("Failed to fetch contact persons");
        setContactPersons([]);
        setFilteredContactPersons([]);
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

      // When creating new item, update filtered list based on selected business
      if (modalMode === "create") {
        const businessContactPersons = contactPersons.filter(
          (person) =>
            person.starBusinessDetailsId ===
            selectedContactPerson.starBusinessDetailsId
        );
        setFilteredContactPersons(businessContactPersons);
      }
    } else {
      setFormData({
        ...formData,
        contactPersonId: "",
        businessId: "",
      });

      // Reset to all contact persons when nothing is selected
      if (modalMode === "create") {
        setFilteredContactPersons(contactPersons);
      }
    }
  };

  // Fetch requested items
  const fetchRequestedItems = useCallback(async () => {
    setLoading(true);
    try {
      const filterParams: any = {
        ...filters,
        page: 1,
        limit: 10000, // Fetch all items for frontend filtering
      };

      const response = await getAllRequestedItems(filterParams);

      setAllRequestedItems(response || []);
    } catch (error) {
      console.error("Error fetching requested items:", error);
      toast.error("Failed to fetch requested items");
    } finally {
      setLoading(false);
    }
  }, [filters]);

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

  useEffect(() => {
    let filtered = allRequestedItems;

    // Filter by business if selected
    if (selectedBusinessId) {
      filtered = filtered.filter(
        (item) => item.business?.customer?.id === selectedBusinessId
      );
    }

    // Calculate pagination
    const totalFiltered = filtered.length;
    const totalPagesCalc = Math.ceil(totalFiltered / itemsPerPage);
    setTotalPages(totalPagesCalc);
    setTotalRecords(totalFiltered);

    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = filtered.slice(startIndex, endIndex);

    setRequestedItems(paginatedItems);

    // Update businesses with requests whenever allRequestedItems changes
    const businessesWithRequestsData =
      getBusinessesWithRequests(allRequestedItems);
    setBusinessesWithRequests(businessesWithRequestsData);
  }, [
    allRequestedItems,
    selectedBusinessId,
    currentPage,
    itemsPerPage,
    getBusinessesWithRequests,
  ]);

  // Handle notes icon click
  const handleNotesClick = (item: RequestedItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItemNotes(item);
    setShowNotesPopup(true);
  };

  // Handle Asana link click
  const handleAsanaLinkClick = (asanaLink: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(asanaLink, "_blank");
  };

  // Handle item click - open modal in view mode
  const handleItemClick = (item: RequestedItem) => {
    setModalMode("edit");
    setEditingItemId(item.id);
    setEditModeEnabled(false);

    // Filter contact persons by the business of the current item
    const businessContactPersons = contactPersons.filter(
      (person) => person.starBusinessDetailsId === item.businessId
    );
    setFilteredContactPersons(businessContactPersons);

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
      extraNote: item.extraNote || "",
      asanaLink: item.asanaLink || "",
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

  // Handle delete item
  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        await deleteRequestedItem(itemId);
        fetchRequestedItems();
        fetchStatistics();
      } catch (error) {
        console.error("Error deleting item:", error);
        toast.error("Failed to delete item");
      }
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
      extraNote: "",
      priority: "Normal",
      requestStatus: "Open",
      comment: "",
      asanaLink: "",
    });
    setEditModeEnabled(false);
    setEditingItemId(null);
    setModalMode("create");
    setFilteredContactPersons(contactPersons); // Reset to show all contact persons for new item
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
    <div className="min-h-screen bg-white shadow-xl rounded-lg p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        {/* Header */}
        <div className="mb-8 w-full flex justify-between items-center">
          <div className="">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Requested Items
            </h1>
          </div>
          <div>
            <div className="flex gap-3">
              {/* Business Filter Dropdown - Updated to only show businesses with requests */}
              <select
                value={selectedBusinessId}
                onChange={(e) => {
                  setSelectedBusinessId(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all"
                disabled={loadingBusinessesWithRequests}
              >
                <option value="">All Businesses with Requests</option>
                {loadingBusinessesWithRequests ? (
                  <option value="" disabled>
                    Loading businesses...
                  </option>
                ) : businessesWithRequests.length > 0 ? (
                  businessesWithRequests
                    .sort((a, b) => a.displayName.localeCompare(b.displayName))
                    .map((business) => (
                      <option key={business.id} value={business.id}>
                        {business.displayName}
                      </option>
                    ))
                ) : (
                  <option value="" disabled>
                    No businesses with requests found
                  </option>
                )}
              </select>

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

        {/* Items Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-md shadow-lg border border-gray-100/50 overflow-hidden">
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
                <thead className="bg-gray-200/50 border-b border-gray-200/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Business & Contact
                    </th>
                    <th className="px-6  w-[8rem] py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity & Interval
                    </th>
                    <th className="w-[8rem] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>

                    <th className=" w-[14rem] px-0 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Extra Note{" "}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {requestedItems.map((item) => (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        item.priority === "High" ? "bg-red-300/40" : ""
                      }`}
                    >
                      <td
                        className="px-6 py-4 cursor-pointer"
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="w-[10rem]">
                          <div className="text-sm font-medium text-gray-900">
                            {item.itemName}
                          </div>
                          {item.material && (
                            <div className="text-xs text-gray-500">
                              {item.material}
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        className="px-6 py-4 cursor-pointer"
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="w-[10rem]">
                          <a
                            href={`/bussinesses/new?businessId=${item.business.customer.id}`}
                            className="text-sm text-blue-600 hover:text-blue-800 block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {item.business?.customer.companyName || "-"}
                          </a>
                          <a
                            href={`/contacts?contactId=${item.contactPerson.id}`}
                            className="text-sm text-gray-600 hover:text-gray-800 block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {" "}
                            {item.contactPerson?.name}{" "}
                            {item.contactPerson?.familyName || "-"}
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm w-[4rem] flex flex-col justify-center items-center font-medium text-gray-900">
                          <div>{item.qty}</div>
                          <div>{item.interval}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="w-[8rem] overflow-hidden">
                          <select
                            value={item.requestStatus}
                            onChange={(e) => {
                              handleStatusUpdate(item.id, e.target.value);
                            }}
                            className={`text-xs w-[8rem] px-2 py-1 rounded-full font-medium  border-0 cursor-pointer ${getStatusColor(
                              item.requestStatus
                            )}`}
                          >
                            {getAvailableStatuses().map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="py-4 text-center">
                        <div className="w-[14rem] break-words overflow-hidden">
                          {item.extraNote}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          {/* Notes/Comments Icon */}
                          {(item.comment || item.extraItemsDescriptions) && (
                            <button
                              onClick={(e) => handleNotesClick(item, e)}
                              className="text-blue-500 hover:text-blue-700 transition-colors"
                              title="View notes"
                            >
                              <DocumentTextIcon className="h-5 w-5" />
                            </button>
                          )}
                          {/* Extra Items Icon */}
                          {item.extraItems === "YES" && (
                            <CubeIcon
                              className="h-5 w-5 text-green-500"
                              title="Has extra items"
                            />
                          )}
                          {/* Asana Link Icon */}
                          {item.asanaLink && (
                            <button
                              onClick={(e) =>
                                handleAsanaLinkClick(item.asanaLink!, e)
                              }
                              className="text-purple-500 hover:text-purple-700 transition-colors"
                              title="Open Asana link"
                            >
                              <LinkIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
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

        {/* Notes Popup Modal */}
        {showNotesPopup && selectedItemNotes && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Notes & Details
                  </h2>
                  <button
                    onClick={() => {
                      setShowNotesPopup(false);
                      setSelectedItemNotes(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Extra Note */}
                  {selectedItemNotes.extraNote && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-1">
                        Extra Note
                      </h3>
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {selectedItemNotes.extraNote}
                      </p>
                    </div>
                  )}

                  {/* Extra Items Description */}
                  {selectedItemNotes.extraItemsDescriptions && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-1">
                        Extra Items Description
                      </h3>
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {selectedItemNotes.extraItemsDescriptions}
                      </p>
                    </div>
                  )}

                  {/* Comments */}
                  {selectedItemNotes.comment && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-1">
                        Comments
                      </h3>
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {selectedItemNotes.comment}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setShowNotesPopup(false);
                      setSelectedItemNotes(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {modalMode === "edit"
                      ? "Request Details"
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
                        {modalMode === "edit" && (
                          <span className="text-xs text-gray-500 ml-2">
                            (Showing contacts from this business only)
                          </span>
                        )}
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
                        ) : filteredContactPersons.length > 0 ? (
                          filteredContactPersons.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.name} {person.familyName}
                              {person.position ? ` - ${person.position}` : ""}
                              {person.email ? ` (${person.email})` : ""}
                              {modalMode === "create" &&
                              person.starBusinessDetails?.companyName
                                ? ` - ${person.starBusinessDetails.companyName}`
                                : ""}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>
                            {modalMode === "edit"
                              ? "No contact persons found for this business"
                              : "No contact persons found"}
                          </option>
                        )}
                      </select>
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
                          rows={4}
                          disabled={modalMode === "edit" && !editModeEnabled}
                          className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Describe the extra items..."
                        />
                      </div>
                    )}

                    {/* Extra Note Field */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Extra Note
                      </label>
                      <textarea
                        value={formData.extraNote}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            extraNote: e.target.value,
                          })
                        }
                        rows={4}
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Additional notes..."
                      />
                    </div>

                    {/* Asana Link Field */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Asana Link
                      </label>
                      <input
                        type="url"
                        value={formData.asanaLink}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            asanaLink: e.target.value,
                          })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="https://app.asana.com/..."
                      />
                    </div>

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

                  <div className="mt-6 flex justify-between gap-3">
                    {/* Delete Button in Edit Mode - Only when edit is enabled */}
                    <div>
                      {modalMode === "edit" &&
                        editModeEnabled &&
                        user?.role === UserRole.ADMIN && (
                          <button
                            onClick={() => {
                              if (editingItemId) {
                                handleDeleteItem(editingItemId);
                                setShowCreateModal(false);
                              }
                            }}
                            className="px-4 py-2 text-red-700 bg-white/80 backdrop-blur-sm border border-red-300/80 rounded-lg hover:bg-red-50/60 transition-all"
                          >
                            Delete
                          </button>
                        )}
                    </div>
                    <div className="flex gap-3">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestedItemsPage;

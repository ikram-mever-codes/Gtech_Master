"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon,
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
  LinkIcon,
  DocumentTextIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  TruckIcon,
  CurrencyDollarIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import {
  getAllInquiries,
  createInquiry,
  updateInquiry,
  deleteInquiry,
  getInquiryStatistics,
  exportInquiriesToCSV,
  getInquiriesByCustomer,
  addRequestToInquiry,
  updateRequestInInquiry,
  removeRequestFromInquiry,
  updateInquiryStatus,
  updateInquiryPriority,
  type Inquiry,
  type CreateInquiryPayload,
  type UpdateInquiryPayload,
  type InquirySearchFilters,
  type Request,
  getInquiryStatuses,
  getPriorityOptions,
  getAvailableCurrencies,
  getRequestStatuses,
} from "@/api/inquiry";
import { getAllCustomers } from "@/api/customers";
import { getAllContactPersons } from "@/api/contacts";
import CustomButton from "@/components/UI/CustomButton";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import { UserRole } from "@/utils/interfaces";

interface Customer {
  id: string;
  companyName: string;
  legalName?: string;
  email?: string;
}

interface ContactPerson {
  id: string;
  name: string;
  familyName: string;
  position?: string;
  email?: string;
  starBusinessDetailsId: string;
}

const InquiriesPage: React.FC = () => {
  // State management
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [allInquiries, setAllInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingInquiryId, setEditingInquiryId] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const { user } = useSelector((state: RootState) => state.user);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  const [showRequestsPanel, setShowRequestsPanel] = useState(false);
  const [selectedInquiryForRequests, setSelectedInquiryForRequests] =
    useState<Inquiry | null>(null);
  const [requestFormData, setRequestFormData] = useState<
    Omit<Request, "id" | "inquiryId" | "inquiry">
  >({
    itemName: "",
    description: "",
    images: [],
    dimensions: {},
    quantity: 1,
    purchasePrice: 0,
    currency: "USD",
    notes: "",
    specifications: "",
    material: "",
    color: "",
    finish: "",
    hasSample: false,
    sampleQuantity: 0,
    expectedDeliveryDate: "",
    status: "Draft",
  });
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);

  const itemsPerPage = 20;

  // Form state
  const [formData, setFormData] = useState<CreateInquiryPayload>({
    name: "",
    description: "",
    image: "",
    isAssembly: false,
    customerId: "",
    contactPersonId: "",
    status: "Draft",
    priority: "Medium",
    referenceNumber: "",
    requiredByDate: undefined,
    internalNotes: "",
    termsConditions: "",
    projectLink: "",
    assemblyInstructions: "",

    requests: [],
  });

  // Filters state
  const [filters, setFilters] = useState<InquirySearchFilters>({
    search: "",
    status: "",
    priority: "",
    isAssembly: undefined,
    page: 1,
    limit: itemsPerPage,
    sortBy: "createdAt",
    sortOrder: "DESC",
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchCustomers();
    fetchContactPersons();
  }, []);

  useEffect(() => {
    fetchInquiries();
    // fetchStatistics();
  }, [filters, selectedCustomerId]);

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

  const fetchContactPersons = async () => {
    try {
      const response = await getAllContactPersons();
      if (response?.data?.contactPersons) {
        setContactPersons(response.data.contactPersons);
      }
    } catch (error) {
      console.error("Error fetching contact persons:", error);
      toast.error("Failed to fetch contact persons");
    }
  };

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      let response;
      if (selectedCustomerId) {
        response = await getInquiriesByCustomer(selectedCustomerId);
      } else {
        response = await getAllInquiries(filters);
      }

      if (response?.data) {
        const inquiryData = Array.isArray(response.data)
          ? response.data
          : response.data.inquiries || [];
        setAllInquiries(inquiryData);

        // Calculate pagination
        const totalFiltered = inquiryData.length;
        const totalPagesCalc = Math.ceil(totalFiltered / itemsPerPage);
        setTotalPages(totalPagesCalc);
        setTotalRecords(totalFiltered);

        // Apply pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = inquiryData.slice(startIndex, endIndex);
        setInquiries(paginatedItems);
      }
    } catch (error) {
      console.error("Error fetching inquiries:", error);
      toast.error("Failed to fetch inquiries");
    } finally {
      setLoading(false);
    }
  }, [filters, selectedCustomerId, currentPage]);

  const fetchStatistics = async () => {
    try {
      const response = await getInquiryStatistics();
      if (response?.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  // Handle inquiry click
  const handleInquiryClick = (inquiry: Inquiry) => {
    setModalMode("edit");
    setEditingInquiryId(inquiry.id);
    setEditModeEnabled(false);
    setFormData({
      name: inquiry.name,
      description: inquiry.description || "",
      image: inquiry.image || "",
      isAssembly: inquiry.isAssembly,
      customerId: inquiry.customer.id,
      contactPersonId: inquiry.contactPerson?.id || "",
      status: inquiry.status,
      priority: inquiry.priority,
      referenceNumber: inquiry.referenceNumber || "",
      requiredByDate: inquiry.requiredByDate
        ? new Date(inquiry.requiredByDate)
        : undefined,
      internalNotes: inquiry.internalNotes || "",
      termsConditions: inquiry.termsConditions || "",
      projectLink: inquiry.projectLink || "",
      assemblyInstructions: inquiry.assemblyInstructions || "",

      requests: inquiry.requests || [],
    });
    setShowCreateModal(true);
  };

  // Handle create/edit submission
  const handleSubmit = async () => {
    if (!formData.name || !formData.customerId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (modalMode === "edit" && editingInquiryId) {
        await updateInquiry({
          id: editingInquiryId,
          ...formData,
        } as UpdateInquiryPayload);
      } else {
        await createInquiry(formData);
      }

      resetForm();
      setShowCreateModal(false);
      fetchInquiries();
      //   fetchStatistics();
    } catch (error) {
      console.error(
        `Error ${modalMode === "edit" ? "updating" : "creating"} inquiry:`,
        error
      );
    }
  };

  // Handle delete inquiry
  const handleDeleteInquiry = async (inquiryId: string) => {
    if (window.confirm("Are you sure you want to delete this inquiry?")) {
      try {
        await deleteInquiry(inquiryId);
        fetchInquiries();
        // fetchStatistics();
      } catch (error) {
        console.error("Error deleting inquiry:", error);
        toast.error("Failed to delete inquiry");
      }
    }
  };

  // Handle status update
  const handleStatusUpdate = async (inquiryId: string, newStatus: string) => {
    try {
      await updateInquiryStatus(inquiryId, newStatus as any);
      fetchInquiries();
      //   fetchStatistics();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // Handle priority update
  const handlePriorityUpdate = async (
    inquiryId: string,
    newPriority: string
  ) => {
    try {
      await updateInquiryPriority(inquiryId, newPriority as any);
      fetchInquiries();
      //   fetchStatistics();
    } catch (error) {
      console.error("Error updating priority:", error);
    }
  };

  // Export to CSV
  const handleExportToCSV = async () => {
    try {
      await exportInquiriesToCSV(filters);
    } catch (error) {
      console.error("Error exporting inquiries:", error);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      image: "",
      isAssembly: false,
      customerId: "",
      contactPersonId: "",
      status: "Draft",
      priority: "Medium",
      referenceNumber: "",
      requiredByDate: undefined,
      internalNotes: "",
      termsConditions: "",
      projectLink: "",
      assemblyInstructions: "",

      requests: [],
    });
    setEditModeEnabled(false);
    setEditingInquiryId(null);
    setModalMode("create");
  };

  // Handle requests panel
  const handleViewRequests = (inquiry: Inquiry) => {
    setSelectedInquiryForRequests(inquiry);
    setShowRequestsPanel(true);
  };

  // Handle add/update request
  const handleRequestSubmit = async () => {
    if (!selectedInquiryForRequests) return;

    try {
      if (editingRequestId) {
        await updateRequestInInquiry(
          selectedInquiryForRequests.id,
          editingRequestId,
          requestFormData
        );
      } else {
        await addRequestToInquiry(
          selectedInquiryForRequests.id,
          requestFormData
        );
      }

      // Refresh inquiries to get updated data
      fetchInquiries();

      // Reset request form
      setRequestFormData({
        itemName: "",
        description: "",
        images: [],
        dimensions: {},
        quantity: 1,
        purchasePrice: 0,
        currency: "USD",
        notes: "",
        specifications: "",
        material: "",
        color: "",
        finish: "",
        hasSample: false,
        sampleQuantity: 0,
        expectedDeliveryDate: "",
        status: "Draft",
      });
      setEditingRequestId(null);

      toast.success(
        `Request ${editingRequestId ? "updated" : "added"} successfully`
      );
    } catch (error) {
      console.error("Error handling request:", error);
    }
  };

  // Handle edit request
  const handleEditRequest = (request: Request) => {
    setRequestFormData({
      itemName: request.itemName,
      description: request.description || "",
      images: request.images || [],
      dimensions: request.dimensions || {},
      quantity: request.quantity,
      purchasePrice: request.purchasePrice,
      currency: request.currency,
      notes: request.notes || "",
      specifications: request.specifications || "",
      material: request.material || "",
      color: request.color || "",
      finish: request.finish || "",
      hasSample: request.hasSample || false,
      sampleQuantity: request.sampleQuantity || 0,
      expectedDeliveryDate: request.expectedDeliveryDate || "",
      status: request.status,
    });
    setEditingRequestId(request.id!);
  };

  // Handle delete request
  const handleDeleteRequest = async (requestId: string) => {
    if (!selectedInquiryForRequests) return;

    if (window.confirm("Are you sure you want to delete this request?")) {
      try {
        await removeRequestFromInquiry(
          selectedInquiryForRequests.id,
          requestId
        );
        fetchInquiries();
        toast.success("Request deleted successfully");
      } catch (error) {
        console.error("Error deleting request:", error);
        toast.error("Failed to delete request");
      }
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const statusObj = getInquiryStatuses().find((s) => s.value === status);
    return statusObj?.color || "bg-gray-100 text-gray-800";
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    const priorityObj = getPriorityOptions().find((p) => p.value === priority);
    return priorityObj?.color || "bg-gray-100 text-gray-800";
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

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-white shadow-xl rounded-lg p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 w-full flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Inquiries</h1>
            <p className="text-gray-600">
              Manage customer inquiries and requests
            </p>
          </div>
          <div>
            <div className="flex gap-3">
              {/* Customer Filter */}
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all"
              >
                <option value="">All Customers</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.companyName || customer.legalName}
                  </option>
                ))}
              </select>

              {/* Refresh */}
              <button
                onClick={fetchInquiries}
                disabled={loading}
                className="px-4 py-2 text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <ArrowPathIcon
                  className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              {/* Export */}
              <button
                onClick={handleExportToCSV}
                className="px-4 py-2 text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Export CSV
              </button>

              {/* Add Inquiry */}
              <CustomButton
                gradient={true}
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="px-4 py-2 bg-gray-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-gray-700/90 transition-all flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                New Inquiry
              </CustomButton>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Inquiries</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.total}
                  </p>
                </div>
                <div className="bg-gray-100 rounded-full p-3">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </div>

            {statistics.byStatus &&
              statistics.byStatus.slice(0, 4).map((stat: any) => (
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
                      {stat.status === "Accepted" ? (
                        <CheckCircleIcon className="h-6 w-6" />
                      ) : stat.status === "Cancelled" ? (
                        <PauseIcon className="h-6 w-6" />
                      ) : (
                        <ClockIcon className="h-6 w-6" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Inquiries Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-md shadow-lg border border-gray-100/50 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center gap-3">
                <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-500" />
                <span className="text-gray-600">Loading inquiries...</span>
              </div>
            </div>
          ) : inquiries.length === 0 ? (
            <div className="p-12 text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No inquiries found</p>
              <p className="text-gray-500 text-sm mt-2">
                Try adjusting your filters or create a new inquiry
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-200/50 border-b border-gray-200/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inquiry Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer & Contact
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items & Value
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {inquiries.map((inquiry) => (
                    <tr
                      key={inquiry.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td
                        className="px-6 py-4 cursor-pointer"
                        onClick={() => handleInquiryClick(inquiry)}
                      >
                        <div className="w-[14rem]">
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            {inquiry.name}
                            {inquiry.isAssembly && (
                              <CubeIcon
                                className="h-4 w-4 text-blue-500"
                                title="Assembly Item"
                              />
                            )}
                          </div>
                          {inquiry.description && (
                            <div className="text-xs text-gray-500 truncate">
                              {inquiry.description}
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            Created: {formatDate(inquiry.createdAt)}
                          </div>
                        </div>
                      </td>
                      <td
                        className="px-6 py-4 cursor-pointer"
                        onClick={() => handleInquiryClick(inquiry)}
                      >
                        <div className="w-[12rem]">
                          <a
                            href={`/customers/${inquiry.customer.id}`}
                            className="text-sm text-blue-600 hover:text-blue-800 block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {inquiry.customer?.companyName || "-"}
                          </a>
                          {inquiry.contactPerson && (
                            <div className="text-sm text-gray-600">
                              {inquiry.contactPerson?.name}{" "}
                              {inquiry.contactPerson?.familyName}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">
                            {inquiry.requests?.length || 0} items
                          </div>
                          {inquiry.totalEstimatedCost && (
                            <div className="text-xs text-gray-500">
                              {formatCurrency(
                                inquiry.totalEstimatedCost,
                                "USD"
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2 items-center">
                          {/* Status Dropdown */}
                          <select
                            value={inquiry.status}
                            onChange={(e) =>
                              handleStatusUpdate(inquiry.id, e.target.value)
                            }
                            className={`text-xs w-[8rem] px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${getStatusColor(
                              inquiry.status
                            )}`}
                          >
                            {getInquiryStatuses().map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>

                          {/* Priority Badge */}
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(
                              inquiry.priority
                            )}`}
                          >
                            {inquiry.priority}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          {/* View Requests Button */}
                          <button
                            onClick={() => handleViewRequests(inquiry)}
                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all flex items-center gap-1"
                          >
                            <ClipboardDocumentListIcon className="h-4 w-4" />
                            View Requests ({inquiry.requests?.length || 0})
                          </button>

                          {/* Project Link Icon */}
                          {inquiry.projectLink && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(inquiry.projectLink, "_blank");
                              }}
                              className="text-purple-500 hover:text-purple-700 transition-colors"
                              title="Open project link"
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
      </div>

      {/* Create/Edit Inquiry Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {modalMode === "edit"
                    ? "Inquiry Details"
                    : "Create New Inquiry"}
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
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Inquiry Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      disabled={modalMode === "edit" && !editModeEnabled}
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Enter inquiry name"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      disabled={modalMode === "edit" && !editModeEnabled}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Enter inquiry description"
                    />
                  </div>

                  {/* Customer and Contact */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer *
                    </label>
                    <select
                      value={formData.customerId}
                      onChange={(e) =>
                        setFormData({ ...formData, customerId: e.target.value })
                      }
                      disabled={modalMode === "edit" && !editModeEnabled}
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.companyName || customer.legalName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Person
                    </label>
                    <select
                      value={formData.contactPersonId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactPersonId: e.target.value,
                        })
                      }
                      disabled={modalMode === "edit" && !editModeEnabled}
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Contact Person</option>
                      {contactPersons
                        .filter(
                          (person) =>
                            person.starBusinessDetailsId === formData.customerId
                        )
                        .map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name} {person.familyName}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Status and Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as any,
                        })
                      }
                      disabled={modalMode === "edit" && !editModeEnabled}
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {getInquiryStatuses().map((status) => (
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
                      {getPriorityOptions().map((priority) => (
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assembly Section */}
                  <div className="col-span-2 flex items-center gap-3 p-4 bg-blue-50/50 rounded-lg">
                    <input
                      type="checkbox"
                      id="isAssembly"
                      checked={formData.isAssembly}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isAssembly: e.target.checked,
                        })
                      }
                      disabled={modalMode === "edit" && !editModeEnabled}
                      className="h-4 w-4 text-gray-600 rounded focus:ring-gray-500"
                    />
                    <label
                      htmlFor="isAssembly"
                      className="text-sm font-medium text-gray-700"
                    >
                      This inquiry is an assembly of multiple items
                    </label>
                    <CubeIcon className="h-5 w-5 text-blue-500" />
                  </div>

                  {/* Additional Information */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Link (Asana, etc.)
                    </label>
                    <input
                      type="url"
                      value={formData.projectLink || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          projectLink: e.target.value,
                        })
                      }
                      disabled={modalMode === "edit" && !editModeEnabled}
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="https://app.asana.com/..."
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Internal Notes
                    </label>
                    <textarea
                      value={formData.internalNotes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          internalNotes: e.target.value,
                        })
                      }
                      disabled={modalMode === "edit" && !editModeEnabled}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Internal notes..."
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-between gap-3">
                  <div>
                    {modalMode === "edit" &&
                      editModeEnabled &&
                      user?.role === UserRole.ADMIN && (
                        <button
                          onClick={() => {
                            if (editingInquiryId) {
                              handleDeleteInquiry(editingInquiryId);
                              setShowCreateModal(false);
                            }
                          }}
                          className="px-4 py-2 text-red-700 bg-white/80 backdrop-blur-sm border border-red-300/80 rounded-lg hover:bg-red-50/60 transition-all"
                        >
                          Delete Inquiry
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
                          ? "Update Inquiry"
                          : "Create Inquiry"}
                      </CustomButton>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Requests Management Panel */}
      {showRequestsPanel && selectedInquiryForRequests && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Manage Requests for: {selectedInquiryForRequests.name}
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Customer: {selectedInquiryForRequests.customer?.companyName}
                    {selectedInquiryForRequests.isAssembly && (
                      <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        Assembly Item
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowRequestsPanel(false);
                    setSelectedInquiryForRequests(null);
                    setEditingRequestId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Request Form */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingRequestId ? "Edit Request" : "Add New Request"}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={requestFormData.itemName}
                      onChange={(e) =>
                        setRequestFormData({
                          ...requestFormData,
                          itemName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                      placeholder="Enter item name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      value={requestFormData.quantity}
                      onChange={(e) =>
                        setRequestFormData({
                          ...requestFormData,
                          quantity: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Purchase Price *
                    </label>
                    <input
                      type="number"
                      value={requestFormData.purchasePrice}
                      onChange={(e) =>
                        setRequestFormData({
                          ...requestFormData,
                          purchasePrice: parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency *
                    </label>
                    <select
                      value={requestFormData.currency}
                      onChange={(e) =>
                        setRequestFormData({
                          ...requestFormData,
                          currency: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                    >
                      {getAvailableCurrencies().map((currency) => (
                        <option key={currency.value} value={currency.value}>
                          {currency.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={requestFormData.status}
                      onChange={(e) =>
                        setRequestFormData({
                          ...requestFormData,
                          status: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                    >
                      {getRequestStatuses().map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={requestFormData.description}
                      onChange={(e) =>
                        setRequestFormData({
                          ...requestFormData,
                          description: e.target.value,
                        })
                      }
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                      placeholder="Item description..."
                    />
                  </div>

                  <div className="col-span-2 flex justify-end gap-3">
                    {editingRequestId && (
                      <button
                        onClick={() => {
                          setRequestFormData({
                            itemName: "",
                            description: "",
                            images: [],
                            dimensions: {},
                            quantity: 1,
                            purchasePrice: 0,
                            currency: "USD",
                            notes: "",
                            specifications: "",
                            material: "",
                            color: "",
                            finish: "",
                            hasSample: false,
                            sampleQuantity: 0,
                            expectedDeliveryDate: "",
                            status: "Draft",
                          });
                          setEditingRequestId(null);
                        }}
                        className="px-4 py-2 text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <CustomButton
                      gradient={true}
                      onClick={handleRequestSubmit}
                      disabled={
                        !requestFormData.itemName ||
                        requestFormData.quantity < 1
                      }
                      className="px-4 py-2 bg-gray-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-gray-700/90 transition-all disabled:opacity-50"
                    >
                      {editingRequestId ? "Update Request" : "Add Request"}
                    </CustomButton>
                  </div>
                </div>
              </div>

              {/* Requests List */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Requests ({selectedInquiryForRequests.requests?.length || 0})
                </h3>
                {selectedInquiryForRequests.requests &&
                selectedInquiryForRequests.requests.length > 0 ? (
                  <div className="space-y-3">
                    {selectedInquiryForRequests.requests.map((request) => (
                      <div
                        key={request.id}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-medium text-gray-900">
                                {request.itemName}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  getRequestStatuses().find(
                                    (s) => s.value === request.status
                                  )?.color
                                }`}
                              >
                                {request.status}
                              </span>
                              <span className="text-sm text-gray-600">
                                Qty: {request.quantity}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {formatCurrency(
                                  request.purchasePrice,
                                  request.currency
                                )}
                              </span>
                            </div>
                            {request.description && (
                              <p className="text-sm text-gray-600 mb-2">
                                {request.description}
                              </p>
                            )}
                            {request.material && (
                              <div className="text-xs text-gray-500">
                                Material: {request.material}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditRequest(request)}
                              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-all"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteRequest(request.id!)}
                              className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 border border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">
                      No requests found for this inquiry
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Add requests using the form above
                    </p>
                  </div>
                )}
              </div>

              {/* Status Logic Note */}
              {selectedInquiryForRequests.isAssembly && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        Assembly Item Status Logic
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        For assembly items, request statuses are managed
                        independently from the inquiry status. Changing the
                        inquiry status will not affect individual request
                        statuses.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InquiriesPage;

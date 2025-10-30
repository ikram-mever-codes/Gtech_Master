"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  UserPlusIcon,
  ExclamationCircleIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Linkedin, Users, Building2, UserCheck } from "lucide-react";
import {
  getAllContactPersons,
  createContactPerson,
  updateContactPerson,
  deleteContactPerson,
  exportContactPersonsToCSV,
  updateContactLinkedInState,
  getContactPersonStatistics,
  getAllStarBusinesses,
  getStarBusinessesWithoutContacts,
  fetchStarBusinessesForDropdown,
  POSITIONS,
  LINKEDIN_STATES,
  CONTACT_TYPES,
  SEX_OPTIONS,
  DECISION_MAKER_STATES,
  type ContactPersonData,
  type ContactPersonFilters,
  type CreateContactPersonPayload,
  type StarBusinessData,
  type StarBusinessWithoutContactData,
} from "@/api/contacts";
import CustomButton from "@/components/UI/CustomButton";
import { Google, LinkedIn } from "@mui/icons-material";

// Tab type
type TabType = "all" | "no-contacts" | "sales";

// Modal mode type
type ModalMode = "create" | "edit";

const ContactPersonsPage: React.FC = () => {
  const router = useRouter();

  // State management
  const [activeTab, setActiveTab] = useState<TabType>("no-contacts");
  const [contactPersons, setContactPersons] = useState<ContactPersonData[]>([]);
  const [decisionMakers, setDecisionMakers] = useState<ContactPersonData[]>([]);
  const [starBusinessesWithoutContacts, setStarBusinessesWithoutContacts] =
    useState<StarBusinessWithoutContactData[]>([]);
  const [allStarBusinesses, setAllStarBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDecisionMakers, setLoadingDecisionMakers] = useState(false);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [decisionMakersPage, setDecisionMakersPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [decisionMakersTotalPages, setDecisionMakersTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [decisionMakersTotalRecords, setDecisionMakersTotalRecords] =
    useState(0);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(
    new Set()
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [businessSearchTerm, setBusinessSearchTerm] = useState("");
  const [businessesWithoutContactsCount, setBusinessesWithoutContactsCount] =
    useState(0);
  const [editModeEnabled, setEditModeEnabled] = useState(false);

  const itemsPerPage = 20;

  // Filter state - simplified
  const [filters, setFilters] = useState<any>({
    search: "",
    position: "" as any,
    stateLinkedIn: "" as any,
    contact: "" as any,
    decisionMakerState: "" as any,
    page: 1,
    limit: itemsPerPage,
  });

  // Decision Makers filter state
  const [decisionMakersFilters, setDecisionMakersFilters] = useState<any>({
    search: "",
    position: "" as any,
    stateLinkedIn: "" as any,
    contact: "" as any,
    decisionMakerState: "" as any,
    page: 1,
    limit: itemsPerPage,
  });

  // Create/Edit contact form state
  const [createForm, setCreateForm] = useState<CreateContactPersonPayload>({
    starBusinessDetailsId: "",
    name: "",
    familyName: "",
    sex: "",
    position: "",
    positionOthers: "",
    email: "",
    phone: "",
    linkedInLink: "",
    stateLinkedIn: "open",
    contact: "",
    decisionMakerState: "",
    note: "",
    noteContactPreference: "",
  });

  // Fetch contact persons
  const fetchContactPersons = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAllContactPersons({
        ...filters,
        page: currentPage,
        limit: itemsPerPage,
      });

      if (response?.data) {
        setContactPersons(response.data.contactPersons || []);
        setTotalRecords(response.data.pagination?.total || 0);
        setTotalPages(response.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching contact persons:", error);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage]);

  // Fetch decision makers
  const fetchDecisionMakers = useCallback(async () => {
    setLoadingDecisionMakers(true);
    try {
      const response = await getAllContactPersons({
        ...decisionMakersFilters,
        page: decisionMakersPage,
        limit: itemsPerPage,
        isDecisionMaker: true,
      });

      if (response?.data) {
        const decisionMakers = (response.data.contactPersons || []).filter(
          (contact: any) =>
            [
              "DecisionMaker technical",
              "DecisionMaker financial",
              "real DecisionMaker",
            ].includes(contact.contact)
        );
        setDecisionMakers(decisionMakers);
        setDecisionMakersTotalRecords(
          response.data.pagination?.total || decisionMakers.length
        );
        setDecisionMakersTotalPages(response.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching decision makers:", error);
    } finally {
      setLoadingDecisionMakers(false);
    }
  }, [decisionMakersFilters, decisionMakersPage]);

  // Fetch star businesses without contacts
  const fetchStarBusinessesWithoutContacts = async () => {
    setLoadingBusinesses(true);
    try {
      const response = await getStarBusinessesWithoutContacts({
        page: 1,
        limit: 20,
      });

      if (response?.data) {
        setStarBusinessesWithoutContacts(response.data.starBusinesses || []);
        setBusinessesWithoutContactsCount(response.data.pagination?.total || 0);
      }
    } catch (error) {
      console.error("Error fetching star businesses without contacts:", error);
      toast.error("Failed to fetch businesses without contacts");
    } finally {
      setLoadingBusinesses(false);
    }
  };

  // Fetch all star businesses for dropdown
  const fetchAllStarBusinesses = async (search?: string) => {
    try {
      const businesses = await fetchStarBusinessesForDropdown(search);
      setAllStarBusinesses(businesses);
    } catch (error) {
      console.error("Error fetching star businesses:", error);
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const response = await getContactPersonStatistics();
      if (response?.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  // Handle contact person click - open modal in view mode
  const handleContactPersonClick = (contact: ContactPersonData) => {
    setModalMode("edit");
    setEditingContactId(contact.id);
    setEditModeEnabled(false); // Start in view mode

    // Populate form with contact data
    setCreateForm({
      starBusinessDetailsId: contact.starBusinessDetailsId || "",
      name: contact.name || "",
      familyName: contact.familyName || "",
      sex: contact.sex || "",
      position: contact.position || "",
      positionOthers: contact.positionOthers || "",
      email: contact.email || "",
      phone: contact.phone || "",
      linkedInLink: contact.linkedInLink || "",
      stateLinkedIn: contact.stateLinkedIn || "open",
      contact: contact.contact || "",
      decisionMakerState: contact.decisionMakerState || "",
      note: contact.note || "",
      noteContactPreference: contact.noteContactPreference || "",
    });

    // Set the selected business if it exists
    if (contact.starBusinessDetailsId) {
      setSelectedBusiness(contact.starBusinessDetailsId);
    }

    // Open the modal
    setShowCreateModal(true);
  };

  // Handle edit contact - open modal in edit mode
  const handleEditContact = (contact: ContactPersonData) => {
    setModalMode("edit");
    setEditingContactId(contact.id);
    setEditModeEnabled(true); // Start in edit mode

    // Populate form with contact data
    setCreateForm({
      starBusinessDetailsId: contact.starBusinessDetailsId || "",
      name: contact.name || "",
      familyName: contact.familyName || "",
      sex: contact.sex || "",
      position: contact.position || "",
      positionOthers: contact.positionOthers || "",
      email: contact.email || "",
      phone: contact.phone || "",
      linkedInLink: contact.linkedInLink || "",
      stateLinkedIn: contact.stateLinkedIn || "open",
      contact: contact.contact || "",
      decisionMakerState: contact.decisionMakerState || "",
      note: contact.note || "",
      noteContactPreference: contact.noteContactPreference || "",
    });

    // Set the selected business if it exists
    if (contact.starBusinessDetailsId) {
      setSelectedBusiness(contact.starBusinessDetailsId);
    }

    // Open the modal
    setShowCreateModal(true);
  };

  // Handle delete contact
  const handleDeleteContact = async (contactId: string) => {
    try {
      await deleteContactPerson(contactId);
      fetchContactPersons(); // Refresh the list
      if (activeTab === "sales") {
        fetchDecisionMakers(); // Refresh decision makers list
      }
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast.error("Failed to delete contact");
    }
  };

  useEffect(() => {
    if (activeTab === "all") {
      fetchContactPersons();
      fetchStatistics();
    } else if (activeTab === "no-contacts") {
      fetchStarBusinessesWithoutContacts();
    } else if (activeTab === "sales") {
      fetchDecisionMakers();
    }
  }, [activeTab, fetchContactPersons, fetchDecisionMakers]);

  // Fetch star businesses when modal opens
  useEffect(() => {
    if (showCreateModal && !selectedBusiness) {
      fetchAllStarBusinesses();
    }
  }, [showCreateModal, selectedBusiness]);

  // Update LinkedIn state
  const handleUpdateLinkedInState = async (
    contactId: string,
    newState: any
  ) => {
    try {
      await updateContactLinkedInState(contactId, newState);
      fetchContactPersons(); // Refresh the list
      if (activeTab === "sales") {
        fetchDecisionMakers(); // Refresh decision makers list
      }
    } catch (error) {
      console.error("Error updating LinkedIn state:", error);
    }
  };

  // Update Decision Maker State
  const handleUpdateDecisionMakerState = async (
    contactId: string,
    newState: any
  ) => {
    try {
      await updateContactPerson(contactId, { decisionMakerState: newState });
      fetchContactPersons();
      if (activeTab === "sales") {
        fetchDecisionMakers();
      }
    } catch (error) {
      console.error("Error updating decision maker state:", error);
      toast.error("Failed to update decision maker state");
    }
  };

  // Export to CSV
  const handleExportToCSV = async () => {
    setLoading(true);
    try {
      const csvData: any = await exportContactPersonsToCSV(filters);

      // Create download link
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contact_persons_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting contacts:", error);
      toast.error("Failed to export contacts");
    } finally {
      setLoading(false);
    }
  };

  // Handle create/edit contact submission
  const handleCreateContact = async () => {
    // Validation
    if (!createForm.name || !createForm.familyName || !createForm.position) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!selectedBusiness?.id && !createForm.starBusinessDetailsId) {
      toast.error("Please select a business");
      return;
    }

    if (createForm.position === "Others" && !createForm.positionOthers) {
      toast.error("Please specify the position");
      return;
    }

    try {
      const payload = {
        ...createForm,
        starBusinessDetailsId:
          selectedBusiness?.id || createForm.starBusinessDetailsId,
      };

      if (modalMode === "edit" && editingContactId) {
        // Update existing contact
        await updateContactPerson(editingContactId, payload);
      } else {
        // Create new contact
        await createContactPerson(payload);
      }

      // Reset form and close modal
      resetCreateForm();
      setShowCreateModal(false);
      setModalMode("create");
      setEditingContactId(null);
      setEditModeEnabled(false);

      // Refresh the list
      fetchContactPersons();

      // Refresh businesses without contacts if we were adding from that tab
      if (activeTab === "no-contacts") {
        fetchStarBusinessesWithoutContacts();
      }

      // Refresh decision makers if we're on sales tab
      if (activeTab === "sales") {
        fetchDecisionMakers();
      }
    } catch (error) {
      console.error(
        `Error ${modalMode === "edit" ? "updating" : "creating"} contact:`,
        error
      );
      toast.error(
        `Failed to ${modalMode === "edit" ? "update" : "create"} contact`
      );
    }
  };

  // Reset form
  const resetCreateForm = () => {
    setCreateForm({
      starBusinessDetailsId: "",
      name: "",
      familyName: "",
      sex: "",
      position: "",
      positionOthers: "",
      email: "",
      phone: "",
      linkedInLink: "",
      stateLinkedIn: "open",
      contact: "",
      decisionMakerState: "",
      note: "",
      noteContactPreference: "",
    });
    setSelectedBusiness(null);
    setEditModeEnabled(false);
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // LinkedIn state colors
  const getLinkedInStateColor = (state: string) => {
    const colors: Record<string, string> = {
      open: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      connected: "bg-blue-100 text-blue-800",
      rejected: "bg-red-100 text-red-800",
    };
    return colors[state] || "bg-gray-100 text-gray-800";
  };

  // Decision Maker state colors
  const getDecisionMakerStateColor = (state: string) => {
    const colors: Record<string, string> = {
      open: "bg-blue-100 text-blue-800",
      ErstEmail: "bg-purple-100 text-purple-800",
      Folgetelefonat: "bg-orange-100 text-orange-800",
      "2.Email": "bg-indigo-100 text-indigo-800",
      Anfragtelefonat: "bg-pink-100 text-pink-800",
      "weiteres Serienteil": "bg-teal-100 text-teal-800",
      "kein Interesse": "bg-red-100 text-red-800",
    };
    return colors[state] || "bg-gray-100 text-gray-800";
  };

  // Position label
  const getPositionLabel = (position: string, positionOthers?: string) => {
    if (position === "Others" && positionOthers) {
      return positionOthers;
    }
    return position;
  };

  // Render note icons
  const renderNoteIcons = (note: any) => {
    if (!note) return null;

    return (
      <div className="flex gap-1">
        <span className="text-blue-500" title="Contact Note">
          📞
        </span>
        <span className="text-green-500" title="Preference Note">
          ⭐
        </span>
        <span className="text-purple-500" title="Sales Note">
          💰
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Contact Persons Management
          </h1>
          <p className="text-gray-600">
            Manage and track all contact persons across star businesses
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("no-contacts")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "no-contacts"
                  ? "border-gray-500 text-gray-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              STARS Without Contacts
              {businessesWithoutContactsCount > 0 && (
                <span className="ml-2 bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs">
                  {businessesWithoutContactsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "all"
                  ? "border-gray-500 text-gray-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              All Contacts
              {totalRecords > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                  {totalRecords}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("sales")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "sales"
                  ? "border-gray-500 text-gray-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Sales View
              {decisionMakers.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                  {decisionMakers.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* All Contacts Tab */}
        {activeTab === "all" && (
          <>
            {/* Filters & Actions */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100/50 mb-6">
              <div className="p-6">
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                  {/* Search */}
                  <div className="w-full lg:w-96 relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or company..."
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
                      {(filters.position ||
                        filters.stateLinkedIn ||
                        filters.contact ||
                        filters.decisionMakerState) && (
                        <span className="bg-gray-500 text-white px-2 py-0.5 rounded-full text-xs">
                          Active
                        </span>
                      )}
                    </button>

                    <button
                      onClick={fetchContactPersons}
                      disabled={loading}
                      className="px-4 py-2 text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <ArrowPathIcon
                        className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
                      />
                      Refresh
                    </button>

                    <button
                      onClick={handleExportToCSV}
                      className="px-4 py-2 text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all flex items-center gap-2"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5" />
                      Export CSV
                    </button>

                    <CustomButton
                      gradient={true}
                      onClick={() => {
                        setModalMode("create");
                        setEditingContactId(null);
                        resetCreateForm();
                        setShowCreateModal(true);
                      }}
                      className="px-4 py-2 bg-gray-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-gray-700/90 transition-all flex items-center gap-2"
                    >
                      <UserPlusIcon className="h-5 w-5" />
                      Add Contact
                    </CustomButton>
                  </div>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                  <div className="mt-6 pt-6 border-t border-gray-200/50">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Position
                        </label>
                        <select
                          value={filters.position || ""}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              position: e.target.value as any,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                        >
                          <option value="">All Positions</option>
                          {POSITIONS.map((pos) => (
                            <option key={pos.value} value={pos.value}>
                              {pos.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          LinkedIn State
                        </label>
                        <select
                          value={filters.stateLinkedIn || ""}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              stateLinkedIn: e.target.value as any,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                        >
                          <option value="">All States</option>
                          {LINKEDIN_STATES.map((state: any) => (
                            <option key={state.value} value={state.value}>
                              {state.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contact Type
                        </label>
                        <select
                          value={filters.contact || ""}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              contact: e.target.value as any,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                        >
                          <option value="">All Types</option>
                          {CONTACT_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Decision Maker State
                        </label>
                        <select
                          value={filters.decisionMakerState || ""}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              decisionMakerState: e.target.value as any,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                        >
                          <option value="">All States</option>
                          {DECISION_MAKER_STATES.map((state: any) => (
                            <option key={state.value} value={state.value}>
                              {state.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => {
                          setFilters({
                            search: "",
                            position: "" as any,
                            stateLinkedIn: "" as any,
                            contact: "" as any,
                            decisionMakerState: "" as any,
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

            {/* Contacts Table */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100/50 overflow-hidden">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="inline-flex items-center gap-3">
                    <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-500" />
                    <span className="text-gray-600">Loading contacts...</span>
                  </div>
                </div>
              ) : contactPersons.length === 0 ? (
                <div className="p-12 text-center">
                  <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No contacts found</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Try adjusting your filters or add a new contact
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/50 border-b border-gray-200/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Business
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Position
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          LinkedIn
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Decision Maker State
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/50">
                      {contactPersons.map((contact) => (
                        <tr
                          key={contact.id}
                          className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                          onClick={() => handleContactPersonClick(contact)}
                        >
                          <td className="px-6 py-4">
                            <a
                              href={`/bussinesses/new?businessId=${contact.businessId}`}
                              className="text-sm text-blue-600 hover:text-blue-800 text-left"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {contact.businessName || "-"}
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {contact.name} {contact.familyName}
                              </div>
                              {contact.sex && (
                                <div className="text-xs text-gray-500">
                                  {contact.sex}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {getPositionLabel(
                                contact.position,
                                contact.positionOthers
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {contact.email && (
                                <a
                                  href={`mailto:${contact.email}`}
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <EnvelopeIcon className="h-3 w-3" />
                                  {contact.email}
                                </a>
                              )}
                              {contact.phone && (
                                <a
                                  href={`tel:${contact.phone}`}
                                  className="flex items-center gap-1 text-xs text-gray-600"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <PhoneIcon className="h-3 w-3" />
                                  {contact.phone}
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 w-[100px] whitespace-nowrap">
                            <select
                              value={contact.stateLinkedIn}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleUpdateLinkedInState(
                                  contact.id,
                                  e.target.value
                                );
                              }}
                              className={`text-xs px-2 w-max max-w-[150px] truncate mr-4 py-1 rounded-full font-medium border-0 cursor-pointer ${getLinkedInStateColor(
                                contact.stateLinkedIn
                              )}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {LINKEDIN_STATES.map((state: any) => (
                                <option key={state.value} value={state.value}>
                                  {state.label}
                                </option>
                              ))}
                            </select>
                            {contact.linkedInLink && (
                              <a
                                href={contact.linkedInLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Linkedin className="h-3 w-3" />
                                Profile
                              </a>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {contact.contact && (
                              <span className="inline-flex text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-800">
                                {contact.contact}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={contact.decisionMakerState || ""}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleUpdateDecisionMakerState(
                                  contact.id,
                                  e.target.value
                                );
                              }}
                              className={`text-xs px-2 w-max max-w-[180px] truncate py-1 rounded-full font-medium border-0 cursor-pointer ${getDecisionMakerStateColor(
                                contact.decisionMakerState || ""
                              )}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {DECISION_MAKER_STATES.map((state: any) => (
                                <option key={state.value} value={state.value}>
                                  {state.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const searchQuery = encodeURIComponent(
                                    `${contact.businessName}`.trim()
                                  );
                                  window.open(
                                    `https://www.google.com/search?q=${searchQuery}`,
                                    "_blank"
                                  );
                                }}
                                className="text-green-600 hover:text-green-800 transition-colors"
                                title="Google Search"
                              >
                                <Google sx={{ fontSize: 18 }} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const searchQuery = encodeURIComponent(
                                    `${contact.businessName} linkedin`.trim()
                                  );
                                  window.open(
                                    `https://www.google.com/search?q=${searchQuery}`,
                                    "_blank"
                                  );
                                }}
                                className="text-blue-700 hover:text-blue-900 transition-colors"
                                title="LinkedIn Search"
                              >
                                <LinkedIn sx={{ fontSize: 18 }} />
                              </button>
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
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const pageNum = i + 1;
                        if (totalPages <= 5) {
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
                        }
                        return null;
                      })}
                      {totalPages > 5 && (
                        <span className="px-2 text-gray-500">...</span>
                      )}
                      {totalPages > 5 && (
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
          </>
        )}

        {/* Sales View Tab */}
        {activeTab === "sales" && (
          <>
            {/* Filters & Actions */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100/50 mb-6">
              <div className="p-6">
                <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                  {/* Search */}
                  <div className="w-full lg:w-96 relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search decision makers by name, email, or company..."
                      value={decisionMakersFilters.search}
                      onChange={(e) =>
                        setDecisionMakersFilters({
                          ...decisionMakersFilters,
                          search: e.target.value,
                        })
                      }
                      className="w-full pl-10 pr-4 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={fetchDecisionMakers}
                      disabled={loadingDecisionMakers}
                      className="px-4 py-2 text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <ArrowPathIcon
                        className={`h-5 w-5 ${
                          loadingDecisionMakers ? "animate-spin" : ""
                        }`}
                      />
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Decision Makers Table */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100/50 overflow-hidden">
              {loadingDecisionMakers ? (
                <div className="p-12 text-center">
                  <div className="inline-flex items-center gap-3">
                    <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-500" />
                    <span className="text-gray-600">
                      Loading decision makers...
                    </span>
                  </div>
                </div>
              ) : decisionMakers.length === 0 ? (
                <div className="p-12 text-center">
                  <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">
                    No decision makers found
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    Decision makers are contacts with isDecisionMaker set to
                    true
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/50 border-b border-gray-200/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Business
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Position
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          LinkedIn State
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Decision Maker State
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Note
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/50">
                      {decisionMakers.map((contact) => (
                        <tr
                          key={contact.id}
                          className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                          onClick={() => handleContactPersonClick(contact)}
                        >
                          <td className="px-6 py-4">
                            <a
                              href={`/bussinesses/new?businessId=${contact.businessId}`}
                              className="text-sm text-blue-600 hover:text-blue-800 text-left"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {contact.businessName || "-"}
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleContactPersonClick(contact);
                              }}
                              className="text-sm font-medium text-gray-900 text-left"
                            >
                              {contact.name} {contact.familyName}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleContactPersonClick(contact);
                              }}
                              className="text-sm text-gray-900 hover:text-blue-600 text-left"
                            >
                              {getPositionLabel(
                                contact.position,
                                contact.positionOthers
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {contact.email && (
                                <a
                                  href={`mailto:${contact.email}`}
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <EnvelopeIcon className="h-3 w-3" />
                                  {contact.email}
                                </a>
                              )}
                              {contact.phone && (
                                <a
                                  href={`tel:${contact.phone}`}
                                  className="flex items-center gap-1 text-xs text-gray-600"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <PhoneIcon className="h-3 w-3" />
                                  {contact.phone}
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleContactPersonClick(contact);
                              }}
                              className="text-sm text-gray-900 hover:text-blue-600 text-left"
                            >
                              {contact.contact && (
                                <span className="inline-flex text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-800">
                                  {contact.contact}
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={contact.stateLinkedIn}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleUpdateLinkedInState(
                                  contact.id,
                                  e.target.value
                                );
                              }}
                              className={`text-xs px-2 w-max max-w-[150px] truncate py-1 rounded-full font-medium border-0 cursor-pointer ${getLinkedInStateColor(
                                contact.stateLinkedIn
                              )}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {LINKEDIN_STATES.map((state: any) => (
                                <option key={state.value} value={state.value}>
                                  {state.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={contact.decisionMakerState || ""}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleUpdateDecisionMakerState(
                                  contact.id,
                                  e.target.value
                                );
                              }}
                              className={`text-xs px-2 w-max max-w-[180px] truncate py-1 rounded-full font-medium border-0 cursor-pointer ${getDecisionMakerStateColor(
                                contact.decisionMakerState || ""
                              )}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {DECISION_MAKER_STATES.map((state: any) => (
                                <option key={state.value} value={state.value}>
                                  {state.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            {renderNoteIcons(contact.note)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const searchQuery = encodeURIComponent(
                                    `${contact.businessName}`.trim()
                                  );
                                  window.open(
                                    `https://www.google.com/search?q=${searchQuery}`,
                                    "_blank"
                                  );
                                }}
                                className="text-green-600 hover:text-green-800 transition-colors"
                                title="Google Search"
                              >
                                <Google sx={{ fontSize: 18 }} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditContact(contact);
                                }}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="Edit contact"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {decisionMakersTotalPages > 1 && (
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200/50 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {(decisionMakersPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(
                      decisionMakersPage * itemsPerPage,
                      decisionMakersTotalRecords
                    )}{" "}
                    of {decisionMakersTotalRecords} results
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setDecisionMakersPage(
                          Math.max(1, decisionMakersPage - 1)
                        )
                      }
                      disabled={decisionMakersPage === 1}
                      className="px-3 py-1 text-sm bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {[...Array(Math.min(5, decisionMakersTotalPages))].map(
                        (_, i) => {
                          const pageNum = i + 1;
                          if (decisionMakersTotalPages <= 5) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setDecisionMakersPage(pageNum)}
                                className={`px-3 py-1 text-sm rounded-lg transition-all ${
                                  decisionMakersPage === pageNum
                                    ? "bg-gray-600 text-white"
                                    : "bg-white/80 backdrop-blur-sm border border-gray-300/80 hover:bg-white/60"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                          return null;
                        }
                      )}
                      {decisionMakersTotalPages > 5 && (
                        <span className="px-2 text-gray-500">...</span>
                      )}
                      {decisionMakersTotalPages > 5 && (
                        <button
                          onClick={() =>
                            setDecisionMakersPage(decisionMakersTotalPages)
                          }
                          className={`px-3 py-1 text-sm rounded-lg transition-all ${
                            decisionMakersPage === decisionMakersTotalPages
                              ? "bg-gray-600 text-white"
                              : "bg-white/80 backdrop-blur-sm border border-gray-300/80 hover:bg-white/60"
                          }`}
                        >
                          {decisionMakersTotalPages}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        setDecisionMakersPage(
                          Math.min(
                            decisionMakersTotalPages,
                            decisionMakersPage + 1
                          )
                        )
                      }
                      disabled={decisionMakersPage === decisionMakersTotalPages}
                      className="px-3 py-1 text-sm bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                    >
                      Next
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Businesses Without Contacts Tab */}
        {activeTab === "no-contacts" && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100/50">
            {loadingBusinesses ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center gap-3">
                  <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-500" />
                  <span className="text-gray-600">Loading businesses...</span>
                </div>
              </div>
            ) : starBusinessesWithoutContacts.length === 0 ? (
              <div className="p-12 text-center">
                <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">
                  All businesses have contacts!
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Great job maintaining your contact database
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/50 border-b border-gray-200/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Business Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Industry
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Website
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Added
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/50">
                    {starBusinessesWithoutContacts.map((business) => (
                      <tr
                        key={business.id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <a
                            href={`/bussinesses/new?businessId=${business.id}`}
                            className="text-sm text-blue-600 hover:text-blue-800 text-left"
                          >
                            {business.companyName}
                          </a>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {`${business.city}`}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {business.industry || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {business.website ? (
                            <a
                              href={business.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              Visit
                            </a>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(business.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setModalMode("create");
                                setEditingContactId(null);
                                resetCreateForm();
                                setSelectedBusiness(business);
                                setShowCreateModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title="Add detailed contact"
                            >
                              <UserGroupIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Create/Edit Contact Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {modalMode === "edit"
                      ? "Edit Contact Person"
                      : "Add New Contact Person"}
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetCreateForm();
                      setModalMode("create");
                      setEditingContactId(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Edit Mode Switch - Only show in edit mode */}
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
                        role="switch"
                        aria-checked={editModeEnabled}
                        onClick={() => setEditModeEnabled(!editModeEnabled)}
                      >
                        <span
                          aria-hidden="true"
                          className={`${
                            editModeEnabled ? "translate-x-5" : "translate-x-0"
                          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Business Selection */}
                  {!selectedBusiness && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Business *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Geschäft suchen..."
                          value={businessSearchTerm}
                          onChange={(e) => {
                            setBusinessSearchTerm(e.target.value);
                            fetchAllStarBusinesses(e.target.value);
                          }}
                          disabled={modalMode === "edit" && !editModeEnabled}
                          className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        {allStarBusinesses.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                            {allStarBusinesses.map((business) => (
                              <button
                                key={business.id || business.value}
                                onClick={() => {
                                  setSelectedBusiness(business);
                                  setCreateForm({
                                    ...createForm,
                                    starBusinessDetailsId:
                                      business.id || business.value,
                                  });
                                  setBusinessSearchTerm("");
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium">
                                  {business.name ||
                                    business.label ||
                                    business.companyName}
                                </div>
                                {business.city && (
                                  <div className="text-sm text-gray-500">
                                    {business.city}, {business.state}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Selected Business Display */}
                  {selectedBusiness && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {selectedBusiness.name ||
                              selectedBusiness.label ||
                              selectedBusiness.companyName}
                          </h3>
                          {selectedBusiness.city && (
                            <p className="text-sm text-gray-500">
                              {selectedBusiness.city}, {selectedBusiness.state}
                            </p>
                          )}
                        </div>
                        {modalMode !== "edit" && (
                          <button
                            onClick={() => {
                              setSelectedBusiness(null);
                              setCreateForm({
                                ...createForm,
                                starBusinessDetailsId: "",
                              });
                            }}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contact Form */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Personal Information */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={createForm.name}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, name: e.target.value })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Peter"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={createForm.familyName}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            familyName: e.target.value,
                          })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Müller"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sex
                      </label>
                      <select
                        value={createForm.sex}
                        onChange={(e: any) =>
                          setCreateForm({
                            ...createForm,
                            sex: e.target.value,
                          })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Geschlecht auswählen</option>
                        {SEX_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Position *
                      </label>
                      <select
                        value={createForm.position}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            position: e.target.value as any,
                          })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Position auswählen</option>
                        {POSITIONS.map((pos) => (
                          <option key={pos.value} value={pos.value}>
                            {pos.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Position Others */}
                    {createForm.position === "Others" && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Position Description *
                        </label>
                        <input
                          type="text"
                          value={createForm.positionOthers}
                          onChange={(e) =>
                            setCreateForm({
                              ...createForm,
                              positionOthers: e.target.value,
                            })
                          }
                          disabled={modalMode === "edit" && !editModeEnabled}
                          className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Position beschreiben"
                        />
                      </div>
                    )}

                    {/* Contact Information */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={createForm.email}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            email: e.target.value,
                          })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="max.mustermann@beispiel.de"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={createForm.phone}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            phone: e.target.value,
                          })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="+49 171 1234567"
                      />
                    </div>

                    {/* LinkedIn */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        LinkedIn URL
                      </label>
                      <input
                        type="url"
                        value={createForm.linkedInLink}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            linkedInLink: e.target.value,
                          })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="https://linkedin.com/in/maxmustermann"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        LinkedIn State
                      </label>
                      <select
                        value={createForm.stateLinkedIn}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            stateLinkedIn: e.target.value as any,
                          })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        {LINKEDIN_STATES.map((state: any) => (
                          <option key={state.value} value={state.value}>
                            {state.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Contact Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Type
                      </label>
                      <select
                        value={createForm.contact}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            contact: e.target.value as any,
                          })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Kontaktart auswählen</option>
                        {CONTACT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Decision Maker State */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Decision Maker State
                      </label>
                      <select
                        value={createForm.decisionMakerState}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            decisionMakerState: e.target.value as any,
                          })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">State auswählen</option>
                        {DECISION_MAKER_STATES.map((state: any) => (
                          <option key={state.value} value={state.value}>
                            {state.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Notes */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Preference
                      </label>
                      <input
                        type="text"
                        value={createForm.noteContactPreference}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            noteContactPreference: e.target.value,
                          })
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Beste Erreichbarkeit, bevorzugte Kontaktmethode, etc."
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        value={createForm.note}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, note: e.target.value })
                        }
                        rows={3}
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Zusätzliche Notizen zu diesem Kontakt..."
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowCreateModal(false);
                        resetCreateForm();
                        setModalMode("create");
                        setEditingContactId(null);
                      }}
                      className="px-4 py-2 text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all"
                    >
                      {modalMode === "edit" ? "Close" : "Cancel"}
                    </button>
                    {modalMode === "edit" && editModeEnabled && (
                      <CustomButton
                        gradient={true}
                        onClick={handleCreateContact}
                        className="px-4 py-2 bg-gray-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-gray-700/90 transition-all"
                      >
                        Update Contact Person
                      </CustomButton>
                    )}
                    {modalMode === "create" && (
                      <CustomButton
                        gradient={true}
                        onClick={handleCreateContact}
                        className="px-4 py-2 bg-gray-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-gray-700/90 transition-all"
                      >
                        Add Contact Person
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

export default ContactPersonsPage;

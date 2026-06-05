"use client";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  Suspense,
} from "react";
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
  PencilIcon,
  GlobeAltIcon,
  StarIcon,
  ChartBarIcon,
  CalendarIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import { toast } from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { Linkedin, Building2, PlusIcon, HandshakeIcon } from "lucide-react";
import PageHeader from "@/components/UI/PageHeader";
import CustomButton from "@/components/UI/CustomButton";
import { Google, LinkedIn, Delete, Add } from "@mui/icons-material";
import { useSelector } from "react-redux";
import { RootState } from "../Redux/store";
import { UserRole } from "@/utils/interfaces";
import { TagBadge, TagPickerInput, EntityTagSelector, type Tag } from "@/components/Tags/TagManager";
import { TagFilterSelector } from "@/components/Tags/TagFilterSelector";
import { syncEntityTags } from "@/api/tags";
import {
  getAllBusinesses,
  exportBusinessesToCSV,
  deleteBusiness,
  createBusiness,
  updateBusiness,
  type Business,
  type SearchFilters,
} from "@/api/bussiness";
import {
  getAllContactPersons,
  createContactPerson,
  updateContactPerson,
  deleteContactPerson,
  exportContactPersonsToCSV,
  updateContactLinkedInState,
  fetchStarBusinessesForDropdown,
  POSITIONS,
  LINKEDIN_STATES,
  CONTACT_TYPES,
  SEX_OPTIONS,
  DECISION_MAKER_STATES,
  type ContactPersonData,
} from "@/api/contacts";

type ModalMode = "create" | "edit";

interface FilterState {
  search: string;
  postalCode: string;
  city: string;
  country: string;
  category: string;
  hasWebsite: string;
  status: string;
  minRating: string;
  maxRating: string;
  verified: string;
  source: string;
  stage: string;
  tags: string;
}

type BusinessWithContacts = Business & { contacts?: ContactPersonData[] };

const COUNTRY_OPTIONS = [
  { value: "DE", label: "DE – Germany" },
  { value: "AT", label: "AT – Austria" },
  { value: "CH", label: "CH – Switzerland" },
];

const formatDateTime = (dateString: string | undefined) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const CombinedBusinessContactsContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSelector((state: RootState) => state.user);

  const [allBusinesses, setAllBusinesses] = useState<BusinessWithContacts[]>(
    [],
  );
  const [businesses, setBusinesses] = useState<BusinessWithContacts[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const itemsPerPage = 30;

  const [expandedBusinessIds, setExpandedBusinessIds] = useState<Set<string>>(
    new Set(),
  );
  const [allContactsExpanded, setAllContactsExpanded] = useState(true);

  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    postalCode: "",
    city: "",
    country: "",
    category: "",
    hasWebsite: "",
    status: "",
    minRating: "",
    maxRating: "",
    verified: "",
    source: "",
    stage: "",
    tags: "",
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [businessSearchTerm, setBusinessSearchTerm] = useState("");
  const [allStarBusinesses, setAllStarBusinesses] = useState<any[]>([]);
  const [createForm, setCreateForm] = useState<any>({
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
    decisionMakerNote: "",
  });

  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesModalData, setNotesModalData] = useState<any>(null);

  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [businessModalMode, setBusinessModalMode] =
    useState<ModalMode>("create");
  const [editingBusinessId, setEditingBusinessId] = useState<string | null>(
    null,
  );
  const [businessEditMode, setBusinessEditMode] = useState(false);
  const emptyBusinessForm = {
    companyName: "",
    displayName: "",
    starPortalLinkName: "",
    addressAdditional: "",
    street: "",
    postalCode: "",
    city: "",
    country: "DE",
    email: "",
    phone: "",
    website: "",
    note: "",
    tags: [] as any[],
  };
  const [businessForm, setBusinessForm] = useState<any>({
    ...emptyBusinessForm,
  });
  const [newBusinessTags, setNewBusinessTags] = useState<Tag[]>([]);
  const [newContactTags, setNewContactTags] = useState<Tag[]>([]);

  const [urlParamHandled, setUrlParamHandled] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const businessFilters: SearchFilters = {
        page: 1,
        limit: 10000,
        search: filters.search,
        postalCode: filters.postalCode,
        city: filters.city,
        country: filters.country,
        category: filters.category,
        hasWebsite:
          filters.hasWebsite === "yes"
            ? true
            : filters.hasWebsite === "no"
              ? false
              : undefined,
        status: filters.status,
        source: filters.source || undefined,
        minRating: filters.minRating
          ? parseFloat(filters.minRating)
          : undefined,
        maxRating: filters.maxRating
          ? parseFloat(filters.maxRating)
          : undefined,
        stage: filters.stage || undefined,
        tags: filters.tags || undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
      };

      const [bizRes, contactRes] = await Promise.all([
        getAllBusinesses(businessFilters),
        getAllContactPersons({ page: 1, limit: 10000 }),
      ]);

      const bizData: Business[] = bizRes?.data?.businesses || [];
      const contactData: ContactPersonData[] =
        contactRes?.data?.contactPersons || [];

      const contactMap = new Map<string, ContactPersonData[]>();
      contactData.forEach((c: any) => {
        const keys = [c.starBusinessDetailsId, c.businessId].filter(Boolean);
        keys.forEach((k: string) => {
          if (!contactMap.has(k)) contactMap.set(k, []);
          const arr = contactMap.get(k)!;
          if (!arr.some((x) => x.id === c.id)) arr.push(c);
        });
      });

      const merged: BusinessWithContacts[] = bizData
        .map((b) => ({ ...b, contacts: contactMap.get(b.id) || [] }))
        .sort((a, b) => {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return db - da;
        });

      setAllBusinesses(merged);

      const total = merged.length;
      setTotalRecords(total);
      setTotalPages(Math.ceil(total / itemsPerPage) || 1);

      const startIndex = (currentPage - 1) * itemsPerPage;
      setBusinesses(merged.slice(startIndex, startIndex + itemsPerPage));

      setExpandedBusinessIds(
        new Set(
          merged.filter((b) => (b.contacts?.length || 0) > 0).map((b) => b.id),
        ),
      );
      setAllContactsExpanded(true);

      setCategories([
        ...new Set(merged.map((b) => b.category).filter(Boolean)),
      ] as string[]);
      setCities([
        ...new Set(merged.map((b) => b.city).filter(Boolean)),
      ] as string[]);
      setCountries([
        ...new Set(merged.map((b) => b.country).filter(Boolean)),
      ] as string[]);
      setSources([
        ...new Set(merged.map((b: any) => b.source).filter(Boolean)),
      ] as string[]);
    } catch (error) {
      console.error("Error fetching businesses/contacts:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [filters]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    setBusinesses(allBusinesses.slice(startIndex, startIndex + itemsPerPage));
  }, [currentPage, allBusinesses]);

  const fetchStarBusinessesForModal = async (search?: string) => {
    try {
      const list = await fetchStarBusinessesForDropdown(search);
      setAllStarBusinesses(list);
    } catch (error) {
      console.error("Error fetching star businesses:", error);
    }
  };

  useEffect(() => {
    if (showCreateModal && !selectedBusiness) fetchStarBusinessesForModal();
  }, [showCreateModal, selectedBusiness]);

  useEffect(() => {
    if (urlParamHandled) return;
    const contactId = searchParams?.get("contactId");
    if (contactId && allBusinesses.length > 0) {
      const found = allBusinesses
        .flatMap((b) => b.contacts || [])
        .find((c) => c.id === contactId);
      if (found) {
        openContactModal(found);
        setUrlParamHandled(true);
      }
    }
  }, [searchParams, allBusinesses, urlParamHandled]);

  const toggleBusinessContacts = (businessId: string) => {
    setExpandedBusinessIds((prev) => {
      const next = new Set(prev);
      next.has(businessId) ? next.delete(businessId) : next.add(businessId);
      return next;
    });
  };

  const toggleAllBusinessContacts = () => {
    if (allContactsExpanded) {
      setExpandedBusinessIds(new Set());
      setAllContactsExpanded(false);
    } else {
      setExpandedBusinessIds(
        new Set(
          allBusinesses
            .filter((b) => (b.contacts?.length || 0) > 0)
            .map((b) => b.id),
        ),
      );
      setAllContactsExpanded(true);
    }
  };

  const patchContactInState = (contactId: string, patch: any) => {
    const update = (list: BusinessWithContacts[]) =>
      list.map((b) => ({
        ...b,
        contacts: b.contacts?.map((c) =>
          c.id === contactId ? { ...c, ...patch } : c,
        ),
      }));
    setAllBusinesses((prev) => update(prev));
    setBusinesses((prev) => update(prev));
  };

  const handleUpdateLinkedInState = async (
    contactId: string,
    newState: any,
  ) => {
    patchContactInState(contactId, { stateLinkedIn: newState });
    try {
      await updateContactLinkedInState(contactId, newState);
    } catch (error) {
      console.error("Error updating LinkedIn state:", error);
      fetchData();
    }
  };

  const handleUpdateDecisionMakerState = async (
    contactId: string,
    newState: any,
  ) => {
    patchContactInState(contactId, { decisionMakerState: newState });
    try {
      await updateContactPerson(contactId, { decisionMakerState: newState });
    } catch (error) {
      console.error("Error updating decision maker state:", error);
      toast.error("Failed to update decision maker state");
      fetchData();
    }
  };

  const openContactModal = useCallback(
    (contact: ContactPersonData, startInEditMode = false) => {
      setModalMode("edit");
      setEditingContactId(contact.id);
      setEditModeEnabled(startInEditMode);
      setCreateForm({
        starBusinessDetailsId: (contact as any).starBusinessDetailsId || "",
        name: contact.name || "",
        familyName: contact.familyName || "",
        sex: (contact as any).sex || "",
        position: contact.position || "",
        positionOthers: (contact as any).positionOthers || "",
        email: contact.email || "",
        phone: (contact as any).phone || "",
        linkedInLink: (contact as any).linkedInLink || "",
        stateLinkedIn: (contact as any).stateLinkedIn || "open",
        contact: (contact as any).contact || "",
        decisionMakerState: (contact as any).decisionMakerState || "",
        note: (contact as any).note || "",
        noteContactPreference: (contact as any).noteContactPreference || "",
        decisionMakerNote: (contact as any).decisionMakerNote || "",
        tags: (contact as any).tags || [],
      });
      setNewContactTags((contact as any).tags || []);
      if ((contact as any).starBusinessDetailsId) {
        setSelectedBusiness({
          id: (contact as any).starBusinessDetailsId,
          name: (contact as any).businessName,
          companyName: (contact as any).businessName,
        });
      }
      setShowCreateModal(true);
    },
    [],
  );

  const handleDeleteContact = async (contactId: string) => {
    if (!window.confirm("Do you want to delete this contact?")) return;
    try {
      await deleteContactPerson(contactId);
      fetchData();
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast.error("Failed to delete contact");
    }
  };

  const handleCreateContact = async () => {
    if (!createForm.name || !createForm.familyName || !createForm.position) {
      toast.error("Please fill in all required fields");
      return;
    }
    const businessId =
      typeof selectedBusiness === "string"
        ? selectedBusiness
        : selectedBusiness?.id || selectedBusiness?.value;

    if (!businessId && !createForm.starBusinessDetailsId) {
      toast.error("Please select a business");
      return;
    }
    if (createForm.position === "Others" && !createForm.positionOthers) {
      toast.error("Please specify the position");
      return;
    }

    try {
      const payload: any = {
        ...createForm,
        starBusinessDetailsId: businessId || createForm.starBusinessDetailsId,
      };
      if (modalMode === "edit" && editingContactId) {
        await updateContactPerson(editingContactId, payload);
      } else {
        const result = await createContactPerson(payload);
        const createdId = (result as any)?.data?.id || (result as any)?.data?.contactPerson?.id;
        if (createdId && newContactTags.length > 0) {
          await syncEntityTags(createdId, "contact", newContactTags.map((t) => t.id));
        }
      }
      resetCreateForm();
      setShowCreateModal(false);
      setModalMode("create");
      setEditingContactId(null);
      setEditModeEnabled(false);
      fetchData();
    } catch (error) {
      console.error(
        `Error ${modalMode === "edit" ? "updating" : "creating"} contact:`,
        error,
      );
      toast.error(
        `Failed to ${modalMode === "edit" ? "update" : "create"} contact`,
      );
    }
  };

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
      decisionMakerNote: "",
      tags: [],
    });
    setSelectedBusiness(null);
    setEditModeEnabled(false);
    setNewContactTags([]);
  };

  const handleAddContactForBusiness = (business: BusinessWithContacts) => {
    setModalMode("create");
    setEditingContactId(null);
    resetCreateForm();
    setSelectedBusiness(business);
    setCreateForm((prev: any) => ({
      ...prev,
      starBusinessDetailsId: business.id,
    }));
    setShowCreateModal(true);
  };

  const handleOpenNotesModal = (contact: any) => {
    setNotesModalData(contact);
    setShowNotesModal(true);
  };

  const generateDisplayName = (
    companyName: string,
    existing: BusinessWithContacts[],
    excludeId?: string | null,
  ) => {
    const words = (companyName || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "";
    const used = new Set(
      existing
        .filter((b) => b.id !== excludeId)
        .map((b: any) => (b.displayName || "").toLowerCase())
        .filter(Boolean),
    );
    const first = words[0];
    if (!used.has(first.toLowerCase())) return first;
    const second = words[1];
    if (second && !used.has(second.toLowerCase())) return second;
    let i = 2;
    while (used.has(`${first}${i}`.toLowerCase())) i++;
    return `${first}${i}`;
  };

  const generateStarPortalLinkName = (
    companyName: string,
    displayName: string,
    existing: BusinessWithContacts[],
    excludeId?: string | null,
  ) => {
    const words = (companyName || "").trim().split(/\s+/).filter(Boolean);
    const used = new Set(
      existing
        .filter((b) => b.id !== excludeId)
        .map((b: any) => (b.starPortalLinkName || "").toLowerCase())
        .filter(Boolean),
    );
    let base = displayName;
    if (words[1] && displayName === words[1]) base = `${words[0]}-${words[1]}`;
    if (!base) return "";
    if (!used.has(base.toLowerCase())) return base;
    let i = 2;
    while (used.has(`${base}-${i}`.toLowerCase())) i++;
    return `${base}-${i}`;
  };

  const handleBusinessCompanyNameChange = (value: string) => {
    setBusinessForm((prev: any) => {
      const next = { ...prev, companyName: value };
      if (businessModalMode === "create") {
        const dn = generateDisplayName(value, allBusinesses, editingBusinessId);
        next.displayName = dn;
        next.starPortalLinkName = generateStarPortalLinkName(
          value,
          dn,
          allBusinesses,
          editingBusinessId,
        );
      }
      return next;
    });
  };

  const resetBusinessForm = () => {
    setBusinessForm({ ...emptyBusinessForm });
    setEditingBusinessId(null);
    setBusinessEditMode(false);
    setNewBusinessTags([]);
  };
  const openCreateBusinessModal = () => {
    setBusinessModalMode("create");
    resetBusinessForm();
    setBusinessEditMode(true);
    setShowBusinessModal(true);
  };
  const openBusinessModal = (business: any) => {
    setBusinessModalMode("edit");
    setEditingBusinessId(business.id);
    setBusinessEditMode(false);
    setBusinessForm({
      companyName:
        business.companyName || business.legalName || business.name || "",
      displayName: business.displayName || "",
      starPortalLinkName: business.starPortalLinkName || "",
      addressAdditional: business.addressAdditional || "",
      street: business.street || "",
      postalCode: business.postalCode || "",
      city: business.city || "",
      country: business.country || "DE",
      email: business.email || "",
      phone: business.phone || "",
      website: business.website || "",
      note: business.note || "",
      tags: business.tags || [],
    });
    setNewBusinessTags(business.tags || []);
    setShowBusinessModal(true);
  };

  const handleBusinessSubmit = async () => {
    if (!businessForm.companyName?.trim()) {
      toast.error("Company name is required");
      return;
    }
    try {
      const payload: any = { ...businessForm };
      if (businessModalMode === "edit" && editingBusinessId) {
        await updateBusiness(editingBusinessId, payload);
      } else {
        const result = await createBusiness(payload);
        const createdId = (result as any)?.data?.id;
        if (createdId && newBusinessTags.length > 0) {
          await syncEntityTags(createdId, "company", newBusinessTags.map((t) => t.id));
        }
      }
      setShowBusinessModal(false);
      resetBusinessForm();
      setBusinessModalMode("create");
      fetchData();
    } catch (error) {
      console.error(
        `Error ${businessModalMode === "edit" ? "updating" : "creating"} business:`,
        error,
      );
      toast.error(
        `Failed to ${businessModalMode === "edit" ? "update" : "create"} business`,
      );
    }
  };

  const modalContacts: ContactPersonData[] = editingBusinessId
    ? allBusinesses.find((b) => b.id === editingBusinessId)?.contacts || []
    : [];
  const handleDeleteBusiness = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this business?"))
      return;
    try {
      await deleteBusiness(id);
      setShowBusinessModal(false);
      resetBusinessForm();
      fetchData();
    } catch {
    }
  };

  const handleExportContacts = async () => {
    try {
      const csvData: any = await exportContactPersonsToCSV({});
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contact_persons_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting contacts:", error);
      toast.error("Failed to export contacts");
    }
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      postalCode: "",
      city: "",
      country: "",
      category: "",
      hasWebsite: "",
      status: "",
      minRating: "",
      maxRating: "",
      verified: "",
      source: "",
      stage: "",
      tags: "",
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const buildFullAddress = (b: any) => {
    const isGerman =
      !b.country || b.country === "Germany" || b.country === "DE";
    const parts: string[] = [];
    if (b.addressAdditional?.trim()) parts.push(b.addressAdditional.trim());
    if (b.street?.trim()) parts.push(b.street.trim());
    const cityLine = [b.postalCode, b.city]
      .filter((x: string) => x && x.trim())
      .join(" ")
      .trim();
    if (cityLine) parts.push(cityLine);
    if (!isGerman && b.country?.trim()) parts.push(b.country.trim());
    return parts.length ? parts.join(", ") : null;
  };

  const getStageBadgeColor = (stage: string) => {
    switch (stage) {
      case "star_business":
        return "bg-yellow-100 text-yellow-700 border border-yellow-200";
      case "star_customer":
        return "bg-purple-100 text-purple-700 border border-purple-200";
      default:
        return "bg-blue-100 text-blue-700 border border-blue-200";
    }
  };

  const getStageDisplayName = (stage: string) => {
    switch (stage) {
      case "star_business":
        return "Star Business";
      case "star_customer":
        return "Star Customer";
      default:
        return "Business";
    }
  };

  const getLinkedInStateColor = (state: string) => {
    const colors: Record<string, string> = {
      open: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      connected: "bg-blue-100 text-blue-800",
      rejected: "bg-red-100 text-red-800",
    };
    return colors[state] || "bg-gray-100 text-gray-800";
  };

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

  const renderNoteIcons = (contact: any) => {
    if (
      !contact.note &&
      !contact.noteContactPreference &&
      !contact.decisionMakerNote
    )
      return null;
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleOpenNotesModal(contact);
        }}
        className="flex gap-1 hover:bg-gray-100 p-1 rounded cursor-pointer"
        title="Click to view all notes"
      >
        {contact.note && (
          <span className="text-blue-500" title="General Note">
            📝
          </span>
        )}
        {contact.noteContactPreference && (
          <span className="text-green-500" title="Contact Preference">
            ⭐
          </span>
        )}
        {contact.decisionMakerNote && (
          <span className="text-purple-500" title="Decision Maker Note">
            💼
          </span>
        )}
      </button>
    );
  };

  const stats = useMemo(
    () => ({
      total: allBusinesses.length,
      withWebsite: allBusinesses.filter((b: any) => b.hasWebsite).length,
      contacts: allBusinesses.reduce(
        (sum, b) => sum + (b.contacts?.length || 0),
        0,
      ),
      stars: allBusinesses.filter((b) => b.stage === "star_business").length,
    }),
    [allBusinesses],
  );

  const businessFieldDisabled =
    businessModalMode === "edit" && !businessEditMode;
  return (
    <div className="w-full max-w-full mx-auto overflow-hidden">
      <div
        className="bg-white rounded-lg shadow-sm pb-8 p-6"
        style={{
          border: "1px solid #e0e0e0",
          background: "linear-gradient(to bottom, #ffffff, #f9f9f9)",
        }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <PageHeader title="Relationships" icon={HandshakeIcon} />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${showFilters
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              <FunnelIcon className="w-5 h-5" />
              Filters
            </button>
            <button
              onClick={toggleAllBusinessContacts}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
              title={
                allContactsExpanded
                  ? "Fold all contacts"
                  : "Unfold all contacts"
              }
            >
              {allContactsExpanded ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
              {allContactsExpanded ? "Fold All" : "Unfold All"}
            </button>
            <CustomButton
              startIcon={<PlusIcon className="w-5 h-5" />}
              gradient={true}
              onClick={openCreateBusinessModal}
            >
              Add Business
            </CustomButton>
            <CustomButton
              startIcon={<Add className="w-5 h-5" />}
              gradient={true}
              onClick={() => {
                setModalMode("create");
                setEditingContactId(null);
                resetCreateForm();
                setShowCreateModal(true);
              }}
            >
              Add Contact
            </CustomButton>
            <CustomButton
              startIcon={<ArrowDownTrayIcon className="w-5 h-5" />}
              gradient={true}
              onClick={() => router.push("/bussinesses/import")}
            >
              Import CSV
            </CustomButton>
          </div>
        </div>

        {showFilters && (
          <div className="mb-6 p-5 bg-white border border-gray-200 rounded-xl space-y-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <TagFilterSelector
                  category="company"
                  onChange={(tagString) =>
                    setFilters((prev) => ({ ...prev, tags: tagString }))
                  }
                  onReset={() =>
                    setFilters((prev) => ({ ...prev, tags: "" }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={resetFilters}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors flex items-center gap-1"
              >
                <ArrowPathIcon className="w-3.5 h-3.5" />
                Reset All Filters
              </button>
            </div>
          </div>
        )}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-20 flex justify-center items-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary" />
                <p className="mt-4 text-gray-600">Loading...</p>
              </div>
            </div>
          ) : businesses.length === 0 ? (
            <div className="p-12 text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No businesses found</p>
              <p className="text-gray-500 text-sm mt-2">
                Try adjusting your filters or add a new business
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto w-full">
                <table className="min-w-full border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Address
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Website
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Tags
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Stage
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Added On
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {businesses.map((business: any) => (
                      <React.Fragment key={business.id}>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td
                            className="px-3 py-3 cursor-pointer"
                            onClick={() => openBusinessModal(business)}
                          >
                            <p
                              className="font-medium w-[180px] truncate text-gray-900"
                              title={
                                business.displayName ||
                                business.companyName ||
                                business.name
                              }
                            >
                              {business.displayName ||
                                business.companyName ||
                                business.name}
                            </p>
                          </td>
                          <td
                            className="px-3 py-3 cursor-pointer"
                            onClick={() => openBusinessModal(business)}
                          >
                            <p className="text-sm text-gray-900 w-[220px] truncate">
                              {buildFullAddress(business) || (
                                <span className="text-gray-400">
                                  No address data
                                </span>
                              )}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            {business.website ? (
                              <a
                                href={
                                  business.website.startsWith("http")
                                    ? business.website
                                    : `https://${business.website}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                <GlobeAltIcon className="w-4 h-4" />
                                <span className="truncate max-w-[120px]">
                                  View
                                </span>
                              </a>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {business.tags && business.tags.length > 0 ? (
                                business.tags.map((tag: any) => (
                                  <TagBadge key={tag.id} tag={tag} size="sm" />
                                ))
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            {business.stage ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${getStageBadgeColor(
                                  business.stage,
                                )}`}
                              >
                                {getStageDisplayName(business.stage)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <CalendarIcon className="w-4 h-4" />
                              {business.createdAt
                                ? formatDate(business.createdAt)
                                : "-"}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() =>
                                  toggleBusinessContacts(business.id)
                                }
                                className={`px-2 py-1 text-xs rounded-lg transition-all flex items-center gap-1 ${expandedBusinessIds.has(business.id)
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-blue-500 text-white hover:bg-blue-600"
                                  }`}
                              >
                                {expandedBusinessIds.has(business.id) ? (
                                  <EyeSlashIcon className="h-3 w-3" />
                                ) : (
                                  <EyeIcon className="h-3 w-3" />
                                )}
                                Contacts ({business.contacts?.length || 0})
                              </button>
                              <button
                                onClick={() =>
                                  handleAddContactForBusiness(business)
                                }
                                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-all flex items-center gap-1"
                                title="Add contact to this business"
                              >
                                <UserPlusIcon className="h-3 w-3" />
                                Add
                              </button>
                            </div>
                          </td>
                        </tr>

                        {expandedBusinessIds.has(business.id) &&
                          business.contacts &&
                          business.contacts.length > 0 && (
                            <tr className="bg-gray-50/30">
                              <td colSpan={7} className="px-4 py-3">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm border border-gray-200 rounded-lg">
                                    <thead className="bg-gray-200/50 border-b border-gray-200/50">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Name
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Contact
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          LinkedIn
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Type
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Decision Maker State
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Note
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Actions
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {business.contacts.map((contact: any) => (
                                        <tr
                                          key={contact.id}
                                          className="hover:bg-gray-50/50 transition-colors"
                                        >
                                          <td
                                            className="px-4 py-3 cursor-pointer"
                                            onClick={() =>
                                              openContactModal(contact)
                                            }
                                          >
                                            <div className="text-sm font-medium text-gray-900">
                                              {contact.name}{" "}
                                              {contact.familyName}
                                            </div>
                                            {contact.position && (
                                              <div className="text-xs text-gray-500">
                                                {contact.position}
                                              </div>
                                            )}
                                          </td>
                                          <td className="px-4 py-3">
                                            <div className="space-y-1">
                                              {contact.email && (
                                                <a
                                                  href={`mailto:${contact.email}`}
                                                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                >
                                                  <EnvelopeIcon className="h-3 w-3" />
                                                  {contact.email.length > 20
                                                    ? `${contact.email.substring(0, 15)}...`
                                                    : contact.email}
                                                </a>
                                              )}
                                              {contact.phone && (
                                                <a
                                                  href={`tel:${contact.phone}`}
                                                  className="flex items-center gap-1 text-xs text-gray-600"
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                >
                                                  <PhoneIcon className="h-3 w-3" />
                                                  {contact.phone}
                                                </a>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <select
                                              value={contact.stateLinkedIn}
                                              onChange={(e) => {
                                                e.stopPropagation();
                                                handleUpdateLinkedInState(
                                                  contact.id,
                                                  e.target.value,
                                                );
                                              }}
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className={`text-xs px-2 max-w-[150px] truncate py-1 rounded-full font-medium border-0 cursor-pointer ${getLinkedInStateColor(
                                                contact.stateLinkedIn,
                                              )}`}
                                            >
                                              {LINKEDIN_STATES.map(
                                                (state: any) => (
                                                  <option
                                                    key={state.value}
                                                    value={state.value}
                                                  >
                                                    {state.label}
                                                  </option>
                                                ),
                                              )}
                                            </select>
                                            {contact.linkedInLink && (
                                              <a
                                                href={contact.linkedInLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              >
                                                <Linkedin className="h-3 w-3" />
                                                Profile
                                              </a>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            {contact.contact && (
                                              <span className="inline-flex text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-800">
                                                {contact.contact}
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <select
                                              value={
                                                contact.decisionMakerState || ""
                                              }
                                              onChange={(e) => {
                                                e.stopPropagation();
                                                handleUpdateDecisionMakerState(
                                                  contact.id,
                                                  e.target.value,
                                                );
                                              }}
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className={`text-xs px-2 max-w-[180px] truncate py-1 rounded-full font-medium border-0 cursor-pointer ${getDecisionMakerStateColor(
                                                contact.decisionMakerState ||
                                                "",
                                              )}`}
                                            >
                                              {DECISION_MAKER_STATES.map(
                                                (state: any) => (
                                                  <option
                                                    key={state.value}
                                                    value={state.value}
                                                  >
                                                    {state.label}
                                                  </option>
                                                ),
                                              )}
                                            </select>
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <div className="flex justify-center">
                                              {renderNoteIcons(contact)}
                                            </div>
                                          </td>
                                          <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openContactModal(
                                                    contact,
                                                    true,
                                                  );
                                                }}
                                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                                title="Edit contact"
                                              >
                                                <PencilIcon className="h-4 w-4" />
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const q = encodeURIComponent(
                                                    `${contact.businessLegalName || business.name}`.trim(),
                                                  );
                                                  window.open(
                                                    `https://www.google.com/search?q=${q}`,
                                                    "_blank",
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
                                                  const q = encodeURIComponent(
                                                    `${contact.businessLegalName || business.name} linkedin`.trim(),
                                                  );
                                                  window.open(
                                                    `https://www.google.com/search?q=${q}`,
                                                    "_blank",
                                                  );
                                                }}
                                                className="text-blue-700 hover:text-blue-900 transition-colors"
                                                title="LinkedIn Search"
                                              >
                                                <LinkedIn
                                                  sx={{ fontSize: 18 }}
                                                />
                                              </button>
                                              {user?.role ===
                                                UserRole.ADMIN && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteContact(
                                                        contact.id,
                                                      );
                                                    }}
                                                    title="Delete contact"
                                                  >
                                                    <Delete
                                                      sx={{
                                                        fontSize: 16,
                                                        color: "red",
                                                      }}
                                                    />
                                                  </button>
                                                )}
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}

                        {expandedBusinessIds.has(business.id) &&
                          (!business.contacts ||
                            business.contacts.length === 0) && (
                            <tr className="bg-gray-50/30">
                              <td colSpan={7} className="px-6 py-3">
                                <div className="flex items-center justify-between text-sm text-gray-500">
                                  <span>
                                    No contacts for this business yet.
                                  </span>
                                  <button
                                    onClick={() =>
                                      handleAddContactForBusiness(business)
                                    }
                                    className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-all flex items-center gap-1"
                                  >
                                    <UserPlusIcon className="h-3 w-3" />
                                    Add Contact
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
                  {totalRecords} businesses
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page;
                      if (totalPages <= 5) page = i + 1;
                      else if (currentPage <= 3) page = i + 1;
                      else if (currentPage >= totalPages - 2)
                        page = totalPages - 4 + i;
                      else page = currentPage - 2 + i;
                      return (
                        <CustomButton
                          variant="contained"
                          key={page}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </CustomButton>
                      );
                    })}
                  </div>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                  <span className="ml-2 text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showBusinessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-md rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white/95">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {businessModalMode === "edit"
                    ? "Business Details"
                    : "Add New Business"}
                </h2>
                <button
                  onClick={() => {
                    setShowBusinessModal(false);
                    resetBusinessForm();
                    setBusinessModalMode("create");
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {businessModalMode === "edit" && (
                <div className="mb-4 flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <span className="text-sm font-medium text-gray-700">
                    Edit Mode
                  </span>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-2">
                      {businessEditMode ? "Enabled" : "Disabled"}
                    </span>
                    <button
                      type="button"
                      className={`${businessEditMode ? "bg-gray-600" : "bg-gray-200"
                        } relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2`}
                      onClick={() => setBusinessEditMode(!businessEditMode)}
                    >
                      <span
                        className={`${businessEditMode ? "translate-x-4" : "translate-x-0"
                          } pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                      />
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div className="rounded-xl p-4 -mx-4 bg-transparent">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Business Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Company Name (full legal name) *
                      </label>
                      <input
                        type="text"
                        value={businessForm.companyName}
                        onChange={(e) =>
                          handleBusinessCompanyNameChange(e.target.value)
                        }
                        disabled={businessFieldDisabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
                        placeholder="Muster GmbH & Co. KG"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={businessForm.displayName}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            displayName: e.target.value,
                          })
                        }
                        disabled={businessFieldDisabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Auto from first word (unique)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Star Portal Link Name
                      </label>
                      <input
                        type="text"
                        value={businessForm.starPortalLinkName}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            starPortalLinkName: e.target.value,
                          })
                        }
                        disabled={businessFieldDisabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Auto from display name (unique)"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Address Additional Line
                      </label>
                      <input
                        type="text"
                        value={businessForm.addressAdditional}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            addressAdditional: e.target.value,
                          })
                        }
                        disabled={businessFieldDisabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="c/o, building, floor…"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Street and Street Number
                      </label>
                      <input
                        type="text"
                        value={businessForm.street}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            street: e.target.value,
                          })
                        }
                        disabled={businessFieldDisabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Musterstraße 12"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={businessForm.postalCode}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            postalCode: e.target.value,
                          })
                        }
                        disabled={businessFieldDisabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="80331"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={businessForm.city}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            city: e.target.value,
                          })
                        }
                        disabled={businessFieldDisabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="München"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Country
                      </label>
                      <select
                        value={businessForm.country}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            country: e.target.value,
                          })
                        }
                        disabled={businessFieldDisabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        {COUNTRY_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={businessForm.email}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            email: e.target.value,
                          })
                        }
                        disabled={businessFieldDisabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="info@muster.de"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={businessForm.phone}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            phone: e.target.value,
                          })
                        }
                        disabled={businessFieldDisabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="+49 89 1234567"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Web URL
                      </label>
                      <input
                        type="url"
                        value={businessForm.website}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            website: e.target.value,
                          })
                        }
                        disabled={businessFieldDisabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="https://muster.de"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Note
                      </label>
                      <textarea
                        value={businessForm.note}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            note: e.target.value,
                          })
                        }
                        disabled={businessFieldDisabled}
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="Internal note…"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Tags
                      </label>
                      {businessModalMode === "create" ? (
                        <TagPickerInput
                          category="company"
                          selectedTags={newBusinessTags}
                          onChange={setNewBusinessTags}
                        />
                      ) : (
                        <EntityTagSelector
                          entityId={editingBusinessId!}
                          entityType="company"
                          initialTags={businessForm.tags || []}
                          onTagsUpdated={(updatedTags) =>
                            setBusinessForm((prev: any) => ({
                              ...prev,
                              tags: updatedTags,
                            }))
                          }
                          disabled={businessFieldDisabled}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {businessModalMode === "edit" && (
                  <div className="rounded-xl p-4 -mx-4 bg-green-50 border border-green-200/70">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <UserGroupIcon className="h-5 w-5 text-gray-500" />
                        <span>Contacts</span>
                        <span className="text-xs font-normal text-gray-500">
                          ({modalContacts.length})
                        </span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          const biz = allBusinesses.find(
                            (b) => b.id === editingBusinessId,
                          );
                          if (biz) handleAddContactForBusiness(biz);
                        }}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-all flex items-center gap-1"
                      >
                        <UserPlusIcon className="h-3 w-3" />
                        Add Contact
                      </button>
                    </div>
                    <div className="space-y-2">
                      {modalContacts.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          No contacts for this business yet.
                        </p>
                      ) : (
                        modalContacts.map((contact: any) => (
                          <div
                            key={contact.id}
                            className="flex items-center justify-between bg-white border border-green-200 rounded-lg px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {contact.name} {contact.familyName}
                                {contact.contact && (
                                  <span className="ml-2 inline-flex text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                                    {contact.contact}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {contact.position}
                                {contact.email ? ` · ${contact.email}` : ""}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => openContactModal(contact, true)}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="Edit contact"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              {user?.role === UserRole.ADMIN && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteContact(contact.id)
                                  }
                                  title="Delete contact"
                                >
                                  <Delete sx={{ fontSize: 16, color: "red" }} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-between gap-2">
                <div>
                  {businessModalMode === "edit" &&
                    user?.role === UserRole.ADMIN && (
                      <button
                        onClick={() => {
                          if (editingBusinessId)
                            handleDeleteBusiness(editingBusinessId);
                        }}
                        disabled={!businessEditMode}
                        className="px-3 py-2 text-xs text-red-700 bg-white/80 backdrop-blur-sm border border-red-300/80 rounded hover:bg-red-50/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Delete Business
                      </button>
                    )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowBusinessModal(false);
                      resetBusinessForm();
                      setBusinessModalMode("create");
                    }}
                    className="px-3 py-2 text-xs text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded hover:bg-white/60 transition-all"
                  >
                    {businessModalMode === "edit" && !businessEditMode
                      ? "Close"
                      : "Cancel"}
                  </button>
                  {(businessModalMode === "create" ||
                    (businessModalMode === "edit" && businessEditMode)) && (
                      <CustomButton
                        gradient={true}
                        onClick={handleBusinessSubmit}
                        disabled={!businessForm.companyName?.trim()}
                        className="px-3 py-2 text-xs bg-gray-600/90 backdrop-blur-sm text-white rounded hover:bg-gray-700/90 transition-all disabled:opacity-50"
                      >
                        {businessModalMode === "edit"
                          ? "Update Business"
                          : "Create Business"}
                      </CustomButton>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                      className={`${editModeEnabled ? "bg-gray-600" : "bg-gray-200"
                        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2`}
                      role="switch"
                      aria-checked={editModeEnabled}
                      onClick={() => setEditModeEnabled(!editModeEnabled)}
                    >
                      <span
                        aria-hidden="true"
                        className={`${editModeEnabled ? "translate-x-5" : "translate-x-0"
                          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                      />
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-6">
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
                          fetchStarBusinessesForModal(e.target.value);
                        }}
                        disabled={modalMode === "edit" && !editModeEnabled}
                        className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      {allStarBusinesses.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                          {allStarBusinesses.map((b, index) => (
                            <button
                              key={b.value || b.id || `business-${index}`}
                              onClick={() => {
                                setSelectedBusiness(b);
                                setCreateForm({
                                  ...createForm,
                                  starBusinessDetailsId: b.value || b.id,
                                });
                                setBusinessSearchTerm("");
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium">
                                {b.name || b.label || b.companyName}
                              </div>
                              {b.city && (
                                <div className="text-sm text-gray-500">
                                  {b.city}, {b.state}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

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

                <div className="grid grid-cols-2 gap-4">
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
                      onChange={(e) =>
                        setCreateForm({ ...createForm, sex: e.target.value })
                      }
                      disabled={modalMode === "edit" && !editModeEnabled}
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Geschlecht auswählen</option>
                      {SEX_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
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
                          position: e.target.value,
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={createForm.email}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, email: e.target.value })
                      }
                      disabled={modalMode === "edit" && !editModeEnabled}
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="max@beispiel.de"
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
                        setCreateForm({ ...createForm, phone: e.target.value })
                      }
                      disabled={modalMode === "edit" && !editModeEnabled}
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="+49 171 1234567"
                    />
                  </div>
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
                          stateLinkedIn: e.target.value,
                        })
                      }
                      disabled={modalMode === "edit" && !editModeEnabled}
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {LINKEDIN_STATES.map((state) => (
                        <option key={state.value} value={state.value}>
                          {state.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Type
                    </label>
                    <select
                      value={createForm.contact}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          contact: e.target.value,
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

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Decision Maker State
                    </label>
                    <select
                      value={createForm.decisionMakerState}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          decisionMakerState: e.target.value,
                        })
                      }
                      disabled={modalMode === "edit" && !editModeEnabled}
                      className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">State auswählen</option>
                      {DECISION_MAKER_STATES.map((state) => (
                        <option key={state.value} value={state.value}>
                          {state.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <span className="text-green-500 text-xl">⭐</span> Contact
                      Preference
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
                    />
                  </div>

                  <div className="col-span-2 border-l-4 border-purple-500 pl-4 bg-purple-50 rounded-r-lg p-3">
                    <label className="block text-sm font-medium text-purple-800 mb-1">
                      <span
                        className="text-purple-500"
                        title="Decision Maker Note"
                      >
                        💼
                      </span>{" "}
                      Decision Maker Note
                    </label>
                    <textarea
                      value={createForm.decisionMakerNote || ""}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          decisionMakerNote: e.target.value,
                        })
                      }
                      rows={3}
                      disabled={modalMode === "edit" && !editModeEnabled}
                      className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <span className="text-blue-500" title="General Note">
                        📝
                      </span>{" "}
                      Notes
                    </label>
                    <textarea
                      value={createForm.note}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, note: e.target.value })
                      }
                      rows={3}
                      disabled={modalMode === "edit" && !editModeEnabled}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags
                    </label>
                    {modalMode === "create" ? (
                      <TagPickerInput
                        category="contact"
                        selectedTags={newContactTags}
                        onChange={setNewContactTags}
                      />
                    ) : (
                      <EntityTagSelector
                        entityId={editingContactId!}
                        entityType="contact"
                        initialTags={createForm.tags || []}
                        onTagsUpdated={(updatedTags) =>
                          setCreateForm((prev: any) => ({
                            ...prev,
                            tags: updatedTags,
                          }))
                        }
                        disabled={modalMode === "edit" && !editModeEnabled}
                      />
                    )}
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

      {showNotesModal && notesModalData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  All Notes for {notesModalData.name}{" "}
                  {notesModalData.familyName}
                </h2>
                <button
                  onClick={() => {
                    setShowNotesModal(false);
                    setNotesModalData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-500 text-xl">📝</span>
                    <h3 className="font-semibold text-gray-900">
                      General Note
                    </h3>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {notesModalData.note || ""}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-500 text-xl">⭐</span>
                    <h3 className="font-semibold text-gray-900">
                      Contact Preference
                    </h3>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {notesModalData.noteContactPreference || ""}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-purple-500 text-xl">💼</span>
                    <h3 className="font-semibold text-purple-900">
                      Decision Maker Note
                    </h3>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap font-medium">
                    {notesModalData.decisionMakerNote || ""}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    const c = notesModalData;
                    setShowNotesModal(false);
                    setNotesModalData(null);
                    openContactModal(c, true);
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit Contact
                </button>
                <button
                  onClick={() => {
                    setShowNotesModal(false);
                    setNotesModalData(null);
                  }}
                  className="px-4 py-2 text-white bg-gray-600 rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CombinedBusinessContactsPage: React.FC = () => (
  <Suspense
    fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    }
  >
    <CombinedBusinessContactsContent />
  </Suspense>
);

export default CombinedBusinessContactsPage;

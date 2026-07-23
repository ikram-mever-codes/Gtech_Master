"use client";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  Suspense,
  useRef,
} from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  UserPlusIcon,
  PencilIcon,
  GlobeAltIcon,
  ClipboardDocumentIcon,
  MapPinIcon,
  StarIcon,
  ChartBarIcon,
  CalendarIcon,
  AdjustmentsHorizontalIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import { toast } from "react-hot-toast";
import { useTableSort, sortData } from "@/hooks/useTableSort";
import { useRouter, useSearchParams } from "next/navigation";
import { Linkedin, Building2, PlusIcon, HandshakeIcon } from "lucide-react";
import PageHeader from "@/components/UI/PageHeader";
import CustomButton from "@/components/UI/CustomButton";
import CustomModal from "@/components/UI/CustomModal";
import ModalHeader from "@/components/UI/ModalHeader";
import ModalFooter from "@/components/UI/ModalFooter";
import { Google, LinkedIn, Delete, Add } from "@mui/icons-material";
import { useSelector } from "react-redux";
import { RootState } from "../Redux/store";
import { UserRole } from "@/utils/interfaces";
import {
  TagBadge,
  TagPickerInput,
  EntityTagSelector,
  type Tag,
  sortTags,
} from "@/components/Tags/TagManager";
import { TagFilterSelector } from "@/components/Tags/TagFilterSelector";
import { syncEntityTags } from "@/api/tags";
import {
  getAllBusinesses,
  exportBusinessesToCSV,
  deleteBusiness,
  createBusiness,
  updateBusiness,
  getAllTaxProfiles,
  type Business,
  type SearchFilters,
} from "@/api/bussiness";
import ExpandRowArrow from "@/components/UI/ExpandRowArrow";
import { getAllCountries } from "@/api/countries";
import { getAllPaymentMethods } from "@/api/payment_methods";
import { getAllShippingMethods } from "@/api/shipping_methods";

import { ShippingAddressManager } from "@/components/Businesses/ShippingAddressManager";
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

interface ClientFilterState {
  companyName: string;
  customerNumber: string;
  city: string;
  postalCode: string;
  country: string;
}

type BusinessWithContacts = Business & { contacts?: ContactPersonData[] };

const COUNTRY_OPTIONS = [
  { value: "DE", label: "DE" },
  { value: "AT", label: "AT" },
  { value: "CH", label: "CH" },
];

const BUSINESS_SHARE_BASE_URL = "https://system.gtech.de/bussinesses";

const DEFAULT_SEX_VALUE: string =
  (SEX_OPTIONS as any).find((o: any) => {
    const v = String(o?.value ?? "").toLowerCase();
    const l = String(o?.label ?? "").toLowerCase();
    return (
      v === "male" ||
      v === "m" ||
      v.startsWith("männ") ||
      v.startsWith("mann") ||
      l.includes("männlich") ||
      l.includes("male") ||
      l.includes("herr")
    );
  })?.value ?? "";

const toCountryCode = (country?: string) => {
  if (!country) return "";
  const c = country.trim();
  if (c.length === 2) return c.toUpperCase();
  const map: Record<string, string> = {
    germany: "DE",
    deutschland: "DE",
    austria: "AT",
    österreich: "AT",
    oesterreich: "AT",
    switzerland: "CH",
    schweiz: "CH",
  };
  return map[c.toLowerCase()] || c.toUpperCase().slice(0, 2);
};

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

const slugFromWebsite = (website?: string) => {
  if (!website) return "";
  let host = website.trim().toLowerCase();
  host = host.replace(/^https?:\/\//, "");
  host = host.replace(/^www\./, "");
  host = host.split(/[\/?#]/)[0];
  const label = host.split(".")[0];
  return label.replace(/[^a-z0-9-]/g, "");
};

const getInputClass = (hasValue: boolean, isEmptySelect: boolean = false) => {
  return `w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${hasValue
    ? "font-bold text-emerald-600 border-emerald-500 bg-emerald-50/20"
    : isEmptySelect
      ? "text-gray-400 border-gray-300 bg-white"
      : "text-gray-900 border-gray-300 bg-white"
    }`;
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
  const displayNameTouched = useRef(false);
  const starPortalTouched = useRef(false);
  const [expandedBusinessIds, setExpandedBusinessIds] = useState<Set<string>>(
    new Set(),
  );

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
  const [clientFilters, setClientFilters] = useState<ClientFilterState>({
    companyName: "",
    customerNumber: "",
    city: "",
    postalCode: "",
    country: "",
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
    sex: DEFAULT_SEX_VALUE,
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
    tagOrder: "",
  });

  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesModalData, setNotesModalData] = useState<any>(null);

  const [showBusinessNoteModal, setShowBusinessNoteModal] = useState(false);
  const [businessNoteData, setBusinessNoteData] = useState<any>(null);

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
    customerNumber: "",
    companyLabelPrintLogo: "",
    addressAdditional: "",
    street: "",
    postalCode: "",
    city: "",
    country: "DE",
    email: "",
    phone: "",
    website: "",
    vatTaxId: "",
    asanaLink: "",
    note: "",
    tags: [] as any[],
    tagOrder: "",
    debtor_no: "",
    default_tax_profile_id: "",
    vat_id_status: "unchecked",
    defaultPaymentMethod: "",
    defaultShippingMethod: "",
    defaultPaymentDueDays: 7,
  };

  const [businessForm, setBusinessForm] = useState<any>({
    ...emptyBusinessForm,
  });
  const [taxProfiles, setTaxProfiles] = useState<any[]>([]);
  const [dbCountries, setDbCountries] = useState<any[]>([]);
  const [dbPaymentMethods, setDbPaymentMethods] = useState<any[]>([]);
  const [dbShippingMethods, setDbShippingMethods] = useState<any[]>([]);
  const [newBusinessTags, setNewBusinessTags] = useState<Tag[]>([]);
  const [newContactTags, setNewContactTags] = useState<Tag[]>([]);

  const [urlParamHandled, setUrlParamHandled] = useState(false);
  const [displayNameHandled, setDisplayNameHandled] = useState(false);

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

      setExpandedBusinessIds(new Set());

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
  }, [filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [clientFilters]);

  useEffect(() => {
    fetchData();
  }, [filters]);

  useEffect(() => {
    const loadTaxProfiles = async () => {
      try {
        const res: any = await getAllTaxProfiles();
        if (res) {
          if (res.success && Array.isArray(res.data)) {
            setTaxProfiles(res.data);
          } else if (Array.isArray(res)) {
            setTaxProfiles(res);
          }
        }
      } catch (error) {
        console.error("Failed to load tax profiles", error);
      }
    };
    const loadCountries = async () => {
      try {
        const res: any = await getAllCountries(false);
        if (res && res.success) {
          setDbCountries(res.data || []);
        }
      } catch (error) {
        console.error("Failed to load countries", error);
      }
    };
    const loadPaymentAndShippingMethods = async () => {
      try {
        const [pmRes, smRes]: any = await Promise.all([
          getAllPaymentMethods(true).catch(() => ({ data: [] })),
          getAllShippingMethods(true).catch(() => ({ data: [] })),
        ]);
        setDbPaymentMethods(Array.isArray(pmRes?.data) ? pmRes.data.filter((pm: any) => pm.is_active) : []);
        setDbShippingMethods(Array.isArray(smRes?.data) ? smRes.data.filter((sm: any) => sm.is_active) : []);
      } catch (e) {
        console.error("Failed to load payment/shipping methods:", e);
      }
    };
    loadTaxProfiles();
    loadCountries();
    loadPaymentAndShippingMethods();
  }, []);


  const filteredBusinesses = useMemo(() => {
    const cn = clientFilters.companyName.trim().toLowerCase();
    const num = clientFilters.customerNumber.trim().toLowerCase();
    const city = clientFilters.city.trim().toLowerCase();
    const pc = clientFilters.postalCode.trim().toLowerCase();
    const country = clientFilters.country.trim().toUpperCase();
    if (!cn && !num && !city && !pc && !country) return allBusinesses;
    return allBusinesses.filter((b: any) => {
      const name = (b.displayName || b.companyName || b.name || "")
        .toString()
        .toLowerCase();
      const legal = (b.legalName || "").toString().toLowerCase();
      const number = (b.customerNumber || "").toString().toLowerCase();
      const bcity = (b.city || "").toString().toLowerCase();
      const bpc = (b.postalCode || "").toString().toLowerCase();
      const bcountry = toCountryCode(b.country).toUpperCase();
      if (cn && !name.includes(cn) && !legal.includes(cn)) return false;
      if (num && !number.includes(num)) return false;
      if (city && !bcity.includes(city)) return false;
      if (pc && !bpc.includes(pc)) return false;
      if (country && bcountry !== country) return false;
      return true;
    });
  }, [allBusinesses, clientFilters]);

  useEffect(() => {
    const total = filteredBusinesses.length;
    setTotalRecords(total);
    const pages = Math.max(1, Math.ceil(total / itemsPerPage));
    setTotalPages(pages);
    const safePage = Math.min(currentPage, pages);
    if (safePage !== currentPage) {
      setCurrentPage(safePage);
      return;
    }
    const startIndex = (safePage - 1) * itemsPerPage;
    setBusinesses(
      filteredBusinesses.slice(startIndex, startIndex + itemsPerPage),
    );
  }, [currentPage, filteredBusinesses]);

  const { sortBy, sortOrder, handleSort } = useTableSort();

  const sortedBusinesses = useMemo(() => {
    return sortData(businesses, sortBy, sortOrder, {
      company: (b: any) => (b.displayName || b.companyName || b.name || '').toLowerCase(),
      address: (b: any) => (buildFullAddress(b) || '').toLowerCase(),
      website: (b: any) => (b.website || '').toLowerCase(),
      note: (b: any) => (b.note || '').toLowerCase(),
    });
  }, [businesses, sortBy, sortOrder]);

  const renderSortIcon = (field: string) => {
    if (sortBy === field) {
      if (sortOrder === 'ASC') {
        return <ChevronUpIcon className="h-4 w-4 text-[#8CC21B] stroke-[3px]" />;
      }
      if (sortOrder === 'DESC') {
        return <ChevronDownIcon className="h-4 w-4 text-[#8CC21B] stroke-[3px]" />;
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

  useEffect(() => {
    if (displayNameHandled) return;
    const dn = searchParams?.get("displayName");
    if (dn && allBusinesses.length > 0) {
      const target = dn.trim().toLowerCase();
      const found = allBusinesses.find(
        (b: any) => (b.displayName || "").trim().toLowerCase() === target,
      );
      if (found) {
        openBusinessModal(found);
        setDisplayNameHandled(true);
      }
    }
  }, [searchParams, allBusinesses, displayNameHandled]);

  const toggleBusinessContacts = (businessId: string) => {
    setExpandedBusinessIds((prev) => {
      const next = new Set<string>();
      if (!prev.has(businessId)) next.add(businessId);
      return next;
    });
  };

  const handleCopyBusinessLink = async (
    business: any,
    e?: React.MouseEvent,
  ) => {
    e?.stopPropagation();
    const dn =
      business.displayName || business.companyName || business.name || "";
    const link = `${BUSINESS_SHARE_BASE_URL}?displayName=${encodeURIComponent(
      dn,
    )}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        throw new Error("Clipboard API unavailable");
      }
      toast.success("Business link copied");
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = link;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        toast.success("Business link copied");
      } catch {
        toast.error("Failed to copy link");
      }
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
        tagOrder: (contact as any).tagOrder || "",
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
      setShowCreateModal(false);
      resetCreateForm();
      setModalMode("create");
      setEditingContactId(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting contact:", error);
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
      const resolvedBusinessId = businessId || createForm.starBusinessDetailsId;
      const payload: any = {
        ...createForm,
        starBusinessDetailsId: resolvedBusinessId,
        businessId: resolvedBusinessId,
      };
      if (modalMode === "edit" && editingContactId) {
        await updateContactPerson(editingContactId, payload);
      } else {
        const result = await createContactPerson(payload);
        const createdId =
          (result as any)?.data?.id || (result as any)?.data?.contactPerson?.id;
        if (createdId && newContactTags.length > 0) {
          await syncEntityTags(
            createdId,
            "contact",
            newContactTags.map((t) => t.id),
          );
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
      sex: DEFAULT_SEX_VALUE,
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
      tagOrder: "",
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

  const handleOpenBusinessNote = (business: any) => {
    setBusinessNoteData(business);
    setShowBusinessNoteModal(true);
  };
  const generateDisplayName = (
    companyName: string,
    existing: BusinessWithContacts[] = [],
    excludeId?: string | null,
  ) => {
    const words = (companyName || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "";
    const used = new Set(
      (existing || [])
        .filter((b) => b.id !== excludeId)
        .map((b: any) => (b.displayName || "").toLowerCase())
        .filter(Boolean),
    );
    const first = words[0];
    if (!used.has(first.toLowerCase())) return first;
    const second = words[1];
    if (second) {
      const combo = `${first} ${second}`;
      if (!used.has(combo.toLowerCase())) return combo;
    }
    let i = 2;
    while (used.has(`${first} ${i}`.toLowerCase())) i++;
    return `${first} ${i}`;
  };

  const generateStarPortalLinkName = (
    companyName: string,
    website: string,
    existing: BusinessWithContacts[] = [],
    excludeId?: string | null,
  ) => {
    const used = new Set(
      (existing || [])
        .filter((b) => b.id !== excludeId)
        .map((b: any) => (b.starPortalLinkName || "").toLowerCase())
        .filter(Boolean),
    );
    let base = slugFromWebsite(website);
    if (!base) {
      const words = (companyName || "").trim().split(/\s+/).filter(Boolean);
      base = words[0] || "";
    }
    if (!base) return "";

    if (!used.has(base.toLowerCase())) return base;
    let i = 2;
    while (used.has(`${base}-${i}`.toLowerCase())) i++;
    return `${base}-${i}`;
  };

  const handleCompanyNameBlur = () => {
    if (businessModalMode !== "create") return;
    setBusinessForm((prev: any) => {
      const autoDisplay = displayNameTouched.current
        ? prev.displayName
        : generateDisplayName(
          prev.companyName,
          allBusinesses,
          editingBusinessId,
        );
      const autoStar = starPortalTouched.current
        ? prev.starPortalLinkName
        : generateStarPortalLinkName(
          prev.companyName,
          prev.website,
          allBusinesses,
          editingBusinessId,
        );
      return {
        ...prev,
        displayName: autoDisplay,
        starPortalLinkName: autoStar,
      };
    });
  };

  const handleWebsiteBlur = () => {
    if (businessModalMode !== "create") return;
    if (starPortalTouched.current) return;
    setBusinessForm((prev: any) => ({
      ...prev,
      starPortalLinkName: generateStarPortalLinkName(
        prev.companyName,
        prev.website,
        allBusinesses,
        editingBusinessId,
      ),
    }));
  };

  const resetBusinessForm = () => {
    setBusinessForm({ ...emptyBusinessForm });
    setEditingBusinessId(null);
    setBusinessEditMode(false);
    setNewBusinessTags([]);
    displayNameTouched.current = false;
    starPortalTouched.current = false;
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBusinessForm((prev: any) => ({
        ...prev,
        companyLabelPrintLogo: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
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
        business.legalName || business.companyName || business.name || "",
      displayName: business.displayName || business.companyName || "",
      starPortalLinkName: business.starPortalLinkName || "",
      vatTaxId: business.vatTaxId || "",
      customerNumber: business.customerNumber || "",
      companyLabelPrintLogo: business.companyLabelPrintLogo || "",
      addressAdditional: business.addressAdditional || "",
      street: business.street || "",
      postalCode: business.postalCode || "",
      city: business.city || "",
      country: toCountryCode(business.country) || "DE",
      email: business.email || "",
      phone: business.phone || "",
      website: business.website || "",
      asanaLink: business.asanaLink || "",
      note: business.note || "",
      tags: business.tags || [],
      tagOrder: business.tagOrder || "",
      debtor_no: business.debtor_no || "",
      default_tax_profile_id: business.default_tax_profile_id || "",
      vat_id_status: business.vat_id_status || "unchecked",
      defaultPaymentMethod: business.defaultPaymentMethod || "",
      defaultShippingMethod: business.defaultShippingMethod || "",
    });


    setNewBusinessTags(business.tags || []);
    displayNameTouched.current = true;
    starPortalTouched.current = true;
    setShowBusinessModal(true);
  };

  const handleBusinessSubmit = async () => {
    if (!businessForm.companyName?.trim()) {
      toast.error("Company name is required");
      return;
    }
    try {
      const payload: any = {
        legalName: businessForm.companyName,
        companyName: businessForm.companyName,
        displayName: businessForm.displayName,
        starPortalLinkName: businessForm.starPortalLinkName,
        vatTaxId: businessForm.vatTaxId,
        customerNumber: businessForm.customerNumber,
        companyLabelPrintLogo: businessForm.companyLabelPrintLogo,
        addressAdditional: businessForm.addressAdditional,
        street: businessForm.street,
        postalCode: businessForm.postalCode,
        city: businessForm.city,
        country: businessForm.country,
        email: businessForm.email,
        phone: businessForm.phone,
        website: businessForm.website,
        asanaLink: businessForm.asanaLink,
        note: businessForm.note,
        debtor_no: businessForm.debtor_no,
        default_tax_profile_id: businessForm.default_tax_profile_id || null,
        vat_id_status: businessForm.vat_id_status,
        defaultPaymentMethod: businessForm.defaultPaymentMethod || null,
        defaultShippingMethod: businessForm.defaultShippingMethod || null,
        defaultPaymentDueDays: businessForm.defaultPaymentDueDays !== undefined && businessForm.defaultPaymentDueDays !== null ? parseInt(businessForm.defaultPaymentDueDays) : 7,
      };

      if (businessModalMode === "edit" && editingBusinessId) {
        await updateBusiness(editingBusinessId, payload);
      } else {
        const result = await createBusiness(payload);
        const createdId = (result as any)?.id || (result as any)?.data?.id;
        if (createdId && newBusinessTags.length > 0) {
          await syncEntityTags(
            createdId,
            "company",
            newBusinessTags.map((t) => t.id),
          );
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
    } catch { }
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
    setClientFilters({
      companyName: "",
      customerNumber: "",
      city: "",
      postalCode: "",
      country: "",
    });
  };

  const buildFullAddress = (b: any) => {
    const code = toCountryCode(b.country);
    const isGerman = !code || code === "DE";

    let postal = (b.postalCode || "").trim();
    let city = (b.city || "").trim();

    const zipMatch = `${postal} ${city}`.trim().match(/(\d{4,5})\s+([^,]+)/);
    if (zipMatch) {
      postal = zipMatch[1];
      city = zipMatch[2].trim();
    }

    const cityLine = [postal, city]
      .filter((x: string) => x && x.trim())
      .join(" ")
      .trim();

    if (!cityLine) return null;
    if (!isGerman && code) {
      return `${cityLine}, ${code}`;
    }
    return cityLine;
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
            <CustomButton
              startIcon={<PlusIcon className="w-5 h-5" />}
              gradient={true}
              onClick={openCreateBusinessModal}
            >
              Add Business
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

        <div className="mb-6 p-3 bg-white border border-gray-200 rounded-md shadow-sm">
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-gray-400 shrink-0 select-none px-1">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
            </div>

            <div className="w-52 shrink-0">
              <input
                type="text"
                value={clientFilters.companyName}
                onChange={(e) =>
                  setClientFilters((p) => ({
                    ...p,
                    companyName: e.target.value,
                  }))
                }
                placeholder="Company Name..."
                className={getInputClass(!!clientFilters.companyName)}
              />
            </div>

            <div className="flex-1 min-w-[250px]">
              <TagFilterSelector
                category="company"
                compact={true}
                onChange={(tagString) =>
                  setFilters((prev) => ({ ...prev, tags: tagString }))
                }
                onReset={() => setFilters((prev) => ({ ...prev, tags: "" }))}
              />
            </div>

            <div className="w-36 shrink-0">
              <input
                type="text"
                value={clientFilters.customerNumber}
                onChange={(e) =>
                  setClientFilters((p) => ({
                    ...p,
                    customerNumber: e.target.value,
                  }))
                }
                placeholder="CustomerNo..."
                className={getInputClass(!!clientFilters.customerNumber)}
              />
            </div>

            <div className="w-36 shrink-0">
              <input
                type="text"
                value={clientFilters.postalCode}
                onChange={(e) =>
                  setClientFilters((p) => ({
                    ...p,
                    postalCode: e.target.value,
                  }))
                }
                placeholder="PostalCode..."
                className={getInputClass(!!clientFilters.postalCode)}
              />
            </div>

            <div className="w-32 shrink-0">
              <input
                type="text"
                value={clientFilters.city}
                onChange={(e) =>
                  setClientFilters((p) => ({ ...p, city: e.target.value }))
                }
                placeholder="City..."
                className={getInputClass(!!clientFilters.city)}
              />
            </div>

            <div className="w-28 shrink-0">
              <select
                value={clientFilters.country}
                onChange={(e) =>
                  setClientFilters((p) => ({ ...p, country: e.target.value }))
                }
                className={getInputClass(
                  !!clientFilters.country,
                  !clientFilters.country,
                )}
              >
                <option value="" className="text-gray-400">
                  Country...
                </option>
                <option value="DE" className="text-gray-900 font-normal">
                  DE
                </option>
                <option value="AT" className="text-gray-900 font-normal">
                  AT
                </option>
                <option value="CH" className="text-gray-900 font-normal">
                  CH
                </option>
              </select>
            </div>

            <button
              onClick={resetFilters}
              className="px-3 py-2 text-sm font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
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
                      <th
                        className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900 group"
                        onClick={() => handleSort('company')}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span>Company</span>
                          {renderSortIcon('company')}
                        </div>
                      </th>
                      <th
                        className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900 group"
                        onClick={() => handleSort('address')}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span>Address</span>
                          {renderSortIcon('address')}
                        </div>
                      </th>
                      <th
                        className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900 group"
                        onClick={() => handleSort('website')}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span>Website</span>
                          {renderSortIcon('website')}
                        </div>
                      </th>
                      <th
                        className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900 group"
                        onClick={() => handleSort('note')}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <span>Note</span>
                          {renderSortIcon('note')}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedBusinesses.map((business: any) => (
                      <React.Fragment key={business.id}>
                        <tr className="hover:bg-gray-50 transition-colors align-top">
                          <td className="px-3 py-3">
                            <div className="flex items-start gap-2">
                              <ExpandRowArrow
                                isExpanded={expandedBusinessIds.has(business.id)}
                                isEmpty={!business.contacts || business.contacts.length === 0}
                                onToggle={(e) => {
                                  e.stopPropagation();
                                  toggleBusinessContacts(business.id);
                                }}
                                title={
                                  !business.contacts || business.contacts.length === 0
                                    ? "No contacts yet"
                                    : expandedBusinessIds.has(business.id)
                                      ? "Hide contacts"
                                      : "Show contacts"
                                }
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p
                                    className="font-medium max-w-[220px] truncate text-gray-900 cursor-pointer"
                                    title={
                                      business.displayName ||
                                      business.companyName ||
                                      business.name
                                    }
                                    onClick={() => openBusinessModal(business)}
                                  >
                                    {business.displayName ||
                                      business.companyName ||
                                      business.name}
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {business.tags && business.tags.length > 0
                                      ? sortTags(
                                        business.tags,
                                        business.tagOrder,
                                      ).map((tag: any) => (
                                        <TagBadge
                                          key={tag.id}
                                          tag={tag}
                                          size="sm"
                                        />
                                      ))
                                      : null}
                                  </div>
                                </div>
                                {business.customerNumber && (
                                  <p
                                    className="text-xs text-gray-400 mt-0.5"
                                    title="Customer No"
                                  >
                                    {business.customerNumber}
                                  </p>
                                )}
                              </div>
                            </div>
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
                            <div className="flex items-center gap-0">
                              {business.website && (
                                <a
                                  href={
                                    business.website.startsWith("http")
                                      ? business.website
                                      : `https://${business.website}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-700 transition-colors p-1"
                                  title="Open Website"
                                >
                                  <GlobeAltIcon className="w-5 h-5" />
                                </a>
                              )}

                              <button
                                onClick={() => {
                                  const q =
                                    business.legalName ||
                                    business.displayName ||
                                    business.companyName ||
                                    business.name ||
                                    "";
                                  window.open(
                                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
                                    "_blank",
                                  );
                                }}
                                className="text-rose-500 hover:text-rose-700 transition-colors p-1"
                                title="Search on Google Maps"
                              >
                                <MapPinIcon className="w-5 h-5" />
                              </button>

                              {business.asanaLink && (
                                <a
                                  href={business.asanaLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-500 hover:text-purple-700 transition-colors p-1"
                                  title="Open Asana task"
                                >
                                  <svg
                                    className="h-5 w-5"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                                    <circle cx="12" cy="8.5" r="1.5" />
                                    <circle cx="8.5" cy="14.5" r="1.5" />
                                    <circle cx="15.5" cy="14.5" r="1.5" />
                                  </svg>
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top max-w-[300px]">
                            {" "}
                            {business.note ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenBusinessNote(business);
                                }}
                                title="Click to view note"
                                className="block w-full text-left text-sm text-gray-600 break-words line-clamp-4 hover:bg-gray-100 rounded-md p-1.5 transition-colors leading-snug"
                              >
                                {business.note.length > 160
                                  ? `${business.note.slice(0, 160)}...`
                                  : business.note}
                              </button>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>

                        {expandedBusinessIds.has(business.id) &&
                          business.contacts &&
                          business.contacts.length > 0 && (
                            <tr className="bg-gray-50/30">
                              <td colSpan={4} className="px-4 py-3">
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
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Note
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {business.contacts.map((contact: any) => (
                                        <tr
                                          key={contact.id}
                                          className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                                          onClick={() =>
                                            openContactModal(contact, true)
                                          }
                                          title="Click to edit contact"
                                        >
                                          <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="text-sm font-medium text-gray-900">
                                                {contact.name}{" "}
                                                {contact.familyName}
                                              </span>
                                              {contact.tags &&
                                                contact.tags.length > 0 && (
                                                  <div className="flex flex-wrap gap-1.5">
                                                    {sortTags(
                                                      contact.tags,
                                                      contact.tagOrder,
                                                    ).map((tag: any) => (
                                                      <TagBadge
                                                        key={tag.id}
                                                        tag={tag}
                                                        size="sm"
                                                      />
                                                    ))}
                                                  </div>
                                                )}
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
                                          <td className="px-4 py-3">
                                            {contact.note ? (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOpenNotesModal(contact);
                                                }}
                                                className="flex items-center gap-1 text-left hover:bg-gray-100 p-1 rounded"
                                                title="Click to view note"
                                              >
                                                <span
                                                  className="text-blue-500"
                                                  title="General Note"
                                                >
                                                  📝
                                                </span>
                                                <span className="text-sm text-gray-600 max-w-[220px] truncate">
                                                  {contact.note}
                                                </span>
                                              </button>
                                            ) : (
                                              <span className="text-gray-400 text-xs">
                                                -
                                              </span>
                                            )}
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
                              <td colSpan={4} className="px-6 py-3">
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
                  Showing{" "}
                  {totalRecords === 0
                    ? 0
                    : (currentPage - 1) * itemsPerPage + 1}{" "}
                  to {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
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

      <CustomModal
        isOpen={showBusinessModal}
        onClose={() => {
          setShowBusinessModal(false);
          resetBusinessForm();
          setBusinessModalMode("create");
        }}
        title=""
        showHeader={false}
        noPadding={true}
        width="max-w-4xl"
      >
        <ModalHeader
          entityName="Business"
          entityNo={businessModalMode === "edit" ? (businessForm.displayName) : null}
          icon={BuildingOfficeIcon}
          isEditMode={businessModalMode === "edit"}
          isEditEnabled={businessEditMode}
          onToggleEdit={() => setBusinessEditMode(!businessEditMode)}
          onClose={() => {
            setShowBusinessModal(false);
            resetBusinessForm();
            setBusinessModalMode("create");
          }}
          extraHeaderElements={
            <button
              type="button"
              onClick={() => {
                const q =
                  businessForm.legalName ||
                  businessForm.companyName ||
                  "";
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    q,
                  )}`,
                  "_blank",
                );
              }}
              className="text-rose-500 hover:text-rose-700 transition-colors p-1"
              title="Search on Google Maps"
            >
              <MapPinIcon className="w-5 h-5" />
            </button>
          }
        />
        <div className="p-6 flex-1 overflow-y-auto">



          <div className="space-y-6">
            <div className="rounded-xl p-4 -mx-4 bg-transparent">
              <div className="grid grid-cols-6 gap-4">
                <div className="col-span-6 md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Customer No (Leave blank autogenerate)
                  </label>
                  <input
                    type="text"
                    value={businessForm.customerNumber}
                    onChange={(e) =>
                      setBusinessForm({
                        ...businessForm,
                        customerNumber: e.target.value,
                      })
                    }
                    disabled={businessFieldDisabled}
                    className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed font-medium font-mono text-gray-800"
                    placeholder="Auto-generated if left blank"
                  />
                </div>

                <div className="col-span-6 md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Company Name (full legal name) *
                  </label>
                  <input
                    type="text"
                    value={businessForm.companyName}
                    onChange={(e) =>
                      setBusinessForm({
                        ...businessForm,
                        companyName: e.target.value,
                      })
                    }
                    onBlur={handleCompanyNameBlur}
                    disabled={businessFieldDisabled}
                    className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
                    placeholder="Muster GmbH & Co. KG"
                  />
                </div>

                <div className="col-span-3 md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={businessForm.displayName}
                    onChange={(e) => {
                      displayNameTouched.current = true;
                      setBusinessForm({
                        ...businessForm,
                        displayName: e.target.value,
                      });
                    }}
                    disabled={businessFieldDisabled}
                    className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Auto from first word (unique)"
                  />
                </div>
                <div className="col-span-3 md:col-span-2 flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Star Portal Link Name
                    </label>
                    <input
                      type="text"
                      value={businessForm.starPortalLinkName}
                      onChange={(e) => {
                        starPortalTouched.current = true;
                        setBusinessForm({
                          ...businessForm,
                          starPortalLinkName: e.target.value,
                        });
                      }}
                      disabled={businessFieldDisabled}
                      className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Auto from web URL (between www. and next .)"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleCopyBusinessLink(businessForm, e)}
                    className="text-gray-500 hover:text-gray-700 transition-colors p-2 mb-0.5 hover:bg-gray-100/50 rounded-lg shrink-0"
                    title="Copy business link"
                  >
                    <ClipboardDocumentIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="col-span-6 md:col-span-3">
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
                <div className="col-span-6 md:col-span-3">
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

                <div className="col-span-2">
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
                <div className="col-span-2">
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
                <div className="col-span-2">
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
                    {dbCountries.length > 0 ? (
                      dbCountries.map((c) => (
                        <option key={c.id} value={c.iso2}>
                          {c.iso2} - {c.name}
                        </option>
                      ))
                    ) : (
                      COUNTRY_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="col-span-3 md:col-span-2">
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
                <div className="col-span-3 md:col-span-2">
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
                <div className="col-span-6 md:col-span-2">
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
                    onBlur={handleWebsiteBlur}
                    disabled={businessFieldDisabled}
                    className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="https://www.muster.de"
                  />
                </div>

                <div className="col-span-6 border-t border-gray-200/60 my-2 pt-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Invoicing & Tax Details
                  </h4>
                  <div className="grid grid-cols-6 gap-4">
                    <div className="col-span-6 md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Debtor Number
                      </label>
                      <input
                        type="text"
                        value={businessForm.debtor_no || ""}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            debtor_no: e.target.value,
                          })
                        }
                        disabled={businessFieldDisabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
                        placeholder="D-99000"
                      />
                    </div>

                    <div className="col-span-6 md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        VAT / Tax ID
                      </label>
                      <input
                        type="text"
                        value={businessForm.vatTaxId || ""}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            vatTaxId: e.target.value,
                          })
                        }
                        disabled={businessFieldDisabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
                        placeholder="DE123456789"
                      />
                    </div>

                    <div className="col-span-6 md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        VAT Check Status
                      </label>
                      <select
                        value={businessForm.vat_id_status || "unchecked"}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            vat_id_status: e.target.value,
                          })
                        }
                        disabled={businessFieldDisabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 bg-white"
                      >
                        <option value="unchecked">Unchecked</option>
                        <option value="vies_valid">VIES Valid</option>
                        <option value="vies_invalid">VIES Invalid</option>
                        <option value="bzst_qualified_valid">BZSt Qualified Valid</option>
                        <option value="bzst_qualified_invalid">BZSt Qualified Invalid</option>
                      </select>
                    </div>

                    <div className="col-span-6 md:col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Default Tax Profile
                      </label>
                      <select
                        value={businessForm.default_tax_profile_id || ""}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            default_tax_profile_id: e.target.value || "",
                          })
                        }
                        disabled={businessFieldDisabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 bg-white"
                      >
                        <option value="">None / Not Assigned</option>
                        {taxProfiles.map((tp) => (
                          <option key={tp.id} value={tp.id}>
                            {tp.name} ({tp.rate}%)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-6 md:col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Default Payment Method
                      </label>
                      <select
                        value={businessForm.defaultPaymentMethod || ""}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            defaultPaymentMethod: e.target.value || "",
                          })
                        }
                        disabled={businessFieldDisabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 bg-white"
                      >
                        <option value="">None / Not Assigned</option>
                        {(dbPaymentMethods.length > 0 ? dbPaymentMethods.map((pm: any) => pm.name) : ["Prepayment", "Bank transfer", "Cash on delivery", "Invoice", "Credit card", "PayPal"]).map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-6 md:col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Default Shipping Method
                      </label>
                      <select
                        value={businessForm.defaultShippingMethod || ""}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            defaultShippingMethod: e.target.value || "",
                          })
                        }
                        disabled={businessFieldDisabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 bg-white"
                      >
                        <option value="">None / Not Assigned</option>
                        {(dbShippingMethods.length > 0 ? dbShippingMethods.map((sm: any) => sm.name) : ["Standard shipping", "Express shipping", "Freight", "Courier", "Pickup"]).map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-6 md:col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Payment Due (in days)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={businessForm.defaultPaymentDueDays !== undefined ? businessForm.defaultPaymentDueDays : 7}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            defaultPaymentDueDays: e.target.value !== "" ? parseInt(e.target.value) : "",
                          })
                        }
                        disabled={businessFieldDisabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 bg-white font-medium"
                        placeholder="7"
                      />
                    </div>



                    <div className="col-span-6 md:col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Asana Link
                      </label>
                      <input
                        type="url"
                        value={businessForm.asanaLink || ""}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            asanaLink: e.target.value,
                          })
                        }
                        disabled={businessFieldDisabled}
                        className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="https://app.asana.com/..."
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-6">
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

                <div className="col-span-6">
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
                      tagOrder={businessForm.tagOrder}
                      onTagsUpdated={(updatedTags) =>
                        setBusinessForm((prev: any) => ({
                          ...prev,
                          tags: updatedTags,
                          tagOrder: updatedTags.map((t) => t.id).join(","),
                        }))
                      }
                      disabled={businessFieldDisabled}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="col-span-6">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Company Label Print Logo
              </label>
              <div className="flex items-center gap-3">
                {businessForm.companyLabelPrintLogo ? (
                  <img
                    src={businessForm.companyLabelPrintLogo}
                    alt="Label logo"
                    className="h-12 w-12 object-contain rounded border border-gray-200 bg-white"
                  />
                ) : (
                  <div className="h-12 w-12 rounded border border-dashed border-gray-300 flex items-center justify-center text-[10px] text-gray-400">
                    No logo
                  </div>
                )}
                <input
                  id="labelLogoInput"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={businessFieldDisabled}
                  className="hidden"
                />
                <label
                  htmlFor="labelLogoInput"
                  className={`px-3 py-1.5 text-xs rounded-lg border border-gray-300/80 bg-white/70 transition-all ${businessFieldDisabled
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer hover:bg-white"
                    }`}
                >
                  Upload
                </label>
                {businessForm.companyLabelPrintLogo &&
                  !businessFieldDisabled && (
                    <button
                      type="button"
                      onClick={() =>
                        setBusinessForm({
                          ...businessForm,
                          companyLabelPrintLogo: "",
                        })
                      }
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
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

            {businessModalMode === "edit" && editingBusinessId && (
              <ShippingAddressManager companyId={editingBusinessId} countries={dbCountries} displayName={businessForm.displayName} />
            )}
          </div>

        </div>
        <ModalFooter
          isEditMode={businessModalMode === "edit"}
          isEditEnabled={businessEditMode}
          onDelete={() => {
            if (editingBusinessId)
              handleDeleteBusiness(editingBusinessId);
          }}
          onCancel={() => {
            setShowBusinessModal(false);
            resetBusinessForm();
            setBusinessModalMode("create");
          }}
          onSave={handleBusinessSubmit}
          saveLabel={businessModalMode === "edit" ? "Update Business" : "Create Business"}
          loading={loading}
          saveDisabled={!businessForm.companyName?.trim() || loading}
          showDelete={user?.role === UserRole.ADMIN}
        />
      </CustomModal>

      <CustomModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetCreateForm();
          setModalMode("create");
          setEditingContactId(null);
        }}
        title={modalMode === "edit" ? "Edit Contact Person" : "Add New Contact Person"}
        width="max-w-2xl"
      >

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
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <span className="text-green-500 text-xl">💬</span> Contact
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
                  🤝
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
                className="w-full px-3 py-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Internal note about this contact…"
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
                  tagOrder={createForm.tagOrder}
                  onTagsUpdated={(updatedTags) =>
                    setCreateForm((prev: any) => ({
                      ...prev,
                      tags: updatedTags,
                      tagOrder: updatedTags.map((t) => t.id).join(","),
                    }))
                  }
                  disabled={modalMode === "edit" && !editModeEnabled}
                />
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-between gap-3">
            <div>
              {modalMode === "edit" && user?.role === UserRole.ADMIN && (
                <button
                  onClick={() => {
                    if (editingContactId)
                      handleDeleteContact(editingContactId);
                  }}
                  disabled={!editModeEnabled}
                  className="px-3 py-2 text-xs text-red-700 bg-white/80 backdrop-blur-sm border border-red-300/80 rounded hover:bg-red-50/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete Contact
                </button>
              )}
            </div>
            <div className="flex gap-3">
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
      </CustomModal>

      <CustomModal
        isOpen={showNotesModal && !!notesModalData}
        onClose={() => {
          setShowNotesModal(false);
          setNotesModalData(null);
        }}
        title={notesModalData ? `All Notes for ${notesModalData.name} ${notesModalData.familyName}` : "All Notes"}
        width="max-w-2xl"
      >
        {notesModalData && (
          <>
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
                  <span className="text-green-500 text-xl">💬</span>
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
                  <span className="text-purple-500 text-xl">🤝</span>
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
          </>
        )}
      </CustomModal>

      <CustomModal
        isOpen={showBusinessNoteModal && !!businessNoteData}
        onClose={() => {
          setShowBusinessNoteModal(false);
          setBusinessNoteData(null);
        }}
        title={
          businessNoteData
            ? `Note · ${businessNoteData.displayName ||
            businessNoteData.companyName ||
            businessNoteData.name
            }`
            : "Note"
        }
        width="max-w-2xl"
      >
        {businessNoteData && (
          <>
            <div className="bg-blue-50 rounded-lg p-4 max-w-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-500 text-xl">📝</span>
                <h3 className="font-semibold text-gray-900">Note</h3>
              </div>
              <p className="text-gray-700 break-words line-clamp-4">
                {businessNoteData.note || ""}
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  const b = businessNoteData;
                  setShowBusinessNoteModal(false);
                  setBusinessNoteData(null);
                  openBusinessModal(b);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <PencilIcon className="h-4 w-4" />
                Edit Business
              </button>
              <button
                onClick={() => {
                  setShowBusinessNoteModal(false);
                  setBusinessNoteData(null);
                }}
                className="px-4 py-2 text-white bg-gray-600 rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </>
        )}
      </CustomModal>
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
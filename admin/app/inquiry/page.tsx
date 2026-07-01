"use client";
import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PauseIcon,
  LinkIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon,
  ScaleIcon,
  ArrowsPointingOutIcon,
  TrashIcon,
  PhotoIcon,
  PaperClipIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import {
  getAllInquiries,
  createInquiry,
  updateInquiry,
  deleteInquiry,
  type Inquiry,
  type CreateInquiryPayload,
  type UpdateInquiryPayload,
  type InquirySearchFilters,
  type Request,
  getInquiryStatuses,
  getPriorityOptions,
  getAvailableCurrencies,
  getRequestStatuses,
  convertInquiryToItem,
  convertRequestToItem,
  removeRequestFromInquiry,
  getInquiryById,
} from "@/api/inquiry";
import {
  getAvailableIntervals,
  getAvailablePriorities as getAvailableRequestPriorities,
  getAvailableStatuses as getAvailableRequestStatuses,
  updateRequestedItem,
} from "@/api/requested_items";
import { getAllCustomers } from "@/api/customers";
import { getAllContactPersons } from "@/api/contacts";
import { getAllUsers } from "@/api/user";
import CustomButton from "@/components/UI/CustomButton";
import CustomModal from "@/components/UI/CustomModal";
import ItemPreviewModal from "@/components/Item/ItemPreviewModal";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import { MessagesSquare, ClipboardList } from "lucide-react";
import PageHeader from "@/components/UI/PageHeader";
import ModalHeader from "@/components/UI/ModalHeader";
import ModalFooter from "@/components/UI/ModalFooter";
import { UserRole } from "@/utils/interfaces";
import { getAllTarics } from "@/api/items";
import { TagFilterSelector } from "@/components/Tags/TagFilterSelector";
import { TagPickerInput, EntityTagSelector, type Tag } from "@/components/Tags/TagManager";
import { syncEntityTags } from "@/api/tags";
import { CustomerSearchInput } from "@/components/UI/CustomerSearchInput";
import { formatDate } from "@/utils/date";

export interface Customer {
  id: string;
  companyName: string;
  legalName?: string;
  email?: string;
  stage: "business" | "star_business" | "star_customer" | "device_maker";
  displayName: string;
}
interface ContactPerson {
  id: string;
  name: string;
  familyName: string;
  position?: string;
  email?: string;
  starBusinessDetailsId: string;
  starBusinessDetails?: {
    id: string;
    companyName: string;
  };
  businessId?: string;
}
interface QualityCriterion {
  description: string;
  picture?: File | string;
  pictureUrl?: string;
}
const getConversionFormFields = (hasExistingDimensions?: any) => {
  const baseFields = [
    {
      name: "model",
      label: "Model",
      type: "text",
      placeholder: "Enter model number",
      required: false,
    },
    {
      name: "suppCat",
      label: "Supplier Category",
      type: "text",
      placeholder: "Enter supplier category",
      required: false,
    },
    {
      name: "weight",
      label: "Weight (kg)",
      type: "number",
      placeholder: "Enter weight",
      step: "0.01",
      required: !hasExistingDimensions?.weight,
      description: !hasExistingDimensions?.weight
        ? "Required: No weight data found in source"
        : "",
    },
    {
      name: "width",
      label: "Width (cm)",
      type: "number",
      placeholder: "Enter width",
      step: "0.1",
      required: !hasExistingDimensions?.width,
      description: !hasExistingDimensions?.width
        ? "Required: No width data found in source"
        : "",
    },
    {
      name: "height",
      label: "Height (cm)",
      type: "number",
      placeholder: "Enter height",
      step: "0.1",
      required: !hasExistingDimensions?.height,
      description: !hasExistingDimensions?.height
        ? "Required: No height data found in source"
        : "",
    },
    {
      name: "length",
      label: "Length (cm)",
      type: "number",
      placeholder: "Enter length",
      step: "0.1",
      required: !hasExistingDimensions?.length,
      description: !hasExistingDimensions?.length
        ? "Required: No length data found in source"
        : "",
    },
    {
      name: "itemNameCN",
      label: "Chinese Name",
      type: "text",
      placeholder: "Enter Chinese item name",
      required: false,
    },
    {
      name: "FOQ",
      label: "First Order Quantity",
      type: "number",
      placeholder: "Enter FOQ",
      min: 0,
      required: false,
    },
    {
      name: "FSQ",
      label: "First Sample Quantity",
      type: "number",
      placeholder: "Enter FSQ",
      min: 0,
      required: false,
    },
    {
      name: "remark",
      label: "Remark",
      type: "textarea",
      placeholder: "Enter remarks",
      required: false,
    },
    {
      name: "RMBPrice",
      label: "RMB Price",
      type: "number",
      placeholder: "Enter RMB price",
      step: "0.01",
      min: 0,
      required: false,
    },
    {
      name: "note",
      label: "Internal Note",
      type: "textarea",
      placeholder: "Enter internal notes",
      required: false,
    },
    {
      name: "taricId",
      label: "TARIC Code",
      type: "select",
      placeholder: "Select TARIC code",
      required: false,
      description: "Leave empty to generate new TARIC",
      options: [],
    },
    {
      name: "catId",
      label: "Category ID",
      type: "number",
      placeholder: "Enter Category ID",
      min: 1,
      required: false,
    },
    {
      name: "material",
      label: "Material",
      type: "text",
      placeholder: "Enter material",
      required: false,
    },
    {
      name: "specification",
      label: "Specification",
      type: "textarea",
      placeholder: "Enter specifications",
      required: false,
    },
    {
      name: "painPoints",
      label: "Pain Points",
      type: "tags",
      placeholder: "Add tag...",
      required: false,
    },
    {
      name: "photo",
      label: "Photo URL",
      type: "text",
      placeholder: "Enter photo URL",
      required: false,
    },
  ];
  return baseFields;
};
const CombinedInquiriesPageContent = () => {
  const mapRequestsFromServer = (requests: any[]) => {
    return (requests || []).map((req: any) => ({
      id: req.id,
      itemName: req.itemName,
      description: req.description || "",
      qty: req.qty || 1,
      purchasePrice: req.purchasePrice || 0,
      currency: req.currency || "RMB",
      status: req.status || "Draft",
      material: req.material || "",
      specification: req.specification || "",
      images: req.images || [],
      weight: req.weight,
      width: req.width,
      height: req.height,
      length: req.length,
      qualityCriteria: req.qualityCriteria || [],
      attachments: req.attachments || [],
      taric: req.taric || "",
      asanaLink: req.asanaLink || "",
      itemNo: req.itemNo || "",
      urgency1: req.urgency1 || "",
      urgency2: req.urgency2 || "",
      painPoints: req.painPoints || [],
      priceRMB: req.priceRMB || req.purchasePrice || 0,
      priority: req.priority || "Normal",
      interval: req.interval || "Monatlich",
      targetPrice: req.targetPrice || 0,
      annualPotential: req.annualPotential || 0,
      annualPotentialKEur: req.annualPotentialKEur || 0,
    }));
  };
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [newInquiryTags, setNewInquiryTags] = useState<Tag[]>([]);
  const [allInquiries, setAllInquiries] = useState<Inquiry[]>([]);
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [inquiryCurrentPage, setInquiryCurrentPage] = useState(1);
  const [inquiryTotalPages, setInquiryTotalPages] = useState(1);
  const [inquiryTotalRecords, setInquiryTotalRecords] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inquiryModalMode, setInquiryModalMode] = useState<"create" | "edit">(
    "create",
  );
  const [tarics, setTarics] = useState<any[]>([]);
  const [editingInquiryId, setEditingInquiryId] = useState<string | null>(null);
  const { user } = useSelector((state: RootState) => state.user);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  const [existingDimensionFields, setExistingDimensionFields] = useState<{
    weight?: boolean;
    width?: boolean;
    height?: boolean;
    length?: boolean;
  }>({});
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [conversionType, setConversionType] = useState<"inquiry" | "request">(
    "inquiry",
  );
  const [convertingItemId, setConvertingItemId] = useState<string>("");
  const [convertingInquiryId, setConvertingInquiryId] = useState<string>("");
  const [conversionFormData, setConversionFormData] = useState<any>({});
  const [conversionInquiryData, setConversionInquiryData] =
    useState<Inquiry | null>(null);
  const [conversionRequestData, setConversionRequestData] =
    useState<Request | null>(null);
  const [showRequestDetailModal, setShowRequestDetailModal] = useState(false);
  const [selectedRequestForDetail, setSelectedRequestForDetail] = useState<any | null>(null);
  const [selectedRequestInquiryId, setSelectedRequestInquiryId] = useState<string>("");
  const [expandedRequestIndex, setExpandedRequestIndex] = useState<any>(0);
  const [expandedInquiryIds, setExpandedInquiryIds] = useState<Set<string>>(
    new Set(),
  );
  const [allRequestsExpanded, setAllRequestsExpanded] = useState(true);
  const [inquiryImageFile, setInquiryImageFile] = useState<File | null>(null);
  const [inquiryImagePreview, setInquiryImagePreview] = useState<string>("");
  const [inquiryFormData, setInquiryFormData] = useState<CreateInquiryPayload>({
    name: "",
    description: "",
    image: "",
    isAssembly: false,
    customerId: "",
    contactPersonId: "",
    status: "draft",
    priority: "Medium",
    referenceNumber: "",
    requiredByDate: undefined,
    internalNotes: "",
    termsConditions: "",
    projectLink: "",
    asanaLink: "",
    assemblyInstructions: "",
    weight: undefined,
    width: undefined,
    height: undefined,
    length: undefined,
    isFragile: false,
    requiresSpecialHandling: false,
    handlingInstructions: "",
    numberOfPackages: undefined,
    packageType: "",
    purchasePrice: undefined,
    purchasePriceCurrency: "RMB" as "RMB" | "HKD" | "EUR" | "USD",
    qty: 1,
    interval: "Monatlich",
    taric: "",
    requestStatus: "Draft",
    itemNo: "",
    inquiryNo: "",
    urgency1: "",
    urgency2: "",
    painPoints: [],
    requests: [],
    total_potential_k_eur: 0,
    next_followup_at: undefined,
    owner_user_id: "",
    next_action: "",
  });
  const [inquiryTagInput, setInquiryTagInput] = useState("");
  const [requestLoopTagInputs, setRequestLoopTagInputs] = useState<any>({});
  const handleAddInquiryPainPoint = () => {
    const value = inquiryTagInput.trim();
    if (value && !inquiryFormData.painPoints?.includes(value)) {
      setInquiryFormData({
        ...inquiryFormData,
        painPoints: [...(inquiryFormData.painPoints || []), value],
      });
      setInquiryTagInput("");
    }
  };
  const handleAddRequestLoopPainPoint = (index: number) => {
    const value = (requestLoopTagInputs[index] || "").trim();
    if (value && !inquiryRequests[index].painPoints?.includes(value)) {
      const updatedRequests = [...inquiryRequests];
      updatedRequests[index] = {
        ...updatedRequests[index],
        painPoints: [...(updatedRequests[index].painPoints || []), value],
      };
      setInquiryRequests(updatedRequests);
      setRequestLoopTagInputs({
        ...requestLoopTagInputs,
        [index]: "",
      });
    }
  };
  const [conversionTagInput, setConversionTagInput] = useState("");
  const handleAddConversionPainPoint = () => {
    const value = conversionTagInput.trim();
    if (value && !conversionFormData.painPoints?.includes(value)) {
      setConversionFormData({
        ...conversionFormData,
        painPoints: [...(conversionFormData.painPoints || []), value],
      });
      setConversionTagInput("");
    }
  };
  const [inquiryRequests, setInquiryRequests] = useState<any[]>([
    {
      itemName: "",
      description: "",
      qty: 1,
      purchasePrice: 0,
      currency: "RMB",
      status: "Draft",
      material: "",
      specification: "",
      images: [],
      weight: undefined,
      width: undefined,
      height: undefined,
      length: undefined,
      qualityCriteria: [],
      attachments: [],
      taric: "",
      asanaLink: "",
      itemNo: "",
      urgency1: "",
      urgency2: "",
      painPoints: [],
      priceRMB: 0,
      priority: "Normal",
      interval: "Monatlich",
    },
  ]);
  const [inquiryFilters, setInquiryFilters] = useState<InquirySearchFilters>({
    search: "",
    status: "",
    priority: "",
    isAssembly: undefined,
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "DESC",
    tags: "",
    requestItemTags: "",
  } as any);

  const itemsPerPage = 20;
  const [urlParamHandled, setUrlParamHandled] = useState(false);
  useEffect(() => {
    fetchCustomers();
    fetchContactPersons();
    fetchTarics();
    fetchUsers();
  }, []);
  const fetchTarics = async () => {
    try {
      const response = await getAllTarics();
      setTarics(response.data || []);
    } catch (error) {
      console.error("Error fetching tarics:", error);
    }
  };
  const handleSort = (field: string) => {
    setInquiryFilters((prev: any) => {
      const isSameField = prev.sortBy === field;
      if (isSameField) {
        if (prev.sortOrder === "ASC") {
          return {
            ...prev,
            sortOrder: "DESC",
          };
        } else {
          return {
            ...prev,
            sortBy: "createdAt",
            sortOrder: "DESC",
          };
        }
      } else {
        return {
          ...prev,
          sortBy: field,
          sortOrder: "ASC",
        };
      }
    });
  };
  useEffect(() => {
    fetchInquiries();
  }, [inquiryFilters, selectedCustomerId]);
  const searchParams = useSearchParams();

  const handleInquiryStatusChange = async (
    inquiryId: string,
    newStatus: string,
  ) => {
    try {
      const targetInquiry = allInquiries.find((i) => i.id === inquiryId);
      if (!targetInquiry) return;
      const requestsData = (targetInquiry.requests || []).map((req: any) => ({
        ...req,
        qty: req.qty?.toString() || "1",
      }));

      await updateInquiry({
        id: inquiryId,
        name: targetInquiry.name,
        description: targetInquiry.description || "",
        image: targetInquiry.image || "",
        isAssembly: targetInquiry.isAssembly,
        customerId: targetInquiry.customer?.id,
        contactPersonId: targetInquiry.contactPerson?.id || "",
        status: newStatus,
        priority: targetInquiry.priority,
        referenceNumber: targetInquiry.referenceNumber || "",
        requiredByDate: targetInquiry.requiredByDate
          ? new Date(targetInquiry.requiredByDate)
          : undefined,
        internalNotes: targetInquiry.internalNotes || "",
        termsConditions: targetInquiry.termsConditions || "",
        projectLink: targetInquiry.projectLink || "",
        asanaLink: targetInquiry.asanaLink || "",
        assemblyInstructions: targetInquiry.assemblyInstructions || "",
        weight: targetInquiry.weight,
        width: targetInquiry.width,
        height: targetInquiry.height,
        length: targetInquiry.length,
        isFragile: targetInquiry.isFragile || false,
        requiresSpecialHandling: targetInquiry.requiresSpecialHandling || false,
        handlingInstructions: targetInquiry.handlingInstructions || "",
        numberOfPackages: targetInquiry.numberOfPackages,
        packageType: targetInquiry.packageType || "",
        purchasePrice: targetInquiry.purchasePrice,
        purchasePriceCurrency: targetInquiry.purchasePriceCurrency || "RMB",
        itemNo: targetInquiry.itemNo || "",
        urgency1: targetInquiry.urgency1 || "",
        urgency2: targetInquiry.urgency2 || "",
        painPoints: targetInquiry.painPoints || [],
        requests: requestsData,
      } as UpdateInquiryPayload);

      fetchInquiries();
    } catch (error) {
      console.error("Error updating inquiry status:", error);
    }
  };
  useEffect(() => {
    if (urlParamHandled) return;
    const inquiryId = searchParams.get("inquiryId");
    if (inquiryId && allInquiries.length > 0) {
      const inquiry = allInquiries.find((i) => i.id === inquiryId);
      if (inquiry) {
        handleInquiryClick(inquiry);
        setUrlParamHandled(true);
      }
    }
  }, [searchParams, allInquiries, urlParamHandled]);
  const handleCopyInquiryLink = (e: React.MouseEvent, inquiryId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?inquiryId=${inquiryId}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Link copied to clipboard!"))
      .catch(() => toast.error("Failed to copy link"));
  };

  const toggleRequestExpansion = (index: number) => {
    if (expandedRequestIndex === index) {
      setExpandedRequestIndex(null);
    } else {
      setExpandedRequestIndex(index);
    }
  };
  const toggleInquiryRequests = (inquiryId: string) => {
    setExpandedInquiryIds((prev) => {
      const next = new Set(prev);
      if (next.has(inquiryId)) {
        next.delete(inquiryId);
      } else {
        next.add(inquiryId);
      }
      return next;
    });
  };
  const toggleAllInquiryRequests = (inquiries: any[]) => {
    if (allRequestsExpanded) {
      setExpandedInquiryIds(new Set());
      setAllRequestsExpanded(false);
    } else {
      setExpandedInquiryIds(
        new Set(
          inquiries.filter((i) => i.requests?.length > 0).map((i) => i.id),
        ),
      );
      setAllRequestsExpanded(true);
    }
  };
  const fetchCustomers = async () => {
    try {
      const response = await getAllCustomers({ limit: 1000 });
      if (response?.data) {
        const customers = Array.isArray(response.data)
          ? response.data
          : response.data.customers || response.data.businesses || [];
        setCustomers(customers);
        console.log(`Loaded ${customers.length} customers/businesses`);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };
  const fetchContactPersons = async () => {
    try {
      const response = await getAllContactPersons();
      console.log(response);
      if (response?.data?.contactPersons) {
        setContactPersons(response.data.contactPersons);
      }
    } catch (error) {
      console.error("Error fetching contact persons:", error);
    }
  };
  const fetchUsers = async () => {
    try {
      const response = await getAllUsers();
      if (response?.data) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };
  const fetchInquiries = useCallback(async () => {
    setInquiryLoading(true);
    try {
      const filters: any = {
        ...inquiryFilters,
        page: 1,
        limit: 10000,
        ...(selectedCustomerId ? { customerId: selectedCustomerId } : {}),
      };
      const response = await getAllInquiries(filters);
      if (response?.data) {
        let inquiryData = Array.isArray(response.data)
          ? response.data
          : response.data.data || response.data.inquiries || [];
        if (inquiryFilters.requestItemTags) {
          const tagFilters = inquiryFilters.requestItemTags.split(",");
          const includeTagIds = tagFilters.filter((t: string) => !t.startsWith("!")).map((t: string) => t);
          const excludeTagIds = tagFilters.filter((t: string) => t.startsWith("!")).map((t: string) => t.substring(1));

          inquiryData = inquiryData.filter((inquiry: any) => {
            return (inquiry.requests || []).some((req: any) => {
              const reqTagIds = req.tags?.map((t: any) => t.id) || [];
              const hasAllIncludes = includeTagIds.every((id: string) => reqTagIds.includes(id));
              const hasNoExcludes = excludeTagIds.every((id: string) => !reqTagIds.includes(id));
              return hasAllIncludes && hasNoExcludes;
            });
          });
        }
        if (inquiryFilters.sortBy === "total_potential_k_eur") {
          inquiryData = [...inquiryData].sort((a: any, b: any) => {
            const valA = a.total_potential_k_eur !== undefined && a.total_potential_k_eur !== null ? Number(a.total_potential_k_eur) : 0;
            const valB = b.total_potential_k_eur !== undefined && b.total_potential_k_eur !== null ? Number(b.total_potential_k_eur) : 0;
            return inquiryFilters.sortOrder === "ASC" ? valA - valB : valB - valA;
          });
        } else if (inquiryFilters.sortBy === "createdAt") {
          inquiryData = [...inquiryData].sort((a: any, b: any) => {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            return inquiryFilters.sortOrder === "ASC" ? timeA - timeB : timeB - timeA;
          });
        }

        setAllInquiries(inquiryData);
        const totalFiltered = inquiryData.length;
        const totalPagesCalc = Math.ceil(totalFiltered / itemsPerPage);
        setInquiryTotalPages(totalPagesCalc);
        setInquiryTotalRecords(totalFiltered);
        const startIndex = (inquiryCurrentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = inquiryData.slice(startIndex, endIndex);
        setInquiries(paginatedItems);
        setExpandedInquiryIds(new Set());
        setAllRequestsExpanded(false);
      }
    } catch (error) {
      console.error("Error fetching inquiries:", error);
    } finally {
      setInquiryLoading(false);
    }
  }, [inquiryFilters, inquiryCurrentPage, itemsPerPage, selectedCustomerId]);
  const refreshInquiryRequests = useCallback(async () => {
    if (!editingInquiryId) return;
    try {
      const response = await getInquiryById(editingInquiryId);
      const inquiry = (response as any)?.data;
      if (inquiry && inquiry.requests) {
        setInquiryRequests(mapRequestsFromServer(inquiry.requests));
      }
    } catch (error) {
      console.error("Error refreshing inquiry requests:", error);
    }
  }, [editingInquiryId]);
  const handleItemInfoClick = async (request: any, index: number) => {
    if (request.id) {
      setSelectedRequestForDetail(request);
      setSelectedRequestInquiryId(editingInquiryId || "");
      setShowRequestDetailModal(true);
      return;
    }

    try {
      let updatedFormData = { ...inquiryFormData };
      let updatedRequests = [...inquiryRequests];
      let changedForm = false;
      let changedRequests = false;

      if (!updatedFormData.name) {
        updatedFormData.name = "Draft Inquiry";
        changedForm = true;
      }
      if (!updatedFormData.customerId && customers.length > 0) {
        updatedFormData.customerId = customers[0].id;
        changedForm = true;
      }

      if (!updatedRequests[index].itemName) {
        updatedRequests[index].itemName = "Draft Request Item";
        changedRequests = true;
      }
      if (!updatedRequests[index].qty || parseInt(updatedRequests[index].qty) < 1) {
        updatedRequests[index].qty = 1;
        changedRequests = true;
      }

      if (changedForm) {
        setInquiryFormData(updatedFormData);
      }
      if (changedRequests) {
        setInquiryRequests(updatedRequests);
      }

      if (!updatedFormData.customerId) {
        toast.error("Please add/select a Customer before viewing item details");
        return;
      }

      const requestsData = updatedRequests.map((req) => ({
        ...req,
        qty: req.qty.toString(),
      }));
      const inquiryPayload = {
        ...updatedFormData,
        requests: requestsData,
      };

      let savedInquiryId = editingInquiryId;
      if (inquiryModalMode === "edit" && editingInquiryId) {
        await updateInquiry({
          id: editingInquiryId,
          ...inquiryPayload,
        } as UpdateInquiryPayload);
      } else {
        const result = await createInquiry(inquiryPayload as CreateInquiryPayload);
        savedInquiryId = (result as any)?.data?.id || (result as any)?.id;
        if (savedInquiryId) {
          setEditingInquiryId(savedInquiryId);
          setInquiryModalMode("edit");
          setEditModeEnabled(true);
          if (newInquiryTags.length > 0) {
            await syncEntityTags(savedInquiryId, "inquiry", newInquiryTags.map((t) => t.id));
          }
        }
      }

      if (!savedInquiryId) {
        toast.error("Failed to save inquiry");
        return;
      }

      const response = await getInquiryById(savedInquiryId);
      const updatedInquiry = (response as any)?.data;
      if (updatedInquiry && updatedInquiry.requests) {
        const mappedRequests = mapRequestsFromServer(updatedInquiry.requests);
        setInquiryRequests(mappedRequests);
        const savedRequest = mappedRequests[index];
        if (savedRequest && savedRequest.id) {
          setSelectedRequestForDetail(savedRequest);
          setSelectedRequestInquiryId(savedInquiryId);
          setShowRequestDetailModal(true);
        } else {
          toast.error("Could not find saved request");
        }
      }
      fetchInquiries();
    } catch (error) {
      console.error("Error auto-saving inquiry for details:", error);
    }
  };
  const renderDimensionStatus = () => {
    if (!Object.values(existingDimensionFields).some((v) => v)) {
      return null;
    }
    return (
      <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-2">
          <CheckCircleIcon className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium text-green-800">
            Dimension data found in source:
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {existingDimensionFields.weight && (
            <div className="text-xs text-green-700">
              <span className="font-medium">Weight:</span>{" "}
              {conversionFormData.weight} kg
            </div>
          )}
          {existingDimensionFields.width && (
            <div className="text-xs text-green-700">
              <span className="font-medium">Width:</span>{" "}
              {conversionFormData.width} cm
            </div>
          )}
          {existingDimensionFields.height && (
            <div className="text-xs text-green-700">
              <span className="font-medium">Height:</span>{" "}
              {conversionFormData.height} cm
            </div>
          )}
          {existingDimensionFields.length && (
            <div className="text-xs text-green-700">
              <span className="font-medium">Length:</span>{" "}
              {conversionFormData.length} cm
            </div>
          )}
        </div>
      </div>
    );
  };
  const handleInquiryClick = (inquiry: Inquiry) => {
    setInquiryModalMode("edit");
    setEditingInquiryId(inquiry.id);
    setEditModeEnabled(false);
    setInquiryFormData({
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
      asanaLink: inquiry.asanaLink || "",
      assemblyInstructions: inquiry.assemblyInstructions || "",
      weight: inquiry.weight,
      width: inquiry.width,
      height: inquiry.height,
      length: inquiry.length,
      isFragile: inquiry.isFragile || false,
      requiresSpecialHandling: inquiry.requiresSpecialHandling || false,
      handlingInstructions: inquiry.handlingInstructions || "",
      numberOfPackages: inquiry.numberOfPackages,
      packageType: inquiry.packageType || "",
      purchasePrice: inquiry.purchasePrice,
      purchasePriceCurrency: inquiry.purchasePriceCurrency || "RMB",
      itemNo: inquiry.itemNo || "",
      inquiryNo: inquiry.inquiryNo || "",
      urgency1: inquiry.urgency1 || "",
      urgency2: inquiry.urgency2 || "",
      painPoints: inquiry.painPoints || [],
      requests: inquiry.requests || [],
      total_potential_k_eur: inquiry.total_potential_k_eur || 0,
      next_followup_at: inquiry.next_followup_at,
      owner_user_id: inquiry.owner_user_id || "",
      next_action: inquiry.next_action || "",
    });
    setNewInquiryTags((inquiry as any).tags || []);
    setInquiryImagePreview(inquiry.image || "");
    if (inquiry.requests && inquiry.requests.length > 0) {
      setInquiryRequests(mapRequestsFromServer(inquiry.requests));
    }
    setExpandedRequestIndex(0);
    setShowCreateModal(true);
  };
  const handleInquirySubmit = async () => {
    if (!inquiryFormData.name || !inquiryFormData.customerId) {
      toast.error("Please fill in all required fields");
      return;
    }
    const hasValidRequest = inquiryRequests.some(
      (req) => req.itemName && req.qty >= 1,
    );
    if (!hasValidRequest) {
      toast.error("Please add at least one valid request item");
      return;
    }
    try {
      const requestsData = inquiryRequests.map((req) => ({
        ...req,
        qty: req.qty.toString(),
      }));
      const inquiryPayload = {
        ...inquiryFormData,
        requests: requestsData,
      };
      if (inquiryModalMode === "edit" && editingInquiryId) {
        await updateInquiry({
          id: editingInquiryId,
          ...inquiryPayload,
        } as UpdateInquiryPayload);
      } else {
        const result = await createInquiry(inquiryPayload as CreateInquiryPayload);
        const createdId = (result as any)?.data?.id;
        if (createdId && newInquiryTags.length > 0) {
          await syncEntityTags(createdId, "inquiry", newInquiryTags.map((t) => t.id));
        }
      }
      resetInquiryForm();
      setShowCreateModal(false);
      fetchInquiries();
    } catch (error) {
      console.error(
        `Error ${inquiryModalMode === "edit" ? "updating" : "creating"
        } inquiry:`,
        error,
      );
    }
  };
  const addNewRequest = () => {
    setInquiryRequests([
      ...inquiryRequests,
      {
        itemName: "",
        description: "",
        qty: 1,
        purchasePrice: 0,
        currency: "RMB",
        status: "Draft",
        material: "",
        specification: "",
        images: [],
        weight: undefined,
        width: undefined,
        height: undefined,
        length: undefined,
        qualityCriteria: [],
        attachments: [],
        taric: "",
        asanaLink: "",
        itemNo: "",
        urgency1: "",
        urgency2: "",
        painPoints: [],
        priceRMB: 0,
        priority: "Normal",
        interval: "Monatlich",
        targetPrice: 0,
        annualPotential: 0,
        annualPotentialKEur: 0,
      },
    ]);
    setExpandedRequestIndex(inquiryRequests.length);
  };
  const handleDeleteInquiry = async (inquiryId: string) => {
    if (window.confirm("Are you sure you want to delete this inquiry?")) {
      try {
        await deleteInquiry(inquiryId);
        fetchInquiries();
      } catch (error) {
        console.error("Error deleting inquiry:", error);
        toast.error("Failed to delete inquiry");
      }
    }
  };
  const updateRequest = (index: number, field: string, value: any) => {
    const updatedRequests = [...inquiryRequests];
    updatedRequests[index] = {
      ...updatedRequests[index],
      [field]: value,
    };
    setInquiryRequests(updatedRequests);
  };
  const addRequestQualityCriterion = (requestIndex: number) => {
    const updatedRequests = [...inquiryRequests];
    if (!updatedRequests[requestIndex].qualityCriteria) {
      updatedRequests[requestIndex].qualityCriteria = [];
    }
    updatedRequests[requestIndex].qualityCriteria!.push({
      description: "",
      picture: undefined,
    });
    setInquiryRequests(updatedRequests);
  };

  const resetInquiryForm = () => {
    setInquiryFormData({
      name: "",
      description: "",
      image: "",
      isAssembly: false,
      customerId: "",
      contactPersonId: "",
      status: "draft",
      priority: "Medium",
      referenceNumber: "",
      requiredByDate: undefined,
      internalNotes: "",
      termsConditions: "",
      projectLink: "",
      asanaLink: "",
      assemblyInstructions: "",
      weight: undefined,
      width: undefined,
      height: undefined,
      length: undefined,
      isFragile: false,
      requiresSpecialHandling: false,
      handlingInstructions: "",
      numberOfPackages: undefined,
      packageType: "",
      purchasePrice: undefined,
      purchasePriceCurrency: "RMB",
      qty: 1,
      interval: "Monatlich",
      taric: "",
      requestStatus: "Draft",
      itemNo: "",
      inquiryNo: "",
      urgency1: "",
      urgency2: "",
      painPoints: [],
      requests: [],
      total_potential_k_eur: 0,
      next_followup_at: undefined,
      owner_user_id: "",
      next_action: "",
    });
    setInquiryRequests([
      {
        itemName: "",
        description: "",
        qty: 1,
        purchasePrice: 0,
        currency: "RMB",
        status: "Draft",
        material: "",
        specification: "",
        images: [],
        weight: undefined,
        width: undefined,
        height: undefined,
        length: undefined,
        qualityCriteria: [],
        attachments: [],
        taric: "",
        asanaLink: "",
        itemNo: "",
        urgency1: "",
        urgency2: "",
        painPoints: [],
        priceRMB: 0,
        priority: "Normal",
        interval: "Monatlich",
        targetPrice: 0,
        annualPotential: 0,
        annualPotentialKEur: 0,
      },
    ]);
    setInquiryImageFile(null);
    setInquiryImagePreview("");
    setEditModeEnabled(false);
    setEditingInquiryId(null);
    setInquiryModalMode("create");
    setNewInquiryTags([]);
    setExpandedRequestIndex(0);
  };
  const removeRequest = (index: number) => {
    if (inquiryRequests.length > 1) {
      const updatedRequests = inquiryRequests.filter((_, i) => i !== index);
      setInquiryRequests(updatedRequests);
      if (expandedRequestIndex === index) {
        setExpandedRequestIndex(Math.max(0, index - 1));
      } else if (expandedRequestIndex && expandedRequestIndex > index) {
        setExpandedRequestIndex(expandedRequestIndex - 1);
      }
    } else {
      toast.error("At least one request is required");
    }
  };
  const handleOpenConversionModal = async (
    type: "inquiry" | "request",
    itemId: string,
    inquiryData?: any,
    requestData?: any,
    inquiryId?: string,
  ) => {
    setConversionType(type);
    setConvertingItemId(itemId);
    if (inquiryId) setConvertingInquiryId(inquiryId);
    let existingDims = {
      weight: false,
      width: false,
      height: false,
      length: false,
    };
    let initialFormData: any = {};
    if (type === "inquiry" && inquiryData) {
      setConversionInquiryData(inquiryData);
      existingDims = {
        weight: !!inquiryData.weight,
        width: !!inquiryData.width,
        height: !!inquiryData.height,
        length: !!inquiryData.length,
      };
      if (inquiryData.isAssembly) {
        initialFormData = {
          itemNameCN: inquiryData.description,
          FOQ: inquiryData.requests?.[0]?.qty
            ? parseInt(inquiryData.requests[0].qty) || 0
            : 0,
          RMBPrice: inquiryData.purchasePrice || 0,
          remark: inquiryData.description,
          note: inquiryData.internalNotes,
          weight: inquiryData.weight || "",
          width: inquiryData.width || "",
          height: inquiryData.height || "",
          length: inquiryData.length || "",
        };
      } else {
        initialFormData = {
          itemNameCN: inquiryData.description,
          remark: inquiryData.description,
          note: inquiryData.internalNotes,
          weight: inquiryData.weight || "",
          width: inquiryData.width || "",
          height: inquiryData.height || "",
          length: inquiryData.length || "",
        };
      }
    } else if (type === "request" && requestData) {
      setConversionRequestData(requestData);
      existingDims = {
        weight: !!requestData.weight,
        width: !!requestData.width,
        height: !!requestData.height,
        length: !!requestData.length,
      };
      initialFormData = {
        itemNameCN: requestData.specification,
        FOQ: requestData.qty ? parseInt(requestData.qty) || 0 : 0,
        FSQ: requestData.sampleQty ? parseInt(requestData.sampleQty) || 0 : 0,
        RMBPrice: requestData.purchasePrice || 0,
        remark: requestData.comment,
        note: requestData.extraNote,
        material: requestData.material,
        specification: requestData.specification,
        weight: requestData.weight || "",
        width: requestData.width || "",
        height: requestData.height || "",
        length: requestData.length || "",
      };
    }
    setExistingDimensionFields(existingDims);
    setConversionFormData(initialFormData);
    setShowConversionModal(true);
  };
  const handleConvertInquiryToItem = async () => {
    const validationErrors = validateConversionForm(
      conversionFormData,
      existingDimensionFields,
    );
    if (validationErrors.length > 0) {
      toast.error(
        `Please fill in required fields: ${validationErrors.join(", ")}`,
      );
      return;
    }
    try {
      await convertInquiryToItem(convertingItemId, conversionFormData);
      setShowConversionModal(false);
      fetchInquiries();
      resetConversionForm();
    } catch (error: any) {
      console.error("Error converting inquiry to item:", error);
      toast.error(error.message || "Failed to convert inquiry to item");
    }
  };
  const handleConvertRequestToItem = async () => {
    const validationErrors = validateConversionForm(
      conversionFormData,
      existingDimensionFields,
    );
    if (validationErrors.length > 0) {
      toast.error(
        `Please fill in required fields: ${validationErrors.join(", ")}`,
      );
      return;
    }
    try {
      await convertRequestToItem(
        convertingItemId,
        conversionFormData,
        convertingInquiryId,
      );
      setShowConversionModal(false);
      resetConversionForm();
    } catch (error: any) {
      console.error("Error converting request to item:", error);
    }
  };
  const validateConversionForm = (formData: any, existingDims: any) => {
    const errors: string[] = [];
    if (!existingDims.weight && (!formData.weight || formData.weight === "")) {
      errors.push("Weight");
    }
    if (!existingDims.width && (!formData.width || formData.width === "")) {
      errors.push("Width");
    }
    if (!existingDims.height && (!formData.height || formData.height === "")) {
      errors.push("Height");
    }
    if (!existingDims.length && (!formData.length || formData.length === "")) {
      errors.push("Length");
    }
    return errors;
  };
  const resetConversionForm = () => {
    setConversionFormData({});
    setConversionInquiryData(null);
    setConversionRequestData(null);
    setConvertingItemId("");
    setConvertingInquiryId("");
    setExistingDimensionFields({});
  };
  const handleConvertInquiryClick = (inquiry: Inquiry) => {
    handleOpenConversionModal("inquiry", inquiry.id, inquiry);
  };
  const handleConvertRequestClick = (request: Request, inquiryId?: string) => {
    handleOpenConversionModal(
      "request",
      request.id!,
      undefined,
      request,
      inquiryId,
    );
  };
  const getInquiryStatusColor = (status: string) => {
    const statusObj = getInquiryStatuses().find((s) => s.value.toLowerCase() === status?.toLowerCase());
    return statusObj?.color || "bg-gray-100 text-gray-800";
  };
  const getInquiryPriorityColor = (priority: string) => {
    const priorityObj = getPriorityOptions().find((p) => p.value === priority);
    return priorityObj?.color || "bg-gray-100 text-gray-800";
  };
  const getRequestStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-blue-100 text-blue-800",
      "supplier search": "bg-yellow-100 text-yellow-800",
      stopped: "bg-red-100 text-red-800",
      successful: "bg-green-100 text-green-800",
      Draft: "bg-gray-100 text-gray-800",
      Submitted: "bg-blue-100 text-blue-800",
      "In Review": "bg-yellow-100 text-yellow-800",
      Quoted: "bg-purple-100 text-purple-800",
      Negotiation: "bg-orange-100 text-orange-800",
      Accepted: "bg-green-100 text-green-800",
      Rejected: "bg-red-100 text-red-800",
      Cancelled: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };
  const getRequestPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      Low: "bg-green-100 text-green-800",
      Medium: "bg-yellow-100 text-yellow-800",
      High: "bg-orange-100 text-orange-800",
      Urgent: "bg-red-100 text-red-800",
      Normal: "bg-blue-100 text-blue-800",
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
  };
  const getHighestPriority = (requests?: any[]) => {
    if (!requests || requests.length === 0) return "-";
    const hasHigh = requests.some(r => r.priority === "High");
    return hasHigh ? "High" : "Normal";
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };
  const renderDimensionInfo = (item: any) => {
    const hasDimensions =
      item.weight || item.width || item.height || item.length;
    if (!hasDimensions) return null;
    return (
      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
        {item.weight && (
          <span className="flex items-center gap-1">
            <ScaleIcon className="h-3 w-3" />
            {item.weight} kg
          </span>
        )}
        {(item.width || item.height || item.length) && (
          <span className="flex items-center gap-1">
            <ArrowsPointingOutIcon className="h-3 w-3" />
            {item.length && `${item.length}×`}
            {item.width && `${item.width}×`}
            {item.height && `${item.height}`}
            cm
          </span>
        )}
      </div>
    );
  };
  const formatTaricDisplay = (taric: any) => {
    if (!taric) return "";
    return `${taric.id} - ${taric.code || "No code"} - ${taric.name_de || taric.name_en || taric.name_cn || "No name"
      }`;
  };
  const getConversionFormFieldsWithOptions = () => {
    const fields = getConversionFormFields(existingDimensionFields);
    return fields.map((field) => {
      if (field.name === "taricId") {
        return {
          ...field,
          options: tarics.map((taric) => ({
            value: taric.id,
            label: formatTaricDisplay(taric),
          })),
        };
      }
      return field;
    });
  };

  const showPicColumn = allInquiries.some((inq) => inq.isAssembly);
  const totalCols = showPicColumn ? 10 : 9;

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
            <PageHeader title="Inquiries" icon={MessagesSquare} />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchInquiries}
              disabled={inquiryLoading}
              className="px-3 py-2 text-sm text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${inquiryLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <CustomButton
              gradient={true}
              onClick={() => {
                resetInquiryForm();
                setShowCreateModal(true);
              }}
              className="px-3 py-2 text-sm bg-gray-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-gray-700/90 transition-all flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              New Inquiry
            </CustomButton>
          </div>
        </div>

        <div className="mb-6 p-3 bg-white border border-gray-200 rounded-md shadow-sm">
          <div className="flex flex-wrap items-center gap-2 w-full">
            <div className="flex items-center gap-1.5 text-gray-400 shrink-0 select-none px-1">
              <FunnelIcon className="w-5 h-5 text-primary" />
            </div>

            <div className="flex-grow flex-shrink flex-1 min-w-[200px]">
              <TagFilterSelector
                category="inquiry"
                compact={true}
                placeholder="Filter by Inquiry Tags..."
                onChange={(tagString) =>
                  setInquiryFilters((prev: any) => ({ ...prev, tags: tagString }))
                }
                onReset={() =>
                  setInquiryFilters((prev: any) => ({ ...prev, tags: "" }))
                }
              />
            </div>

            <div className="flex-grow flex-shrink flex-1 min-w-[200px]">
              <TagFilterSelector
                category="request_item"
                compact={true}
                placeholder="Filter by Request Item Tags..."
                onChange={(tagString) =>
                  setInquiryFilters((prev: any) => ({ ...prev, requestItemTags: tagString }))
                }
                onReset={() =>
                  setInquiryFilters((prev: any) => ({ ...prev, requestItemTags: "" }))
                }
              />
            </div>

            <div className="flex-grow flex-shrink flex-1 min-w-[220px]">
              <CustomerSearchInput
                value={selectedCustomerId}
                onChange={(id) => {
                  setSelectedCustomerId(id);
                  setInquiryCurrentPage(1);
                }}
                placeholder="Filter by Customer..."
                mode="customers"
              />
            </div>

            <div className="shrink-0">
              <button
                onClick={() => {
                  setInquiryFilters((prev: any) => ({
                    ...prev,
                    tags: "",
                    requestItemTags: "",
                  }));
                  setSelectedCustomerId("");
                  setInquiryCurrentPage(1);
                }}
                className="w-full lg:w-auto px-2.5 py-2 text-xs font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-md transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <ArrowPathIcon className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-md shadow-lg border border-gray-100/50 overflow-hidden">
          {inquiryLoading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center gap-3">
                <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-500" />
                <span className="text-gray-600">Loading inquiries...</span>
              </div>
            </div>
          ) : inquiries.length === 0 ? (
            <div className="p-8 text-center">
              <ExclamationTriangleIcon className="h-10 w-10 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No inquiries found</p>
              <p className="text-gray-500 text-sm mt-2">
                Try adjusting your filters or create a new inquiry
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-200/50 border-b border-gray-200/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inquiry
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company / Contacts
                    </th>
                    {showPicColumn && (
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        Pic
                      </th>
                    )}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request Items
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-900 transition-colors group"
                      onClick={() => handleSort("total_potential_k_eur")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>VP</span>
                        {inquiryFilters.sortBy === "total_potential_k_eur" ? (
                          inquiryFilters.sortOrder === "ASC" ? (
                            <ChevronUpIcon className="h-4 w-4 text-blue-600 stroke-[3px]" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4 text-blue-600 stroke-[3px]" />
                          )
                        ) : (
                          <span className="text-gray-400 opacity-40 group-hover:opacity-100 transition-opacity">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10l5-5 5 5M7 14l5 5 5-5" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Highest Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Next Action
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Follow-up
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {inquiries.map((inquiry) => (
                    <React.Fragment key={inquiry.id}>
                      <tr className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleInquiryRequests(inquiry.id);
                              }}
                              className={`${!inquiry.requests || inquiry.requests.length === 0
                                ? "text-red-500 hover:text-red-700"
                                : "text-gray-400 hover:text-gray-700"
                                } flex-shrink-0 mt-0.5`}
                              title={
                                !inquiry.requests || inquiry.requests.length === 0
                                  ? "No request items yet"
                                  : expandedInquiryIds.has(inquiry.id)
                                    ? "Hide requests"
                                    : "Show requests"
                              }
                            >
                              <ChevronRightIcon
                                className={`h-4 w-4 transition-transform duration-200 ${expandedInquiryIds.has(inquiry.id) ? "rotate-90" : ""
                                  }`}
                              />
                            </button>
                            <div
                              className="cursor-pointer flex flex-col"
                              onClick={() => handleInquiryClick(inquiry)}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium text-gray-900">{inquiry.name}</span>
                                {inquiry.isAssembly && (
                                  <CubeIcon
                                    className="h-3.5 w-3.5 text-blue-500"
                                    title="Assembly Item"
                                  />
                                )}
                              </div>
                              {inquiry.inquiryNo && (
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono font-semibold mt-0.5 w-fit">
                                  {inquiry.inquiryNo}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td
                          className="px-4 py-3 cursor-pointer"
                          onClick={() => handleInquiryClick(inquiry)}
                        >
                          <div className="w-[10rem]">
                            <a
                              href={`/customers/${inquiry.customer?.id}`}
                              className="text-sm text-blue-600 hover:text-blue-800 block font-medium"
                              onClick={(e: any) => e.stopPropagation()}
                            >
                              {inquiry.customer?.companyName || "-"}
                            </a>
                            <div className="text-xs text-gray-600 truncate mt-0.5">
                              {inquiry.contactPerson ? (
                                `${inquiry.contactPerson.name || ""} ${inquiry.contactPerson.familyName || ""}`.trim() || "-"
                              ) : (
                                "-"
                              )}
                            </div>
                          </div>
                        </td>
                        {showPicColumn && (
                          <td className="px-3 py-3 text-center">
                            {inquiry.isAssembly ? (
                              <div className="w-10 h-10 rounded border border-gray-200 bg-gray-50 flex items-center justify-center mx-auto flex-shrink-0">
                                {inquiry.image ? (
                                  <img
                                    src={inquiry.image}
                                    alt="Assembly"
                                    className="w-full h-full object-cover rounded cursor-pointer hover:scale-105 transition-transform"
                                    onClick={(e) => { e.stopPropagation(); window.open(inquiry.image!, "_blank"); }}
                                    title="Assembly item image"
                                  />
                                ) : (
                                  <PhotoIcon className="w-5 h-5 text-gray-300" title="No image available" />
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-medium text-gray-900">
                            {inquiry.requests?.length || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900 font-medium">
                          {inquiry.total_potential_k_eur !== undefined && inquiry.total_potential_k_eur !== null
                            ? Math.round(inquiry.total_potential_k_eur)
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <select
                              value={inquiry.status?.toLowerCase()}
                              onChange={async (e: any) => {
                                await handleInquiryStatusChange(
                                  inquiry.id,
                                  e.target.value,
                                );
                              }}
                              className={`text-xs w-[7.5rem] px-2.5 py-1 rounded-full font-medium border-0 cursor-pointer ${getInquiryStatusColor(
                                inquiry.status,
                              )}`}
                            >
                              {getInquiryStatuses().map((status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {(() => {
                            const hp = getHighestPriority(inquiry.requests);
                            if (hp === "-") return <span className="text-gray-400">-</span>;
                            const badgeColor = hp === "High" ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-800";
                            return (
                              <div className="flex justify-center">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>
                                  {hp}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-left text-sm text-gray-700 max-w-[15rem] truncate" title={inquiry.next_action || ""}>
                          {inquiry.next_action || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900 font-medium">
                          {inquiry.next_followup_at ? formatDate(inquiry.next_followup_at) : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3 text-left text-sm text-gray-900 font-medium">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const ownerUser = users.find((u) => u.id === inquiry.owner_user_id);
                              return ownerUser ? ownerUser.name : <span className="text-gray-400">-</span>;
                            })()}
                            {(inquiry.asanaLink || inquiry.requests?.some((r: any) => r.asanaLink)) && (
                              <a
                                href={inquiry.asanaLink || inquiry.requests?.find((r: any) => r.asanaLink)?.asanaLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-purple-500 hover:text-purple-700 transition-colors shrink-0"
                                title="Open Asana task"
                              >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                                  <circle cx="12" cy="8.5" r="1.5" />
                                  <circle cx="8.5" cy="14.5" r="1.5" />
                                  <circle cx="15.5" cy="14.5" r="1.5" />
                                </svg>
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedInquiryIds.has(inquiry.id) && (
                        inquiry.requests && inquiry.requests.length > 0 ? (
                          <tr className="bg-gray-50/50 border-t border-b border-gray-100">
                            <td colSpan={totalCols} className="px-6 py-4">
                              <div>
                                <div className="text-xs font-semibold text-gray-500 mb-2.5 uppercase tracking-wider flex items-center gap-1.5 select-none">
                                  <ClipboardList className="h-4 w-4 text-blue-500" />
                                  <span>Request Items for: <strong className="text-gray-800">{inquiry.name}</strong></span>
                                </div>
                                <div className="overflow-x-auto shadow-sm rounded-lg border border-gray-200 bg-white">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-200/50 border-b border-gray-200/50">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Request Item
                                        </th>
                                        {inquiry.isAssembly && (
                                          <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                                            Pic
                                          </th>
                                        )}
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Qty &amp; Interval
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Target Price
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          VP
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Status
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Priority
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Asana
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Actions
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {inquiry.requests.map((request: any) => (
                                        <tr
                                          key={request.id}
                                          onClick={() => {
                                            setSelectedRequestForDetail(request);
                                            setSelectedRequestInquiryId(inquiry.id);
                                            setShowRequestDetailModal(true);
                                          }}
                                          className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${request.priority === "High"
                                            ? "bg-red-50/50"
                                            : ""
                                            }`}
                                        >
                                          <td className="px-4 py-3">
                                            <div className="w-[8rem]">
                                              <div className="text-sm font-medium text-gray-900">
                                                {request.itemName}
                                              </div>
                                              {request.itemNo && (
                                                <div className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-semibold inline-block mt-0.5">
                                                  {request.itemNo}
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                          {inquiry.isAssembly && (
                                            <td className="px-3 py-3 text-center">
                                              <div className="w-10 h-10 rounded border border-gray-200 bg-gray-50 flex items-center justify-center mx-auto">
                                                {request.images && request.images.length > 0 ? (
                                                  <img
                                                    src={request.images[0]}
                                                    alt="Item"
                                                    className="w-full h-full object-cover rounded cursor-pointer hover:scale-105 transition-transform"
                                                    onClick={(e) => { e.stopPropagation(); window.open(request.images![0], "_blank"); }}
                                                    title="View image"
                                                  />
                                                ) : (
                                                  <PhotoIcon className="w-5 h-5 text-gray-300" title="No image available" />
                                                )}
                                              </div>
                                            </td>
                                          )}
                                          <td className="px-4 py-3 text-center">
                                            <div className="text-sm font-medium text-gray-900">
                                              {request.qty} / {request.interval}
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <div className="text-sm font-medium text-gray-900">
                                              {request.targetPrice !== undefined && request.targetPrice !== null
                                                ? `${request.targetPrice} €`
                                                : "-"}
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <div className="text-sm font-bold text-blue-600">
                                              {request.annualPotentialKEur !== undefined && request.annualPotentialKEur !== null
                                                ? Math.round(request.annualPotentialKEur)
                                                : "-"}
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <select
                                              value={request.requestStatus}
                                              onClick={(e) => e.stopPropagation()}
                                              onChange={async (e: any) => {
                                                const nextStatus = e.target.value;

                                                setInquiries((prevInquiries) =>
                                                  prevInquiries.map((inq) => ({
                                                    ...inq,
                                                    requests: inq.requests?.map(
                                                      (req: any) =>
                                                        req.id === request.id
                                                          ? {
                                                            ...req,
                                                            requestStatus:
                                                              nextStatus,
                                                          }
                                                          : req,
                                                    ),
                                                  })),
                                                );

                                                setAllInquiries(
                                                  (prevAllInquiries) =>
                                                    prevAllInquiries.map(
                                                      (inq) => ({
                                                        ...inq,
                                                        requests:
                                                          inq.requests?.map(
                                                            (req: any) =>
                                                              req.id ===
                                                                request.id
                                                                ? {
                                                                  ...req,
                                                                  requestStatus:
                                                                    nextStatus,
                                                                }
                                                                : req,
                                                          ),
                                                      }),
                                                    ),
                                                );

                                                try {
                                                  await updateRequestedItem(
                                                    request.id,
                                                    {
                                                      requestStatus: nextStatus,
                                                    },
                                                  );

                                                  fetchInquiries();
                                                } catch (error) {
                                                  fetchInquiries();
                                                }
                                              }}
                                              className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${getRequestStatusColor(
                                                request.requestStatus,
                                              )}`}
                                            >
                                              {getAvailableRequestStatuses().map(
                                                (status) => (
                                                  <option
                                                    key={status.value}
                                                    value={status.value}
                                                  >
                                                    {status.label}
                                                  </option>
                                                ),
                                              )}
                                            </select>
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <span
                                              className={`text-xs px-2 py-1 rounded-full font-medium ${getRequestPriorityColor(
                                                request.priority,
                                              )}`}
                                            >
                                              {request.priority}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            {request.asanaLink ? (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  window.open(
                                                    request.asanaLink,
                                                    "_blank",
                                                  );
                                                }}
                                                className="text-purple-500 hover:text-purple-700 transition-colors p-1"
                                                title="Open Asana link"
                                              >
                                                <svg
                                                  className="h-4 w-4"
                                                  viewBox="0 0 24 24"
                                                  fill="currentColor"
                                                >
                                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                                                  <circle
                                                    cx="12"
                                                    cy="8.5"
                                                    r="1.5"
                                                  />
                                                  <circle
                                                    cx="8.5"
                                                    cy="14.5"
                                                    r="1.5"
                                                  />
                                                  <circle
                                                    cx="15.5"
                                                    cy="14.5"
                                                    r="1.5"
                                                  />
                                                </svg>
                                              </button>
                                            ) : (
                                              <span
                                                className="text-red-500 font-bold text-lg animate-pulse"
                                                title="Missing Asana Link"
                                              >
                                                !
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleConvertRequestClick(
                                                    request,
                                                    inquiry.id,
                                                  );
                                                }}
                                                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-all flex items-center gap-1"
                                                title="Convert to item"
                                              >
                                                <ArrowRightIcon className="h-3 w-3" />
                                                Convert
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr className="bg-gray-50/30">
                            <td colSpan={totalCols} className="px-6 py-5 text-center">
                              <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
                                <ClipboardDocumentListIcon className="h-8 w-8 text-gray-300" />
                                <p className="text-sm font-medium text-gray-500">No request items yet</p>
                                <p className="text-xs text-gray-400">This inquiry has no requested items.</p>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {inquiryTotalPages > 1 && (
            <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-200/50 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {(inquiryCurrentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(
                  inquiryCurrentPage * itemsPerPage,
                  inquiryTotalRecords,
                )}{" "}
                of {inquiryTotalRecords} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setInquiryCurrentPage(Math.max(1, inquiryCurrentPage - 1))
                  }
                  disabled={inquiryCurrentPage === 1}
                  className="px-2 py-1 text-sm bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                >
                  <ChevronLeftIcon className="h-3 w-3" />
                  Prev
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(5, inquiryTotalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setInquiryCurrentPage(pageNum)}
                        className={`px-2 py-1 text-sm rounded-lg transition-all ${inquiryCurrentPage === pageNum
                          ? "bg-gray-600 text-white"
                          : "bg-white/80 backdrop-blur-sm border border-gray-300/80 hover:bg-white/60"
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {inquiryTotalPages > 5 && (
                    <>
                      <span className="px-1 text-gray-500">...</span>
                      <button
                        onClick={() => setInquiryCurrentPage(inquiryTotalPages)}
                        className={`px-2 py-1 text-sm rounded-lg transition-all ${inquiryCurrentPage === inquiryTotalPages
                          ? "bg-gray-600 text-white"
                          : "bg-white/80 backdrop-blur-sm border border-gray-300/80 hover:bg-white/60"
                          }`}
                      >
                        {inquiryTotalPages}
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() =>
                    setInquiryCurrentPage(
                      Math.min(inquiryTotalPages, inquiryCurrentPage + 1),
                    )
                  }
                  disabled={inquiryCurrentPage === inquiryTotalPages}
                  className="px-2 py-1 text-sm bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                >
                  Next
                  <ChevronRightIcon className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <CustomModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetInquiryForm();
        }}
        title=""
        showHeader={false}
        noPadding={true}
        width="max-w-4xl"
      >
        <ModalHeader
          entityName="Inquiry"
          entityNo={inquiryModalMode === "edit" ? inquiryFormData.inquiryNo : null}
          icon={ClipboardDocumentListIcon}
          isEditMode={inquiryModalMode === "edit"}
          isEditEnabled={editModeEnabled}
          onToggleEdit={() => setEditModeEnabled(!editModeEnabled)}
          onClose={() => {
            setShowCreateModal(false);
            resetInquiryForm();
          }}
          extraHeaderElements={(() => {
            let total = 0;
            inquiryRequests.forEach((req: any) => {
              const qty = parseInt(req.qty) || 0;
              const targetPrice = parseFloat(req.targetPrice) || 0;
              let factor = 12;
              const interval = req.interval || "Monatlich";
              const normalized = interval.toLowerCase().trim();
              if (normalized === "jährlich" || normalized === "jaehrlich" || normalized === "yearly") {
                factor = 1;
              } else if (normalized === "halbjährlich" || normalized === "halbjaehrlich" || normalized === "half-yearly" || normalized === "half yearly" || normalized === "biannually") {
                factor = 2;
              } else if (normalized === "quartal" || normalized === "quarterly") {
                factor = 4;
              } else if (normalized === "2 monatlich" || normalized === "bimonthly") {
                factor = 6;
              } else if (normalized === "monatlich" || normalized === "monthly") {
                factor = 12;
              }
              const annual = qty * targetPrice * factor;
              total += (annual / 1000);
            });
            return (
              <span className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-2.5 py-1 rounded-full font-bold">
                Potential: {total.toFixed(2)} k €
              </span>
            );
          })()}
        />
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="space-y-6">
            <div
              className={`rounded-xl p-4 -mx-4 transition-colors duration-300 ${inquiryFormData.isAssembly
                ? "bg-red-50 border border-red-200/70"
                : "bg-transparent"
                }`}
            >
              <div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Customer *
                    </label>
                    <CustomerSearchInput
                      value={inquiryFormData.customerId}
                      onChange={(id) =>
                        setInquiryFormData({
                          ...inquiryFormData,
                          customerId: id,
                          contactPersonId: "",
                        })
                      }
                      disabled={
                        inquiryModalMode === "edit" && !editModeEnabled
                      }
                      placeholder="Select Customer..."
                      mode="customers"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Contact Person
                    </label>
                    <select
                      value={inquiryFormData.contactPersonId}
                      onChange={(e) =>
                        setInquiryFormData({
                          ...inquiryFormData,
                          contactPersonId: e.target.value,
                        })
                      }
                      disabled={
                        inquiryModalMode === "edit" && !editModeEnabled
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Contact Person</option>
                      {contactPersons
                        .filter(
                          (person) =>
                            person.businessId ===
                            inquiryFormData.customerId,
                        )
                        .map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name} {person.familyName}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Inquiry Name *
                    </label>
                    <input
                      type="text"
                      value={inquiryFormData.name}
                      onChange={(e) =>
                        setInquiryFormData({
                          ...inquiryFormData,
                          name: e.target.value,
                        })
                      }
                      disabled={
                        inquiryModalMode === "edit" && !editModeEnabled
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
                      placeholder="PT0171 - Untere Schiebemuffe"
                    />
                  </div>
                  {inquiryFormData.inquiryNo && (
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Inquiry Number
                      </label>
                      <input
                        type="text"
                        value={inquiryFormData.inquiryNo}
                        disabled
                        className="w-full px-3 py-2 text-sm border border-gray-300 bg-gray-100 rounded-lg font-mono font-semibold text-gray-600 cursor-not-allowed"
                      />
                    </div>
                  )}
                  <div className={inquiryFormData.inquiryNo ? "col-span-1" : "col-span-2"}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={inquiryFormData.status}
                      onChange={(e) =>
                        setInquiryFormData({
                          ...inquiryFormData,
                          status: e.target.value as any,
                        })
                      }
                      disabled={
                        inquiryModalMode === "edit" && !editModeEnabled
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {getInquiryStatuses().map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={inquiryFormData.description}
                      onChange={(e) =>
                        setInquiryFormData({
                          ...inquiryFormData,
                          description: e.target.value,
                        })
                      }
                      disabled={
                        inquiryModalMode === "edit" && !editModeEnabled
                      }
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Enter inquiry description"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Tags
                    </label>
                    {inquiryModalMode === "create" ? (
                      <TagPickerInput
                        category="inquiry"
                        selectedTags={newInquiryTags}
                        onChange={setNewInquiryTags}
                      />
                    ) : (
                      <EntityTagSelector
                        entityId={editingInquiryId!}
                        entityType="inquiry"
                        initialTags={(inquiryFormData as any).tags || []}
                        tagOrder={(inquiryFormData as any).tagOrder}
                        onTagsUpdated={(updatedTags) =>
                          setInquiryFormData((prev: any) => ({
                            ...prev,
                            tags: updatedTags,
                            tagOrder: updatedTags.map((t) => t.id).join(","),
                          }))
                        }
                        disabled={!editModeEnabled}
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Owner
                    </label>
                    <select
                      value={inquiryFormData.owner_user_id || ""}
                      onChange={(e) =>
                        setInquiryFormData({
                          ...inquiryFormData,
                          owner_user_id: e.target.value,
                        })
                      }
                      disabled={
                        inquiryModalMode === "edit" && !editModeEnabled
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Owner</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Next Action
                    </label>
                    <input
                      type="text"
                      value={inquiryFormData.next_action || ""}
                      onChange={(e) =>
                        setInquiryFormData({
                          ...inquiryFormData,
                          next_action: e.target.value,
                        })
                      }
                      disabled={
                        inquiryModalMode === "edit" && !editModeEnabled
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="e.g. Call client"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={
                        inquiryFormData.next_followup_at
                          ? new Date(inquiryFormData.next_followup_at).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setInquiryFormData({
                          ...inquiryFormData,
                          next_followup_at: e.target.value || undefined,
                        })
                      }
                      disabled={
                        inquiryModalMode === "edit" && !editModeEnabled
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="col-span-2">
                    <div
                      className={`flex items-center gap-2 p-2 border rounded-lg transition-colors duration-200 ${inquiryFormData.isAssembly ? "border-orange-300 bg-orange-100" : "border-gray-200 bg-gray-50"}`}
                    >
                      <input
                        type="checkbox"
                        id="isAssembly"
                        checked={inquiryFormData.isAssembly}
                        onChange={(e) =>
                          setInquiryFormData({
                            ...inquiryFormData,
                            isAssembly: e.target.checked,
                          })
                        }
                        disabled={
                          inquiryModalMode === "edit" && !editModeEnabled
                        }
                        className="h-4 w-4 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <label
                        htmlFor="isAssembly"
                        className="text-xs font-medium text-gray-700"
                      >
                        This is an assembly item
                      </label>
                    </div>
                  </div>
                  {false && inquiryFormData.isAssembly && (
                    <div className="col-span-2 bg-orange-100/50 border border-orange-200 rounded-xl p-4 mt-2 space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            ItemName*
                          </label>
                          <input
                            type="text"
                            value={inquiryFormData.name}
                            readOnly
                            className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            ItemNo*
                          </label>
                          <input
                            type="text"
                            value={inquiryFormData.itemNo || ""}
                            onChange={(e) =>
                              setInquiryFormData({
                                ...inquiryFormData,
                                itemNo: e.target.value,
                              })
                            }
                            disabled={
                              inquiryModalMode === "edit" &&
                              !editModeEnabled
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="Enter item number"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Prio
                          </label>
                          <select
                            value={inquiryFormData.priority}
                            onChange={(e) =>
                              setInquiryFormData({
                                ...inquiryFormData,
                                priority: e.target.value as any,
                              })
                            }
                            disabled={
                              inquiryModalMode === "edit" &&
                              !editModeEnabled
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            {getPriorityOptions().map((priority) => (
                              <option
                                key={priority.value}
                                value={priority.value}
                              >
                                {priority.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Qty
                          </label>
                          <input
                            type="number"
                            value={inquiryFormData.qty || 1}
                            onChange={(e) =>
                              setInquiryFormData({
                                ...inquiryFormData,
                                qty: parseInt(e.target.value) || 1,
                              })
                            }
                            disabled={
                              inquiryModalMode === "edit" &&
                              !editModeEnabled
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Interval
                          </label>
                          <select
                            value={inquiryFormData.interval || "Monatlich"}
                            onChange={(e) =>
                              setInquiryFormData({
                                ...inquiryFormData,
                                interval: e.target.value,
                              })
                            }
                            disabled={
                              inquiryModalMode === "edit" &&
                              !editModeEnabled
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            {getAvailableIntervals().map((interval) => (
                              <option
                                key={interval.value}
                                value={interval.value}
                              >
                                {interval.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Asana Link
                          </label>
                          <input
                            type="text"
                            value={inquiryFormData.asanaLink || ""}
                            onChange={(e) =>
                              setInquiryFormData({
                                ...inquiryFormData,
                                asanaLink: e.target.value,
                              })
                            }
                            disabled={
                              inquiryModalMode === "edit" &&
                              !editModeEnabled
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="Link to Asana"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Status
                          </label>
                          <select
                            value={inquiryFormData.requestStatus || "Draft"}
                            onChange={(e) =>
                              setInquiryFormData({
                                ...inquiryFormData,
                                requestStatus: e.target.value,
                              })
                            }
                            disabled={
                              inquiryModalMode === "edit" &&
                              !editModeEnabled
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            {getRequestStatuses().map((status) => (
                              <option
                                key={status.value}
                                value={status.value}
                              >
                                {status.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Purchase Price
                          </label>
                          <input
                            type="number"
                            value={inquiryFormData.purchasePrice || ""}
                            onChange={(e) =>
                              setInquiryFormData({
                                ...inquiryFormData,
                                purchasePrice:
                                  parseFloat(e.target.value) || undefined,
                              })
                            }
                            disabled={
                              inquiryModalMode === "edit" &&
                              !editModeEnabled
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Currency Purchase
                          </label>
                          <select
                            value={inquiryFormData.purchasePriceCurrency}
                            onChange={(e) =>
                              setInquiryFormData({
                                ...inquiryFormData,
                                purchasePriceCurrency: e.target
                                  .value as any,
                              })
                            }
                            disabled={
                              inquiryModalMode === "edit" &&
                              !editModeEnabled
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            {getAvailableCurrencies().map((currency) => (
                              <option
                                key={currency.value}
                                value={currency.value}
                              >
                                {currency.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            TARIC
                          </label>
                          <select
                            value={inquiryFormData.taric || ""}
                            onChange={(e) =>
                              setInquiryFormData({
                                ...inquiryFormData,
                                taric: e.target.value,
                              })
                            }
                            disabled={
                              inquiryModalMode === "edit" &&
                              !editModeEnabled
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">Select TARIC Code</option>
                            {tarics.map((taric) => (
                              <option key={taric.id} value={taric.code}>
                                {formatTaricDisplay(taric)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3 border-t border-orange-200/50 pt-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Weight (kg)
                          </label>
                          <input
                            type="number"
                            value={inquiryFormData.weight || ""}
                            onChange={(e) =>
                              setInquiryFormData({
                                ...inquiryFormData,
                                weight:
                                  parseFloat(e.target.value) || undefined,
                              })
                            }
                            disabled={
                              inquiryModalMode === "edit" &&
                              !editModeEnabled
                            }
                            className="w-full px-2 py-1.5 text-sm border border-gray-300/80 bg-white rounded-lg transition-all"
                            step="0.001"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Length (cm)
                          </label>
                          <input
                            type="number"
                            value={inquiryFormData.length || ""}
                            onChange={(e) =>
                              setInquiryFormData({
                                ...inquiryFormData,
                                length:
                                  parseFloat(e.target.value) || undefined,
                              })
                            }
                            disabled={
                              inquiryModalMode === "edit" &&
                              !editModeEnabled
                            }
                            className="w-full px-2 py-1.5 text-sm border border-gray-300/80 bg-white rounded-lg transition-all"
                            step="0.1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Width (cm)
                          </label>
                          <input
                            type="number"
                            value={inquiryFormData.width || ""}
                            onChange={(e) =>
                              setInquiryFormData({
                                ...inquiryFormData,
                                width:
                                  parseFloat(e.target.value) || undefined,
                              })
                            }
                            disabled={
                              inquiryModalMode === "edit" &&
                              !editModeEnabled
                            }
                            className="w-full px-2 py-1.5 text-sm border border-gray-300/80 bg-white rounded-lg transition-all"
                            step="0.1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Height (cm)
                          </label>
                          <input
                            type="number"
                            value={inquiryFormData.height || ""}
                            onChange={(e) =>
                              setInquiryFormData({
                                ...inquiryFormData,
                                height:
                                  parseFloat(e.target.value) || undefined,
                              })
                            }
                            disabled={
                              inquiryModalMode === "edit" &&
                              !editModeEnabled
                            }
                            className="w-full px-2 py-1.5 text-sm border border-gray-300/80 bg-white rounded-lg transition-all"
                            step="0.1"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 border-t border-orange-200/50 pt-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Urgency (text field)
                          </label>
                          <textarea
                            value={inquiryFormData.urgency1 || ""}
                            onChange={(e) =>
                              setInquiryFormData({
                                ...inquiryFormData,
                                urgency1: e.target.value,
                              })
                            }
                            disabled={
                              inquiryModalMode === "edit" &&
                              !editModeEnabled
                            }
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white rounded-lg transition-all"
                            placeholder="Enter urgency details..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Urgency (text field)
                          </label>
                          <textarea
                            value={inquiryFormData.urgency2 || ""}
                            onChange={(e) =>
                              setInquiryFormData({
                                ...inquiryFormData,
                                urgency2: e.target.value,
                              })
                            }
                            disabled={
                              inquiryModalMode === "edit" &&
                              !editModeEnabled
                            }
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white rounded-lg transition-all"
                            placeholder="Enter quality criteria / urgency..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Pain Points (tags)
                          </label>
                          <div className="min-h-[80px] p-2 border border-gray-300/80 bg-white rounded-lg focus-within:ring-2 focus-within:ring-orange-500/50 transition-all">
                            <div className="flex flex-wrap gap-1 mb-2">
                              {inquiryFormData.painPoints?.map((tag, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-800 border border-orange-200"
                                >
                                  {tag}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInquiryFormData({
                                        ...inquiryFormData,
                                        painPoints:
                                          inquiryFormData.painPoints?.filter(
                                            (_, idx) => idx !== i,
                                          ),
                                      })
                                    }
                                    disabled={
                                      inquiryModalMode === "edit" &&
                                      !editModeEnabled
                                    }
                                    className="ml-1 text-orange-400 hover:text-orange-600 focus:outline-none"
                                  >
                                    <XMarkIcon className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={inquiryTagInput}
                                onChange={(e) =>
                                  setInquiryTagInput(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === ",") {
                                    e.preventDefault();
                                    handleAddInquiryPainPoint();
                                  }
                                }}
                                disabled={
                                  inquiryModalMode === "edit" &&
                                  !editModeEnabled
                                }
                                placeholder="Type tag..."
                                className="flex-1 text-sm bg-transparent outline-none border-none p-0 focus:ring-0"
                              />
                              <button
                                type="button"
                                onClick={handleAddInquiryPainPoint}
                                disabled={
                                  (inquiryModalMode === "edit" &&
                                    !editModeEnabled) ||
                                  !inquiryTagInput.trim()
                                }
                                className="p-1 text-orange-500 hover:text-orange-700 transition-colors disabled:text-gray-300"
                              >
                                <PlusIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="pt-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Assembly Instructions
                        </label>
                        <textarea
                          value={inquiryFormData.assemblyInstructions}
                          onChange={(e) =>
                            setInquiryFormData({
                              ...inquiryFormData,
                              assemblyInstructions: e.target.value,
                            })
                          }
                          disabled={
                            inquiryModalMode === "edit" && !editModeEnabled
                          }
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white rounded-lg transition-all"
                          placeholder="Enter assembly instructions..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div
              className={`rounded-xl p-4 -mx-4 transition-colors duration-300 ${inquiryFormData.isAssembly
                ? "bg-green-50 border border-green-200/70 mt-2"
                : "bg-transparent"
                }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <span>Request Items *</span>
                    <span className="text-xs font-normal text-gray-500">
                      (At least one request item is required)
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick={addNewRequest}
                    disabled={
                      inquiryModalMode === "edit" && !editModeEnabled
                    }
                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PlusIcon className="h-3 w-3" />
                    Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {inquiryRequests.map((request: any, index: any) => (
                    <div
                      key={index}
                      className={`border rounded-lg overflow-hidden transition-colors duration-300 ${inquiryFormData.isAssembly ? "border-green-200" : "border-gray-200"}`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleRequestExpansion(index)}
                        className={`w-full px-3 py-2 flex items-center justify-between text-left transition-colors ${expandedRequestIndex === index
                          ? inquiryFormData.isAssembly
                            ? "bg-green-100"
                            : "bg-gray-100"
                          : inquiryFormData.isAssembly
                            ? "bg-green-50 hover:bg-green-100"
                            : "bg-gray-50 hover:bg-gray-100"
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          {expandedRequestIndex === index ? (
                            <ChevronUpIcon className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            Request #{index + 1}:{" "}
                            {request.itemName || "New Request"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemInfoClick(request, index);
                            }}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-all font-semibold"
                          >
                            Item Info
                          </button>
                          {inquiryRequests.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRequest(index);
                              }}
                              disabled={
                                inquiryModalMode === "edit" &&
                                !editModeEnabled
                              }
                              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </button>
                      {expandedRequestIndex === index && (
                        <div
                          className={`p-4 transition-colors duration-300 ${inquiryFormData.isAssembly ? "bg-green-50/60" : "bg-white"}`}
                        >
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Request Name*
                                </label>
                                <input
                                  type="text"
                                  value={request.itemName}
                                  onChange={(e) =>
                                    updateRequest(
                                      index,
                                      "itemName",
                                      e.target.value,
                                    )
                                  }
                                  disabled={
                                    inquiryModalMode === "edit" &&
                                    !editModeEnabled
                                  }
                                  className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                  placeholder="Enter request name"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  ItemNo*
                                </label>
                                <input
                                  type="text"
                                  value={request.itemNo || ""}
                                  onChange={(e) =>
                                    updateRequest(
                                      index,
                                      "itemNo",
                                      e.target.value,
                                    )
                                  }
                                  disabled={
                                    inquiryModalMode === "edit" &&
                                    !editModeEnabled
                                  }
                                  className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                  placeholder="Enter item number"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Prio
                                </label>
                                <select
                                  value={request.priority || "Normal"}
                                  onChange={(e) =>
                                    updateRequest(
                                      index,
                                      "priority",
                                      e.target.value,
                                    )
                                  }
                                  disabled={
                                    inquiryModalMode === "edit" &&
                                    !editModeEnabled
                                  }
                                  className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                  {getAvailableRequestPriorities()?.map(
                                    (p: any) => (
                                      <option key={p.value} value={p.value}>
                                        {p.label}
                                      </option>
                                    ),
                                  )}
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Qty
                                </label>
                                <input
                                  type="number"
                                  value={request.qty}
                                  onChange={(e) =>
                                    updateRequest(
                                      index,
                                      "qty",
                                      e.target.value,
                                    )
                                  }
                                  disabled={
                                    inquiryModalMode === "edit" &&
                                    !editModeEnabled
                                  }
                                  className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                  min="1"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Interval
                                </label>
                                <select
                                  value={request.interval || "Monatlich"}
                                  onChange={(e) =>
                                    updateRequest(
                                      index,
                                      "interval",
                                      e.target.value,
                                    )
                                  }
                                  disabled={
                                    inquiryModalMode === "edit" &&
                                    !editModeEnabled
                                  }
                                  className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                  {getAvailableIntervals().map(
                                    (interval) => (
                                      <option
                                        key={interval.value}
                                        value={interval.value}
                                      >
                                        {interval.label}
                                      </option>
                                    ),
                                  )}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Asana Link
                                </label>
                                <input
                                  type="text"
                                  value={request.asanaLink || ""}
                                  onChange={(e) =>
                                    updateRequest(
                                      index,
                                      "asanaLink",
                                      e.target.value,
                                    )
                                  }
                                  disabled={
                                    inquiryModalMode === "edit" &&
                                    !editModeEnabled
                                  }
                                  className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                  placeholder="Link to Asana"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Status
                                </label>
                                <select
                                  value={request.status || "Draft"}
                                  onChange={(e) =>
                                    updateRequest(
                                      index,
                                      "status",
                                      e.target.value,
                                    )
                                  }
                                  disabled={
                                    inquiryModalMode === "edit" &&
                                    !editModeEnabled
                                  }
                                  className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                  {getRequestStatuses().map((status) => (
                                    <option
                                      key={status.value}
                                      value={status.value}
                                    >
                                      {status.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Target Price (EUR)
                                </label>
                                <input
                                  type="number"
                                  value={request.targetPrice || ""}
                                  onChange={(e) =>
                                    updateRequest(
                                      index,
                                      "targetPrice",
                                      e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  disabled={
                                    inquiryModalMode === "edit" &&
                                    !editModeEnabled
                                  }
                                  className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                            <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100/60 flex items-center justify-between text-xs text-blue-800">
                              <div>
                                <strong>Value Potential:</strong>
                              </div>
                              <div className="flex gap-4">
                                <span>
                                  Annual Potential:{" "}
                                  <strong className="text-sm font-semibold">
                                    {(() => {
                                      const qty = parseInt(request.qty) || 0;
                                      const targetPrice = parseFloat(request.targetPrice) || 0;
                                      let factor = 12;
                                      const interval = request.interval || "Monatlich";
                                      const normalized = interval.toLowerCase().trim();
                                      if (normalized === "jährlich" || normalized === "jaehrlich" || normalized === "yearly") {
                                        factor = 1;
                                      } else if (normalized === "halbjährlich" || normalized === "halbjaehrlich" || normalized === "half-yearly" || normalized === "half yearly" || normalized === "biannually") {
                                        factor = 2;
                                      } else if (normalized === "quartal" || normalized === "quarterly") {
                                        factor = 4;
                                      } else if (normalized === "2 monatlich" || normalized === "bimonthly") {
                                        factor = 6;
                                      } else if (normalized === "monatlich" || normalized === "monthly") {
                                        factor = 12;
                                      }
                                      const annual = qty * targetPrice * factor;
                                      return `${annual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
                                    })()}
                                  </strong>
                                </span>
                                <span>
                                  Annual Potential (k €):{" "}
                                  <strong className="text-sm font-semibold">
                                    {(() => {
                                      const qty = parseInt(request.qty) || 0;
                                      const targetPrice = parseFloat(request.targetPrice) || 0;
                                      let factor = 12;
                                      const interval = request.interval || "Monatlich";
                                      const normalized = interval.toLowerCase().trim();
                                      if (normalized === "jährlich" || normalized === "jaehrlich" || normalized === "yearly") {
                                        factor = 1;
                                      } else if (normalized === "halbjährlich" || normalized === "halbjaehrlich" || normalized === "half-yearly" || normalized === "half yearly" || normalized === "biannually") {
                                        factor = 2;
                                      } else if (normalized === "quartal" || normalized === "quarterly") {
                                        factor = 4;
                                      } else if (normalized === "2 monatlich" || normalized === "bimonthly") {
                                        factor = 6;
                                      } else if (normalized === "monatlich" || normalized === "monthly") {
                                        factor = 12;
                                      }
                                      const annual = qty * targetPrice * factor;
                                      return `${(annual / 1000).toFixed(2)} k €`;
                                    })()}
                                  </strong>
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 border-t border-gray-200/50 pt-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Urgency (text field)
                                </label>
                                <textarea
                                  value={request.urgency1 || ""}
                                  onChange={(e) =>
                                    updateRequest(
                                      index,
                                      "urgency1",
                                      e.target.value,
                                    )
                                  }
                                  disabled={
                                    inquiryModalMode === "edit" &&
                                    !editModeEnabled
                                  }
                                  rows={3}
                                  className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white rounded-lg transition-all"
                                  placeholder="Enter urgency details..."
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Urgency (text field)
                                </label>
                                <textarea
                                  value={request.urgency2 || ""}
                                  onChange={(e) =>
                                    updateRequest(
                                      index,
                                      "urgency2",
                                      e.target.value,
                                    )
                                  }
                                  disabled={
                                    inquiryModalMode === "edit" &&
                                    !editModeEnabled
                                  }
                                  rows={3}
                                  className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white rounded-lg transition-all"
                                  placeholder="Enter quality criteria / urgency..."
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Pain Points (tags)
                                </label>
                                <div className="min-h-[80px] p-2 border border-gray-300/80 bg-white rounded-lg focus-within:ring-2 focus-within:ring-gray-500/50 transition-all">
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {request.painPoints?.map(
                                      (tag: any, i: any) => (
                                        <span
                                          key={i}
                                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200"
                                        >
                                          {tag}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              updateRequest(
                                                index,
                                                "painPoints",
                                                request.painPoints?.filter(
                                                  (_: any, idx: any) =>
                                                    idx !== i,
                                                ),
                                              )
                                            }
                                            disabled={
                                              inquiryModalMode === "edit" &&
                                              !editModeEnabled
                                            }
                                            className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                                          >
                                            <XMarkIcon className="h-3 w-3" />
                                          </button>
                                        </span>
                                      ),
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="text"
                                      value={
                                        requestLoopTagInputs[index] || ""
                                      }
                                      onChange={(e) =>
                                        setRequestLoopTagInputs({
                                          ...requestLoopTagInputs,
                                          [index]: e.target.value,
                                        })
                                      }
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === "Enter" ||
                                          e.key === ","
                                        ) {
                                          e.preventDefault();
                                          handleAddRequestLoopPainPoint(
                                            index,
                                          );
                                        }
                                      }}
                                      disabled={
                                        inquiryModalMode === "edit" &&
                                        !editModeEnabled
                                      }
                                      placeholder="Type tag..."
                                      className="flex-1 text-sm bg-transparent outline-none border-none p-0 focus:ring-0"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleAddRequestLoopPainPoint(index)
                                      }
                                      disabled={
                                        (inquiryModalMode === "edit" &&
                                          !editModeEnabled) ||
                                        !(
                                          requestLoopTagInputs[index] || ""
                                        ).trim()
                                      }
                                      className="p-1 text-blue-500 hover:text-blue-700 transition-colors disabled:text-gray-300"
                                    >
                                      <PlusIcon className="h-5 w-5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 border-t border-gray-200/50 pt-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Description
                                </label>
                                <textarea
                                  value={request.description}
                                  onChange={(e) =>
                                    updateRequest(
                                      index,
                                      "description",
                                      e.target.value,
                                    )
                                  }
                                  disabled={
                                    inquiryModalMode === "edit" &&
                                    !editModeEnabled
                                  }
                                  rows={2}
                                  className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white rounded-lg transition-all"
                                  placeholder="Enter item description"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Specifications
                                </label>
                                <textarea
                                  value={request.specification}
                                  onChange={(e) =>
                                    updateRequest(
                                      index,
                                      "specification",
                                      e.target.value,
                                    )
                                  }
                                  disabled={
                                    inquiryModalMode === "edit" &&
                                    !editModeEnabled
                                  }
                                  rows={2}
                                  className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white rounded-lg transition-all"
                                  placeholder="Enter specifications"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <ModalFooter
          isEditMode={inquiryModalMode === "edit"}
          isEditEnabled={editModeEnabled}
          onDelete={async () => {
            if (editingInquiryId) {
              await handleDeleteInquiry(editingInquiryId);
              setShowCreateModal(false);
            }
          }}
          onCancel={() => {
            setShowCreateModal(false);
            resetInquiryForm();
          }}
          onSave={handleInquirySubmit}
          saveLabel={inquiryModalMode === "edit" ? "Update Inquiry" : "Create Inquiry"}
          loading={inquiryLoading}
          saveDisabled={
            !inquiryFormData.name ||
            !inquiryFormData.customerId ||
            !inquiryRequests.some((req) => req.itemName && req.qty >= 1) ||
            inquiryLoading
          }
          showDelete={user?.role === UserRole.ADMIN}
        />
      </CustomModal>
      <CustomModal
        isOpen={showConversionModal}
        onClose={() => {
          setShowConversionModal(false);
          resetConversionForm();
        }}
        title={
          conversionType === "inquiry"
            ? "Convert Inquiry to Item"
            : "Convert Request to Item"
        }
        width="max-w-2xl"
      >
        <p className="text-sm text-gray-600 mb-6">
          Fill in the required fields to create a new item
        </p>
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">
            Source Information
          </h3>
          {conversionType === "inquiry" && conversionInquiryData && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">
                  {conversionInquiryData.name}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Customer:</span>
                <span className="ml-2 font-medium">
                  {conversionInquiryData.customer?.companyName}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Type:</span>
                <span className="ml-2 font-medium">
                  {conversionInquiryData.isAssembly
                    ? "Assembly"
                    : "Single Item"}
                </span>
              </div>
              {(conversionInquiryData.weight ||
                conversionInquiryData.width ||
                conversionInquiryData.height ||
                conversionInquiryData.length) && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Dimensions:</span>
                    <span className="ml-2">
                      {conversionInquiryData.weight &&
                        `${conversionInquiryData.weight}kg `}
                      {conversionInquiryData.length &&
                        `${conversionInquiryData.length}×`}
                      {conversionInquiryData.width &&
                        `${conversionInquiryData.width}×`}
                      {conversionInquiryData.height &&
                        `${conversionInquiryData.height}`}
                      cm
                    </span>
                  </div>
                )}
            </div>
          )}
          {conversionType === "request" && conversionRequestData && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Item Name:</span>
                <span className="ml-2 font-medium">
                  {conversionRequestData.itemName}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Business:</span>
                <span className="ml-2 font-medium">
                  {(conversionRequestData as any).business?.customer
                    ?.companyName ||
                    (conversionRequestData as any).business
                      ?.companyName ||
                    "N/A"}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Material:</span>
                <span className="ml-2">
                  {conversionRequestData.material || "-"}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Quantity:</span>
                <span className="ml-2 font-medium">
                  {conversionRequestData.qty}
                </span>
              </div>
              {(conversionRequestData.weight ||
                conversionRequestData.width ||
                conversionRequestData.height ||
                conversionRequestData.length) && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Dimensions:</span>
                    <span className="ml-2">
                      {conversionRequestData.weight &&
                        `${conversionRequestData.weight}kg `}
                      {conversionRequestData.length &&
                        `${conversionRequestData.length}×`}
                      {conversionRequestData.width &&
                        `${conversionRequestData.width}×`}
                      {conversionRequestData.height &&
                        `${conversionRequestData.height}`}
                      cm
                    </span>
                  </div>
                )}
            </div>
          )}
        </div>
        {renderDimensionStatus()}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Item Details</h3>
          <div className="grid grid-cols-2 gap-3">
            {getConversionFormFieldsWithOptions().map((field) => (
              <div
                key={field.name}
                className={field.type === "textarea" ? "col-span-2" : ""}
              >
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {field.label}
                  {field.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                  {!field.required && (
                    <span className="text-gray-500 ml-1"></span>
                  )}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    value={conversionFormData[field.name] || ""}
                    onChange={(e) =>
                      setConversionFormData({
                        ...conversionFormData,
                        [field.name]: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                    placeholder={field.placeholder}
                    rows={3}
                  />
                ) : field.type === "select" ? (
                  <select
                    value={conversionFormData[field.name] || ""}
                    onChange={(e) =>
                      setConversionFormData({
                        ...conversionFormData,
                        [field.name]: e.target.value
                          ? parseInt(e.target.value)
                          : "",
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                  >
                    <option value="">Select {field.label}</option>
                    {field.options?.map((option: any) => (
                      <option
                        className=""
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "tags" ? (
                  <div className="min-h-[80px] p-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus-within:ring-2 focus-within:ring-gray-500/50 transition-all">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {conversionFormData[field.name]?.map(
                        (tag: string, i: number) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() =>
                                setConversionFormData({
                                  ...conversionFormData,
                                  [field.name]: conversionFormData[
                                    field.name
                                  ].filter(
                                    (_: any, idx: number) => idx !== i,
                                  ),
                                })
                              }
                              className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </span>
                        ),
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={conversionTagInput}
                        onChange={(e) =>
                          setConversionTagInput(e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            handleAddConversionPainPoint();
                          }
                        }}
                        placeholder="Type tag..."
                        className="flex-1 text-sm bg-transparent outline-none border-none p-0 focus:ring-0"
                      />
                      <button
                        type="button"
                        onClick={handleAddConversionPainPoint}
                        disabled={!conversionTagInput.trim()}
                        className="p-1 text-blue-500 hover:text-blue-700 transition-colors disabled:text-gray-300"
                      >
                        <PlusIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <input
                    type={field.type}
                    value={conversionFormData[field.name] || ""}
                    onChange={(e) =>
                      setConversionFormData({
                        ...conversionFormData,
                        [field.name]:
                          field.type === "number"
                            ? e.target.value === ""
                              ? ""
                              : parseFloat(e.target.value)
                            : e.target.value,
                      })
                    }
                    className={`w-full px-3 py-2 text-sm border ${field.required && !conversionFormData[field.name]
                      ? "border-red-300"
                      : "border-gray-300/80"
                      } bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all`}
                    placeholder={field.placeholder}
                    min={field.min}
                    step={field.step}
                    required={field.required}
                  />
                )}
                {field.description && (
                  <p
                    className={`text-xs mt-1 ${field.required ? "text-red-600" : "text-gray-500"
                      }`}
                  >
                    {field.description}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Note:</p>
                <ul className="mt-1 space-y-1 list-disc list-inside">
                  <li>
                    TARIC code and EAN will be automatically generated if
                    not provided
                  </li>
                  <li>Parent and category fields will be left null</li>
                  <li>
                    For assembly inquiries, name, quantity, and image will
                    be used directly from the inquiry
                  </li>
                  <li>
                    Missing fields will be filled from the form above
                  </li>
                  <li>
                    Dimension fields that exist in the source are
                    pre-filled and optional
                  </li>
                  <li>
                    Dimension fields missing in the source are required
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => {
                setShowConversionModal(false);
                resetConversionForm();
              }}
              className="px-4 py-2 text-sm text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all"
            >
              Cancel
            </button>
            <CustomButton
              gradient={true}
              onClick={
                conversionType === "inquiry"
                  ? handleConvertInquiryToItem
                  : handleConvertRequestToItem
              }
              className="px-4 py-2 text-sm bg-green-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-green-700/90 transition-all flex items-center gap-2"
            >
              <ArrowRightIcon className="h-4 w-4" />
              Convert to Item
            </CustomButton>
          </div>
        </div>
      </CustomModal>
      <ItemPreviewModal
        isOpen={showRequestDetailModal}
        onClose={() => setShowRequestDetailModal(false)}
        itemId={selectedRequestForDetail?.id}
        isRequest={true}
        onSaved={() => {
          refreshInquiryRequests();
          fetchInquiries();
        }}
        onDeleted={() => {
          setShowRequestDetailModal(false);
          refreshInquiryRequests();
          fetchInquiries();
        }}
        onConvert={(itemData) => {
          handleConvertRequestClick(
            itemData,
            selectedRequestInquiryId
          );
        }}
      />
    </div>
  );
};
const CombinedInquiriesPage = () => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      }
    >
      <CombinedInquiriesPageContent />
    </Suspense>
  );
};
export default CombinedInquiriesPage;
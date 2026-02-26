"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import {
  getAllInquiries,
  createInquiry,
  updateInquiry,
  deleteInquiry,
  updateInquiryStatus,
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
} from "@/api/inquiry";
import {
  getAvailableIntervals,
  getAvailablePriorities as getAvailableRequestPriorities,
  getAvailableStatuses as getAvailableRequestStatuses,
  updateRequestedItem,
} from "@/api/requested_items";
import { getAllCustomers } from "@/api/customers";
import { getAllContactPersons } from "@/api/contacts";
import CustomButton from "@/components/UI/CustomButton";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import { MessagesSquare, ClipboardList } from "lucide-react";
import PageHeader from "@/components/UI/PageHeader";
import { UserRole } from "@/utils/interfaces";
import { getAllTarics } from "@/api/items";

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
  starBusinessDetails?: {
    id: string;
    companyName: string;
  };
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

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
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

  const [expandedRequestIndex, setExpandedRequestIndex] = useState<
    number | null
  >(0);

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
    status: "Draft",
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
    itemNo: "",
    urgency1: "",
    urgency2: "",
    painPoints: [],
    requests: [],
  });


  const [inquiryTagInput, setInquiryTagInput] = useState("");
  const [requestLoopTagInputs, setRequestLoopTagInputs] = useState<Record<number, string>>({});

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

  const [inquiryRequests, setInquiryRequests] = useState<
    Array<{
      itemName: string;
      description: string;
      qty: number;
      purchasePrice: number;
      currency: string;
      status: string;
      material: string;
      specification: string;
      images?: string[];
      weight?: number;
      width?: number;
      height?: number;
      length?: number;
      qualityCriteria?: QualityCriterion[];
      attachments?: File[];
      taric?: string;
      asanaLink?: string;
      itemNo?: string;
      urgency1?: string;
      urgency2?: string;
      painPoints?: string[];
      priceRMB?: number;
    }>
  >([
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
  });


  const itemsPerPage = 20;

  useEffect(() => {
    fetchCustomers();
    fetchContactPersons();
    fetchTarics();
  }, []);

  const fetchTarics = async () => {
    try {
      const response = await getAllTarics();
      setTarics(response.data || []);
    } catch (error) {
      console.error("Error fetching tarics:", error);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, [
    inquiryFilters,
    selectedCustomerId,
  ]);

  const searchParams = useSearchParams();

  useEffect(() => {
    const inquiryId = searchParams.get("inquiryId");

    if (inquiryId && allInquiries.length > 0) {
      const inquiry = allInquiries.find((i) => i.id === inquiryId);
      if (inquiry) {
        handleInquiryClick(inquiry);
      }
    }
  }, [searchParams, allInquiries]);

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
        new Set(inquiries.filter((i) => i.requests?.length > 0).map((i) => i.id))
      );
      setAllRequestsExpanded(true);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await getAllCustomers();
      if (response?.data) {
        setCustomers(
          Array.isArray(response.data)
            ? response.data
            : response.data.customers || [],
        );
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
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
        const inquiryData = Array.isArray(response.data)
          ? response.data
          : response.data.data || response.data.inquiries || [];
        setAllInquiries(inquiryData);

        const totalFiltered = inquiryData.length;
        const totalPagesCalc = Math.ceil(totalFiltered / itemsPerPage);
        setInquiryTotalPages(totalPagesCalc);
        setInquiryTotalRecords(totalFiltered);

        const startIndex = (inquiryCurrentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = inquiryData.slice(startIndex, endIndex);
        setInquiries(paginatedItems);

        const withRequests = inquiryData.filter((i: any) => i.requests?.length > 0);
        setExpandedInquiryIds(new Set(withRequests.map((i: any) => i.id)));
        setAllRequestsExpanded(true);
      }
    } catch (error) {
      console.error("Error fetching inquiries:", error);
    } finally {
      setInquiryLoading(false);
    }
  }, [inquiryFilters, inquiryCurrentPage, itemsPerPage, selectedCustomerId]);

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
      urgency1: inquiry.urgency1 || "",
      urgency2: inquiry.urgency2 || "",
      painPoints: inquiry.painPoints || [],
      requests: inquiry.requests || [],
    });
    setInquiryImagePreview(inquiry.image || "");

    if (inquiry.requests && inquiry.requests.length > 0) {
      setInquiryRequests(
        inquiry.requests.map((req: any) => ({
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
        })),
      );
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
        await createInquiry(inquiryPayload as CreateInquiryPayload);
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

  const updateRequestQualityCriterion = (
    requestIndex: number,
    criterionIndex: number,
    field: string,
    value: any,
  ) => {
    const updatedRequests = [...inquiryRequests];
    if (updatedRequests[requestIndex].qualityCriteria) {
      updatedRequests[requestIndex].qualityCriteria![criterionIndex] = {
        ...updatedRequests[requestIndex].qualityCriteria![criterionIndex],
        [field]: value,
      };
      setInquiryRequests(updatedRequests);
    }
  };

  const removeRequestQualityCriterion = (
    requestIndex: number,
    criterionIndex: number,
  ) => {
    const updatedRequests = [...inquiryRequests];
    if (updatedRequests[requestIndex].qualityCriteria) {
      updatedRequests[requestIndex].qualityCriteria = updatedRequests[
        requestIndex
      ].qualityCriteria!.filter((_, i) => i !== criterionIndex);
      setInquiryRequests(updatedRequests);
    }
  };

  const handleRequestAttachmentUpload = (
    requestIndex: number,
    files: FileList,
  ) => {
    const updatedRequests = [...inquiryRequests];
    const newAttachments = Array.from(files);
    if (!updatedRequests[requestIndex].attachments) {
      updatedRequests[requestIndex].attachments = [];
    }
    updatedRequests[requestIndex].attachments = [
      ...updatedRequests[requestIndex].attachments!,
      ...newAttachments,
    ];
    setInquiryRequests(updatedRequests);
  };

  const removeRequestAttachment = (requestIndex: number, fileIndex: number) => {
    const updatedRequests = [...inquiryRequests];
    if (updatedRequests[requestIndex].attachments) {
      updatedRequests[requestIndex].attachments = updatedRequests[
        requestIndex
      ].attachments!.filter((_, i) => i !== fileIndex);
      setInquiryRequests(updatedRequests);
    }
  };

  const resetInquiryForm = () => {
    setInquiryFormData({
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
      itemNo: "",
      urgency1: "",
      urgency2: "",
      painPoints: [],
      requests: [],
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
      },
    ]);
    setInquiryImageFile(null);
    setInquiryImagePreview("");
    setEditModeEnabled(false);
    setEditingInquiryId(null);
    setInquiryModalMode("create");
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
    const statusObj = getInquiryStatuses().find((s) => s.value === status);
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

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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

  const renderAssemblyRequestView = (request: any, index: number) => {
    return (
      <div className="border border-gray-200 rounded-lg p-4 mb-3 bg-gray-50">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Quantity *
            </label>
            <input
              type="number"
              value={request.quantity}
              onChange={(e) =>
                updateRequest(index, "quantity", parseInt(e.target.value) || 1)
              }
              disabled={inquiryModalMode === "edit" && !editModeEnabled}
              className="w-full px-2 py-1 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              min="1"
            />
          </div>

          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Interval
            </label>
            <select
              value={request.interval || "Monatlich"}
              onChange={(e) => updateRequest(index, "interval", e.target.value)}
              disabled={inquiryModalMode === "edit" && !editModeEnabled}
              className="w-full px-2 py-1 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {getAvailableIntervals().map((interval) => (
                <option key={interval.value} value={interval.value}>
                  {interval.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Price (RMB) *
            </label>
            <input
              type="number"
              value={request.priceRMB || request.purchasePrice || 0}
              onChange={(e) =>
                updateRequest(
                  index,
                  "priceRMB",
                  parseFloat(e.target.value) || 0,
                )
              }
              disabled={inquiryModalMode === "edit" && !editModeEnabled}
              className="w-full px-2 py-1 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              min="0"
              step="0.01"
            />
          </div>

          <div className="col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              TARIC Code
            </label>
            <select
              value={request.taric || ""}
              onChange={(e) => updateRequest(index, "taric", e.target.value)}
              disabled={inquiryModalMode === "edit" && !editModeEnabled}
              className="w-full px-2 py-1 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select TARIC Code</option>
              {tarics.map((taric) => (
                <option key={taric.id} value={taric.code}>
                  {formatTaricDisplay(taric)}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-700">
                Quality Criteria
              </label>
              <button
                type="button"
                onClick={() => addRequestQualityCriterion(index)}
                disabled={inquiryModalMode === "edit" && !editModeEnabled}
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-all flex items-center gap-1 disabled:opacity-50"
              >
                <PlusIcon className="h-3 w-3" />
                Add Criterion
              </button>
            </div>

            {request.qualityCriteria?.map(
              (criterion: QualityCriterion, criterionIndex: number) => (
                <div
                  key={criterionIndex}
                  className="mb-3 p-3 border border-gray-200 rounded bg-white"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="text-xs font-medium text-gray-700">
                      Criterion #{criterionIndex + 1}
                    </h5>
                    <button
                      type="button"
                      onClick={() =>
                        removeRequestQualityCriterion(index, criterionIndex)
                      }
                      disabled={inquiryModalMode === "edit" && !editModeEnabled}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={criterion.description}
                      onChange={(e) =>
                        updateRequestQualityCriterion(
                          index,
                          criterionIndex,
                          "description",
                          e.target.value,
                        )
                      }
                      disabled={inquiryModalMode === "edit" && !editModeEnabled}
                      rows={2}
                      className="w-full px-2 py-1 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Enter quality description"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Picture
                    </label>
                    {criterion.pictureUrl ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={criterion.pictureUrl}
                          alt="Quality criterion"
                          className="h-16 w-16 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateRequestQualityCriterion(
                              index,
                              criterionIndex,
                              "picture",
                              undefined,
                            )
                          }
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-all">
                          <PhotoIcon className="h-4 w-4 inline mr-1" />
                          Upload Picture
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                updateRequestQualityCriterion(
                                  index,
                                  criterionIndex,
                                  "picture",
                                  e.target.files[0],
                                );
                              }
                            }}
                            disabled={
                              inquiryModalMode === "edit" && !editModeEnabled
                            }
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>

          <div className="col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-700">
                Attachments
              </label>
              <label className="cursor-pointer px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-all">
                <PaperClipIcon className="h-4 w-4 inline mr-1" />
                Add Attachment
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleRequestAttachmentUpload(index, e.target.files);
                    }
                  }}
                  disabled={inquiryModalMode === "edit" && !editModeEnabled}
                />
              </label>
            </div>

            {request.attachments && request.attachments.length > 0 && (
              <div className="space-y-2">
                {request.attachments.map((file: File, fileIndex: number) => (
                  <div
                    key={fileIndex}
                    className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <PaperClipIcon className="h-4 w-4 text-gray-500" />
                      <span className="text-xs text-gray-700 truncate">
                        {file.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({Math.round(file.size / 1024)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRequestAttachment(index, fileIndex)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStandardRequestView = (request: any, index: number) => {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Item Name *
          </label>
          <input
            type="text"
            value={request.itemName}
            onChange={(e) => updateRequest(index, "itemName", e.target.value)}
            disabled={inquiryModalMode === "edit" && !editModeEnabled}
            className="w-full px-2 py-1 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Enter item name"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Quantity *
          </label>
          <input
            type="number"
            value={request.quantity}
            onChange={(e) =>
              updateRequest(index, "quantity", parseInt(e.target.value) || 1)
            }
            disabled={inquiryModalMode === "edit" && !editModeEnabled}
            className="w-full px-2 py-1 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
            min="1"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Purchase Price (RMB)
          </label>
          <input
            type="number"
            value={request.purchasePrice}
            onChange={(e) =>
              updateRequest(
                index,
                "purchasePrice",
                parseFloat(e.target.value) || 0,
              )
            }
            disabled={inquiryModalMode === "edit" && !editModeEnabled}
            className="w-full px-2 py-1 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
            min="0"
            step="0.01"
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="min-h-screen bg-white shadow-xl rounded-lg p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <PageHeader
                  title="Inquiries"
                  icon={MessagesSquare}
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    setInquiryCurrentPage(1);
                  }}
                  className="px-3 py-2 text-sm text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all"
                >
                  <option value="">All Customers</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.companyName || customer.legalName}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => toggleAllInquiryRequests(allInquiries)}
                  className="px-3 py-2 text-sm text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all flex items-center gap-2"
                  title={allRequestsExpanded ? "Fold all requests" : "Unfold all requests"}
                >
                  {allRequestsExpanded ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                  {allRequestsExpanded ? "Fold All" : "Unfold All"}
                </button>

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
                        Inquiry Details
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer & Contact
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items & Value
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Asana
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/50">
                    {inquiries.map((inquiry) => (
                      <React.Fragment key={inquiry.id}>
                        <tr className="hover:bg-gray-50/50 transition-colors">
                          <td
                            className="px-4 py-3 cursor-pointer"
                            onClick={() => handleInquiryClick(inquiry)}
                          >
                            <div className="w-[12rem]">
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
                            className="px-4 py-3 cursor-pointer"
                            onClick={() => handleInquiryClick(inquiry)}
                          >
                            <div className="w-[10rem]">
                              <a
                                href={`/customers/${inquiry.customer.id}`}
                                className="text-sm text-blue-600 hover:text-blue-800 block"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {inquiry.customer?.companyName || "-"}
                              </a>
                              {inquiry.contactPerson && (
                                <div className="text-sm text-gray-600 truncate">
                                  {inquiry.contactPerson?.name}{" "}
                                  {inquiry.contactPerson?.familyName}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-gray-900">
                                {inquiry.requests?.length || 0} items
                              </div>
                              {inquiry.totalEstimatedCost && (
                                <div className="text-xs text-gray-500">
                                  {formatCurrency(
                                    inquiry.totalEstimatedCost,
                                    "USD",
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1 items-center">
                              <select
                                value={inquiry.status}
                                onChange={(e: any) =>
                                  updateInquiryStatus(
                                    inquiry.id,
                                    e.target.value,
                                  )
                                }
                                className={`text-xs w-[7rem] px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${getInquiryStatusColor(
                                  inquiry.status,
                                )}`}
                              >
                                {getInquiryStatuses().map((status) => (
                                  <option
                                    key={status.value}
                                    value={status.value}
                                  >
                                    {status.label}
                                  </option>
                                ))}
                              </select>
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-medium ${getInquiryPriorityColor(
                                  inquiry.priority,
                                )}`}
                              >
                                {inquiry.priority}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center">
                              {inquiry.asanaLink ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(inquiry.asanaLink, "_blank");
                                  }}
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
                                </button>
                              ) : (
                                <span className="text-red-500 font-bold text-lg animate-pulse" title="Missing Asana Link">!</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleInquiryRequests(inquiry.id);
                                }}
                                className={`px-2 py-1 text-xs rounded-lg transition-all flex items-center gap-1 ${expandedInquiryIds.has(inquiry.id)
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-blue-500 text-white hover:bg-blue-600"
                                  }`}
                              >
                                {expandedInquiryIds.has(inquiry.id) ? (
                                  <EyeSlashIcon className="h-3 w-3" />
                                ) : (
                                  <EyeIcon className="h-3 w-3" />
                                )}
                                Requests ({inquiry.requests?.length || 0})
                              </button>
                              {inquiry.projectLink && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(inquiry.projectLink, "_blank");
                                  }}
                                  className="text-blue-500 hover:text-blue-700 transition-colors p-1"
                                  title="Open project link"
                                >
                                  <LinkIcon className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConvertInquiryClick(inquiry);
                                }}
                                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-all flex items-center gap-1"
                                title="Convert to item"
                              >
                                <ArrowRightIcon className="h-3 w-3" />
                                Convert
                              </button>
                              {user?.role === UserRole.ADMIN && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteInquiry(inquiry.id);
                                  }}
                                  className="p-1 text-red-500 hover:text-red-700 transition-colors"
                                  title="Delete Inquiry"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {expandedInquiryIds.has(inquiry.id) &&
                          inquiry.requests &&
                          inquiry.requests.length > 0 && (
                            <tr className="bg-gray-50/30">
                              <td colSpan={6} className="px-4 py-3">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm border border-gray-200 rounded-lg">
                                    <thead className="bg-gray-200/50 border-b border-gray-200/50">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Item Name
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Dimensions
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Quantity & Interval
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
                                          className={`hover:bg-gray-50/50 transition-colors ${request.priority === "High"
                                            ? "bg-red-50/50"
                                            : ""
                                            }`}
                                        >
                                          <td className="px-4 py-3">
                                            <div className="w-[8rem]">
                                              <div className="text-sm font-medium text-gray-900">
                                                {request.itemName}
                                              </div>
                                              {request.material && (
                                                <div className="text-xs text-gray-500">
                                                  {request.material}
                                                </div>
                                              )}
                                            </div>
                                          </td>

                                          <td className="px-4 py-3 text-center">
                                            {renderDimensionInfo(request)}
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <div className="text-sm font-medium text-gray-900">
                                              {request.qty} / {request.interval}
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <select
                                              value={request.requestStatus}
                                              onChange={(e: any) => {
                                                updateRequestedItem(
                                                  request.id,
                                                  {
                                                    requestStatus:
                                                      e.target.value,
                                                  },
                                                );
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
                                                  <circle cx="12" cy="8.5" r="1.5" />
                                                  <circle cx="8.5" cy="14.5" r="1.5" />
                                                  <circle cx="15.5" cy="14.5" r="1.5" />
                                                </svg>
                                              </button>
                                            ) : (
                                              <span className="text-red-500 font-bold text-lg animate-pulse" title="Missing Asana Link">!</span>
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
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (window.confirm("Are you sure you want to delete this request?")) {
                                                    removeRequestFromInquiry(inquiry.id, request.id);
                                                    fetchInquiries();
                                                  }
                                                }}
                                                className="p-1 text-red-500 hover:text-red-700 transition-colors"
                                                title="Delete Request"
                                              >
                                                <TrashIcon className="h-4 w-4" />
                                              </button>
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
                          onClick={() =>
                            setInquiryCurrentPage(inquiryTotalPages)
                          }
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

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="backdrop-blur-md rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white/95">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {inquiryModalMode === "edit"
                      ? "Inquiry Details"
                      : "Create New Inquiry"}
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetInquiryForm();
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                {inquiryModalMode === "edit" && (
                  <div className="mb-4 flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <span className="text-sm font-medium text-gray-700">
                      Edit Mode
                    </span>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 mr-2">
                        {editModeEnabled ? "Enabled" : "Disabled"}
                      </span>
                      <button
                        type="button"
                        className={`${editModeEnabled ? "bg-gray-600" : "bg-gray-200"
                          } relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2`}
                        onClick={() => setEditModeEnabled(!editModeEnabled)}
                      >
                        <span
                          className={`${editModeEnabled ? "translate-x-4" : "translate-x-0"
                            } pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div className={`rounded-xl p-4 -mx-4 transition-colors duration-300 ${inquiryFormData.isAssembly
                    ? "bg-red-50 border border-red-200/70"
                    : "bg-transparent"
                    }`}>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Inquiry Information
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
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
                            className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="Enter inquiry name"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Item No
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
                              inquiryModalMode === "edit" && !editModeEnabled
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="Enter item number"
                          />
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

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Customer *
                          </label>
                          <select
                            value={inquiryFormData.customerId}
                            onChange={(e) =>
                              setInquiryFormData({
                                ...inquiryFormData,
                                customerId: e.target.value,
                              })
                            }
                            disabled={
                              inquiryModalMode === "edit" && !editModeEnabled
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                                  person.starBusinessDetailsId ===
                                  inquiryFormData.customerId,
                              )
                              .map((person) => (
                                <option key={person.id} value={person.id}>
                                  {person.name} {person.familyName}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
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

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Priority
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
                              inquiryModalMode === "edit" && !editModeEnabled
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            {getPriorityOptions().map((priority) => (
                              <option key={priority.value} value={priority.value}>
                                {priority.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Project Link
                          </label>
                          <input
                            type="text"
                            value={inquiryFormData.projectLink || ""}
                            onChange={(e) =>
                              setInquiryFormData({
                                ...inquiryFormData,
                                projectLink: e.target.value,
                              })
                            }
                            disabled={
                              inquiryModalMode === "edit" && !editModeEnabled
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="https://..."
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Asana Link
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <svg
                                className="h-4 w-4 text-gray-400"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                                <circle cx="12" cy="8.5" r="1.5" />
                                <circle cx="8.5" cy="14.5" r="1.5" />
                                <circle cx="15.5" cy="14.5" r="1.5" />
                              </svg>
                            </div>
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
                                inquiryModalMode === "edit" && !editModeEnabled
                              }
                              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                              placeholder="https://app.asana.com/..."
                            />
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className={`flex items-center gap-2 p-2 border rounded-lg transition-colors duration-200 ${inquiryFormData.isAssembly ? "border-red-300 bg-red-100" : "border-gray-300/80 bg-white/70 backdrop-blur-sm"}`}>
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
                              className="h-4 w-4 text-gray-600 rounded focus:ring-gray-500"
                            />
                            <label
                              htmlFor="isAssembly"
                              className="text-xs font-medium text-gray-700"
                            >
                              This is an assembly item
                            </label>
                          </div>
                        </div>

                        {inquiryFormData.isAssembly && (
                          <div className="col-span-2">
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
                              className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                              placeholder="Enter assembly instructions..."
                            />
                          </div>
                        )}

                        <div className="col-span-2 grid grid-cols-3 gap-3 border-t pt-3 mt-1">
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
                                inquiryModalMode === "edit" && !editModeEnabled
                              }
                              rows={3}
                              className="w-full px-2 py-1 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                                inquiryModalMode === "edit" && !editModeEnabled
                              }
                              rows={3}
                              className="w-full px-2 py-1 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                              placeholder="Enter additional urgency details..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Pain Points (tags)
                            </label>
                            <div className="min-h-[80px] p-2 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus-within:ring-2 focus-within:ring-gray-500/50 transition-all">
                              <div className="flex flex-wrap gap-1 mb-2">
                                {inquiryFormData.painPoints?.map((tag, i) => (
                                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                    {tag}
                                    <button
                                      type="button"
                                      onClick={() => setInquiryFormData({
                                        ...inquiryFormData,
                                        painPoints: inquiryFormData.painPoints?.filter((_, idx) => idx !== i)
                                      })}
                                      disabled={inquiryModalMode === "edit" && !editModeEnabled}
                                      className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none"
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
                                  onChange={(e) => setInquiryTagInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ',') {
                                      e.preventDefault();
                                      handleAddInquiryPainPoint();
                                    }
                                  }}
                                  disabled={inquiryModalMode === "edit" && !editModeEnabled}
                                  placeholder="Type tag..."
                                  className="flex-1 text-sm bg-transparent outline-none border-none p-0 focus:ring-0"
                                />
                                <button
                                  type="button"
                                  onClick={handleAddInquiryPainPoint}
                                  disabled={(inquiryModalMode === "edit" && !editModeEnabled) || !inquiryTagInput.trim()}
                                  className="p-1 text-blue-500 hover:text-blue-700 transition-colors disabled:text-gray-300"
                                >
                                  <PlusIcon className="h-5 w-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`rounded-xl p-4 -mx-4 transition-colors duration-300 ${inquiryFormData.isAssembly
                  ? "bg-green-50 border border-green-200/70 mt-2"
                  : "bg-transparent"
                  }`}>
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
                        disabled={inquiryModalMode === "edit" && !editModeEnabled}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <PlusIcon className="h-3 w-3" />
                        Add Item
                      </button>
                    </div>

                    <div className="space-y-2">
                      {inquiryRequests.map((request, index) => (
                        <div
                          key={index}
                          className={`border rounded-lg overflow-hidden transition-colors duration-300 ${inquiryFormData.isAssembly ? "border-green-200" : "border-gray-200"}`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleRequestExpansion(index)}
                            className={`w-full px-3 py-2 flex items-center justify-between text-left transition-colors ${expandedRequestIndex === index
                              ? inquiryFormData.isAssembly ? "bg-green-100" : "bg-gray-100"
                              : inquiryFormData.isAssembly ? "bg-green-50 hover:bg-green-100" : "bg-gray-50 hover:bg-gray-100"
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
                                {request.itemName || "New Item"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
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
                            <div className={`p-3 transition-colors duration-300 ${inquiryFormData.isAssembly ? "bg-green-50/60" : "bg-white"}`}>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex gap-2">
                                  <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Item Name *
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
                                      className="w-full px-2 py-1 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                      placeholder="Enter item name"
                                    />
                                  </div>
                                  <div className="w-1/3">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Item No
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
                                      className="w-full px-2 py-1 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                      placeholder="Enter item no"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Quantity *
                                  </label>
                                  <input
                                    type="number"
                                    value={request.qty}
                                    onChange={(e) =>
                                      updateRequest(
                                        index,
                                        "qty",
                                        parseInt(e.target.value) || 1,
                                      )
                                    }
                                    disabled={
                                      inquiryModalMode === "edit" &&
                                      !editModeEnabled
                                    }
                                    className="w-full px-2 py-1 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    min="1"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Purchase Price
                                  </label>
                                  <input
                                    type="number"
                                    value={request.purchasePrice}
                                    onChange={(e) =>
                                      updateRequest(
                                        index,
                                        "purchasePrice",
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    disabled={
                                      inquiryModalMode === "edit" &&
                                      !editModeEnabled
                                    }
                                    className="w-full px-2 py-1 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    min="0"
                                    step="0.01"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Currency
                                  </label>
                                  <select
                                    value={request.currency}
                                    onChange={(e) =>
                                      updateRequest(
                                        index,
                                        "currency",
                                        e.target.value,
                                      )
                                    }
                                    disabled={
                                      inquiryModalMode === "edit" &&
                                      !editModeEnabled
                                    }
                                    className="w-full px-2 py-1 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                                    Status
                                  </label>
                                  <select
                                    value={request.status}
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
                                    className="w-full px-2 py-1 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
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

                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Material
                                  </label>
                                  <input
                                    type="text"
                                    value={request.material}
                                    onChange={(e) =>
                                      updateRequest(
                                        index,
                                        "material",
                                        e.target.value,
                                      )
                                    }
                                    disabled={
                                      inquiryModalMode === "edit" &&
                                      !editModeEnabled
                                    }
                                    className="w-full px-2 py-1 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    placeholder="Enter material"
                                  />
                                </div>
                                <div className="col-span-2 border-t pt-2 mt-2">
                                  <h5 className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                                    <ArrowsPointingOutIcon className="h-3 w-3" />
                                    Item Dimensions
                                  </h5>
                                  <div className="grid grid-cols-4 gap-2">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500 mb-1">
                                        Weight (kg)
                                      </label>
                                      <input
                                        type="number"
                                        value={request.weight || ""}
                                        onChange={(e) =>
                                          updateRequest(
                                            index,
                                            "weight",
                                            e.target.value
                                              ? parseFloat(e.target.value)
                                              : undefined,
                                          )
                                        }
                                        disabled={
                                          inquiryModalMode === "edit" &&
                                          !editModeEnabled
                                        }
                                        className="w-full px-2 py-1 text-xs border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500 mb-1">
                                        Length (cm)
                                      </label>
                                      <input
                                        type="number"
                                        value={request.length || ""}
                                        onChange={(e) =>
                                          updateRequest(
                                            index,
                                            "length",
                                            e.target.value
                                              ? parseFloat(e.target.value)
                                              : undefined,
                                          )
                                        }
                                        disabled={
                                          inquiryModalMode === "edit" &&
                                          !editModeEnabled
                                        }
                                        className="w-full px-2 py-1 text-xs border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        placeholder="0.0"
                                        step="0.1"
                                        min="0"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500 mb-1">
                                        Width (cm)
                                      </label>
                                      <input
                                        type="number"
                                        value={request.width || ""}
                                        onChange={(e) =>
                                          updateRequest(
                                            index,
                                            "width",
                                            e.target.value
                                              ? parseFloat(e.target.value)
                                              : undefined,
                                          )
                                        }
                                        disabled={
                                          inquiryModalMode === "edit" &&
                                          !editModeEnabled
                                        }
                                        className="w-full px-2 py-1 text-xs border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        placeholder="0.0"
                                        step="0.1"
                                        min="0"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-500 mb-1">
                                        Height (cm)
                                      </label>
                                      <input
                                        type="number"
                                        value={request.height || ""}
                                        onChange={(e) =>
                                          updateRequest(
                                            index,
                                            "height",
                                            e.target.value
                                              ? parseFloat(e.target.value)
                                              : undefined,
                                          )
                                        }
                                        disabled={
                                          inquiryModalMode === "edit" &&
                                          !editModeEnabled
                                        }
                                        className="w-full px-2 py-1 text-xs border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        placeholder="0.0"
                                        step="0.1"
                                        min="0"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="col-span-2">
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
                                    rows={1}
                                    className="w-full px-2 py-1 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    placeholder="Enter item description"
                                  />
                                </div>

                                <div className="col-span-2 grid grid-cols-3 gap-2 border-t pt-2 mt-1">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Urgency 1
                                    </label>
                                    <textarea
                                      value={request.urgency1 || ""}
                                      onChange={(e) =>
                                        updateRequest(index, "urgency1", e.target.value)
                                      }
                                      disabled={inquiryModalMode === "edit" && !editModeEnabled}
                                      rows={2}
                                      className="w-full px-2 py-1 text-xs border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                      placeholder="Urgency details..."
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Urgency 2
                                    </label>
                                    <textarea
                                      value={request.urgency2 || ""}
                                      onChange={(e) =>
                                        updateRequest(index, "urgency2", e.target.value)
                                      }
                                      disabled={inquiryModalMode === "edit" && !editModeEnabled}
                                      rows={2}
                                      className="w-full px-2 py-1 text-xs border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                      placeholder="Additional urgency..."
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Pain Points
                                    </label>
                                    <div className="min-h-[60px] p-1 border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus-within:ring-2 focus-within:ring-gray-500/50 transition-all">
                                      <div className="flex flex-wrap gap-1 mb-1">
                                        {request.painPoints?.map((tag, i) => (
                                          <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                            {tag}
                                            <button
                                              type="button"
                                              onClick={() => updateRequest(index, "painPoints", request.painPoints?.filter((_, idx) => idx !== i))}
                                              disabled={inquiryModalMode === "edit" && !editModeEnabled}
                                              className="ml-0.5 text-gray-400 hover:text-gray-600"
                                            >
                                              <XMarkIcon className="h-2.5 w-2.5" />
                                            </button>
                                          </span>
                                        ))}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="text"
                                          value={requestLoopTagInputs[index] || ""}
                                          onChange={(e) => setRequestLoopTagInputs({
                                            ...requestLoopTagInputs,
                                            [index]: e.target.value
                                          })}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ',') {
                                              e.preventDefault();
                                              handleAddRequestLoopPainPoint(index);
                                            }
                                          }}
                                          disabled={inquiryModalMode === "edit" && !editModeEnabled}
                                          placeholder="Add..."
                                          className="flex-1 text-xs bg-transparent outline-none border-none p-0 focus:ring-0"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleAddRequestLoopPainPoint(index)}
                                          disabled={(inquiryModalMode === "edit" && !editModeEnabled) || !(requestLoopTagInputs[index] || "").trim()}
                                          className="p-0.5 text-blue-500 hover:text-blue-700 transition-colors disabled:text-gray-300"
                                        >
                                          <PlusIcon className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="col-span-2">
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
                                    rows={1}
                                    className="w-full px-2 py-1 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    placeholder="Enter specifications"
                                  />
                                </div>

                                <div className="col-span-2">
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
                                    className="w-full px-2 py-1 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    placeholder="https://app.asana.com/..."
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between gap-2">
                    <div>
                      {inquiryModalMode === "edit" &&
                        editModeEnabled &&
                        user?.role === UserRole.ADMIN && (
                          <button
                            onClick={() => {
                              if (editingInquiryId) {
                                handleDeleteInquiry(editingInquiryId);
                                setShowCreateModal(false);
                              }
                            }}
                            className="px-3 py-2 text-xs text-red-700 bg-white/80 backdrop-blur-sm border border-red-300/80 rounded hover:bg-red-50/60 transition-all"
                          >
                            Delete Inquiry
                          </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowCreateModal(false);
                          resetInquiryForm();
                        }}
                        className="px-3 py-2 text-xs text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded hover:bg-white/60 transition-all"
                      >
                        {inquiryModalMode === "edit" && !editModeEnabled
                          ? "Close"
                          : "Cancel"}
                      </button>
                      {(inquiryModalMode === "create" ||
                        (inquiryModalMode === "edit" && editModeEnabled)) && (
                          <CustomButton
                            gradient={true}
                            onClick={handleInquirySubmit}
                            disabled={
                              !inquiryFormData.name ||
                              !inquiryFormData.customerId ||
                              !inquiryRequests.some(
                                (req) => req.itemName && req.qty >= 1,
                              )
                            }
                            className="px-3 py-2 text-xs bg-gray-600/90 backdrop-blur-sm text-white rounded hover:bg-gray-700/90 transition-all disabled:opacity-50"
                          >
                            {inquiryModalMode === "edit"
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


        {showConversionModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {conversionType === "inquiry"
                        ? "Convert Inquiry to Item"
                        : "Convert Request to Item"}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Fill in the required fields to create a new item
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowConversionModal(false);
                      resetConversionForm();
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

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
                          {(conversionRequestData as any).business?.customer?.companyName || (conversionRequestData as any).business?.companyName || "N/A"}
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
                              {conversionFormData[field.name]?.map((tag: string, i: number) => (
                                <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                  {tag}
                                  <button
                                    type="button"
                                    onClick={() => setConversionFormData({
                                      ...conversionFormData,
                                      [field.name]: conversionFormData[field.name].filter((_: any, idx: number) => idx !== i)
                                    })}
                                    className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                                  >
                                    <XMarkIcon className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={conversionTagInput}
                                onChange={(e) => setConversionTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ',') {
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
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const CombinedInquiriesPage = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    }>
      <CombinedInquiriesPageContent />
    </Suspense>
  );
};

export default CombinedInquiriesPage;
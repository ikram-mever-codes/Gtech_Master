"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  BuildingOffice2Icon,
  MapPinIcon,
  GlobeAltIcon,
  PhoneIcon,
  EnvelopeIcon,
  ClockIcon,
  TagIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  SparklesIcon,
  DocumentPlusIcon,
  MapIcon,
  StarIcon,
  BuildingStorefrontIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon,
  ArrowLeftIcon,
  CpuChipIcon,
  CalendarIcon,
  UserIcon,
  CogIcon,
  UserGroupIcon,
  EyeIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import {
  createBusiness,
  updateBusiness,
  getBusinessById,
  BusinessCreatePayload,
} from "@/api/bussiness";
import CustomButton from "@/components/UI/CustomButton";
import theme from "@/styles/theme";

interface FormErrors {
  [key: string]: string;
}

interface StarBusinessDetails {
  inSeries?: "Yes" | "No";
  madeIn?: "Yes" | "No";
  lastChecked?: string;
  checkedBy?: "manual" | "AI";
  device?: string;
  industry?: string;
  comment?: string;
  convertedBy?: { id: string; name: string };
  converted_timestamp?: string;
}

interface ExtendedBusinessCreatePayload extends BusinessCreatePayload {
  source?: string;
  isDeviceMaker?: "Yes" | "No" | "Unsure";
  check_by?: { id: string; name: string };
  check_timestamp?: string;
}

const AddEditBusinessManual: React.FC = () => {
  const params = useSearchParams();
  const router = useRouter();
  const businessId = params?.get("businessId") as string;
  const isViewMode = params?.get("view") === "true";
  const isEditMode = !!businessId && !isViewMode;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isExtraInfoOpen, setIsExtraInfoOpen] = useState(false);
  const [isStarBusinessOpen, setIsStarBusinessOpen] = useState(false);
  const [isStarCustomer, setIsStarCustomer] = useState(false);

  const [formData, setFormData] = useState<ExtendedBusinessCreatePayload>({
    name: "",
    address: "",
    description: "",
    city: "",
    displayName: "",
    state: "",
    country: "",
    postalCode: "",
    latitude: undefined,
    longitude: undefined,
    website: "",
    phoneNumber: "",
    email: "",
    googlePlaceId: "",
    googleMapsUrl: "",
    reviewCount: undefined,
    averageRating: undefined,
    category: "",
    additionalCategories: [],
    source: "",
    isDeviceMaker: "Unsure",
    check_by: undefined,
    check_timestamp: undefined,
    isStarCustomer: false,
    starCustomerEmail: "",
    starBusinessDetails: {
      inSeries: undefined,
      madeIn: undefined,
      lastChecked: undefined,
      checkedBy: undefined,
      device: "",
      industry: "",
      comment: "",
      convertedBy: undefined,
      converted_timestamp: undefined,
    },
    socialMedia: {
      facebook: "",
      instagram: "",
      linkedin: "",
      twitter: "",
    },
    businessHours: {
      monday: "",
      tuesday: "",
      wednesday: "",
      thursday: "",
      friday: "",
      saturday: "",
      sunday: "",
    },
  });

  // Auto-open sections in view mode
  useEffect(() => {
    if (isViewMode) {
      setIsExtraInfoOpen(true);
      if (formData.isDeviceMaker === "Yes" && formData.starBusinessDetails) {
        setIsStarBusinessOpen(true);
      }
    }
  }, [isViewMode, formData.isDeviceMaker, formData.starBusinessDetails]);

  // Auto-open Star Business Details when device maker is Yes (edit mode)
  useEffect(() => {
    if (!isViewMode && formData.isDeviceMaker === "Yes") {
      setIsStarBusinessOpen(true);
    } else if (!isViewMode) {
      // Reset star customer when device maker is not Yes
      setIsStarCustomer(false);
      setFormData((prev) => ({
        ...prev,
        isStarCustomer: false,
        starCustomerEmail: "",
      }));
    }
  }, [formData.isDeviceMaker, isViewMode]);

  // Update formData when star customer toggle changes
  useEffect(() => {
    setFormData((prev) => ({ ...prev, isStarCustomer: isStarCustomer }));
  }, [isStarCustomer]);

  // Fetch business data if in edit or view mode
  useEffect(() => {
    if ((isEditMode || isViewMode) && businessId) {
      fetchBusinessData();
    }
  }, [businessId, isEditMode, isViewMode]);

  const fetchBusinessData = async () => {
    try {
      setIsLoading(true);
      const businessData = await getBusinessById(businessId);

      // Check if this is a star customer
      const isStarCustomerBusiness = businessData.stage === "star_customer";
      setIsStarCustomer(isStarCustomerBusiness);

      // Map the business data to form structure
      setFormData({
        name: businessData.companyName || businessData.name || "",
        address:
          businessData.businessDetails?.address || businessData.address || "",
        description:
          businessData.businessDetails?.description ||
          businessData.description ||
          "",
        displayName: businessData.displayName,
        city: businessData.businessDetails?.city || businessData.city || "",
        state: businessData.businessDetails?.state || businessData.state || "",
        country:
          businessData.businessDetails?.country || businessData.country || "",
        postalCode:
          businessData.businessDetails?.postalCode ||
          businessData.postalCode ||
          "",
        latitude:
          businessData.businessDetails?.latitude || businessData.latitude,
        longitude:
          businessData.businessDetails?.longitude || businessData.longitude,
        website:
          businessData.businessDetails?.website || businessData.website || "",
        phoneNumber:
          businessData.businessDetails?.contactPhone ||
          businessData.phoneNumber ||
          "",
        email: businessData.businessDetails?.email || businessData.email || "",
        googlePlaceId:
          businessData.businessDetails?.googlePlaceId ||
          businessData.googlePlaceId ||
          "",
        googleMapsUrl:
          businessData.businessDetails?.googleMapsUrl ||
          businessData.googleMapsUrl ||
          "",
        reviewCount:
          businessData.businessDetails?.reviewCount || businessData.reviewCount,
        averageRating:
          businessData.businessDetails?.averageRating ||
          businessData.averageRating,
        category:
          businessData.businessDetails?.category || businessData.category || "",
        additionalCategories:
          businessData.businessDetails?.additionalCategories ||
          businessData.additionalCategories ||
          [],
        source:
          businessData.businessDetails?.businessSource ||
          businessData.source ||
          "",
        isDeviceMaker: businessData.isDeviceMaker,
        check_by: businessData.businessDetails?.check_by,
        check_timestamp: businessData.businessDetails?.check_timestamp,
        isStarCustomer: isStarCustomerBusiness,
        starCustomerEmail: isStarCustomerBusiness
          ? businessData.email || ""
          : "",
        starBusinessDetails: businessData.starBusinessDetails || {
          inSeries: undefined,
          madeIn: undefined,
          lastChecked: undefined,
          checkedBy: undefined,
          device: "",
          industry: "",
          comment: "",
          convertedBy: undefined,
          converted_timestamp: undefined,
        },
        socialMedia: businessData.businessDetails?.socialLinks ||
          businessData.socialMedia || {
            facebook: "",
            instagram: "",
            linkedin: "",
            twitter: "",
          },
        businessHours: businessData.businessDetails?.businessHours ||
          businessData.businessHours || {
            monday: "",
            tuesday: "",
            wednesday: "",
            thursday: "",
            friday: "",
            saturday: "",
            sunday: "",
          },
      });

      // Auto-open sections if there's data (for edit mode)
      if (!isViewMode) {
        if (
          businessData.businessDetails?.description ||
          businessData.businessDetails?.socialLinks ||
          businessData.businessDetails?.businessHours
        ) {
          setIsExtraInfoOpen(true);
        }

        // Auto-open Star Business Details if it's a device maker with star details
        if (
          businessData.isDeviceMaker === "Yes" &&
          businessData.starBusinessDetails
        ) {
          setIsStarBusinessOpen(true);
        }
      }
    } catch (error) {
      console.error("Error fetching business:", error);
      toast.error("Failed to load business data");
      setTimeout(() => router.push("/businesses"), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    "Restaurant",
    "Retail",
    "Healthcare",
    "Education",
    "Technology",
    "Finance",
    "Real Estate",
    "Entertainment",
    "Beauty & Wellness",
    "Automotive",
    "Professional Services",
    "Home Services",
    "Sports & Recreation",
    "Travel & Tourism",
    "Non-profit",
    "Government",
    "Manufacturing",
    "Agriculture",
    "Construction",
    "Transportation",
  ];

  const sources = ["Shop", "Anfrage", "Empfehlung", "GoogleMaps"];

  const industries = [
    "Gastro",
    "Verpackung",
    "Lebensmittel",
    "Automatisierung",
    "Mess",
    "Bau",
    "Medizin",
    "Automatisierung",
    "Reinigung",
    "Veredelung",
    "Holz",
    "Elektronik",
    "Fahrzeug",
    "Infrastruktur",
    "Beförderung",
    "Bahn",
    "Textil",
    "Kosmetik",
    "Fitness",
  ];

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Required fields validation
    if (!formData.name || !formData.name.trim()) {
      errors.name = "Customer name is required";
    }
    if (!formData.postalCode || !formData.postalCode.trim()) {
      errors.postalCode = "Postal code is required";
    }
    if (!formData.city || !formData.city.trim()) {
      errors.city = "City is required";
    }

    // Check website
    if (!formData.website || !formData.website.trim()) {
      errors.website = "Website is required";
    } else if (!isValidUrl(formData.website.trim())) {
      errors.website = "Invalid website URL format";
    }

    if (!formData.source || !formData.source.trim()) {
      errors.source = "Source is required";
    }
    if (
      !formData.isDeviceMaker ||
      (formData.isDeviceMaker !== "Yes" &&
        formData.isDeviceMaker !== "No" &&
        formData.isDeviceMaker !== "Unsure")
    ) {
      errors.isDeviceMaker = "Please select if this is a device maker";
    }

    // Star Customer email validation
    if (isStarCustomer) {
      if (!formData.starCustomerEmail || !formData.starCustomerEmail.trim()) {
        errors.starCustomerEmail = "Email is required for Star Customer";
      } else if (!isValidEmail(formData.starCustomerEmail)) {
        errors.starCustomerEmail = "Invalid email format";
      }
    }

    // Optional fields validation
    if (
      formData.email &&
      formData.email.trim() &&
      !isValidEmail(formData.email)
    ) {
      errors.email = "Invalid email format";
    }
    if (
      formData.phoneNumber &&
      formData.phoneNumber.trim() &&
      !isValidPhone(formData.phoneNumber)
    ) {
      errors.phoneNumber = "Invalid phone number format";
    }

    if (
      formData.latitude !== undefined &&
      formData.latitude !== null &&
      (formData.latitude < -90 || formData.latitude > 90)
    ) {
      errors.latitude = "Latitude must be between -90 and 90";
    }
    if (
      formData.longitude !== undefined &&
      formData.longitude !== null &&
      (formData.longitude < -180 || formData.longitude > 180)
    ) {
      errors.longitude = "Longitude must be between -180 and 180";
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    return Object.keys(errors).length === 0;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string): boolean => {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone);
  };

  const isValidUrl = (url: string): boolean => {
    try {
      const trimmedUrl = url.trim();
      let urlToValidate = trimmedUrl;
      if (
        !trimmedUrl.startsWith("http://") &&
        !trimmedUrl.startsWith("https://")
      ) {
        urlToValidate = "https://" + trimmedUrl;
      }
      new URL(urlToValidate);
      return true;
    } catch {
      return false;
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleStarBusinessChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      starBusinessDetails: {
        ...prev.starBusinessDetails,
        [field]: value,
      },
    }));
    if (formErrors[`starBusinessDetails.${field}`]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`starBusinessDetails.${field}`];
        return newErrors;
      });
    }
  };

  const handleSocialMediaChange = (platform: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: value,
      },
    }));
  };

  const handleBusinessHoursChange = (day: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: value,
      },
    }));
  };

  const handleAdditionalCategoryToggle = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      additionalCategories: prev.additionalCategories?.includes(category)
        ? prev.additionalCategories.filter((c) => c !== category)
        : [...(prev.additionalCategories || []), category],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Clean up the data before submission
      const cleanedData: BusinessCreatePayload = {
        ...formData,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
        reviewCount: formData.reviewCount || undefined,
        averageRating: formData.averageRating || undefined,
        // Include star business details only if device maker is Yes
        starBusinessDetails:
          formData.isDeviceMaker === "Yes"
            ? formData.starBusinessDetails
            : undefined,
        // Include star customer info
        isStarCustomer: isStarCustomer,
        starCustomerEmail: isStarCustomer
          ? formData.starCustomerEmail
          : undefined,
      };

      if (isEditMode) {
        await updateBusiness(businessId, cleanedData);
      } else {
        const response = await createBusiness(cleanedData);
        handleReset();
        if (response?.id) {
          // Optionally redirect to the business page
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    } catch (error) {
      console.error(
        `Error ${isEditMode ? "updating" : "creating"} business:`,
        error
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (isEditMode) {
      fetchBusinessData();
    } else {
      setFormData({
        name: "",
        address: "",
        description: "",
        city: "",
        state: "",
        country: "",
        postalCode: "",
        latitude: undefined,
        longitude: undefined,
        website: "",
        phoneNumber: "",
        email: "",
        googlePlaceId: "",
        googleMapsUrl: "",
        reviewCount: undefined,
        averageRating: undefined,
        category: "",
        additionalCategories: [],
        source: "",
        isDeviceMaker: undefined,
        check_by: undefined,
        check_timestamp: undefined,
        isStarCustomer: false,
        starCustomerEmail: "",
        starBusinessDetails: {
          inSeries: undefined,
          madeIn: undefined,
          lastChecked: undefined,
          checkedBy: undefined,
          device: "",
          industry: "",
          comment: "",
          convertedBy: undefined,
          converted_timestamp: undefined,
        },
        socialMedia: {
          facebook: "",
          instagram: "",
          linkedin: "",
          twitter: "",
        },
        businessHours: {
          monday: "",
          tuesday: "",
          wednesday: "",
          thursday: "",
          friday: "",
          saturday: "",
          sunday: "",
        },
      });
      setIsStarCustomer(false);
    }
    setFormErrors({});
  };

  const handleEditClick = () => {
    // Remove view parameter and redirect to edit mode
    const newParams = new URLSearchParams(params.toString());
    newParams.delete("view");
    router.push(`/bussinesses/new?businessId=${businessId}`);
  };

  // Helper function to format date and time
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

  // Updated Helper function to render form fields based on view/edit mode
  const renderField = (
    label: string,
    value: any,
    fieldName: string,
    required?: boolean,
    type?: string,
    placeholder?: string,
    icon?: React.ReactNode,
    selectOptions?: { value: string; label: string }[] | string[],
    readOnly?: boolean,
    customOnChange?: (field: string, value: any) => void
  ) => {
    if (isViewMode || readOnly) {
      // Determine display value for view mode
      let displayValue = "-";
      if (selectOptions) {
        if (Array.isArray(selectOptions) && selectOptions.length > 0) {
          if (typeof selectOptions[0] === "string") {
            displayValue = value || "-";
          } else {
            // It's an array of objects
            const found: any = selectOptions.find(
              (opt: any) => opt.value === value
            );
            displayValue = found ? found.label : value || "-";
          }
        }
      } else if (type === "datetime") {
        displayValue = formatDateTime(value);
      } else if (
        fieldName === "check_by" ||
        fieldName === "starBusinessDetails.convertedBy"
      ) {
        displayValue = value?.name || "-";
      } else {
        displayValue = value || "-";
      }

      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
          <div
            className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg ${
              icon ? "flex items-center gap-3" : ""
            }`}
          >
            {icon && <span className="text-gray-400">{icon}</span>}
            <span className="text-gray-700">{displayValue}</span>
          </div>
        </div>
      );
    }

    // Edit/Create mode rendering
    if (selectOptions) {
      const isStringArray =
        Array.isArray(selectOptions) &&
        selectOptions.length > 0 &&
        typeof selectOptions[0] === "string";

      // Use custom onChange if provided, otherwise use handleInputChange
      const onChangeHandler = customOnChange || handleInputChange;

      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <select
            name={fieldName}
            value={value || ""}
            onChange={(e) => onChangeHandler(fieldName, e.target.value)}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
              formErrors[fieldName] ? "border-red-500" : "border-gray-200"
            }`}
            disabled={isViewMode}
          >
            <option value="">
              {placeholder || `Select ${label.toLowerCase()}`}
            </option>
            {isStringArray
              ? (selectOptions as string[]).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))
              : (selectOptions as { value: string; label: string }[]).map(
                  (opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  )
                )}
          </select>
          {formErrors[fieldName] && (
            <p className="mt-1 text-sm text-red-500">{formErrors[fieldName]}</p>
          )}
        </div>
      );
    }

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          {icon && (
            <span className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {icon}
            </span>
          )}
          <input
            type={type || "text"}
            name={fieldName}
            value={value || ""}
            onChange={(e) => {
              const handler = customOnChange || handleInputChange;
              handler(fieldName, e.target.value);
            }}
            className={`w-full ${
              icon ? "pl-10" : "px-4"
            } pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
              formErrors[fieldName] ? "border-red-500" : "border-gray-200"
            } ${isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}`}
            placeholder={placeholder || ""}
            disabled={isViewMode}
          />
        </div>
        {formErrors[fieldName] && (
          <p className="mt-1 text-sm text-red-500">{formErrors[fieldName]}</p>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading business data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto">
      <div
        className="bg-white rounded-lg mx-[2rem] shadow-sm pb-8 p-8 px-9"
        style={{
          border: "1px solid #e0e0e0",
          background: "linear-gradient(to bottom, #ffffff, #f9f9f9)",
        }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {(isEditMode || isViewMode) && (
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <h1 className="text-3xl font-semibold text-secondary flex items-center gap-3">
                {isViewMode ? (
                  <>
                    <EyeIcon className="w-8 h-8 text-primary" />
                    Business Details
                  </>
                ) : isEditMode ? (
                  <>
                    <PencilIcon className="w-8 h-8 text-primary" />
                    Edit Business
                  </>
                ) : (
                  <>
                    <BuildingStorefrontIcon className="w-8 h-8 text-primary" />
                    Add New Business
                  </>
                )}
              </h1>
            </div>
            <p className="mt-2 text-text-secondary">
              {isViewMode
                ? `Viewing details for ${formData.name || "this business"}`
                : isEditMode
                ? `Update information for ${formData.name || "this business"}`
                : "Enter business information with all details"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Edit Button in View Mode */}
            {isViewMode && (
              <CustomButton
                variant="contained"
                startIcon={<PencilIcon className="w-5 h-5" />}
                onClick={handleEditClick}
              >
                Edit Business
              </CustomButton>
            )}
            {/* Star Customer Toggle - Only show when device maker is Yes and not in view mode */}

            {/* Show Star Customer Badge in View Mode */}
            {isViewMode && isStarCustomer && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                <StarIcon className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-gray-700">
                  Star Customer
                </span>
              </div>
            )}
            {!isEditMode && !isViewMode && (
              <CustomButton
                variant="outlined"
                startIcon={<DocumentPlusIcon className="w-5 h-5" />}
                onClick={() =>
                  (window.location.href = "/businesses/bulk-upload")
                }
              >
                Bulk Import
              </CustomButton>
            )}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Required Fields Section */}
          <div className={`rounded-xl ${isViewMode ? "" : "p-8"}`}>
            <div className="flex items-center gap-3 mb-6">
              <ExclamationTriangleIcon className="w-6 h-6" />
              <h2 className="text-xl font-semibold text-gray-800">
                {isViewMode ? "Basic Information" : "Required Information"}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderField(
                "Business Name",
                formData.name,
                "name",
                true,
                "text",
                "Enter customer/business name"
              )}

              <div className={isStarCustomer && !isViewMode ? "" : ""}>
                {renderField(
                  "Website",
                  formData.website,
                  "website",
                  true,
                  "text",
                  "https://www.example.com",
                  <GlobeAltIcon className="w-5 h-5" />
                )}
              </div>

              {renderField(
                "City",
                formData.city,
                "city",
                true,
                "text",
                "Stuttgart"
              )}
              {renderField(
                "Postal Code",
                formData.postalCode,
                "postalCode",
                true,
                "text",
                "10001"
              )}
              {renderField(
                "Source",
                formData.source,
                "source",
                true,
                undefined,
                undefined,
                undefined,
                sources
              )}
              {renderField(
                "Country",
                formData.country,
                "country",
                false,
                undefined,
                undefined,
                undefined,
                ["Germany", "Austria", "Switzerland"]
              )}
              {renderField(
                "Is Device Maker",
                formData.isDeviceMaker,
                "isDeviceMaker",
                true,
                undefined,
                undefined,
                undefined,
                ["Yes", "No", "Unsure"]
              )}

              {/* New View-Only Fields under Is Device Maker */}
              {(isEditMode || isViewMode) && formData.check_by && (
                <>
                  {renderField(
                    "Checked By",
                    formData.check_by,
                    "check_by",
                    false,
                    "text",
                    "",
                    <UserIcon className="w-5 h-5" />,
                    undefined,
                    true // Read-only
                  )}
                </>
              )}

              {(isEditMode || isViewMode) && formData.check_timestamp && (
                <>
                  {renderField(
                    "Check Timestamp",
                    formData.check_timestamp,
                    "check_timestamp",
                    false,
                    "datetime",
                    "",
                    <CalendarIcon className="w-5 h-5" />,
                    undefined,
                    true // Read-only
                  )}
                </>
              )}
            </div>

            {/* Star Customer Info Box */}
            {isStarCustomer && !isViewMode && (
              <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <StarIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-1">
                      Star Customer Account
                    </h3>
                    <p className="text-sm text-gray-600">
                      This business will be created as a Star Customer with full
                      account access. They will receive login credentials via
                      email and can manage their own orders.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Star Business Details Section */}
          {(isEditMode && formData.starBusinessDetails) ||
          (!isEditMode && !isViewMode && formData.isDeviceMaker === "Yes") ||
          (isViewMode &&
            formData.starBusinessDetails &&
            Object.values(formData.starBusinessDetails).some((v) => v)) ? (
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
              {!isViewMode ? (
                <button
                  type="button"
                  onClick={() => setIsStarBusinessOpen(!isStarBusinessOpen)}
                  className="w-full p-6 flex items-center justify-between transition-colors rounded-t-xl"
                >
                  <div className="flex items-center gap-3">
                    <StarIcon className="w-6 h-6 text-yellow-600" />
                    <h2 className="text-xl font-semibold text-gray-800">
                      Star Business Details
                    </h2>
                    <span className="text-sm text-yellow-600 font-medium">
                      {formData.isDeviceMaker === "Yes"
                        ? "(Device Maker)"
                        : formData.isDeviceMaker === "No"
                        ? "(Not Device Maker)"
                        : "(Unsure)"}
                    </span>
                  </div>
                  {isStarBusinessOpen ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              ) : (
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <StarIcon className="w-6 h-6 text-yellow-600" />
                    <h2 className="text-xl font-semibold text-gray-800">
                      Star Business Details
                    </h2>
                    <span className="text-sm text-yellow-600 font-medium">
                      {formData.isDeviceMaker === "Yes"
                        ? "(Device Maker)"
                        : formData.isDeviceMaker === "No"
                        ? "(Not Device Maker)"
                        : "(Unsure)"}
                    </span>
                  </div>
                </div>
              )}

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  isStarBusinessOpen || isViewMode
                    ? "max-h-[1500px]"
                    : "max-h-0"
                }`}
              >
                <div
                  className={`${
                    isViewMode ? "px-6 pb-6" : "p-8 pt-0"
                  } space-y-6`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderField(
                      "In Series",
                      formData.starBusinessDetails?.inSeries,
                      "inSeries",
                      true,
                      undefined,
                      undefined,
                      undefined,
                      ["Yes", "No"],
                      undefined,
                      handleStarBusinessChange // Use the correct handler
                    )}
                    {renderField(
                      "Made In",
                      formData.starBusinessDetails?.madeIn,
                      "madeIn",
                      true,
                      undefined,
                      undefined,
                      undefined,
                      ["Yes", "No"],
                      undefined,
                      handleStarBusinessChange // Use the correct handler
                    )}
                    {renderField(
                      "Industry",
                      formData.starBusinessDetails?.industry,
                      "industry",
                      true,
                      undefined,
                      undefined,
                      <CogIcon className="w-5 h-5" />,
                      industries,
                      undefined,
                      handleStarBusinessChange // Use the correct handler
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Device <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <CpuChipIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          name="device"
                          value={formData.starBusinessDetails?.device || ""}
                          onChange={(e) =>
                            handleStarBusinessChange("device", e.target.value)
                          }
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
                            formErrors["starBusinessDetails.device"]
                              ? "border-red-500"
                              : "border-gray-200"
                          }`}
                          placeholder="Enter device information"
                          disabled={isViewMode}
                        />
                      </div>
                      {formErrors["starBusinessDetails.device"] && (
                        <p className="mt-1 text-sm text-red-500">
                          {formErrors["starBusinessDetails.device"]}
                        </p>
                      )}
                    </div>

                    {/* Special handling for Checked By field */}
                    {/* <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Checked By{" "}
                          {!isViewMode && <span className="text-red-500">*</span>}
                        </label>
                        {isViewMode ? (
                          <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3">
                            <UserIcon className="w-5 h-5 text-gray-400" />
                            <span className="text-gray-700">
                              {formData.starBusinessDetails?.checkedBy ===
                              "manual"
                                ? "Manual"
                                : formData.starBusinessDetails?.checkedBy === "AI"
                                ? "AI"
                                : "-"}
                            </span>
                          </div>
                        ) : (
                          <div className="relative">
                            <UserIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <select
                              name="starBusinessDetails.checkedBy"
                              value={
                                formData.starBusinessDetails?.checkedBy || ""
                              }
                              onChange={(e) =>
                                handleStarBusinessChange(
                                  "checkedBy",
                                  e.target.value || undefined
                                )
                              }
                              className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all ${
                                formErrors["starBusinessDetails.checkedBy"]
                                  ? "border-red-500"
                                  : "border-gray-200"
                              }`}
                            >
                              <option value="">Select who checked</option>
                              <option value="manual">Manual</option>
                              <option value="AI">AI</option>
                            </select>
                            {formErrors["starBusinessDetails.checkedBy"] && (
                              <p className="mt-1 text-sm text-red-500">
                                {formErrors["starBusinessDetails.checkedBy"]}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {renderField(
                        "Last Checked",
                        formData.starBusinessDetails?.lastChecked,
                        "starBusinessDetails.lastChecked",
                        false,
                        "date",
                        undefined,
                        <CalendarIcon className="w-5 h-5" />
                      )} */}

                    {/* New View-Only Fields in Star Business Details */}
                    {(isEditMode || isViewMode) &&
                      formData.starBusinessDetails?.convertedBy && (
                        <>
                          {renderField(
                            "Converted By",
                            formData.starBusinessDetails.convertedBy,
                            "starBusinessDetails.convertedBy",
                            false,
                            "text",
                            "",
                            <UserIcon className="w-5 h-5" />,
                            undefined,
                            true // Read-only
                          )}
                        </>
                      )}
                    {(isEditMode || isViewMode) &&
                      formData.starBusinessDetails?.converted_timestamp && (
                        <>
                          {renderField(
                            "Converted Timestamp",
                            formData.starBusinessDetails.converted_timestamp,
                            "starBusinessDetails.converted_timestamp",
                            false,
                            "datetime",
                            "",
                            <CalendarIcon className="w-5 h-5" />,
                            undefined,
                            true // Read-only
                          )}
                        </>
                      )}
                  </div>

                  {/* New Editable Comment Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <ChatBubbleLeftIcon className="w-5 h-5" />
                        Comment
                      </div>
                    </label>
                    {isViewMode ? (
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {formData.starBusinessDetails?.comment || "-"}
                        </p>
                      </div>
                    ) : (
                      <textarea
                        name="starBusinessDetails.comment"
                        value={formData.starBusinessDetails?.comment || ""}
                        onChange={(e) =>
                          handleStarBusinessChange("comment", e.target.value)
                        }
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all resize-none"
                        placeholder="Enter any additional comments or notes..."
                      />
                    )}
                  </div>

                  {!isViewMode && formData.isDeviceMaker === "Yes" && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                      <UserGroupIcon className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-medium text-gray-700">
                        Star Customer
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsStarCustomer(!isStarCustomer)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          isStarCustomer ? "bg-yellow-600" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isStarCustomer ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  )}
                  {(isStarCustomer ||
                    (isViewMode && formData.starCustomerEmail)) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {renderField(
                        "Customer Email",
                        formData.starCustomerEmail,
                        "starCustomerEmail",
                        true,
                        "email",
                        "customer@example.com",
                        <EnvelopeIcon className="w-5 h-5" />
                      )}
                      {renderField(
                        "Display Name",
                        formData.displayName,
                        "displayName",
                        false,
                        "text",
                        "Display name (what customers see)"
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Optional Fields Section - Collapsible */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
            {!isViewMode ? (
              <button
                type="button"
                onClick={() => setIsExtraInfoOpen(!isExtraInfoOpen)}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-xl"
              >
                <div className="flex items-center gap-3">
                  <InformationCircleIcon className="w-6 h-6 text-gray-600" />
                  <h2 className="text-xl font-semibold text-gray-800">
                    Extra Information
                  </h2>
                  <span className="text-sm text-gray-500">(Optional)</span>
                </div>
                {isExtraInfoOpen ? (
                  <ChevronUpIcon className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                )}
              </button>
            ) : (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <InformationCircleIcon className="w-6 h-6 text-gray-600" />
                  <h2 className="text-xl font-semibold text-gray-800">
                    Extra Information
                  </h2>
                </div>
              </div>
            )}

            <div
              className={`overflow-hidden transition-all duration-300 ${
                isExtraInfoOpen || isViewMode ? "max-h-[3000px]" : "max-h-0"
              }`}
            >
              <div
                className={`${isViewMode ? "px-6 pb-6" : "p-8 pt-0"} space-y-6`}
              >
                {/* Contact & Location */}
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-4 flex items-center gap-2">
                    <MapPinIcon className="w-5 h-5" />
                    Contact & Location
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderField(
                      "Address",
                      formData.address,
                      "address",
                      false,
                      "text",
                      "123 Main Street"
                    )}
                    {renderField(
                      "State",
                      formData.state,
                      "state",
                      false,
                      "text",
                      "Baden-Württemberg"
                    )}
                    {renderField(
                      "Phone Number",
                      formData.phoneNumber,
                      "phoneNumber",
                      false,
                      "tel",
                      "+1 234 567 8900",
                      <PhoneIcon className="w-5 h-5" />
                    )}
                    {renderField(
                      "Email",
                      formData.email,
                      "email",
                      false,
                      "email",
                      "contact@example.com",
                      <EnvelopeIcon className="w-5 h-5" />
                    )}
                    {renderField(
                      "Latitude",
                      formData.latitude,
                      "latitude",
                      false,
                      "number",
                      "40.7128"
                    )}
                    {renderField(
                      "Longitude",
                      formData.longitude,
                      "longitude",
                      false,
                      "number",
                      "-74.0060"
                    )}
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-4 flex items-center gap-2">
                    <TagIcon className="w-5 h-5" />
                    Categories
                  </h3>
                  <div className="space-y-4">
                    {renderField(
                      "Primary Category",
                      formData.category,
                      "category",
                      false,
                      undefined,
                      undefined,
                      undefined,
                      categories
                    )}

                    {!isViewMode && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Additional Categories
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {categories.map((cat) => (
                            <label
                              key={cat}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={formData.additionalCategories?.includes(
                                  cat
                                )}
                                onChange={() =>
                                  handleAdditionalCategoryToggle(cat)
                                }
                                className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                              />
                              <span className="text-sm text-gray-700">
                                {cat}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {isViewMode &&
                      formData.additionalCategories &&
                      formData.additionalCategories.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Additional Categories
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {formData.additionalCategories.map((cat) => (
                              <span
                                key={cat}
                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* Google Integration */}
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-4 flex items-center gap-2">
                    <MapIcon className="w-5 h-5" />
                    Google Integration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderField(
                      "Google Place ID",
                      formData.googlePlaceId,
                      "googlePlaceId",
                      false,
                      "text",
                      "ChIJN1t_..."
                    )}
                    {renderField(
                      "Google Maps URL",
                      formData.googleMapsUrl,
                      "googleMapsUrl",
                      false,
                      "url",
                      "https://maps.google.com/..."
                    )}
                    {renderField(
                      "Review Count",
                      formData.reviewCount,
                      "reviewCount",
                      false,
                      "number",
                      "150"
                    )}
                    {renderField(
                      "Average Rating",
                      formData.averageRating,
                      "averageRating",
                      false,
                      "number",
                      "4.5"
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  {isViewMode ? (
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {formData.description || "-"}
                      </p>
                    </div>
                  ) : (
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                      placeholder="Enter business description..."
                    />
                  )}
                </div>

                {/* Social Media */}
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-4">
                    Social Media Links
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(formData.socialMedia || {}).map(
                      ([platform, url]) => (
                        <div key={platform}>
                          <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                            {platform}
                          </label>
                          {isViewMode ? (
                            <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                              <span className="text-gray-700">
                                {url || "-"}
                              </span>
                            </div>
                          ) : (
                            <input
                              type="url"
                              value={url}
                              onChange={(e) =>
                                handleSocialMediaChange(
                                  platform,
                                  e.target.value
                                )
                              }
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                              placeholder={`https://${platform}.com/...`}
                            />
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Business Hours */}
                {/* <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-4 flex items-center gap-2">
                    <ClockIcon className="w-5 h-5" />
                    Business Hours
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(formData.businessHours || {}).map(
                      ([day, hours]) => (
                        <div key={day}>
                          <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                            {day}
                          </label>
                          {isViewMode ? (
                            <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                              <span className="text-gray-700">
                                {hours || "Closed"}
                              </span>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={hours}
                              onChange={(e) =>
                                handleBusinessHoursChange(day, e.target.value)
                              }
                              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                              placeholder="9:00 AM - 5:00 PM"
                            />
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div> */}
              </div>
            </div>
          </div>

          {/* Form Actions - Only show in edit/create mode */}
          {!isViewMode && (
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
              >
                {isEditMode ? "Reset Changes" : "Reset Form"}
              </button>

              <CustomButton
                gradient={true}
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    {isEditMode
                      ? "Updating Business..."
                      : "Creating Business..."}
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    {isEditMode ? "Update Business" : "Create Business"}
                  </>
                )}
              </CustomButton>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddEditBusinessManual;

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

interface ExtendedBusinessCreatePayload extends BusinessCreatePayload {
  source?: string;
  isDeviceMaker?: "Yes" | "No" | "Unsure";
}

const AddEditBusinessManual: React.FC = () => {
  const params = useSearchParams();
  const router = useRouter();
  const businessId = params?.get("businessId") as string;
  const isEditMode = !!businessId;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isExtraInfoOpen, setIsExtraInfoOpen] = useState(false);

  const [formData, setFormData] = useState<ExtendedBusinessCreatePayload>({
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

  // Fetch business data if in edit mode
  useEffect(() => {
    if (isEditMode && businessId) {
      fetchBusinessData();
    }
  }, [businessId, isEditMode]);

  const fetchBusinessData = async () => {
    try {
      setIsLoading(true);
      const businessData = await getBusinessById(businessId);

      // Map the business data to form structure
      setFormData({
        name: businessData.companyName || businessData.name || "",
        address:
          businessData.businessDetails?.address || businessData.address || "",
        description:
          businessData.businessDetails?.description ||
          businessData.description ||
          "",
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

      // Auto-open extra info section if there's data in those fields
      if (
        businessData.businessDetails?.description ||
        businessData.businessDetails?.socialLinks ||
        businessData.businessDetails?.businessHours
      ) {
        setIsExtraInfoOpen(true);
      }
    } catch (error) {
      console.error("Error fetching business:", error);
      toast.error("Failed to load business data");
      // Optionally redirect back to list
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

  const sources = [
    "Google",
    "Website",
    "Referral",
    "Social Media",
    "Advertisement",
    "Trade Show",
    "Cold Outreach",
    "Partner",
    "Other",
  ];

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Required fields validation - check for actual content, not just whitespace
    if (!formData.name || !formData.name.trim()) {
      errors.name = "Customer name is required";
    }
    if (!formData.postalCode || !formData.postalCode.trim()) {
      errors.postalCode = "Postal code is required";
    }
    if (!formData.city || !formData.city.trim()) {
      errors.city = "City is required";
    }

    // Check website - required field with URL validation
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

    // Optional fields validation - only validate if they have values
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
    // Website validation is already handled above as a required field

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

    // Scroll to first error if any
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });

      // Log validation errors for debugging
      console.log("Validation errors:", errors);
      console.log("Current form data:", formData);
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
      // Trim the URL first
      const trimmedUrl = url.trim();

      // If it doesn't start with http:// or https://, add https://
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
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
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
      };

      if (isEditMode) {
        // Update existing business
        await updateBusiness(businessId, cleanedData);
      } else {
        const response = await createBusiness(cleanedData);

        handleReset();

        // Optionally redirect to the new business profile
        if (response?.id) {
        } else {
          // Scroll to top after successful submission
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    } catch (error) {
      console.error(
        `Error ${isEditMode ? "updating" : "creating"} business:`,
        error
      );
      toast.error(`Failed to ${isEditMode ? "update" : "create"} business`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (isEditMode) {
      // In edit mode, reset to original data
      fetchBusinessData();
    } else {
      // In create mode, clear all fields
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
    }
    setFormErrors({});
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
              {isEditMode && (
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <h1 className="text-3xl font-semibold text-secondary flex items-center gap-3">
                {isEditMode ? (
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
              {isEditMode
                ? `Update information for ${formData.name || "this business"}`
                : "Enter business information with all details"}
            </p>
          </div>
          {!isEditMode && (
            <div className="flex gap-3">
              <CustomButton
                variant="outlined"
                startIcon={<DocumentPlusIcon className="w-5 h-5" />}
                onClick={() =>
                  (window.location.href = "/businesses/bulk-upload")
                }
              >
                Bulk Import
              </CustomButton>
            </div>
          )}
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Required Fields Section */}
          <div className=" rounded-xl p-8 ">
            <div className="flex items-center gap-3 mb-6">
              <ExclamationTriangleIcon className="w-6 h-6" />
              <h2 className="text-xl font-semibold text-gray-800">
                Required Information
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
                    formErrors.name ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="Enter customer/business name"
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={(e) =>
                    handleInputChange("postalCode", e.target.value)
                  }
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
                    formErrors.postalCode ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="10001"
                />
                {formErrors.postalCode && (
                  <p className="mt-1 text-sm text-red-500">
                    {formErrors.postalCode}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
                    formErrors.city ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="New York"
                />
                {formErrors.city && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.city}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <GlobeAltIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    name="website"
                    value={formData.website}
                    onChange={(e) =>
                      handleInputChange("website", e.target.value)
                    }
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
                      formErrors.website ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder="https://www.example.com"
                  />
                </div>
                {formErrors.website && (
                  <p className="mt-1 text-sm text-red-500">
                    {formErrors.website}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source <span className="text-red-500">*</span>
                </label>
                <select
                  name="source"
                  value={formData.source}
                  onChange={(e) => handleInputChange("source", e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
                    formErrors.source ? "border-red-500" : "border-gray-200"
                  }`}
                >
                  <option value="">Select a source</option>
                  {sources.map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
                </select>
                {formErrors.source && (
                  <p className="mt-1 text-sm text-red-500">
                    {formErrors.source}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Is Device Maker <span className="text-red-500">*</span>
                </label>
                <select
                  name="isDeviceMaker"
                  value={formData.isDeviceMaker || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "isDeviceMaker",
                      e.target.value || undefined
                    )
                  }
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
                    formErrors.isDeviceMaker
                      ? "border-red-500"
                      : "border-gray-200"
                  }`}
                >
                  <option value="">Select an option</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Unsure">Unsure</option>
                </select>
                {formErrors.isDeviceMaker && (
                  <p className="mt-1 text-sm text-red-500">
                    {formErrors.isDeviceMaker}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Optional Fields Section - Collapsible */}
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
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

            {/* Collapsible Content */}
            <div
              className={`overflow-hidden transition-all duration-300 ${
                isExtraInfoOpen ? "max-h-[3000px]" : "max-h-0"
              }`}
            >
              <div className="p-8 pt-0 space-y-8">
                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <PhoneIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={(e) =>
                            handleInputChange("phoneNumber", e.target.value)
                          }
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
                            formErrors.phoneNumber
                              ? "border-red-500"
                              : "border-gray-200"
                          }`}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      {formErrors.phoneNumber && (
                        <p className="mt-1 text-sm text-red-500">
                          {formErrors.phoneNumber}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <EnvelopeIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={(e) =>
                            handleInputChange("email", e.target.value)
                          }
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
                            formErrors.email
                              ? "border-red-500"
                              : "border-gray-200"
                          }`}
                          placeholder="contact@business.com"
                        />
                      </div>
                      {formErrors.email && (
                        <p className="mt-1 text-sm text-red-500">
                          {formErrors.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Coordinates */}
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    Coordinates
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        name="latitude"
                        value={formData.latitude || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "latitude",
                            e.target.value
                              ? parseFloat(e.target.value)
                              : undefined
                          )
                        }
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
                          formErrors.latitude
                            ? "border-red-500"
                            : "border-gray-200"
                        }`}
                        placeholder="40.7128"
                      />
                      {formErrors.latitude && (
                        <p className="mt-1 text-sm text-red-500">
                          {formErrors.latitude}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        name="longitude"
                        value={formData.longitude || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "longitude",
                            e.target.value
                              ? parseFloat(e.target.value)
                              : undefined
                          )
                        }
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
                          formErrors.longitude
                            ? "border-red-500"
                            : "border-gray-200"
                        }`}
                        placeholder="-74.0060"
                      />
                      {formErrors.longitude && (
                        <p className="mt-1 text-sm text-red-500">
                          {formErrors.longitude}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    Additional Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={(e) =>
                          handleInputChange("address", e.target.value)
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="123 Main Street"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State/Province
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={(e) =>
                          handleInputChange("state", e.target.value)
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="NY"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        name="country"
                        value={formData.country}
                        onChange={(e) =>
                          handleInputChange("country", e.target.value)
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="United States"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Category
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={(e) =>
                          handleInputChange("category", e.target.value)
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      >
                        <option value="">Select a category</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={(e) =>
                          handleInputChange("description", e.target.value)
                        }
                        rows={4}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="Enter business description"
                      />
                    </div>
                  </div>
                </div>

                {/* Google Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    Google Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Google Place ID
                      </label>
                      <input
                        type="text"
                        name="googlePlaceId"
                        value={formData.googlePlaceId}
                        onChange={(e) =>
                          handleInputChange("googlePlaceId", e.target.value)
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Google Maps URL
                      </label>
                      <div className="relative">
                        <MapIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="url"
                          name="googleMapsUrl"
                          value={formData.googleMapsUrl}
                          onChange={(e) =>
                            handleInputChange("googleMapsUrl", e.target.value)
                          }
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                          placeholder="https://maps.google.com/..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Average Rating
                      </label>
                      <div className="relative">
                        <StarIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          name="averageRating"
                          value={formData.averageRating || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "averageRating",
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                          placeholder="4.5"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Review Count
                      </label>
                      <input
                        type="number"
                        min="0"
                        name="reviewCount"
                        value={formData.reviewCount || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "reviewCount",
                            e.target.value
                              ? parseInt(e.target.value)
                              : undefined
                          )
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="150"
                      />
                    </div>
                  </div>
                </div>

                {/* Social Media */}
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    Social Media Links
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Facebook
                      </label>
                      <input
                        type="url"
                        value={formData.socialMedia?.facebook || ""}
                        onChange={(e) =>
                          handleSocialMediaChange("facebook", e.target.value)
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="https://facebook.com/yourbusiness"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Instagram
                      </label>
                      <input
                        type="url"
                        value={formData.socialMedia?.instagram || ""}
                        onChange={(e) =>
                          handleSocialMediaChange("instagram", e.target.value)
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="https://instagram.com/yourbusiness"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        LinkedIn
                      </label>
                      <input
                        type="url"
                        value={formData.socialMedia?.linkedin || ""}
                        onChange={(e) =>
                          handleSocialMediaChange("linkedin", e.target.value)
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="https://linkedin.com/company/yourbusiness"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Twitter
                      </label>
                      <input
                        type="url"
                        value={formData.socialMedia?.twitter || ""}
                        onChange={(e) =>
                          handleSocialMediaChange("twitter", e.target.value)
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="https://twitter.com/yourbusiness"
                      />
                    </div>
                  </div>
                </div>

                {/* Business Hours */}
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    Business Hours
                  </h3>
                  <div className="space-y-3">
                    {[
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                      "Sunday",
                    ].map((day) => (
                      <div key={day} className="flex items-center gap-4">
                        <label className="w-28 text-sm font-medium text-gray-700">
                          {day}
                        </label>
                        <input
                          type="text"
                          value={
                            formData.businessHours?.[
                              day.toLowerCase() as keyof typeof formData.businessHours
                            ] || ""
                          }
                          onChange={(e) =>
                            handleBusinessHoursChange(
                              day.toLowerCase(),
                              e.target.value
                            )
                          }
                          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                          placeholder="9:00 AM - 6:00 PM"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleBusinessHoursChange(
                              day.toLowerCase(),
                              "Closed"
                            )
                          }
                          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
                        >
                          Closed
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Categories */}
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    Additional Categories
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {categories
                      .filter((cat) => cat !== formData.category)
                      .map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleAdditionalCategoryToggle(cat)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            formData.additionalCategories?.includes(cat)
                              ? "bg-primary text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
            >
              {isEditMode ? "Reset Changes" : "Reset Form"}
            </button>

            <CustomButton gradient={true} type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  {isEditMode ? "Updating Business..." : "Creating Business..."}
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  {isEditMode ? "Update Business" : "Create Business"}
                </>
              )}
            </CustomButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditBusinessManual;

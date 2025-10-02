"use client";
import React, { useState } from "react";
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
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { createBusiness, BusinessCreatePayload } from "@/api/bussiness";
import CustomButton from "@/components/UI/CustomButton";
import theme from "@/styles/theme";

interface FormErrors {
  [key: string]: string;
}

const AddBusinessManual: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState<BusinessCreatePayload>({
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

  const validateStep = (step: number): boolean => {
    const errors: FormErrors = {};

    if (step === 1) {
      // Basic Information validation
      if (!formData.name.trim()) {
        errors.name = "Business name is required";
      }
      if (!formData.category) {
        errors.category = "Please select a category";
      }
      if (formData.email && !isValidEmail(formData.email)) {
        errors.email = "Invalid email format";
      }
      if (formData.phoneNumber && !isValidPhone(formData.phoneNumber)) {
        errors.phoneNumber = "Invalid phone number format";
      }
      if (formData.website && !isValidUrl(formData.website)) {
        errors.website = "Invalid website URL";
      }
    } else if (step === 2) {
      // Location Information validation
      if (!formData.address.trim()) {
        errors.address = "Address is required";
      }
      if (!formData.city?.trim()) {
        errors.city = "City is required";
      }
      if (!formData.country?.trim()) {
        errors.country = "Country is required";
      }
      if (
        formData.latitude !== undefined &&
        (formData.latitude < -90 || formData.latitude > 90)
      ) {
        errors.latitude = "Latitude must be between -90 and 90";
      }
      if (
        formData.longitude !== undefined &&
        (formData.longitude < -180 || formData.longitude > 180)
      ) {
        errors.longitude = "Longitude must be between -180 and 180";
      }
    }

    setFormErrors(errors);
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
      new URL(url);
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

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    // Validate all steps
    if (!validateStep(1) || !validateStep(2)) {
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

      await createBusiness(cleanedData);

      // Reset form after successful submission
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
      setCurrentStep(1);
      setFormErrors({});
    } catch (error) {
      console.error("Error creating business:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = (currentStep / 4) * 100;

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
            <h1 className="text-3xl font-semibold text-secondary flex items-center gap-3">
              <BuildingStorefrontIcon className="w-8 h-8 text-primary" />
              Add New Business
            </h1>
            <p className="mt-2 text-text-secondary">
              Manually enter business information with all details
            </p>
          </div>
          <div className="flex gap-3">
            <CustomButton
              variant="outlined"
              startIcon={<DocumentPlusIcon className="w-5 h-5" />}
              onClick={() => (window.location.href = "/businesses/bulk-upload")}
            >
              Bulk Import
            </CustomButton>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div
              className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200"
              style={{ zIndex: 0 }}
            />
            <div
              className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
              style={{
                width: `${progressPercentage}%`,
                zIndex: 0,
              }}
            />
            {[
              { step: 1, name: "Basic Info", icon: BuildingOffice2Icon },
              { step: 2, name: "Location", icon: MapPinIcon },
              { step: 3, name: "Online Presence", icon: GlobeAltIcon },
              { step: 4, name: "Additional Details", icon: ClockIcon },
            ].map((item) => (
              <div key={item.step} className="relative z-10 bg-white px-2">
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                      ${
                        currentStep >= item.step
                          ? `bg-[${theme.palette.primary.main}] text-white    shadow-lg scale-110`
                          : "bg-gray-200 text-gray-500"
                      }
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                  </div>
                  <p
                    className={`mt-2 text-sm font-medium ${
                      currentStep >= item.step
                        ? "text-primary"
                        : "text-gray-400"
                    }`}
                  >
                    {item.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-8 border border-gray-100">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <BuildingOffice2Icon className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Basic Information
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
                      formErrors.name ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder="Enter business name"
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-500">
                      {formErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      handleInputChange("category", e.target.value)
                    }
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
                      formErrors.category ? "border-red-500" : "border-gray-200"
                    }`}
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {formErrors.category && (
                    <p className="mt-1 text-sm text-red-500">
                      {formErrors.category}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="Enter business description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <PhoneIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
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
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
                        formErrors.email ? "border-red-500" : "border-gray-200"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <div className="relative">
                    <GlobeAltIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) =>
                        handleInputChange("website", e.target.value)
                      }
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
                        formErrors.website
                          ? "border-red-500"
                          : "border-gray-200"
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
              </div>

              {/* Additional Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Categories
                </label>
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
                            ? `bg-[${theme.palette.primary.main}] text-white`
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <MapPinIcon className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Location Information
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
                      formErrors.address ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder="123 Main Street"
                  />
                  {formErrors.address && (
                    <p className="mt-1 text-sm text-red-500">
                      {formErrors.address}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
                      formErrors.city ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder="New York"
                  />
                  {formErrors.city && (
                    <p className="mt-1 text-sm text-red-500">
                      {formErrors.city}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State/Province
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="NY"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) =>
                      handleInputChange("country", e.target.value)
                    }
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
                      formErrors.country ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder="United States"
                  />
                  {formErrors.country && (
                    <p className="mt-1 text-sm text-red-500">
                      {formErrors.country}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) =>
                      handleInputChange("postalCode", e.target.value)
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="10001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "latitude",
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all ${
                      formErrors.latitude ? "border-red-500" : "border-gray-200"
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
                    value={formData.longitude || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "longitude",
                        e.target.value ? parseFloat(e.target.value) : undefined
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

              {/* Info Box */}
            </div>
          )}

          {/* Step 3: Online Presence */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <GlobeAltIcon className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Online Presence
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google Place ID
                  </label>
                  <input
                    type="text"
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
                    value={formData.reviewCount || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "reviewCount",
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="150"
                  />
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
            </div>
          )}

          {/* Step 4: Business Hours and Additional Details */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <ClockIcon className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-semibold text-gray-800">
                  Business Hours & Additional Details
                </h2>
              </div>

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
                          handleBusinessHoursChange(day.toLowerCase(), "Closed")
                        }
                        className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
                      >
                        Closed
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Summary */}
              <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <CheckCircleIcon className="w-6 h-6 text-primary" />
                  Review Your Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">
                      Business Name:
                    </span>
                    <p className="text-gray-800">
                      {formData.name || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Category:</span>
                    <p className="text-gray-800">
                      {formData.category || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Address:</span>
                    <p className="text-gray-800">
                      {[
                        formData.address,
                        formData.city,
                        formData.state,
                        formData.postalCode,
                        formData.country,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Contact:</span>
                    <p className="text-gray-800">
                      {[formData.phoneNumber, formData.email]
                        .filter(Boolean)
                        .join(", ") || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Website:</span>
                    <p className="text-gray-800">
                      {formData.website || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Status:</span>
                    <p className="text-gray-800">
                      {formData.website ? (
                        <span className="text-green-600 font-medium">
                          Has Website ✓
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">
                          No Website
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between items-center">
          <button
            type="button"
            onClick={() => {
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
              setCurrentStep(1);
              setFormErrors({});
            }}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
          >
            Reset Form
          </button>

          <div className="flex gap-4">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePreviousStep}
                className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
              >
                Previous
              </button>
            )}

            {currentStep < 4 ? (
              <CustomButton
                gradient={true}
                onClick={handleNextStep}
                type="button"
              >
                Next Step
              </CustomButton>
            ) : (
              <CustomButton
                gradient={true}
                onClick={handleSubmit}
                type="button"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Creating Business...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    Create Business
                  </>
                )}
              </CustomButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBusinessManual;

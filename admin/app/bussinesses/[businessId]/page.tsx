"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getBusinessById } from "@/api/bussiness";
import { toast } from "react-hot-toast";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Music,
  Users,
  Layers,
  Monitor,
  Map,
  Star,
  Edit3,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  User,
  Shield,
  ShieldCheck,
  Truck,
  FileText,
  Info,
  Copy,
  ExternalLink,
  ChevronRight,
  Activity,
  TrendingUp,
  Award,
  Briefcase,
  Hash,
  AlertCircle,
  Package,
  Zap,
  Target,
  BarChart3,
  Settings,
  MoreVertical,
  ChevronDown,
} from "lucide-react";
import CustomButton from "@/components/UI/CustomButton";
import { successStyles } from "@/utils/constants";

interface BusinessData {
  id: string;
  stage: "business" | "star_business" | "star_customer";
  companyName: string;
  legalName?: string;
  avatar?: string;
  email: string;
  contactEmail: string;
  contactPhoneNumber: string;
  businessDetails?: any;
  starBusinessDetails?: any;
  starCustomerDetails?: any;
  createdAt: string;
  updatedAt: string;
}

const BusinessProfilePage = () => {
  const params = useParams();
  const businessId = params?.businessId as string;
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (businessId) {
      fetchBusinessData();
    }
  }, [businessId]);

  const fetchBusinessData = async () => {
    try {
      setLoading(true);
      const response = await getBusinessById(businessId);
      setBusiness(response);
      setError(null);
    } catch (err) {
      setError("Failed to load business information");
    } finally {
      setLoading(false);
    }
  };

  const getStageConfig = (stage: string) => {
    const configs: any = {
      business: {
        color: "#2C2C2C",
        bgColor: "bg-[#8CC21B]",
        lightBg: "bg-green-50",
        textColor: "text-[#2C2C2C]",
        borderColor: "border-[#2C2C2C]",
        icon: Building2,
        label: "Business",
      },
      star_business: {
        color: "amber",
        bgColor: "bg-amber-500",
        lightBg: "bg-amber-50",
        textColor: "text-amber-700",
        borderColor: "border-amber-200",
        icon: Star,
        label: "Star Business",
      },
      star_customer: {
        color: "emerald",
        bgColor: "bg-emerald-500",
        lightBg: "bg-emerald-50",
        textColor: "text-emerald-700",
        borderColor: "border-emerald-200",
        icon: Award,
        label: "Star Customer",
      },
    };
    return configs[stage] || configs.business;
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} copied to clipboard`, successStyles);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getSocialIcon = (platform: string) => {
    const icons: { [key: string]: any } = {
      facebook: Facebook,
      twitter: Twitter,
      linkedin: Linkedin,
      instagram: Instagram,
      youtube: Youtube,
      tiktok: Music,
    };
    const Icon = icons[platform.toLowerCase()] || Globe;
    return <Icon className="h-4 w-4" />;
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Info },
    { id: "contact", label: "Contact", icon: Mail },
    { id: "business", label: "Business", icon: Briefcase },
    ...(business?.stage === "star_business" ||
    business?.stage === "star_customer"
      ? [{ id: "star_business", label: "Star Business", icon: Star }]
      : []),
    ...(business?.stage === "star_customer"
      ? [{ id: "star_customer", label: "Star Customer", icon: Award }]
      : []),
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-gray-200 border-t-[#8CC21B] animate-spin mx-auto"></div>
          </div>
          <p className="mt-4 text-gray-600">Loading business profile...</p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-red-100 p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Unable to Load Business
            </h3>
            <p className="text-gray-600">{error || "Business not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  const stageConfig = getStageConfig(business.stage);
  const StageIcon = stageConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simplified Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="py-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Businesses</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-gray-900 font-medium">
                  {business.companyName}
                </span>
              </div>
              <CustomButton
                gradient={true}
                onClick={() =>
                  (window.location.href = `/bussinesses/new?businessId=${businessId}`)
                }
                className="px-4 py-2 text-sm"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </CustomButton>
            </div>
          </div>

          {/* Business Header - Simplified */}
          <div className="py-6">
            <div className="flex items-center space-x-4">
              {/* Avatar */}
              <div className="relative">
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-[#8CC21B] to-[#7AAF19] flex items-center justify-center text-white text-2xl font-semibold shadow-sm">
                  {business.avatar ? (
                    <img
                      src={business.avatar}
                      alt={business.companyName}
                      className="h-full w-full rounded-xl object-cover"
                    />
                  ) : (
                    business.companyName?.[0]?.toUpperCase()
                  )}
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 h-6 w-6 ${stageConfig.bgColor} rounded-full flex items-center justify-center border-2 border-white`}
                >
                  <StageIcon className="h-3 w-3 text-white" />
                </div>
              </div>

              {/* Company Info - Streamlined */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                      {business.companyName}
                    </h1>
                    {business.legalName && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {business.legalName}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 ${stageConfig.lightBg} ${stageConfig.textColor} rounded-full text-xs font-medium flex items-center space-x-1`}
                  >
                    <StageIcon className="h-3 w-3" />
                    <span>{stageConfig.label}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Bar - Minimal */}
            <div className="mt-6 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  business.stage === "star_customer"
                    ? "bg-emerald-500 w-full"
                    : business.stage === "star_business"
                    ? "bg-amber-500 w-2/3"
                    : "bg-[#8CC21B] w-1/3"
                }`}
              />
            </div>
          </div>

          {/* Simplified Tabs */}
          <div className="flex space-x-6 border-t border-gray-100">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 border-b-2 -mb-px transition-all text-sm font-medium ${
                    activeTab === tab.id
                      ? "border-[#8CC21B] text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area - Cleaner Layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab - Simplified */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Key Info Cards - Minimalist */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-5 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Layers className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Category</p>
                    <p className="font-medium text-gray-900">
                      {business.businessDetails?.category || "Not specified"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-5 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="font-medium text-gray-900">
                      {business.businessDetails?.city || "Not specified"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-5 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Employees</p>
                    <p className="font-medium text-gray-900">
                      {business.businessDetails?.employeeCount ||
                        "Not specified"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description Card - Clean */}
            {business.businessDetails?.description && (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  About
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {business.businessDetails.description}
                </p>
              </div>
            )}

            {/* Quick Details Grid */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-700 mb-4">
                Quick Details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Industry</p>
                  <p className="text-sm font-medium text-gray-900">
                    {business.businessDetails?.industry || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Source</p>
                  <p className="text-sm font-medium text-gray-900">
                    {business.businessDetails?.businessSource ||
                      "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Reviews</p>
                  <p className="text-sm font-medium text-gray-900">
                    {business.businessDetails?.reviewCount || "0"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Device Maker</p>
                  <p className="text-sm font-medium text-gray-900">
                    {business.businessDetails?.isDeviceMaker || "No"}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline - Minimal */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-700 mb-4">
                Activity
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-gray-600">Created</span>
                  <span className="text-gray-900 font-medium">
                    {new Date(business.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span className="text-gray-600">Last Updated</span>
                  <span className="text-gray-900 font-medium">
                    {new Date(business.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Tab - Streamlined */}
        {activeTab === "contact" && (
          <div className="space-y-6">
            {/* Primary Contact Card */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-medium text-gray-900">
                  Contact Information
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-3 px-3 rounded-lg transition-colors">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Primary Email</p>
                      <p className="text-sm font-medium text-gray-900">
                        {business.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(business.email, "Email")}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    {copiedField === "Email" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-3 px-3 rounded-lg transition-colors">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Contact Email</p>
                      <p className="text-sm font-medium text-gray-900">
                        {business.contactEmail}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(business.contactEmail, "Contact Email")
                    }
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    {copiedField === "Contact Email" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-3 px-3 rounded-lg transition-colors">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Phone Number</p>
                      <p className="text-sm font-medium text-gray-900">
                        {business.contactPhoneNumber}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(business.contactPhoneNumber, "Phone")
                    }
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    {copiedField === "Phone" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>

                {business.businessDetails?.website && (
                  <div className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-3 px-3 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Website</p>
                        <a
                          href={business.businessDetails.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-[#8CC21B] hover:underline"
                        >
                          {business.businessDetails.website}
                        </a>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Location Card - Simple */}
            {business.businessDetails && (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-medium text-gray-900">
                    Location
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3 text-sm">
                    {business.businessDetails.address && (
                      <p className="text-gray-600">
                        {business.businessDetails.address}
                      </p>
                    )}
                    <p className="text-gray-600">
                      {[
                        business.businessDetails.city,
                        business.businessDetails.state,
                        business.businessDetails.postalCode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {business.businessDetails.country && (
                      <p className="text-gray-600">
                        {business.businessDetails.country}
                      </p>
                    )}
                  </div>
                  {business.businessDetails.googleMapsUrl && (
                    <a
                      href={business.businessDetails.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                    >
                      <Map className="h-4 w-4" />
                      <span>View on Maps</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Business Details Tab - Organized */}
        {activeTab === "business" && business.businessDetails && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-medium text-gray-900">
                  Business Information
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Source</p>
                    <p className="text-sm font-medium text-gray-900">
                      {business.businessDetails.businessSource ||
                        "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Category</p>
                    <p className="text-sm font-medium text-gray-900">
                      {business.businessDetails.category || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Industry</p>
                    <p className="text-sm font-medium text-gray-900">
                      {business.businessDetails.industry || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Employees</p>
                    <p className="text-sm font-medium text-gray-900">
                      {business.businessDetails.employeeCount ||
                        "Not specified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Reviews</p>
                    <p className="text-sm font-medium text-gray-900">
                      {business.businessDetails.reviewCount || "0"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Device Maker</p>
                    <p className="text-sm font-medium text-gray-900">
                      {business.businessDetails.isDeviceMaker || "No"}
                    </p>
                  </div>
                </div>

                {business.businessDetails.description && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Description</p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {business.businessDetails.description}
                    </p>
                  </div>
                )}

                {business.businessDetails.additionalCategories &&
                  business.businessDetails.additionalCategories.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-3">
                        Additional Categories
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {business.businessDetails.additionalCategories.map(
                          (cat: string) => (
                            <span
                              key={cat}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                            >
                              {cat}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* Star Business Tab - Clean */}
        {activeTab === "star_business" && business.starBusinessDetails && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-medium text-gray-900">
                  Star Business Details
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  {business.starBusinessDetails.inSeries && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        In Series Production
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {business.starBusinessDetails.inSeries}
                      </p>
                    </div>
                  )}
                  {business.starBusinessDetails.madeIn && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Made In</p>
                      <p className="text-sm font-medium text-gray-900">
                        {business.starBusinessDetails.madeIn}
                      </p>
                    </div>
                  )}
                  {business.starBusinessDetails.device && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Device Type</p>
                      <p className="text-sm font-medium text-gray-900">
                        {business.starBusinessDetails.device}
                      </p>
                    </div>
                  )}
                  {business.starBusinessDetails.industry && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Industry Sector
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {business.starBusinessDetails.industry}
                      </p>
                    </div>
                  )}
                </div>

                {business.starBusinessDetails.lastChecked && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Last Verification
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(
                            business.starBusinessDetails.lastChecked
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      {business.starBusinessDetails.checkedBy && (
                        <span className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          <Shield className="h-3 w-3" />
                          <span>
                            {business.starBusinessDetails.checkedBy.toUpperCase()}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Star Customer Tab - Simplified */}
        {activeTab === "star_customer" && business.starCustomerDetails && (
          <div className="space-y-6">
            {/* Verification Status */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-medium text-gray-900">
                  Verification Status
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    {business.starCustomerDetails.isEmailVerified ? (
                      <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    ) : (
                      <XCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    )}
                    <p className="text-xs text-gray-600">Email</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    {business.starCustomerDetails.isPhoneVerified ? (
                      <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    ) : (
                      <XCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    )}
                    <p className="text-xs text-gray-600">Phone</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg col-span-2">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      {business.starCustomerDetails
                        .accountVerificationStatus === "verified" ? (
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                      ) : business.starCustomerDetails
                          .accountVerificationStatus === "pending" ? (
                        <Clock className="h-8 w-8 text-yellow-500" />
                      ) : (
                        <XCircle className="h-8 w-8 text-gray-300" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
                      Account{" "}
                      {business.starCustomerDetails.accountVerificationStatus}
                    </p>
                  </div>
                </div>

                {business.starCustomerDetails.taxNumber && (
                  <div className="pb-4 border-b border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Tax Number</p>
                    <p className="text-sm font-medium text-gray-900">
                      {business.starCustomerDetails.taxNumber}
                    </p>
                  </div>
                )}

                {business.starCustomerDetails.verificationRemark && (
                  <div className="mt-4 p-4 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <span className="font-medium">Note:</span>{" "}
                      {business.starCustomerDetails.verificationRemark}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Address */}
            {(business.starCustomerDetails.deliveryAddressLine1 ||
              business.starCustomerDetails.deliveryCity) && (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-medium text-gray-900">
                    Delivery Address
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-1 text-sm text-gray-600">
                    {business.starCustomerDetails.deliveryAddressLine1 && (
                      <p>{business.starCustomerDetails.deliveryAddressLine1}</p>
                    )}
                    {business.starCustomerDetails.deliveryAddressLine2 && (
                      <p>{business.starCustomerDetails.deliveryAddressLine2}</p>
                    )}
                    {(business.starCustomerDetails.deliveryCity ||
                      business.starCustomerDetails.deliveryPostalCode) && (
                      <p>
                        {[
                          business.starCustomerDetails.deliveryCity,
                          business.starCustomerDetails.deliveryPostalCode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                    {business.starCustomerDetails.deliveryCountry && (
                      <p className="font-medium text-gray-900">
                        {business.starCustomerDetails.deliveryCountry}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Simple Footer */}
      <div className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>ID: {business.id}</span>
            <span>
              Last updated: {new Date(business.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessProfilePage;

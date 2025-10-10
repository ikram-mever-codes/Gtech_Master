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
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "contact", label: "Contact", icon: Mail },
    { id: "business", label: "Business Details", icon: Briefcase },
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-20 w-20 rounded-full border-4 border-slate-200 border-t-[#212529] animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-slate-400" />
            </div>
          </div>
          <p className="mt-4 text-slate-600 font-medium">
            Loading business profile...
          </p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start space-x-3">
            <AlertCircle className="h-6 w-6 text-red-600 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">
                Error Loading Business
              </h3>
              <p className="text-red-700 mt-1">
                {error || "Business not found"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stageConfig = getStageConfig(business.stage);
  const StageIcon = stageConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            {/* Top Bar with Actions */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-slate-500">Businesses</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
                <span className="text-slate-900 font-medium">
                  {business.companyName}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <CustomButton
                  gradient={true}
                  onClick={() =>
                    (window.location.href = `/bussinesses/new?businessId=${businessId}`)
                  }
                  className="px-4 py-2 bg-[#8CC21B] text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-sm"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Edit Business</span>
                </CustomButton>
              </div>
            </div>

            {/* Main Header */}
            <div className="flex items-start space-x-6">
              {/* Avatar */}
              <div className="relative">
                <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {business.avatar ? (
                    <img
                      src={business.avatar}
                      alt={business.companyName}
                      className="h-full w-full rounded-2xl object-cover"
                    />
                  ) : (
                    business.companyName?.[0]?.toUpperCase()
                  )}
                </div>
                <div
                  className={`absolute -bottom-2 -right-2 h-8 w-8 ${stageConfig.bgColor} rounded-full flex items-center justify-center border-2 border-white shadow-md`}
                >
                  <StageIcon className="h-4 w-4 text-white" />
                </div>
              </div>

              {/* Company Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  {business.companyName}
                </h1>
                {business.legalName && (
                  <p className="text-slate-600 mb-3">
                    Legal Name:{" "}
                    <span className="font-medium">{business.legalName}</span>
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`px-3 py-1.5 ${stageConfig.lightBg} ${stageConfig.textColor} rounded-full text-sm font-medium flex items-center space-x-1.5`}
                  >
                    <StageIcon className="h-3.5 w-3.5" />
                    <span>{stageConfig.label}</span>
                  </span>
                  {business.businessDetails?.isDeviceMaker === "Yes" && (
                    <span className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium flex items-center space-x-1.5">
                      <Monitor className="h-3.5 w-3.5" />
                      <span>Device Maker</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">
                    {business.businessDetails?.reviewCount || "0"}
                  </div>
                  <div className="text-sm text-slate-600">Reviews</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">
                    {business.businessDetails?.employeeCount || "N/A"}
                  </div>
                  <div className="text-sm text-slate-600">Employees</div>
                </div>
              </div>
            </div>

            {/* Stage Progress */}
            <div className="mt-8 bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-[#8CC21B] flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <span className="ml-2 text-sm font-medium text-slate-900">
                      Business
                    </span>
                  </div>
                  <div className="h-0.5 w-16 bg-slate-300"></div>
                  <div className="flex items-center">
                    <div
                      className={`h-8 w-8 rounded-full ${
                        business.stage !== "business"
                          ? "bg-amber-600"
                          : "bg-slate-300"
                      } flex items-center justify-center`}
                    >
                      {business.stage !== "business" ? (
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      ) : (
                        <XCircle className="h-5 w-5 text-slate-500" />
                      )}
                    </div>
                    <span className="ml-2 text-sm font-medium text-slate-900">
                      Star Business
                    </span>
                  </div>
                  <div className="h-0.5 w-16 bg-slate-300"></div>
                  <div className="flex items-center">
                    <div
                      className={`h-8 w-8 rounded-full ${
                        business.stage === "star_customer"
                          ? "bg-emerald-600"
                          : "bg-slate-300"
                      } flex items-center justify-center`}
                    >
                      {business.stage === "star_customer" ? (
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      ) : (
                        <XCircle className="h-5 w-5 text-slate-500" />
                      )}
                    </div>
                    <span className="ml-2 text-sm font-medium text-slate-900">
                      Star Customer
                    </span>
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  Progress:{" "}
                  <span className="font-medium">
                    {business.stage === "star_customer"
                      ? "100%"
                      : business.stage === "star_business"
                      ? "66%"
                      : "33%"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 border-t border-slate-200 -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 border-b-2 transition-colors flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? "broder-[#2C2C2C] text-[#2C2C2C]"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Key Metrics */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Activity className="h-6 w-6 text-[#2C2C2C]" />
                    </div>
                    <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">
                      Active
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Active</h3>
                  <p className="text-sm text-slate-600 mt-1">Business Status</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Layers className="h-6 w-6 text-purple-600" />
                    </div>
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {business.businessDetails?.category || "N/A"}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Primary Category
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-12 w-12 rounded-lg bg-amber-50 flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {business.businessDetails?.city || "N/A"}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">Location</p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {new Date(business.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">Added On</p>
                </div>
              </div>
            </div>

            {/* Quick Info Card */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <Info className="h-5 w-5 mr-2 text-slate-600" />
                Quick Information
              </h2>
              <div className="space-y-4">
                {business.businessDetails?.description && (
                  <div className="pb-4 border-b border-slate-100">
                    <h3 className="text-sm font-medium text-slate-600 mb-2">
                      Description
                    </h3>
                    <p className="text-slate-900 leading-relaxed">
                      {business.businessDetails.description}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Business Source</p>
                    <p className="font-medium text-slate-900">
                      {business.businessDetails?.businessSource || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Industry</p>
                    <p className="font-medium text-slate-900">
                      {business.businessDetails?.industry || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Website</p>
                    {business.businessDetails?.website ? (
                      <a
                        href={business.businessDetails.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-[#2C2C2C]  flex items-center space-x-1"
                      >
                        <span>Visit Website</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="font-medium text-slate-900">N/A</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Email Verified</p>
                    <div className="flex items-center space-x-1">
                      {business.starCustomerDetails?.isEmailVerified ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="font-medium text-emerald-600">
                            Verified
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-600">
                            Not Verified
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-slate-600" />
                Recent Activity
              </h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="h-2 w-2 rounded-full bg-[#8CC21B] mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Profile Updated
                    </p>
                    <p className="text-xs text-slate-600">
                      {new Date(business.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-600 mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      Account Created
                    </p>
                    <p className="text-xs text-slate-600">
                      {new Date(business.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {business.starBusinessDetails?.lastChecked && (
                  <div className="flex items-start space-x-3">
                    <div className="h-2 w-2 rounded-full bg-amber-600 mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        Last Verification
                      </p>
                      <p className="text-xs text-slate-600">
                        {new Date(
                          business.starBusinessDetails.lastChecked
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Contact Tab */}
        {activeTab === "contact" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Primary Contact */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                <User className="h-5 w-5 mr-2 text-slate-600" />
                Primary Contact Information
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-slate-600" />
                    <div>
                      <p className="text-xs text-slate-600">Email</p>
                      <p className="font-medium text-slate-900">
                        {business.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(business.email, "Email")}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    {copiedField === "Email" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-600" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-slate-600" />
                    <div>
                      <p className="text-xs text-slate-600">Contact Email</p>
                      <p className="font-medium text-slate-900">
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
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-600" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-slate-600" />
                    <div>
                      <p className="text-xs text-slate-600">Contact Phone</p>
                      <p className="font-medium text-slate-900">
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
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Business Contact */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-slate-600" />
                Business Contact Information
              </h2>
              <div className="space-y-4">
                {business.businessDetails?.contactPhone && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-slate-600" />
                      <div>
                        <p className="text-xs text-slate-600">Business Phone</p>
                        <p className="font-medium text-slate-900">
                          {business.businessDetails.contactPhone}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          business.businessDetails.contactPhone,
                          "Business Phone"
                        )
                      }
                      className="p-2 hover:bg-white rounded-lg transition-colors"
                    >
                      {copiedField === "Business Phone" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-slate-600" />
                      )}
                    </button>
                  </div>
                )}

                {business.businessDetails?.email && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-slate-600" />
                      <div>
                        <p className="text-xs text-slate-600">Business Email</p>
                        <p className="font-medium text-slate-900">
                          {business.businessDetails.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          business.businessDetails.email,
                          "Business Email"
                        )
                      }
                      className="p-2 hover:bg-white rounded-lg transition-colors"
                    >
                      {copiedField === "Business Email" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-slate-600" />
                      )}
                    </button>
                  </div>
                )}

                {business.businessDetails?.website && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-slate-600" />
                      <div>
                        <p className="text-xs text-slate-600">Website</p>
                        <a
                          href={business.businessDetails.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[#2C2C2C]  flex items-center space-x-1"
                        >
                          <span>{business.businessDetails.website}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Location Information */}
            {business.businessDetails && (
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-slate-600" />
                  Location Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    {business.businessDetails.address && (
                      <div>
                        <p className="text-sm text-slate-600">Street Address</p>
                        <p className="font-medium text-slate-900">
                          {business.businessDetails.address}
                        </p>
                      </div>
                    )}
                    {business.businessDetails.city && (
                      <div>
                        <p className="text-sm text-slate-600">City</p>
                        <p className="font-medium text-slate-900">
                          {business.businessDetails.city}
                        </p>
                      </div>
                    )}
                    {business.businessDetails.state && (
                      <div>
                        <p className="text-sm text-slate-600">State/Province</p>
                        <p className="font-medium text-slate-900">
                          {business.businessDetails.state}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {business.businessDetails.country && (
                      <div>
                        <p className="text-sm text-slate-600">Country</p>
                        <p className="font-medium text-slate-900">
                          {business.businessDetails.country}
                        </p>
                      </div>
                    )}
                    {business.businessDetails.postalCode && (
                      <div>
                        <p className="text-sm text-slate-600">Postal Code</p>
                        <p className="font-medium text-slate-900">
                          {business.businessDetails.postalCode}
                        </p>
                      </div>
                    )}
                    {business.businessDetails.googleMapsUrl && (
                      <div>
                        <a
                          href={business.businessDetails.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 text-[#2C2C2C] rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Map className="h-4 w-4" />
                          <span className="font-medium">View on Maps</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Business Details Tab */}
        {activeTab === "business" && business.businessDetails && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Business Information */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                <Briefcase className="h-5 w-5 mr-2 text-slate-600" />
                Business Information
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Business Source</p>
                  <p className="font-medium text-slate-900">
                    {business.businessDetails.businessSource || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">
                    Primary Category
                  </p>
                  <p className="font-medium text-slate-900">
                    {business.businessDetails.category || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Industry</p>
                  <p className="font-medium text-slate-900">
                    {business.businessDetails.industry || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Employee Count</p>
                  <p className="font-medium text-slate-900">
                    {business.businessDetails.employeeCount || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Review Count</p>
                  <p className="font-medium text-slate-900">
                    {business.businessDetails.reviewCount || "0"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Device Maker</p>
                  <div className="mt-1">
                    {business.businessDetails.isDeviceMaker === "Yes" ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Yes</span>
                      </span>
                    ) : business.businessDetails.isDeviceMaker === "No" ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-1 bg-red-50 text-red-700 rounded-full text-sm">
                        <XCircle className="h-3 w-3" />
                        <span>No</span>
                      </span>
                    ) : (
                      <span className="text-slate-900">N/A</span>
                    )}
                  </div>
                </div>
              </div>

              {business.businessDetails.description && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <p className="text-sm text-slate-600 mb-2">Description</p>
                  <p className="text-slate-900 leading-relaxed whitespace-pre-wrap">
                    {business.businessDetails.description}
                  </p>
                </div>
              )}
            </div>

            {/* Additional Categories & Social */}
            <div className="space-y-6">
              {business.businessDetails.additionalCategories &&
                business.businessDetails.additionalCategories.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                      <Layers className="h-5 w-5 mr-2 text-slate-600" />
                      Additional Categories
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {business.businessDetails.additionalCategories.map(
                        (cat: string) => (
                          <span
                            key={cat}
                            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium"
                          >
                            {cat}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

              {business.businessDetails.socialLinks && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Social Media
                  </h3>
                  <div className="space-y-3">
                    {/* {Object.entries(business?.businessDetails?.socialLinks).map(
                      ([platform, url]) =>
                        url && (
                          <a
                            key={platform}
                            href={url as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            {getSocialIcon(platform)}
                            <span className="font-medium text-slate-900 capitalize">
                              {platform}
                            </span>
                            <ExternalLink className="h-3 w-3 text-slate-600 ml-auto" />
                          </a>
                        )
                    )} */}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Star Business Tab */}
        {activeTab === "star_business" && business.starBusinessDetails && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                <Package className="h-5 w-5 mr-2 text-amber-600" />
                Manufacturing Information
              </h2>
              <div className="space-y-4">
                {business.starBusinessDetails.inSeries && (
                  <div className="pb-4 border-b border-slate-100">
                    <p className="text-sm text-slate-600 mb-1">
                      In Series Production
                    </p>
                    <p className="font-medium text-slate-900">
                      {business.starBusinessDetails.inSeries}
                    </p>
                  </div>
                )}
                {business.starBusinessDetails.madeIn && (
                  <div className="pb-4 border-b border-slate-100">
                    <p className="text-sm text-slate-600 mb-1">Made In</p>
                    <p className="font-medium text-slate-900">
                      {business.starBusinessDetails.madeIn}
                    </p>
                  </div>
                )}
                {business.starBusinessDetails.device && (
                  <div className="pb-4 border-b border-slate-100">
                    <p className="text-sm text-slate-600 mb-1">Device Type</p>
                    <p className="font-medium text-slate-900">
                      {business.starBusinessDetails.device}
                    </p>
                  </div>
                )}
                {business.starBusinessDetails.industry && (
                  <div>
                    <p className="text-sm text-slate-600 mb-1">
                      Industry Sector
                    </p>
                    <p className="font-medium text-slate-900">
                      {business.starBusinessDetails.industry}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                <ShieldCheck className="h-5 w-5 mr-2 text-amber-600" />
                Verification Status
              </h2>
              <div className="space-y-4">
                {business.starBusinessDetails.lastChecked && (
                  <div className="pb-4 border-b border-slate-100">
                    <p className="text-sm text-slate-600 mb-1">Last Checked</p>
                    <p className="font-medium text-slate-900">
                      {new Date(
                        business.starBusinessDetails.lastChecked
                      ).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
                {business.starBusinessDetails.checkedBy && (
                  <div>
                    <p className="text-sm text-slate-600 mb-2">
                      Verification Method
                    </p>
                    <span
                      className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                        business.starBusinessDetails.checkedBy === "manual"
                          ? "bg-blue-50 text-[#2C2C2C]"
                          : "bg-purple-50 text-purple-700"
                      }`}
                    >
                      <Shield className="h-3.5 w-3.5" />
                      <span>
                        {business.starBusinessDetails.checkedBy.toUpperCase()}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Star Customer Tab */}
        {activeTab === "star_customer" && business.starCustomerDetails && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Account Verification */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                <ShieldCheck className="h-5 w-5 mr-2 text-emerald-600" />
                Account Verification
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Tax Number</p>
                  <p className="font-medium text-slate-900">
                    {business.starCustomerDetails.taxNumber || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-2">Account Status</p>
                  <span
                    className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                      business.starCustomerDetails.accountVerificationStatus ===
                      "verified"
                        ? "bg-emerald-50 text-emerald-700"
                        : business.starCustomerDetails
                            .accountVerificationStatus === "pending"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {business.starCustomerDetails.accountVerificationStatus ===
                    "verified" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : business.starCustomerDetails
                        .accountVerificationStatus === "pending" ? (
                      <Clock className="h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {business.starCustomerDetails.accountVerificationStatus.toUpperCase()}
                    </span>
                  </span>
                </div>
              </div>

              {business.starCustomerDetails.verificationRemark && (
                <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-800">
                    <strong>Verification Note:</strong>{" "}
                    {business.starCustomerDetails.verificationRemark}
                  </p>
                </div>
              )}

              <div className="mt-6 flex items-center space-x-4">
                <div
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                    business.starCustomerDetails.isEmailVerified
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-50 text-slate-600"
                  }`}
                >
                  {business.starCustomerDetails.isEmailVerified ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    Email{" "}
                    {business.starCustomerDetails.isEmailVerified
                      ? "Verified"
                      : "Not Verified"}
                  </span>
                </div>
                <div
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                    business.starCustomerDetails.isPhoneVerified
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-50 text-slate-600"
                  }`}
                >
                  {business.starCustomerDetails.isPhoneVerified ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    Phone{" "}
                    {business.starCustomerDetails.isPhoneVerified
                      ? "Verified"
                      : "Not Verified"}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                <Truck className="h-5 w-5 mr-2 text-emerald-600" />
                Delivery Address
              </h2>
              <div className="space-y-3">
                {business.starCustomerDetails.deliveryAddressLine1 && (
                  <p className="text-slate-900">
                    {business.starCustomerDetails.deliveryAddressLine1}
                  </p>
                )}
                {business.starCustomerDetails.deliveryAddressLine2 && (
                  <p className="text-slate-900">
                    {business.starCustomerDetails.deliveryAddressLine2}
                  </p>
                )}
                {(business.starCustomerDetails.deliveryCity ||
                  business.starCustomerDetails.deliveryPostalCode) && (
                  <p className="text-slate-900">
                    {business.starCustomerDetails.deliveryCity}{" "}
                    {business.starCustomerDetails.deliveryPostalCode}
                  </p>
                )}
                {business.starCustomerDetails.deliveryCountry && (
                  <p className="text-slate-900 font-medium">
                    {business.starCustomerDetails.deliveryCountry}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-slate-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>
                  Created:{" "}
                  {new Date(business.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>
                  Updated:{" "}
                  {new Date(business.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Hash className="h-4 w-4" />
              <span className="font-mono">{business.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessProfilePage;

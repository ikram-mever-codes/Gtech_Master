"use client";
import React, { useState, useCallback, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  DocumentArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  ChartBarIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import {
  CheckIcon,
  XMarkIcon as XMarkSolidIcon,
} from "@heroicons/react/24/solid";
import { toast } from "react-hot-toast";
import { bulkImportBusinesses, BusinessCreatePayload } from "@/api/bussiness";
import CustomButton from "@/components/UI/CustomButton";
import theme from "@/styles/theme";

interface ParsedBusiness extends BusinessCreatePayload {
  rowIndex: number;
  validationErrors?: string[];
  isValid?: boolean;
  hasWebsite?: boolean;
}

const BusinessBulkUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedBusinesses, setParsedBusinesses] = useState<ParsedBusiness[]>(
    []
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "valid" | "invalid" | "no_website"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const itemsPerPage = 15;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      parseAndProcessCSV(uploadedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
      "text/plain": [".csv"],
    },
    maxFiles: 1,
  });

  const parseAndProcessCSV = (file: File) => {
    setIsProcessing(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log("Parsed CSV results:", results);

        const filteredData = results.data.filter((row: any) => {
          const hasData = Object.values(row).some(
            (value) => value && String(value).trim() !== ""
          );
          return hasData;
        });

        const processedBusinesses = processData(
          filteredData,
          results.meta.fields || []
        );
        setParsedBusinesses(processedBusinesses);
        setIsProcessing(false);
        setCurrentStep(2);

        const validCount = processedBusinesses.filter(
          (b) => b.isValid && b.website
        ).length;
        const invalidCount = processedBusinesses.filter(
          (b) => !b.isValid
        ).length;
        const noWebsiteCount = processedBusinesses.filter(
          (b) => b.isValid && !b.website
        ).length;

        toast.success(
          `Processed ${processedBusinesses.length} records: ${validCount} valid, ${noWebsiteCount} without website, ${invalidCount} invalid`
        );
      },
      error: (error) => {
        console.error("CSV parsing error:", error);
        toast.error(`CSV parsing error: ${error.message}`);
        setIsProcessing(false);
      },
    });
  };

  const processData = (csvData: any[], headers: string[]): ParsedBusiness[] => {
    const processedBusinesses: ParsedBusiness[] = [];

    csvData.forEach((row, index) => {
      const business: any = { rowIndex: index + 1 };
      const errors: string[] = [];

      headers.forEach((header) => {
        const value = row[header];
        if (!value || value === "") return;

        const normalizedHeader = header
          .toLowerCase()
          .trim()
          .replace(/[_\s]+/g, "");

        if (
          normalizedHeader === "name" ||
          normalizedHeader.includes("businessname")
        ) {
          business.name = value;
        } else if (
          normalizedHeader === "fulladdress" ||
          normalizedHeader === "address"
        ) {
          business.address = value;
        } else if (normalizedHeader === "street" && !business.address) {
          business.address = value;
        } else if (
          normalizedHeader === "website" ||
          normalizedHeader === "url"
        ) {
          business.website = value;
        } else if (normalizedHeader === "domain" && !business.website) {
          business.website = value.startsWith("http")
            ? value
            : `https://${value}`;
        } else if (
          normalizedHeader === "emails" ||
          normalizedHeader === "email"
        ) {
          business.email = value;
        } else if (
          normalizedHeader === "phone" ||
          normalizedHeader.includes("phone")
        ) {
          business.phoneNumber = value;
        } else if (
          normalizedHeader === "municipality" ||
          normalizedHeader === "city"
        ) {
          business.city = value;
        } else if (
          normalizedHeader === "categories" ||
          normalizedHeader === "category"
        ) {
          business.category = value;
        } else if (normalizedHeader === "latitude") {
          const lat = parseFloat(value);
          if (!isNaN(lat)) business.latitude = lat;
        } else if (normalizedHeader === "longitude") {
          const lng = parseFloat(value);
          if (!isNaN(lng)) business.longitude = lng;
        } else if (normalizedHeader.includes("rating")) {
          const rating = parseFloat(value);
          if (!isNaN(rating)) business.averageRating = rating;
        } else if (normalizedHeader.includes("review")) {
          const count = parseFloat(value);
          if (!isNaN(count)) business.reviewCount = count;
        } else if (normalizedHeader.includes("placeid")) {
          business.googlePlaceId = value;
        } else if (normalizedHeader.includes("mapsurl")) {
          business.googleMapsUrl = value;
        }
      });

      // Extract postal code from municipality
      if (business.city && !business.postalCode) {
        const cityMatch = business.city.match(/^(\d{5})\s+(.+)$/);
        if (cityMatch) {
          business.postalCode = cityMatch[1];
          business.city = cityMatch[2];
        }
      }

      // Set default country
      if (
        !business.country &&
        business.address &&
        business.address.includes("Germany")
      ) {
        business.country = "Germany";
      }

      // Basic validation for display purposes only
      if (!business.name || business.name.trim() === "") {
        errors.push("Business name is required");
      }
      if (!business.address || business.address.trim() === "") {
        errors.push("Address is required");
      }

      business.isValid = errors.length === 0;
      business.hasWebsite = !!business.website;
      business.validationErrors = errors;

      processedBusinesses.push(business);
    });

    return processedBusinesses;
  };

  const handleBulkUpload = async () => {
    // Filter to only include valid businesses with websites
    const businessesToUpload = parsedBusinesses.filter(
      (b) => b.isValid && b.website
    );

    // If using row selection, only include selected valid businesses with websites
    const selectedBusinessesToUpload =
      selectedRows.size > 0
        ? parsedBusinesses.filter(
            (b) => selectedRows.has(b.rowIndex) && b.isValid && b.website
          )
        : businessesToUpload;

    const finalBusinessesToUpload =
      selectedRows.size > 0 ? selectedBusinessesToUpload : businessesToUpload;

    if (finalBusinessesToUpload.length === 0) {
      toast.error("No valid businesses with websites to upload");
      return;
    }

    setIsUploading(true);
    try {
      const payload = {
        businesses: finalBusinessesToUpload.map(
          ({ rowIndex, isValid, validationErrors, hasWebsite, ...business }) =>
            business
        ),
      };

      const result = await bulkImportBusinesses(payload);

      // Show success message with counts
      const invalidCount = parsedBusinesses.filter((b) => !b.isValid).length;
      const noWebsiteCount = parsedBusinesses.filter(
        (b) => b.isValid && !b.website
      ).length;

      toast.success(
        `Successfully uploaded ${finalBusinessesToUpload.length} valid businesses with websites` +
          (invalidCount > 0
            ? ` (${invalidCount} invalid records ignored)`
            : "") +
          (noWebsiteCount > 0
            ? ` (${noWebsiteCount} businesses without websites ignored)`
            : "")
      );

      setFile(null);
      setParsedBusinesses([]);
      setCurrentStep(1);
      setSelectedRows(new Set());
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload businesses");
    } finally {
      setIsUploading(false);
    }
  };

  const filteredBusinesses = useMemo(() => {
    let filtered = parsedBusinesses;

    if (searchTerm) {
      filtered = filtered.filter((business) =>
        Object.values(business).some((value) =>
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (filterStatus === "valid") {
      filtered = filtered.filter((b) => b.isValid && b.website);
    } else if (filterStatus === "invalid") {
      filtered = filtered.filter((b) => !b.isValid);
    } else if (filterStatus === "no_website") {
      filtered = filtered.filter((b) => b.isValid && !b.website);
    }

    return filtered;
  }, [parsedBusinesses, searchTerm, filterStatus]);

  const paginatedBusinesses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBusinesses.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBusinesses, currentPage]);

  const totalPages = Math.ceil(filteredBusinesses.length / itemsPerPage);

  const statistics = useMemo(() => {
    const total = parsedBusinesses.length;
    const valid = parsedBusinesses.filter((b) => b.isValid && b.website).length;
    const invalid = parsedBusinesses.filter((b) => !b.isValid).length;
    const noWebsite = parsedBusinesses.filter(
      (b) => b.isValid && !b.website
    ).length;
    return { total, valid, invalid, noWebsite };
  }, [parsedBusinesses]);

  const handleSelectAll = () => {
    if (selectedRows.size === filteredBusinesses.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredBusinesses.map((b) => b.rowIndex)));
    }
  };

  const handleSelectRow = (rowIndex: number) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(rowIndex)) {
      newSelection.delete(rowIndex);
    } else {
      newSelection.add(rowIndex);
    }
    setSelectedRows(newSelection);
  };

  const downloadTemplate = () => {
    const headers = [
      "Name",
      "Full Address",
      "Municipality",
      "Categories",
      "Phone",
      "Website",
      "Domain",
      "Email",
      "Latitude",
      "Longitude",
      "Google Maps Url",
    ];
    const template = headers.join(",");
    const blob = new Blob([template + "\n"], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "business-import-template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetUpload = () => {
    setFile(null);
    setParsedBusinesses([]);
    setCurrentStep(1);
    setSelectedRows(new Set());
    setSearchTerm("");
    setFilterStatus("all");
    setCurrentPage(1);
  };

  return (
    <div className="w-full  mx-auto">
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
              <SparklesIcon className="w-8 h-8 text-primary" />
              Business Data Import
            </h1>
            <p className="mt-2 text-text-secondary">
              Bulk import business data from CSV files
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div
              className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200"
              style={{ zIndex: 0 }}
            />
            <div
              className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
              style={{
                width: currentStep === 2 ? "100%" : "0%",
                zIndex: 0,
              }}
            />
            {[
              { step: 1, name: "Upload CSV", icon: CloudArrowUpIcon },
              { step: 2, name: "Review & Import", icon: CheckCircleIcon },
            ].map((item) => (
              <div key={item.step} className="relative z-10 bg-white px-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                        ${
                          currentStep >= item.step
                            ? "bg-gradient-to-r from-primary to-primary-600  shadow-lg scale-110"
                            : `bg-[${theme.palette.primary.main}] text-black`
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

        {/* Step 1: File Upload */}
        {currentStep === 1 && (
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-8 border border-gray-100">
            <div
              {...getRootProps()}
              className={`
                    relative border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-all duration-300
                    ${
                      isDragActive
                        ? "border-primary bg-primary-50 scale-[1.02]"
                        : "border-gray-300 hover:border-primary hover:bg-gray-50"
                    }
                `}
            >
              <input {...getInputProps()} />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent rounded-xl pointer-events-none" />
              <CloudArrowUpIcon className="w-20 h-20 mx-auto text-primary mb-4" />
              <p className="text-2xl font-semibold text-gray-700 mb-2">
                {isDragActive
                  ? "Drop your CSV file here"
                  : "Drag & drop your CSV file"}
              </p>
              <p className="text-gray-500 mb-4">
                or click to browse from your computer
              </p>
              <p className="text-sm text-gray-400">
                Supported format: CSV (.csv) • Max size: 10MB
              </p>
            </div>

            {file && (
              <div className="mt-6 p-5 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <DocumentTextIcon className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{file.name}</p>
                    <p className="text-sm text-gray-600">
                      {(file.size / 1024).toFixed(2)} KB • Ready to process
                    </p>
                  </div>
                </div>
                <CustomButton
                  startIcon={<XMarkIcon className="w-5 h-5 text-gray-500" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    resetUpload();
                  }}
                ></CustomButton>
              </div>
            )}

            {isProcessing && (
              <div className="mt-6 flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-gray-200 rounded-full" />
                  <div className="absolute top-0 w-16 h-16 border-4 border-primary rounded-full animate-spin border-t-transparent" />
                </div>
                <span className="mt-4 text-gray-600 font-medium">
                  Processing your CSV file...
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Review and Upload */}
        {currentStep === 2 && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-6 border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">
                      Total Records
                    </p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">
                      {statistics.total}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                    <ChartBarIcon className="w-7 h-7 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-white rounded-xl p-6 border border-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 text-sm font-medium">
                      Valid with Website
                    </p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">
                      {statistics.valid}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircleIcon className="w-7 h-7 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-6 border border-amber-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-600 text-sm font-medium">
                      No Website
                    </p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">
                      {statistics.noWebsite}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-7 h-7 text-amber-600" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-white rounded-xl p-6 border border-red-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-600 text-sm font-medium">Invalid</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">
                      {statistics.invalid}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center">
                    <XMarkIcon className="w-7 h-7 text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Info Message */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 mb-6 border border-blue-100">
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="w-6 h-6 text-blue-600 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1">
                    All records will be uploaded to the backend
                  </p>
                  <p>
                    Invalid entries will be marked but still imported for data
                    completeness. You can review and fix them later.
                  </p>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Filters and Search */}
              <div className="p-6 border-b border-gray-100 bg-gray-50">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search businesses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                  </div>
                  <div className="flex gap-2">
                    {[
                      {
                        value: "all",
                        label: "All",
                        count: statistics.total,
                        color: "gray",
                      },
                      {
                        value: "valid",
                        label: "Valid",
                        count: statistics.valid,
                        color: "green",
                      },
                      {
                        value: "no_website",
                        label: "No Website",
                        count: statistics.noWebsite,
                        color: "amber",
                      },
                      {
                        value: "invalid",
                        label: "Invalid",
                        count: statistics.invalid,
                        color: "red",
                      },
                    ].map((filter) => (
                      <button
                        key={filter.value}
                        onClick={() => setFilterStatus(filter.value as any)}
                        className={`px-4 py-2.5 rounded-lg transition-all font-medium ${
                          filterStatus === filter.value
                            ? `bg-${filter.color}-500 text-white shadow-md`
                            : `bg-white text-gray-600 border border-gray-200 hover:bg-gray-50`
                        }`}
                      >
                        {filter.label} ({filter.count})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="p-4">
                        <input
                          type="checkbox"
                          checked={
                            selectedRows.size === filteredBusinesses.length &&
                            filteredBusinesses.length > 0
                          }
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Row
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Business Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Website
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Issues
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedBusinesses.map((business) => (
                      <tr
                        key={business.rowIndex}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(business.rowIndex)}
                            onChange={() => handleSelectRow(business.rowIndex)}
                            className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {business.rowIndex}
                        </td>
                        <td className="px-4 py-3">
                          {business.isValid && business.website ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                              <CheckIcon className="w-3.5 h-3.5" />
                              Valid
                            </span>
                          ) : business.isValid && !business.website ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                              <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                              No Website
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                              <XMarkSolidIcon className="w-3.5 h-3.5" />
                              Invalid
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">
                            {business.name || "-"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {business.category ? (
                            <span className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 rounded-md font-medium">
                              {business.category}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="flex flex-col">
                            <span>{business.city || "-"}</span>
                            {business.postalCode && (
                              <span className="text-xs text-gray-400">
                                {business.postalCode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {business.phoneNumber || business.email || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {business.website ? (
                            <a
                              href={business.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              <span className="truncate max-w-[150px]">
                                {business.website}
                              </span>
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {business.validationErrors &&
                          business.validationErrors.length > 0 ? (
                            <div className="space-y-1">
                              {business.validationErrors.map((error, idx) => (
                                <p key={idx} className="text-xs text-red-600">
                                  • {error}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <span className="text-green-600 font-medium">
                              ✓ None
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(
                      currentPage * itemsPerPage,
                      filteredBusinesses.length
                    )}{" "}
                    of {filteredBusinesses.length} entries
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1.5 rounded-lg transition-all ${
                            currentPage === page
                              ? "bg-primary text-white shadow-md"
                              : "border border-gray-200 hover:bg-white"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex justify-between items-center">
              <button
                onClick={resetUpload}
                type="button"
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
              >
                Start Over
              </button>
              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  type="button"
                  className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
                >
                  Back
                </button>
                <CustomButton
                  gradient={true}
                  onClick={handleBulkUpload}
                  type="button"
                  disabled={isUploading || parsedBusinesses.length === 0}
                >
                  {isUploading ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      Uploading{" "}
                      {selectedRows.size > 0
                        ? selectedRows.size
                        : parsedBusinesses.length}{" "}
                      Records...
                    </>
                  ) : (
                    <>
                      <ArrowUpTrayIcon className="w-5 h-5" />
                      Upload{" "}
                      {selectedRows.size > 0
                        ? `${selectedRows.size} Selected`
                        : `All ${parsedBusinesses.length}`}{" "}
                      Records
                    </>
                  )}
                </CustomButton>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BusinessBulkUpload;

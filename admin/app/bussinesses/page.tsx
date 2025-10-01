"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  GlobeAltIcon,
  PhoneIcon,
  EnvelopeIcon,
  StarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import {
  CheckIcon,
  XMarkIcon as XMarkSolidIcon,
} from "@heroicons/react/24/solid";
import { toast } from "react-hot-toast";
import {
  getAllBusinesses,
  exportBusinessesToCSV,
  Business,
  SearchFilters,
} from "@/api/bussiness";
import { useRouter } from "next/navigation";
import CustomButton from "@/components/UI/CustomButton";

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
}

const BusinessSearchPage: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedBusinesses, setSelectedBusinesses] = useState<Set<string>>(
    new Set()
  );
  const itemsPerPage = 30;

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
  });

  const [categories, setCategories] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const router = useRouter();

  // Debounced search function
  const debouncedSearch = useCallback((searchFilters: SearchFilters) => {
    fetchBusinesses(searchFilters);
  }, []);

  const fetchBusinesses = async (customFilters?: SearchFilters) => {
    setLoading(true);
    try {
      const searchFilters: SearchFilters = customFilters || {
        page: currentPage,
        limit: itemsPerPage,
        search: filters.search,
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
      };

      const response = await getAllBusinesses(searchFilters);

      if (response && response.data) {
        setBusinesses(response.data.businesses || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalRecords(response.data.total || 0);

        // Extract unique values for filters
        if (response.data.businesses) {
          const uniqueCategories: any = [
            ...new Set(
              response.data.businesses
                .map((b: Business) => b.category)
                .filter(Boolean)
            ),
          ];
          const uniqueCities: any = [
            ...new Set(
              response.data.businesses
                .map((b: Business) => b.city)
                .filter(Boolean)
            ),
          ];
          const uniqueCountries: any = [
            ...new Set(
              response.data.businesses
                .map((b: Business) => b.country)
                .filter(Boolean)
            ),
          ];

          setCategories(uniqueCategories);
          setCities(uniqueCities);
          setCountries(uniqueCountries);
        }
      }
    } catch (error) {
      console.error("Error fetching businesses:", error);
      toast.error("Failed to load businesses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, [currentPage]);

  useEffect(() => {
    const searchFilters: SearchFilters = {
      page: 1,
      limit: itemsPerPage,
      search: filters.search,
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
    };

    setCurrentPage(1);
    debouncedSearch(searchFilters);
  }, [filters]);

  const handleSelectAll = () => {
    if (selectedBusinesses.size === businesses.length) {
      setSelectedBusinesses(new Set());
    } else {
      setSelectedBusinesses(new Set(businesses.map((b) => b.id)));
    }
  };

  const handleSelectBusiness = (id: string) => {
    const newSelection = new Set(selectedBusinesses);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedBusinesses(newSelection);
  };

  const handleExport = async () => {
    return router.push("/bussinesses/import");
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
    });
  };

  const getStatusBadge = (business: Business) => {
    if (business.status === "active" && business.hasWebsite) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
          <CheckIcon className="w-3.5 h-3.5" />
          Active
        </span>
      );
    } else if (business.status === "active" && !business.hasWebsite) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
          No Website
        </span>
      );
    } else if (business.status === "inactive") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
          Inactive
        </span>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-[85vw] mx-auto">
      <div
        className="bg-white rounded-lg shadow-sm pb-8 p-6"
        style={{
          border: "1px solid #e0e0e0",
          background: "linear-gradient(to bottom, #ffffff, #f9f9f9)",
        }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-secondary flex items-center gap-3">
              <BuildingOfficeIcon className="w-8 h-8 text-primary" />
              Business Directory
            </h1>
            <p className="mt-2 text-text-secondary">
              Search and manage {totalRecords.toLocaleString()} businesses
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                showFilters
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <FunnelIcon className="w-5 h-5" />
              Filters
            </button>
            <CustomButton gradient={true} onClick={handleExport}>
              <ArrowDownTrayIcon className="w-5 h-5" />
              Import CSV
            </CustomButton>
            <button
              onClick={() => fetchBusinesses()}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
            >
              <ArrowPathIcon className="w-5 h-5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="w-6 h-6 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by business name, address, email, phone..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-gray-700 placeholder-gray-400"
            />
            {filters.search && (
              <button
                onClick={() => setFilters({ ...filters, search: "" })}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-6 mb-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <AdjustmentsHorizontalIcon className="w-5 h-5 text-primary" />
                Advanced Filters
              </h3>
              <button
                onClick={resetFilters}
                className="text-sm text-primary hover:text-primary-600 font-medium"
              >
                Reset All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Location Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Postal Code
                </label>
                <input
                  type="text"
                  placeholder="Enter postal code"
                  value={filters.postalCode}
                  onChange={(e) =>
                    setFilters({ ...filters, postalCode: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  City
                </label>
                <select
                  value={filters.city}
                  onChange={(e) =>
                    setFilters({ ...filters, city: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Cities</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Country
                </label>
                <select
                  value={filters.country}
                  onChange={(e) =>
                    setFilters({ ...filters, country: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Countries</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              {/* Business Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) =>
                    setFilters({ ...filters, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Has Website
                </label>
                <select
                  value={filters.hasWebsite}
                  onChange={(e) =>
                    setFilters({ ...filters, hasWebsite: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All</option>
                  <option value="yes">With Website</option>
                  <option value="no">No Website</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="no_website">No Website</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Min Rating
                </label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.5"
                  placeholder="0"
                  value={filters.minRating}
                  onChange={(e) =>
                    setFilters({ ...filters, minRating: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Max Rating
                </label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.5"
                  placeholder="5"
                  value={filters.maxRating}
                  onChange={(e) =>
                    setFilters({ ...filters, maxRating: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {/* Active Filters Display */}
            {Object.entries(filters).some(([key, value]) => value) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(filters).map(([key, value]) => {
                  if (!value) return null;
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                    >
                      {key}: {value}
                      <button
                        onClick={() => setFilters({ ...filters, [key]: "" })}
                        className="ml-1 hover:text-primary-900"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-5 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">
                  Total Businesses
                </p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {businesses.length}
                </p>
              </div>
              <BuildingOfficeIcon className="w-10 h-10 text-blue-500 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-white rounded-xl p-5 border border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">
                  With Website
                </p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {businesses.filter((b) => b.hasWebsite).length}
                </p>
              </div>
              <GlobeAltIcon className="w-10 h-10 text-green-500 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-5 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">
                  Categories
                </p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {categories.length}
                </p>
              </div>
              <ChartBarIcon className="w-10 h-10 text-purple-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-20 flex justify-center items-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary" />
                <p className="mt-4 text-gray-600">Loading businesses...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto w-full">
                <table className="w-max">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="p-4">
                        <input
                          type="checkbox"
                          checked={
                            selectedBusinesses.size === businesses.length &&
                            businesses.length > 0
                          }
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Business Info
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Website
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Rating
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y w-max   divide-gray-100">
                    {businesses.map((business) => (
                      <tr
                        key={business.id}
                        className="hover:bg-gray-50 w-max transition-colors"
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedBusinesses.has(business.id)}
                            onChange={() => handleSelectBusiness(business.id)}
                            className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium w-[200px] text-gray-900">
                              {business.name}
                            </p>
                            {business.description && (
                              <p className="text-sm text-gray-500 mt-1 truncate max-w-xs">
                                {business.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <p className="text-gray-900 w-[200px]">
                              {business.address}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm space-y-1">
                            {business.phoneNumber && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <PhoneIcon className="w-4 h-4" />
                                <span>{business.phoneNumber}</span>
                              </div>
                            )}
                            {business.email && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <EnvelopeIcon className="w-4 h-4" />
                                <span className="truncate max-w-[150px]">
                                  {business.email}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 w-[250px] ">
                          {business.category && (
                            <span className="px-3 py-2 text-xs    bg-blue-50 text-blue-700 rounded-md font-medium">
                              {business.category}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {business.website ? (
                            <a
                              href={business.website}
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
                        <td className="px-4 py-3">
                          {business.averageRating ? (
                            <div className="flex items-center gap-1">
                              <StarIcon className="w-4 h-4 text-amber-500 fill-current" />
                              <span className="font-medium">
                                {Number(business?.averageRating)?.toFixed(1)}
                              </span>
                              {business.reviewCount && (
                                <span className="text-xs text-gray-500">
                                  ({business.reviewCount})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(business)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {/* <button
                              onClick={() =>
                                window.open(
                                  `/businesses/${business.id}`,
                                  "_blank"
                                )
                              }
                              className="text-primary hover:text-primary-600"
                              title="View Details"
                            >
                              View
                            </button>
                            <button
                              onClick={() =>
                                window.open(
                                  `/businesses/${business.id}/edit`,
                                  "_blank"
                                )
                              }
                              className="text-gray-600 hover:text-gray-800"
                              title="Edit"
                            >
                              Edit
                            </button> */}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
                    {totalRecords} businesses
                  </p>
                  {selectedBusinesses.size > 0 && (
                    <span className="text-sm font-medium text-primary">
                      {selectedBusinesses.size} selected
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>

                  <div className="flex gap-1">
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
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
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
    </div>
  );
};

export default BusinessSearchPage;

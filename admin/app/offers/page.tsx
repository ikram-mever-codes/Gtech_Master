"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowPathIcon,
  PlusIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  FunnelIcon,
  LinkIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { BadgePercent } from "lucide-react";
import PageHeader from "@/components/UI/PageHeader";
import CustomButton from "@/components/UI/CustomButton";
import CustomModal from "@/components/UI/CustomModal";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import {
  getAllOffers,
  createOfferFromInquiry,
  createOfferFromItem,
  createOfferFromCustomer,
  formatCurrency,
  getOfferStatuses,
  getOfferStatusColor,
  getAvailableCurrencies,
  type Offer,
  type OfferSearchFilters,
} from "@/api/offers";
import { getAllInquiries, type Inquiry } from "@/api/inquiry";
import { getAllCustomers } from "@/api/customers";
import { formatDate } from "@/utils/offers";
import { Customer } from "../inquiry/page";
import { errorStyles } from "@/utils/constants";
import OfferDetailModal from "@/components/Offers/OfferDetailModal";
import { getItems } from "@/api/items";

type SourceType = "inquiry" | "item" | "customer";

const getInputClass = (hasValue: boolean, isEmptySelect = false) =>
  `w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${
    hasValue
      ? "font-bold text-emerald-600 border-emerald-500 bg-emerald-50/20"
      : isEmptySelect
        ? "text-gray-400 border-gray-300 bg-white"
        : "text-gray-900 border-gray-300 bg-white"
  }`;

const OffersPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.user);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const itemsPerPage = 20;

  const [filters, setFilters] = useState<OfferSearchFilters>({
    search: "",
    status: "",
    page: 1,
    limit: 20,
  });

  // Detail modal (single popup for everything)
  const [detailOfferId, setDetailOfferId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [sourceType, setSourceType] = useState<SourceType>("inquiry");
  const [creating, setCreating] = useState(false);

  // Source data
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<any[]>([]);

  // Create selections
  const [filterCustomerId, setFilterCustomerId] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [sourceSearch, setSourceSearch] = useState("");

  const [form, setForm] = useState<any>({
    title: "",
    currency: "EUR",
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    useUnitPrices: false,
    unitPriceDecimalPlaces: 3,
    totalPriceDecimalPlaces: 2,
    maxUnitPriceColumns: 3,
  });

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllOffers(filters);
      if (res.success) {
        setOffers(res.data);
        setTotalRecords(res.pagination?.total || res.data.length);
        setTotalPages(res.pagination?.pages || 1);
      }
    } catch (e) {
      console.error("Error fetching offers:", e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchSources = async () => {
    try {
      const [inqRes, custRes, itemRes]: any = await Promise.all([
        getAllInquiries({ limit: 1000 }),
        getAllCustomers({ limit: 1000 }),
        getItems({ limit: 1000 }).catch(() => ({ data: [] })),
      ]);

      const inq = Array.isArray(inqRes?.data)
        ? inqRes.data
        : inqRes?.data?.inquiries || [];
      setInquiries(inq);

      setCustomers(
        Array.isArray(custRes?.data)
          ? custRes.data
          : custRes?.data?.customers || custRes?.data?.businesses || [],
      );

      setItems(
        Array.isArray(itemRes?.data)
          ? itemRes.data
          : itemRes?.data?.items || [],
      );
    } catch (e) {
      console.error("Error fetching sources:", e);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  useEffect(() => {
    fetchSources();
  }, []);

  // --- Create flow ---------------------------------------------------------
  const openCreate = () => {
    setSourceType("inquiry");
    setFilterCustomerId("");
    setSourceSearch("");
    setSelectedInquiry(null);
    setSelectedItem(null);
    setSelectedCustomer(null);
    setForm({
      title: "",
      currency: "EUR",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      useUnitPrices: false,
      unitPriceDecimalPlaces: 3,
      totalPriceDecimalPlaces: 2,
      maxUnitPriceColumns: 3,
    });
    setShowCreate(true);
  };

  const canCreate = () => {
    if (!form.title?.trim()) return false;
    if (sourceType === "inquiry") return !!selectedInquiry;
    if (sourceType === "item") return !!selectedItem;
    if (sourceType === "customer") return !!selectedCustomer;
    return false;
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      let res: any;
      const common = {
        title: form.title,
        currency: form.currency,
        validUntil: form.validUntil,
        useUnitPrices: form.useUnitPrices,
        unitPriceDecimalPlaces: form.unitPriceDecimalPlaces,
        totalPriceDecimalPlaces: form.totalPriceDecimalPlaces,
        maxUnitPriceColumns: form.maxUnitPriceColumns,
      };

      if (sourceType === "inquiry") {
        if (!selectedInquiry)
          return toast.error("Select an inquiry.", errorStyles);
        res = await createOfferFromInquiry(selectedInquiry.id, common);
      } else if (sourceType === "item") {
        if (!selectedItem) return toast.error("Select an item.", errorStyles);
        res = await createOfferFromItem(String(selectedItem.id), {
          ...common,
          // Prefer the item's own customer; fall back to the filter selection.
          customerId:
            selectedItem.customer_id ||
            selectedItem.customer?.id ||
            filterCustomerId ||
            undefined,
        });
      } else {
        if (!selectedCustomer)
          return toast.error("Select a customer.", errorStyles);
        res = await createOfferFromCustomer(
          String(selectedCustomer.id),
          common,
        );
      }

      if (res?.success) {
        toast.success("Offer created");
        setShowCreate(false);
        setFilters((p) => ({ ...p, page: 1 }));
        fetchOffers();
        // Open the new offer straight into the detail modal.
        if (res.data?.id) {
          setDetailOfferId(res.data.id);
          setShowDetail(true);
        }
      }
    } catch (e) {
      console.error("Error creating offer:", e);
      toast.error("Couldn't create the offer.", errorStyles);
    } finally {
      setCreating(false);
    }
  };

  const openDetail = (offer: Offer) => {
    setDetailOfferId(offer.id);
    setShowDetail(true);
  };

  // Filtered source lists for the create modal
  const visibleInquiries = inquiries.filter((i) => {
    const matchCust = filterCustomerId
      ? (i as any).customer?.id === filterCustomerId
      : true;
    const matchSearch = sourceSearch
      ? i.name?.toLowerCase().includes(sourceSearch.toLowerCase())
      : true;
    return matchCust && matchSearch;
  });

  const visibleItems = items.filter((it) => {
    const matchCust = filterCustomerId
      ? String(it.customer_id || it.customer?.id) === filterCustomerId
      : true;
    const name = it.item_name || it.itemName || "";
    const matchSearch = sourceSearch
      ? name.toLowerCase().includes(sourceSearch.toLowerCase()) ||
        String(it.ean || "").includes(sourceSearch)
      : true;
    return matchCust && matchSearch;
  });

  const visibleCustomers = customers.filter((c) => {
    const name = (c as any).companyName || (c as any).displayName || "";
    return sourceSearch
      ? name.toLowerCase().includes(sourceSearch.toLowerCase())
      : true;
  });

  const sourceTabs: {
    key: SourceType;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "inquiry",
      label: "From inquiry",
      icon: <LinkIcon className="h-4 w-4" />,
    },
    { key: "item", label: "From item", icon: <CubeIcon className="h-4 w-4" /> },
    {
      key: "customer",
      label: "From customer",
      icon: <BuildingOfficeIcon className="h-4 w-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-white shadow-xl rounded-lg p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <PageHeader title="Offers" icon={BadgePercent} />
          <div className="flex gap-2">
            <CustomButton
              onClick={fetchOffers}
              disabled={loading}
              gradient
              size="small"
              startIcon={
                <ArrowPathIcon
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              }
            >
              Refresh
            </CustomButton>
            <CustomButton
              gradient
              onClick={openCreate}
              size="small"
              startIcon={<PlusIcon className="h-4 w-4" />}
            >
              New offer
            </CustomButton>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 p-3 bg-white border border-gray-200 rounded-md shadow-sm">
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 w-full">
            <FunnelIcon className="w-5 h-5 text-primary shrink-0" />
            <div className="w-64 shrink-0">
              <input
                type="text"
                placeholder="Search offers…"
                value={filters.search || ""}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value, page: 1 })
                }
                className={getInputClass(!!filters.search)}
              />
            </div>
            <div className="w-48 shrink-0">
              <select
                value={filters.status || ""}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value, page: 1 })
                }
                className={getInputClass(!!filters.status, !filters.status)}
              >
                <option value="">All statuses</option>
                {getOfferStatuses().map((s: any) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() =>
                setFilters({ ...filters, search: "", status: "", page: 1 })
              }
              className="px-3 py-2 text-sm font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center gap-3">
                <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-500" />
                <span className="text-gray-600">Loading offers…</span>
              </div>
            </div>
          ) : offers.length === 0 ? (
            <div className="p-8 text-center">
              <DocumentTextIcon className="h-10 w-10 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No offers found</p>
              <p className="text-gray-500 text-sm mt-2">
                Create one from an inquiry, an item, or a customer.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Offer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status &amp; expiry
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {offers.map((offer: any) => (
                    <tr
                      key={offer.id}
                      onClick={() => openDetail(offer)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {offer.offerNumber}
                          {offer.revision > 1 && (
                            <span className="ml-2 text-xs text-gray-500">
                              Rev. {offer.revision}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 truncate max-w-[16rem]">
                          {offer.title}
                        </div>
                        <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                          Created {formatDate(offer.createdAt)}
                          {offer.useUnitPrices && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-800 rounded">
                              Unit pricing
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[12rem]">
                            {offer.customerSnapshot?.companyName}
                          </div>
                        </div>
                        {offer.customerSnapshot?.vatId && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            VAT: {offer.customerSnapshot.vatId}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm font-bold text-gray-900">
                          {formatCurrency(
                            offer.totalAmount || 0,
                            offer.currency,
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {offer.lineItems?.filter((li: any) => !li.isComponent)
                            .length || 0}{" "}
                          items
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-center">
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${getOfferStatusColor(
                              offer.status,
                            )}`}
                          >
                            {offer.status}
                          </span>
                          {offer.validUntil && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <CalendarIcon className="h-3 w-3 text-gray-500" />
                              {formatDate(offer.validUntil)}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {(currentPage - 1) * itemsPerPage + 1}–
                {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
                {totalRecords}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const p = Math.max(1, currentPage - 1);
                    setCurrentPage(p);
                    setFilters({ ...filters, page: p });
                  }}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => {
                        setCurrentPage(p);
                        setFilters({ ...filters, page: p });
                      }}
                      className={`px-2 py-1 text-sm rounded-lg ${
                        currentPage === p
                          ? "bg-gray-600 text-white"
                          : "bg-white border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => {
                    const p = Math.min(totalPages, currentPage + 1);
                    setCurrentPage(p);
                    setFilters({ ...filters, page: p });
                  }}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================ CREATE MODAL ============================ */}
      <CustomModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create new offer"
        width="max-w-2xl"
      >
        <div className="space-y-4">
          {/* Source tabs */}
          <div className="grid grid-cols-3 gap-2">
            {sourceTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setSourceType(t.key);
                  setSourceSearch("");
                  setSelectedInquiry(null);
                  setSelectedItem(null);
                  setSelectedCustomer(null);
                }}
                className={`flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all ${
                  sourceType === t.key
                    ? "border-primary bg-primary/5 text-primary font-semibold"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Filter / search row */}
          <div className="grid grid-cols-2 gap-3">
            {sourceType !== "customer" && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Filter by customer
                </label>
                <select
                  value={filterCustomerId}
                  onChange={(e) => setFilterCustomerId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="">All customers</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName || c.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className={sourceType === "customer" ? "col-span-2" : ""}>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                value={sourceSearch}
                onChange={(e) => setSourceSearch(e.target.value)}
                placeholder={
                  sourceType === "inquiry"
                    ? "Search inquiries…"
                    : sourceType === "item"
                      ? "Search items or EAN…"
                      : "Search customers…"
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Source list */}
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {sourceType === "inquiry" &&
              (visibleInquiries.length === 0 ? (
                <Empty label="No inquiries match." />
              ) : (
                visibleInquiries.map((inq) => (
                  <SelectableRow
                    key={inq.id}
                    selected={selectedInquiry?.id === inq.id}
                    onClick={() => {
                      setSelectedInquiry(inq);
                      setForm((f: any) => ({ ...f, title: inq.name }));
                    }}
                    title={inq.name}
                    subtitle={`Customer: ${(inq as any).customer?.companyName || "—"}`}
                    meta={`${inq.requests?.length || 0} items · ${
                      inq.isAssembly ? "Assembly" : "Standard"
                    }`}
                  />
                ))
              ))}

            {sourceType === "item" &&
              (visibleItems.length === 0 ? (
                <Empty label="No items match." />
              ) : (
                visibleItems.map((it) => (
                  <SelectableRow
                    key={it.id}
                    selected={String(selectedItem?.id) === String(it.id)}
                    onClick={() => {
                      setSelectedItem(it);
                      setForm((f: any) => ({
                        ...f,
                        title: `Offer for ${it.item_name || it.itemName}`,
                      }));
                    }}
                    title={it.item_name || it.itemName}
                    subtitle={
                      it.customer?.companyName
                        ? `Customer: ${it.customer.companyName}`
                        : it.ean
                          ? `EAN: ${it.ean}`
                          : `Item ${it.id}`
                    }
                    meta={it.model || ""}
                  />
                ))
              ))}

            {sourceType === "customer" &&
              (visibleCustomers.length === 0 ? (
                <Empty label="No customers match." />
              ) : (
                visibleCustomers.map((c: any) => (
                  <SelectableRow
                    key={c.id}
                    selected={String(selectedCustomer?.id) === String(c.id)}
                    onClick={() => {
                      setSelectedCustomer(c);
                      setForm((f: any) => ({
                        ...f,
                        title: `Offer for ${c.companyName || c.displayName}`,
                      }));
                    }}
                    title={c.companyName || c.displayName}
                    subtitle={c.customerNumber ? `No. ${c.customerNumber}` : ""}
                    meta={c.city || ""}
                  />
                ))
              ))}
          </div>

          {/* Common offer fields */}
          {(selectedInquiry || selectedItem || selectedCustomer) && (
            <div className="space-y-4 border-t pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offer title *
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  placeholder="e.g., Offer for Product XYZ"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={form.currency}
                    onChange={(e) =>
                      setForm({ ...form, currency: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    {getAvailableCurrencies().map((c: any) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid until
                  </label>
                  <input
                    type="date"
                    value={form.validUntil}
                    onChange={(e) =>
                      setForm({ ...form, validUntil: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Unit pricing config */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    Unit pricing
                  </span>
                  <button
                    onClick={() =>
                      setForm({ ...form, useUnitPrices: !form.useUnitPrices })
                    }
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      form.useUnitPrices ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        form.useUnitPrices ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                {form.useUnitPrices && (
                  <div className="grid grid-cols-3 gap-3">
                    <LabeledSelect
                      label="Unit decimals"
                      value={form.unitPriceDecimalPlaces}
                      onChange={(v) =>
                        setForm({ ...form, unitPriceDecimalPlaces: v })
                      }
                    />
                    <LabeledSelect
                      label="Total decimals"
                      value={form.totalPriceDecimalPlaces}
                      onChange={(v) =>
                        setForm({ ...form, totalPriceDecimalPlaces: v })
                      }
                    />
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Max columns
                      </label>
                      <input
                        type="text"
                        value={form.maxUnitPriceColumns || ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "")
                            return setForm({ ...form, maxUnitPriceColumns: 0 });
                          if (!/^\d+$/.test(v)) return;
                          const n = parseInt(v, 10);
                          if (n > 10)
                            return toast.error(
                              "Max columns is 10.",
                              errorStyles,
                            );
                          setForm({ ...form, maxUnitPriceColumns: n });
                        }}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                        placeholder="3"
                      />
                    </div>
                  </div>
                )}
              </div>

              {sourceType === "customer" && (
                <p className="text-xs text-gray-500">
                  This creates a blank offer with the customer prefilled. Add
                  line items from the offer's pricing section.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <CustomButton
              gradient
              onClick={handleCreate}
              disabled={!canCreate() || creating}
              className="px-4 py-2 text-sm"
            >
              {creating ? "Creating…" : "Create offer"}
            </CustomButton>
          </div>
        </div>
      </CustomModal>

      {/* ============================ DETAIL MODAL ============================ */}
      <OfferDetailModal
        isOpen={showDetail}
        offerId={detailOfferId}
        onClose={() => setShowDetail(false)}
        onChanged={fetchOffers}
        userRole={user?.role}
      />
    </div>
  );
};

// --- Small presentational helpers ------------------------------------------
const Empty: React.FC<{ label: string }> = ({ label }) => (
  <div className="text-center py-4 text-gray-500 text-sm">{label}</div>
);

const SelectableRow: React.FC<{
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  meta?: string;
}> = ({ selected, onClick, title, subtitle, meta }) => (
  <div
    onClick={onClick}
    className={`p-3 border rounded-lg cursor-pointer transition-all ${
      selected
        ? "border-primary bg-primary/5"
        : "border-gray-200 hover:bg-gray-50"
    }`}
  >
    <div className="flex justify-between items-start">
      <div className="min-w-0">
        <div className="font-medium text-gray-900 truncate">{title}</div>
        {subtitle && (
          <div className="text-sm text-gray-600 truncate">{subtitle}</div>
        )}
      </div>
      {meta && (
        <div className="text-xs text-gray-500 shrink-0 ml-2">{meta}</div>
      )}
    </div>
  </div>
);

const LabeledSelect: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
}> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs font-medium text-gray-700 mb-1">
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
    >
      <option value={2}>2</option>
      <option value={3}>3</option>
      <option value={4}>4</option>
    </select>
  </div>
);

export default OffersPage;

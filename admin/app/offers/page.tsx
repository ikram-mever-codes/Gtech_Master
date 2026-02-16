"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PlusIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  PrinterIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  ClipboardIcon,
  CalculatorIcon,
  CurrencyEuroIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LinkIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CogIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { BadgePercent } from "lucide-react";
import PageHeader from "@/components/UI/PageHeader";
import {
  getAllOffers,
  getOfferById,
  createOfferFromInquiry,
  updateOffer,
  deleteOffer,
  createOfferRevision,
  generateOfferPdf,
  downloadOfferPdf,
  copyPastePrices,
  getOffersByInquiry,
  type Offer,
  type CreateOfferPayload,
  type OfferSearchFilters,
  getOfferStatuses,
  getAvailableCurrencies,
  formatCurrency,
  formatUnitPrice,
  formatTotalPrice,
  calculateLineTotal,
  calculateUnitPriceTotal,
  getOfferStatusColor,
  updateLineItem,
  addQuantityPrice,
  addUnitPrice,
  setActivePrice,
  type UnitPrice,
  type UnitPriceDto,
  getUnitPriceDefaults,
  processUnitPricesForUpdate,
  getActivePrice,
  getActivePriceType,
  prepareLineItemForUnitPricesLegacy,
  // New offer-level unit pricing functions
  toggleOfferUnitPrices,
  bulkUpdateOfferUnitPrices,
  syncUnitPricesAcrossOffer,
  migrateOfferToUnitPrices,
  offerUsesUnitPrices,
  getOfferUnitPriceSettings,
  formatUnitPriceForOffer,
  formatTotalPriceForOffer,
  calculateLineItemTotal,
} from "@/api/offers";
import { getAllInquiries, type Inquiry } from "@/api/inquiry";
import { getAllCustomers } from "@/api/customers";
import CustomButton from "@/components/UI/CustomButton";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import { UserRole } from "@/utils/interfaces";
import { DownloadCloudIcon, ToggleLeft, ToggleRight } from "lucide-react";

interface Customer {
  id: string;
  companyName: string;
  legalName?: string;
  email?: string;
}

const OffersPage: React.FC = () => {
  // State management
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showCopyPasteModal, setShowCopyPasteModal] = useState(false);
  const [showUnitPriceSettingsModal, setShowUnitPriceSettingsModal] =
    useState(false);
  const [showOfferUnitPriceSettingsModal, setShowOfferUnitPriceSettingsModal] =
    useState(false);

  // Selected items
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [selectedLineItem, setSelectedLineItem] = useState<any>(null);

  // Data lists
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Form states
  const [offerFormData, setOfferFormData] = useState<CreateOfferPayload>({
    title: "",
    currency: "EUR",
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    useUnitPrices: false,
    unitPriceDecimalPlaces: 3,
    totalPriceDecimalPlaces: 2,
    maxUnitPriceColumns: 3,
  });

  const [editFormData, setEditFormData] = useState<any>({});
  const [copyPasteData, setCopyPasteData] = useState("");

  // Unit price form states (for line items)
  const [unitPriceFormData, setUnitPriceFormData] = useState({
    quantity: "",
    unitPrice: "",
    isActive: false,
  });

  // Unit price settings at offer level
  const [offerUnitPriceSettings, setOfferUnitPriceSettings] = useState({
    useUnitPrices: false,
    unitPriceDecimalPlaces: 3,
    totalPriceDecimalPlaces: 2,
    maxUnitPriceColumns: 3,
  });

  // Filters
  const [filters, setFilters] = useState<OfferSearchFilters>({
    search: "",
    status: "",
    page: 1,
    limit: 20,
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  const { user } = useSelector((state: RootState) => state.user);
  const itemsPerPage = 20;

  // Expanded offers for details view
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);
  const [filteredInquiries, setFilteredInquiries] = useState<Inquiry[]>([]);

  // Editing state for inline editing
  const [editingLineItemId, setEditingLineItemId] = useState<string | null>(
    null
  );
  const [editingLineItemData, setEditingLineItemData] = useState<any>({});

  // Fetch data on mount
  useEffect(() => {
    fetchOffers();
    fetchInquiries();
    fetchCustomers();
  }, [filters]);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAllOffers(filters);
      if (response.success) {
        setOffers(response.data);
        setTotalRecords(response.pagination?.total || response.data.length);
        setTotalPages(response.pagination?.pages || 1);
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchInquiries = async () => {
    try {
      const response = await getAllInquiries({ limit: 1000 });
      if (response?.data) {
        const inquiryData = Array.isArray(response.data)
          ? response.data
          : response.data.inquiries || [];
        setInquiries(inquiryData);
        setFilteredInquiries(inquiryData); // Initialize filtered inquiries
      }
    } catch (error) {
      console.error("Error fetching inquiries:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await getAllCustomers();
      if (response?.data) {
        setCustomers(
          Array.isArray(response.data)
            ? response.data
            : response.data.customers || []
        );
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);

    if (customerId) {
      // Filter inquiries for the selected customer
      const filtered = inquiries.filter(
        (inquiry) => inquiry.customer?.id === customerId
      );
      setFilteredInquiries(filtered);
      // Reset selected inquiry when customer changes
      setSelectedInquiry(null);
    } else {
      // Show all inquiries if no customer is selected
      setFilteredInquiries(inquiries);
      setSelectedInquiry(null);
    }
  };

  const handleOpenCreateModal = () => {
    setSelectedCustomerId("");
    setSelectedInquiry(null);
    setFilteredInquiries(inquiries);
    setShowCreateModal(true);
  };

  // Handle offer creation
  const handleCreateOffer = async () => {
    if (!selectedInquiry) {
      toast.error("Please select an inquiry");
      return;
    }

    try {
      const response = await createOfferFromInquiry(
        selectedInquiry.id,
        offerFormData
      );
      if (response.success) {
        setShowCreateModal(false);
        resetCreateForm();
        fetchOffers();
      }
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  };

  // Handle offer update
  const handleUpdateOffer = async () => {
    if (!selectedOffer) return;

    try {
      const response = await updateOffer(selectedOffer.id, editFormData);
      if (response.success) {
        setShowEditModal(false);
        setSelectedOffer(null);
        fetchOffers();
      }
    } catch (error) {
      console.error("Error updating offer:", error);
    }
  };

  // Handle offer deletion
  const handleDeleteOffer = async (offerId: string) => {
    if (window.confirm("Are you sure you want to delete this offer?")) {
      try {
        await deleteOffer(offerId);
        fetchOffers();
      } catch (error) {
        console.error("Error deleting offer:", error);
      }
    }
  };

  // Handle create revision
  const handleCreateRevision = async (offer: Offer) => {
    try {
      const response = await createOfferRevision(offer.id, {
        title: `Revision of ${offer.offerNumber}`,
        useUnitPrices: offer.useUnitPrices,
        unitPriceDecimalPlaces: offer.unitPriceDecimalPlaces,
        totalPriceDecimalPlaces: offer.totalPriceDecimalPlaces,
        maxUnitPriceColumns: offer.maxUnitPriceColumns,
      });
      if (response.success) {
        fetchOffers();
      }
    } catch (error) {
      console.error("Error creating revision:", error);
    }
  };

  // Handle PDF generation
  const handleGeneratePdf = async (offerId: string) => {
    try {
      const response = await generateOfferPdf(offerId);
      if (response.success) {
        // Download the PDF
        await downloadOfferPdf(offerId);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  // Handle copy/paste prices
  const handleCopyPastePrices = async () => {
    if (!selectedOffer || !copyPasteData.trim()) {
      toast.error("Please paste data from spreadsheet");
      return;
    }

    try {
      const response = await copyPastePrices(selectedOffer.id, {
        data: copyPasteData,
      });
      if (response.success) {
        setShowCopyPasteModal(false);
        setCopyPasteData("");

        // Refresh offer data
        const updated = await getOfferById(selectedOffer.id);
        if (updated.success) {
          setSelectedOffer(updated.data);
        }

        fetchOffers();
      }
    } catch (error) {
      console.error("Error processing copied data:", error);
    }
  };

  // Handle viewing offer details
  const handleViewOffer = async (offer: Offer) => {
    try {
      const response = await getOfferById(offer.id);
      if (response.success) {
        setSelectedOffer(response.data);
        setShowViewModal(true);
      }
    } catch (error) {
      console.error("Error fetching offer details:", error);
    }
  };

  // Handle editing offer
  const handleEditOffer = (offer: Offer) => {
    setSelectedOffer(offer);
    setEditFormData({
      title: offer.title,
      status: offer.status,
      validUntil: offer.validUntil,
      deliveryTime: offer.deliveryTime,
      paymentTerms: offer.paymentTerms,
      deliveryTerms: offer.deliveryTerms,
      termsConditions: offer.termsConditions,
      notes: offer.notes,
      discountPercentage: offer.discountPercentage,
      discountAmount: offer.discountAmount,
      shippingCost: offer.shippingCost,
      currency: offer.currency,
      deliveryAddress: offer.deliveryAddress,
      // Unit pricing settings at offer level
      useUnitPrices: offer.useUnitPrices,
      unitPriceDecimalPlaces: offer.unitPriceDecimalPlaces,
      totalPriceDecimalPlaces: offer.totalPriceDecimalPlaces,
      maxUnitPriceColumns: offer.maxUnitPriceColumns,
    });
    setShowEditModal(true);
  };

  // Handle editing pricing
  const handleEditPricing = (offer: Offer) => {
    setSelectedOffer(offer);
    setShowPricingModal(true);
  };

  // Handle inline line item edit
  const handleEditLineItem = (lineItem: any) => {
    setEditingLineItemId(lineItem.id);
    setEditingLineItemData({
      itemName: lineItem.itemName,
      description: lineItem.description,
      quantity: lineItem.baseQuantity,
      baseQuantity: lineItem.baseQuantity,
      basePrice: lineItem.basePrice,
      notes: lineItem.notes,
    });
  };

  const handleSaveLineItem = async (offerId: string, lineItemId: string) => {
    try {
      const response = await updateLineItem(
        offerId,
        lineItemId,
        editingLineItemData
      );
      if (response.success) {
        // Refresh offer data
        const updatedOffer = await getOfferById(offerId);
        if (updatedOffer.success) {
          setSelectedOffer(updatedOffer.data);
          // Update offers list
          const updatedOffers = offers.map((offer: any) =>
            offer.id === offerId ? updatedOffer.data : offer
          );
          setOffers(updatedOffers);
        }

        setEditingLineItemId(null);
        setEditingLineItemData({});
      }
    } catch (error) {
      console.error("Error updating line item:", error);
      toast.error("Failed to update line item");
    }
  };

  const handleCancelEditLineItem = () => {
    setEditingLineItemId(null);
    setEditingLineItemData({});
  };

  // Handle toggle unit prices for entire offer
  const handleToggleOfferUnitPrices = async (
    offerId: string,
    useUnitPrices: boolean
  ) => {
    try {
      await toggleOfferUnitPrices(offerId, useUnitPrices);

      // Refresh offer data
      if (selectedOffer) {
        const updatedOffer = await getOfferById(selectedOffer.id);
        if (updatedOffer.success) {
          setSelectedOffer(updatedOffer.data);
          fetchOffers();
        }
      }
    } catch (error) {
      console.error("Error toggling offer unit prices:", error);
      toast.error("Failed to toggle unit prices");
    }
  };

  // Handle adding unit price to line item
  const handleAddUnitPrice = async (lineItemId: string) => {
    if (!unitPriceFormData.quantity || !unitPriceFormData.unitPrice) {
      toast.error("Please enter quantity and unit price");
      return;
    }

    try {
      await addUnitPrice(lineItemId, {
        quantity: unitPriceFormData.quantity,
        unitPrice: parseFloat(unitPriceFormData.unitPrice),
        isActive: unitPriceFormData.isActive,
      });

      // Reset form
      setUnitPriceFormData({
        quantity: "",
        unitPrice: "",
        isActive: false,
      });

      // Refresh offer data
      if (selectedOffer) {
        const updatedOffer = await getOfferById(selectedOffer.id);
        if (updatedOffer.success) {
          setSelectedOffer(updatedOffer.data);
        }
      }
    } catch (error) {
      console.error("Error adding unit price:", error);
      toast.error("Failed to add unit price");
    }
  };

  // Handle updating unit price settings at offer level
  const handleUpdateOfferUnitPriceSettings = async () => {
    if (!selectedOffer) return;

    try {
      const updateData = {
        unitPriceDecimalPlaces: offerUnitPriceSettings.unitPriceDecimalPlaces,
        totalPriceDecimalPlaces: offerUnitPriceSettings.totalPriceDecimalPlaces,
        maxUnitPriceColumns: offerUnitPriceSettings.maxUnitPriceColumns,
      };

      await updateOffer(selectedOffer.id, updateData);

      // Refresh offer data
      const updatedOffer = await getOfferById(selectedOffer.id);
      if (updatedOffer.success) {
        setSelectedOffer(updatedOffer.data);
        fetchOffers();
      }

      setShowOfferUnitPriceSettingsModal(false);
    } catch (error) {
      console.error("Error updating offer unit price settings:", error);
      toast.error("Failed to update settings");
    }
  };

  // Handle setting active price (for both unit prices and quantity prices)
  const handleSetActivePrice = async (
    lineItemId: string,
    priceType: "quantity" | "unit",
    priceIndex: number
  ) => {
    try {
      await setActivePrice(lineItemId, priceType, priceIndex);

      // Refresh offer data
      if (selectedOffer) {
        const updatedOffer = await getOfferById(selectedOffer.id);
        if (updatedOffer.success) {
          setSelectedOffer(updatedOffer.data);
        }
      }
    } catch (error) {
      console.error("Error setting active price:", error);
      toast.error("Failed to set active price");
    }
  };

  // Handle updating unit price
  const handleUpdateUnitPrice = async (
    lineItemId: string,
    unitPriceId: string,
    updates: Partial<UnitPrice>
  ) => {
    try {
      const lineItem = selectedOffer.lineItems.find(
        (li: any) => li.id === lineItemId
      );
      if (!lineItem) return;

      const updatedUnitPrices = lineItem.unitPrices.map((up: UnitPrice) =>
        up.id === unitPriceId ? { ...up, ...updates } : up
      );

      await updateLineItem(selectedOffer.id, lineItemId, {
        unitPrices: updatedUnitPrices,
      });

      // Refresh offer data
      const updatedOffer = await getOfferById(selectedOffer.id);
      if (updatedOffer.success) {
        setSelectedOffer(updatedOffer.data);
      }
    } catch (error) {
      console.error("Error updating unit price:", error);
      toast.error("Failed to update unit price");
    }
  };

  // Handle deleting unit price
  const handleDeleteUnitPrice = async (
    lineItemId: string,
    unitPriceId: string
  ) => {
    if (!window.confirm("Are you sure you want to delete this unit price?")) {
      return;
    }

    try {
      const lineItem = selectedOffer.lineItems.find(
        (li: any) => li.id === lineItemId
      );
      if (!lineItem) return;

      const updatedUnitPrices = lineItem.unitPrices.filter(
        (up: UnitPrice) => up.id !== unitPriceId
      );

      await updateLineItem(selectedOffer.id, lineItemId, {
        unitPrices: updatedUnitPrices,
      });

      // Refresh offer data
      const updatedOffer = await getOfferById(selectedOffer.id);
      if (updatedOffer.success) {
        setSelectedOffer(updatedOffer.data);
      }
    } catch (error) {
      console.error("Error deleting unit price:", error);
      toast.error("Failed to delete unit price");
    }
  };

  // Sync unit prices across all line items
  const handleSyncUnitPricesAcrossOffer = async (offerId: string) => {
    try {
      await syncUnitPricesAcrossOffer(offerId);

      // Refresh offer data
      const updatedOffer = await getOfferById(offerId);
      if (updatedOffer.success) {
        setSelectedOffer(updatedOffer.data);
        fetchOffers();
      }
    } catch (error) {
      console.error("Error syncing unit prices:", error);
      toast.error("Failed to sync unit prices");
    }
  };

  const resetCreateForm = () => {
    setOfferFormData({
      title: "",
      currency: "EUR",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      useUnitPrices: false,
      unitPriceDecimalPlaces: 3,
      totalPriceDecimalPlaces: 2,
      maxUnitPriceColumns: 3,
    });
    setSelectedInquiry(null);
    setSelectedCustomerId(""); // Reset customer filter
    setFilteredInquiries(inquiries); // Reset to all inquiries
  };

  // Format date
  const formatDate = (dateString: string | Date) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Toggle offer expansion
  const toggleOfferExpansion = (offerId: string) => {
    if (expandedOfferId === offerId) {
      setExpandedOfferId(null);
    } else {
      setExpandedOfferId(offerId);
    }
  };

  // Helper function to determine what to display in the amount column
  const getOfferAmountDisplay = (offer: any) => {
    if (offer.useUnitPrices) {
      // For unit price offers, count unit price sets across all line items
      const unitPriceSets =
        offer.lineItems
          ?.filter((item: any) => !item.isComponent)
          .reduce((total: number, item: any) => {
            return total + (item.unitPrices?.length || 0);
          }, 0) || 0;

      return (
        <div className="text-center">
          <div className="text-sm font-medium text-green-700">
            {unitPriceSets} unit sets
          </div>
          <div className="text-xs text-gray-500">
            {formatCurrency(offer.totalAmount || 0, offer.currency)}
          </div>
        </div>
      );
    } else {
      // For normal offers, show the total amount
      return (
        <div className="space-y-1 text-center">
          <div className="text-sm font-bold text-gray-900">
            {formatCurrency(offer.totalAmount || 0, offer.currency)}
          </div>
          <div className="text-xs text-gray-500">
            {offer.lineItems?.filter((li: any) => !li.isComponent).length || 0}{" "}
            items
          </div>
        </div>
      );
    }
  };
  // Open unit price settings modal for line item (deprecated but kept for migration)
  const openUnitPriceSettings = (lineItem: any) => {
    console.warn(
      "Line item unit price settings are deprecated. Use offer-level settings instead."
    );
    setSelectedLineItem(lineItem);
    // Set to offer's settings instead of line item's
    setOfferUnitPriceSettings({
      useUnitPrices: selectedOffer?.useUnitPrices || false,
      unitPriceDecimalPlaces: selectedOffer?.unitPriceDecimalPlaces || 3,
      totalPriceDecimalPlaces: selectedOffer?.totalPriceDecimalPlaces || 2,
      maxUnitPriceColumns: selectedOffer?.maxUnitPriceColumns || 3,
    });
    setShowOfferUnitPriceSettingsModal(true);
  };

  // Open offer-level unit price settings modal
  const openOfferUnitPriceSettings = (offer: any) => {
    setSelectedOffer(offer);
    setOfferUnitPriceSettings({
      useUnitPrices: offer.useUnitPrices || false,
      unitPriceDecimalPlaces: offer.unitPriceDecimalPlaces || 3,
      totalPriceDecimalPlaces: offer.totalPriceDecimalPlaces || 2,
      maxUnitPriceColumns: offer.maxUnitPriceColumns || 3,
    });
    setShowOfferUnitPriceSettingsModal(true);
  };

  // Render price display based on type
  const renderPriceDisplay = (item: any, offer: any) => {
    const usesUnitPrices = offerUsesUnitPrices(offer);

    if (usesUnitPrices && item.unitPrices && item.unitPrices.length > 0) {
      return (
        <div className="space-y-1">
          {item.unitPrices
            .slice(0, offer.maxUnitPriceColumns || 3)
            .map((up: UnitPrice, idx: number) => (
              <div
                key={up.id}
                className={`text-xs ${up.isActive ? "font-bold text-green-700" : "text-gray-600"
                  }`}
              >
                {up.quantity} pcs:{" "}
                {formatUnitPrice(
                  up.unitPrice,
                  offer.unitPriceDecimalPlaces || 3
                )}
                /unit
                {up.isActive && (
                  <CheckCircleIcon className="h-3 w-3 inline ml-1" />
                )}
              </div>
            ))}
        </div>
      );
    } else if (item.quantityPrices?.length > 0) {
      return (
        <div className="space-y-1">
          {item.quantityPrices.map((qp: any, idx: number) => (
            <div
              key={idx}
              className={`text-xs ${qp.isActive ? "font-bold text-green-700" : "text-gray-600"
                }`}
            >
              {qp.quantity} pcs: {formatUnitPrice(qp.price, 3)}
              {qp.isActive && (
                <CheckCircleIcon className="h-3 w-3 inline ml-1" />
              )}
            </div>
          ))}
        </div>
      );
    } else if (item.basePrice) {
      return (
        <div className="text-sm text-gray-600">
          {item.baseQuantity || "1"} × {formatUnitPrice(item.basePrice, 3)}
        </div>
      );
    } else {
      return <div className="text-xs text-gray-400">No price set</div>;
    }
  };

  return (
    <div className="min-h-screen bg-white shadow-xl rounded-lg p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <PageHeader title="Offers" icon={BadgePercent} />
            </div>
            <div className="flex gap-2">
              {/* Filters */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search offers..."
                  value={filters.search || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value, page: 1 })
                  }
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
                <select
                  value={filters.status || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value, page: 1 })
                  }
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value="">All Status</option>
                  {getOfferStatuses().map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={fetchOffers}
                disabled={loading}
                className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <ArrowPathIcon
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              <CustomButton
                gradient={true}
                onClick={handleOpenCreateModal}
                className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                New Offer
              </CustomButton>
            </div>
          </div>
        </div>

        {/* Offers Table */}
        <div className="bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center gap-3">
                <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-500" />
                <span className="text-gray-600">Loading offers...</span>
              </div>
            </div>
          ) : offers.length === 0 ? (
            <div className="p-8 text-center">
              <DocumentTextIcon className="h-10 w-10 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No offers found</p>
              <p className="text-gray-500 text-sm mt-2">
                Create your first offer from an inquiry
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Offer Details
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status & Expiry
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {offers.map((offer: any) => (
                    <React.Fragment key={offer.id}>
                      {/* Main offer row */}
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="w-[12rem]">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleOfferExpansion(offer.id)}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                {expandedOfferId === offer.id ? (
                                  <ChevronUpIcon className="h-4 w-4" />
                                ) : (
                                  <ChevronDownIcon className="h-4 w-4" />
                                )}
                              </button>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {offer.offerNumber}
                                  {offer.revision > 1 && (
                                    <span className="ml-2 text-xs text-gray-500">
                                      (Rev. {offer.revision})
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 truncate">
                                  {offer.title}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  Created: {formatDate(offer.createdAt)}
                                  {offer.useUnitPrices && (
                                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                                      Unit Pricing
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-[10rem]">
                            <div className="flex items-center gap-2 mb-1">
                              <BuildingOfficeIcon className="h-4 w-4 text-gray-400" />
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {offer.customerSnapshot.companyName}
                              </div>
                            </div>
                            {offer.customerSnapshot.vatId && (
                              <div className="text-xs text-gray-500">
                                VAT: {offer.customerSnapshot.vatId}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getOfferAmountDisplay(offer)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 items-center">
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${getOfferStatusColor(
                                offer.status
                              )}`}
                            >
                              {offer.status}
                            </span>
                            {offer.validUntil && (
                              <div className="flex items-center gap-1 text-xs">
                                <CalendarIcon className="h-3 w-3 text-gray-500" />
                                <span className="text-gray-600">
                                  {formatDate(offer.validUntil)}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewOffer(offer)}
                              className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                              title="View details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleEditOffer(offer)}
                              className="text-gray-600 hover:text-gray-800 transition-colors p-1"
                              title="Edit offer"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>

                            {offer.pdfGenerated ? (
                              <button
                                onClick={() => downloadOfferPdf(offer.id)}
                                className="text-purple-600 hover:text-purple-800 transition-colors p-1"
                                title="Download PDF"
                              >
                                <DownloadCloudIcon className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleGeneratePdf(offer.id)}
                                className="text-purple-600 hover:text-purple-800 transition-colors p-1"
                                title="Generate PDF"
                              >
                                <PrinterIcon className="h-4 w-4" />
                              </button>
                            )}

                            {user?.role === UserRole.ADMIN && (
                              <button
                                onClick={() => handleDeleteOffer(offer.id)}
                                className="text-red-600 hover:text-red-800 transition-colors p-1"
                                title="Delete offer"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded details row */}
                      {expandedOfferId === offer.id && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="pl-8">
                              {/* Unit pricing status for offer */}
                              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <CalculatorIcon className="h-4 w-4 text-gray-600" />
                                    <h4 className="font-medium text-gray-900">
                                      Pricing Configuration
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-600">
                                        Unit Pricing:
                                      </span>
                                      <button
                                        onClick={() =>
                                          handleToggleOfferUnitPrices(
                                            offer.id,
                                            !offer.useUnitPrices
                                          )
                                        }
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${offer.useUnitPrices
                                            ? "bg-green-500"
                                            : "bg-gray-300"
                                          }`}
                                      >
                                        <span
                                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${offer.useUnitPrices
                                              ? "translate-x-5"
                                              : "translate-x-1"
                                            }`}
                                        />
                                      </button>
                                    </div>
                                    <button
                                      onClick={() =>
                                        openOfferUnitPriceSettings(offer)
                                      }
                                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                      <CogIcon className="h-4 w-4" />
                                      Settings
                                    </button>
                                    {/* {offer.useUnitPrices && (
                                      <button
                                        onClick={() =>
                                          handleSyncUnitPricesAcrossOffer(
                                            offer.id
                                          )
                                        }
                                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                      >
                                        Sync All Line Items
                                      </button>
                                    )} */}
                                  </div>
                                </div>
                                {offer.useUnitPrices && (
                                  <div className="mt-2 text-xs text-gray-600">
                                    Decimal places:{" "}
                                    {offer.unitPriceDecimalPlaces || 3} for unit
                                    prices, {offer.totalPriceDecimalPlaces || 2}{" "}
                                    for totals • Max columns:{" "}
                                    {offer.maxUnitPriceColumns || 3}
                                  </div>
                                )}
                              </div>

                              {/* Show inquiry snapshot */}
                              {offer.inquirySnapshot && (
                                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <LinkIcon className="h-4 w-4 text-blue-600" />
                                    <h4 className="font-medium text-blue-900">
                                      Source Inquiry
                                    </h4>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <div className="font-medium text-gray-900">
                                        {offer.inquirySnapshot.name}
                                        {offer.inquirySnapshot
                                          .referenceNumber && (
                                            <span className="ml-2 text-xs text-gray-500">
                                              (
                                              {
                                                offer.inquirySnapshot
                                                  .referenceNumber
                                              }
                                              )
                                            </span>
                                          )}
                                      </div>
                                      {offer.inquirySnapshot.description && (
                                        <div className="text-sm text-gray-600">
                                          {offer.inquirySnapshot.description}
                                        </div>
                                      )}
                                      <div className="text-xs text-gray-500 mt-1">
                                        Created:{" "}
                                        {formatDate(
                                          offer.inquirySnapshot.createdAt
                                        )}
                                        {offer.isAssembly && " • Assembly"}
                                        {offer.inquirySnapshot.requestsCount >
                                          0 &&
                                          ` • ${offer.inquirySnapshot.requestsCount} items`}
                                      </div>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {offer.inquirySnapshot.isAssembly
                                        ? "Assembly"
                                        : "Standard"}
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-4 text-sm">
                                {/* Line Items */}
                                <div>
                                  <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-medium text-gray-900">
                                      Line Items (
                                      {offer.lineItems?.filter(
                                        (li: any) => !li.isComponent
                                      ).length || 0}
                                      )
                                    </h4>
                                    <button
                                      onClick={() => handleEditPricing(offer)}
                                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                      <PencilIcon className="h-3 w-3" />
                                      Edit Pricing
                                    </button>
                                  </div>
                                  <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {offer.lineItems.map((item: any) => (
                                      <div
                                        key={item.id}
                                        className="p-3 bg-white rounded border border-gray-200 hover:border-gray-300 transition-colors"
                                      >
                                        {editingLineItemId === item.id ? (
                                          // Edit mode
                                          <div className="space-y-2">
                                            <div className="flex justify-between items-start">
                                              <input
                                                type="text"
                                                value={
                                                  editingLineItemData.itemName ||
                                                  ""
                                                }
                                                onChange={(e) =>
                                                  setEditingLineItemData({
                                                    ...editingLineItemData,
                                                    itemName: e.target.value,
                                                  })
                                                }
                                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                placeholder="Item name"
                                              />
                                            </div>
                                            <textarea
                                              value={
                                                editingLineItemData.description ||
                                                ""
                                              }
                                              onChange={(e) =>
                                                setEditingLineItemData({
                                                  ...editingLineItemData,
                                                  description: e.target.value,
                                                })
                                              }
                                              rows={2}
                                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                              placeholder="Description"
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                              <input
                                                type="text"
                                                value={
                                                  editingLineItemData.quantity ||
                                                  ""
                                                }
                                                onChange={(e) =>
                                                  setEditingLineItemData({
                                                    ...editingLineItemData,
                                                    quantity: e.target.value,
                                                    baseQuantity:
                                                      e.target.value,
                                                  })
                                                }
                                                className="px-2 py-1 text-sm border border-gray-300 rounded"
                                                placeholder="Quantity"
                                              />
                                              <input
                                                type="number"
                                                step="0.001"
                                                value={
                                                  editingLineItemData.basePrice ||
                                                  ""
                                                }
                                                onChange={(e) =>
                                                  setEditingLineItemData({
                                                    ...editingLineItemData,
                                                    basePrice: e.target.value
                                                      ? parseFloat(
                                                        e.target.value
                                                      )
                                                      : undefined,
                                                  })
                                                }
                                                className="px-2 py-1 text-sm border border-gray-300 rounded"
                                                placeholder="Base price"
                                              />
                                            </div>
                                            <div className="flex justify-end gap-2 pt-2">
                                              <button
                                                onClick={
                                                  handleCancelEditLineItem
                                                }
                                                className="px-2 py-1 text-xs text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
                                              >
                                                Cancel
                                              </button>
                                              <button
                                                onClick={() =>
                                                  handleSaveLineItem(
                                                    offer.id,
                                                    item.id
                                                  )
                                                }
                                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                              >
                                                Save
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          // View mode
                                          <>
                                            <div className="flex justify-between items-start">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                  <div className="font-medium text-gray-900">
                                                    {item.position}.{" "}
                                                    {item.itemName}
                                                  </div>
                                                  {item.isAssemblyItem && (
                                                    <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                                                      Assembly
                                                    </span>
                                                  )}
                                                </div>
                                                {item.description && (
                                                  <div className="text-xs text-gray-600 mt-1">
                                                    {item.description}
                                                  </div>
                                                )}
                                                {item.baseQuantity && (
                                                  <div className="text-xs text-gray-500 mt-1">
                                                    Quantity:{" "}
                                                    {item.baseQuantity}
                                                  </div>
                                                )}
                                                {item.notes && (
                                                  <div className="text-xs text-gray-500 mt-1 italic">
                                                    {item.notes}
                                                  </div>
                                                )}
                                              </div>
                                              <div className="text-right">
                                                <div className="flex items-center gap-2">
                                                  <button
                                                    onClick={() =>
                                                      handleEditLineItem(item)
                                                    }
                                                    className="text-gray-400 hover:text-gray-600"
                                                    title="Edit item"
                                                  >
                                                    <PencilIcon className="h-3 w-3" />
                                                  </button>
                                                  {renderPriceDisplay(
                                                    item,
                                                    offer
                                                  )}
                                                </div>
                                                <div className="text-sm font-bold text-gray-900 mt-1">
                                                  {formatCurrency(
                                                    calculateLineItemTotal(
                                                      item,
                                                      offer.useUnitPrices
                                                    ) || 0,
                                                    offer.currency
                                                  )}
                                                </div>
                                              </div>
                                            </div>

                                            {/* Show components for assembly items */}
                                            {item.isAssemblyItem && (
                                              <div className="mt-2 pl-4 border-l-2 border-gray-200">
                                                <div className="text-xs font-medium text-gray-500 mb-1">
                                                  Components:
                                                </div>
                                                {offer.lineItems
                                                  ?.filter(
                                                    (comp: any) =>
                                                      comp.parentItemId ===
                                                      item.id &&
                                                      comp.isComponent
                                                  )
                                                  .map((component: any) => (
                                                    <div
                                                      key={component.id}
                                                      className="text-xs text-gray-600 flex justify-between py-1"
                                                    >
                                                      <span>
                                                        {component.itemName}
                                                      </span>
                                                      {component.baseQuantity && (
                                                        <span className="text-gray-500">
                                                          Qty:{" "}
                                                          {
                                                            component.baseQuantity
                                                          }
                                                        </span>
                                                      )}
                                                    </div>
                                                  ))}
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Summary */}
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-2">
                                    Summary
                                  </h4>
                                  {offer.useUnitPrices && (
                                    <div className="mb-3 pb-3 border-b">
                                      <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">
                                          Unit Price Sets:
                                        </span>
                                        <span className="font-medium text-green-700">
                                          {offer.lineItems
                                            ?.filter(
                                              (item: any) => !item.isComponent
                                            )
                                            .reduce(
                                              (total: number, item: any) => {
                                                return (
                                                  total +
                                                  (item.unitPrices?.length || 0)
                                                );
                                              },
                                              0
                                            ) || 0}{" "}
                                          sets
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        Configured at offer level with{" "}
                                        {offer.maxUnitPriceColumns || 3} max
                                        columns
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                      Subtotal:
                                    </span>
                                    <span className="font-medium">
                                      {formatCurrency(
                                        offer.subtotal || 0,
                                        offer.currency
                                      )}
                                    </span>
                                  </div>

                                  {/* Customer snapshot */}
                                  {offer.customerSnapshot && (
                                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                      <h5 className="font-medium text-gray-900 mb-1">
                                        Customer Snapshot
                                      </h5>
                                      <div className="text-xs text-gray-600">
                                        <div>
                                          {offer.customerSnapshot.companyName}
                                        </div>
                                        {offer.customerSnapshot.vatId && (
                                          <div>
                                            VAT: {offer.customerSnapshot.vatId}
                                          </div>
                                        )}
                                        {offer.customerSnapshot.address && (
                                          <div>
                                            {offer.customerSnapshot.address}
                                          </div>
                                        )}
                                        {offer.customerSnapshot.city &&
                                          offer.customerSnapshot.postalCode && (
                                            <div>
                                              {
                                                offer.customerSnapshot
                                                  .postalCode
                                              }{" "}
                                              {offer.customerSnapshot.city}
                                            </div>
                                          )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Notes */}
                                  {offer.notes && (
                                    <div className="mt-4">
                                      <h5 className="font-medium text-gray-900 mb-1">
                                        Notes
                                      </h5>
                                      <p className="text-sm text-gray-600">
                                        {offer.notes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
                {totalRecords} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCurrentPage((prev) => Math.max(1, prev - 1));
                    setFilters({
                      ...filters,
                      page: Math.max(1, currentPage - 1),
                    });
                  }}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => {
                          setCurrentPage(pageNum);
                          setFilters({ ...filters, page: pageNum });
                        }}
                        className={`px-2 py-1 text-sm rounded-lg transition-all ${currentPage === pageNum
                            ? "bg-gray-600 text-white"
                            : "bg-white border border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="px-1 text-gray-500">...</span>
                      <button
                        onClick={() => {
                          setCurrentPage(totalPages);
                          setFilters({ ...filters, page: totalPages });
                        }}
                        className={`px-2 py-1 text-sm rounded-lg transition-all ${currentPage === totalPages
                            ? "bg-gray-600 text-white"
                            : "bg-white border border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() => {
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                    setFilters({
                      ...filters,
                      page: Math.min(totalPages, currentPage + 1),
                    });
                  }}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showViewModal && selectedOffer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Offer {selectedOffer.offerNumber}
                  </h2>
                  <p className="text-sm text-gray-600">{selectedOffer.title}</p>
                  {selectedOffer.useUnitPrices && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                        Unit Pricing Enabled
                      </span>
                      <span className="text-xs text-gray-500">
                        {selectedOffer.unitPriceDecimalPlaces || 3} decimal
                        places
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleGeneratePdf(selectedOffer.id)}
                    className="px-3 py-2 text-sm text-purple-700 bg-white border border-purple-300 rounded-lg hover:bg-purple-50 transition-all flex items-center gap-2"
                  >
                    <PrinterIcon className="h-4 w-4" />
                    {selectedOffer.pdfGenerated
                      ? "Regenerate PDF"
                      : "Generate PDF"}
                  </button>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Customer Information */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">
                      Customer Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">
                          {selectedOffer.customerSnapshot.companyName}
                        </div>
                        {selectedOffer.customerSnapshot.legalName && (
                          <div className="text-gray-600">
                            {selectedOffer.customerSnapshot.legalName}
                          </div>
                        )}
                      </div>
                      {selectedOffer.customerSnapshot.address && (
                        <div className="text-gray-600">
                          {selectedOffer.customerSnapshot.address}
                        </div>
                      )}
                      {(selectedOffer.customerSnapshot.postalCode ||
                        selectedOffer.customerSnapshot.city) && (
                          <div className="text-gray-600">
                            {selectedOffer.customerSnapshot.postalCode}{" "}
                            {selectedOffer.customerSnapshot.city}
                          </div>
                        )}
                      {selectedOffer.customerSnapshot.country && (
                        <div className="text-gray-600">
                          {selectedOffer.customerSnapshot.country}
                        </div>
                      )}
                      {selectedOffer.customerSnapshot.vatId && (
                        <div className="text-gray-600">
                          VAT ID: {selectedOffer.customerSnapshot.vatId}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">
                      Delivery Address
                    </h3>
                    <div className="space-y-2 text-sm">
                      {selectedOffer.deliveryAddress?.contactName && (
                        <div className="font-medium text-gray-900">
                          {selectedOffer.deliveryAddress.contactName}
                        </div>
                      )}
                      {selectedOffer.deliveryAddress?.street && (
                        <div className="text-gray-600">
                          {selectedOffer.deliveryAddress.street}
                        </div>
                      )}
                      {(selectedOffer.deliveryAddress?.postalCode ||
                        selectedOffer.deliveryAddress?.city) && (
                          <div className="text-gray-600">
                            {selectedOffer.deliveryAddress.postalCode}{" "}
                            {selectedOffer.deliveryAddress.city}
                          </div>
                        )}
                      {selectedOffer.deliveryAddress?.country && (
                        <div className="text-gray-600">
                          {selectedOffer.deliveryAddress.country}
                        </div>
                      )}
                      {selectedOffer.deliveryAddress?.contactPhone && (
                        <div className="text-gray-600">
                          Phone: {selectedOffer.deliveryAddress.contactPhone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inquiry Snapshot */}
                {selectedOffer.inquirySnapshot && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-2">
                      Source Inquiry
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">
                          {selectedOffer.inquirySnapshot.name}
                        </div>
                        {selectedOffer.inquirySnapshot.referenceNumber && (
                          <div className="text-gray-600">
                            Reference:{" "}
                            {selectedOffer.inquirySnapshot.referenceNumber}
                          </div>
                        )}
                        <div className="text-gray-600">
                          Created:{" "}
                          {formatDate(selectedOffer.inquirySnapshot.createdAt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-600">
                          Type:{" "}
                          {selectedOffer.inquirySnapshot.isAssembly
                            ? "Assembly"
                            : "Standard"}
                        </div>
                        <div className="text-gray-600">
                          Items: {selectedOffer.inquirySnapshot.requestsCount}
                        </div>
                        <div className="text-gray-600">
                          Status: {selectedOffer.inquirySnapshot.status}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Line Items Table */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Line Items</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            Position
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            Item Description
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            {selectedOffer.useUnitPrices
                              ? "Unit Prices"
                              : "Quantity Prices"}
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedOffer.lineItems
                          ?.filter((item: any) => !item.isComponent)
                          .map((item: any) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2">{item.position}</td>
                              <td className="px-3 py-2">
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {item.itemName}
                                  </div>
                                  {item.description && (
                                    <div className="text-gray-600 text-xs">
                                      {item.description}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                {selectedOffer.useUnitPrices &&
                                  item.unitPrices?.length > 0 ? (
                                  <div className="space-y-1">
                                    {item.unitPrices
                                      .slice(
                                        0,
                                        selectedOffer.maxUnitPriceColumns || 3
                                      )
                                      .map((up: UnitPrice, idx: number) => (
                                        <div
                                          key={up.id}
                                          className={`flex items-center gap-2 ${up.isActive ? "font-bold" : ""
                                            }`}
                                        >
                                          <span>{up.quantity} pcs</span>
                                          <span>×</span>
                                          <span>
                                            {formatUnitPriceForOffer(
                                              up.unitPrice,
                                              selectedOffer
                                            )}
                                          </span>
                                          {up.isActive && (
                                            <CheckCircleIcon className="h-3 w-3 text-green-600" />
                                          )}
                                        </div>
                                      ))}
                                  </div>
                                ) : item.quantityPrices?.length > 0 ? (
                                  <div className="space-y-1">
                                    {item.quantityPrices.map(
                                      (qp: any, idx: any) => (
                                        <div
                                          key={idx}
                                          className={`flex items-center gap-2 ${qp.isActive ? "font-bold" : ""
                                            }`}
                                        >
                                          <span>{qp.quantity} pcs</span>
                                          <span>×</span>
                                          <span>
                                            {formatCurrency(
                                              qp.price,
                                              selectedOffer.currency
                                            )}
                                          </span>
                                          {qp.isActive && (
                                            <CheckCircleIcon className="h-3 w-3 text-green-600" />
                                          )}
                                        </div>
                                      )
                                    )}
                                  </div>
                                ) : item.basePrice ? (
                                  <div className="flex items-center gap-2">
                                    <span>{item.baseQuantity || "1"} pcs</span>
                                    <span>×</span>
                                    <span>
                                      {formatCurrency(
                                        item.basePrice,
                                        selectedOffer.currency
                                      )}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-gray-500">
                                    No prices set
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 font-medium">
                                {formatCurrency(
                                  calculateLineItemTotal(
                                    item,
                                    selectedOffer.useUnitPrices
                                  ) || 0,
                                  selectedOffer.currency
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-4">
                  <div className="max-w-sm ml-auto">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            selectedOffer.subtotal || 0,
                            selectedOffer.currency
                          )}
                        </span>
                      </div>
                      {selectedOffer?.discountAmount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Discount:</span>
                          <span>
                            -
                            {formatCurrency(
                              selectedOffer.discountAmount,
                              selectedOffer.currency
                            )}
                          </span>
                        </div>
                      )}
                      {selectedOffer.shippingCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Shipping:</span>
                          <span className="font-medium">
                            {formatCurrency(
                              selectedOffer.shippingCost,
                              selectedOffer.currency
                            )}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">VAT (19%):</span>
                        <span className="font-medium">
                          {formatCurrency(
                            selectedOffer.taxAmount || 0,
                            selectedOffer.currency
                          )}
                        </span>
                      </div>
                      <div className="border-t pt-2">
                        <div className="flex justify-between font-bold text-lg">
                          <span>TOTAL:</span>
                          <span>
                            {formatCurrency(
                              selectedOffer.totalAmount || 0,
                              selectedOffer.currency
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedOffer.notes && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                    <p className="text-sm text-gray-600">
                      {selectedOffer.notes}
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Create New Offer
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Customer Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Customer (Optional)
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  >
                    <option value="">All Customers</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Inquiry Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Inquiry *
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {filteredInquiries.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        {selectedCustomerId
                          ? "No inquiries found for this customer"
                          : "No inquiries available"}
                      </div>
                    ) : (
                      filteredInquiries.map((inquiry) => (
                        <div
                          key={inquiry.id}
                          onClick={() => setSelectedInquiry(inquiry)}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedInquiry?.id === inquiry.id
                              ? "border-gray-600 bg-gray-50"
                              : "border-gray-200 hover:bg-gray-50"
                            }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-gray-900">
                                {inquiry.name}
                              </div>
                              <div className="text-sm text-gray-600">
                                Customer: {inquiry.customer?.companyName}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {inquiry.requests?.length || 0} items •{" "}
                                {inquiry.isAssembly ? "Assembly" : "Standard"}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-600">
                                {inquiry.status}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDate(inquiry.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {selectedInquiry && (
                  <>
                    {/* Offer Details */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Offer Title *
                      </label>
                      <input
                        type="text"
                        value={offerFormData.title}
                        onChange={(e) =>
                          setOfferFormData({
                            ...offerFormData,
                            title: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                        placeholder="e.g., Offer for Product XYZ"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Currency
                        </label>
                        <select
                          value={offerFormData.currency}
                          onChange={(e) =>
                            setOfferFormData({
                              ...offerFormData,
                              currency: e.target.value as
                                | "EUR"
                                | "USD"
                                | "RMB"
                                | "HKD",
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                        >
                          {getAvailableCurrencies().map((currency) => (
                            <option key={currency.value} value={currency.value}>
                              {currency.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Valid Until
                        </label>
                        <input
                          type="date"
                          value={
                            offerFormData.validUntil
                              ? new Date(offerFormData.validUntil)
                                .toISOString()
                                .split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            setOfferFormData({
                              ...offerFormData,
                              validUntil: new Date(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Unit Pricing Configuration */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          Unit Pricing Configuration
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            Enable Unit Pricing:
                          </span>
                          <button
                            onClick={() =>
                              setOfferFormData({
                                ...offerFormData,
                                useUnitPrices: !offerFormData.useUnitPrices,
                              })
                            }
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${offerFormData.useUnitPrices
                                ? "bg-green-500"
                                : "bg-gray-300"
                              }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${offerFormData.useUnitPrices
                                  ? "translate-x-5"
                                  : "translate-x-1"
                                }`}
                            />
                          </button>
                        </div>
                      </div>

                      {offerFormData.useUnitPrices && (
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Unit Price Decimals
                            </label>
                            <select
                              value={offerFormData.unitPriceDecimalPlaces}
                              onChange={(e) =>
                                setOfferFormData({
                                  ...offerFormData,
                                  unitPriceDecimalPlaces: parseInt(
                                    e.target.value
                                  ),
                                })
                              }
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                            >
                              <option value={2}>2</option>
                              <option value={3}>3</option>
                              <option value={4}>4</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Total Price Decimals
                            </label>
                            <select
                              value={offerFormData.totalPriceDecimalPlaces}
                              onChange={(e) =>
                                setOfferFormData({
                                  ...offerFormData,
                                  totalPriceDecimalPlaces: parseInt(
                                    e.target.value
                                  ),
                                })
                              }
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                            >
                              <option value={2}>2</option>
                              <option value={3}>3</option>
                              <option value={4}>4</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Max Columns
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={offerFormData.maxUnitPriceColumns}
                              onChange={(e) =>
                                setOfferFormData({
                                  ...offerFormData,
                                  maxUnitPriceColumns: parseInt(e.target.value),
                                })
                              }
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Assembly specific fields */}
                    {selectedInquiry.isAssembly && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">
                          Assembly Details
                        </h4>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Assembly Name
                          </label>
                          <input
                            type="text"
                            value={
                              offerFormData.assemblyName || selectedInquiry.name
                            }
                            onChange={(e) =>
                              setOfferFormData({
                                ...offerFormData,
                                assemblyName: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Assembly Description
                          </label>
                          <textarea
                            value={
                              offerFormData.assemblyDescription ||
                              selectedInquiry.description ||
                              ""
                            }
                            onChange={(e) =>
                              setOfferFormData({
                                ...offerFormData,
                                assemblyDescription: e.target.value,
                              })
                            }
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">
                        Summary
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Inquiry:</span>
                          <span className="font-medium">
                            {selectedInquiry.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Customer:</span>
                          <span className="font-medium">
                            {selectedInquiry.customer?.companyName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Items to copy:</span>
                          <span className="font-medium">
                            {selectedInquiry.requests?.length || 0} items
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Type:</span>
                          <span className="font-medium">
                            {selectedInquiry.isAssembly
                              ? "Assembly"
                              : "Standard"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pricing Mode:</span>
                          <span className="font-medium">
                            {offerFormData.useUnitPrices
                              ? "Unit Pricing"
                              : "Quantity Pricing"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetCreateForm();
                    }}
                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <CustomButton
                    gradient={true}
                    onClick={handleCreateOffer}
                    disabled={!selectedInquiry || !offerFormData.title}
                    className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all disabled:opacity-50"
                  >
                    Create Offer
                  </CustomButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedOffer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Edit Offer {selectedOffer.offerNumber}
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={editFormData.title || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        title: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={editFormData.status || ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          status: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    >
                      {getOfferStatuses().map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={editFormData.currency || "EUR"}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          currency: e.target.value as
                            | "EUR"
                            | "USD"
                            | "RMB"
                            | "HKD",
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    >
                      {getAvailableCurrencies().map((currency) => (
                        <option key={currency.value} value={currency.value}>
                          {currency.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valid Until
                    </label>
                    <input
                      type="date"
                      value={
                        editFormData.validUntil
                          ? new Date(editFormData.validUntil)
                            .toISOString()
                            .split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          validUntil: new Date(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Time
                    </label>
                    <input
                      type="text"
                      value={editFormData.deliveryTime || ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          deliveryTime: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      placeholder="e.g., 4-6 weeks"
                    />
                  </div>
                </div>

                {/* Unit Pricing Configuration */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">
                      Unit Pricing Configuration
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        Enable Unit Pricing:
                      </span>
                      <button
                        onClick={() =>
                          setEditFormData({
                            ...editFormData,
                            useUnitPrices: !editFormData.useUnitPrices,
                          })
                        }
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${editFormData.useUnitPrices
                            ? "bg-green-500"
                            : "bg-gray-300"
                          }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${editFormData.useUnitPrices
                              ? "translate-x-5"
                              : "translate-x-1"
                            }`}
                        />
                      </button>
                    </div>
                  </div>

                  {editFormData.useUnitPrices && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Unit Price Decimals
                        </label>
                        <select
                          value={editFormData.unitPriceDecimalPlaces || 3}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              unitPriceDecimalPlaces: parseInt(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                        >
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Total Price Decimals
                        </label>
                        <select
                          value={editFormData.totalPriceDecimalPlaces || 2}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              totalPriceDecimalPlaces: parseInt(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                        >
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Max Columns
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={editFormData.maxUnitPriceColumns || 3}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              maxUnitPriceColumns: parseInt(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Percentage
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={editFormData.discountPercentage || ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          discountPercentage: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shipping Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editFormData.shippingCost || ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          shippingCost: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={editFormData.notes || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        notes: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <CustomButton
                    gradient={true}
                    onClick={handleUpdateOffer}
                    disabled={!editFormData.title}
                    className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all"
                  >
                    Update Offer
                  </CustomButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Pricing Modal - UPDATED for Offer-Level Unit Pricing */}
      {showPricingModal && selectedOffer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Edit Pricing - {selectedOffer.offerNumber}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {selectedOffer.useUnitPrices
                      ? "Using unit prices (configured at offer level)"
                      : "Using legacy quantity prices"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCopyPasteModal(true)}
                    className="px-3 py-2 text-sm text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-all flex items-center gap-2"
                  >
                    <ClipboardIcon className="h-4 w-4" />
                    Copy/Paste from Spreadsheet
                  </button>
                  {/* {selectedOffer.useUnitPrices && (
                    <button
                      onClick={() =>
                        handleSyncUnitPricesAcrossOffer(selectedOffer.id)
                      }
                      className="px-3 py-2 text-sm text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-50 transition-all flex items-center gap-2"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      Sync All Line Items
                    </button>
                  )} */}
                  <button
                    onClick={() => setShowPricingModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Offer-Level Unit Pricing Configuration */}
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        Offer-Level Unit Pricing Configuration
                      </h3>
                      <p className="text-sm text-gray-600">
                        Settings apply to all line items in this offer
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          openOfferUnitPriceSettings(selectedOffer)
                        }
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <CogIcon className="h-4 w-4" />
                        Settings
                      </button>
                      <button
                        onClick={() =>
                          handleToggleOfferUnitPrices(
                            selectedOffer.id,
                            !selectedOffer.useUnitPrices
                          )
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${selectedOffer.useUnitPrices
                            ? "bg-green-500"
                            : "bg-gray-300"
                          }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${selectedOffer.useUnitPrices
                              ? "translate-x-6"
                              : "translate-x-1"
                            }`}
                        />
                      </button>
                    </div>
                  </div>
                  {selectedOffer.useUnitPrices && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">
                          Unit Price Decimals
                        </div>
                        <div className="text-gray-600">
                          {selectedOffer.unitPriceDecimalPlaces || 3}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          Total Price Decimals
                        </div>
                        <div className="text-gray-600">
                          {selectedOffer.totalPriceDecimalPlaces || 2}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          Max Columns
                        </div>
                        <div className="text-gray-600">
                          {selectedOffer.maxUnitPriceColumns || 3}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {selectedOffer.lineItems
                  ?.filter((item: any) => !item.isComponent)
                  .map((item: any) => {
                    const activePrice = getActivePrice(
                      item,
                      selectedOffer.useUnitPrices
                    );
                    const activePriceType = getActivePriceType(
                      item,
                      selectedOffer.useUnitPrices
                    );

                    return (
                      <div
                        key={item.id}
                        className="p-4 border border-gray-200 rounded-lg bg-white"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="font-medium text-gray-900">
                              {item.position}. {item.itemName}
                            </div>
                            {item.description && (
                              <div className="text-sm text-gray-600 mt-1">
                                {item.description}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                              {formatCurrency(
                                calculateLineItemTotal(
                                  item,
                                  selectedOffer.useUnitPrices
                                ) || 0,
                                selectedOffer.currency
                              )}
                            </div>
                            {activePrice && (
                              <div className="text-xs text-gray-500">
                                Active:{" "}
                                {activePriceType === "unit"
                                  ? "Unit Price"
                                  : "Quantity Price"}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Price Tables */}
                        {selectedOffer.useUnitPrices ? (
                          // Unit Prices Table
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900">
                                Unit Prices (
                                {selectedOffer.unitPriceDecimalPlaces || 3}{" "}
                                decimal places)
                              </h4>
                              <button
                                onClick={() => {
                                  // Open add unit price form
                                  setSelectedLineItem(item);
                                  setUnitPriceFormData({
                                    quantity: "",
                                    unitPrice: "",
                                    isActive: false,
                                  });
                                }}
                                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-all flex items-center gap-1"
                              >
                                <PlusIcon className="h-4 w-4" />
                                Add Unit Price
                              </button>
                            </div>

                            {item.unitPrices?.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                                        Quantity
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                                        Unit Price
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                                        Total Price
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                                        Active
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                                        Actions
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {item.unitPrices.map(
                                      (up: UnitPrice, idx: number) => (
                                        <tr
                                          key={up.id}
                                          className="hover:bg-gray-50"
                                        >
                                          <td className="px-3 py-2">
                                            <input
                                              type="text"
                                              value={up.quantity}
                                              onChange={(e) =>
                                                handleUpdateUnitPrice(
                                                  item.id,
                                                  up.id,
                                                  {
                                                    quantity: e.target.value,
                                                    totalPrice:
                                                      calculateUnitPriceTotal(
                                                        e.target.value,
                                                        up.unitPrice,
                                                        selectedOffer.totalPriceDecimalPlaces ||
                                                        2
                                                      ),
                                                  }
                                                )
                                              }
                                              className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                                            />
                                          </td>
                                          <td className="px-3 py-2">
                                            <div className="flex items-center gap-1">
                                              <span className="text-gray-500">
                                                {selectedOffer.currency}
                                              </span>
                                              <input
                                                type="number"
                                                step={
                                                  selectedOffer.unitPriceDecimalPlaces ===
                                                    3
                                                    ? "0.001"
                                                    : selectedOffer.unitPriceDecimalPlaces ===
                                                      2
                                                      ? "0.01"
                                                      : "0.0001"
                                                }
                                                value={up.unitPrice}
                                                onChange={(e) =>
                                                  handleUpdateUnitPrice(
                                                    item.id,
                                                    up.id,
                                                    {
                                                      unitPrice: parseFloat(
                                                        e.target.value
                                                      ),
                                                      totalPrice:
                                                        calculateUnitPriceTotal(
                                                          up.quantity,
                                                          parseFloat(
                                                            e.target.value
                                                          ),
                                                          selectedOffer.totalPriceDecimalPlaces ||
                                                          2
                                                        ),
                                                    }
                                                  )
                                                }
                                                className="w-32 px-2 py-1 text-sm border border-gray-300 rounded"
                                              />
                                            </div>
                                          </td>
                                          <td className="px-3 py-2 font-medium">
                                            {formatTotalPrice(up.totalPrice)}
                                          </td>
                                          <td className="px-3 py-2">
                                            <input
                                              type="radio"
                                              name={`active-unit-price-${item.id}`}
                                              checked={up.isActive}
                                              onChange={() =>
                                                handleSetActivePrice(
                                                  item.id,
                                                  "unit",
                                                  idx
                                                )
                                              }
                                              className="h-4 w-4 text-gray-600"
                                            />
                                          </td>
                                          <td className="px-3 py-2">
                                            <button
                                              onClick={() =>
                                                handleDeleteUnitPrice(
                                                  item.id,
                                                  up.id
                                                )
                                              }
                                              className="text-red-600 hover:text-red-800 text-xs"
                                            >
                                              Delete
                                            </button>
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-center py-4 text-gray-500">
                                No unit prices set. Add your first unit price.
                              </div>
                            )}
                          </div>
                        ) : (
                          // Legacy Quantity Prices Table
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900">
                                Quantity-Based Prices
                              </h4>
                              <button
                                onClick={() => {
                                  const newQuantity = prompt(
                                    "Enter quantity (e.g., 1000):"
                                  );
                                  const newPrice = prompt(
                                    `Enter price per unit in ${selectedOffer.currency}:`
                                  );

                                  if (newQuantity && newPrice) {
                                    addQuantityPrice(item.id, {
                                      quantity: newQuantity,
                                      price: parseFloat(newPrice),
                                      isActive: false,
                                    }).then((updatedItem: any) => {
                                      const updatedItems =
                                        selectedOffer.lineItems.map((li: any) =>
                                          li.id === item.id
                                            ? updatedItem.data
                                            : li
                                        );
                                      setSelectedOffer({
                                        ...selectedOffer,
                                        lineItems: updatedItems,
                                      });
                                    });
                                  }
                                }}
                                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-all"
                              >
                                Add Price Level
                              </button>
                            </div>

                            {item.quantityPrices?.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                                        Quantity
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                                        Unit Price
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                                        Total
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                                        Active
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                                        Actions
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {item.quantityPrices.map(
                                      (qp: any, idx: number) => (
                                        <tr
                                          key={idx}
                                          className="hover:bg-gray-50"
                                        >
                                          <td className="px-3 py-2">
                                            <input
                                              type="text"
                                              value={qp.quantity}
                                              onChange={(e) => {
                                                const updatedPrices =
                                                  item.quantityPrices.map(
                                                    (p: any, i: number) =>
                                                      i === idx
                                                        ? {
                                                          ...p,
                                                          quantity:
                                                            e.target.value,
                                                          total:
                                                            calculateLineTotal(
                                                              e.target.value,
                                                              p.price
                                                            ),
                                                        }
                                                        : p
                                                  );
                                                updateLineItem(
                                                  selectedOffer.id,
                                                  item.id,
                                                  {
                                                    quantityPrices:
                                                      updatedPrices,
                                                  }
                                                ).then((updatedItem) => {
                                                  const updatedItems =
                                                    selectedOffer.lineItems.map(
                                                      (li: any) =>
                                                        li.id === item.id
                                                          ? updatedItem.data
                                                          : li
                                                    );
                                                  setSelectedOffer({
                                                    ...selectedOffer,
                                                    lineItems: updatedItems,
                                                  });
                                                });
                                              }}
                                              className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                                            />
                                          </td>
                                          <td className="px-3 py-2">
                                            <div className="flex items-center gap-1">
                                              <span className="text-gray-500">
                                                {selectedOffer.currency}
                                              </span>
                                              <input
                                                type="number"
                                                step="0.001"
                                                value={qp.price}
                                                onChange={(e) => {
                                                  const updatedPrices =
                                                    item.quantityPrices.map(
                                                      (p: any, i: number) =>
                                                        i === idx
                                                          ? {
                                                            ...p,
                                                            price: parseFloat(
                                                              e.target.value
                                                            ),
                                                            total:
                                                              calculateLineTotal(
                                                                p.quantity,
                                                                parseFloat(
                                                                  e.target
                                                                    .value
                                                                )
                                                              ),
                                                          }
                                                          : p
                                                    );
                                                  updateLineItem(
                                                    selectedOffer.id,
                                                    item.id,
                                                    {
                                                      quantityPrices:
                                                        updatedPrices,
                                                    }
                                                  ).then((updatedItem) => {
                                                    const updatedItems =
                                                      selectedOffer.lineItems.map(
                                                        (li: any) =>
                                                          li.id === item.id
                                                            ? updatedItem.data
                                                            : li
                                                      );
                                                    setSelectedOffer({
                                                      ...selectedOffer,
                                                      lineItems: updatedItems,
                                                    });
                                                  });
                                                }}
                                                className="w-32 px-2 py-1 text-sm border border-gray-300 rounded"
                                              />
                                            </div>
                                          </td>
                                          <td className="px-3 py-2 font-medium">
                                            {formatTotalPrice(qp.total)}
                                          </td>
                                          <td className="px-3 py-2">
                                            <input
                                              type="radio"
                                              name={`active-price-${item.id}`}
                                              checked={qp.isActive}
                                              onChange={() =>
                                                handleSetActivePrice(
                                                  item.id,
                                                  "quantity",
                                                  idx
                                                )
                                              }
                                              className="h-4 w-4 text-gray-600"
                                            />
                                          </td>
                                          <td className="px-3 py-2">
                                            <button
                                              onClick={() => {
                                                if (
                                                  window.confirm(
                                                    "Delete this price level?"
                                                  )
                                                ) {
                                                  const updatedPrices =
                                                    item.quantityPrices.filter(
                                                      (_: any, i: number) =>
                                                        i !== idx
                                                    );
                                                  updateLineItem(
                                                    selectedOffer.id,
                                                    item.id,
                                                    {
                                                      quantityPrices:
                                                        updatedPrices,
                                                    }
                                                  ).then((updatedItem) => {
                                                    const updatedItems =
                                                      selectedOffer.lineItems.map(
                                                        (li: any) =>
                                                          li.id === item.id
                                                            ? updatedItem.data
                                                            : li
                                                      );
                                                    setSelectedOffer({
                                                      ...selectedOffer,
                                                      lineItems: updatedItems,
                                                    });
                                                  });
                                                }
                                              }}
                                              className="text-red-600 hover:text-red-800 text-xs"
                                            >
                                              Delete
                                            </button>
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-center py-4 text-gray-500">
                                No quantity-based prices set. Add your first
                                price level.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                {/* Add Unit Price Form Modal */}
                {selectedLineItem && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-bold text-gray-900">
                            Add Unit Price
                          </h3>
                          <button
                            onClick={() => setSelectedLineItem(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quantity *
                            </label>
                            <input
                              type="text"
                              value={unitPriceFormData.quantity}
                              onChange={(e) =>
                                setUnitPriceFormData({
                                  ...unitPriceFormData,
                                  quantity: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                              placeholder="e.g., 1000"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Unit Price * ({selectedOffer?.currency})
                            </label>
                            <input
                              type="number"
                              step={
                                selectedOffer?.unitPriceDecimalPlaces === 3
                                  ? "0.001"
                                  : selectedOffer?.unitPriceDecimalPlaces === 2
                                    ? "0.01"
                                    : "0.0001"
                              }
                              value={unitPriceFormData.unitPrice}
                              onChange={(e) =>
                                setUnitPriceFormData({
                                  ...unitPriceFormData,
                                  unitPrice: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                              placeholder="e.g., 4.500"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={unitPriceFormData.isActive}
                              onChange={(e) =>
                                setUnitPriceFormData({
                                  ...unitPriceFormData,
                                  isActive: e.target.checked,
                                })
                              }
                              className="h-4 w-4 text-gray-600"
                            />
                            <label className="text-sm text-gray-700">
                              Set as active price
                            </label>
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <button
                              onClick={() => setSelectedLineItem(null)}
                              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() =>
                                handleAddUnitPrice(selectedLineItem.id)
                              }
                              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              Add Unit Price
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Offer-Level Unit Price Settings Modal */}
                {showOfferUnitPriceSettingsModal && selectedOffer && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-bold text-gray-900">
                            Offer Unit Price Settings
                          </h3>
                          <button
                            onClick={() =>
                              setShowOfferUnitPriceSettingsModal(false)
                            }
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Unit Price Decimal Places
                            </label>
                            <select
                              value={
                                offerUnitPriceSettings.unitPriceDecimalPlaces
                              }
                              onChange={(e) =>
                                setOfferUnitPriceSettings({
                                  ...offerUnitPriceSettings,
                                  unitPriceDecimalPlaces: parseInt(
                                    e.target.value
                                  ),
                                })
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                            >
                              <option value={2}>2</option>
                              <option value={3}>3</option>
                              <option value={4}>4</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Total Price Decimal Places
                            </label>
                            <select
                              value={
                                offerUnitPriceSettings.totalPriceDecimalPlaces
                              }
                              onChange={(e) =>
                                setOfferUnitPriceSettings({
                                  ...offerUnitPriceSettings,
                                  totalPriceDecimalPlaces: parseInt(
                                    e.target.value
                                  ),
                                })
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                            >
                              <option value={2}>2</option>
                              <option value={3}>3</option>
                              <option value={4}>4</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Max Unit Price Columns
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={offerUnitPriceSettings.maxUnitPriceColumns}
                              onChange={(e) =>
                                setOfferUnitPriceSettings({
                                  ...offerUnitPriceSettings,
                                  maxUnitPriceColumns: parseInt(e.target.value),
                                })
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <button
                              onClick={() =>
                                setShowOfferUnitPriceSettingsModal(false)
                              }
                              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleUpdateOfferUnitPriceSettings}
                              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              Save Settings
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        Total Amount
                      </h3>
                      <p className="text-sm text-gray-600">
                        Updates automatically based on active prices
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(
                          selectedOffer.totalAmount || 0,
                          selectedOffer.currency
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        incl. VAT, discounts, and shipping
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowPricingModal(false)}
                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowPricingModal(false);
                      fetchOffers();
                    }}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy/Paste Prices Modal */}
      {showCopyPasteModal && selectedOffer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Copy/Paste Prices from Spreadsheet
                  </h2>
                </div>
                <button
                  onClick={() => setShowCopyPasteModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instructions
                  </label>
                  <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                    <p className="font-medium mb-2">
                      Expected format for{" "}
                      {selectedOffer.useUnitPrices ? "Unit" : "Quantity"}{" "}
                      Prices:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>One line per price level</li>
                      <li>Columns separated by tabs or commas</li>
                      <li>
                        Format: Item Position, Quantity,{" "}
                        {selectedOffer.useUnitPrices ? "Unit Price" : "Price"}
                      </li>
                      <li>Example: "1, 1000, 4.500" or "1\t1000\t4.500"</li>
                      {selectedOffer.useUnitPrices && (
                        <li>
                          Unit prices should have{" "}
                          {selectedOffer.unitPriceDecimalPlaces || 3} decimal
                          places
                        </li>
                      )}
                    </ul>
                    <p className="mt-3">
                      Position should match the item position in the offer. This
                      will update the item's{" "}
                      {selectedOffer.useUnitPrices
                        ? "unit prices"
                        : "quantity prices"}
                      .
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste Your Data
                  </label>
                  <textarea
                    value={copyPasteData}
                    onChange={(e) => setCopyPasteData(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent font-mono"
                    placeholder={
                      selectedOffer.useUnitPrices
                        ? `Example for Unit Prices (${selectedOffer.unitPriceDecimalPlaces || 3
                        } decimal places):
1, 1000, 4.500
1, 5000, 4.200
2, 1000, 8.750
2, 5000, 8.250
3, 500, 12.000
3, 2000, 11.500`
                        : `Example for Quantity Prices:
1, 1000, 4.50
1, 5000, 4.20
2, 1000, 8.75
2, 5000, 8.25
3, 500, 12.00
3, 2000, 11.50`
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview
                  </label>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                    {copyPasteData.trim() ? (
                      <div className="space-y-2">
                        {copyPasteData.split("\n").map(
                          (line, idx) =>
                            line.trim() && (
                              <div
                                key={idx}
                                className="text-sm text-gray-700 font-mono flex items-start gap-2"
                              >
                                <span className="text-gray-500 w-6">
                                  {idx + 1}.
                                </span>
                                <span>{line}</span>
                              </div>
                            )
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">
                        Paste data to see preview...
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={() => {
                      setShowCopyPasteModal(false);
                      setCopyPasteData("");
                    }}
                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCopyPastePrices}
                    disabled={!copyPasteData.trim()}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Process Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OffersPage;

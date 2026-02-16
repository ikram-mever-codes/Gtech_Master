"use client";
import React, { useState, useEffect } from "react";
import {
  PencilIcon,
  PhotoIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import CustomButton from "@/components/UI/CustomButton";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  getItemById,
  updateItem,
  getItemVariations,
  getItemQualityCriteria,
  ItemDetails,
} from "@/api/items";
import { loadingStyles, successStyles, errorStyles } from "@/utils/constants";
import { Package } from "lucide-react";
import PageHeader from "@/components/UI/PageHeader";

const ItemDetailsPage = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("item");
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [itemData, setItemData] = useState<ItemDetails | null>(null);
  const [variations, setVariations] = useState<any[]>([]);
  const [qualityCriteria, setQualityCriteria] = useState<any[]>([]);

  const tabs = [
    { id: "item", label: "Item Details" },
    { id: "parent", label: "Parent Details" },
    { id: "variations", label: "Variations & Values" },
    { id: "dimensions", label: "Dimensions" },
    { id: "others", label: "Others" },
    { id: "supplier", label: "Supplier" },
    { id: "quality", label: "Quality Criteria" },
    { id: "attachments", label: "Attachments" },
    { id: "pictures", label: "Item Pictures" },
  ];

  // Fetch item data
  useEffect(() => {
    const fetchItemData = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const itemId = parseInt(id as string);
        const [itemResponse, variationsResponse, qualityResponse] =
          await Promise.all([
            getItemById(itemId),
            getItemVariations(itemId),
            getItemQualityCriteria(itemId),
          ]);

        setItemData(itemResponse.data);
        setVariations(variationsResponse.data || []);
        setQualityCriteria(qualityResponse.data || []);
      } catch (error) {
        toast.error("Failed to load item details", errorStyles);
        console.error("Error fetching item data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchItemData();
  }, [id]);

  // Handle update item
  const handleUpdateItem = async (updatedData: any) => {
    if (!itemData || !id) return;

    try {
      const itemId = parseInt(id as string);
      await updateItem(itemId, updatedData);
      setItemData({ ...itemData, ...updatedData });
      setEditMode(false);
      toast.success("Item updated successfully", successStyles);
    } catch (error) {
      toast.error("Failed to update item", errorStyles);
    }
  };

  // Status indicator component
  const StatusIndicator = ({
    value,
    label = "",
  }: {
    value: boolean;
    label?: string;
  }) => (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${value ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}
    >
      {value ? (
        <CheckCircleIcon className="h-3 w-3" />
      ) : (
        <XCircleIcon className="h-3 w-3" />
      )}
      {label || (value ? "Yes" : "No")}
    </span>
  );

  // Editable Info row component
  const EditableInfoRow = ({
    label,
    value,
    field,
    type = "text",
  }: {
    label: string;
    value: string;
    field: string;
    type?: string;
  }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 border-b border-gray-100">
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="md:col-span-2">
        {editMode ? (
          <input
            type={type}
            value={value || ""}
            onChange={(e) => {
              if (itemData) {
                const updated = { ...itemData };
                if (field.includes(".")) {
                  const [parent, child] = field.split(".");
                  (updated as any)[parent][child] = e.target.value;
                } else {
                  (updated as any)[field] = e.target.value;
                }
                setItemData(updated);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        ) : (
          <span className="text-gray-900">{value || "—"}</span>
        )}
      </div>
    </div>
  );

  // Info row component for consistent styling
  const InfoRow = ({
    label,
    value,
    children,
  }: {
    label: string;
    value?: string;
    children?: React.ReactNode;
  }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 border-b border-gray-100">
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="md:col-span-2">
        {children || <span className="text-gray-900">{value || "—"}</span>}
      </div>
    </div>
  );

  // Section header component
  const SectionHeader = ({
    title,
    icon,
  }: {
    title: string;
    icon?: React.ReactNode;
  }) => (
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white shadow-xl rounded-lg p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary" />
              <p className="mt-4 text-gray-600">Loading item details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!itemData) {
    return (
      <div className="min-h-screen bg-white shadow-xl rounded-lg p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">
                Item Not Found
              </h2>
              <p className="text-gray-600 mt-2">
                The requested item could not be found.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white shadow-xl rounded-lg p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <PageHeader title={`Item Details: ${itemData.itemNo}`} icon={Package} />
            </div>
            <div className="flex gap-3">
              <CustomButton
                onClick={() => {
                  if (editMode) {
                    handleUpdateItem(itemData);
                  } else {
                    setEditMode(!editMode);
                  }
                }}
                className="px-4 py-2 bg-gray-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-gray-700/90 transition-all flex items-center gap-2"
              >
                <PencilIcon className="h-4 w-4" />
                {editMode ? "Save Changes" : "Edit Data"}
              </CustomButton>
              {editMode && (
                <CustomButton
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                >
                  Cancel
                </CustomButton>
              )}
            </div>
          </div>

          {/* Status bar */}
          <div className="flex flex-wrap gap-3 mb-6">
            <StatusIndicator value={itemData.isActive} label="Active" />
            <StatusIndicator
              value={itemData.parent.isSpecialItem}
              label="Special Item"
            />
            <StatusIndicator value={itemData.others.isStock} label="In Stock" />
            <StatusIndicator value={itemData.others.isNew} label="New" />
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                  ? "text-gray-900 border-b-2 border-gray-600"
                  : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100/50 p-6">
          {/* Item Details Tab */}
          {activeTab === "item" && (
            <div>
              <SectionHeader title="Item Information" />

              <div className="space-y-1">
                <EditableInfoRow label="EAN" value={itemData.ean} field="ean" />
                <EditableInfoRow
                  label="Item Name"
                  value={itemData.name}
                  field="name"
                />
                <EditableInfoRow
                  label="Item Name CN"
                  value={itemData.nameCN}
                  field="nameCN"
                />
                <EditableInfoRow
                  label="Category"
                  value={itemData.category}
                  field="category"
                />
                <EditableInfoRow
                  label="Model"
                  value={itemData.model}
                  field="model"
                />
                <EditableInfoRow
                  label="Remark"
                  value={itemData.remark}
                  field="remark"
                />
                <InfoRow label="Active">
                  <StatusIndicator value={itemData.isActive} />
                </InfoRow>
              </div>
            </div>
          )}

          {/* Parent Details Tab */}
          {activeTab === "parent" && (
            <div>
              <SectionHeader title="Parent Details" />

              <div className="space-y-1">
                <InfoRow label="Parent No DE" value={itemData.parent.noDE} />
                <InfoRow
                  label="Parent Name DE"
                  value={itemData.parent.nameDE}
                />
                <InfoRow
                  label="Parent Name EN"
                  value={itemData.parent.nameEN}
                />
                <InfoRow label="Active">
                  <StatusIndicator value={itemData.parent.isActive} />
                </InfoRow>
                <InfoRow label="Is Special Item?">
                  <StatusIndicator value={itemData.parent.isSpecialItem} />
                </InfoRow>

                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">
                    Special Pricing
                  </h4>
                  <div className="space-y-1">
                    <InfoRow
                      label="EUR Price"
                      value={`€${itemData.parent.priceEUR}`}
                    />
                    <InfoRow
                      label="RMB Price"
                      value={`¥${itemData.parent.priceRMB}`}
                    />
                    <InfoRow label="EUR Special">
                      <StatusIndicator value={itemData.parent.isEURSpecial} />
                    </InfoRow>
                    <InfoRow label="RMB Special">
                      <StatusIndicator value={itemData.parent.isRMBSpecial} />
                    </InfoRow>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Variations Tab */}
          {activeTab === "variations" && (
            <div>
              <SectionHeader title="Variations & Values" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* German Variations */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    German (DE)
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        Variations:
                      </h5>
                      {itemData.variationsDE.variations.length > 0 ? (
                        <ul className="space-y-1">
                          {itemData.variationsDE.variations.map(
                            (variation, index) => (
                              <li
                                key={index}
                                className="text-gray-900 bg-gray-50 px-3 py-2 rounded"
                              >
                                {variation}
                              </li>
                            )
                          )}
                        </ul>
                      ) : (
                        <p className="text-gray-500 text-sm">
                          No variations defined
                        </p>
                      )}
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        Values:
                      </h5>
                      {itemData.variationsDE.values.length > 0 ? (
                        <ul className="space-y-1">
                          {itemData.variationsDE.values.map((value, index) => (
                            <li
                              key={index}
                              className="text-gray-900 bg-gray-50 px-3 py-2 rounded"
                            >
                              {value}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 text-sm">
                          No values defined
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* English Variations */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    English (EN)
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        Variations:
                      </h5>
                      {itemData.variationsEN.variations.length > 0 ? (
                        <ul className="space-y-1">
                          {itemData.variationsEN.variations.map(
                            (variation, index) => (
                              <li
                                key={index}
                                className="text-gray-900 bg-gray-50 px-3 py-2 rounded"
                              >
                                {variation}
                              </li>
                            )
                          )}
                        </ul>
                      ) : (
                        <p className="text-gray-500 text-sm">
                          No variations defined
                        </p>
                      )}
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">
                        Values:
                      </h5>
                      {itemData.variationsEN.values.length > 0 ? (
                        <ul className="space-y-1">
                          {itemData.variationsEN.values.map((value, index) => (
                            <li
                              key={index}
                              className="text-gray-900 bg-gray-50 px-3 py-2 rounded"
                            >
                              {value}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500 text-sm">
                          No values defined
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dimensions Tab */}
          {activeTab === "dimensions" && (
            <div>
              <SectionHeader title="Dimensions & Specifications" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <EditableInfoRow
                    label="ISBN"
                    value={itemData.dimensions.isbn}
                    field="dimensions.isbn"
                  />
                  <EditableInfoRow
                    label="Weight (kg)"
                    value={itemData.dimensions.weight}
                    field="dimensions.weight"
                  />
                  <EditableInfoRow
                    label="Length (mm)"
                    value={itemData.dimensions.length}
                    field="dimensions.length"
                  />
                  <EditableInfoRow
                    label="Width (mm)"
                    value={itemData.dimensions.width}
                    field="dimensions.width"
                  />
                  <EditableInfoRow
                    label="Height (mm)"
                    value={itemData.dimensions.height}
                    field="dimensions.height"
                  />
                </div>

                {/* Visual dimension representation */}
                <div className="bg-gray-50 rounded-lg p-6 flex items-center justify-center">
                  <div className="relative">
                    <div className="w-48 h-24 border-2 border-gray-300 rounded flex items-center justify-center">
                      <span className="text-sm text-gray-600">
                        Dimension Preview
                      </span>
                    </div>
                    <div className="absolute -top-2 left-0 right-0 text-center">
                      <span className="text-xs text-gray-500 bg-white px-2">
                        {itemData.dimensions.length}mm
                      </span>
                    </div>
                    <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 text-center">
                      <span className="text-xs text-gray-500 bg-white px-2">
                        {itemData.dimensions.width}mm
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Others Tab */}
          {activeTab === "others" && (
            <div>
              <SectionHeader title="Other Details" />

              <div className="space-y-1">
                <EditableInfoRow
                  label="Taric Code"
                  value={itemData.others.taricCode}
                  field="others.taricCode"
                />
                <InfoRow label="QTY Divisible">
                  <StatusIndicator value={itemData.others.isQTYdiv} />
                </InfoRow>
                <EditableInfoRow
                  label="MC"
                  value={itemData.others.mc}
                  field="others.mc"
                />
                <EditableInfoRow
                  label="ER"
                  value={itemData.others.er}
                  field="others.er"
                />
                <InfoRow label="Is Meter">
                  <StatusIndicator value={itemData.others.isMeter} />
                </InfoRow>
                <InfoRow label="Is PU">
                  <StatusIndicator value={itemData.others.isPU} />
                </InfoRow>
                <InfoRow label="Is NPR">
                  <StatusIndicator value={itemData.others.isNPR} />
                </InfoRow>
                <InfoRow label="Is New">
                  <StatusIndicator value={itemData.others.isNew} />
                </InfoRow>
                <EditableInfoRow
                  label="Warehouse Item"
                  value={itemData.others.warehouseItem}
                  field="others.warehouseItem"
                />
                <EditableInfoRow
                  label="ID DE"
                  value={itemData.others.idDE}
                  field="others.idDE"
                />
                <EditableInfoRow
                  label="No DE"
                  value={itemData.others.noDE}
                  field="others.noDE"
                />
                <EditableInfoRow
                  label="Name DE"
                  value={itemData.others.nameDE}
                  field="others.nameDE"
                />
                <EditableInfoRow
                  label="Name EN"
                  value={itemData.others.nameEN}
                  field="others.nameEN"
                />
                <InfoRow label="Active">
                  <StatusIndicator value={itemData.others.isActive} />
                </InfoRow>
                <InfoRow label="In Stock">
                  <StatusIndicator value={itemData.others.isStock} />
                </InfoRow>
                <EditableInfoRow
                  label="Quantity"
                  value={itemData.others.qty}
                  field="others.qty"
                />
                <EditableInfoRow
                  label="MSQ"
                  value={itemData.others.msq}
                  field="others.msq"
                />
                <InfoRow label="Is NAO">
                  <StatusIndicator value={itemData.others.isNAO} />
                </InfoRow>
                <EditableInfoRow
                  label="Buffer"
                  value={itemData.others.buffer}
                  field="others.buffer"
                />
                <InfoRow label="Is SnSI">
                  <StatusIndicator value={itemData.others.isSnSI} />
                </InfoRow>
              </div>
            </div>
          )}

          {/* Supplier Tab */}
          {activeTab === "supplier" && (
            <div>
              <SectionHeader title="Supplier Information" />
              {/* Note: Supplier data would need its own API endpoint */}
              <div className="text-center py-12">
                <p className="text-gray-500">
                  Supplier information integration coming soon
                </p>
              </div>
            </div>
          )}

          {/* Quality Criteria Tab */}
          {activeTab === "quality" && (
            <div>
              <SectionHeader
                title="Quality Criteria"
                icon={
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                }
              />

              {qualityCriteria.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Picture
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description CN
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {qualityCriteria.map((criteria, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {criteria.id}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {criteria.name}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {criteria.picture ? (
                              <button className="text-blue-600 hover:text-blue-800">
                                <EyeIcon className="h-5 w-5" />
                              </button>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {criteria.description}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {criteria.description_cn}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <ExclamationTriangleIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    No quality criteria found for this item
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Attachments Tab */}
          {activeTab === "attachments" && (
            <div>
              <SectionHeader
                title="Attachments"
                icon={<DocumentIcon className="h-5 w-5 text-gray-500" />}
              />

              {itemData.attachments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PDF File Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Path/View
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Download
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {itemData.attachments.map((attachment, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {attachment.fileName}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                              <EyeIcon className="h-4 w-4" />
                              View
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button className="text-green-600 hover:text-green-800 flex items-center gap-1">
                              <ArrowDownTrayIcon className="h-4 w-4" />
                              Download
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <DocumentIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    No attachments found for this item
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Pictures Tab */}
          {activeTab === "pictures" && (
            <div>
              <SectionHeader
                title="Item Pictures"
                icon={<PhotoIcon className="h-5 w-5 text-blue-500" />}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Shop Picture */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">
                    Shop Picture
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Path:
                      </label>
                      <code className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded block overflow-x-auto">
                        {itemData.pictures.shopPicture}
                      </code>
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <PhotoIcon className="h-12 w-12 text-gray-400" />
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700">
                        Replace
                      </button>
                      <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                        View Full Size
                      </button>
                    </div>
                  </div>
                </div>

                {/* eBay Pictures */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">
                    eBay Pictures
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Path:
                      </label>
                      <code className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded block overflow-x-auto">
                        {itemData.pictures.ebayPictures}
                      </code>
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <PhotoIcon className="h-12 w-12 text-gray-400" />
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700">
                        Replace
                      </button>
                      <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                        View Full Size
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* NPR Remarks */}
              <div className="mt-8">
                <h4 className="text-md font-semibold text-gray-900 mb-4">
                  NPR Remarks
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {itemData.nprRemarks ? (
                    <p className="text-gray-900">{itemData.nprRemarks}</p>
                  ) : (
                    <p className="text-gray-500 italic">
                      No NPR remarks for this item
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions Bar */}
        <div className="mt-8 flex flex-wrap gap-3 justify-between items-center">
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
              <ArrowDownTrayIcon className="h-4 w-4" />
              Export Details
            </button>
            <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
              <PhotoIcon className="h-4 w-4" />
              Add Pictures
            </button>
            <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
              <DocumentIcon className="h-4 w-4" />
              Add Documents
            </button>
          </div>

          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailsPage;

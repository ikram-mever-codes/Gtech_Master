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
  ArrowLeftIcon,
  LinkIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import CustomButton from "@/components/UI/CustomButton";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  getItemById,
  updateItem,
  getItemVariations,
  getItemQualityCriteria,
  createQualityCriterion,
  updateQualityCriterion,
  deleteQualityCriterion,
  ItemDetails,
} from "@/api/items";
import { getAllSuppliers, Supplier } from "@/api/suppliers";
import { getCategories } from "@/api/categories";
import { uploadFile } from "@/api/library";
import CustomModal from "@/components/UI/CustomModal";
import { loadingStyles, successStyles, errorStyles, BASE_URL } from "@/utils/constants";
import { Package } from "lucide-react";
import PageHeader from "@/components/UI/PageHeader";

const hasChinese = (str: string) => /[\u4e00-\u9fa5]/.test(str || "");

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

const EditableInfoRow = ({
  label,
  value,
  field,
  type = "text",
  editMode,
  itemData,
  setItemData,
  readOnly = false,
}: {
  label: string;
  value: string;
  field: string;
  type?: string;
  editMode: boolean;
  itemData: any;
  setItemData: (data: any) => void;
  readOnly?: boolean;
}) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 border-b border-gray-100">
    <div className="text-sm font-medium text-gray-700">{label}</div>
    <div className="md:col-span-2">
      {editMode && !readOnly ? (
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

const SelectInfoRow = ({
  label,
  value,
  field,
  options,
  editMode,
  itemData,
  setItemData,
}: {
  label: string;
  value: string;
  field: string;
  options: { label: string; value: string }[];
  editMode: boolean;
  itemData: any;
  setItemData: (data: any) => void;
}) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 border-b border-gray-100">
    <div className="text-sm font-medium text-gray-700">{label}</div>
    <div className="md:col-span-2">
      {editMode ? (
        <select
          value={value || ""}
          onChange={(e) => {
            if (itemData) {
              const updated = { ...itemData };
              const val = e.target.value;
              const booleanFields = [
                "isActive",
                "others.isQTYdiv",
                "others.isMeter",
                "others.isPU",
                "others.isNAO",
                "others.isSnSI",
                "others.isStock",
                "others.isActive",
                "others.isNew",
                "others.isDimensionSpecial",
                "parent.isEURSpecial",
                "parent.isRMBSpecial",
              ];
              let finalValue: any = val;
              if (booleanFields.includes(field)) {
                finalValue = val === "Y" || val === "Yes";
              }

              if (field.includes(".")) {
                const [parent, child] = field.split(".");
                (updated as any)[parent][child] = finalValue;
              } else {
                (updated as any)[field] = finalValue;
              }
              setItemData(updated);
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-gray-900">
          {options.find((opt) => opt.value === value)?.label || value || "—"}
        </span>
      )}
    </div>
  </div>
);

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

const ItemDetailsPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("item");
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [itemData, setItemData] = useState<ItemDetails | null>(null);
  const [variations, setVariations] = useState<any[]>([]);
  const [qualityCriteria, setQualityCriteria] = useState<any[]>([]);
  const [isQualityModalOpen, setIsQualityModalOpen] = useState(false);
  const [editingQuality, setEditingQuality] = useState<any>(null);
  const [qualityFormData, setQualityFormData] = useState({
    name: "",
    description: "",
    descriptionCN: "",
    picture: null as File | null,
    pictureUrl: "",
  });
  const [uploadingPictures, setUploadingPictures] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const attachmentInputRef = React.useRef<HTMLInputElement>(null);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isLinkSupplierModalOpen, setIsLinkSupplierModalOpen] = useState(false);
  const [selectedSupplierToLink, setSelectedSupplierToLink] = useState("");

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString || dateString === "0000-00-00 00:00:00") return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const getCorrectUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("cloudinary.com")) return url;

    if (url.includes("/uploads/")) {
      const fileName = url.split("/uploads/").pop();
      try {
        const apiOrigin = new URL(BASE_URL).origin;
        return `${apiOrigin}/uploads/${fileName}`;
      } catch (e) {
        return url;
      }
    }
    return url;
  };

  const handleOpenQualityModal = (quality: any = null) => {
    if (quality) {
      setEditingQuality(quality);
      setQualityFormData({
        name: quality.name || "",
        description: quality.description || "",
        descriptionCN: quality.descriptionCN || "",
        picture: null,
        pictureUrl: quality.picture || "",
      });
    } else {
      setEditingQuality(null);
      setQualityFormData({
        name: "",
        description: "",
        descriptionCN: "",
        picture: null,
        pictureUrl: "",
      });
    }
    setIsQualityModalOpen(true);
  };

  const handleCloseQualityModal = () => {
    setIsQualityModalOpen(false);
    setEditingQuality(null);
  };

  const calculateEANCheckDigit = (code: string) => {
    let sum = 0;
    for (let i = 0; i < code.length; i++) {
      const digit = parseInt(code[i]);
      sum += i % 2 === 0 ? digit * 1 : digit * 3;
    }
    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
  };

  const generateEAN = (itemId: number) => {
    const prefix = "789";
    const timestamp = (Date.now() % 1000000).toString().padStart(6, "0");
    const idStr = itemId.toString().padStart(6, "0");
    const baseNumber = (idStr + timestamp).slice(0, 9);
    const eanWithoutCheck = prefix + baseNumber;
    const checkDigit = calculateEANCheckDigit(eanWithoutCheck);
    return eanWithoutCheck + checkDigit;
  };

  const handleLinkSupplier = () => {
    if (!selectedSupplierToLink || !itemData) return;

    const supplier = allSuppliers.find(
      (s) => String(s.id) === selectedSupplierToLink,
    );
    if (!supplier) return;

    if (
      itemData.supplierItems?.some(
        (si) => String(si.supplierId) === selectedSupplierToLink,
      )
    ) {
      toast.error("This supplier is already linked to this item", errorStyles);
      return;
    }

    const newLink = {
      id: -Math.floor(Date.now() % 1000000000),
      supplierId: supplier.id,
      supplierName: String(supplier.company_name || supplier.name || "Unknown"),
      priceRMB: "0",
      isPO: "No",
      moq: "0",
      interval: "0",
      leadTime: "",
      noteCN: "",
      url: "",
      isDefault: (itemData.supplierItems?.length || 0) === 0,
    };

    const updated: ItemDetails = {
      ...itemData,
      supplierItems: [...(itemData.supplierItems || []), newLink],
    };

    setItemData(updated);

    setIsLinkSupplierModalOpen(false);
    setSelectedSupplierToLink("");
    toast.success(
      "Supplier source added to list. Remember to save changes.",
      successStyles,
    );
  };

  const handleRemoveSupplier = (linkId: number) => {
    if (!itemData) return;
    const link = itemData.supplierItems?.find(si => si.id === linkId);
    if (link?.isDefault) {
      toast.error("Cannot remove the default supplier. Set another as default first.", errorStyles);
      return;
    }

    setItemData({
      ...itemData,
      supplierItems: itemData.supplierItems.filter(si => si.id !== linkId)
    });
  };

  const handleQualityFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setQualityFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setQualityFormData((prev) => ({ ...prev, picture: e.target.files![0] }));
    }
  };

  const handleSaveQuality = async () => {
    if (!id) return;
    const itemId = parseInt(id as string);

    try {
      let pictureUrl = qualityFormData.pictureUrl;

      if (qualityFormData.picture) {
        const formData = new FormData();
        formData.append("file", qualityFormData.picture);
        const uploadRes = await uploadFile(formData);
        pictureUrl = uploadRes.data.url;
      }

      const payload = {
        name: qualityFormData.name,
        description: qualityFormData.description,
        description_cn: qualityFormData.descriptionCN,
        picture: pictureUrl,
      };

      if (editingQuality) {
        await updateQualityCriterion(editingQuality.id, payload);
      } else {
        await createQualityCriterion(itemId, payload);
      }

      const qualityResponse = await getItemQualityCriteria(itemId);
      setQualityCriteria(qualityResponse.data || []);
      handleCloseQualityModal();
    } catch (error) {
      console.error("Error saving quality criterion:", error);
    }
  };

  const handleDeleteQuality = async (qualityId: number) => {
    if (!confirm("Are you sure you want to delete this quality criterion?"))
      return;
    try {
      await deleteQualityCriterion(qualityId);
      setQualityCriteria((prev) => prev.filter((q) => q.id !== qualityId));
    } catch (error) {
      console.error("Error deleting quality criterion:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !itemData) return;
    setUploadingPictures(true);
    const toastId = toast.loading("Uploading pictures...", loadingStyles);

    try {
      const files = Array.from(e.target.files);
      const newUrls: string[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await uploadFile(formData, false);
        if (res.data?.url) {
          newUrls.push(res.data.url);
        }
      }

      if (newUrls.length > 0) {
        const updated = { ...itemData };
        let currentShop = updated.pictures.shopPicture;
        let currentEbay = updated.pictures.ebayPictures;
        let currentGallery = updated.pictures.pixPath
          ? updated.pictures.pixPath.split(",").filter(Boolean)
          : [];

        newUrls.forEach((url) => {
          if (!currentShop) {
            currentShop = url;
          } else if (!currentEbay) {
            currentEbay = url;
          } else {
            currentGallery.push(url);
          }
        });

        updated.pictures.shopPicture = currentShop;
        updated.pictures.ebayPictures = currentEbay;
        updated.pictures.pixPath = currentGallery.join(",");

        await handleUpdateItem(updated);
        toast.success("Pictures uploaded successfully", {
          id: toastId,
          ...successStyles,
        });
      } else {
        toast.dismiss(toastId);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload pictures", { id: toastId, ...errorStyles });
    } finally {
      setUploadingPictures(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = async (field: string, url: string) => {
    if (!itemData || !confirm("Are you sure you want to remove this picture?"))
      return;

    const updated = { ...itemData };
    if (field === "shopPicture") {
      updated.pictures.shopPicture = "";
    } else if (field === "ebayPictures") {
      updated.pictures.ebayPictures = "";
    } else if (field === "pixPath") {
      const pics = updated.pictures.pixPath.split(",").filter(Boolean);
      updated.pictures.pixPath = pics.filter((p) => p !== url).join(",");
    }

    await handleUpdateItem(updated);
    toast.success("Picture removed");
  };

  const handleAttachmentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !id) return;

    const toastId = toast.loading("Uploading attachments...", loadingStyles);
    setUploadingAttachments(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        formData.append("itemId", id as string);
        formData.append("isPublic", "true");
        await uploadFile(formData, false);
      }

      const itemResponse: any = await getItemById(parseInt(id as string));
      if (itemResponse.data && itemData) {
        const toBool = (val: any) =>
          val === "Y" ||
          val === "Yes" ||
          val === true ||
          val === 1 ||
          val === "1";
        const rawItem = itemResponse.data;
        const transformedItem: ItemDetails = {
          ...rawItem,
          id: rawItem.id || itemData.id,
          isActive: toBool(rawItem.isActive),
          parent: {
            ...rawItem.parent,
            isActive: toBool(rawItem.parent.isActive),
            isSpecialItem: toBool(rawItem.parent.isSpecialItem),
            isEURSpecial: toBool(rawItem.parent.isEURSpecial),
            isRMBSpecial: toBool(rawItem.parent.isRMBSpecial),
            isDimensionSpecial: toBool(rawItem.parent.isDimensionSpecial),
          },
          others: {
            ...rawItem.others,
            isQTYdiv: toBool(rawItem.others.isQTYdiv),
            isMeter: toBool(rawItem.others.isMeter),
            isPU: toBool(rawItem.others.isPU),
            isNPR: toBool(rawItem.others.isNPR),
            isNew: toBool(rawItem.others.isNew),
            isActive: toBool(rawItem.others.isActive),
            isStock: toBool(rawItem.others.isStock),
            isNAO: toBool(rawItem.others.isNAO),
            isSnSI: toBool(rawItem.others.isSnSI),
            isDimensionSpecial: toBool(rawItem.others.isDimensionSpecial),
            pixPath: rawItem.others.pixPath || "",
          },
          pictures: {
            shopPicture: rawItem.pictures.shopPicture || "",
            ebayPictures: rawItem.pictures.ebayPictures || "",
            pixPath: rawItem.pictures.pixPath || "",
          },
        };
        setItemData(transformedItem);
      }

      toast.success("Attachments uploaded successfully", {
        id: toastId,
        ...successStyles,
      });
    } catch (error) {
      console.error("Attachment upload error:", error);
      toast.error("Failed to upload attachments", {
        id: toastId,
        ...errorStyles,
      });
    } finally {
      setUploadingAttachments(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;

    const toastId = toast.loading("Deleting attachment...", loadingStyles);
    try {
      const { deleteFile } = await import("@/api/library");
      await deleteFile(fileId);

      if (itemData) {
        setItemData({
          ...itemData,
          attachments: itemData.attachments.filter((a) => a.id !== fileId),
        });
      }
      toast.success("Attachment deleted", { id: toastId, ...successStyles });
    } catch (error) {
      toast.error("Failed to delete attachment", {
        id: toastId,
        ...errorStyles,
      });
    }
  };

  const tabs = [
    { id: "item", label: "Item Details" },
    { id: "parent", label: "Parent Details" },
    { id: "variations", label: "Variations & Values" },
    { id: "dimensions", label: "Dimensions" },
    { id: "others", label: "Others" },
    { id: "supplier", label: "Supplier Item" },
    { id: "quality", label: "Quality Criteria" },
    { id: "attachments", label: "Attachments" },
    { id: "pictures", label: "Item Pictures" },
  ];
  useEffect(() => {
    const fetchItemData = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const itemId = parseInt(id as string);
        const [
          itemResponse,
          variationsResponse,
          qualityResponse,
          suppliersRes,
          catsRes,
        ]: any = await Promise.all([
          getItemById(itemId),
          getItemVariations(itemId),
          getItemQualityCriteria(itemId),
          getAllSuppliers({ limit: 1000 }),
          getCategories(),
        ]);

        if (suppliersRes?.data) setAllSuppliers(suppliersRes.data);
        if (catsRes?.data) {
          const regularCategories = catsRes.data.filter(
            (cat: any) => !cat.name?.toString().trim().startsWith("Imported"),
          );
          setCategories(regularCategories);
        }

        const rawItem = itemResponse.data;
        const toBool = (val: any) =>
          val === "Y" ||
          val === "Yes" ||
          val === true ||
          val === 1 ||
          val === "1";

        const transformedItem: ItemDetails = {
          ...rawItem,
          isActive: toBool(rawItem.isActive),
          parent: {
            ...rawItem.parent,
            isActive: toBool(rawItem.parent.isActive),
            isSpecialItem: toBool(rawItem.parent.isSpecialItem),
            isEURSpecial: toBool(rawItem.parent.isEURSpecial),
            isRMBSpecial: toBool(rawItem.parent.isRMBSpecial),
            isDimensionSpecial: toBool(rawItem.parent.isDimensionSpecial),
          },
          others: {
            ...rawItem.others,
            isQTYdiv: toBool(rawItem.others.isQTYdiv),
            isMeter: toBool(rawItem.others.isMeter),
            isPU: toBool(rawItem.others.isPU),
            isNPR: toBool(rawItem.others.isNPR),
            isNew: toBool(rawItem.others.isNew),
            isActive: toBool(rawItem.others.isActive),
            isStock: toBool(rawItem.others.isStock),
            isNAO: toBool(rawItem.others.isNAO),
            isSnSI: toBool(rawItem.others.isSnSI),
            isDimensionSpecial: toBool(rawItem.others.isDimensionSpecial),
            pixPath: rawItem.others.pixPath || "",
          },
          pictures: {
            shopPicture: rawItem.pictures.shopPicture || "",
            ebayPictures: rawItem.pictures.ebayPictures || "",
            pixPath: rawItem.pictures.pixPath || "",
          },
        };

        setItemData(transformedItem);
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

  const handleUpdateItem = async (updatedData: any) => {
    if (!itemData || !id) return;

    try {
      const itemId = parseInt(id as string);

      const toNum = (val: any) => {
        if (val === null || val === undefined || val === "") return null;
        const n = parseFloat(val);
        return isNaN(n) ? null : n;
      };

      const toInt = (val: any) => {
        if (val === null || val === undefined || val === "") return null;
        const n = parseInt(val);
        return isNaN(n) ? null : n;
      };

      let finalEan = updatedData.ean;
      if (!finalEan || finalEan.trim() === "") {
        finalEan = generateEAN(itemId);
        setItemData(prev => prev ? ({ ...prev, ean: finalEan }) : null);
      }

      const payload: any = {
        item_name: updatedData.name,
        item_name_cn: updatedData.nameCN,
        ean: finalEan.toString(),
        model: updatedData.model,
        remark: updatedData.remark,
        cat_id: toInt(updatedData.category_id),
        isActive: updatedData.isActive ? "Y" : "N",
        weight: toNum(updatedData.dimensions?.weight),
        length: toNum(updatedData.dimensions?.length),
        width: toNum(updatedData.dimensions?.width),
        height: toNum(updatedData.dimensions?.height),
        ISBN: toInt(updatedData.dimensions?.isbn) || 0,
        is_qty_dividable: updatedData.others?.isQTYdiv ? "Y" : "N",
        many_components: toInt(updatedData.others?.mc) || 0,
        effort_rating: toInt(updatedData.others?.er) || 0,
        is_pu_item: updatedData.others?.isPU ? 1 : 0,
        is_meter_item: updatedData.others?.isMeter ? 1 : 0,
        npr_remark: updatedData.nprRemarks,
        RMB_Price: toNum(updatedData.others?.rmbPrice),
        FOQ: toInt(updatedData.others?.foq) || 0,
        is_dimension_special: updatedData.others?.isDimensionSpecial
          ? "Y"
          : "N",
        is_eur_special: updatedData.parent?.isEURSpecial ? "Y" : "N",
        is_rmb_special: updatedData.parent?.isRMBSpecial ? "Y" : "N",
        is_new: updatedData.others?.isNew ? "Y" : "N",
        is_npr: updatedData.others?.isNPR ? "Y" : "N",
        supplier_id: toInt(updatedData.supplier_id),
        supplierItems: updatedData.supplierItems,

        supplierItem: {
          price_rmb: toNum(updatedData.supplierItem?.priceRMB),
          is_po: updatedData.supplierItem?.isPO,
          moq: toInt(updatedData.supplierItem?.moq),
          oi: toInt(updatedData.supplierItem?.interval),
          lead_time: updatedData.supplierItem?.leadTime,
          note_cn: updatedData.supplierItem?.noteCN,
          url: updatedData.supplierItem?.url,
        },

        warehouseItemData: {
          is_stock_item: updatedData.others?.isStock ? "Y" : "N",
          is_active: updatedData.others?.isActive ? "Y" : "N",
          msq: toNum(updatedData.others?.msq),
          is_no_auto_order: updatedData.others?.isNAO ? "Y" : "N",
          buffer: toInt(updatedData.others?.buffer),
          is_SnSI: updatedData.others?.isSnSI ? "Y" : "N",
          item_no_de: updatedData.others?.noDE,
          item_name_de: updatedData.others?.nameDE,
        },
        photo: updatedData.pictures?.shopPicture,
        pix_path: updatedData.pictures?.pixPath,
        pix_path_eBay: updatedData.pictures?.ebayPictures,
      };

      await updateItem(itemId, payload);
      setEditMode(false);

      const toBool = (val: any) =>
        val === "Y" ||
        val === "Yes" ||
        val === true ||
        val === 1 ||
        val === "1";
      const itemResponse: any = await getItemById(itemId);
      const rawItem = itemResponse.data;
      const transformedItem: ItemDetails = {
        ...rawItem,
        isActive: toBool(rawItem.isActive),
        parent: {
          ...rawItem.parent,
          isActive: toBool(rawItem.parent.isActive),
          isSpecialItem: toBool(rawItem.parent.isSpecialItem),
          isEURSpecial: toBool(rawItem.parent.isEURSpecial),
          isRMBSpecial: toBool(rawItem.parent.isRMBSpecial),
          isDimensionSpecial: toBool(rawItem.parent.isDimensionSpecial),
        },
        others: {
          ...rawItem.others,
          isQTYdiv: toBool(rawItem.others.isQTYdiv),
          isMeter: toBool(rawItem.others.isMeter),
          isPU: toBool(rawItem.others.isPU),
          isNPR: toBool(rawItem.others.isNPR),
          isNew: toBool(rawItem.others.isNew),
          isActive: toBool(rawItem.others.isActive),
          isStock: toBool(rawItem.others.isStock),
          isNAO: toBool(rawItem.others.isNAO),
          isSnSI: toBool(rawItem.others.isSnSI),
          isDimensionSpecial: toBool(rawItem.others.isDimensionSpecial),
          pixPath: rawItem.others.pixPath || "",
        },
        pictures: {
          shopPicture: rawItem.pictures.shopPicture || "",
          ebayPictures: rawItem.pictures.ebayPictures || "",
          pixPath: rawItem.pictures.pixPath || "",
        },
      };
      setItemData(transformedItem);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

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
        <div className="flex flex-col gap-4 mb-4">
          <button
            onClick={() => router.push("/items")}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#8CC21B] transition-colors w-fit"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Items Management
          </button>
          <div className="flex items-center justify-between">
            <div>
              <PageHeader
                title={`Item Details: ${itemData.itemNo}`}
                icon={Package}
              />
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
        </div>
        <div className="flex flex-wrap gap-3 mb-6">
          <StatusIndicator value={itemData.isActive} label="Active" />
          <StatusIndicator
            value={itemData.parent.isSpecialItem}
            label="Special Item"
          />
          <StatusIndicator value={itemData.others.isStock} label="In Stock" />
          <StatusIndicator value={itemData.others.isNew} label="New" />
        </div>
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
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100/50 p-6">
          {activeTab === "item" && (
            <div>
              <SectionHeader title="Item Information" />

              <div className="space-y-1">
                <EditableInfoRow
                  label="EAN"
                  value={itemData.ean}
                  field="ean"
                  editMode={editMode}
                  itemData={itemData}
                  setItemData={setItemData}
                  readOnly={false}
                />
                <EditableInfoRow
                  label="Transfer Price (EUR)"
                  value={`€ ${itemData.transfer_price}`}
                  field="transfer_price_EUR"
                  editMode={editMode}
                  itemData={itemData}
                  setItemData={setItemData}
                  readOnly={true}
                />
                <EditableInfoRow
                  label="Item Name"
                  value={itemData.name}
                  field="name"
                  editMode={editMode}
                  itemData={itemData}
                  setItemData={setItemData}
                />
                <EditableInfoRow
                  label="Item Name CN"
                  value={itemData.nameCN}
                  field="nameCN"
                  editMode={editMode}
                  itemData={itemData}
                  setItemData={setItemData}
                />
                <SelectInfoRow
                  label="Category"
                  value={itemData.category_id?.toString() ?? ""}
                  field="category_id"
                  options={categories.map((c: any) => ({
                    label: c.name,
                    value: c.id.toString(),
                  }))}
                  editMode={editMode}
                  itemData={itemData}
                  setItemData={setItemData}
                />
                <EditableInfoRow
                  label="Model"
                  value={itemData.model}
                  field="model"
                  editMode={editMode}
                  itemData={itemData}
                  setItemData={setItemData}
                />
                <EditableInfoRow
                  label="Remark"
                  value={itemData.remark}
                  field="remark"
                  editMode={editMode}
                  itemData={itemData}
                  setItemData={setItemData}
                />
                <InfoRow
                  label="Price (RMB) ¥"
                  value={
                    (itemData as any).others?.rmbPrice
                      ? `¥ ${(itemData as any).others.rmbPrice}`
                      : "—"
                  }
                />
                <InfoRow label="Active">
                  <StatusIndicator value={itemData.isActive} />
                </InfoRow>
              </div>
            </div>
          )}
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
                    <SelectInfoRow
                      label="Is this special dimension?"
                      value={itemData.others.isDimensionSpecial ? "Yes" : "No"}
                      field="others.isDimensionSpecial"
                      editMode={editMode}
                      itemData={itemData}
                      setItemData={setItemData}
                      options={[
                        { label: "Yes", value: "Yes" },
                        { label: "No", value: "No" },
                      ]}
                    />
                    <SelectInfoRow
                      label="Special Item"
                      value={itemData.parent.isEURSpecial ? "Yes" : "No"}
                      field="parent.isEURSpecial"
                      editMode={editMode}
                      itemData={itemData}
                      setItemData={(updated) => {
                        updated.parent.isRMBSpecial =
                          updated.parent.isEURSpecial;
                        setItemData(updated);
                      }}
                      options={[
                        { label: "Yes", value: "Yes" },
                        { label: "No", value: "No" },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === "variations" && (
            <div>
              <SectionHeader title="Variations & Values" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                            ),
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
                                {editMode ? (
                                  <input
                                    type="text"
                                    value={variation}
                                    onChange={(e) => {
                                      const updated = { ...itemData };
                                      updated.variationsEN.variations[index] =
                                        e.target.value;
                                      setItemData(updated);
                                    }}
                                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-900"
                                  />
                                ) : (
                                  variation
                                )}
                              </li>
                            ),
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
                              {editMode ? (
                                <input
                                  type="text"
                                  value={value}
                                  onChange={(e) => {
                                    const updated = { ...itemData };
                                    updated.variationsEN.values[index] =
                                      e.target.value;
                                    setItemData(updated);
                                  }}
                                  className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-900"
                                />
                              ) : (
                                value
                              )}
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
          {activeTab === "dimensions" && (
            <div>
              <SectionHeader title="Dimensions & Specifications" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <EditableInfoRow
                    label="ISBN"
                    value={itemData.dimensions.isbn}
                    field="dimensions.isbn"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                  />
                  <EditableInfoRow
                    label="Weight (kg)"
                    value={itemData.dimensions.weight}
                    field="dimensions.weight"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                  />
                  <EditableInfoRow
                    label="Length (mm)"
                    value={itemData.dimensions.length}
                    field="dimensions.length"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                  />
                  <EditableInfoRow
                    label="Width (mm)"
                    value={itemData.dimensions.width}
                    field="dimensions.width"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                  />
                  <EditableInfoRow
                    label="Height (mm)"
                    value={itemData.dimensions.height}
                    field="dimensions.height"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                  />
                </div>
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
          {activeTab === "others" && (
            <div>
              <div className="mb-10">
                <SectionHeader title="Dimensions / Others" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <EditableInfoRow
                    label="Weight"
                    value={itemData.dimensions.weight}
                    field="dimensions.weight"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                  />
                  <EditableInfoRow
                    label="Length"
                    value={itemData.dimensions.length}
                    field="dimensions.length"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                  />
                  <EditableInfoRow
                    label="Width"
                    value={itemData.dimensions.width}
                    field="dimensions.width"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                  />
                  <EditableInfoRow
                    label="Height"
                    value={itemData.dimensions.height}
                    field="dimensions.height"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                  />
                  <SelectInfoRow
                    label="Is QTY Dividable"
                    value={itemData.others.isQTYdiv ? "Y" : "N"}
                    field="others.isQTYdiv"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                    options={[
                      { label: "Y", value: "Y" },
                      { label: "N", value: "N" },
                    ]}
                  />
                  <EditableInfoRow
                    label="ISBN"
                    value={itemData.dimensions.isbn}
                    field="dimensions.isbn"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                  />
                  <EditableInfoRow
                    label="MC"
                    value={itemData.others.mc}
                    field="others.mc"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                  />
                  <EditableInfoRow
                    label="ER"
                    value={itemData.others.er}
                    field="others.er"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                  />
                  <SelectInfoRow
                    label="Is PU"
                    value={itemData.others.isPU ? "Yes" : "No"}
                    field="others.isPU"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                    options={[
                      { label: "Yes", value: "Yes" },
                      { label: "No", value: "No" },
                    ]}
                  />
                  <SelectInfoRow
                    label="Is Meter"
                    value={itemData.others.isMeter ? "Yes" : "No"}
                    field="others.isMeter"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                    options={[
                      { label: "Yes", value: "Yes" },
                      { label: "No", value: "No" },
                    ]}
                  />
                  <EditableInfoRow
                    label="FOQ"
                    value={itemData.others.foq}
                    field="others.foq"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                  />
                  <SelectInfoRow
                    label="Is New?"
                    value={itemData.others.isNew ? "Yes" : "No"}
                    field="others.isNew"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                    options={[
                      { label: "Yes", value: "Yes" },
                      { label: "No", value: "No" },
                    ]}
                  />
                  <EditableInfoRow
                    label="Taric"
                    value={itemData.others.taricCode}
                    field="others.taricCode"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                  />
                </div>
              </div>

              <div>
                <SectionHeader title="Warehouse Item" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <EditableInfoRow
                    label="ID DE"
                    value={itemData.others.idDE}
                    field="others.idDE"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                    readOnly={true}
                  />
                  <EditableInfoRow
                    label="NO DE"
                    value={itemData.others.noDE}
                    field="others.noDE"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                  />
                  <EditableInfoRow
                    label="Name DE"
                    value={itemData.others.nameDE}
                    field="others.nameDE"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                  />
                  <EditableInfoRow
                    label="Name EN"
                    value={itemData.others.nameEN}
                    field="others.nameEN"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                  />
                  <SelectInfoRow
                    label="isStock"
                    value={itemData.others.isStock ? "Y" : "N"}
                    field="others.isStock"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                    options={[
                      { label: "Y", value: "Y" },
                      { label: "N", value: "N" },
                    ]}
                  />
                  <EditableInfoRow
                    label="Qty"
                    value={itemData.others.qty}
                    field="others.qty"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                    readOnly={true}
                  />
                  <SelectInfoRow
                    label="isActive"
                    value={itemData.others.isActive ? "Y" : "N"}
                    field="others.isActive"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                    options={[
                      { label: "Y", value: "Y" },
                      { label: "N", value: "N" },
                    ]}
                  />
                  <EditableInfoRow
                    label="MSQ"
                    value={itemData.others.msq}
                    field="others.msq"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                  />
                  <SelectInfoRow
                    label="isNAOi"
                    value={itemData.others.isNAO ? "Y" : "N"}
                    field="others.isNAO"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                    options={[
                      { label: "Y", value: "Y" },
                      { label: "N", value: "N" },
                    ]}
                  />
                  <EditableInfoRow
                    label="Buffer"
                    value={itemData.others.buffer}
                    field="others.buffer"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                  />
                  <SelectInfoRow
                    label="isSnS"
                    value={itemData.others.isSnSI ? "Y" : "N"}
                    field="others.isSnSI"
                    editMode={editMode}
                    itemData={itemData}
                    setItemData={setItemData}
                    options={[
                      { label: "Yes", value: "Y" },
                      { label: "No", value: "N" },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}
          {activeTab === "supplier" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <SectionHeader
                  title="Supplier Sources"
                  icon={<LinkIcon className="h-5 w-5 text-[#8CC21B]" />}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsLinkSupplierModalOpen(true)}
                    className="px-4 py-2 bg-white border border-[#8CC21B] text-[#8CC21B] rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-[#8CC21B] hover:text-white transition-all shadow-sm"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Link New Supplier
                  </button>
                  <button
                    onClick={() => router.push("/suppliers")}
                    className="px-4 py-2 bg-[#8CC21B] text-white rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-[#7ab318] transition-colors shadow-sm"
                  >
                    <PencilIcon className="h-4 w-4" />
                    Supplier List
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {itemData.supplierItems && itemData.supplierItems.length > 0 ? (
                  itemData.supplierItems.map((si: any) => (
                    <div
                      key={si.id}
                      className={`p-4 rounded-xl border transition-all flex items-center justify-between group ${si.isDefault
                        ? "bg-blue-50/50 border-blue-200 shadow-sm"
                        : "bg-white border-gray-100 hover:border-gray-200"
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-lg ${si.isDefault
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-400"
                            }`}
                        >
                          <Package className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900 line-clamp-1">
                              {si.supplierName && !hasChinese(si.supplierName) ? si.supplierName : ""}
                            </h4>
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                              ID: {si.supplierId}
                            </span>
                          </div>
                          {si.isDefault && (
                            <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              Default Source
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => window.open(si.url, "_blank")}
                          disabled={!si.url}
                          className={`p-2 rounded-lg transition-all ${si.url
                            ? "text-blue-500 hover:bg-blue-50"
                            : "text-gray-300 cursor-not-allowed"
                            }`}
                        >
                          <LinkIcon className="h-5 w-5" />
                        </button>

                        {editMode && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const updated = { ...itemData };
                                updated.supplierItems = updated.supplierItems.map(
                                  (x: any) => ({
                                    ...x,
                                    isDefault: x.id === si.id,
                                  }),
                                );
                                setItemData(updated);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${si.isDefault
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-blue-200 text-blue-600 hover:bg-blue-50"
                                }`}
                            >
                              {si.isDefault ? "Default" : "Set Default"}
                            </button>
                            {!si.isDefault && (
                              <button
                                onClick={() => handleRemoveSupplier(si.id)}
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <LinkIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">
                      No suppliers linked to this item.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === "quality" && (
            <div>
              <SectionHeader
                title="Quality Criteria"
                icon={
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                }
              />

              <div className="mb-4">
                <CustomButton
                  onClick={() => handleOpenQualityModal()}
                  className="px-4 py-2 bg-primary text-white rounded-lg"
                >
                  New item quality
                </CustomButton>
              </div>

              {qualityCriteria.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F8F9FB]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                          ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                          Item_ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                          Picture
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                          Description CN
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                          Action
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                          Apply to Parent
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {qualityCriteria.map((criteria, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {criteria.id}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {criteria.itemId || itemData.id}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {criteria.name}
                          </td>
                          <td className="px-4 py-3 text-sm">
                              {criteria.picture ? (
                                <button
                                  onClick={() =>
                                    window.open(getCorrectUrl(criteria.picture).replace('/upload/fl_attachment/', '/upload/'), "_blank")
                                  }
                                  className="text-blue-600 hover:text-blue-800"
                                  title="View Picture"
                                >
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
                            {criteria.descriptionCN}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => handleOpenQualityModal(criteria)}
                              className="text-blue-600 hover:text-blue-900 mr-2"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteQuality(criteria.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <ExclamationTriangleIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    No quality criteria found for this item
                  </p>
                  <CustomButton
                    onClick={() => handleOpenQualityModal()}
                    className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
                  >
                    New item quality
                  </CustomButton>
                </div>
              )}
            </div>
          )}

          {activeTab === "attachments" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <SectionHeader
                  title="Attachments"
                  icon={<DocumentIcon className="h-5 w-5 text-gray-500" />}
                />

                <button
                  onClick={() => attachmentInputRef.current?.click()}
                  disabled={uploadingAttachments}
                  className="px-4 py-2 bg-[#8CC21B] text-white rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-[#7ab318] transition-colors disabled:opacity-50"
                >
                  <DocumentIcon className="h-4 w-4" />
                  {uploadingAttachments
                    ? "Uploading..."
                    : "Upload New Attachment"}
                </button>
              </div>

              {itemData.attachments?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F8F9FB]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                          Attachment Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                          Upload date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {itemData.attachments.map(
                        (attachment: any, index: number) => {
                          const finalUrl = getCorrectUrl(attachment.url);

                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                <div className="flex items-center gap-2">
                                  <DocumentIcon className="h-4 w-4 text-gray-400" />
                                  {attachment.originalName || attachment.filename || "Unnamed Attachment"}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {attachment.createdAt ? formatDate(attachment.createdAt) : (attachment.uploadedAt ? formatDate(attachment.uploadedAt) : "—")}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex items-center gap-4">
                                  <button
                                    onClick={() => {
                                      const viewUrl = finalUrl.replace('/upload/fl_attachment/', '/upload/');
                                      window.open(viewUrl, "_blank", "noreferrer");
                                    }}
                                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1.5 font-medium"
                                    title="View PDF/Image"
                                  >
                                    <EyeIcon className="h-4 w-4" />
                                    View
                                  </button>
                                  <a
                                    href={finalUrl.includes('cloudinary')
                                      ? finalUrl.replace('/upload/', '/upload/fl_attachment/')
                                      : finalUrl}
                                    download={attachment.originalName || attachment.filename}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#8CC21B] hover:text-[#7ab318] flex items-center gap-1.5 font-medium"
                                    title="Download File"
                                  >
                                    <ArrowDownTrayIcon className="h-4 w-4" />
                                    Download
                                  </a>
                                  <button
                                    onClick={() => handleDeleteAttachment(attachment.id)}
                                    className="text-red-600 hover:text-red-800 flex items-center gap-1.5 font-medium"
                                    title="Delete Attachment"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <DocumentIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    No attachments found for this item
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "pictures" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <SectionHeader
                  title="Item Gallery"
                  icon={<PhotoIcon className="h-5 w-5 text-blue-500" />}
                />
                <p className="text-sm text-gray-500 italic">
                  Showing all item pictures. No separate categories.
                </p>
              </div>

              {itemData.pictures &&
                [
                  itemData.pictures.shopPicture,
                  itemData.pictures.ebayPictures,
                  ...(itemData.pictures.pixPath || "").split(",").filter(Boolean),
                ].filter(Boolean).length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[
                    {
                      field: "shopPicture",
                      url: itemData.pictures.shopPicture,
                    },
                    {
                      field: "ebayPictures",
                      url: itemData.pictures.ebayPictures,
                    },
                    ...(itemData.pictures.pixPath || "")
                      .split(",")
                      .filter(Boolean)
                      .map((url) => ({ field: "pixPath", url })),
                  ]
                    .filter((item) => item.url)
                    .map((pic, index) => (
                      <div
                        key={index}
                        className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200"
                      >
                        <img
                          src={getCorrectUrl(pic.url)}
                          alt={`Item ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src =
                              "https://placehold.co/400x400?text=Invalid+Image";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() => window.open(getCorrectUrl(pic.url).replace('/upload/fl_attachment/', '/upload/'), "_blank")}
                            className="p-2 bg-white rounded-full text-gray-700 hover:text-primary transition-colors"
                            title="View Full Size"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() =>
                              handleRemoveImage(pic.field, pic.url)
                            }
                            className="p-2 bg-white rounded-full text-red-600 hover:text-red-700 transition-colors"
                            title="Remove Image"
                          >
                            <XCircleIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <PhotoIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    No pictures found for this item
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 mx-auto"
                  >
                    <PhotoIcon className="h-4 w-4" />
                    Upload First Picture
                  </button>
                </div>
              )}
            </div>
          )}

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

        <div className="mt-8 flex flex-wrap gap-3 justify-between items-center">
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700">
              <ArrowDownTrayIcon className="h-4 w-4" />
              Export Details
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept="image/*"
              onChange={(e) => handleImageUpload(e)}
            />
            <input
              type="file"
              ref={attachmentInputRef}
              className="hidden"
              multiple
              onChange={(e) => handleAttachmentUpload(e)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPictures}
              className={`px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700 ${uploadingPictures ? "opacity-50 cursor-not-allowed" : ""
                }`}
            >
              <PhotoIcon className="h-4 w-4" />
              {uploadingPictures ? "Uploading..." : "Add Pictures"}
            </button>
            <button
              onClick={() => attachmentInputRef.current?.click()}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
            >
              <DocumentIcon className="h-4 w-4" />
              Add Documents
            </button>
          </div>

          <div className="text-sm text-gray-500">
            Last updated: {itemData?.updated_at ? formatDate(itemData.updated_at) : formatDate(new Date())}
          </div>
        </div>
      </div>
      <CustomModal
        isOpen={isQualityModalOpen}
        onClose={handleCloseQualityModal}
        title={
          editingQuality
            ? "Update Quality of this item"
            : "Add Quality to this item"
        }
        width="max-w-md"
        footer={
          <div className="flex gap-2 w-full justify-end">
            <button
              onClick={handleCloseQualityModal}
              className="px-4 py-2 flex items-center gap-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <XCircleIcon className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSaveQuality}
              className="px-4 py-2 flex items-center gap-2 text-white bg-[#00A651] rounded-lg hover:bg-[#008c44] transition-colors"
            >
              <CheckCircleIcon className="h-4 w-4" />
              {editingQuality ? "Update" : "Add"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 -mt-2">
            Make changes to item quality details.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={qualityFormData.name}
              onChange={handleQualityFormChange}
              placeholder="Quality name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photo:
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                id="quality-photo"
                className="hidden"
                onChange={handleFileChange}
                accept="image/*"
              />
              <label
                htmlFor="quality-photo"
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                Choose file
              </label>
              <span className="text-sm text-gray-500">
                {qualityFormData.picture
                  ? qualityFormData.picture.name
                  : qualityFormData.pictureUrl
                    ? "Existing photo"
                    : "No file chosen"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description:
            </label>
            <textarea
              name="description"
              value={qualityFormData.description}
              onChange={handleQualityFormChange}
              placeholder="Item Description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description CN:
            </label>
            <textarea
              name="descriptionCN"
              value={qualityFormData.descriptionCN}
              onChange={handleQualityFormChange}
              placeholder="Item Description in CN"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </CustomModal>

      {/* Link Supplier Modal */}
      <CustomModal
        isOpen={isLinkSupplierModalOpen}
        onClose={() => setIsLinkSupplierModalOpen(false)}
        title="Link New Supplier Source"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Select Supplier
            </label>
            <div className="relative">
              <select
                value={selectedSupplierToLink}
                onChange={(e) => setSelectedSupplierToLink(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8CC21B] focus:border-transparent transition-all outline-none appearance-none"
              >
                <option value="">Choose a supplier...</option>
                {allSuppliers.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    [{s.id}]{s.name && !hasChinese(s.name) ? " " + s.name : ""}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRightIcon className="h-4 w-4 text-gray-400 rotate-90" />
              </div>
            </div>
            <p className="text-xs text-gray-500 italic">
              Link an additional supplier to this item. You can then set
              specific prices and lead times for this source.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsLinkSupplierModalOpen(false)}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleLinkSupplier}
              disabled={!selectedSupplierToLink}
              className="flex-1 px-4 py-3 bg-[#8CC21B] text-white rounded-xl font-semibold hover:bg-[#7ab318] transition-all disabled:opacity-50 shadow-md"
            >
              Link Supplier
            </button>
          </div>
        </div>
      </CustomModal>
    </div>
  );
};

export default ItemDetailsPage;

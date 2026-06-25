"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  XMarkIcon,
  TrashIcon,
  EyeIcon as EyeIconOutline,
  PhotoIcon,
  DocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { Package } from "lucide-react";
import { toast } from "react-hot-toast";
import ReactSelect from "react-select";
import CustomModal from "@/components/UI/CustomModal";
import ViewEditToggle from "@/components/UI/ViewEditToggle";
import { EntityTagSelector, type Tag } from "@/components/Tags/TagManager";
import {
  getItemById,
  updateItem,
  deleteItem,
  getItemQualityCriteria,
  createQualityCriterion,
  updateQualityCriterion,
  deleteQualityCriterion,
  getParents,
  getAllTarics,
  Parent,
  Taric,
} from "@/api/items";
import {
  getRequestedItemById,
  updateRequestedItem,
  deleteRequestedItem,
} from "@/api/requested_items";
import { getAllSuppliers, Supplier } from "@/api/suppliers";
import { getCategories } from "@/api/categories";
import { getAllCustomers } from "@/api/customers";
import { uploadFile, deleteFile } from "@/api/library";
import {
  successStyles,
  errorStyles,
  loadingStyles,
  BASE_URL,
} from "@/utils/constants";
import { useRouter } from "next/navigation";

interface ItemPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: number | string;
  isRequest?: boolean;
  onSaved?: () => void;
  onDeleted?: () => void;
  onConvert?: (itemData: any) => void;
}

const inputCls =
  "w-full px-2.5 py-1.5 text-sm border border-gray-300/80 bg-white/70 rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed";

export const ItemPreviewModal: React.FC<ItemPreviewModalProps> = ({
  isOpen,
  onClose,
  itemId,
  isRequest = false,
  onSaved,
  onDeleted,
  onConvert,
}) => {
  const router = useRouter();
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewEdit, setPreviewEdit] = useState(false);
  const [previewSaving, setPreviewSaving] = useState(false);
  const [previewQuality, setPreviewQuality] = useState<any[]>([]);

  const [refParents, setRefParents] = useState<Parent[]>([]);
  const [refTarics, setRefTarics] = useState<Taric[]>([]);
  const [refSuppliers, setRefSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const [qualityModalOpen, setQualityModalOpen] = useState(false);
  const [editingQuality, setEditingQuality] = useState<any>(null);
  const [qualityForm, setQualityForm] = useState<any>({
    name: "",
    description: "",
    descriptionCN: "",
    picture: null as File | null,
    pictureUrl: "",
  });

  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);

  const toBool = (v: any) =>
    v === "Y" || v === "Yes" || v === true || v === 1 || v === "1";

  const hasChinese = (str: string) => /[\u4e00-\u9fa5]/.test(str || "");

  const resolveUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.includes("cloudinary.com")) return url;
    if (url.includes("/uploads/")) {
      const fileName = url.split("/uploads/").pop();
      try {
        const apiOrigin = new URL(BASE_URL).origin;
        return `${apiOrigin}/uploads/${fileName}`;
      } catch {
        return url;
      }
    }
    return url;
  };

  const getThumb = (item: any) =>
    resolveUrl(
      item?.photo ||
        item?.pix_path_eBay ||
        item?.pictures?.shopPicture ||
        (item?.pix_path ? item.pix_path.split(",").filter(Boolean)[0] : null) ||
        null,
    );

  const getCompany = (item: any) =>
    item?.customer_name ||
    item?.company_display_name ||
    item?.companyDisplayName ||
    item?.customer?.companyName ||
    item?.customer?.company_name ||
    item?.customer?.name ||
    item?.company_name ||
    item?.company ||
    "";

  // Searchable customer options for the Company dropdown (deduped + sorted).
  const customerOptions = useMemo(() => {
    const seen = new Map<string, { value: string; label: string }>();
    customers
      .filter((c) => c.companyName)
      .forEach((c) => {
        if (!seen.has(String(c.id)))
          seen.set(String(c.id), {
            value: String(c.id),
            label: c.companyName,
          });
      });
    return Array.from(seen.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [customers]);

  const fetchItemDetails = async () => {
    setPreviewLoading(true);
    try {
      if (isRequest) {
        const res = await getRequestedItemById(String(itemId));
        const raw = res?.data || {};
        const mapped = {
          ...raw,
          name: raw.itemName,
          item_name: raw.itemName,
          nameCN: raw.item_name_cn || "",
          item_name_cn: raw.item_name_cn || "",
          ean: raw.ean || "",
          category_id: raw.cat_id || null,
          category: raw.category?.name || "",
          supplier_id: raw.supplier_id || null,
          supplier_name: raw.supplier
            ? !hasChinese(raw.supplier.name || "")
              ? raw.supplier.name
              : raw.supplier.company_name
            : "",
          customer_id: raw.customer_id ?? raw.customer?.id ?? null,
          customer_name: getCompany(raw),
          parent_id: raw.parent_id || null,
          parent: raw.parent
            ? {
                ...raw.parent,
                de_no: raw.parent.de_no,
                name_de: raw.parent.name_de,
              }
            : null,
          item_name_de: raw.item_name_de || raw.parent?.name_de || "",
          remark: raw.remark || raw.extraNote || "",
          price: raw.purchasePrice || 0,
          currency: raw.currency || "EUR",
          isActive: toBool(raw.isActive),
          isLabelPrint: toBool(raw.isLabelPrint),
          de_no: raw.itemNo || "",
          dimensions: {
            weight: raw.weight || 0,
            length: raw.length || 0,
            width: raw.width || 0,
            height: raw.height || 0,
          },
          pictures: {
            shopPicture: raw.photo || "",
            ebayPictures: raw.pix_path_eBay || "",
            pixPath: raw.pix_path || "",
          },
          attachments: raw.attachments || [],
        };
        setPreviewItem(mapped);
        setPreviewQuality(raw.qualityCriteria || []);
      } else {
        const [detailRes, qualityRes]: any = await Promise.all([
          getItemById(Number(itemId)),
          getItemQualityCriteria(Number(itemId)),
        ]);
        const raw = detailRes?.data || {};
        const activeSupplierId =
          raw.supplier_id ||
          raw.supplierItems?.find((si: any) => si.isDefault)?.supplierId ||
          null;
        const def = raw.supplierItems?.find(
          (si: any) =>
            si.isDefault || Number(si.supplierId) === Number(activeSupplierId),
        );

        // --- Defensive field mapping ---------------------------------------
        // getItemById may not flatten these the way the list endpoint does,
        // so pull each value from every plausible location with fallbacks.
        const catName =
          (typeof raw.category === "string"
            ? raw.category
            : raw.category?.name) ||
          raw.supp_cat ||
          "";
        const companyName = getCompany(raw);
        const supplierName =
          raw.supplier_name ||
          (raw.supplier
            ? !hasChinese(raw.supplier.name || "")
              ? raw.supplier.name
              : raw.supplier.company_name
            : "");

        const mapped = {
          ...raw,
          id: raw.id,
          name: raw.item_name || "",
          item_name: raw.item_name || "",
          nameCN: raw.item_name_cn || "",
          item_name_cn: raw.item_name_cn || "",
          item_name_de: raw.item_name_de || raw.parent?.name_de || "",
          ean: raw.ean || "",
          de_no: raw.de_no || raw.parent?.de_no || raw.ItemID_DE || "",
          category_id:
            raw.cat_id ?? raw.category_id ?? raw.category?.id ?? null,
          category: catName,
          supplier_id: activeSupplierId,
          supplier_name: supplierName,
          customer_id: raw.customer_id ?? raw.customer?.id ?? null,
          customer_name: companyName,
          isActive: toBool(raw.isActive),
          isLabelPrint:
            raw.isLabelPrint !== undefined ? toBool(raw.isLabelPrint) : false,
          supplierItems: raw.supplierItems || [],
          supplierItem:
            raw.supplierItem ||
            (def
              ? {
                  priceRMB: def.priceRMB || "0",
                  isPO: def.isPO || "No",
                  moq: def.moq || "0",
                  interval: def.interval || "0",
                  leadTime: def.leadTime || "",
                  noteCN: def.noteCN || "",
                  url: def.url || "",
                }
              : {
                  priceRMB: "0",
                  isPO: "No",
                  moq: "0",
                  interval: "0",
                  leadTime: "",
                  noteCN: "",
                  url: "",
                }),
          parent: raw.parent
            ? { ...raw.parent, isActive: toBool(raw.parent?.isActive) }
            : null,
          parent_id: raw.parent_id || null,
          dimensions: raw.dimensions || {
            weight: 0,
            length: 0,
            width: 0,
            height: 0,
          },
          pictures: {
            shopPicture: raw.photo || "",
            ebayPictures: raw.pix_path_eBay || "",
            pixPath: raw.pix_path || "",
          },
          attachments: raw.attachments || [],
        };
        setPreviewItem(mapped);
        setPreviewQuality(qualityRes?.data || []);
      }
    } catch (e) {
      console.error("Failed to load item detail:", e);
      toast.error("Failed to load item details", errorStyles);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    // Always open in view mode — edit must be explicitly enabled each time.
    setPreviewEdit(false);

    const loadOptions = async () => {
      try {
        const [
          parentsRes,
          taricsRes,
          suppliersRes,
          categoriesRes,
          customersRes,
        ]: any = await Promise.all([
          getParents({ page: 1, limit: 100000 }),
          getAllTarics({ page: 1, limit: 100000 }),
          getAllSuppliers({ page: 1, limit: 100000 }),
          getCategories(),
          getAllCustomers({ page: 1, limit: 100000 }),
        ]);
        setRefParents(parentsRes.data || []);
        setRefTarics(taricsRes.data || []);
        setRefSuppliers(suppliersRes.data || []);
        setCategories(categoriesRes?.data || []);
        setCustomers(customersRes?.data?.customers || customersRes?.data || []);
      } catch (err) {
        console.error(
          "Failed to load select options in ItemPreviewModal:",
          err,
        );
      }
    };

    loadOptions();
    fetchItemDetails();
  }, [isOpen, itemId]);

  if (!isOpen) return null;

  const patchPreview = (patch: any) =>
    setPreviewItem((p: any) => ({ ...p, ...patch }));

  const patchPreviewDim = (key: string, val: any) =>
    setPreviewItem((p: any) => ({
      ...p,
      dimensions: { ...p.dimensions, [key]: parseFloat(val) || 0 },
    }));

  const patchPreviewSupplierItem = (patch: any) =>
    setPreviewItem((p: any) => ({
      ...p,
      supplierItem: { ...p.supplierItem, ...patch },
    }));

  const handleSavePreview = async () => {
    if (!previewItem) return;
    if (!previewItem.supplier_id) {
      toast.error("Supplier is required", errorStyles);
      return;
    }
    setPreviewSaving(true);
    const tid = toast.loading("Saving changes...", loadingStyles);
    try {
      if (isRequest) {
        await updateRequestedItem(String(itemId), {
          itemName: previewItem.name || previewItem.item_name,
          item_name_cn: previewItem.nameCN || previewItem.item_name_cn,
          ean: (previewItem.ean || "").toString(),
          model: previewItem.model,
          extraNote: previewItem.remark,
          remark: previewItem.remark,
          cat_id: previewItem.category_id
            ? parseInt(previewItem.category_id)
            : undefined,
          isActive: previewItem.isActive ? "Y" : "N",
          weight: parseFloat(previewItem.dimensions?.weight) || 0,
          length: parseFloat(previewItem.dimensions?.length) || 0,
          width: parseFloat(previewItem.dimensions?.width) || 0,
          height: parseFloat(previewItem.dimensions?.height) || 0,
          supplier_id: previewItem.supplier_id
            ? parseInt(previewItem.supplier_id)
            : undefined,
          purchasePrice: parseFloat(previewItem.price) || 0,
          currency: previewItem.currency || "EUR",
          itemNo: previewItem.de_no,
          qty: previewItem.qty,
          interval: previewItem.interval,
          priority: previewItem.priority,
          requestStatus: previewItem.requestStatus,
          qualityCriteria: previewQuality,
          attachments: previewItem.attachments,
        });
      } else {
        const payload = {
          item_name: previewItem.name ?? previewItem.item_name,
          item_name_cn: previewItem.nameCN ?? previewItem.item_name_cn,
          ean: (previewItem.ean || "").toString(),
          model: previewItem.model,
          remark: previewItem.remark,
          cat_id: previewItem.category_id
            ? parseInt(previewItem.category_id)
            : null,
          isActive: previewItem.isActive ? "Y" : "N",
          weight: parseFloat(previewItem.dimensions?.weight) || 0,
          length: parseFloat(previewItem.dimensions?.length) || 0,
          width: parseFloat(previewItem.dimensions?.width) || 0,
          height: parseFloat(previewItem.dimensions?.height) || 0,
          is_qty_dividable: previewItem.others?.isQTYdiv ? "Y" : "N",
          is_dimension_special: previewItem.others?.isDimensionSpecial
            ? "Y"
            : "N",
          is_eur_special: previewItem.parent?.isEURSpecial ? "Y" : "N",
          is_rmb_special: previewItem.parent?.isRMBSpecial ? "Y" : "N",
          is_new: previewItem.others?.isNew ? "Y" : "N",
          is_npr: previewItem.others?.isNPR ? "Y" : "N",
          isLabelPrint: !!previewItem.isLabelPrint,
          supplier_id: previewItem.supplier_id
            ? parseInt(previewItem.supplier_id)
            : null,
          customer_id: previewItem.customer_id ?? null,
          supplierItems: previewItem.supplierItems,
          supplierItem: {
            price_rmb: parseFloat(previewItem.supplierItem?.priceRMB) || 0,
            is_po: previewItem.supplierItem?.isPO,
            moq: parseInt(previewItem.supplierItem?.moq) || 0,
            oi: parseInt(previewItem.supplierItem?.interval) || 0,
            lead_time: previewItem.supplierItem?.leadTime,
            note_cn: previewItem.supplierItem?.noteCN,
            url: previewItem.supplierItem?.url,
          },
          price: parseFloat(previewItem.price) || 0,
          transfer_price_EUR: parseFloat(previewItem.price) || 0,
          photo: previewItem.pictures?.shopPicture,
          pix_path: previewItem.pictures?.pixPath,
          pix_path_eBay: previewItem.pictures?.ebayPictures,
        };
        await updateItem(Number(itemId), payload);
      }
      toast.success("Item updated", { id: tid, ...successStyles });
      setPreviewEdit(false);
      fetchItemDetails();
      if (onSaved) onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to update item", {
        id: tid,
        ...errorStyles,
      });
    } finally {
      setPreviewSaving(false);
    }
  };

  const handleDeletePreviewItem = async () => {
    if (!previewItem) return;
    if (
      !confirm(
        `Are you sure you want to delete this ${isRequest ? "request item" : "item"}?`,
      )
    )
      return;
    try {
      if (isRequest) {
        await deleteRequestedItem(String(itemId));
      } else {
        await deleteItem(Number(itemId));
      }
      toast.success(
        `${isRequest ? "Request item" : "Item"} deleted`,
        successStyles,
      );
      onClose();
      if (onDeleted) onDeleted();
    } catch (e: any) {
      toast.error(
        e.message || `Failed to delete ${isRequest ? "request item" : "item"}`,
        errorStyles,
      );
    }
  };
  const openQualityModal = (q: any = null) => {
    if (q) {
      setEditingQuality(q);
      setQualityForm({
        name: q.name || "",
        description: q.description || "",
        descriptionCN: q.descriptionCN || "",
        picture: null,
        pictureUrl: q.picture || "",
      });
    } else {
      setEditingQuality(null);
      setQualityForm({
        name: "",
        description: "",
        descriptionCN: "",
        picture: null,
        pictureUrl: "",
      });
    }
    setQualityModalOpen(true);
  };

  const saveQuality = async () => {
    if (!previewItem) return;
    try {
      let pictureUrl = qualityForm.pictureUrl;
      if (qualityForm.picture) {
        const fd = new FormData();
        fd.append("file", qualityForm.picture);
        const up = await uploadFile(fd);
        pictureUrl = up.data.url;
      }
      const payload = {
        name: qualityForm.name,
        description: qualityForm.description,
        description_cn: qualityForm.descriptionCN,
        picture: pictureUrl,
      };

      if (isRequest) {
        let updatedQuality: any[];
        if (editingQuality) {
          updatedQuality = previewQuality.map((q) =>
            q.id === editingQuality.id ? { ...q, ...payload } : q,
          );
        } else {
          updatedQuality = [
            ...previewQuality,
            { id: Date.now().toString(), ...payload },
          ];
        }
        setPreviewQuality(updatedQuality);
        await updateRequestedItem(String(itemId), {
          qualityCriteria: updatedQuality,
        });
        toast.success("Quality criterion saved", successStyles);
      } else {
        if (editingQuality) {
          await updateQualityCriterion(editingQuality.id, payload);
        } else {
          await createQualityCriterion(previewItem.id, payload);
        }
        const fresh = await getItemQualityCriteria(previewItem.id);
        setPreviewQuality(fresh.data || []);
        toast.success("Quality criterion saved", successStyles);
      }
      setQualityModalOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save quality criterion", errorStyles);
    }
  };

  const removeQuality = async (qid: any) => {
    if (!confirm("Delete this quality criterion?")) return;
    try {
      if (isRequest) {
        const updatedQuality = previewQuality.filter((q) => q.id !== qid);
        setPreviewQuality(updatedQuality);
        await updateRequestedItem(String(itemId), {
          qualityCriteria: updatedQuality,
        });
        toast.success("Quality criterion deleted", successStyles);
      } else {
        await deleteQualityCriterion(Number(qid));
        setPreviewQuality((prev) => prev.filter((q) => q.id !== qid));
        toast.success("Quality criterion deleted", successStyles);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete quality criterion", errorStyles);
    }
  };
  const uploadPreviewAttachments = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !previewItem) return;
    const tid = toast.loading("Uploading attachments...", loadingStyles);
    setUploadingAttachments(true);
    try {
      if (isRequest) {
        const updatedAttachments = [...(previewItem.attachments || [])];
        for (let i = 0; i < files.length; i++) {
          const fd = new FormData();
          fd.append("file", files[i]);
          const up = await uploadFile(fd);
          updatedAttachments.push({
            id: Date.now().toString() + i,
            url: up.data.url,
            originalName: files[i].name,
            filename: up.data.filename,
          });
        }
        setPreviewItem((p: any) => ({ ...p, attachments: updatedAttachments }));
        await updateRequestedItem(String(itemId), {
          attachments: updatedAttachments,
        });
        toast.success("Attachments uploaded", { id: tid, ...successStyles });
      } else {
        for (let i = 0; i < files.length; i++) {
          const fd = new FormData();
          fd.append("file", files[i]);
          fd.append("itemId", String(previewItem.id));
          fd.append("isPublic", "true");
          await uploadFile(fd, false);
        }
        const fresh: any = await getItemById(Number(itemId));
        setPreviewItem((p: any) => ({
          ...p,
          attachments: fresh?.data?.attachments || [],
        }));
        toast.success("Attachments uploaded", { id: tid, ...successStyles });
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to upload attachments", { id: tid, ...errorStyles });
    } finally {
      setUploadingAttachments(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
  };

  const deletePreviewAttachment = async (fileId: string) => {
    if (!confirm("Delete this attachment?")) return;
    try {
      if (isRequest) {
        const updatedAttachments = (previewItem.attachments || []).filter(
          (a: any) => a.id !== fileId,
        );
        setPreviewItem((p: any) => ({ ...p, attachments: updatedAttachments }));
        await updateRequestedItem(String(itemId), {
          attachments: updatedAttachments,
        });
        toast.success("Attachment deleted", successStyles);
      } else {
        await deleteFile(fileId);
        setPreviewItem((p: any) => ({
          ...p,
          attachments: (p.attachments || []).filter(
            (a: any) => a.id !== fileId,
          ),
        }));
        toast.success("Attachment deleted", successStyles);
      }
    } catch (e) {
      toast.error("Failed to delete attachment", errorStyles);
    }
  };

  const Field = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div>
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <div className="text-sm text-gray-900 break-words">{children}</div>
    </div>
  );

  const previewCompanyOrCat =
    getCompany(previewItem) || previewItem?.category || "—";
  const previewItemNo = previewItem?.de_no || "—";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {previewLoading || !previewItem ? (
          <div className="p-6 py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary" />
            <p className="mt-2 text-sm text-gray-500">Loading details...</p>
          </div>
        ) : (
          <>
            {/* Header with thumbnail, title, toggle, and close */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0 select-none">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                  {getThumb(previewItem) ? (
                    <img
                      src={getThumb(previewItem)!}
                      alt="thumb"
                      className="w-full h-full object-cover"
                      onError={(e) =>
                        ((e.target as HTMLImageElement).style.display = "none")
                      }
                    />
                  ) : (
                    <Package className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 truncate">
                    {previewItem.item_name || previewItem.name || "Item"}
                  </h2>
                  <p className="text-xs text-gray-500 truncate">
                    {previewCompanyOrCat} · ItemNo {previewItemNo} · ID{" "}
                    {previewItem.id}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <ViewEditToggle
                  isEditEnabled={previewEdit}
                  onToggle={() => setPreviewEdit(!previewEdit)}
                  disabled={previewSaving}
                />
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-5">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Tags
                </p>
                <EntityTagSelector
                  entityId={previewItem.id}
                  entityType={isRequest ? "request_item" : "item"}
                  initialTags={previewItem.tags || []}
                  tagOrder={previewItem.tagOrder}
                  disabled={!previewEdit}
                  onTagsUpdated={(newTags: any[]) =>
                    setPreviewItem((p: any) =>
                      p
                        ? {
                            ...p,
                            tags: newTags,
                            tagOrder: newTags.map((t) => t.id).join(","),
                          }
                        : p,
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                <Field label="Item No">
                  {previewEdit ? (
                    <input
                      className={inputCls}
                      value={previewItem.de_no || ""}
                      onChange={(e) => patchPreview({ de_no: e.target.value })}
                    />
                  ) : (
                    previewItemNo
                  )}
                </Field>
                <Field label="Company">
                  {previewEdit ? (
                    <ReactSelect
                      isClearable
                      placeholder="Search customer..."
                      options={customerOptions}
                      value={
                        customerOptions.find(
                          (o) =>
                            String(o.value) === String(previewItem.customer_id),
                        ) ||
                        (previewItem.customer_id
                          ? {
                              value: String(previewItem.customer_id),
                              label:
                                previewItem.customer_name ||
                                `#${previewItem.customer_id}`,
                            }
                          : null)
                      }
                      onChange={(opt: any) =>
                        patchPreview({
                          customer_id: opt?.value ?? null,
                          customer_name: opt?.label ?? "",
                        })
                      }
                      menuPortalTarget={
                        typeof document !== "undefined"
                          ? document.body
                          : undefined
                      }
                      styles={{
                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        control: (base) => ({
                          ...base,
                          minHeight: "34px",
                          fontSize: "0.875rem",
                          borderRadius: "0.5rem",
                        }),
                      }}
                    />
                  ) : (
                    getCompany(previewItem) || "—"
                  )}
                </Field>
                <Field label="IsLabel">
                  {previewEdit ? (
                    <div className="flex items-center mt-1">
                      <input
                        type="checkbox"
                        checked={previewItem.isLabelPrint}
                        onChange={(e) =>
                          patchPreview({ isLabelPrint: e.target.checked })
                        }
                        className="w-4 h-4 text-green-600 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Label Print
                      </span>
                    </div>
                  ) : (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${previewItem.isLabelPrint ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                    >
                      {previewItem.isLabelPrint ? "Yes" : "No"}
                    </span>
                  )}
                </Field>
                <Field label="CAT">
                  {previewEdit ? (
                    <select
                      className={inputCls}
                      value={previewItem.category_id?.toString() ?? ""}
                      onChange={(e) =>
                        patchPreview({
                          category_id: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        })
                      }
                    >
                      <option value="">—</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id.toString()}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    previewItem.category || "—"
                  )}
                </Field>
                <Field label="EAN">
                  {previewEdit ? (
                    <input
                      className={inputCls}
                      value={previewItem.ean || ""}
                      onChange={(e) => patchPreview({ ean: e.target.value })}
                    />
                  ) : (
                    previewItem.ean || "—"
                  )}
                </Field>
                <Field label="ID (system)">{previewItem.id}</Field>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                <Field label="Item Name">
                  {previewEdit ? (
                    <input
                      className={inputCls}
                      value={previewItem.name ?? previewItem.item_name ?? ""}
                      onChange={(e) =>
                        patchPreview({
                          name: e.target.value,
                          item_name: e.target.value,
                        })
                      }
                    />
                  ) : (
                    previewItem.item_name || "—"
                  )}
                </Field>
                <Field label="Item Name DE">
                  {previewEdit ? (
                    <input
                      className={inputCls}
                      value={previewItem.item_name_de || ""}
                      onChange={(e) =>
                        patchPreview({ item_name_de: e.target.value })
                      }
                    />
                  ) : (
                    previewItem.item_name_de || "—"
                  )}
                </Field>
                <Field label="Item Name CN">
                  {previewEdit ? (
                    <input
                      className={inputCls}
                      value={
                        previewItem.nameCN ?? previewItem.item_name_cn ?? ""
                      }
                      onChange={(e) =>
                        patchPreview({
                          nameCN: e.target.value,
                          item_name_cn: e.target.value,
                        })
                      }
                    />
                  ) : (
                    previewItem.nameCN || previewItem.item_name_cn || "—"
                  )}
                </Field>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Remark (EN/DE)">
                  {previewEdit ? (
                    <textarea
                      rows={2}
                      className={inputCls}
                      value={previewItem.remark ?? ""}
                      onChange={(e) => patchPreview({ remark: e.target.value })}
                    />
                  ) : (
                    previewItem.remark || "—"
                  )}
                </Field>
                <Field label="Remark CN">
                  {previewEdit ? (
                    <textarea
                      rows={2}
                      className={inputCls}
                      value={previewItem.remarkCN ?? ""}
                      onChange={(e) =>
                        patchPreview({ remarkCN: e.target.value })
                      }
                    />
                  ) : (
                    previewItem.remarkCN || "—"
                  )}
                </Field>
              </div>

              <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                {(["length", "width", "height", "weight"] as const).map(
                  (dim) => (
                    <Field
                      key={dim}
                      label={dim[0].toUpperCase() + dim.slice(1)}
                    >
                      {previewEdit ? (
                        <input
                          type="number"
                          step="0.01"
                          className={inputCls}
                          value={previewItem.dimensions?.[dim] ?? ""}
                          onChange={(e) => patchPreviewDim(dim, e.target.value)}
                        />
                      ) : (
                        (previewItem.dimensions?.[dim] ?? "—")
                      )}
                    </Field>
                  ),
                )}
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                <Field label="Default Supplier">
                  {previewEdit ? (
                    <select
                      className={inputCls}
                      value={previewItem.supplier_id?.toString() ?? ""}
                      onChange={(e) =>
                        patchPreview({ supplier_id: e.target.value })
                      }
                    >
                      <option value="">Select a Supplier</option>
                      {refSuppliers.map((s: any) => (
                        <option
                          key={s.id}
                          value={s.id.toString()}
                        >{`[ID: ${s.id}] ${!hasChinese(s.name) ? s.name : s.company_name || ""}`}</option>
                      ))}
                    </select>
                  ) : previewItem.supplier_name ? (
                    `[ID: ${previewItem.supplier_id}] ${previewItem.supplier_name}`
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Price">
                  {previewEdit ? (
                    <input
                      type="number"
                      step="0.01"
                      className={inputCls}
                      value={previewItem.price ?? ""}
                      onChange={(e) => patchPreview({ price: e.target.value })}
                    />
                  ) : (
                    `${previewItem.price || "0.00"} ${previewItem.currency || "EUR"}`
                  )}
                </Field>
                <Field label="Status">
                  {previewEdit ? (
                    <select
                      className={inputCls}
                      value={previewItem.isActive ? "Y" : "N"}
                      onChange={(e) =>
                        patchPreview({ isActive: e.target.value === "Y" })
                      }
                    >
                      <option value="Y">Active</option>
                      <option value="N">Inactive</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${previewItem.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                    >
                      {previewItem.isActive ? "Active" : "Inactive"}
                    </span>
                  )}
                </Field>
              </div>

              {isRequest && (
                <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 bg-gray-50 p-4 rounded-xl">
                  <Field label="Quantity">
                    {previewEdit ? (
                      <input
                        className={inputCls}
                        value={previewItem.qty || ""}
                        onChange={(e) => patchPreview({ qty: e.target.value })}
                      />
                    ) : (
                      previewItem.qty || "—"
                    )}
                  </Field>
                  <Field label="Interval">
                    {previewEdit ? (
                      <select
                        className={inputCls}
                        value={previewItem.interval || "Monatlich"}
                        onChange={(e) =>
                          patchPreview({ interval: e.target.value })
                        }
                      >
                        <option value="Monatlich">Monatlich</option>
                        <option value="2 monatlich">2 monatlich</option>
                        <option value="Quartal">Quartal</option>
                        <option value="halbjährlich">halbjährlich</option>
                        <option value="jährlich">jährlich</option>
                      </select>
                    ) : (
                      previewItem.interval || "—"
                    )}
                  </Field>
                  <Field label="Priority">
                    {previewEdit ? (
                      <select
                        className={inputCls}
                        value={previewItem.priority || "Normal"}
                        onChange={(e) =>
                          patchPreview({ priority: e.target.value })
                        }
                      >
                        <option value="Normal">Normal</option>
                        <option value="High">High</option>
                      </select>
                    ) : (
                      previewItem.priority || "—"
                    )}
                  </Field>
                  <Field label="Request Status">
                    {previewEdit ? (
                      <select
                        className={inputCls}
                        value={previewItem.requestStatus || "Open"}
                        onChange={(e) =>
                          patchPreview({ requestStatus: e.target.value })
                        }
                      >
                        <option value="Open">Open</option>
                        <option value="supplier search">Supplier search</option>
                        <option value="stopped">Stopped</option>
                        <option value="successful">Successful</option>
                        <option value="Converted to Item">
                          Converted to Item
                        </option>
                      </select>
                    ) : (
                      previewItem.requestStatus || "—"
                    )}
                  </Field>
                </div>
              )}
              <div className="mt-6 pt-5 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">
                    Quality Criteria ({previewQuality.length})
                  </h3>
                  <button
                    onClick={() => openQualityModal()}
                    className="px-2.5 py-1 text-xs bg-[#8CC21B] text-white rounded-md hover:bg-[#7ab318] flex items-center gap-1"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
                {previewQuality.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    No quality criteria for this item.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {previewQuality.map((q: any) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {q.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {q.description}
                            {q.descriptionCN ? ` · ${q.descriptionCN}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {q.picture && (
                            <button
                              onClick={() =>
                                window.open(resolveUrl(q.picture)!, "_blank")
                              }
                              className="text-blue-600 hover:text-blue-800"
                              title="View Image"
                            >
                              <EyeIconOutline className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openQualityModal(q)}
                            className="text-emerald-600 hover:text-emerald-800"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeQuality(q.id)}
                            className="text-rose-600 hover:text-rose-800"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-6 pt-5 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">
                    Attachments ({previewItem?.attachments?.length || 0})
                  </h3>
                  <button
                    onClick={() => attachmentInputRef.current?.click()}
                    disabled={uploadingAttachments}
                    className="px-2.5 py-1 text-xs bg-[#8CC21B] text-white rounded-md hover:bg-[#7ab318] flex items-center gap-1 disabled:opacity-50"
                  >
                    <DocumentIcon className="w-3.5 h-3.5" />
                    {uploadingAttachments ? "Uploading..." : "Upload"}
                  </button>
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={uploadPreviewAttachments}
                  />
                </div>
                {!previewItem?.attachments ||
                previewItem.attachments.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    No attachments for this item.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {previewItem.attachments.map((att: any, i: number) => {
                      const url = resolveUrl(att.url) || "";
                      return (
                        <div
                          key={att.id || i}
                          className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2"
                        >
                          <span
                            className="text-sm text-gray-900 break-all min-w-0 pr-3"
                            title={att.originalName || att.filename}
                          >
                            {att.originalName || att.filename || "Attachment"}
                          </span>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <button
                              onClick={() => window.open(url, "_blank")}
                              className="text-blue-600 hover:text-blue-800"
                              title="View"
                            >
                              <EyeIconOutline className="w-4 h-4" />
                            </button>
                            <a
                              href={url}
                              download={att.originalName || att.filename}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#8CC21B] hover:text-[#7ab318]"
                              title="Download"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => deletePreviewAttachment(att.id)}
                              className="text-rose-600 hover:text-rose-800"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="mt-6 pt-5 border-t border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <PhotoIcon className="w-4 h-4 text-blue-500" />
                  Pictures
                </h3>
                {(() => {
                  const pics = [
                    previewItem.pictures?.shopPicture,
                    previewItem.pictures?.ebayPictures,
                    ...(previewItem.pictures?.pixPath || "")
                      .split(",")
                      .filter(Boolean),
                  ].filter(Boolean);
                  if (pics.length === 0)
                    return (
                      <p className="text-xs text-gray-400">No pictures.</p>
                    );
                  return (
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                      {pics.map((url: any, i: number) => (
                        <div
                          key={i}
                          className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200"
                        >
                          <img
                            src={resolveUrl(url)!}
                            alt={`pic-${i}`}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() =>
                              window.open(resolveUrl(url)!, "_blank")
                            }
                            onError={(e) =>
                              ((e.target as HTMLImageElement).src =
                                "https://placehold.co/200x200?text=—")
                            }
                          />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              {/* Footer */}
              <div className="flex justify-between gap-2 pt-6 mt-6 border-t">
                <div>
                  {previewEdit && (
                    <button
                      onClick={handleDeletePreviewItem}
                      className="px-4 py-2 text-xs text-red-700 bg-white border border-red-300/80 rounded-lg hover:bg-red-50 flex items-center gap-1 font-semibold"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {!isRequest && (
                    <button
                      onClick={() => router.push(`/items/${itemId}`)}
                      className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-xs font-semibold"
                    >
                      <EyeIconOutline className="w-4 h-4" />
                      Full Details
                    </button>
                  )}
                  {isRequest &&
                    onConvert &&
                    previewItem.requestStatus !== "Converted to Item" && (
                      <button
                        onClick={() => {
                          onClose();
                          if (onConvert) onConvert(previewItem);
                        }}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 text-xs font-semibold shadow-sm"
                      >
                        Convert to Item
                      </button>
                    )}
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-xs font-semibold"
                  >
                    {previewEdit ? "Cancel" : "Close"}
                  </button>
                  {previewEdit && (
                    <button
                      onClick={handleSavePreview}
                      disabled={previewSaving}
                      className="px-4 py-2 bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] disabled:opacity-50 text-xs font-semibold"
                    >
                      {previewSaving ? "Saving..." : "Save Changes"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <CustomModal
        isOpen={qualityModalOpen}
        onClose={() => setQualityModalOpen(false)}
        title={
          editingQuality ? "Update Quality Criterion" : "Add Quality Criterion"
        }
        width="max-w-md"
        footer={
          <div className="flex gap-2 w-full justify-end">
            <button
              onClick={() => setQualityModalOpen(false)}
              className="px-4 py-2 flex items-center gap-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-xs"
            >
              <XCircleIcon className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={saveQuality}
              className="px-4 py-2 flex items-center gap-2 text-white bg-[#00A651] rounded-lg hover:bg-[#008c44] text-xs"
            >
              <CheckCircleIcon className="h-4 w-4" />
              {editingQuality ? "Update" : "Add"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              value={qualityForm.name}
              onChange={(e) =>
                setQualityForm((p: any) => ({ ...p, name: e.target.value }))
              }
              placeholder="Quality name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photo
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                id="popup-quality-photo"
                className="hidden"
                accept="image/*"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  setQualityForm((p: any) => ({
                    ...p,
                    picture: e.target.files![0],
                  }))
                }
              />
              <label
                htmlFor="popup-quality-photo"
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
              >
                Choose file
              </label>
              <span className="text-sm text-gray-500">
                {qualityForm.picture
                  ? qualityForm.picture.name
                  : qualityForm.pictureUrl
                    ? "Existing photo"
                    : "No file chosen"}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={qualityForm.description}
              onChange={(e) =>
                setQualityForm((p: any) => ({
                  ...p,
                  description: e.target.value,
                }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description CN
            </label>
            <textarea
              value={qualityForm.descriptionCN}
              onChange={(e) =>
                setQualityForm((p: any) => ({
                  ...p,
                  descriptionCN: e.target.value,
                }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary text-sm"
            />
          </div>
        </div>
      </CustomModal>
    </div>
  );
};
export default ItemPreviewModal;

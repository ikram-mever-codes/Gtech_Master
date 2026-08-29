"use client";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  Suspense,
} from "react";
import {
  createRechnungKFromRechnung,
  getRechnungKById,
  getRechnungOpenQuantities,
  getAllRechnungenK,
  deleteRechnungK,
  updateRechnungK,
} from "@/api/rechnungen_k";

import { Plus, ChevronLeft, ChevronRight, DollarSign } from "lucide-react";

import { getExpandedInvoiceDetails, updateInvoice } from "@/api/invoice";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/UI/PageHeader";
import CustomButton from "@/components/UI/CustomButton";

import { updateCustomerProfile } from "@/api/customers";
import { getAllGtechCompanies, GtechCompany } from "@/api/gtech_companies";
import { duplicateCustomerOrder } from "@/api/customer_orders";
import {
  updateOrderItemStatus,
  splitOrderItem,
  updateOrderItemPrice,
  downloadCommercialInvoice,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
} from "@/api/orders";
import { getAllCargos, CargoType, assignOrdersToCargo } from "@/api/cargos";
import { getAllTaricsSimple, getItems, updateItem } from "@/api/items";
import { getSupplierItems } from "@/api/suppliers";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import { DataTable, ColumnDef } from "@/components/UI/DataTable";
import BillToShipToForm, {
  BillToShipToData,
  WAREHOUSE_BILL_TO,
} from "@/components/General/BillToShipToForm";
import { toast } from "react-hot-toast";
import { successStyles, errorStyles } from "@/utils/constants";
import CustomModal from "@/components/UI/CustomModal";
import OffersPage from "../offers/page";
import ItemSelectorWithQuantity from "@/components/orders/ItemSelectorWithQuantity";
import OrderDetailsModal from "@/components/orders/OrderDetailsModal";
import {
  createBestellungFromAuftrag,
  updateTransferOrderStatus,
} from "@/api/transfer_orders";
import {
  createPaymentInbound,
  deletePaymentInbound,
} from "@/api/payment_inbounds";
import {
  getAllPaymentAccounts,
  PaymentAccountData,
} from "@/api/payment_accounts";
import { formatDate } from "@/utils/date";
import DocumentLineItemsSubTable from "@/components/UI/DocumentLineItemsSubTable";
import CommercialLineItemsSubTable from "@/components/UI/CommercialLineItemsSubTable";
import {
  CommercialFilters,
  initialCommercialFilters,
  isValueMatching,
  isDateInPreset,
} from "@/utils/commercialFilters";
import { DEFAULT_DYNAMIC_COLOURS } from "@/components/UI/SystemColourSelect";
import { getAllSystemParameters } from "@/api/system_parameters";
import { getOrderStatusColor } from "@/api/orders";

import {
  useCommercialTabData,
  InvoiceTab,
} from "../../hooks/useCommercialTabData";
import CommercialFilterBar from "./CommercialFilterBar";
import {
  OfferDetailModalLazy,
  AuftragToBestellungModal,
  AuftragCreateModal,
  AuftragToRechnungModal,
  RechnungOhneAusliefernModal,
  LieferscheinDetailModal,
  AuftragPreviewModal,
  BestellungPreviewModal,
  InvoiceDetailsModal,
  OrderFormModal,
  ReassignModal,
  SplitModal,
  TaricModal,
  QtyModal,
  RechnungDetailModal,
} from "./LazyModals";

import {
  buildAuftragColumns,
  getStatusBackgroundColor,
  sortAuftraegeByStatus,
} from "./auftragColumns";
import { buildBestellungColumns } from "./bestellungColumns";
import {
  buildRechnungColumns,
  getRechnungStatusBackgroundColor,
} from "./rechnungColumns";
import { buildRkColumns } from "./rkColumns";
import { buildLieferscheinColumns } from "./lieferscheinColumns";
import { buildPaymentInboundColumns } from "./paymentInboundColumns";
import PaymentInboundAssignModal from "./PaymentInboundAssignModal";
import { AnyAaaaRecord } from "dns";

const hasChinese = (str: string) => /[\u4e00-\u9fa5]/.test(str || "");

const invoiceTabs = [
  { id: "angebot", label: "Angebot" },
  { id: "auftrag", label: "Auftrag" },
  { id: "bestellung", label: "Bestellung" },
  { id: "rechnung", label: "Rechnung" },
  { id: "rk", label: "RK" },
  { id: "payment_inbound", label: "Zahlung" },
  { id: "lieferschein", label: "Lieferschein" },
] as const;

const InvoiceListPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSelector((state: RootState) => state.user);
  const [openQuantities, setOpenQuantities] = useState<Record<string, any>>({});
  const [allOpenQuantities, setAllOpenQuantities] = useState<
    Record<string, Record<string, number>>
  >({});
  const [rechnungModalMode, setRechnungModalMode] = useState<
    "view" | "correction"
  >("view");

  const tabData = useCommercialTabData();

  const [systemColours, setSystemColours] = useState<any[]>(
    DEFAULT_DYNAMIC_COLOURS,
  );

  const handleOpenRechnungView = (row: any) => {
    setRechnungModalMode("view");
    setSelectedRechnungForDetail(row);
    setShowRechnungDetailModal(true);
    const rowOpenQuantities = allOpenQuantities[row.id] || {};
    setOpenQuantities(rowOpenQuantities);
  };

  useEffect(() => {
    (async () => {
      try {
        const res: any = await getAllSystemParameters();
        const palette = res?.data?.find(
          (p: any) => p.key === "system_colours",
        )?.value;
        if (Array.isArray(palette) && palette.length > 0) {
          setSystemColours(palette);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const [activeInvTab, setActiveInvTab] = useState<InvoiceTab>(
    () => (searchParams.get("tab") as InvoiceTab) || "auftrag",
  );

  useEffect(() => {
    tabData.ensureLoaded(activeInvTab);
  }, [activeInvTab, tabData]);

  // Fetch open quantities for all Rechnungen when Rechnung tab is active
  const fetchAllOpenQuantities = useCallback(async () => {
    if (activeInvTab !== "rechnung") return;

    try {
      const rechnungen = tabData.rechnungen || [];
      const qtyMap: Record<string, Record<string, number>> = {};

      for (const rechnung of rechnungen) {
        try {
          const res: any = await getRechnungOpenQuantities(rechnung.id);
          if (res?.success) {
            const itemMap: Record<string, number> = {};
            res.data.items.forEach((item: any) => {
              itemMap[item.id] = item.openQuantity;
            });
            qtyMap[rechnung.id] = itemMap;
          }
        } catch (error) {
          console.error(
            `Failed to fetch open quantities for ${rechnung.id}:`,
            error,
          );
        }
      }

      setAllOpenQuantities(qtyMap);
    } catch (error) {
      console.error("Failed to fetch all open quantities:", error);
    }
  }, [activeInvTab, tabData.rechnungen]);

  // Trigger fetching when Rechnung tab becomes active
  useEffect(() => {
    if (activeInvTab === "rechnung") {
      fetchAllOpenQuantities();
    }
  }, [activeInvTab, fetchAllOpenQuantities]);

  // cargos / tarics / payment accounts
  const [cargos, setCargos] = useState<CargoType[]>([]);
  const [tarics, setTarics] = useState<any[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccountData[]>(
    [],
  );
  useEffect(() => {
    getAllCargos({ limit: 1000, availableOnly: true }).then((res) => {
      if (res.success) setCargos(res.data);
    });
    getAllTaricsSimple().then((res) => {
      if (res.success) setTarics(res.data);
    });
    getAllPaymentAccounts(true)
      .then((res: any) => {
        if (res?.success) setPaymentAccounts(res.data || []);
        else if (Array.isArray(res?.data)) setPaymentAccounts(res.data);
      })
      .catch((err) => console.error("Error fetching PaymentAccounts:", err));
  }, []);

  const [showBestellungPreviewModal, setShowBestellungPreviewModal] =
    useState(false);
  const [selectedBestellungId, setSelectedBestellungId] = useState<
    string | number | null
  >(null);
  const [bestellungPreviewInitialEdit, setBestellungPreviewInitialEdit] =
    useState(false);
  const [showCreateBestellungModal, setShowCreateBestellungModal] =
    useState(false);

  const [showRechnungKModal, setShowRechnungKModal] = useState(false);
  const [selectedRechnungKData, setSelectedRechnungKData] = useState<any>(null);
  const [creatingRkForId, setCreatingRkForId] = useState<string | null>(null);

  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [offerRefreshKey, setOfferRefreshKey] = useState(0);
  const [showAuftragPreviewModal, setShowAuftragPreviewModal] = useState(false);
  const [selectedAuftragId, setSelectedAuftragId] = useState<
    string | number | null
  >(null);
  const [auftragPreviewInitialEdit, setAuftragPreviewInitialEdit] =
    useState(false);

  const handleOpenAuftragPreview = (
    id: string | number,
    initialEdit: boolean = false,
  ) => {
    setSelectedAuftragId(id);
    setAuftragPreviewInitialEdit(initialEdit);
    setShowAuftragPreviewModal(true);
  };

  const handleOpenBestellungPreview = (
    id: string | number,
    initialEdit: boolean = false,
  ) => {
    setSelectedBestellungId(id);
    setBestellungPreviewInitialEdit(initialEdit);
    setShowBestellungPreviewModal(true);
  };

  const handleOpenOfferModal = (id: string | null = null) => {
    setSelectedOfferId(id);
    setShowOfferModal(true);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {},
  );

  const [expandedStates, setExpandedStates] = useState<
    Record<
      string,
      { taric?: boolean; items?: boolean; data?: any; loading?: boolean }
    >
  >({});

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showInvoiceDetailsModal, setShowInvoiceDetailsModal] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState<"taric" | "items">(
    "taric",
  );
  const [expandedDocIds, setExpandedDocIds] = useState<Set<string | number>>(
    new Set(),
  );
  const [invoiceEditForm, setInvoiceEditForm] = useState({
    title: "",
    description: "",
    freightCost: "",
    remark: "",
  });

  const handleOpenInvoiceDetails = async (invoice: any) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDetailsModal(true);
    setModalActiveTab("taric");
    setInvoiceEditForm({
      title: invoice.title || "",
      description: invoice.description || "",
      freightCost: invoice.freightCost?.toString() || "",
      remark: invoice.remark || "",
    });

    const currentState = expandedStates[invoice.id] || {};
    if (!currentState.data) {
      setExpandedStates((prev: any) => ({
        ...prev,
        [invoice.id]: { ...currentState, loading: true },
      }));
      try {
        const response = await getExpandedInvoiceDetails(invoice.id);
        if (response.success) {
          setExpandedStates((prev: any) => ({
            ...prev,
            [invoice.id]: {
              taric: true,
              items: true,
              data: response.data,
              loading: false,
            },
          }));
        }
      } catch (error) {
        console.error(error);
        setExpandedStates((prev: any) => ({
          ...prev,
          [invoice.id]: { ...currentState, loading: false },
        }));
      }
    }
  };

  const [showREModal, setShowREModal] = useState(false);
  const [showSPModal, setShowSPModal] = useState(false);
  const [showQTYModal, setShowQTYModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [splitQty, setSplitQty] = useState<number>(0);
  const [newQty, setNewQty] = useState<number>(0);
  const [targetCargoId, setTargetCargoId] = useState<string>("");
  const [showBTSTModal, setShowBTSTModal] = useState(false);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] =
    useState<any>(null);
  const [btstFormData, setBtstFormData] = useState<Partial<BillToShipToData>>(
    {},
  );

  const [expandedPriceItemId, setExpandedPriceItemId] = useState<string | null>(
    null,
  );
  const [editingPrice, setEditingPrice] = useState<number>(0);
  const [splitRemarks, setSplitRemarks] = useState<string>("");
  const [selectedTaricCode, setSelectedTaricCode] = useState<string>("");

  const [showTaricModal, setShowTaricModal] = useState(false);
  const [selectedTaricGroup, setSelectedTaricGroup] = useState<any>(null);
  const [qtyRemarks, setQtyRemarks] = useState("");

  const [gtechCompanies, setGtechCompanies] = useState<GtechCompany[]>([]);

  useEffect(() => {
    getAllGtechCompanies()
      .then((res: any) => {
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
        setGtechCompanies(list);
      })
      .catch(() => setGtechCompanies([]));
  }, []);

  const gtechHkDisplayName = useMemo(() => {
    const hk =
      gtechCompanies.find(
        (c) =>
          (c.display_name &&
            c.display_name.toLowerCase().includes("hong kong")) ||
          (c.legal_name && c.legal_name.toLowerCase().includes("hong kong")) ||
          (c.country && c.country.toLowerCase().includes("hong kong")),
      ) || gtechCompanies[0];
    return hk?.display_name || hk?.legal_name || "";
  }, [gtechCompanies]);

  const [
    selectedAuftragForBestellungModal,
    setSelectedAuftragForBestellungModal,
  ] = useState<any>(null);
  const [showAuftragToBestellungModal, setShowAuftragToBestellungModal] =
    useState(false);
  const [showAuftragCreateModal, setShowAuftragCreateModal] = useState(false);

  const [selectedAuftragForRechnungModal, setSelectedAuftragForRechnungModal] =
    useState<any>(null);
  const [showAuftragToRechnungModal, setShowAuftragToRechnungModal] =
    useState(false);

  const [
    selectedAuftragForRechnungOhneAusliefernModal,
    setSelectedAuftragForRechnungOhneAusliefernModal,
  ] = useState<any>(null);
  const [showRechnungOhneAusliefernModal, setShowRechnungOhneAusliefernModal] =
    useState(false);

  const [showRechnungDetailModal, setShowRechnungDetailModal] = useState(false);
  const [selectedRechnungForDetail, setSelectedRechnungForDetail] =
    useState<any>(null);

  const [showLieferscheinDetailModal, setShowLieferscheinDetailModal] =
    useState(false);
  const [selectedLieferscheinForDetail, setSelectedLieferscheinForDetail] =
    useState<any>(null);

  const [showInboundModal, setShowInboundModal] = useState(false);
  const [showAssignInboundModal, setShowAssignInboundModal] = useState(false);
  const [selectedInboundForAssign, setSelectedInboundForAssign] =
    useState<any>(null);
  const [submittingInbound, setSubmittingInbound] = useState(false);
  const [inboundForm, setInboundForm] = useState({
    paymentAccountId: "",
    receivedDate: new Date().toISOString().split("T")[0],
    amount: "",
    currencyCode: "EUR",
    payerName: "",
    reference: "",
  });

  const [itemsByCategory, setItemsByCategory] = useState<any[]>([]);
  const [itemsBySupplier, setItemsBySupplier] = useState<any[]>([]);
  const [loadingItemsByCategory, setLoadingItemsByCategory] = useState(false);
  const [loadingItemsBySupplier, setLoadingItemsBySupplier] = useState(false);
  const [docFilters, setDocFilters] = useState<CommercialFilters>(
    initialCommercialFilters,
  );

  const isAnyFilterActive = useMemo(() => {
    return (
      !!docFilters.documentNo.trim() ||
      !!docFilters.customerNo.trim() ||
      !!docFilters.customerName.trim() ||
      !!docFilters.valueAmount.trim() ||
      !!docFilters.status ||
      docFilters.datePreset !== "all" ||
      !!searchTerm
    );
  }, [docFilters, searchTerm]);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [viewItems, setViewItems] = useState<any[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<"create" | "edit" | "convert">("create");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [form, setForm] = useState({
    comment: "",
    customer_id: "",
    category_id: "",
    supplier_id: "",
    status: "",
    ref_no: "",
  });

  const isTab1 = activeInvTab !== "auftrag";
  const isConvertMode = mode === "convert";

  const effectiveItems = useMemo(() => {
    if (form.supplier_id) return itemsBySupplier;
    if (form.category_id) return itemsByCategory;
    return tabData.itemsAll;
  }, [
    form.supplier_id,
    itemsBySupplier,
    form.category_id,
    itemsByCategory,
    tabData.itemsAll,
  ]);

  const loadingItems =
    tabData.loadingItemsAll ||
    (isTab1 && !!form.supplier_id && loadingItemsBySupplier) ||
    (isTab1 && !!form.category_id && loadingItemsByCategory);

  const canSubmit = useMemo(() => {
    if (isConvertMode) return orderItems.length > 0;
    const hasItems = orderItems.length > 0;
    const hasComment = !!form.comment?.trim();
    const tabOk = isTab1 ? !!form.category_id || !!form.supplier_id : true;
    return hasItems && hasComment && tabOk;
  }, [
    isConvertMode,
    orderItems.length,
    form.comment,
    form.category_id,
    form.supplier_id,
    isTab1,
  ]);

  const resetForm = useCallback(() => {
    setForm({
      comment: "",
      customer_id: "",
      category_id: "",
      supplier_id: "",
      status: "",
      ref_no: "",
    });
    setSelectedItemId("");
    setOrderItems([]);
    setItemsByCategory([]);
    setItemsBySupplier([]);
    setSelectedOrder(null);
    setMode("create");
  }, []);

  const fetchOpenQuantities = async (rechnungId: string) => {
    try {
      const res: any = await getRechnungOpenQuantities(rechnungId);
      if (res?.success) {
        const qtyMap: Record<string, number> = {};
        res.data.items.forEach((item: any) => {
          qtyMap[item.id] = item.openQuantity;
        });
        setOpenQuantities(qtyMap);
      }
    } catch (error) {
      console.error("Failed to fetch open quantities:", error);
    }
  };

  const fetchItemsByCategory = useCallback(async (category_id: string) => {
    if (!category_id) {
      setItemsByCategory([]);
      return;
    }
    try {
      setLoadingItemsByCategory(true);
      const response = await getItems({ category: category_id });
      const data = response?.data ?? response;
      setItemsByCategory(Array.isArray(data) ? data : data?.items || []);
    } catch (error) {
      console.error("Error fetching category items:", error);
      setItemsByCategory([]);
    } finally {
      setLoadingItemsByCategory(false);
    }
  }, []);

  const handleCategoryChange = async (category_id: string) => {
    setForm((prev: any) => ({ ...prev, category_id }));
    setSelectedItemId("");
    setOrderItems([]);
    if (category_id) {
      await fetchItemsByCategory(category_id);
      return;
    }
    setItemsByCategory([]);
  };

  const handleSupplierChange = async (
    supplier_id: string,
    resetOrderItemsFlag: boolean = true,
  ) => {
    setForm((prev: any) => ({ ...prev, supplier_id }));
    setSelectedItemId("");
    if (resetOrderItemsFlag) setOrderItems([]);

    if (supplier_id) {
      setLoadingItemsBySupplier(true);
      try {
        const response: any = await getSupplierItems(supplier_id);
        const data = response?.data ?? response;
        setItemsBySupplier(Array.isArray(data) ? data : data?.items || []);
      } catch (e) {
        console.error(e);
        toast.error("Failed to fetch supplier items");
        setItemsBySupplier([]);
      } finally {
        setLoadingItemsBySupplier(false);
      }
      return;
    }
    setItemsBySupplier([]);
  };

  const itemById = useMemo(() => {
    const map = new Map<string, any>();
    for (const it of tabData.itemsAll) map.set(String(it.id), it);
    return map;
  }, [tabData.itemsAll]);

  const handleAddItemToOrder = (item_id: string, qty: number) => {
    const item = itemById.get(String(item_id));
    const itemName = item?.item_name || item?.name || "Unnamed Item";

    setOrderItems((prev: any) => {
      const idx = prev.findIndex((x: any) => x.item_id === String(item_id));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [
        ...prev,
        {
          item_id: String(item_id),
          itemName,
          qty,
          remark_de: "",
          price: item?.price
            ? Number(item.price)
            : item?.RMB_Price
              ? Number(item.RMB_Price)
              : undefined,
          currency: item?.currency || "CNY",
        },
      ];
    });
    toast.success(`Added ${qty}x ${itemName} to order`);
  };

  const handleRemoveOrderItem = (item_id: string) =>
    setOrderItems((prev: any) =>
      prev.filter((x: any) => x.item_id !== item_id),
    );

  const handleUpdateOrderItemQty = (item_id: string, qty: number) => {
    if (!qty || qty <= 0) return;
    setOrderItems((prev: any) =>
      prev.map((x: any) => (x.item_id === item_id ? { ...x, qty } : x)),
    );
  };

  const handleUpdateOrderItemRemark = (item_id: string, remark_de: string) => {
    setOrderItems((prev: any) =>
      prev.map((x: any) => (x.item_id === item_id ? { ...x, remark_de } : x)),
    );
  };

  const handleReorderOrderItem = (item_id: string, direction: "up" | "down") => {
    setOrderItems((prev: any[]) => {
      const idx = prev.findIndex((x: any) => x.item_id === item_id);
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const handleEditOrder = async (order: any) => {
    setForm({
      category_id: String(order.category_id ?? ""),
      customer_id: String(order.customer_id ?? ""),
      supplier_id: String(order.supplier_id ?? ""),
      comment: order.comment ?? "",
      status: String(order.status ?? ""),
      ref_no: "",
    });

    setMode("edit");
    setSelectedOrder(order);
    setShowModal(true);

    const category_id = String(order.category_id ?? "");
    if (category_id) await fetchItemsByCategory(category_id);
    else setItemsByCategory([]);

    const supplier_id = String(order.supplier_id ?? "");
    if (supplier_id) await handleSupplierChange(supplier_id, false);
    else setItemsBySupplier([]);

    const detailRes: any = await getOrderById(order.id);
    const detail = detailRes?.data ?? detailRes;
    const lines = detail?.items ?? detail?.data?.items ?? [];

    if (Array.isArray(lines)) {
      setOrderItems(
        lines.map((l: any) => {
          const id = String(l.item_id ?? "");
          const item = itemById.get(id);
          return {
            item_id: id,
            itemName: item?.item_name || item?.name || "Unknown item",
            qty: Number(l.qty ?? 1),
            remark_de: String(l.remark_de ?? ""),
          };
        }),
      );
    } else {
      setOrderItems([]);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleCreateOrder = async () => {
    if (!form.comment?.trim()) return toast.error("Please add a comment");
    if (orderItems.length === 0)
      return toast.error("Please add at least one item");
    if (isTab1 && !form.category_id && !form.supplier_id)
      return toast.error("Please select a category or supplier for Orders");

    const payload = {
      customer_id: form.customer_id || null,
      category_id: form.category_id || null,
      supplier_id: form.supplier_id || null,
      comment: form.comment?.slice(0, 200) || null,
      status: 1,
      items: orderItems.map((x) => ({
        item_id: Number(x.item_id),
        qty: Number(x.qty),
        remark_de: x.remark_de || null,
      })),
    };

    const res = await createOrder(payload as any);
    if (res?.success) toast.success("Order created successfully");
    setShowModal(false);
    resetForm();
    tabData.refetchOrders();
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder?.id) return;
    if (orderItems.length === 0)
      return toast.error("Please add at least one item");

    const payload = {
      customer_id: (form.customer_id || null) as any,
      category_id: (form.category_id || null) as any,
      supplier_id: (form.supplier_id || null) as any,
      comment: (form.comment || "").slice(0, 200),
      status: Number(form.status || selectedOrder.status || 1),
      items: orderItems.map((x) => ({
        item_id: Number(x.item_id),
        qty: Number(x.qty),
        remark_de: x.remark_de || null,
      })),
    };

    await updateOrder(selectedOrder.id, payload);
    setShowModal(false);
    resetForm();
    tabData.refetchOrders();
  };

  const handleSetPrice = async (itemId: string | number) => {
    try {
      const res = await updateOrderItemPrice(itemId, editingPrice);
      if (res.success) {
        setExpandedPriceItemId(null);
        Object.keys(expandedStates).forEach(async (invId) => {
          if (expandedStates[invId].items) {
            const response = await getExpandedInvoiceDetails(invId);
            if (response.success) {
              setExpandedStates((prev: any) => ({
                ...prev,
                [invId]: { ...prev[invId], data: response.data },
              }));
            }
          }
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleReassignItem = async () => {
    if (!selectedItem || !targetCargoId) return;
    try {
      const cargoIdNum = Number(targetCargoId);

      if (activeInvTab === "bestellung" || activeInvTab === "auftrag") {
        await assignOrdersToCargo(cargoIdNum, [Number(selectedItem.id)], false);
        toast.success(
          `Order ${selectedItem.order_no} assigned to Cargo ${targetCargoId}`,
        );
        setShowREModal(false);
        await tabData.refetchOrders();
      } else {
        await updateOrderItemStatus(selectedItem.id, { cargo_id: cargoIdNum });

        const orderId = selectedItem.order_id || selectedItem.order?.id;
        if (orderId) {
          await assignOrdersToCargo(cargoIdNum, [Number(orderId)], true);
        }

        toast.success("Item reassigned successfully");
        setShowREModal(false);

        const invId = Object.keys(expandedStates).find((key) =>
          expandedStates[key].data?.detailedItems?.some(
            (it: any) => it.id === selectedItem.id,
          ),
        );
        if (invId) {
          setExpandedStates((prev: any) => {
            const newState = { ...prev };
            delete newState[invId];
            return newState;
          });
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to assign/reassign cargo");
    }
  };

  const handleSplitItem = async () => {
    if (!selectedItem || splitQty <= 0) return;
    try {
      await splitOrderItem(
        selectedItem.id,
        splitQty,
        targetCargoId,
        splitRemarks,
      );
      toast.success("Item split and moved successfully");
      setShowSPModal(false);
      setSplitRemarks("");
      const invId = Object.keys(expandedStates).find((key) =>
        expandedStates[key].data?.detailedItems?.some(
          (it: any) => it.id === selectedItem.id,
        ),
      );
      if (invId) {
        setExpandedStates((prev: any) => {
          const newState = { ...prev };
          delete newState[invId];
          return newState;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetTaric = async (group: any) => {
    if (!selectedTaricCode || !group) return;
    try {
      const invId = Object.keys(expandedStates).find(
        (key) =>
          expandedStates[key].taric &&
          expandedStates[key].data?.taricGroups?.some(
            (g: any) => g.taricId === group.taricId,
          ),
      );
      if (!invId) {
        toast.error("Could not find invoice for this taric group");
        return;
      }

      const itemsInGroup = expandedStates[invId].data?.detailedItems?.filter(
        (oi: any) => {
          let oiGroupKey = "";
          if (oi.set_taric_code) {
            const codes = oi.set_taric_code.split("/");
            const target = codes.length > 1 ? codes[1].trim() : codes[0].trim();
            oiGroupKey = `set_${target}`;
          } else {
            const taricId = oi.item?.taric?.id;
            oiGroupKey = taricId ? `taric_${taricId}` : "unknown";
          }
          return oiGroupKey === group.taricId;
        },
      );

      if (itemsInGroup && itemsInGroup.length > 0) {
        for (const oi of itemsInGroup) {
          const originalCode = oi.item?.taric?.code;
          const hasOriginal =
            originalCode &&
            originalCode !== "0" &&
            originalCode !== "0000000000";

          let newTaricValue = "";
          if (hasOriginal) {
            newTaricValue = `${originalCode}/${selectedTaricCode}`;
          } else {
            const priorSet = oi.set_taric_code;
            if (priorSet && priorSet.includes("/")) {
              const parts = priorSet.split("/");
              newTaricValue = `${parts[0]}/${selectedTaricCode}`;
            } else if (priorSet && priorSet !== selectedTaricCode) {
              newTaricValue = `${priorSet}/${selectedTaricCode}`;
            } else {
              newTaricValue = selectedTaricCode;
            }
          }
          await updateOrderItemStatus(oi.id, { set_taric_code: newTaricValue });
        }
        toast.success("Taric codes updated successfully");
        setShowTaricModal(false);
        setSelectedTaricCode("");

        const res = await getExpandedInvoiceDetails(invId);
        if (res.success) {
          setExpandedStates((prev: any) => ({
            ...prev,
            [invId]: { ...prev[invId], data: res.data },
          }));
        }
      } else {
        toast.error("No items found in this group to update");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update taric codes");
    }
  };

  const handleUpdateQty = async () => {
    if (!selectedItem || newQty <= 0) return;
    try {
      await updateOrderItemStatus(selectedItem.id, {
        qty_label: newQty,
        remarks_cn: qtyRemarks,
      });
      toast.success("QtyLabel updated successfully");
      setShowQTYModal(false);
      setQtyRemarks("");
      const invId = Object.keys(expandedStates).find((key) =>
        expandedStates[key].data?.detailedItems?.some(
          (it: any) => it.id === selectedItem.id,
        ),
      );
      if (invId) {
        const res = await getExpandedInvoiceDetails(invId);
        setExpandedStates((prev: any) => ({
          ...prev,
          [invId]: { ...prev[invId], data: res.data },
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenBTSTModal = (customer: any) => {
    setSelectedCustomerForEdit(customer);
    setBtstFormData({
      customer_type: customer.customer_type || "GT-Warehouse",
      ...(customer.customer_type === "Other Customer" ? {} : WAREHOUSE_BILL_TO),
      bill_to_company_name:
        customer.bill_to_company_name || WAREHOUSE_BILL_TO.bill_to_company_name,
      bill_to_display_name:
        customer.bill_to_display_name || WAREHOUSE_BILL_TO.bill_to_display_name,
      bill_to_phone_no:
        customer.bill_to_phone_no || WAREHOUSE_BILL_TO.bill_to_phone_no,
      bill_to_tax_no:
        customer.bill_to_tax_no || WAREHOUSE_BILL_TO.bill_to_tax_no,
      bill_to_email: customer.bill_to_email || WAREHOUSE_BILL_TO.bill_to_email,
      bill_to_website:
        customer.bill_to_website || WAREHOUSE_BILL_TO.bill_to_website,
      bill_to_contact_person:
        customer.bill_to_contact_person ||
        WAREHOUSE_BILL_TO.bill_to_contact_person,
      bill_to_contact_phone:
        customer.bill_to_contact_phone ||
        WAREHOUSE_BILL_TO.bill_to_contact_phone,
      bill_to_contact_mobile:
        customer.bill_to_contact_mobile ||
        WAREHOUSE_BILL_TO.bill_to_contact_mobile,
      bill_to_contact_email:
        customer.bill_to_contact_email ||
        WAREHOUSE_BILL_TO.bill_to_contact_email,
      bill_to_country:
        customer.bill_to_country || WAREHOUSE_BILL_TO.bill_to_country,
      bill_to_city: customer.bill_to_city || WAREHOUSE_BILL_TO.bill_to_city,
      bill_to_postal_code:
        customer.bill_to_postal_code || WAREHOUSE_BILL_TO.bill_to_postal_code,
      bill_to_full_address:
        customer.bill_to_full_address || WAREHOUSE_BILL_TO.bill_to_full_address,
      ship_to_company_name:
        customer.ship_to_company_name || customer.companyName || "",
      ship_to_display_name:
        customer.ship_to_display_name || customer.companyName || "",
      ship_to_contact_person: customer.ship_to_contact_person || "-",
      ship_to_contact_phone:
        customer.ship_to_contact_phone || customer.contactPhoneNumber || "",
      ship_to_country:
        customer.ship_to_country ||
        customer.deliveryCountry ||
        customer.country ||
        "",
      ship_to_city:
        customer.ship_to_city || customer.deliveryCity || customer.city || "",
      ship_to_postal_code:
        customer.ship_to_postal_code ||
        customer.deliveryPostalCode ||
        customer.postalCode ||
        "",
      ship_to_full_address:
        customer.ship_to_full_address ||
        customer.deliveryAddressLine1 ||
        customer.addressLine1 ||
        "",
      ship_to_remarks: customer.ship_to_remarks || "",
    });
    setShowBTSTModal(true);
  };

  const handleSaveBTST = async () => {
    if (!selectedCustomerForEdit) return;
    try {
      const payload = { ...selectedCustomerForEdit, ...btstFormData };
      const res = await updateCustomerProfile(payload);
      if (res?.success) {
        setShowBTSTModal(false);
        tabData.refetchCustomers();
      }
    } catch (error) {
      console.error("Failed to update billto/shipto:", error);
    }
  };

  const handleAssignSupplier = async (
    orderItemId: number | string,
    supplierId: number,
    baseItemId?: number | string,
  ) => {
    try {
      await updateOrderItemStatus(orderItemId, { supplier_id: supplierId });
      if (baseItemId) {
        await updateItem(Number(baseItemId), { supplier_id: supplierId });
      }
      toast.success("Supplier assigned successfully");
    } catch (error) {
      console.error("Failed to assign supplier:", error);
      toast.error("Failed to assign supplier");
    }
  };

  const handleDirectConvertAuftragToBestellung = async (auftrag: any) => {
    if (
      !window.confirm(
        `Convert Auftrag ${auftrag.order_no} directly to Bestellung?`,
      )
    )
      return;
    try {
      const sourceLineItems = auftrag.orderItems || auftrag.items || [];
      const items = sourceLineItems.map((it: any) => ({
        sourceLineItemId: String(it.id),
        sourceItemId: it.sourceItemId || undefined,
        qty: Number(it.quantity || it.qty) || 1,
        max_qty: Number(it.quantity || it.qty) || 1,
        itemName: it.itemName || it.item_name || "Line Item",
        itemNo: it.itemNo || it.material || "",
        material: it.material || "",
        photo: it.photo || undefined,
        specification: it.specification || "",
        description: it.description || "",
        weight: it.weight || undefined,
        extraWeight: it.extraWeight || 0,
        notes: it.notes || "",
        remark_order_item: it.remark_order_item || "",
        price: Number(it.price) || 0,
        transferPrice: Number(it.price) || 0,
        purchasePrice: it.purchasePrice || undefined,
        purchaseCurrency: it.purchaseCurrency || "EUR",
        position: it.position || 1,
      }));

      // The filter above only keeps catalog-linked lines (sourceItemId
      // present) — a Bestellung line needs a linkable Item to order from a
      // supplier. If ALL of the Auftrag's lines are Freizeile/freetext, this
      // comes out empty even though the Auftrag itself isn't. Catch that
      // here with a clear message instead of letting the generic backend
      // "Minimum 1 item" error confuse the user into thinking the Auftrag
      // has no items at all.
      // if (items.length === 0) {
      //   const droppedCount = sourceLineItems.length;
      //   toast.error(
      //     droppedCount > 0
      //       ? `This Auftrag has ${droppedCount} line item(s), but none are linked to a catalog item (sourceItemId). Freizeile/freetext lines can't be converted to a Bestellung — link them to an Item first.`
      //       : "This Auftrag has no line items to convert.",
      //     errorStyles,
      //   );
      //   return;
      // }

      const res: any = await createBestellungFromAuftrag(auftrag.id, items);
      if (res?.success) {
        toast.success(
          res.message || `Auftrag ${auftrag.order_no} converted to Bestellung!`,
          successStyles,
        );
        tabData.refetchOrders();
        tabData.refetchBestellungen();

        const createdBestellungId = res?.data?.id;
        if (createdBestellungId) {
          setActiveInvTab("bestellung");
          handleOpenBestellungPreview(createdBestellungId);
        }
      }
    } catch (err) {
      console.error("Error converting Auftrag to Bestellung:", err);
    }
  };

  const handleUpdateBestellungStatus = async (
    id: string | number,
    status: any,
  ) => {
    try {
      await updateTransferOrderStatus(id, status);
      toast.success("Bestellung status updated.", successStyles);
      tabData.refetchBestellungen();
    } catch (err) {
      console.error("Error updating Bestellung status:", err);
      toast.error("Failed to update Bestellung status.", errorStyles);
    }
  };

  const handleCreateRechnungK = (row: any) => {
    setRechnungModalMode("correction");
    setSelectedRechnungForDetail(row);
    setShowRechnungDetailModal(true);
    const rowOpenQuantities = allOpenQuantities[row.id] || {};
    setOpenQuantities(rowOpenQuantities);
  };

  const handleOpenRechnungKDetail = async (row: any) => {
    try {
      const res: any = await getRechnungKById(row.id);
      const payload = res?.data ?? res;
      if (payload) {
        setSelectedRechnungKData(payload);
        setShowRechnungKModal(true);
      } else {
        toast.error("Failed to load correction invoice.", errorStyles);
      }
    } catch (err: any) {
      toast.error(
        err?.message || "Failed to load correction invoice.",
        errorStyles,
      );
    }
  };

  const handleDeleteRechnungK = async (row: any) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this correction invoice? This action cannot be undone.",
      )
    )
      return;
    try {
      await deleteRechnungK(row.id);
      toast.success("Correction invoice deleted.", successStyles);
      tabData.refetchRechnungenK();
    } catch (err: any) {
      toast.error(
        err?.message || "Failed to delete correction invoice.",
        errorStyles,
      );
    }
  };

  const getCategoryName = useCallback(
    (categoryId: string | number) =>
      tabData.categories.find((c) => String(c.id) === String(categoryId))
        ?.name ?? "-",
    [tabData.categories],
  );

  const getSupplierName = useCallback(
    (supplierId: any) => {
      const s = tabData.suppliers.find(
        (c) => String(c.id) === String(supplierId),
      );
      if (!s) return String(supplierId);
      const englishName =
        s.name && !hasChinese(s.name)
          ? s.name
          : s.company_name && !hasChinese(s.company_name)
            ? s.company_name
            : null;
      if (englishName) return englishName;
      const chineseName = s.name_cn || s.company_name || s.name;
      if (chineseName) return chineseName;
      return s.name_de || String(s.id);
    },
    [tabData.suppliers],
  );

  const handleViewOrder = (order: any) => {
    setViewOrder(order);
    setViewItems(
      (order.items || []).map((it: any) => ({
        ...it,
        itemName:
          it.item?.item_name || it.item?.name || it.itemName || "Unknown",
      })),
    );
    setShowViewModal(true);
  };

  const closeView = () => {
    setShowViewModal(false);
    setViewOrder(null);
    setViewItems([]);
  };

  // --- URL <-> tab/filter sync ---
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", activeInvTab);
    if (docFilters.documentNo) params.set("order_no", docFilters.documentNo);
    else params.delete("order_no");
    const qs = params.toString();
    router.replace(qs ? `/commercial?${qs}` : "/commercial", { scroll: false });
  }, [activeInvTab, docFilters.documentNo, router, searchParams]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      let mappedTab = tabParam;
      if (tabParam === "orders") mappedTab = "bestellung";
      if (tabParam === "order_items") mappedTab = "auftrag";
      if (tabParam === "open_invoices") mappedTab = "rechnung";
      if (tabParam === "closed_invoices") mappedTab = "rk";
      if (tabParam === "billto_shipto") mappedTab = "lieferschein";

      const validTabs = [
        "angebot",
        "auftrag",
        "bestellung",
        "rechnung",
        "rk",
        "lieferschein",
      ];
      if (validTabs.includes(mappedTab)) {
        setActiveInvTab(mappedTab as InvoiceTab);
      }
    }
    const orderNo = searchParams.get("order_no");
    if (orderNo !== null) {
      setDocFilters((prev: any) => ({ ...prev, documentNo: orderNo }));
    }
  }, [searchParams]);

  const handleMarkAsPaid = async (invoiceId: string) => {
    toast.error(
      "Please provide a freight cost by editing the invoice before verifying it.",
    );
  };

  const handleSaveInvoiceEdit = async (invoiceId: string) => {
    if (!invoiceEditForm.description?.trim()) {
      toast.error("Description is required");
      return;
    }
    if (
      invoiceEditForm.freightCost === "" ||
      invoiceEditForm.freightCost === null ||
      invoiceEditForm.freightCost === undefined ||
      Number(invoiceEditForm.freightCost) <= 0
    ) {
      toast.error("Freight Cost must be greater than 0");
      return;
    }

    try {
      setActionLoading((prev) => ({ ...prev, [`save-${invoiceId}`]: true }));
      if (activeInvTab === "rk") {
        await updateRechnungK(invoiceId, {
          title: invoiceEditForm.title,
          notes: invoiceEditForm.description || invoiceEditForm.remark,
        });
      } else {
        await updateInvoice({
          id: invoiceId,
          title: invoiceEditForm.title,
          description: invoiceEditForm.description,
          freightCost: invoiceEditForm.freightCost,
          remark: invoiceEditForm.remark,
        });
      }
      setSelectedInvoice((prev: any) =>
        prev
          ? {
              ...prev,
              title: invoiceEditForm.title,
              description: invoiceEditForm.description,
              freightCost: invoiceEditForm.freightCost,
              remark: invoiceEditForm.remark,
            }
          : null,
      );
      toast.success("Invoice changes saved successfully");
    } catch (error) {
      console.error("Failed to save invoice edits:", error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`save-${invoiceId}`]: false }));
    }
  };

  const handleDownloadInvoicePdf = async (invoice: any) => {
    await downloadCommercialInvoice(
      invoice.id,
      invoice.invoiceNumber,
      invoice.cargo?.cargo_no || invoice.cargoNo,
    );
  };

  // --- Tab -> displayed list ---
  const filteredItems = useMemo(() => {
    let list: any[] = [];
    if (activeInvTab === "auftrag") {
      const wawiOrders = tabData.orders.filter(
        (o: any) =>
          (String(o.order_no).startsWith("MA") ||
            String(o.order_no).startsWith("B")) &&
          o.status !== 2 &&
          !o.is_fulfilled &&
          !(o.comment || "").includes("[Moved to Fulfillment]"),
      );
      const mappedCustOrders = (tabData.customerOrders || []).map(
        (co: any) => ({
          ...co,
          isCustomerOrder: true,
          items: co.orderItems || [],
        }),
      );
      list = [...mappedCustOrders, ...wawiOrders];
    } else if (activeInvTab === "bestellung") {
      list = (tabData.bestellungen || []).map((b: any) => ({
        ...b,
        items: b.orderItems || b.items || [],
      }));
    } else if (activeInvTab === "rechnung") {
      list = (tabData.rechnungen || []).map((r: any) => {
        const cust = r.customer || {};
        const snap = r.customerSnapshot || {};
        const dispName =
          cust.display_name ||
          cust.displayName ||
          snap.displayName ||
          snap.display_name ||
          snap.companyName ||
          cust.company_name ||
          cust.companyName ||
          cust.name ||
          "";
        return {
          ...r,
          invoiceNumber: r.invoice_number || r.invoiceNumber || r.id,
          invoiceDate: r.invoice_date || r.invoiceDate,
          createdAt: r.created_at || r.createdAt || r.invoice_date,
          netTotal: r.subtotal,
          grossTotal: r.total_amount || r.grossTotal,
          customer_name: dispName || "—",
          customerSnapshot: {
            ...snap,
            displayName: dispName,
            display_name: dispName,
            companyName:
              cust.company_name ||
              cust.companyName ||
              cust.name ||
              snap.companyName ||
              "—",
            email: cust.email || snap.email || "—",
            country: cust.country || snap.country || "",
            city: cust.city || snap.city || "",
            postalCode:
              cust.postal_code ||
              cust.postalCode ||
              snap.postalCode ||
              snap.postal_code ||
              "",
          },
        };
      });

      const auditFilter = searchParams.get("filter");
      if (auditFilter === "missing_gelangenheitsbestaetigung") {
        list = list.filter((r: any) => {
          const country = (
            r.customerSnapshot?.country ||
            r.customer?.country ||
            ""
          ).trim();
          const isAbroad =
            r.tax_profile_case === "EU_IGL" ||
            r.tax_profile_case === "third_country" ||
            (country !== "" && !["DE", "Deutschland", "DEU"].includes(country));
          const missingDoc =
            !r.gelangenheitsbestaetigung_doc ||
            r.gelangenheitsbestaetigung_doc === "" ||
            r.gelangenheitsbestaetigung_doc === "null";
          return isAbroad && missingDoc;
        });
      }
    } else if (activeInvTab === "payment_inbound") {
      list = (tabData.paymentInbounds || []).map((pi: any) => ({
        ...pi,
        invoiceNumber: pi.reference || pi.external_transaction_id || pi.id,
        createdAt: pi.received_date || pi.created_at,
        grossTotal: pi.amount,
        customer_name: pi.payer_name || pi.paymentAccount?.name || "—",
        customerSnapshot: {
          companyName: pi.payer_name || "—",
          email: pi.payer_account_reference || "",
        },
      }));
    } else if (activeInvTab === "rk") {
      list = (tabData.rechnungenK || []).map((rk: any) => {
        const cust = rk.customer || {};
        const snap = rk.customerSnapshot || {};
        const dispName =
          cust.display_name ||
          cust.displayName ||
          snap.displayName ||
          snap.display_name ||
          snap.companyName ||
          cust.company_name ||
          cust.companyName ||
          cust.name ||
          "";
        return {
          ...rk,
          invoiceNumber:
            rk.rk_number || rk.invoice_number || rk.invoiceNumber || rk.id,
          invoiceDate: rk.rk_date || rk.invoice_date || rk.invoiceDate,
          createdAt:
            rk.created_at || rk.createdAt || rk.rk_date || rk.invoice_date,
          netTotal: rk.subtotal,
          grossTotal: rk.total_amount || rk.grossTotal,
          customer_name: dispName || "—",
          customerSnapshot: {
            ...snap,
            displayName: dispName,
            display_name: dispName,
            companyName:
              cust.company_name ||
              cust.companyName ||
              cust.name ||
              snap.companyName ||
              "—",
            email: cust.email || snap.email || "—",
            country: cust.country || snap.country || "",
            city: cust.city || snap.city || "",
            postalCode:
              cust.postal_code ||
              cust.postalCode ||
              snap.postalCode ||
              snap.postal_code ||
              "",
          },
        };
      });
    } else if (activeInvTab === "lieferschein") {
      list = (tabData.lieferscheine || []).map((ls: any) => {
        const cust = ls.customer || {};
        const snap = ls.customerSnapshot || {};
        const dispName =
          cust.display_name ||
          cust.displayName ||
          snap.displayName ||
          snap.display_name ||
          snap.companyName ||
          cust.companyName ||
          ls.customerName ||
          cust.company_name ||
          "";
        return {
          ...ls,
          invoiceNumber:
            ls.invoiceNumber || ls.deliveryNoteNo || ls.order_no || ls.id,
          order_no: ls.orderNumber || ls.order_no || ls.invoiceNumber || ls.id,
          createdAt: ls.date || ls.createdAt || ls.created_at || ls.invoiceDate,
          customerSnapshot: {
            ...snap,
            displayName: dispName,
            display_name: dispName,
            companyName:
              ls.customerName ||
              cust.companyName ||
              cust.company_name ||
              ls.bill_to ||
              "—",
            contactEmail: cust.email || cust.contactEmail || ls.email || "—",
            postalCode:
              ls.postalCode ||
              cust.postalCode ||
              cust.postal_code ||
              snap.postalCode ||
              "",
            city: ls.city || cust.city || snap.city || "",
            country: ls.country || cust.country || snap.country || "",
          },
          customer_name: dispName || ls.customerName || "—",
          shipping_method: ls.shipping_method || ls.shippingMethod || "",
          shippingMethod: ls.shippingMethod || ls.shipping_method || "",
          items: ls.items || ls.lineItems || [],
          customItemCount: ls.itemCount ?? ls.items?.length ?? 0,
        };
      });
    }

    list.sort((a: any, b: any) => {
      const timeA = new Date(
        a.createdAt || a.created_at || a.invoiceDate || a.date_created || 0,
      ).getTime();
      const timeB = new Date(
        b.createdAt || b.created_at || b.invoiceDate || b.date_created || 0,
      ).getTime();
      return timeB - timeA;
    });

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter((item: any) => {
        if (activeInvTab === "auftrag" || activeInvTab === "bestellung") {
          return (
            String(item.order_no).toLowerCase().includes(s) ||
            String(item.customer_name || "")
              .toLowerCase()
              .includes(s) ||
            (item.comment || "").toLowerCase().includes(s)
          );
        }
        return (
          String(item.invoiceNumber || item.id)
            .toLowerCase()
            .includes(s) ||
          String(item.bill_to || "")
            .toLowerCase()
            .includes(s) ||
          String(item.ship_to || "")
            .toLowerCase()
            .includes(s)
        );
      });
    }

    const {
      documentNo,
      customerNo,
      customerName,
      valueOperator,
      valueAmount,
      status,
      datePreset,
      dateFrom,
      dateTo,
    } = docFilters;

    return list.filter((item: any) => {
      if (documentNo.trim()) {
        const s = documentNo.toLowerCase().trim();
        const docNo = String(
          item.order_no || item.invoiceNumber || item.id || "",
        ).toLowerCase();
        if (!docNo.includes(s)) return false;
      }
      if (customerNo.trim()) {
        const s = customerNo.toLowerCase().trim();
        const cNo = String(
          item.customer?.customerNumber ||
            item.customer?.id ||
            item.customer_id ||
            item.customerSnapshot?.customerNumber ||
            item.customerSnapshot?.id ||
            "",
        ).toLowerCase();
        if (!cNo.includes(s)) return false;
      }
      if (customerName.trim()) {
        const s = customerName.toLowerCase().trim();
        const cName = String(
          item.customer?.companyName ||
            item.customer_name ||
            item.bill_to ||
            item.ship_to ||
            item.customerSnapshot?.companyName ||
            item.customerSnapshot?.name ||
            "",
        ).toLowerCase();
        if (!cName.includes(s)) return false;
      }
      if (valueAmount.trim()) {
        let val = 0;
        if (activeInvTab === "auftrag" || activeInvTab === "bestellung") {
          val = (item.items || []).reduce(
            (sum: number, it: any) =>
              sum + Number(it.price || 0) * Number(it.qty || 0),
            0,
          );
        } else {
          val = Number(item.netTotal || item.grossTotal || 0);
        }
        if (!isValueMatching(val, valueOperator, valueAmount)) return false;
      }
      if (status) {
        // Auftrag rows are keyed by the delivery lifecycle
        // (open/partially_delivered/delivered/closed) via auftrag_status;
        // Rechnung rows are keyed by the derived payment lifecycle
        // (paid/partially_paid/unpaid/overdue) via payment_status. Neither
        // matches the generic `status` field other document types use —
        // match against the right field per tab.
        const itemStatus =
          activeInvTab === "auftrag"
            ? String(item.auftrag_status || item.status || "open").toLowerCase()
            : activeInvTab === "rechnung"
              ? String(item.payment_status || "unpaid").toLowerCase()
              : String(item.status || "").toLowerCase();
        if (itemStatus !== status.toLowerCase()) return false;
      }
      if (datePreset && datePreset !== "all") {
        const docDate =
          item.createdAt ||
          item.created_at ||
          item.date_created ||
          item.invoiceDate;
        if (!isDateInPreset(docDate, datePreset, dateFrom, dateTo))
          return false;
      }
      return true;
    });
  }, [
    activeInvTab,
    tabData.orders,
    tabData.customerOrders,
    tabData.bestellungen,
    tabData.rechnungen,
    tabData.rechnungenK,
    tabData.paymentInbounds,
    tabData.lieferscheine,
    searchTerm,
    docFilters,
  ]);

  // Auftrag rows must be ordered by status (partially_delivered -> open ->
  // delivered -> closed) BEFORE pagination — sorting an already-paginated
  // page slice (the previous behavior) only reordered the ~10 items on
  // that page and left which items landed on which page decided by
  // whatever filteredItems was ordered by before (date), so e.g. a
  // partially_delivered Auftrag could sit on page 3 while closed ones
  // showed on page 1. displayItems is the same items, just reordered —
  // count never changes here, only order.
  const displayItems = useMemo(() => {
    if (activeInvTab !== "auftrag") return filteredItems;
    return sortAuftraegeByStatus(filteredItems);
  }, [filteredItems, activeInvTab]);

  const totalPages = Math.ceil(displayItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = displayItems.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, docFilters, activeInvTab]);

  const legacyInvoices = useMemo(() => [], []);

  const handleDuplicateAuftrag = async (row: any) => {
    try {
      const res = await duplicateCustomerOrder(row.id);
      if (res?.success) {
        toast.success(
          res.message ||
            `Auftrag duplicated successfully as ${res.data?.order_no || ""}`,
          successStyles,
        );
        await tabData.refetchOrders();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate Auftrag", errorStyles);
    }
  };

  const commercialColumns: ColumnDef<any>[] = useMemo(() => {
    switch (activeInvTab) {
      case "auftrag":
        return buildAuftragColumns({
          expandedDocIds,
          setExpandedDocIds,
          onOpenAuftragPreview: handleOpenAuftragPreview,
          onConvertToBestellung: handleDirectConvertAuftragToBestellung,
          onGenerateRechnung: (row: any) => {
            setSelectedAuftragForRechnungModal(row);
            setShowAuftragToRechnungModal(true);
          },
          onRechnungOhneAusliefern: (row: any) => {
            setSelectedAuftragForRechnungOhneAusliefernModal(row);
            setShowRechnungOhneAusliefernModal(true);
          },

          onDuplicateAuftrag: handleDuplicateAuftrag,
          invoices: legacyInvoices,
        });
      case "bestellung":
        return buildBestellungColumns({
          expandedDocIds,
          setExpandedDocIds,
          onOpenBestellungPreview: handleOpenBestellungPreview,
          onMarkProcessing: (id: any) =>
            handleUpdateBestellungStatus(id, "to be processed"),
          gtechHkDisplayName,
        });
      case "rechnung":
        return buildRechnungColumns({
          expandedDocIds,
          setExpandedDocIds,
          onCreateRechnungK: handleCreateRechnungK,
          creatingRkForId,
          onViewRechnung: handleOpenRechnungView,
          allOpenQuantities,
          rechnungenK: tabData.rechnungenK,
        });

      // 7. In the "rk" case, drop onDelete:
      case "rk":
        return buildRkColumns({
          expandedDocIds,
          setExpandedDocIds,
          onView: handleOpenRechnungKDetail,
        });
      case "lieferschein":
        return buildLieferscheinColumns({
          expandedDocIds,
          setExpandedDocIds,
          onView: (row: any) => {
            setSelectedLieferscheinForDetail(row);
            setShowLieferscheinDetailModal(true);
          },
        });
      case "payment_inbound":
        return buildPaymentInboundColumns({
          onOpenDetails: (row: any) => {
            setSelectedInboundForAssign(row);
            tabData.ensureLoaded("auftrag");
            tabData.ensureLoaded("rechnung");
            setShowAssignInboundModal(true);
          },
          onAssign: (row: any) => {
            setSelectedInboundForAssign(row);
            tabData.ensureLoaded("auftrag");
            tabData.ensureLoaded("rechnung");
            setShowAssignInboundModal(true);
          },
          onDelete: async (row: any) => {
            if (
              confirm(
                "Are you sure you want to delete this payment inbound record?",
              )
            ) {
              await deletePaymentInbound(row.id);
              tabData.refetchPaymentInbounds();
            }
          },
        });
      default:
        return [];
    }
  }, [activeInvTab, expandedDocIds, creatingRkForId, legacyInvoices, tabData]);

  const dataTableLoading =
    activeInvTab === "payment_inbound"
      ? tabData.loadingPaymentInbounds
      : activeInvTab === "rechnung"
        ? tabData.loadingRechnungen
        : activeInvTab === "rk"
          ? tabData.loadingRechnungenK
          : activeInvTab === "auftrag" || activeInvTab === "bestellung"
            ? tabData.loadingOrders
            : activeInvTab === "lieferschein"
              ? tabData.loadingCustomers
              : false;

  return (
    <div className="w-full mx-auto font-['Poppins']">
      <div
        className="bg-white min-h-[80vh] rounded-lg shadow-sm pb-8 p-6"
        style={{
          border: "1px solid #e0e0e0",
          background: "linear-gradient(to bottom, #ffffff, #f9f9f9)",
        }}
      >
        {searchParams.get("filter") &&
          searchParams.get("hide_banner") !== "true" && (
            <div className="mb-6 px-5 py-3 bg-[#FFF3CD] border border-[#FFEBA2] rounded-md text-[#856404] flex items-center justify-between text-sm shadow-sm animate-pulse">
              <div className="flex items-center gap-2">
                <span className="font-bold">
                  ⚠️ Reports & Control Health Audit View Active:
                </span>
                <span className="font-semibold text-gray-800">
                  {(() => {
                    switch (searchParams.get("filter")) {
                      case "unassigned_cargo":
                        return "Orders unassigned to cargo";
                      case "rmb_special_no_value":
                        return "RMB Special SET with no value";
                      case "eur_special_no_value":
                        return "EUR Special SET with no value";
                      case "dimension_special_no_value":
                        return "Dimension Special SET with no value";
                      default:
                        return searchParams.get("filter");
                    }
                  })()}
                </span>
              </div>
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("filter");
                  window.location.href = `/invoices?${params.toString()}`;
                }}
                className="px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded text-xs font-bold transition-all"
              >
                Clear Audit Filter
              </button>
            </div>
          )}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <PageHeader title="Commercial" icon={DollarSign} />
          </div>
          <div className="flex items-center gap-3">
            {activeInvTab === "angebot" && (
              <CustomButton
                onClick={() => handleOpenOfferModal(null)}
                gradient
                size="small"
                startIcon={<Plus className="h-4 w-4" />}
              >
                Angebot
              </CustomButton>
            )}
            {(activeInvTab === "auftrag" || activeInvTab === "bestellung") && (
              <CustomButton
                onClick={() => {
                  if (activeInvTab === "auftrag")
                    setShowAuftragCreateModal(true);
                  else setShowCreateBestellungModal(true);
                }}
                gradient
                size="small"
                startIcon={<Plus className="h-4 w-4" />}
              >
                {activeInvTab === "bestellung" ? "Bestellung" : "Auftrag"}
              </CustomButton>
            )}
            {activeInvTab === "payment_inbound" && (
              <CustomButton
                onClick={() => {
                  setInboundForm({
                    paymentAccountId: paymentAccounts[0]?.id || "",
                    receivedDate: new Date().toISOString().split("T")[0],
                    amount: "",
                    currencyCode: "EUR",
                    payerName: "",
                    reference: "",
                  });
                  setShowInboundModal(true);
                }}
                gradient
                size="small"
                startIcon={<Plus className="h-4 w-4" />}
              >
                Zahlungen{" "}
              </CustomButton>
            )}
          </div>
        </div>
        <div className="flex overflow-x-auto mb-6 border-b border-gray-100 pb-px">
          {invoiceTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveInvTab(tab.id);
                setCurrentPage(1);
              }}
              className={`px-6 py-3.5 text-sm font-semibold transition-all relative whitespace-nowrap -mb-px ${
                activeInvTab === tab.id
                  ? "text-[#8CC21B] border-b-2 border-[#8CC21B]"
                  : "text-gray-500 hover:text-gray-900 border-b-2 border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <CommercialFilterBar
          activeInvTab={activeInvTab}
          docFilters={docFilters}
          setDocFilters={setDocFilters}
          isAnyFilterActive={isAnyFilterActive}
          onReset={() => {
            setDocFilters(initialCommercialFilters);
            setSearchTerm("");
          }}
        />

        {activeInvTab === "angebot" && (
          <OffersPage
            embedded={true}
            docFilters={docFilters}
            onOrderConverted={tabData.refetchOrders}
            refreshTrigger={offerRefreshKey}
            onAuftragCreated={(auftragId: string | number) => {
              setActiveInvTab("auftrag");
              handleOpenAuftragPreview(auftragId);
            }}
            onSwitchToAuftrag={(auftragId: string | number) => {
              setActiveInvTab("auftrag");
              setTimeout(() => {
                handleOpenAuftragPreview(auftragId);
              }, 100);
            }}
          />
        )}
        {activeInvTab !== "angebot" && (
          <div className="mb-6">
            <DataTable
              data={currentItems}
              columns={commercialColumns}
              loading={dataTableLoading}
              summaryCount={displayItems.length}
              summaryTotal={displayItems.reduce((sum: number, item: any) => {
                let amt = 0;
                const shipping = Number(
                  item.shippingCost ||
                    item.shipping_cost ||
                    item.freightCost ||
                    item.freight_cost ||
                    0,
                );

                if (
                  (activeInvTab as string) === "payment_inbound" ||
                  (activeInvTab as string) === "payments"
                ) {
                  amt = Number(item.amount || item.total || 0);
                } else if (item.subtotal !== undefined && item.subtotal !== null) {
                  amt = Number(item.subtotal) + shipping;
                } else if (item.sub_total !== undefined && item.sub_total !== null) {
                  amt = Number(item.sub_total) + shipping;
                } else if (
                  item.netTotal !== undefined &&
                  item.netTotal !== null &&
                  Number(item.netTotal) > 0
                ) {
                  amt = Number(item.netTotal);
                } else if (
                  item.net_total !== undefined &&
                  item.net_total !== null &&
                  Number(item.net_total) > 0
                ) {
                  amt = Number(item.net_total);
                } else if (
                  item.netAmount !== undefined &&
                  item.netAmount !== null &&
                  Number(item.netAmount) > 0
                ) {
                  amt = Number(item.netAmount);
                } else if (
                  Array.isArray(item.items || item.orderItems || item.lineItems) &&
                  (item.items || item.orderItems || item.lineItems).length > 0
                ) {
                  const lineItems =
                    item.items || item.orderItems || item.lineItems;
                  amt =
                    lineItems.reduce((acc: number, it: any) => {
                      const p = Number(
                        it.price ||
                          it.sales_price ||
                          it.unit_price ||
                          it.net_price ||
                          0,
                      );
                      const q = Number(it.quantity || it.qty || 1);
                      return acc + p * q;
                    }, 0) + shipping;
                } else {
                  const gross = Number(
                    item.total_amount ||
                      item.totalAmount ||
                      item.total ||
                      item.grossTotal ||
                      0,
                  );
                  const taxRate = Number(item.tax_rate || item.taxRate || 19);
                  amt = gross > 0 ? gross / (1 + taxRate / 100) : 0;
                }
                return sum + (isNaN(amt) ? 0 : amt);
              }, 0)}
              emptyMessage={(() => {
                switch (activeInvTab) {
                  case "auftrag":
                    return "Keinen Auftrag gefunden";
                  case "bestellung":
                    return "Keine Bestellung gefunden";
                  case "rechnung":
                    return "Keine Rechnung gefunden";
                  case "rk":
                    return "Keine RK gefunden";
                  case "payment_inbound":
                    return "Keine Zahlung gefunden";
                  case "lieferschein":
                    return "Keinen Lieferschein gefunden";
                  default:
                    return "Kein Angebot gefunden";
                }
              })()}
              getRowClassName={(row) => {
                if (
                  activeInvTab === "auftrag" ||
                  activeInvTab === "bestellung"
                ) {
                  const isExpress = (row.comment || "")
                    .toLowerCase()
                    .includes("express");
                  return isExpress ? "bg-red-50" : "";
                }
                return "";
              }}
              getRowStyle={(row: any) => {

                // A manually chosen highlight_color (SystemColourSelect on
                // the order) always wins over the automatic status colour
                // below — it's an explicit per-order choice.
                const customVal = row.highlight_color || row.highlightColor;
                const hasCustomColor =
                  !!customVal &&
                  customVal !== "#FFFFFF" &&
                  customVal !== "#ffffff";

                let hex: string | undefined;
                if (hasCustomColor) {
                  hex = customVal;
                  if (!hex!.startsWith("#")) {
                    const matched = systemColours.find(
                      (c: any) => c.name?.toLowerCase() === hex!.toLowerCase(),
                    );
                    if (matched) hex = matched.hex;
                  }
                } else if (activeInvTab === "auftrag") {
                  // No manual override — fall back to the status-driven
                  // background: partially delivered / open / delivered /
                  // closed, matching the Auftrag sort order above.
                  const status = row.auftrag_status || row.status || "open";
                  const statusColor = getStatusBackgroundColor(status);
                  if (statusColor && statusColor !== "#FFFFFF") {
                    hex = statusColor;
                  }
                } else if (activeInvTab === "rechnung") {
                  // No manual override — fall back to the derived payment
                  // status: overdue / partially paid / unpaid / paid.
                  const paymentStatus = row.payment_status || "unpaid";
                  const statusColor =
                    getRechnungStatusBackgroundColor(paymentStatus);
                  if (statusColor && statusColor !== "#FFFFFF") {
                    hex = statusColor;
                  }
                }

                if (!hex || !hex.startsWith("#")) return undefined;

                const cleanHex = hex.replace("#", "");
                let textColor = undefined;
                if (cleanHex.length === 6) {
                  const r = parseInt(cleanHex.substring(0, 2), 16);
                  const g = parseInt(cleanHex.substring(2, 4), 16);
                  const b = parseInt(cleanHex.substring(4, 6), 16);
                  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
                  textColor = yiq >= 128 ? "#111827" : "#FFFFFF";
                }
                return { backgroundColor: hex, color: textColor };
              }}
              onRowClick={(row) => {
                if (activeInvTab === "auftrag")
                  handleOpenAuftragPreview(row.id);
                else if (activeInvTab === "bestellung")
                  handleOpenBestellungPreview(row.id);
                else if (activeInvTab === "rechnung") {
                  setSelectedRechnungForDetail(row);
                  setShowRechnungDetailModal(true);
                  const rowOpenQuantities = allOpenQuantities[row.id] || {};
                  setOpenQuantities(rowOpenQuantities);
                } else if (activeInvTab === "rk") {
                  handleOpenRechnungKDetail(row);
                } else if (activeInvTab === "lieferschein") {
                  setSelectedLieferscheinForDetail(row);
                  setShowLieferscheinDetailModal(true);
                } else if (activeInvTab === "payment_inbound" || activeInvTab === "payments") {
                  setSelectedInboundForAssign(row);
                  tabData.ensureLoaded("auftrag");
                  tabData.ensureLoaded("rechnung");
                  setShowAssignInboundModal(true);
                } else {
                  handleOpenInvoiceDetails(row);
                }
              }}
              expandedRowIds={expandedDocIds}
              renderRowDetails={(row) => {
                const lineItems =
                  row.items || row.lineItems || row.orderItems || [];
                const currency = row.currency || "EUR";
                return (
                  <CommercialLineItemsSubTable
                    items={lineItems}
                    currency={currency}
                    docType={activeInvTab}
                    shippingMethod={row.shipping_method || row.shippingMethod}
                    shippingCost={row.shipping_cost ?? row.shippingCost}
                    shippingQuantity={
                      row.shipping_quantity ?? row.shippingQuantity ?? 1
                    }
                    taxRate={row.tax_rate ?? row.taxRate}
                  />
                );
              }}
            />

            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-[#E9ECEF] bg-[#F8F9FA] rounded-b-[4px] mt-4">
                <div className="text-[11px] font-medium text-[#6C757D]">
                  Showing {startIndex + 1} to{" "}
                  {Math.min(endIndex, displayItems.length)} of{" "}
                  {displayItems.length} documents
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-[4px] border border-[#DEE2E6] bg-white disabled:opacity-30 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-[#495057]" />
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`min-w-[28px] h-7 text-[11px] font-bold rounded-[4px] border transition-all ${
                        currentPage === i + 1
                          ? "bg-[#8CC21B] text-white border-[#8CC21B] shadow-md"
                          : "bg-white text-[#495057] border-[#DEE2E6] hover:bg-gray-50"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-[4px] border border-[#DEE2E6] bg-white disabled:opacity-30 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-[#495057]" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        <InvoiceDetailsModal
          isOpen={showInvoiceDetailsModal}
          onClose={() => setShowInvoiceDetailsModal(false)}
          selectedInvoice={selectedInvoice}
          activeInvTab={activeInvTab}
          actionLoading={actionLoading}
          setActionLoading={setActionLoading}
          modalActiveTab={modalActiveTab}
          setModalActiveTab={setModalActiveTab}
          expandedStates={expandedStates}
          invoiceEditForm={invoiceEditForm}
          setInvoiceEditForm={setInvoiceEditForm}
          onMarkAsPaid={handleMarkAsPaid}
          onSaveInvoiceEdit={handleSaveInvoiceEdit}
          onDownloadPdf={handleDownloadInvoicePdf}
          expandedPriceItemId={expandedPriceItemId}
          setExpandedPriceItemId={setExpandedPriceItemId}
          editingPrice={editingPrice}
          setEditingPrice={setEditingPrice}
          onSetPrice={handleSetPrice}
          onOpenQtyModal={(item: any) => {
            setSelectedItem(item);
            setNewQty(item.qty_label || item.qty);
            setQtyRemarks(item.remarks_cn || "");
            setShowQTYModal(true);
          }}
          onOpenSplitModal={(item: any) => {
            setSelectedItem(item);
            setSplitQty(Math.floor(item.qty * 0.5));
            setTargetCargoId("");
            setSplitRemarks(item.remarks_cn || "");
            setShowSPModal(true);
          }}
          onOpenReassignModal={(item: any) => {
            setSelectedItem(item);
            setTargetCargoId(item.cargo_id || "");
            setShowREModal(true);
          }}
          onOpenTaricModal={(group: any) => {
            setSelectedTaricGroup(group);
            setSelectedTaricCode("");
            setShowTaricModal(true);
          }}
        />
        <ReassignModal
          isOpen={showREModal}
          onClose={() => setShowREModal(false)}
          selectedItem={selectedItem}
          cargos={cargos}
          targetCargoId={targetCargoId}
          setTargetCargoId={setTargetCargoId}
          onConfirm={handleReassignItem}
          onCargoCreated={(newCargo) => setCargos((prev) => [...prev, newCargo])}
        />
        <SplitModal
          isOpen={showSPModal}
          onClose={() => setShowSPModal(false)}
          selectedItem={selectedItem}
          cargos={cargos}
          splitQty={splitQty}
          setSplitQty={setSplitQty}
          targetCargoId={targetCargoId}
          setTargetCargoId={setTargetCargoId}
          splitRemarks={splitRemarks}
          setSplitRemarks={setSplitRemarks}
          onConfirm={handleSplitItem}
        />
        <TaricModal
          isOpen={showTaricModal}
          onClose={() => setShowTaricModal(false)}
          selectedTaricGroup={selectedTaricGroup}
          tarics={tarics}
          selectedTaricCode={selectedTaricCode}
          setSelectedTaricCode={setSelectedTaricCode}
          onConfirm={() => handleSetTaric(selectedTaricGroup)}
        />
        <QtyModal
          isOpen={showQTYModal}
          onClose={() => setShowQTYModal(false)}
          selectedItem={selectedItem}
          newQty={newQty}
          setNewQty={setNewQty}
          qtyRemarks={qtyRemarks}
          setQtyRemarks={setQtyRemarks}
          onConfirm={handleUpdateQty}
        />
        {showBTSTModal && (
          <CustomModal
            isOpen={showBTSTModal}
            onClose={() => setShowBTSTModal(false)}
            title="Update Bill To / Ship To Details"
            width="max-w-5xl"
            footer={
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowBTSTModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-[4px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBTST}
                  className="px-6 py-2 text-sm bg-[#8CC21B] text-white rounded-[4px] hover:bg-opacity-90 font-bold transition-all shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            }
          >
            <BillToShipToForm
              data={btstFormData}
              isEditEnabled={true}
              selectedCustomer={selectedCustomerForEdit}
              onChange={(field, value) =>
                setBtstFormData((prev: any) => ({ ...prev, [field]: value }))
              }
              onBatchChange={(updates) =>
                setBtstFormData((prev: any) => ({ ...prev, ...updates }))
              }
            />
          </CustomModal>
        )}
        <OrderDetailsModal
          isOpen={showViewModal}
          onClose={closeView}
          viewOrder={viewOrder}
          viewItems={viewItems}
          getCategoryName={getCategoryName}
          getSupplierName={getSupplierName}
        />
        <OrderFormModal
          isOpen={showModal}
          onClose={closeModal}
          mode={mode}
          categories={tabData.categories}
          suppliers={tabData.suppliers}
          form={form}
          onCategoryChange={handleCategoryChange}
          onSupplierChange={handleSupplierChange}
          onCommentChange={(comment: any) =>
            setForm((prev: any) => ({ ...prev, comment }))
          }
          effectiveItems={effectiveItems}
          selectedItemId={selectedItemId}
          setSelectedItemId={setSelectedItemId}
          onAddItem={handleAddItemToOrder}
          loadingItems={loadingItems}
          orderItems={orderItems}
          onUpdateOrderItemQty={handleUpdateOrderItemQty}
          onUpdateOrderItemRemark={handleUpdateOrderItemRemark}
          onRemoveOrderItem={handleRemoveOrderItem}
          onReorderOrderItem={handleReorderOrderItem}
          onSubmit={mode === "edit" ? handleUpdateOrder : handleCreateOrder}
        />

        {showOfferModal && (
          <OfferDetailModalLazy
            isOpen={showOfferModal}
            offerId={selectedOfferId}
            onClose={() => {
              setShowOfferModal(false);
              setSelectedOfferId(null);
              setOfferRefreshKey((prev: any) => prev + 1);
            }}
            onChanged={() => {
              tabData.refetchOffers();
              setOfferRefreshKey((prev: any) => prev + 1);
            }}
            userRole={user?.role}
            onSwitchToAuftrag={(auftragId: string | number) => {
              setActiveInvTab("auftrag");
              setTimeout(() => {
                handleOpenAuftragPreview(auftragId);
              }, 100);
            }}
          />
        )}
        {showAuftragToBestellungModal && (
          <AuftragToBestellungModal
            isOpen={showAuftragToBestellungModal}
            onClose={() => {
              setShowAuftragToBestellungModal(false);
              setSelectedAuftragForBestellungModal(null);
            }}
            auftrag={selectedAuftragForBestellungModal}
            onSuccess={() => {
              tabData.refetchOrders();
              tabData.refetchBestellungen();
            }}
          />
        )}
        {showAuftragCreateModal && (
          <AuftragCreateModal
            isOpen={showAuftragCreateModal}
            onClose={() => setShowAuftragCreateModal(false)}
            onSuccess={() => tabData.refetchOrders()}
          />
        )}

        {showAuftragPreviewModal && (
          <AuftragPreviewModal
            isOpen={showAuftragPreviewModal}
            orderId={selectedAuftragId}
            initialEdit={auftragPreviewInitialEdit}
            onClose={() => {
              setShowAuftragPreviewModal(false);
              setSelectedAuftragId(null);
              setAuftragPreviewInitialEdit(false);
            }}
            onChanged={() => tabData.refetchOrders()}
            userRole={user?.role}
            onSwitchToOffer={(offerId: string) => {
              handleOpenOfferModal(offerId);
            }}
            onSwitchToBestellung={(bestellungId: string | number) => {
              setActiveInvTab("bestellung");
              setTimeout(() => {
                handleOpenBestellungPreview(bestellungId);
              }, 100);
            }}
            onSwitchToRechnung={(rechnungId: string) => {
              setActiveInvTab("rechnung");
              tabData.ensureLoaded("rechnung");
              setTimeout(() => {
                const found = (tabData.rechnungen || []).find(
                  (r: any) => r.id === rechnungId,
                );
                if (found) {
                  setSelectedRechnungForDetail(found);
                  setShowRechnungDetailModal(true);
                  setOpenQuantities(allOpenQuantities[found.id] || {});
                } else {
                  console.warn(
                    "Couldn't find Rechnung in loaded tab data:",
                    rechnungId,
                  );
                }
              }, 300);
            }}
            onSwitchToRechnungK={(rechnungKId: string) => {
              handleOpenRechnungKDetail({ id: rechnungKId });
            }}
          />
        )}
        {showBestellungPreviewModal && selectedBestellungId && (
          <BestellungPreviewModal
            isOpen={showBestellungPreviewModal}
            orderId={selectedBestellungId}
            isCreate={false}
            initialEdit={bestellungPreviewInitialEdit}
            onClose={() => {
              setShowBestellungPreviewModal(false);
              setSelectedBestellungId(null);
              setBestellungPreviewInitialEdit(false);
            }}
            onChanged={() => tabData.refetchBestellungen()}
            userRole={user?.role}
          />
        )}
        {showAuftragToRechnungModal && (
          <AuftragToRechnungModal
            isOpen={showAuftragToRechnungModal}
            onClose={() => {
              setShowAuftragToRechnungModal(false);
              setSelectedAuftragForRechnungModal(null);
            }}
            auftrag={selectedAuftragForRechnungModal}
            onSuccess={() => {
              tabData.refetchOrders();
              tabData.refetchRechnungen();
              tabData.refetchLieferscheine();
            }}
            onEditAuftrag={(auftragToEdit: any) => {
              setShowAuftragToRechnungModal(false);
              setSelectedAuftragForRechnungModal(null);
              handleOpenAuftragPreview(auftragToEdit.id, true);
            }}
          />
        )}
        {showRechnungOhneAusliefernModal &&
          selectedAuftragForRechnungOhneAusliefernModal && (
            <RechnungOhneAusliefernModal
              isOpen={showRechnungOhneAusliefernModal}
              onClose={() => {
                setShowRechnungOhneAusliefernModal(false);
                setSelectedAuftragForRechnungOhneAusliefernModal(null);
              }}
              auftrag={selectedAuftragForRechnungOhneAusliefernModal}
              onSuccess={() => {
                tabData.refetchOrders();
                tabData.refetchRechnungen();
              }}
            />
          )}
        {showInboundModal && (
          <CustomModal
            isOpen={showInboundModal}
            onClose={() => setShowInboundModal(false)}
            title="Manual Payment Inbound Entry"
            width="max-w-lg"
          >
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!inboundForm.amount || Number(inboundForm.amount) <= 0) {
                  toast.error("Please enter a valid amount > 0");
                  return;
                }
                try {
                  setSubmittingInbound(true);
                  const res = await createPaymentInbound({
                    payment_account_id:
                      inboundForm.paymentAccountId || undefined,
                    received_date: inboundForm.receivedDate,
                    amount: Number(inboundForm.amount),
                    currency_code: inboundForm.currencyCode || "EUR",
                    payer_name: inboundForm.payerName,
                    reference: inboundForm.reference,
                    source: "manual",
                  });
                  if (res?.success) {
                    setShowInboundModal(false);
                    tabData.refetchPaymentInbounds();
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  setSubmittingInbound(false);
                }
              }}
              className="space-y-4 font-poppins"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Payment Account
                </label>
                <select
                  value={inboundForm.paymentAccountId}
                  onChange={(e) =>
                    setInboundForm((prev) => ({
                      ...prev,
                      paymentAccountId: e.target.value,
                    }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white font-medium"
                >
                  <option value="">-- Select Account (Optional) --</option>
                  {paymentAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency_code || "EUR"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Received Date *
                  </label>
                  <input
                    type="date"
                    value={inboundForm.receivedDate}
                    onChange={(e) =>
                      setInboundForm((prev) => ({
                        ...prev,
                        receivedDate: e.target.value,
                      }))
                    }
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={inboundForm.amount}
                    onChange={(e) =>
                      setInboundForm((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    placeholder="0.00"
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Currency Code
                  </label>
                  <input
                    type="text"
                    value={inboundForm.currencyCode}
                    onChange={(e) =>
                      setInboundForm((prev) => ({
                        ...prev,
                        currencyCode: e.target.value,
                      }))
                    }
                    placeholder="EUR"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white uppercase font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                    Payer Name
                  </label>
                  <input
                    type="text"
                    value={inboundForm.payerName}
                    onChange={(e) =>
                      setInboundForm((prev) => ({
                        ...prev,
                        payerName: e.target.value,
                      }))
                    }
                    placeholder="e.g. Customer GmbH"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Reference (Invoice No / Memo)
                </label>
                <input
                  type="text"
                  value={inboundForm.reference}
                  onChange={(e) =>
                    setInboundForm((prev) => ({
                      ...prev,
                      reference: e.target.value,
                    }))
                  }
                  placeholder="e.g. R2608-10 / INV-2026-001"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] bg-white font-medium"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowInboundModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInbound}
                  className="flex-1 px-4 py-2.5 bg-[#8CC21B] hover:bg-[#7ab318] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  Save Inbound
                </button>
              </div>
            </form>
          </CustomModal>
        )}
        {showAssignInboundModal && selectedInboundForAssign && (
          <PaymentInboundAssignModal
            isOpen={showAssignInboundModal}
            onClose={() => {
              setShowAssignInboundModal(false);
              setSelectedInboundForAssign(null);
            }}
            paymentInbound={selectedInboundForAssign}
            auftraege={tabData.customerOrders || []}
            rechnungen={tabData.rechnungen || []}
            onSuccess={() => {
              tabData.refetchPaymentInbounds();
            }}
          />
        )}
        {showCreateBestellungModal && (
          <BestellungPreviewModal
            isOpen={showCreateBestellungModal}
            isCreate={true}
            onClose={() => setShowCreateBestellungModal(false)}
            onChanged={() => tabData.refetchBestellungen()}
            onCreated={(id: any) => {
              setShowCreateBestellungModal(false);
              handleOpenBestellungPreview(id);
            }}
            userRole={user?.role}
          />
        )}

        {showRechnungDetailModal && selectedRechnungForDetail && (
          <RechnungDetailModal
            isOpen={showRechnungDetailModal}
            onClose={() => {
              setShowRechnungDetailModal(false);
              setSelectedRechnungForDetail(null);
              setOpenQuantities({});
            }}
            rechnung={selectedRechnungForDetail}
            isCorrection={false}
            mode={rechnungModalMode}
            openQuantities={openQuantities}
            onChanged={() => tabData.refetchRechnungen()}
            onCorrectionCreated={async () => {
              await tabData.refetchRechnungenK();
              await tabData.refetchRechnungen();
              try {
                const rksRes: any = await getAllRechnungenK();
                if (rksRes?.success && rksRes.data.length > 0) {
                  const latestRK = rksRes.data[0];
                  if (latestRK) {
                    const detailRes: any = await getRechnungKById(latestRK.id);
                    if (detailRes?.success) {
                      setSelectedRechnungKData(detailRes.data);
                      setShowRechnungKModal(true);
                    }
                  }
                }
              } catch (error) {
                console.error("Failed to fetch latest RK:", error);
              }
            }}
            onSwitchTab={(tab) => setActiveInvTab(tab as InvoiceTab)}
            onSwitchToAuftrag={(auftragId: string | number) => {
              setActiveInvTab("auftrag");
              setTimeout(() => handleOpenAuftragPreview(auftragId), 100);
            }}
            onSwitchToRechnungK={(rechnungKId: string) => {
              handleOpenRechnungKDetail({ id: rechnungKId });
            }}
          />
        )}

        {showRechnungKModal && selectedRechnungKData && (
          <RechnungDetailModal
            isOpen={showRechnungKModal}
            onClose={() => {
              setShowRechnungKModal(false);
              setSelectedRechnungKData(null);
            }}
            rechnung={selectedRechnungKData}
            isCorrection={true}
            onChanged={() => {
              tabData.refetchRechnungenK();
              tabData.refetchRechnungen();
            }}
            onSwitchToAuftrag={(auftragId: string | number) => {
              setActiveInvTab("auftrag");
              setTimeout(() => handleOpenAuftragPreview(auftragId), 100);
            }}
            onSwitchToRechnung={(rechnungId: string) => {
              handleOpenRechnungKDetail; // not used here
              const found = (tabData.rechnungen || []).find(
                (r: any) => r.id === rechnungId,
              );
              if (found) {
                setSelectedRechnungForDetail(found);
                setShowRechnungDetailModal(true);
                setOpenQuantities(allOpenQuantities[found.id] || {});
              } else {
                console.warn(
                  "Couldn't find Rechnung in loaded tab data:",
                  rechnungId,
                );
              }
            }}
          />
        )}
        {showLieferscheinDetailModal && selectedLieferscheinForDetail && (
          <LieferscheinDetailModal
            isOpen={showLieferscheinDetailModal}
            onClose={() => {
              setShowLieferscheinDetailModal(false);
              setSelectedLieferscheinForDetail(null);
            }}
            lieferschein={selectedLieferscheinForDetail}
          />
        )}
      </div>
    </div>
  );
};
const InvoiceListPageWrapper: React.FC = () => (
  <Suspense
    fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}
  >
    <InvoiceListPage />
  </Suspense>
);
export default InvoiceListPageWrapper;

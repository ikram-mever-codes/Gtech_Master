"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAllOrders } from "@/api/orders";
import { getAllCustomerOrders } from "@/api/customer_orders";
import { getAllOffers } from "@/api/offers";
import { getAllTransferOrders } from "@/api/transfer_orders";
import { getAllRechnungen, getLieferscheine } from "@/api/rechnungen";
import { getAllPaymentInbounds } from "@/api/payment_inbounds";
import {
  getAllCustomers,
  CustomerData as APICustomerData,
} from "@/api/customers";
import { getCategories } from "@/api/categories";
import { getAllSuppliers } from "@/api/suppliers";
import { getItems } from "@/api/items";

/**
 * Root cause of the slow first paint: the old page fetched every tab's data
 * unconditionally on mount (orders, offers, suppliers, categories,
 * bestellungen, cargos, tarics, payment inbounds/accounts) no matter which
 * tab was actually open.
 *
 * This hook fetches a tab's data only the first time that tab becomes
 * active, then caches it in memory for the life of the page — switching
 * tabs back and forth after that is instant with no refetch. Call
 * `ensureLoaded(tab)` whenever `activeInvTab` changes; call the returned
 * `refetch<Name>` functions after a mutation the same way the old page
 * called `fetchOrders()` / `fetchBestellungen()` etc.
 */

export type InvoiceTab =
  | "angebot"
  | "auftrag"
  | "bestellung"
  | "rechnung"
  | "payment_inbound"
  | "rk"
  | "lieferschein";

export function useCommercialTabData() {
  const [orders, setOrders] = useState<any[]>([]);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [offers, setOffers] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);

  const [bestellungen, setBestellungen] = useState<any[]>([]);
  const [loadingBestellungen, setLoadingBestellungen] = useState(false);

  const [rechnungen, setRechnungen] = useState<any[]>([]);
  const [loadingRechnungen, setLoadingRechnungen] = useState(false);

  const [lieferscheine, setLieferscheine] = useState<any[]>([]);
  const [loadingLieferscheine, setLoadingLieferscheine] = useState(false);

  const [paymentInbounds, setPaymentInbounds] = useState<any[]>([]);
  const [loadingPaymentInbounds, setLoadingPaymentInbounds] = useState(false);

  const [customers, setCustomers] = useState<APICustomerData[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [itemsAll, setItemsAll] = useState<any[]>([]);
  const [loadingItemsAll, setLoadingItemsAll] = useState(false);

  // Tracks which datasets have already been fetched at least once so
  // ensureLoaded() never issues a duplicate request for a tab you've
  // already visited.
  const loadedRef = useRef<Set<string>>(new Set());

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const [resOrders, resCustomerOrders]: any = await Promise.all([
        getAllOrders().catch(() => ({ data: [] })),
        getAllCustomerOrders().catch(() => ({ data: [] })),
      ]);
      if (resOrders?.success) setOrders(resOrders.data);
      else if (resOrders?.data) setOrders(resOrders.data);
      const custOrders = resCustomerOrders?.data || resCustomerOrders || [];
      setCustomerOrders(Array.isArray(custOrders) ? custOrders : []);
    } finally {
      setLoadingOrders(false);
      loadedRef.current.add("orders");
    }
  }, []);

  const fetchOffers = useCallback(async () => {
    setLoadingOffers(true);
    try {
      const response: any = await getAllOffers();
      if (response?.success) setOffers(response.data);
      else if (response?.data) setOffers(response.data);
    } finally {
      setLoadingOffers(false);
      loadedRef.current.add("offers");
    }
  }, []);

  const fetchBestellungen = useCallback(async () => {
    setLoadingBestellungen(true);
    try {
      const res: any = await getAllTransferOrders();
      if (res?.success) setBestellungen(res.data || []);
      else if (res?.data) setBestellungen(res.data);
      else if (Array.isArray(res)) setBestellungen(res);
    } finally {
      setLoadingBestellungen(false);
      loadedRef.current.add("bestellungen");
    }
  }, []);

  const fetchRechnungen = useCallback(async () => {
    setLoadingRechnungen(true);
    try {
      const res: any = await getAllRechnungen();
      if (res?.success) setRechnungen(res.data || []);
      else if (Array.isArray(res?.data)) setRechnungen(res.data);
    } finally {
      setLoadingRechnungen(false);
      loadedRef.current.add("rechnungen");
    }
  }, []);

  const fetchLieferscheine = useCallback(async () => {
    setLoadingLieferscheine(true);
    try {
      const res: any = await getLieferscheine();
      if (res?.success) setLieferscheine(res.data || []);
      else if (Array.isArray(res?.data)) setLieferscheine(res.data);
    } finally {
      setLoadingLieferscheine(false);
      loadedRef.current.add("lieferscheine");
    }
  }, []);

  const fetchPaymentInbounds = useCallback(async () => {
    setLoadingPaymentInbounds(true);
    try {
      const res: any = await getAllPaymentInbounds();
      if (res?.success) setPaymentInbounds(res.data || []);
      else if (Array.isArray(res?.data)) setPaymentInbounds(res.data);
    } finally {
      setLoadingPaymentInbounds(false);
      loadedRef.current.add("paymentInbounds");
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const response: any = await getAllCustomers({ limit: 1000 });
      if (response?.data?.businesses) setCustomers(response.data.businesses);
      else if (Array.isArray(response?.data)) setCustomers(response.data);
      else if (Array.isArray(response)) setCustomers(response);
      else setCustomers([]);
    } finally {
      setLoadingCustomers(false);
      loadedRef.current.add("customers");
    }
  }, []);

  const fetchCategoriesAndSuppliers = useCallback(async () => {
    const [catRes, supRes]: any = await Promise.all([
      getCategories().catch(() => null),
      getAllSuppliers({ limit: 1000 }).catch(() => null),
    ]);
    if (catRes) {
      const data = catRes?.data ?? catRes;
      setCategories(Array.isArray(data) ? data : data?.categories || []);
    }
    if (supRes) {
      const data = supRes?.data ?? supRes;
      setSuppliers(Array.isArray(data) ? data : data?.suppliers || []);
    }
    loadedRef.current.add("categoriesAndSuppliers");
  }, []);

  const fetchAllItems = useCallback(async () => {
    setLoadingItemsAll(true);
    try {
      const response: any = await getItems({ limit: 10000 });
      const data = response?.data ?? response;
      setItemsAll(Array.isArray(data) ? data : data?.items || []);
    } finally {
      setLoadingItemsAll(false);
      loadedRef.current.add("items");
    }
  }, []);

  /** Call on mount and whenever activeInvTab changes. Only fetches what
   * that tab needs and only once per session unless force=true. */
  const ensureLoaded = useCallback(
    (tab: InvoiceTab, force = false) => {
      const has = (key: string) => !force && loadedRef.current.has(key);

      if (tab === "angebot") {
        if (!has("offers")) fetchOffers();
      }

      if (tab === "auftrag") {
        if (!has("orders")) fetchOrders();
        if (!has("items")) fetchAllItems();
        if (!has("categoriesAndSuppliers")) fetchCategoriesAndSuppliers();
        // Auftrag→Bestellung conversion needs the bestellung list too.
        if (!has("bestellungen")) fetchBestellungen();
      }

      if (tab === "bestellung") {
        if (!has("bestellungen")) fetchBestellungen();
        if (!has("items")) fetchAllItems();
      }

      if (tab === "rechnung" || tab === "rk") {
        if (!has("rechnungen")) fetchRechnungen();
      }

      if (tab === "payment_inbound") {
        if (!has("paymentInbounds")) fetchPaymentInbounds();
      }

      if (tab === "lieferschein") {
        if (!has("customers")) fetchCustomers();
        if (!has("lieferscheine")) fetchLieferscheine();
      }
    },
    [
      fetchOffers,
      fetchOrders,
      fetchAllItems,
      fetchCategoriesAndSuppliers,
      fetchBestellungen,
      fetchRechnungen,
      fetchPaymentInbounds,
      fetchCustomers,
      fetchLieferscheine,
    ],
  );

  return {
    // data
    orders,
    customerOrders,
    offers,
    bestellungen,
    rechnungen,
    lieferscheine,
    paymentInbounds,
    customers,
    categories,
    suppliers,
    itemsAll,
    // loading flags
    loadingOrders,
    loadingOffers,
    loadingBestellungen,
    loadingRechnungen,
    loadingLieferscheine,
    loadingPaymentInbounds,
    loadingCustomers,
    loadingItemsAll,
    // orchestration
    ensureLoaded,
    // individual refetchers, for use after a mutation (create/edit/delete/convert)
    refetchOrders: fetchOrders,
    refetchOffers: fetchOffers,
    refetchBestellungen: fetchBestellungen,
    refetchRechnungen: fetchRechnungen,
    refetchLieferscheine: fetchLieferscheine,
    refetchPaymentInbounds: fetchPaymentInbounds,
    refetchCustomers: fetchCustomers,
  };
}

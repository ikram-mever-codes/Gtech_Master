"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { getAllInvoices } from "@/api/invoice";
import { getAllOrders } from "@/api/orders";
import { getAllCargos, CargoType } from "@/api/cargos";
import { getAllCargoTypes, CargoTypeObj } from "@/api/cargo_types";
import { getAllGtechCompanies, GtechCompany } from "@/api/gtech_companies";
import { getAllTaricsSimple, getItems } from "@/api/items";
import { getAllSuppliers } from "@/api/suppliers";
import { getCategories } from "@/api/categories";
import type { Invoice } from "@/app/invoices/invoiceHelpers";

/**
 * Same idea as useCommercialTabData, for the /invoices page.
 *
 * The old page fetched cargos, cargo types, gtech companies and tarics on
 * every mount, re-fetched *all* invoices on every tab switch (even on the
 * Cargos / Cargo Type / Packing List tabs, which load their own data), and
 * re-fetched orders + customers + categories + suppliers + 10k items every
 * time the Orders / Order Items tab was (re)opened.
 *
 * This hook fetches a dataset only the first time a tab that needs it
 * becomes active, then keeps it for the life of the page. Mutations call
 * the returned `refetch<Name>` functions exactly where the old page called
 * `loadInvoices()` / `fetchOrders()` / `fetchAllItems()`.
 *
 * The individual fetchers below are verbatim ports of the old page's
 * fetchers (same response parsing, same error handling / toasts).
 */

export type InvoicesTab =
  | "orders"
  | "order_items"
  | "open_invoices"
  | "closed_invoices"
  | "cargos"
  | "cargo_type"
  | "packing_list";

export function useInvoicesTabData() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  // Starts `true` like the old page's `loading` flag so the invoices table
  // shows its spinner (not "No invoices found") before the first fetch.
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [itemsAll, setItemsAll] = useState<any[]>([]);
  const [loadingItemsAll, setLoadingItemsAll] = useState(false);

  const [cargos, setCargos] = useState<CargoType[]>([]);
  const [cargoTypesList, setCargoTypesList] = useState<CargoTypeObj[]>([]);
  const [gtechCompanies, setGtechCompanies] = useState<GtechCompany[]>([]);
  const [tarics, setTarics] = useState<any[]>([]);

  // Datasets already fetched at least once — ensureLoaded() never issues a
  // duplicate request for something already in memory.
  const loadedRef = useRef<Set<string>>(new Set());

  const fetchInvoices = useCallback(async () => {
    loadedRef.current.add("invoices");
    try {
      setLoadingInvoices(true);
      const response = await getAllInvoices();
      setInvoices(response?.data);
      setLoadingInvoices(false);
    } catch (error) {
      console.error("Failed to load invoices:", error);
      setLoadingInvoices(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    loadedRef.current.add("orders");
    setLoadingOrders(true);
    try {
      const response = await getAllOrders();
      if (response?.success) setOrders(response.data);
      else if (response?.data) setOrders(response.data);
    } catch (error) {
      console.error("Error fetching Orders:", error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    loadedRef.current.add("categories");
    try {
      const response = await getCategories();
      const data = response?.data ?? response;
      const arr = Array.isArray(data) ? data : data?.categories || [];
      setCategories(arr);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    loadedRef.current.add("suppliers");
    try {
      const response = await getAllSuppliers({ limit: 1000 });
      const data = response?.data ?? response;
      const arr = Array.isArray(data) ? data : data?.suppliers || [];
      setSuppliers(arr);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  }, []);

  const fetchAllItems = useCallback(async () => {
    loadedRef.current.add("items");
    try {
      setLoadingItemsAll(true);
      const response = await getItems({ limit: 10000 });
      const data = response?.data ?? response;
      const arr = Array.isArray(data) ? data : data?.items || [];
      setItemsAll(arr);
    } catch (error) {
      console.error("Error fetching items:", error);
      setItemsAll([]);
    } finally {
      setLoadingItemsAll(false);
    }
  }, []);

  const fetchCargos = useCallback(async () => {
    loadedRef.current.add("cargos");
    const res: any = await getAllCargos({ limit: 1000 });
    const data = res?.data?.cargos || res?.data?.data || res?.data || res;
    if (Array.isArray(data)) setCargos(data);
  }, []);

  const fetchCargoTypes = useCallback(async () => {
    loadedRef.current.add("cargoTypes");
    const res: any = await getAllCargoTypes();
    const data = res?.data?.data || res?.data || res;
    if (Array.isArray(data)) setCargoTypesList(data);
  }, []);

  const fetchGtechCompanies = useCallback(async () => {
    loadedRef.current.add("gtechCompanies");
    try {
      const res: any = await getAllGtechCompanies();
      const data = res?.data?.data || res?.data || res;
      if (Array.isArray(data)) setGtechCompanies(data);
    } catch {
      // swallowed, as before
    }
  }, []);

  const fetchTarics = useCallback(async () => {
    loadedRef.current.add("tarics");
    const res = await getAllTaricsSimple();
    if (res.success) setTarics(res.data);
  }, []);

  /** Call whenever activeInvTab changes. Only fetches what that tab needs,
   * and only once per page lifetime unless force=true. */
  const ensureLoaded = useCallback(
    (tab: InvoicesTab, force = false) => {
      const has = (key: string) => !force && loadedRef.current.has(key);

      if (tab === "orders" || tab === "order_items") {
        if (!has("orders")) fetchOrders();
        if (!has("categories")) fetchCategories();
        if (!has("suppliers")) fetchSuppliers();
        if (!has("items")) fetchAllItems();
        // OrdersTable + Reassign/Split modals need the cargo list.
        if (!has("cargos")) fetchCargos();
      }

      if (tab === "open_invoices" || tab === "closed_invoices") {
        if (!has("invoices")) fetchInvoices();
        // Cargo No / CargoType / Bill To columns + Reassign/Split/Taric modals.
        if (!has("cargos")) fetchCargos();
        if (!has("cargoTypes")) fetchCargoTypes();
        if (!has("gtechCompanies")) fetchGtechCompanies();
        if (!has("tarics")) fetchTarics();
      }

      // "cargos", "cargo_type" and "packing_list" render self-fetching
      // components (CargosTab, CargoTypesTab, PackingListTab) — nothing to
      // load here.
    },
    [
      fetchOrders,
      fetchCategories,
      fetchSuppliers,
      fetchAllItems,
      fetchCargos,
      fetchInvoices,
      fetchCargoTypes,
      fetchGtechCompanies,
      fetchTarics,
    ],
  );

  return {
    // data
    invoices,
    orders,
    categories,
    suppliers,
    itemsAll,
    cargos,
    setCargos,
    cargoTypesList,
    gtechCompanies,
    tarics,
    // loading flags
    loadingInvoices,
    loadingOrders,
    loadingItemsAll,
    // orchestration
    ensureLoaded,
    // individual refetchers, for use after a mutation
    refetchInvoices: fetchInvoices,
    refetchOrders: fetchOrders,
    refetchAllItems: fetchAllItems,
  };
}

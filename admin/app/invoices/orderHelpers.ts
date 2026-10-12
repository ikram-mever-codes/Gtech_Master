/**
 * Pure helpers for the /invoices page's Orders / Order Items tabs — moved
 * out of page.tsx unchanged (minus two leftover debug console.logs for
 * order "2608-10").
 */

const hasChinese = (str: string) => /[一-龥]/.test(str || "");

export const getCategoryNameFrom = (
  categories: any[],
  categoryId: string | number,
) => categories.find((c) => String(c.id) === String(categoryId))?.name ?? "-";

export const getSupplierNameFrom = (suppliers: any[], supplierId: any) => {
  const s = suppliers.find((c) => String(c.id) === String(supplierId));
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
};

/** Extra Orders / Order Items filters (same behaviour as the "Name..." and
 * "Company..." filters of the Items Management page). */
export interface OrderExtraFilters {
  /** Item name search, case-insensitive substring of the trimmed text. */
  itemName?: string;
  /** Selected customer id (exact match); falls back to the name below. */
  companyId?: string;
  /** Selected customer name (case-insensitive substring) if no id. */
  companyName?: string;
}

const lc = (v: any) => String(v ?? "").toLowerCase();

/** Same fields the Items Management "Name..." search looks at: item name
 * (EN / DE / CN), model, item no. and the parent's names. */
const matchesItemName = (row: any, term: string) => {
  const it = row?.item || {};
  const haystack = [
    row?.item_name,
    row?.itemName,
    it.item_name,
    it.name,
    row?.item_name_de,
    it.item_name_de,
    row?.item_name_cn,
    it.item_name_cn,
    row?.model,
    it.model,
    it.item_no_de,
    it.parent?.de_no,
    it.parent?.name_de,
    it.parent?.name_en,
  ];
  return haystack.some((v) => lc(v).includes(term));
};

const orderCustomerId = (o: any) =>
  String(o?.customer_id ?? o?.customer?.id ?? "");

const orderCustomerName = (o: any) =>
  lc(
    o?.customer?.companyName ||
      o?.customer?.company_name ||
      o?.customer?.name ||
      o?.customer_name ||
      "",
  );

const matchesCompany = (o: any, extra: OrderExtraFilters) => {
  if (extra.companyId) return orderCustomerId(o) === String(extra.companyId);
  const q = lc(extra.companyName).trim();
  return !q || orderCustomerName(o).includes(q);
};

const hasExtra = (extra?: OrderExtraFilters) =>
  !!(
    extra &&
    (extra.itemName?.trim() || extra.companyId || extra.companyName?.trim())
  );

/** Flattens orders into order-item rows (sorted by `position`, falling back
 * to API order), applies the Reports & Control audit `filter` URL param and
 * the order-no / EAN / item-name search. */
export const buildOrderItemsFlat = (
  orders: any[],
  filterParam: string | null,
  orderNoFilter: string,
  extra?: OrderExtraFilters,
) => {
  let allItems = orders.flatMap((o: any) => {
    const rawItems = (o.items || []).map((i: any, idx: number) => ({
      ...i,
      _originalIndex: idx,
    }));

    rawItems.sort((a: any, b: any) => {
      const getSortValue = (item: any, fallbackIdx: number) => {
        if (
          item.position !== undefined &&
          item.position !== null &&
          item.position !== ""
        ) {
          const p = Number(item.position);
          if (!isNaN(p)) return p;
        }
        return fallbackIdx;
      };
      return (
        getSortValue(a, a._originalIndex) - getSortValue(b, b._originalIndex)
      );
    });

    return rawItems.map((i: any, idx: number) => ({
      ...i,
      position: i.position ?? idx + 1,
      order_id: o.id,
      parentOrder: o,
      order_no: o.order_no,
      order_status: o.status,
      item_status: i.status || "NSO",
      supplier_id: i.supplier_id || i.item?.supplier_id || o.supplier_id,
      customer_id: o.customer_id || o.customer?.id,
      customer: o.customer,
      category_id: o.category_id,
      comment: o.comment,
    }));
  });

  if (filterParam) {
    if (filterParam === "unassigned_cargo") {
      allItems = allItems.filter(
        (i: any) =>
          !i.cargo_id ||
          i.cargo_id === 0 ||
          i.cargo_id === "0" ||
          i.cargo_id === "-" ||
          i.cargo_id === "null",
      );
    } else if (filterParam === "purchase_problem") {
      allItems = allItems.filter(
        (i: any) =>
          (i.problems &&
            i.problems !== "" &&
            (i.problems.toLowerCase().includes("purchase") ||
              i.problems.toLowerCase().includes("buy"))) ||
          (i.status && String(i.status).toLowerCase().includes("purchase")),
      );
    } else if (filterParam === "check_problem") {
      allItems = allItems.filter(
        (i: any) =>
          i.problems &&
          i.problems !== "" &&
          (i.problems.toLowerCase().includes("check") ||
            i.problems.toLowerCase().includes("verify")),
      );
    } else if (filterParam === "rmb_special_no_value") {
      allItems = allItems.filter((i: any) => {
        const it = i.item || {};
        const price = i.rmb_price || it.rmb_price || it.RMB_Price || 0;
        return (
          it.is_rmb_special === "Y" &&
          (!price || parseFloat(String(price)) === 0)
        );
      });
    } else if (filterParam === "eur_special_no_value") {
      allItems = allItems.filter((i: any) => {
        const it = i.item || {};
        const hasEUR =
          (it.price && parseFloat(String(it.price)) > 0) ||
          (it.transfer_price_EUR &&
            parseFloat(String(it.transfer_price_EUR)) > 0);
        return it.is_eur_special === "Y" && !hasEUR;
      });
    } else if (filterParam === "dimension_special_no_value") {
      allItems = allItems.filter((i: any) => {
        const it = i.item || {};
        const hasDim =
          it.weight &&
          parseFloat(String(it.weight)) > 0 &&
          it.length &&
          parseFloat(String(it.length)) > 0 &&
          it.width &&
          parseFloat(String(it.width)) > 0 &&
          it.height &&
          parseFloat(String(it.height)) > 0;
        return it.is_dimension_special === "Y" && !hasDim;
      });
    }
  }

  if (hasExtra(extra)) {
    const nameTerm = lc(extra!.itemName).trim();
    allItems = allItems.filter(
      (i: any) =>
        (!nameTerm || matchesItemName(i, nameTerm)) &&
        matchesCompany(i, extra!),
    );
  }

  if (!orderNoFilter) return allItems;
  const s = orderNoFilter.toLowerCase();
  return allItems.filter(
    (i: any) =>
      String(i.order_no).toLowerCase().includes(s) ||
      String(i.ean || i.item?.ean || "")
        .toLowerCase()
        .includes(s) ||
      String(i.item_name || i.itemName || i.item?.item_name || "")
        .toLowerCase()
        .includes(s),
  );
};

/** Orders tab list: audit `unassigned_cargo` filter + order-no search. */
export const filterOrders = (
  orders: any[],
  filterParam: string | null,
  orderNoFilter: string,
  extra?: OrderExtraFilters,
) => {
  let list = orders;
  if (filterParam === "unassigned_cargo") {
    list = list.filter(
      (o: any) =>
        !o.cargo_id ||
        o.cargo_id === 0 ||
        o.cargo_id === "0" ||
        o.cargo_id === "-" ||
        o.cargo_id === "null",
    );
  }
  if (hasExtra(extra)) {
    const nameTerm = lc(extra!.itemName).trim();
    list = list.filter(
      (o: any) =>
        matchesCompany(o, extra!) &&
        (!nameTerm ||
          (o.items || []).some((i: any) => matchesItemName(i, nameTerm))),
    );
  }

  if (!orderNoFilter) return list;
  const s = orderNoFilter.toLowerCase();
  return list.filter(
    (o: any) =>
      String(o.order_no).toLowerCase().includes(s) ||
      String(o.id).toLowerCase().includes(s) ||
      (o.comment || "").toLowerCase().includes(s),
  );
};

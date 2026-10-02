/**
 * Mirrors the server's `getGroupKey` in invoice_controller.ts
 * (fetchExpandedDetailsData). Every place that groups an order item by its
 * taric classification — for display or for matching a "Set Taric" action
 * back to the items it should update — must use this, so the key the
 * frontend computes always matches the `taricId` the backend already put
 * on each `taricGroups[]` row. Do not reimplement this inline; four separate
 * inline copies of this logic (with three different, incompatible key
 * schemes) is what caused the "No items found in this group to update" bug.
 */
export const getTaricGroupKey = (oi: any): string => {
  const itemTaricCode = oi.item?.taric?.code || "";
  const isProjectItem =
    !itemTaricCode || itemTaricCode === "0" || itemTaricCode === "0000000000";

  if (oi.set_taric_code) {
    const codes = oi.set_taric_code.split("/");
    const target = codes.length > 1 ? codes[1].trim() : codes[0].trim();
    return `hs_${target}`;
  }
  const taricId = oi.item?.taric?.id;
  if (taricId && !isProjectItem) {
    return `hs_${itemTaricCode}`;
  }
  return `item_${oi.item?.id ?? "unknown"}`;
};

/**
 * Mirrors the server's `getEffectiveTaricCode` / `taricGroups[].taricCode`:
 * the code currently displayed for an item's group — the override's target
 * segment when `set_taric_code` is set, otherwise the item's own taric code.
 * This is NOT the same as the raw `set_taric_code` string (which keeps the
 * "original/new" history) — comparing the raw string against a group's
 * `taricCode` is exactly the bug this replaces.
 */
export const getEffectiveTaricCode = (oi: any): string => {
  const rawCode = oi.set_taric_code
    ? oi.set_taric_code.toString()
    : oi.item?.taric?.code || "";
  if (rawCode) {
    const codes = rawCode.split("/");
    return codes.length > 1 ? codes[1].trim() : codes[0].trim();
  }
  return "-";
};

export const calculateInvoiceTotal = (invoice: any): number => {
  if (!invoice) return 0;

  const freight = Number(invoice.freightCost ?? invoice.freight_cost ?? 0);
  const gross = Number(invoice.grossTotal ?? invoice.gross_total ?? 0);

  if (gross > freight) {
    return gross;
  }

  const items = invoice.items || [];
  const itemsSum = items.reduce(
    (s: number, it: any) =>
      s +
      Number(it.quantity ?? it.qty ?? 0) *
      Number(
        it.unit_price ??
        it.unitPrice ??
        it.price ??
        it.net_price ??
        it.netPrice ??
        0,
      ),
    0,
  );

  if (itemsSum > 0) {
    return itemsSum + freight;
  }

  if (gross > 0) {
    return Math.max(gross, freight);
  }

  return freight;
};
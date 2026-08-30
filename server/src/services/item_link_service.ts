import { QueryRunner } from "typeorm";
import { Item } from "../models/items";
import { Category } from "../models/categories";

/**
 * Maps the externally-facing field name (used in RequestedItem/Inquiry
 * payloads and API responses) to the actual column name on Item.
 *
 * itemNo is intentionally NOT here: it's a per-context sequence number
 * (e.g. "AF25-a") assigned by InquiryController.getLetterSuffix, not a
 * master-item attribute. It stays on RequestedItem/Inquiry. It's still
 * used as a creation-time default for Item.item_no_de — see resolveItem.
 *
 * sales_price is also intentionally NOT here — it's never taken directly
 * from a payload field of the same name. It's defaulted from
 * payload.targetPrice, but only when a brand-new Item is being created
 * (see resolveItem below), never synced afterward.
 */
export const ITEM_FIELD_MAP: Record<string, keyof Item> = {
  itemName: "item_name",
  material: "material",
  specification: "specification",
  weight: "weight",
  width: "width",
  height: "height",
  length: "length",
  purchasePrice: "price",
  currency: "currency",
  // Payload/response key stays "taric" (matches RequestedItem.taric /
  // Inquiry payloads); the Item column is "taricCode" because "taric" on
  // Item is already the relation to the Taric entity (item.taric.code).
  taric: "taricCode",
  model: "model",
  ean: "ean",
  item_name_cn: "item_name_cn",
  item_name_de: "item_name_de",
  photo: "photo",
  pix_path: "pix_path",
  pix_path_eBay: "pix_path_eBay",
  cat_id: "cat_id",
  supplier_id: "supplier_id",
  is_rmb_special: "is_rmb_special",
  is_eur_special: "is_eur_special",
  isActive: "isActive",
  is_dim_weight_estimated: "is_dim_weight_estimated",
};

export class ItemLinkError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * RequestedItem's own columns — everything NOT sourced from the linked
 * Item (see ITEM_FIELD_MAP above) and not a relation handled explicitly
 * by the caller (business, customer, contactPerson, inquiry, item).
 * Shared by RequestedItemController and InquiryController so the two
 * don't drift — a field either belongs here or in ITEM_FIELD_MAP, never
 * assumed to exist directly on RequestedItem without checking both.
 */
export const REQUESTED_ITEM_OWN_FIELDS = [
  "itemNo",
  "extraItems",
  "extraItemsDescriptions",
  "qty",
  "interval",
  "sampleQty",
  "expectedDelivery",
  "priority",
  "requestStatus",
  "comment",
  "extraNote",
  "asanaLink",
  "targetPrice",
  "annualPotential",
  "annualPotentialKEur",
  "isEstimated",
  "qualityCriteria",
  "attachments",
  "urgency1",
  "urgency2",
  "painPoints",
  "tagOrder",
  "parent_id",
  "taric_id",
] as const;

export function toRequestedItemOwnFields(
  payload: Record<string, any>,
): Record<string, any> {
  const own: Record<string, any> = {};
  for (const key of REQUESTED_ITEM_OWN_FIELDS) {
    if (payload[key] !== undefined) own[key] = payload[key];
  }
  return own;
}

export class ItemLinkService {
  /**
   * Resolves the master Item for an incoming create payload.
   * - payload.itemId present -> validate & return the existing Item.
   * - otherwise -> create a new draft Item (isDraft = true) populated
   *   from whichever shared fields are present in the payload, plus the
   *   creation-time defaults below.
   *
   * Creation-time defaults — ONLY applied on this new-Item branch, and
   * ONLY when not already supplied via ITEM_FIELD_MAP. They never run
   * again once an Item exists (syncItemFields doesn't apply any of
   * these):
   * - item_name_de <- payload.itemName
   * - item_no_de   <- payload.itemNo (excluded from ITEM_FIELD_MAP on
   *   purpose, defaulted here explicitly)
   * - cat_id       <- the "PRO" category, resolved here
   * - sales_price  <- payload.targetPrice (NOT a payload key in
   *   ITEM_FIELD_MAP at all — this is the only place it's ever set)
   * - isDraft is ALWAYS forced true at the end, regardless of anything
   *   in the payload — a newly-created Item can never be isDraft: false.
   *
   * Must run inside an active transaction (pass the QueryRunner's manager).
   */
  static async resolveItem(
    queryRunner: QueryRunner,
    payload: Record<string, any>,
  ): Promise<Item> {
    const itemRepo = queryRunner.manager.getRepository(Item);

    if (payload.itemId !== undefined && payload.itemId !== null) {
      const existing = await itemRepo.findOne({
        where: { id: payload.itemId },
      });
      if (!existing) {
        throw new ItemLinkError(`Item ${payload.itemId} not found`, 404);
      }
      return existing;
    }

    // Default cat_id to the "PRO" category when the payload doesn't
    // specify one.
    let resolvedCatId = payload.cat_id;
    if (resolvedCatId === undefined || resolvedCatId === null) {
      try {
        const categoryRepo = queryRunner.manager.getRepository(Category);
        const proCat = await categoryRepo.findOne({ where: { name: "PRO" } });
        if (proCat) resolvedCatId = proCat.id;
      } catch (e) {
        console.error("Failed to fetch default PRO category:", e);
      }
    }

    const resolvedPayload: any = {
      ...payload,
      cat_id: resolvedCatId,
      supplier_id: payload.supplier_id ?? payload.supplierId ?? 1,
    };

    const itemData: Partial<Item> = {};
    for (const [payloadKey, itemKey] of Object.entries(ITEM_FIELD_MAP)) {
      if (resolvedPayload[payloadKey] !== undefined) {
        (itemData as any)[itemKey] = resolvedPayload[payloadKey];
      }
    }

    // item_name_de defaults to the request item's own name.
    if (itemData.item_name_de === undefined && payload.itemName) {
      itemData.item_name_de = payload.itemName;
    }

    // item_no_de defaults to the request's assigned item number.
    if (itemData.item_no_de === undefined && payload.itemNo) {
      itemData.item_no_de = payload.itemNo;
    }

    // sales_price ALWAYS comes from payload.targetPrice on creation —
    // there is no separate "sales_price" payload field to check for.
    if (
      payload.targetPrice !== undefined &&
      payload.targetPrice !== null &&
      payload.targetPrice !== ""
    ) {
      const parsedTarget = Number(payload.targetPrice);
      if (!isNaN(parsedTarget)) {
        itemData.sales_price = parsedTarget;
      }
    }

    // Non-negotiable: a freshly-created Item is always a draft.
    itemData.isDraft = true;

    const draft = itemRepo.create(itemData);
    return itemRepo.save(draft);
  }

  /**
   * Applies any shared fields present in the payload onto an already-linked
   * Item (used on update). If switchToItemId is set and differs from the
   * currently linked item, the caller should re-resolve via resolveItem
   * instead of calling this. Deliberately does NOT touch sales_price,
   * item_name_de, item_no_de, or cat_id defaults — those are creation-time
   * only (see resolveItem).
   */
  static async syncItemFields(
    queryRunner: QueryRunner,
    item: Item,
    payload: Record<string, any>,
  ): Promise<Item> {
    const itemRepo = queryRunner.manager.getRepository(Item);
    let changed = false;
    for (const [payloadKey, itemKey] of Object.entries(ITEM_FIELD_MAP)) {
      if (payload[payloadKey] !== undefined) {
        (item as any)[itemKey] = payload[payloadKey];
        changed = true;
      }
    }
    return changed ? itemRepo.save(item) : item;
  }

  /**
   * Backfills a draft Item for a legacy RequestedItem/Inquiry row that
   * predates this migration and has no itemId yet. baseFields should be
   * the entity's own current values for the shared keys (pre-migration
   * duplicated columns), payload overrides take precedence.
   */
  static async backfillItem(
    queryRunner: QueryRunner,
    baseFields: Record<string, any>,
    payload: Record<string, any>,
  ): Promise<Item> {
    return this.resolveItem(queryRunner, {
      ...baseFields,
      ...payload,
      itemId: undefined,
    });
  }

  /**
   * Projects the shared Item fields back onto a flat, backward-compatible
   * response shape under the original RequestedItem/Inquiry-facing keys.
   * Spread this into the response object alongside the entity's own fields.
   */
  static projectItemFields(item?: Item | null): Record<string, any> {
    if (!item) return {};
    const projected: Record<string, any> = {};
    for (const [payloadKey, itemKey] of Object.entries(ITEM_FIELD_MAP)) {
      projected[payloadKey] = (item as any)[itemKey];
    }
    return projected;
  }
}

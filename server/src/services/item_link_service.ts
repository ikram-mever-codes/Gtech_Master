import { QueryRunner } from "typeorm";
import { Item } from "../models/items";

/**
 * Maps the externally-facing field name (used in RequestedItem/Inquiry
 * payloads and API responses) to the actual column name on Item.
 *
 * itemNo is intentionally NOT here: it's a per-context sequence number
 * (e.g. "AF25-a") assigned by InquiryController.getLetterSuffix, not a
 * master-item attribute. It stays on RequestedItem/Inquiry.
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
   *   from whichever shared fields are present in the payload.
   *
   * Must run inside an active transaction (pass the QueryRunner's manager).
   */
  static async resolveItem(
    queryRunner: QueryRunner,
    payload: Record<string, any>,
  ): Promise<Item> {
    const itemRepo = queryRunner.manager.getRepository(Item);
    console.log("Body OF item", payload);

    if (payload.itemId !== undefined && payload.itemId !== null) {
      const existing = await itemRepo.findOne({
        where: { id: payload.itemId },
      });
      if (!existing) {
        throw new ItemLinkError(`Item ${payload.itemId} not found`, 404);
      }
      return existing;
    }

    const itemData: Partial<Item> = { isDraft: true };
    for (const [payloadKey, itemKey] of Object.entries(ITEM_FIELD_MAP)) {
      if (payload[payloadKey] !== undefined) {
        (itemData as any)[itemKey] = payload[payloadKey];
      }
    }

    const draft = itemRepo.create(itemData);
    return itemRepo.save(draft);
  }

  /**
   * Applies any shared fields present in the payload onto an already-linked
   * Item (used on update). If switchToItemId is set and differs from the
   * currently linked item, the caller should re-resolve via resolveItem
   * instead of calling this.
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

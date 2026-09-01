import { QueryRunner } from "typeorm";
import { Item } from "../models/items";
import { Category } from "../models/categories";

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
  taric: "taricCode",
  taric_id: "taric_id",
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
  remark: "remark",
  remark_ex: "remark_ex",
  remark_cn: "remark_cn",
  is_new: "is_new",
  is_npr: "is_npr",
  is_qty_dividable: "is_qty_dividable",
  is_dimension_special: "is_dimension_special",
  isLabelPrint: "isLabelPrint",
  transfer_price_EUR: "transfer_price_EUR",
  is_stock_item: "is_stock_item",
  stockEU: "stockEU",
  MSQ_EU: "MSQ_EU",
  stockCN: "stockCN",
  MSQ_CN: "MSQ_CN",
};

export class ItemLinkError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

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

    if (itemData.item_name_de === undefined && payload.itemName) {
      itemData.item_name_de = payload.itemName;
    }

    if (itemData.item_no_de === undefined && payload.itemNo) {
      itemData.item_no_de = payload.itemNo;
    }

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

    itemData.isDraft = true;

    const draft = itemRepo.create(itemData);
    return itemRepo.save(draft);
  }

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

  static projectItemFields(item?: Item | null): Record<string, any> {
    if (!item) return {};
    const projected: Record<string, any> = {};
    for (const [payloadKey, itemKey] of Object.entries(ITEM_FIELD_MAP)) {
      projected[payloadKey] = (item as any)[itemKey];
    }
    return projected;
  }
}

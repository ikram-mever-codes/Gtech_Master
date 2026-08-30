import { Request, Response } from "express";
import { RequestedItem } from "../models/requested_items";
import { StarBusinessDetails } from "../models/star_business_details";
import { Customer } from "../models/customers";
import { ContactPerson } from "../models/contact_person";
import { AppDataSource } from "../config/database";
import { Inquiry } from "../models/inquiry";
import { Item } from "../models/items";
import { UserRole } from "../models/users";
import { filterDataByRole } from "../utils/dataFilter";
import { AuthorizedRequest } from "../middlewares/authorized";
import { OfferLineItem } from "../models/offer";
import {
  ItemLinkService,
  ItemLinkError,
  ITEM_FIELD_MAP,
  REQUESTED_ITEM_OWN_FIELDS,
} from "../services/item_link_service";
import { IsOptional, IsString, IsInt, IsIn } from "class-validator";
import { Type } from "class-transformer";
import { DeepPartial, EntityManager } from "typeorm";

// Fields that used to live directly on RequestedItem but are now sourced
// from the linked Item. No longer used to strip — kept for the itemId
// re-linking checks below.
const SHARED_KEYS = Object.keys(ITEM_FIELD_MAP);

// Whitelist, not blacklist: only these keys are ever written to
// RequestedItem's own columns. Everything else (shared Item fields,
// relation ids handled explicitly, or anything the frontend sends that
// doesn't map to a real column) is dropped here rather than passed
// through to TypeORM, which throws EntityPropertyNotFoundError instead
// of ignoring unknown keys. If a field genuinely needs to reach
// RequestedItem, add it here explicitly — don't fall back to blacklisting.
function toOwnFields(payload: Record<string, any>): Record<string, any> {
  const own: Record<string, any> = {};
  for (const key of REQUESTED_ITEM_OWN_FIELDS) {
    if (payload[key] !== undefined) own[key] = payload[key];
  }
  const unrecognized = Object.keys(payload).filter(
    (key) =>
      !REQUESTED_ITEM_OWN_FIELDS.includes(key as any) &&
      !SHARED_KEYS.includes(key) &&
      ![
        "businessId",
        "contactPersonId",
        "inquiryId",
        "itemId",
        "customerId",
        "id",
      ].includes(key),
  );
  if (unrecognized.length > 0) {
    console.warn(
      `RequestedItem payload had fields with no matching column, dropped: ${unrecognized.join(", ")}`,
    );
  }
  return own;
}

function withItemFields(entity: any): any {
  if (!entity) return entity;
  const projected = ItemLinkService.projectItemFields(entity.item);
  return {
    ...entity,
    ...projected,
    itemId: entity.item?.id ?? entity.itemId ?? null,
    isDraft: entity.item?.isDraft ?? false,
    sales_price: entity.item?.sales_price ?? null,
    salesPrice: entity.item?.sales_price ?? null,
    taric_id: entity.item?.taric_id ?? null,
    taricId: entity.item?.taric_id ?? null,
    item_name_de: entity.item?.item_name_de ?? null,
    itemNameDe: entity.item?.item_name_de ?? null,
    category: entity.item?.category ?? null,
    supplier: entity.item?.supplier ?? null,
  };
}
function withNestedCustomer(
  business?: StarBusinessDetails,
  customer?: Customer | null,
): any {
  if (!business) return business;
  if (!customer) return business;
  return {
    ...business,
    customer: {
      id: customer.id,
      companyName: customer.companyName,
      legalName: customer.legalName,
      email: customer.email,
      contactEmail: customer.contactEmail,
      contactPhoneNumber: customer.contactPhoneNumber,
      stage: customer.stage,
      avatar: customer.avatar,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    },
  };
}

// Derives the Customer for a given StarBusinessDetails id via the existing
// Customer.starBusinessDetails link (column: customer.starBusinessDetailsId).
async function resolveCustomerForBusiness(
  manager: EntityManager,
  businessId: string,
): Promise<Customer | null> {
  const customerRepo = manager.getRepository(Customer);
  return customerRepo.findOne({
    where: { starBusinessDetails: { id: businessId } },
  });
}

export class CreateRequestedItemDto {
  @IsString()
  businessId!: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  itemId?: number;

  @IsOptional()
  @IsString()
  itemName?: string;

  @IsString()
  qty!: string;

  @IsOptional()
  @IsIn(["Monatlich", "2 monatlich", "Quartal", "halbjährlich", "jährlich"])
  interval?: string;

  @IsOptional()
  @IsIn(["High", "Normal"])
  priority?: string;
}

export class UpdateRequestedItemDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  itemId?: number;
}

export class RequestedItemController {
  private requestedItemRepository = AppDataSource.getRepository(RequestedItem);
  private businessRepository = AppDataSource.getRepository(StarBusinessDetails);
  private offerLineItemRepository = AppDataSource.getRepository(OfferLineItem);
  private contactPersonRepository = AppDataSource.getRepository(ContactPerson);
  private inquiryRepository = AppDataSource.getRepository(Inquiry);
  private itemRepository = AppDataSource.getRepository(Item);

  async getAllRequestedItems(request: Request, response: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        businessId,
        status,
        priority,
        contactPersonId,
        inquiryId,
        minWeight,
        maxWeight,
        tags,
      } = request.query;

      const queryBuilder = this.requestedItemRepository
        .createQueryBuilder("requestedItem")
        .leftJoinAndSelect("requestedItem.business", "business")
        .leftJoinAndSelect("requestedItem.customer", "customer")
        .leftJoinAndSelect("requestedItem.contactPerson", "contactPerson")
        .leftJoinAndSelect("requestedItem.inquiry", "inquiry")
        .leftJoinAndSelect("requestedItem.tags", "tags")
        .leftJoinAndSelect("requestedItem.parent", "parent")
        .leftJoinAndSelect("requestedItem.taricRel", "taricRel")
        .leftJoinAndSelect("requestedItem.category", "category")
        .leftJoinAndSelect("requestedItem.supplier", "supplier")
        .leftJoinAndSelect("requestedItem.item", "item")
        .leftJoinAndSelect("item.category", "itemCategory")
        .leftJoinAndSelect("item.supplier", "itemSupplier")
        .orderBy("requestedItem.createdAt", "DESC");

      if (tags) {
        const tagIds = (tags as string).split(",");
        const includeTagIds = tagIds
          .filter((id) => !id.startsWith("!"))
          .map((id) => id.trim());
        const excludeTagIds = tagIds
          .filter((id) => id.startsWith("!"))
          .map((id) => id.substring(1).trim());

        if (includeTagIds.length > 0) {
          queryBuilder.andWhere((qb: any) => {
            const subQuery = qb
              .subQuery()
              .select("c.id")
              .from(RequestedItem, "c")
              .innerJoin("c.tags", "t")
              .where("t.id IN (:...reqIncludeTagIds)")
              .groupBy("c.id")
              .having("COUNT(t.id) = :reqIncludeCount");
            return `requestedItem.id IN ${subQuery.getQuery()}`;
          });
          queryBuilder.setParameter("reqIncludeTagIds", includeTagIds);
          queryBuilder.setParameter("reqIncludeCount", includeTagIds.length);
        }

        if (excludeTagIds.length > 0) {
          queryBuilder.andWhere((qb: any) => {
            const subQuery = qb
              .subQuery()
              .select("c.id")
              .from(RequestedItem, "c")
              .innerJoin("c.tags", "t")
              .where("t.id IN (:...reqExcludeTagIds)");
            return `requestedItem.id NOT IN ${subQuery.getQuery()}`;
          });
          queryBuilder.setParameter("reqExcludeTagIds", excludeTagIds);
        }
      }

      if (businessId) {
        queryBuilder.andWhere("requestedItem.businessId = :businessId", {
          businessId,
        });
      }
      if (status) {
        queryBuilder.andWhere("requestedItem.requestStatus = :status", {
          status,
        });
      }
      if (priority) {
        queryBuilder.andWhere("requestedItem.priority = :priority", {
          priority,
        });
      }
      if (contactPersonId) {
        queryBuilder.andWhere(
          "requestedItem.contactPersonId = :contactPersonId",
          {
            contactPersonId,
          },
        );
      }
      if (inquiryId) {
        queryBuilder.andWhere("requestedItem.inquiry.id = :inquiryId", {
          inquiryId,
        });
      }
      // weight now lives on the linked Item, not on requestedItem directly.
      if (minWeight) {
        queryBuilder.andWhere("item.weight >= :minWeight", {
          minWeight: parseFloat(minWeight as string),
        });
      }
      if (maxWeight) {
        queryBuilder.andWhere("item.weight <= :maxWeight", {
          maxWeight: parseFloat(maxWeight as string),
        });
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [items, total] = await queryBuilder
        .skip(skip)
        .take(Number(limit))
        .getManyAndCount();

      const enrichedItems = items.map((item) =>
        withItemFields({
          ...item,
          business: withNestedCustomer(item.business, item.customer),
        }),
      );

      const user = (request as AuthorizedRequest).user;
      const filteredData = filterDataByRole(
        enrichedItems,
        user?.role || UserRole.STAFF,
      );

      return response.status(200).json({
        success: true,
        data: filteredData,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching requested items:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async getRequestedItemById(request: Request, response: Response) {
    try {
      const { id } = request.params;

      const item = await this.requestedItemRepository.findOne({
        where: { id },
        relations: [
          "business",
          "customer",
          "contactPerson",
          "inquiry",
          "tags",
          "parent",
          "taricRel",
          "category",
          "supplier",
          "item",
          "item.category",
          "item.supplier",
        ],
      });

      if (!item) {
        return response
          .status(404)
          .json({ success: false, message: "Requested item not found" });
      }

      const enrichedItem = withItemFields({
        ...item,
        business: withNestedCustomer(item.business, item.customer),
      });

      const user = (request as AuthorizedRequest).user;
      const filteredData = filterDataByRole(
        enrichedItem,
        user?.role || UserRole.STAFF,
      );

      return response.status(200).json({ success: true, data: filteredData });
    } catch (error) {
      console.error("Error fetching requested item:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async createRequestedItem(request: Request, response: Response) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const body = request.body;

      const { businessId, contactPersonId, inquiryId, itemId, itemName, qty } =
        body;

      if (!businessId || !qty) {
        await queryRunner.rollbackTransaction();
        return response.status(400).json({
          success: false,
          message: "Missing required fields: businessId and qty are required",
        });
      }

      if (!itemId && !itemName) {
        await queryRunner.rollbackTransaction();
        return response.status(400).json({
          success: false,
          message:
            "itemName is required when no itemId is supplied (needed to create the draft Item)",
        });
      }

      const businessRepo =
        queryRunner.manager.getRepository(StarBusinessDetails);
      const contactRepo = queryRunner.manager.getRepository(ContactPerson);
      const inquiryRepo = queryRunner.manager.getRepository(Inquiry);
      const requestedItemRepo =
        queryRunner.manager.getRepository(RequestedItem);

      const business = await businessRepo.findOne({
        where: { id: businessId },
      });
      if (!business) {
        await queryRunner.rollbackTransaction();
        return response
          .status(404)
          .json({ success: false, message: "Business not found" });
      }

      let contactPerson: any = null;
      if (contactPersonId) {
        contactPerson = await contactRepo.findOne({
          where: { id: contactPersonId },
        });
        if (!contactPerson) {
          await queryRunner.rollbackTransaction();
          return response
            .status(404)
            .json({ success: false, message: "Contact person not found" });
        }
      }

      let inquiry: any = null;
      if (inquiryId) {
        inquiry = await inquiryRepo.findOne({ where: { id: inquiryId } });
        if (!inquiry) {
          await queryRunner.rollbackTransaction();
          return response
            .status(404)
            .json({ success: false, message: "Inquiry not found" });
        }
      }

      // Derived, not client-supplied. If this business has no linked
      // Customer yet (star_business_details row with no matching
      // customer.starBusinessDetailsId), customer stays null — that's a
      // pre-existing data gap, not something this endpoint should block on.
      const customer = await resolveCustomerForBusiness(
        queryRunner.manager,
        businessId,
      );

      // Resolve or create the master Item (single source of truth for
      // the shared fields listed in ITEM_FIELD_MAP).
      const item = await ItemLinkService.resolveItem(queryRunner, body);

      const ownFields = toOwnFields(body);
      // itemName is item data now — but the RequestedItem column is still
      // NOT NULL in the DB (no migration for that yet), so it has to be
      // written on insert regardless. This is a mirror only: every read
      // in this controller shows item.item_name via withItemFields, this
      // column is never consulted again.
      const requestedItemData: DeepPartial<RequestedItem> = {
        ...ownFields,
        business,
        customer,
        contactPerson,
        contactPersonId: contactPersonId || null,
        inquiry,
        item,
        itemId: item.id,
        itemName: item.item_name || itemName || "",
        extraItems: body.extraItems || "NO",
        interval: body.interval || "Monatlich",
        priority: body.priority || "Normal",
        requestStatus: body.requestStatus || "Open",
      };

      const requestedItem = requestedItemRepo.create(requestedItemData);
      const savedItem = await requestedItemRepo.save(requestedItem);

      await queryRunner.commitTransaction();

      const itemWithRelations = await this.requestedItemRepository.findOne({
        where: { id: savedItem.id },
        relations: [
          "business",
          "customer",
          "contactPerson",
          "inquiry",
          "tags",
          "parent",
          "taricRel",
          "category",
          "supplier",
          "item",
          "item.category",
          "item.supplier",
        ],
      });

      return response.status(201).json({
        success: true,
        message: "Requested item created successfully",
        data: withItemFields({
          ...itemWithRelations,
          business: withNestedCustomer(
            itemWithRelations?.business,
            itemWithRelations?.customer,
          ),
        }),
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ItemLinkError) {
        return response
          .status(error.status)
          .json({ success: false, message: error.message });
      }
      console.error("Error creating requested item:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    } finally {
      await queryRunner.release();
    }
  }

  async updateRequestedItem(request: Request, response: Response) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { id } = request.params;
      const body = request.body;

      const requestedItemRepo =
        queryRunner.manager.getRepository(RequestedItem);
      const businessRepo =
        queryRunner.manager.getRepository(StarBusinessDetails);
      const contactRepo = queryRunner.manager.getRepository(ContactPerson);
      const inquiryRepo = queryRunner.manager.getRepository(Inquiry);

      const existingItem = await requestedItemRepo.findOne({
        where: { id },
        relations: [
          "business",
          "customer",
          "contactPerson",
          "inquiry",
          "tags",
          "item",
        ],
      });

      if (!existingItem) {
        await queryRunner.rollbackTransaction();
        return response
          .status(404)
          .json({ success: false, message: "Requested item not found" });
      }

      let contactPerson: ContactPerson | null | undefined = undefined;
      if (body.contactPersonId !== undefined) {
        if (body.contactPersonId) {
          contactPerson = await contactRepo.findOne({
            where: { id: body.contactPersonId },
          });
          if (!contactPerson) {
            await queryRunner.rollbackTransaction();
            return response
              .status(404)
              .json({ success: false, message: "Contact person not found" });
          }
        } else {
          contactPerson = null;
        }
      }

      let inquiry: Inquiry | null | undefined = undefined;
      if (body.inquiryId !== undefined) {
        if (body.inquiryId) {
          inquiry = await inquiryRepo.findOne({
            where: { id: body.inquiryId },
          });
          if (!inquiry) {
            await queryRunner.rollbackTransaction();
            return response
              .status(404)
              .json({ success: false, message: "Inquiry not found" });
          }
        } else {
          inquiry = null;
        }
      }

      // If businessId changes, re-derive customer from the new business.
      // Otherwise, backfill customer for legacy rows that predate this
      // field (existingItem.customer is null but business is unchanged).
      let customer: Customer | null | undefined = undefined;
      if (
        body.businessId !== undefined &&
        body.businessId !== existingItem.businessId
      ) {
        const newBusiness = await businessRepo.findOne({
          where: { id: body.businessId },
        });
        if (!newBusiness) {
          await queryRunner.rollbackTransaction();
          return response
            .status(404)
            .json({ success: false, message: "Business not found" });
        }
        customer = await resolveCustomerForBusiness(
          queryRunner.manager,
          body.businessId,
        );
      } else if (!existingItem.customer) {
        customer = await resolveCustomerForBusiness(
          queryRunner.manager,
          existingItem.businessId,
        );
      }

      // --- Item resolution ---
      // 1. payload.itemId given and differs from current link -> re-link to that (existing) Item.
      // 2. payload has no itemId but the RequestedItem already has one -> sync shared fields onto it.
      // 3. RequestedItem predates this migration (no item link yet) -> backfill a draft Item from
      //    whatever shared-field values already sit on this row, then apply payload overrides.
      let linkedItem: Item;
      if (body.itemId !== undefined && body.itemId !== existingItem.itemId) {
        linkedItem = await ItemLinkService.resolveItem(queryRunner, body);
      } else if (existingItem.item) {
        linkedItem = await ItemLinkService.syncItemFields(
          queryRunner,
          existingItem.item,
          body,
        );
      } else {
        const baseFields: Record<string, any> = {};
        for (const key of SHARED_KEYS) {
          if ((existingItem as any)[key] !== undefined)
            baseFields[key] = (existingItem as any)[key];
        }
        linkedItem = await ItemLinkService.backfillItem(
          queryRunner,
          baseFields,
          body,
        );
      }

      const updateData: Record<string, any> = toOwnFields(body);

      updateData.itemId = linkedItem.id;
      if (contactPerson !== undefined) {
        updateData.contactPersonId = contactPerson ? contactPerson.id : null;
      }
      if (inquiry !== undefined) {
        updateData.inquiry = inquiry;
      }
      if (customer !== undefined) {
        updateData.customer = customer;
        updateData.customerId = customer ? customer.id : null;
      }

      await requestedItemRepo.update(id, updateData);

      await queryRunner.commitTransaction();

      const updatedItem = await this.requestedItemRepository.findOne({
        where: { id },
        relations: [
          "business",
          "customer",
          "contactPerson",
          "inquiry",
          "tags",
          "parent",
          "taricRel",
          "category",
          "supplier",
          "item",
          "item.category",
          "item.supplier",
        ],
      });

      return response.status(200).json({
        success: true,
        message: "Requested item updated successfully",
        data: withItemFields({
          ...updatedItem,
          business: withNestedCustomer(
            updatedItem?.business,
            updatedItem?.customer,
          ),
        }),
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ItemLinkError) {
        return response
          .status(error.status)
          .json({ success: false, message: error.message });
      }
      console.error("Error updating requested item:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    } finally {
      await queryRunner.release();
    }
  }

  async deleteRequestedItem(request: Request, response: Response) {
    try {
      const { id } = request.params;

      const item = await this.requestedItemRepository.findOne({
        where: { id },
      });
      if (!item) {
        return response
          .status(404)
          .json({ success: false, message: "Requested item not found" });
      }

      const linkedLineItem = await this.offerLineItemRepository
        .createQueryBuilder("lineItem")
        .leftJoinAndSelect("lineItem.offer", "offer")
        .where("lineItem.requestedItemId = :id", { id })
        .getOne();

      if (linkedLineItem) {
        return response.status(409).json({
          success: false,
          message: `Cannot delete requested item: it is used in offer "${linkedLineItem.offer?.offerNumber}". Remove it from the offer first.`,
        });
      }

      await this.requestedItemRepository.remove(item);

      return response.status(200).json({
        success: true,
        message: "Requested item deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting requested item:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async getRequestedItemsByBusiness(request: Request, response: Response) {
    try {
      const { businessId } = request.params;
      const {
        page = 1,
        limit = 10,
        status,
        priority,
        minWeight,
        maxWeight,
        hasDimensions,
      } = request.query;

      const business = await this.businessRepository.findOne({
        where: { id: businessId },
      });
      if (!business) {
        return response
          .status(404)
          .json({ success: false, message: "Business not found" });
      }

      const queryBuilder = this.requestedItemRepository
        .createQueryBuilder("requestedItem")
        .leftJoinAndSelect("requestedItem.business", "business")
        .leftJoinAndSelect("requestedItem.customer", "customer")
        .leftJoinAndSelect("requestedItem.contactPerson", "contactPerson")
        .leftJoinAndSelect("requestedItem.inquiry", "inquiry")
        .leftJoinAndSelect("requestedItem.tags", "tags")
        .leftJoinAndSelect("requestedItem.item", "item")
        .where("requestedItem.businessId = :businessId", { businessId })
        .orderBy("requestedItem.createdAt", "DESC");

      if (status) {
        queryBuilder.andWhere("requestedItem.requestStatus = :status", {
          status,
        });
      }
      if (priority) {
        queryBuilder.andWhere("requestedItem.priority = :priority", {
          priority,
        });
      }
      if (minWeight) {
        queryBuilder.andWhere("item.weight >= :minWeight", {
          minWeight: parseFloat(minWeight as string),
        });
      }
      if (maxWeight) {
        queryBuilder.andWhere("item.weight <= :maxWeight", {
          maxWeight: parseFloat(maxWeight as string),
        });
      }
      if (hasDimensions === "true") {
        queryBuilder.andWhere(
          "(item.weight IS NOT NULL OR item.width IS NOT NULL OR item.height IS NOT NULL OR item.length IS NOT NULL)",
        );
      } else if (hasDimensions === "false") {
        queryBuilder.andWhere(
          "(item.weight IS NULL AND item.width IS NULL AND item.height IS NULL AND item.length IS NULL)",
        );
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [items, total] = await queryBuilder
        .skip(skip)
        .take(Number(limit))
        .getManyAndCount();

      return response.status(200).json({
        success: true,
        data: items.map((item) =>
          withItemFields({
            ...item,
            business: withNestedCustomer(item.business, item.customer),
          }),
        ),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching requested items by business:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async getRequestedItemsByInquiry(request: Request, response: Response) {
    try {
      const { inquiryId } = request.params;
      const { page = 1, limit = 10, status, priority } = request.query;

      const inquiry = await this.inquiryRepository.findOne({
        where: { id: inquiryId },
      });
      if (!inquiry) {
        return response
          .status(404)
          .json({ success: false, message: "Inquiry not found" });
      }

      const queryBuilder = this.requestedItemRepository
        .createQueryBuilder("requestedItem")
        .leftJoinAndSelect("requestedItem.business", "business")
        .leftJoinAndSelect("requestedItem.customer", "customer")
        .leftJoinAndSelect("requestedItem.contactPerson", "contactPerson")
        .leftJoinAndSelect("requestedItem.inquiry", "inquiry")
        .leftJoinAndSelect("requestedItem.tags", "tags")
        .leftJoinAndSelect("requestedItem.item", "item")
        .where("requestedItem.inquiry.id = :inquiryId", { inquiryId })
        .orderBy("requestedItem.createdAt", "DESC");

      if (status) {
        queryBuilder.andWhere("requestedItem.requestStatus = :status", {
          status,
        });
      }
      if (priority) {
        queryBuilder.andWhere("requestedItem.priority = :priority", {
          priority,
        });
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [items, total] = await queryBuilder
        .skip(skip)
        .take(Number(limit))
        .getManyAndCount();

      return response.status(200).json({
        success: true,
        data: items.map((item) =>
          withItemFields({
            ...item,
            business: withNestedCustomer(item.business, item.customer),
          }),
        ),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching requested items by inquiry:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async calculateItemVolume(request: Request, response: Response) {
    try {
      const { id } = request.params;

      const requestedItem = await this.requestedItemRepository.findOne({
        where: { id },
        relations: ["item"],
      });

      if (!requestedItem) {
        return response
          .status(404)
          .json({ success: false, message: "Requested item not found" });
      }

      const dims = requestedItem.item;
      let volume: number | null = null;
      let volumeMessage = "Cannot calculate volume";

      if (dims?.length && dims?.width && dims?.height) {
        volume =
          parseFloat(dims.length.toString()) *
          parseFloat(dims.width.toString()) *
          parseFloat(dims.height.toString());
        volumeMessage = `Volume calculated: ${volume.toFixed(3)} cubic units`;
      } else {
        volumeMessage =
          "Missing dimension data on the linked item (length, width, or height)";
      }

      return response.status(200).json({
        success: true,
        data: {
          itemId: requestedItem.id,
          itemName: dims?.item_name,
          dimensions: {
            length: dims?.length,
            width: dims?.width,
            height: dims?.height,
          },
          volume,
          message: volumeMessage,
        },
      });
    } catch (error) {
      console.error("Error calculating item volume:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async bulkUpdateDimensions(request: Request, response: Response) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { items } = request.body;

      if (!Array.isArray(items) || items.length === 0) {
        await queryRunner.rollbackTransaction();
        return response.status(400).json({
          success: false,
          message: "Items array is required and cannot be empty",
        });
      }

      const requestedItemRepo =
        queryRunner.manager.getRepository(RequestedItem);
      const itemRepo = queryRunner.manager.getRepository(Item);

      const results: any[] = [];
      const errors: any[] = [];

      for (const itemData of items) {
        const { id, weight, width, height, length } = itemData;

        if (!id) {
          errors.push({ itemData, error: "Missing item ID" });
          continue;
        }

        try {
          const requestedItem = await requestedItemRepo.findOne({
            where: { id },
            relations: ["item"],
          });

          if (!requestedItem) {
            errors.push({ id, error: "Requested item not found" });
            continue;
          }

          if (!requestedItem.item) {
            errors.push({
              id,
              error: "Requested item has no linked Item to update",
            });
            continue;
          }

          const dimUpdate: Partial<Item> = {};
          if (weight !== undefined) dimUpdate.weight = weight;
          if (width !== undefined) dimUpdate.width = width;
          if (height !== undefined) dimUpdate.height = height;
          if (length !== undefined) dimUpdate.length = length;

          await itemRepo.update(requestedItem.item.id, dimUpdate);

          const updatedItem = await itemRepo.findOne({
            where: { id: requestedItem.item.id },
          });

          results.push({ id, success: true, data: updatedItem });
        } catch (error) {
          errors.push({
            id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      if (errors.length > 0 && results.length === 0) {
        await queryRunner.rollbackTransaction();
        return response.status(400).json({
          success: false,
          message: "No items were updated",
          data: { updated: [], errors },
        });
      }

      await queryRunner.commitTransaction();

      return response.status(200).json({
        success: true,
        message: `Updated ${results.length} items successfully`,
        data: {
          updated: results,
          errors: errors.length > 0 ? errors : undefined,
        },
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Error in bulk update dimensions:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    } finally {
      await queryRunner.release();
    }
  }

  async getItemsWithMissingDimensions(request: Request, response: Response) {
    try {
      const { page = 1, limit = 10, businessId } = request.query;

      const queryBuilder = this.requestedItemRepository
        .createQueryBuilder("requestedItem")
        .leftJoinAndSelect("requestedItem.business", "business")
        .leftJoinAndSelect("requestedItem.customer", "customer")
        .leftJoinAndSelect("requestedItem.contactPerson", "contactPerson")
        .leftJoinAndSelect("requestedItem.item", "item")
        .where(
          "(item.weight IS NULL OR item.width IS NULL OR item.height IS NULL OR item.length IS NULL OR item.id IS NULL)",
        )
        .orderBy("requestedItem.createdAt", "DESC");

      if (businessId) {
        queryBuilder.andWhere("requestedItem.businessId = :businessId", {
          businessId,
        });
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [items, total] = await queryBuilder
        .skip(skip)
        .take(Number(limit))
        .getManyAndCount();

      return response.status(200).json({
        success: true,
        data: items.map((item) =>
          withItemFields({
            ...item,
            business: withNestedCustomer(item.business, item.customer),
          }),
        ),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
        summary: {
          totalMissingDimensionItems: total,
          message: "Items with missing dimension data on the linked item",
        },
      });
    } catch (error) {
      console.error("Error fetching items with missing dimensions:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
}

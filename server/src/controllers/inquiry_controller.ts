import { Request, Response } from "express";
import { Inquiry } from "../models/inquiry";
import { DeliveryAddress } from "../models/inquiry";
import { Customer } from "../models/customers";
import { ContactPerson } from "../models/contact_person";
import { AppDataSource } from "../config/database";
import { RequestedItem } from "../models/requested_items";
import { Taric } from "../models/tarics";
import { Item } from "../models/items";
import { StarBusinessDetails } from "../models/star_business_details";
import { Category } from "../models/categories";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { UserRole } from "../models/users";
import { filterDataByRole } from "../utils/dataFilter";
import { AuthorizedRequest } from "../middlewares/authorized";

import { IsOptional, IsString, IsNumber, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";
import { DeepPartial } from "typeorm";
import { Offer } from "../models/offer";
import {
  ItemLinkService,
  ItemLinkError,
  toRequestedItemOwnFields,
} from "../services/item_link_service";

export class BaseItemConversionDto {
  @IsOptional()
  @Type(() => Number)
  taricId?: number;

  @IsOptional()
  @Type(() => Number)
  catId?: number;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  suppCat?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  height?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  length?: number;

  @IsOptional()
  @IsString()
  itemNameCN?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  FOQ?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  FSQ?: number;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  RMBPrice?: number;

  @IsOptional()
  @IsString({ each: true })
  painPoints?: string[];

  @IsOptional()
  @IsString()
  note?: string;
}

export class ConvertInquiryToItemDto extends BaseItemConversionDto {}

// REMOVED: ConvertRequestToItemDto — was the DTO for
// InquiryController.convertRequestToItem, which is deleted below. See the
// removal note at the top of this response for what still needs a follow-up
// pass (route registration, api/inquiry.ts, and the three frontend call
// sites that depended on this endpoint).

export class ItemGenerator {
  static async generateTaricCode(): Promise<string> {
    const taricRepository = AppDataSource.getRepository(Taric);

    const taricList = await taricRepository
      .createQueryBuilder("taric")
      .select(["taric.code"])
      .getMany();
    let maxCode = 0;
    for (const t of taricList) {
      if (t.code && /^\d+$/.test(t.code)) {
        const num = parseInt(t.code, 10);
        if (!isNaN(num) && num > maxCode) {
          maxCode = num;
        }
      }
    }
    const nextCode = maxCode + 1;

    return nextCode.toString().padStart(11, "0");
  }
  static async generateItemId(): Promise<number> {
    const itemRepository = AppDataSource.getRepository(Item);

    const highestItem = await itemRepository
      .createQueryBuilder("item")
      .select("MAX(item.id)", "maxId")
      .getRawOne();

    return (highestItem?.maxId || 0) + 1;
  }
  static generateEAN(itemId: number): number {
    const prefix = 789;
    const timestamp = Date.now() % 1000000;
    const baseNumber = parseInt(
      `${itemId.toString().padStart(6, "0")}${timestamp
        .toString()
        .padStart(6, "0")}`.slice(0, 9),
    );

    const eanWithoutCheck = `${prefix}${baseNumber
      .toString()
      .padStart(9, "0")}`;
    const checkDigit = this.calculateEANCheckDigit(eanWithoutCheck);

    return parseInt(`${eanWithoutCheck}${checkDigit}`);
  }

  private static calculateEANCheckDigit(code: string): number {
    let sum = 0;

    for (let i = 0; i < code.length; i++) {
      const digit = parseInt(code[i]);
      sum += i % 2 === 0 ? digit * 1 : digit * 3;
    }

    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
  }

  static async createTaricForItem(itemName: string): Promise<Taric> {
    const taricRepository = AppDataSource.getRepository(Taric);

    const highestTaricId = await taricRepository
      .createQueryBuilder("taric")
      .select("MAX(taric.id)", "maxId")
      .getRawOne();

    const newTaricId = (highestTaricId?.maxId || 0) + 1;
    const taricCode = await this.generateTaricCode();

    const taric = taricRepository.create({
      id: newTaricId,
      code: taricCode,
      reguler_artikel: "Y",
      duty_rate: 0,
      name_de: itemName,
      description_de: itemName,
      name_en: itemName,
      description_en: itemName,
      name_cn: itemName,
    });

    return await taricRepository.save(taric);
  }
}

function calcAnnualPotential(
  qty: number,
  targetPrice: number,
  interval?: string,
) {
  let factor = 12;
  const normalized = (interval || "Monatlich").toLowerCase().trim();
  if (
    normalized === "jährlich" ||
    normalized === "jaehrlich" ||
    normalized === "yearly"
  ) {
    factor = 1;
  } else if (
    normalized === "halbjährlich" ||
    normalized === "halbjaehrlich" ||
    normalized === "half-yearly" ||
    normalized === "half yearly" ||
    normalized === "biannually"
  ) {
    factor = 2;
  } else if (normalized === "quartal" || normalized === "quarterly") {
    factor = 4;
  } else if (normalized === "2 monatlich" || normalized === "bimonthly") {
    factor = 6;
  } else if (normalized === "monatlich" || normalized === "monthly") {
    factor = 12;
  }
  const annualPotential = qty * targetPrice * factor;
  return { annualPotential, annualPotentialKEur: annualPotential / 1000 };
}

export class InquiryController {
  private inquiryRepository: any = AppDataSource.getRepository(Inquiry);
  private offerRepository: any = AppDataSource.getRepository(Offer);
  private requestRepository: any = AppDataSource.getRepository(RequestedItem);
  private customerRepository: any = AppDataSource.getRepository(Customer);
  private contactPersonRepository: any =
    AppDataSource.getRepository(ContactPerson);

  private getLetterSuffix(index: number): string {
    let suffix = "";
    let temp = index;
    while (temp >= 0) {
      suffix = String.fromCharCode((temp % 26) + 97) + suffix;
      temp = Math.floor(temp / 26) - 1;
    }
    return suffix;
  }

  private async getNextInquiryNo(): Promise<string> {
    try {
      const { NumberSequenceService } =
        await import("../services/number_sequence_service");
      return await NumberSequenceService.getNextNumber("inquiry");
    } catch (e) {
      const currentYear = new Date().getFullYear();
      const yearSuffix = currentYear.toString().slice(-2);
      const prefix = `AF${yearSuffix}-`;

      const allInquiries = await this.inquiryRepository
        .createQueryBuilder("inquiry")
        .select(["inquiry.inquiryNo"])
        .where("inquiry.inquiryNo LIKE :prefix", { prefix: `AF%` })
        .getMany();

      let maxSeq = 0;
      for (const inq of allInquiries) {
        if (inq.inquiryNo) {
          const parts = inq.inquiryNo.split("-");
          const num = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
      return `${prefix}${maxSeq + 1}`;
    }
  }

  async getAllInquiries(request: Request, response: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        customerId,
        status,
        priority,
        contactPersonId,
        isAssembly,
        tags,
      } = request.query;

      const queryBuilder = this.inquiryRepository
        .createQueryBuilder("inquiry")
        .leftJoinAndSelect("inquiry.customer", "customer")
        .leftJoinAndSelect("inquiry.contactPerson", "contactPerson")
        .leftJoinAndSelect("inquiry.item", "inquiryItem")
        .leftJoinAndSelect("inquiry.requests", "requests")
        .leftJoinAndSelect("requests.business", "business")
        .leftJoinAndSelect("business.customer", "businessCustomer")
        .leftJoinAndSelect("requests.contactPerson", "requestContactPerson")
        .leftJoinAndSelect("requests.item", "requestItem")
        .leftJoinAndSelect("requests.tags", "requestTags")
        .leftJoinAndSelect("inquiry.tags", "tags")
        .select([
          "inquiry",
          "customer",
          "contactPerson",
          "inquiryItem",
          "requests",
          "business",
          "businessCustomer.companyName",
          "businessCustomer.id",
          "requestContactPerson.name",
          "requestContactPerson.familyName",
          "requestContactPerson.id",
          "requestItem",
          "requestTags",
          "tags",
        ])
        .orderBy("inquiry.createdAt", "DESC");

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
              .from(Inquiry, "c")
              .innerJoin("c.tags", "t")
              .where("t.id IN (:...inquiryIncludeTagIds)")
              .groupBy("c.id")
              .having("COUNT(t.id) = :inquiryIncludeCount");
            return `inquiry.id IN ${subQuery.getQuery()}`;
          });
          queryBuilder.setParameter("inquiryIncludeTagIds", includeTagIds);
          queryBuilder.setParameter(
            "inquiryIncludeCount",
            includeTagIds.length,
          );
        }

        if (excludeTagIds.length > 0) {
          queryBuilder.andWhere((qb: any) => {
            const subQuery = qb
              .subQuery()
              .select("c.id")
              .from(Inquiry, "c")
              .innerJoin("c.tags", "t")
              .where("t.id IN (:...inquiryExcludeTagIds)");
            return `inquiry.id NOT IN ${subQuery.getQuery()}`;
          });
          queryBuilder.setParameter("inquiryExcludeTagIds", excludeTagIds);
        }
      }

      if (customerId) {
        queryBuilder.andWhere("inquiry.customerId = :customerId", {
          customerId,
        });
      }

      if (status) {
        queryBuilder.andWhere("inquiry.status = :status", {
          status,
        });
      }

      if (priority) {
        queryBuilder.andWhere("inquiry.priority = :priority", {
          priority,
        });
      }

      if (contactPersonId) {
        queryBuilder.andWhere("inquiry.contactPersonId = :contactPersonId", {
          contactPersonId,
        });
      }

      if (isAssembly !== undefined) {
        queryBuilder.andWhere("inquiry.isAssembly = :isAssembly", {
          isAssembly: isAssembly === "true",
        });
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [inquiries, total] = await queryBuilder
        .skip(skip)
        .take(Number(limit))
        .getManyAndCount();

      const user = (request as AuthorizedRequest).user;
      const filteredData = filterDataByRole(
        inquiries,
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
      console.error("Error fetching inquiries:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getInquiryById(request: Request, response: Response) {
    try {
      const { id } = request.params;

      const inquiry = await this.inquiryRepository.findOne({
        where: { id },
        relations: [
          "customer",
          "contactPerson",
          "item",
          "requests",
          "requests.item",
          "tags",
        ],
      });

      if (!inquiry) {
        return response.status(404).json({
          success: false,
          message: "Inquiry not found",
        });
      }

      const user = (request as AuthorizedRequest).user;
      const filteredData = filterDataByRole(
        inquiry,
        user?.role || UserRole.STAFF,
      );

      return response.status(200).json({
        success: true,
        data: filteredData,
      });
    } catch (error) {
      console.error("Error fetching inquiry:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async createInquiry(request: Request, response: Response) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const body = request.body;
      const {
        name,
        description,
        image,
        isAssembly,
        customerId,
        isEstimated,
        contactPersonId,
        status,
        priority,
        referenceNumber,
        requiredByDate,
        internalNotes,
        termsConditions,
        projectLink,
        asanaLink,
        assemblyInstructions,
        weight,
        width,
        height,
        length,
        itemNo,
        urgency1,
        urgency2,
        painPoints,
        isFragile,
        requiresSpecialHandling,
        handlingInstructions,
        numberOfPackages,
        packageType,
        purchasePrice,
        purchasePriceCurrency,
        taric,
        requests,
        total_potential_k_eur,
        next_followup_at,
        owner_user_id,
        next_action,
        itemId,
      } = body;

      console.log(requests);
      if (!name || !customerId) {
        await queryRunner.rollbackTransaction();
        return response.status(400).json({
          success: false,
          message: "Missing required fields: name and customerId are required",
        });
      }

      const customerRepo = queryRunner.manager.getRepository(Customer);
      const contactRepo = queryRunner.manager.getRepository(ContactPerson);
      const inquiryRepo = queryRunner.manager.getRepository(Inquiry);
      const requestRepo = queryRunner.manager.getRepository(RequestedItem);
      const starBusinessDetailsRepo =
        queryRunner.manager.getRepository(StarBusinessDetails);
      const categoryRepo = queryRunner.manager.getRepository(Category);

      const customer = await customerRepo.findOne({
        where: { id: customerId },
        relations: ["starBusinessDetails"],
      });

      if (!customer) {
        await queryRunner.rollbackTransaction();
        return response.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      let contactPerson: ContactPerson | null = null;
      if (contactPersonId) {
        contactPerson = await contactRepo.findOne({
          where: { id: contactPersonId },
        });

        if (!contactPerson) {
          await queryRunner.rollbackTransaction();
          return response.status(404).json({
            success: false,
            message: "Contact person not found",
          });
        }
      }

      const inquiryNo = await this.getNextInquiryNo();

      // Resolve/create the master Item for the inquiry itself — assembly
      // inquiries only, per the single-source-of-truth spec. Inquiry's own
      // column names don't match RequestedItem's 1:1 (name vs itemName,
      // purchasePriceCurrency vs currency, image vs photo), so translate
      // before handing off to ItemLinkService, which reads by the
      // RequestedItem-shaped key names in ITEM_FIELD_MAP.
      let inquiryItem: Item | null = null;
      if (isAssembly) {
        inquiryItem = await ItemLinkService.resolveItem(queryRunner, {
          itemId,
          itemName: name,
          weight,
          width,
          height,
          length,
          purchasePrice,
          currency: purchasePriceCurrency,
          taric,
          photo: image,
        } as any);
      }

      const inquiry = inquiryRepo.create({
        name,
        description,
        image,
        isAssembly: isAssembly || false,
        inquiryNo,
        customer,
        contactPerson,
        status: status || "Draft",
        priority: priority || "Medium",
        referenceNumber,
        requiredByDate,
        internalNotes,
        termsConditions,
        projectLink,
        asanaLink,
        assemblyInstructions,
        weight,
        width,
        height,
        length,
        itemNo,
        urgency1,
        urgency2,
        painPoints,
        isEstimated,
        isFragile: isFragile || false,
        requiresSpecialHandling: requiresSpecialHandling || false,
        handlingInstructions,
        numberOfPackages,
        packageType,
        purchasePrice,
        purchasePriceCurrency,
        total_potential_k_eur,
        next_followup_at: next_followup_at || null,
        owner_user_id,
        next_action,
        item: inquiryItem,
        itemId: inquiryItem?.id,
      } as DeepPartial<Inquiry>);

      const savedInquiry = await inquiryRepo.save(inquiry);

      if (requests && Array.isArray(requests) && requests.length > 0) {
        let starBusinessDetails = customer.starBusinessDetails;
        if (!starBusinessDetails) {
          starBusinessDetails = starBusinessDetailsRepo.create({
            customer: customer,
          });
          await starBusinessDetailsRepo.save(starBusinessDetails);
        }

        let defaultProCatId: number | undefined = undefined;
        try {
          const proCat = await categoryRepo.findOne({
            where: { name: "PRO" },
          });
          if (proCat) {
            defaultProCatId = proCat.id;
          }
        } catch (e) {
          console.error("Failed to fetch default PRO category:", e);
        }

        let computedTotalPotentialKEur = 0;
        const requestEntities: RequestedItem[] = [];

        for (let index = 0; index < requests.length; index++) {
          const reqData = requests[index];
          const currentQty = reqData.qty || reqData.quantity;

          const qtyVal = parseInt(currentQty || "0", 10) || 0;
          const targetPriceVal = parseFloat(reqData.targetPrice) || 0;
          const { annualPotential, annualPotentialKEur } = calcAnnualPotential(
            qtyVal,
            targetPriceVal,
            reqData.interval,
          );
          computedTotalPotentialKEur += annualPotentialKEur;

          const letterSuffix = this.getLetterSuffix(index);
          let assignedItemNo = `${savedInquiry.inquiryNo || "AF"}${letterSuffix}`;
          if (
            reqData.itemNo &&
            typeof reqData.itemNo === "string" &&
            reqData.itemNo.trim()
          ) {
            const rawNo = reqData.itemNo.trim();
            if (
              savedInquiry.inquiryNo &&
              rawNo.startsWith(savedInquiry.inquiryNo)
            ) {
              assignedItemNo = rawNo.replace(/^(.+)-([a-z])$/i, "$1$2");
            } else if (/^[a-z]$/i.test(rawNo)) {
              assignedItemNo = `${savedInquiry.inquiryNo || "AF"}${rawNo.toLowerCase()}`;
            } else if (rawNo !== String(index + 1).padStart(3, "0")) {
              assignedItemNo = rawNo;
            }
          }

          const reqItem = await ItemLinkService.resolveItem(queryRunner, {
            ...reqData,
            itemNo: assignedItemNo,
            cat_id: reqData.cat_id || defaultProCatId,
          });

          const ownFields = toRequestedItemOwnFields(reqData);
          const requestItem = requestRepo.create({
            ...ownFields,
            itemNo: assignedItemNo,
            businessId: starBusinessDetails.id,
            business: starBusinessDetails,
            inquiry: savedInquiry,
            qty: currentQty,
            targetPrice: reqData.targetPrice || null,
            annualPotential,
            annualPotentialKEur,
            item: reqItem,
            itemId: reqItem.id,
            // itemName column is still NOT NULL in the DB; mirror only —
            // every read resolves the real value from reqItem.item_name.
            itemName: reqItem.item_name || reqData.itemName || "",
          } as DeepPartial<RequestedItem>);

          requestEntities.push(requestItem);
        }

        await requestRepo.save(requestEntities);

        savedInquiry.total_potential_k_eur = computedTotalPotentialKEur;
        await inquiryRepo.save(savedInquiry);
      }

      await queryRunner.commitTransaction();

      const completeInquiry = await this.inquiryRepository.findOne({
        where: { id: savedInquiry.id },
        relations: [
          "customer",
          "contactPerson",
          "item",
          "requests",
          "requests.item",
          "tags",
        ],
      });

      const user = (request as AuthorizedRequest).user;
      const filteredData = filterDataByRole(
        completeInquiry,
        user?.role || UserRole.STAFF,
      );

      return response.status(201).json({
        success: true,
        message: "Inquiry created successfully",
        data: filteredData,
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ItemLinkError) {
        return response
          .status(error.status)
          .json({ success: false, message: error.message });
      }
      console.error("Error creating inquiry:", error);
      if (error instanceof Error) {
        console.error("Stack trace:", error.stack);
      }
      return response.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Ensures every RequestedItem line saved here has a backing Item row,
   * created as a draft (isDraft: true) the first time this request is
   * saved. updateInquiry deletes and recreates every RequestedItem on
   * every save, so without reusing an existing linked Item, every single
   * edit to an inquiry would leave behind a new orphaned draft Item for
   * each request line. If reqData carries a reference to an Item it was
   * already linked to (itemId, from the previous save round-tripped back
   * by the frontend), that Item is updated in place instead.
   */
  private async resolveOrCreateDraftItemForRequest(
    reqData: any,
    assignedItemNo: string,
    catId: number | undefined,
    fallbackItemId?: number,
  ): Promise<Item> {
    const itemRepo = AppDataSource.getRepository(Item);

    const existingItemId =
      reqData.itemId ||
      reqData.item_id ||
      reqData.item?.id ||
      fallbackItemId ||
      undefined;

    const fields: Partial<Item> = {
      item_name: reqData.itemName || undefined,
      item_name_cn: reqData.itemNameCN || reqData.item_name_cn || undefined,
      item_no_de: assignedItemNo,
      model: reqData.model || undefined,
      material: reqData.material || undefined,
      specification: reqData.specification || undefined,
      weight:
        reqData.weight !== undefined && reqData.weight !== null
          ? Number(reqData.weight)
          : undefined,
      width:
        reqData.width !== undefined && reqData.width !== null
          ? Number(reqData.width)
          : undefined,
      height:
        reqData.height !== undefined && reqData.height !== null
          ? Number(reqData.height)
          : undefined,
      length:
        reqData.length !== undefined && reqData.length !== null
          ? Number(reqData.length)
          : undefined,
      price:
        reqData.purchasePrice !== undefined && reqData.purchasePrice !== null
          ? Number(reqData.purchasePrice)
          : undefined,
      currency: reqData.currency || undefined,
      photo: reqData.photo || reqData.picture || undefined,
      remark: reqData.comment || reqData.extraNote || undefined,
      cat_id: catId,
    };

    if (existingItemId) {
      const existing = await itemRepo.findOne({
        where: { id: Number(existingItemId) },
      });
      if (existing) {
        Object.assign(existing, fields);
        return itemRepo.save(existing);
      }
    }

    // Creation-time-only defaults — item_name_de and sales_price are
    // taken from the request item ONLY when the backing Item is first
    // created here. They're deliberately left out of `fields` above, so
    // Object.assign(existing, fields) on the update branch never
    // overwrites either value on an Item that already exists.
    const salesPriceFromTarget =
      reqData.targetPrice !== undefined &&
      reqData.targetPrice !== null &&
      reqData.targetPrice !== ""
        ? Number(reqData.targetPrice)
        : undefined;

    const created = itemRepo.create({
      ...fields,
      item_name_de: reqData.itemName || undefined,
      sales_price:
        salesPriceFromTarget !== undefined && !isNaN(salesPriceFromTarget)
          ? salesPriceFromTarget
          : undefined,
      supplier_id: reqData.supplier_id ?? reqData.supplierId ?? 1,
      isDraft: true,
      isActive: "Y",
      is_new: "Y",
    });
    return itemRepo.save(created);
  }

  async updateInquiry(request: Request, response: Response) {
    try {
      const { id } = request.params;
      console.log(
        "DEBUG: updateInquiry called with id:",
        id,
        "body requests:",
        JSON.stringify(request.body.requests),
      );
      const {
        name,
        description,
        image,
        isAssembly,
        contactPersonId,
        status,
        priority,
        referenceNumber,
        isEstimated,
        requiredByDate,
        internalNotes,
        termsConditions,
        projectLink,
        asanaLink,
        assemblyInstructions,
        weight,
        width,
        height,
        length,
        itemNo,
        urgency1,
        urgency2,
        painPoints,
        isFragile,
        requiresSpecialHandling,
        handlingInstructions,
        numberOfPackages,
        packageType,
        purchasePrice,
        purchasePriceCurrency,
        requests,
        total_potential_k_eur,
        next_followup_at,
        owner_user_id,
        next_action,
      } = request.body;
      const existingInquiry = await this.inquiryRepository.findOne({
        where: { id },
        relations: [
          "customer",
          "contactPerson",
          "requests",
          "customer.starBusinessDetails",
        ],
      });
      if (!existingInquiry) {
        return response.status(404).json({
          success: false,
          message: "Inquiry not found",
        });
      }
      let inquiryNo = existingInquiry.inquiryNo;
      if (!inquiryNo) {
        inquiryNo = await this.getNextInquiryNo();
        existingInquiry.inquiryNo = inquiryNo;
        await this.inquiryRepository.update(id, { inquiryNo });
      }
      let contactPerson = null;
      if (contactPersonId) {
        contactPerson = await this.contactPersonRepository.findOne({
          where: { id: contactPersonId },
        });
        if (!contactPerson) {
          return response.status(404).json({
            success: false,
            message: "Contact person not found",
          });
        }
      }
      const updateData: any = {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(image !== undefined && { image }),
        ...(isAssembly !== undefined && { isAssembly }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(referenceNumber !== undefined && { referenceNumber }),
        ...(requiredByDate !== undefined && { requiredByDate }),
        ...(internalNotes !== undefined && { internalNotes }),
        ...(termsConditions !== undefined && { termsConditions }),
        ...(projectLink !== undefined && { projectLink }),
        ...(asanaLink !== undefined && { asanaLink }),
        ...(assemblyInstructions !== undefined && { assemblyInstructions }),
        ...(isEstimated !== undefined && { isEstimated }),
        ...(weight !== undefined && { weight }),
        ...(width !== undefined && { width }),
        ...(height !== undefined && { height }),
        ...(length !== undefined && { length }),
        ...(itemNo !== undefined && { itemNo }),
        ...(urgency1 !== undefined && { urgency1 }),
        ...(urgency2 !== undefined && { urgency2 }),
        ...(painPoints !== undefined && { painPoints }),
        ...(isFragile !== undefined && { isFragile }),
        ...(requiresSpecialHandling !== undefined && {
          requiresSpecialHandling,
        }),
        ...(handlingInstructions !== undefined && { handlingInstructions }),
        ...(numberOfPackages !== undefined && { numberOfPackages }),
        ...(packageType !== undefined && { packageType }),
        ...(purchasePrice !== undefined && { purchasePrice }),
        ...(purchasePriceCurrency !== undefined && { purchasePriceCurrency }),
        ...(total_potential_k_eur !== undefined && { total_potential_k_eur }),
        ...(next_followup_at !== undefined && {
          next_followup_at: next_followup_at || null,
        }),
        ...(owner_user_id !== undefined && { owner_user_id }),
        ...(next_action !== undefined && { next_action }),
      };
      if (contactPersonId !== undefined) {
        updateData.contactPersonId = contactPersonId || null;
      }
      await this.inquiryRepository.update(id, updateData);
      if (requests && Array.isArray(requests)) {
        // Snapshot RequestedItem.id -> backing Item.id BEFORE deleting the
        // old rows, so a request line whose payload doesn't round-trip
        // itemId can still be matched to its already-existing Item instead
        // of spawning a duplicate draft with the same item_no_de.
        const existingItemIdByRequestId = new Map<string, number | undefined>();
        if (existingInquiry.requests) {
          for (const r of existingInquiry.requests) {
            existingItemIdByRequestId.set(
              r.id,
              r.itemId ?? (r.item as any)?.id,
            );
          }
        }

        if (existingInquiry.requests && existingInquiry.requests.length > 0) {
          await this.requestRepository.remove(existingInquiry.requests);
        }
        let total_potential_k_eur = 0;
        if (requests.length > 0) {
          let starBusinessDetails =
            existingInquiry.customer?.starBusinessDetails;
          if (!starBusinessDetails && existingInquiry.customer) {
            const starBusinessDetailsRepository =
              AppDataSource.getRepository(StarBusinessDetails);
            starBusinessDetails = starBusinessDetailsRepository.create({
              customer: existingInquiry.customer,
            });
            await starBusinessDetailsRepository.save(starBusinessDetails);
          }
          if (starBusinessDetails) {
            let defaultProCatId: number | undefined = undefined;
            try {
              const categoryRepository = AppDataSource.getRepository(Category);
              const proCat = await categoryRepository.findOne({
                where: { name: "PRO" },
              });
              if (proCat) {
                defaultProCatId = proCat.id;
              }
            } catch (e) {
              console.error("Failed to fetch default PRO category:", e);
            }
            const requestEntities = await Promise.all(
              requests.map(async (reqData: any, index: number) => {
                let totalWeight = null;
                const currentQty = reqData.qty || reqData.quantity;
                if (reqData.unitWeight && currentQty) {
                  totalWeight =
                    parseFloat(reqData.unitWeight) * parseFloat(currentQty);
                }
                const { id: _ignored, ...reqDataWithoutId } = reqData;
                const qtyVal = parseInt(currentQty || "0", 10) || 0;
                const targetPriceVal = parseFloat(reqData.targetPrice) || 0;
                let factor = 12;
                if (reqData.interval) {
                  const normalized = reqData.interval.toLowerCase().trim();
                  if (
                    normalized === "jährlich" ||
                    normalized === "jaehrlich" ||
                    normalized === "yearly"
                  ) {
                    factor = 1;
                  } else if (
                    normalized === "halbjährlich" ||
                    normalized === "halbjaehrlich" ||
                    normalized === "half-yearly" ||
                    normalized === "half yearly" ||
                    normalized === "biannually"
                  ) {
                    factor = 2;
                  } else if (
                    normalized === "quartal" ||
                    normalized === "quarterly"
                  ) {
                    factor = 4;
                  } else if (
                    normalized === "2 monatlich" ||
                    normalized === "bimonthly"
                  ) {
                    factor = 6;
                  } else if (
                    normalized === "monatlich" ||
                    normalized === "monthly"
                  ) {
                    factor = 12;
                  }
                }
                const annualPotential = qtyVal * targetPriceVal * factor;
                const annualPotentialKEur = annualPotential / 1000;
                total_potential_k_eur += annualPotentialKEur;
                const letterSuffix = this.getLetterSuffix(index);
                let assignedItemNo = `${existingInquiry.inquiryNo || "AF"}${letterSuffix}`;
                if (
                  reqData.itemNo &&
                  typeof reqData.itemNo === "string" &&
                  reqData.itemNo.trim()
                ) {
                  const rawNo = reqData.itemNo.trim();
                  if (
                    existingInquiry.inquiryNo &&
                    rawNo.startsWith(existingInquiry.inquiryNo)
                  ) {
                    assignedItemNo = rawNo.replace(/^(.+)-([a-z])$/i, "$1$2");
                  } else if (/^[a-z]$/i.test(rawNo)) {
                    assignedItemNo = `${existingInquiry.inquiryNo || "AF"}${rawNo.toLowerCase()}`;
                  } else if (rawNo !== String(index + 1).padStart(3, "0")) {
                    assignedItemNo = rawNo;
                  }
                }
                const resolvedCatId = reqData.cat_id || defaultProCatId;

                // Every RequestedItem gets a backing draft Item — created
                // fresh the first time this line is saved, or updated in
                // place if reqData still references a previously-created
                // Item (see resolveOrCreateDraftItemForRequest), falling
                // back to the pre-delete snapshot when reqData itself
                // doesn't carry the itemId for this line.
                const fallbackItemId = reqData.id
                  ? existingItemIdByRequestId.get(reqData.id)
                  : undefined;

                const draftItem = await this.resolveOrCreateDraftItemForRequest(
                  reqData,
                  assignedItemNo,
                  resolvedCatId,
                  fallbackItemId,
                );

                const requestItem = this.requestRepository.create({
                  ...reqDataWithoutId,
                  itemNo: assignedItemNo,
                  cat_id: resolvedCatId,
                  businessId: starBusinessDetails.id,
                  business: starBusinessDetails,
                  inquiry: existingInquiry,
                  qty: currentQty,
                  totalWeight: totalWeight || reqData.totalWeight,
                  targetPrice: reqData.targetPrice || null,
                  annualPotential: annualPotential,
                  annualPotentialKEur: annualPotentialKEur,
                  item: draftItem,
                  itemId: draftItem.id,
                });
                return requestItem;
              }),
            );
            await this.requestRepository.save(requestEntities);
          }
        }
        existingInquiry.total_potential_k_eur = total_potential_k_eur;
        await this.inquiryRepository.update(id, { total_potential_k_eur });
      }
      if (status && status !== existingInquiry.status) {
        const updatedInquiry = await this.inquiryRepository.findOne({
          where: { id },
          relations: ["requests"],
        });
      }
      const updatedInquiry = await this.inquiryRepository.findOne({
        where: { id },
        relations: [
          "customer",
          "contactPerson",
          "requests",
          "requests.item",
          "customer.starBusinessDetails",
          "tags",
        ],
      });
      return response.status(200).json({
        success: true,
        message: "Inquiry updated successfully",
        data: updatedInquiry,
      });
    } catch (error) {
      console.error("Error updating inquiry:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async deleteInquiry(request: Request, response: Response) {
    try {
      const { id } = request.params;
      const inquiry = await this.inquiryRepository.findOne({
        where: { id },
        relations: ["requests"],
      });

      if (!inquiry) {
        return response.status(404).json({
          success: false,
          message: "Inquiry not found",
        });
      }

      const requestedItemIds = (inquiry.requests || []).map((r: any) => r.id);

      const offerQuery = this.offerRepository
        .createQueryBuilder("offer")
        .leftJoin("offer.lineItems", "lineItem")
        .where("offer.inquiryId = :inquiryId", { inquiryId: id });

      if (requestedItemIds.length > 0) {
        offerQuery.orWhere(
          "lineItem.requestedItemId IN (:...requestedItemIds)",
          { requestedItemIds },
        );
      }

      const linkedOffer = await offerQuery.getOne();

      if (linkedOffer) {
        return response.status(409).json({
          success: false,
          message: `Cannot delete inquiry: offer "${linkedOffer.offerNumber}" is linked to this inquiry or one of its requested items. Remove or reassign the offer first.`,
        });
      }

      await this.inquiryRepository.remove(inquiry);

      return response.status(200).json({
        success: true,
        message: "Inquiry deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting inquiry:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getInquiriesByCustomer(request: Request, response: Response) {
    try {
      const { customerId } = request.params;
      const { page = 1, limit = 10, status, isAssembly } = request.query;

      const customer = await this.customerRepository.findOne({
        where: { id: customerId },
      });

      if (!customer) {
        return response.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      const queryBuilder = this.inquiryRepository
        .createQueryBuilder("inquiry")
        .leftJoinAndSelect("inquiry.customer", "customer")
        .leftJoinAndSelect("inquiry.contactPerson", "contactPerson")
        .leftJoinAndSelect("inquiry.requests", "requests")
        .where("inquiry.customerId = :customerId", { customerId })
        .orderBy("inquiry.createdAt", "DESC");

      if (status) {
        queryBuilder.andWhere("inquiry.status = :status", {
          status,
        });
      }

      if (isAssembly !== undefined) {
        queryBuilder.andWhere("inquiry.isAssembly = :isAssembly", {
          isAssembly: isAssembly === "true",
        });
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [inquiries, total] = await queryBuilder
        .skip(skip)
        .take(Number(limit))
        .getManyAndCount();

      return response.status(200).json({
        success: true,
        data: inquiries,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching inquiries by customer:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async addRequestToInquiry(request: Request, response: Response) {
    try {
      const { id } = request.params;
      const requestData = request.body;

      const inquiry = await this.inquiryRepository.findOne({
        where: { id },
      });

      if (!inquiry) {
        return response.status(404).json({
          success: false,
          message: "Inquiry not found",
        });
      }

      let totalWeight = null;
      const currentQty = requestData.qty || requestData.quantity;
      if (requestData.unitWeight && currentQty) {
        totalWeight =
          parseFloat(requestData.unitWeight) * parseFloat(currentQty);
      }

      const existingCount = (inquiry.requests || []).length;
      const letterSuffix = this.getLetterSuffix(existingCount);
      const assignedItemNo = requestData.itemNo
        ? String(requestData.itemNo).replace(/^(.+)-([a-z])$/i, "$1$2")
        : `${inquiry.inquiryNo || "AF"}${letterSuffix}`;

      const requestItem = this.requestRepository.create({
        ...requestData,
        itemNo: assignedItemNo,
        inquiry,
        qty: currentQty,
        totalWeight: totalWeight || requestData.totalWeight,
      });

      const savedRequest = await this.requestRepository.save(requestItem);

      if (inquiry.status === "Draft") {
        inquiry.status = savedRequest.status || "Draft";
        await this.inquiryRepository.save(inquiry);
      }

      return response.status(201).json({
        success: true,
        message: "Request added to inquiry successfully",
        data: savedRequest,
      });
    } catch (error) {
      console.error("Error adding request to inquiry:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async updateRequestInInquiry(request: Request, response: Response) {
    try {
      const { id, requestId } = request.params;
      const requestData = request.body;

      const inquiry = await this.inquiryRepository.findOne({
        where: { id },
      });

      if (!inquiry) {
        return response.status(404).json({
          success: false,
          message: "Inquiry not found",
        });
      }

      const existingRequest = await this.requestRepository.findOne({
        where: { id: requestId, inquiry: { id } },
      });

      if (!existingRequest) {
        return response.status(404).json({
          success: false,
          message: "Request not found in this inquiry",
        });
      }

      if (requestData.unitWeight && requestData.quantity) {
        requestData.totalWeight =
          parseFloat(requestData.unitWeight) * parseFloat(requestData.quantity);
      }
      if (requestData.quantity !== undefined) {
        requestData.qty = requestData.quantity;
      }

      await this.requestRepository.update(requestId, requestData);

      const updatedRequest = await this.requestRepository.findOne({
        where: { id: requestId },
      });

      return response.status(200).json({
        success: true,
        message: "Request updated successfully",
        data: updatedRequest,
      });
    } catch (error) {
      console.error("Error updating request in inquiry:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async convertInquiryToItem(request: Request, response: Response) {
    try {
      const { inquiryId } = request.params;
      const conversionData = plainToInstance(
        ConvertInquiryToItemDto,
        request.body,
      );

      const errors = await validate(conversionData);
      if (errors.length > 0) {
        return response.status(400).json({
          success: false,
          errors: errors.map((error: any) => ({
            property: error.property,
            constraints: error.constraints,
          })),
        });
      }

      const inquiryRepository = AppDataSource.getRepository(Inquiry);
      const itemRepository = AppDataSource.getRepository(Item);
      const taricRepository = AppDataSource.getRepository(Taric);

      const inquiry = await inquiryRepository.findOne({
        where: { id: inquiryId },
        relations: ["requests"],
      });

      if (!inquiry) {
        return response.status(404).json({
          success: false,
          message: "Inquiry not found",
        });
      }

      if (!inquiry.isAssembly) {
        return response.status(400).json({
          success: false,
          message:
            "Only assembly inquiries (isAssembly = true) can be converted to an Item",
        });
      }

      const itemId = await ItemGenerator.generateItemId();
      const ean = ItemGenerator.generateEAN(itemId);

      let taric: Taric | null = null;

      if (conversionData.taricId) {
        taric = await taricRepository.findOne({
          where: { id: conversionData.taricId },
        });

        if (!taric) {
          taric = taricRepository.create({
            id: conversionData.taricId,
            code: undefined,
            name_de: inquiry.name,
            name_en: inquiry.name,
            name_cn: conversionData.itemNameCN || inquiry.description,
            description_de: inquiry.description,
            description_en: inquiry.description,
            reguler_artikel: "Y",
            duty_rate: 0,
          });
          await taricRepository.save(taric);
        }
      }

      if (!taric) {
        taric = await ItemGenerator.createTaricForItem(inquiry.name);
      }

      let itemData: any = {
        id: itemId,
        ean: ean,
        taric_id: taric.id,
        taric: taric,
        category: null,
        parent: null,
        is_dimension_special: "N",
        is_qty_dividable: "Y",
        ISBN: 0,
        is_npr: "N",
        is_rmb_special: "N",
        is_eur_special: "N",
        is_pu_item: 0,
        is_meter_item: 0,
        is_new: "Y",
        isActive: "Y",
        cat_id: conversionData.catId || null,
        photo: inquiry.image,
      };

      if (inquiry.isAssembly) {
        itemData = {
          ...itemData,
          item_name: inquiry.name,
          item_name_cn: conversionData.itemNameCN || inquiry.description,
          photo: inquiry.image,
          remark: conversionData.remark || inquiry.description,
          note: conversionData.note || inquiry.internalNotes,
          weight: conversionData.weight || inquiry.weight,
          width: conversionData.width || inquiry.width,
          height: conversionData.height || inquiry.height,
          length: conversionData.length || inquiry.length,
          isEstimated: inquiry.isEstimated,
          FOQ:
            conversionData.FOQ ||
            (inquiry.requests?.[0]?.qty
              ? parseInt(inquiry.requests[0].qty) || 0
              : 0),
          RMB_Price: conversionData.RMBPrice || inquiry.purchasePrice || 0,
          painPoints: conversionData.painPoints || inquiry.painPoints || [],
        };
      } else {
        itemData = {
          ...itemData,
          item_name: inquiry.name,
          item_name_cn: conversionData.itemNameCN || inquiry.description,
          photo: inquiry.image,
          model: conversionData.model,
          supp_cat: conversionData.suppCat,
          isEstimated: inquiry.isEstimated,
          weight: conversionData.weight || inquiry.weight,
          width: conversionData.width || inquiry.width,
          height: conversionData.height || inquiry.height,
          length: conversionData.length || inquiry.length,
          FOQ:
            conversionData.FOQ ||
            (inquiry.requests?.[0]?.qty
              ? parseInt(inquiry.requests[0].qty) || 0
              : 0),
          FSQ: conversionData.FSQ,
          remark: conversionData.remark || inquiry.description,
          note: conversionData.note || inquiry.internalNotes,
          RMB_Price: conversionData.RMBPrice || inquiry.purchasePrice || 0,
          painPoints: conversionData.painPoints || inquiry.painPoints || [],
        };
      }

      const item = itemRepository.create(itemData);
      const savedItem = await itemRepository.save(item);

      inquiry.status = "completed";
      await inquiryRepository.save(inquiry);

      return response.status(201).json({
        success: true,
        message: "Item created successfully from inquiry",
        data: {
          item: savedItem,
          taric: taric,
        },
      });
    } catch (error) {
      console.error("Error converting inquiry to item:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // REMOVED: convertRequestToItem
  //
  // This used to take a RequestedItem and mint a brand-new Item (new id,
  // new EAN, new/looked-up Taric) from its fields, then mark the request
  // "Converted to Item". That model assumed a RequestedItem could exist
  // without a linked Item until this ran.
  //
  // That assumption no longer holds: RequestedItemController.createRequestedItem
  // and .updateRequestedItem now call ItemLinkService.resolveItem /
  // .syncItemFields on every create/update, so every RequestedItem already
  // has `item`/`itemId` populated from the moment it's created. Running the
  // old logic today would create a second, disconnected Item next to the
  // one that's already linked, and would silently orphan whatever the new
  // draft-item-conversion flow (DraftItemConversionModal /
  // convertDraftItemsAndCreateAuftrag) does with that same RequestedItem's
  // existing linked Item.
  //
  // Not yet done, needs a follow-up pass once you confirm scope:
  //   - the route file wiring POST .../convert-request/:requestId (or
  //     whatever it's actually called) to this method — untouched, will
  //     fail to compile until repointed or removed
  //   - api/inquiry.ts's convertRequestToItem export on the frontend
  //   - CombinedInquiriesPage's "Convert" button / conversion form modal
  //     for request items (handleConvertRequestClick, showConversionModal
  //     when conversionType === "request")
  //   - ItemPreviewModal's onConvert prop / "Convert to Item" button

  async removeRequestFromInquiry(request: Request, response: Response) {
    try {
      const { id, requestId } = request.params;

      const inquiry = await this.inquiryRepository.findOne({
        where: { id },
      });

      if (!inquiry) {
        return response.status(404).json({
          success: false,
          message: "Inquiry not found",
        });
      }

      const existingRequest = await this.requestRepository.findOne({
        where: { id: requestId, inquiry: { id } },
      });

      if (!existingRequest) {
        return response.status(404).json({
          success: false,
          message: "Request not found in this inquiry",
        });
      }

      await this.requestRepository.remove(existingRequest);

      return response.status(200).json({
        success: true,
        message: "Request removed from inquiry successfully",
      });
    } catch (error) {
      console.error("Error removing request from inquiry:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async calculateInquiryDimensions(request: Request, response: Response) {
    try {
      const { id } = request.params;

      const inquiry = await this.inquiryRepository.findOne({
        where: { id },
        relations: ["requests"],
      });

      if (!inquiry) {
        return response.status(404).json({
          success: false,
          message: "Inquiry not found",
        });
      }

      let totalWeight = 0;
      let maxLength = 0;
      let maxWidth = 0;
      let maxHeight = 0;
      let totalVolume = 0;

      if (inquiry.requests && inquiry.requests.length > 0) {
        inquiry.requests.forEach((req: RequestedItem) => {
          if (req.length && req.length > maxLength) {
            maxLength = parseFloat(req.length.toString());
          }
          if (req.width && req.width > maxWidth) {
            maxWidth = parseFloat(req.width.toString());
          }
          if (req.height && req.height > maxHeight) {
            maxHeight = parseFloat(req.height.toString());
          }
          if (req.length && req.width && req.height) {
            const volume =
              parseFloat(req.length.toString()) *
              parseFloat(req.width.toString()) *
              parseFloat(req.height.toString());
            totalVolume += volume;
          }
        });
      }

      inquiry.weight = totalWeight > 0 ? totalWeight : inquiry.weight;
      inquiry.length = maxLength > 0 ? maxLength : inquiry.length;
      inquiry.width = maxWidth > 0 ? maxWidth : inquiry.width;
      inquiry.height = maxHeight > 0 ? maxHeight : inquiry.height;

      await this.inquiryRepository.save(inquiry);

      return response.status(200).json({
        success: true,
        message: "Dimensions calculated successfully",
        data: {
          totalWeight,
          maxLength,
          maxWidth,
          maxHeight,
          totalVolume,
          calculatedPackageDimensions: {
            weight: inquiry.weight,
            length: inquiry.length,
            width: inquiry.width,
            height: inquiry.height,
          },
        },
      });
    } catch (error) {
      console.error("Error calculating inquiry dimensions:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

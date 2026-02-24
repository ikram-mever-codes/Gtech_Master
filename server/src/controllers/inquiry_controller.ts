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
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { UserRole } from "../models/users";
import { filterDataByRole } from "../utils/dataFilter";
import { AuthorizedRequest } from "../middlewares/authorized";


import { IsOptional, IsString, IsNumber, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

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
  @IsString()
  note?: string;
}

export class ConvertInquiryToItemDto extends BaseItemConversionDto { }

export class ConvertRequestToItemDto extends BaseItemConversionDto {
  @IsOptional()
  @IsString()
  extraItemsDescriptions?: string;
}
export class ItemGenerator {
  static async generateTaricCode(): Promise<string> {
    const taricRepository = AppDataSource.getRepository(Taric);

    const highestTaric = await taricRepository
      .createQueryBuilder("taric")
      .select("MAX(CAST(taric.code AS UNSIGNED))", "maxCode")
      .where("taric.code REGEXP :regex", { regex: "^[0-9]+$" })
      .getRawOne();

    let nextCode = 1;
    if (highestTaric?.maxCode) {
      nextCode = parseInt(highestTaric.maxCode) + 1;
    }

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
        .padStart(6, "0")}`.slice(0, 9)
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

export class InquiryController {
  private inquiryRepository: any = AppDataSource.getRepository(Inquiry);
  private requestRepository: any = AppDataSource.getRepository(RequestedItem);
  private customerRepository: any = AppDataSource.getRepository(Customer);
  private contactPersonRepository: any =
    AppDataSource.getRepository(ContactPerson);

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
      } = request.query;

      const queryBuilder = this.inquiryRepository
        .createQueryBuilder("inquiry")
        .leftJoinAndSelect("inquiry.customer", "customer")
        .leftJoinAndSelect("inquiry.contactPerson", "contactPerson")
        .leftJoinAndSelect("inquiry.requests", "requests")
        .leftJoinAndSelect("requests.business", "business")
        .leftJoinAndSelect(
          "business.customer",
          "businessCustomer",
          "businessCustomer.id = business.customerId"
        )
        .leftJoinAndSelect("requests.contactPerson", "requestContactPerson")
        .select([
          "inquiry",
          "customer",
          "contactPerson",
          "requests",
          "business",
          "businessCustomer.companyName",
          "businessCustomer.id",
          "requestContactPerson.name",
          "requestContactPerson.familyName",
          "requestContactPerson.id",
        ])
        .orderBy("inquiry.createdAt", "DESC");

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
      const filteredData = filterDataByRole(inquiries, user?.role || UserRole.STAFF);

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
        relations: ["customer", "contactPerson", "requests"],
      });

      if (!inquiry) {
        return response.status(404).json({
          success: false,
          message: "Inquiry not found",
        });
      }

      const user = (request as AuthorizedRequest).user;
      const filteredData = filterDataByRole(inquiry, user?.role || UserRole.STAFF);

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
    try {
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
        requests,
      } = request.body;

      if (!name || !customerId) {
        return response.status(400).json({
          success: false,
          message: "Missing required fields: name and customerId are required",
        });
      }

      const customer = await this.customerRepository.findOne({
        where: { id: customerId },
        relations: ["starBusinessDetails"],
      });

      if (!customer) {
        return response.status(404).json({
          success: false,
          message: "Customer not found",
        });
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

      const inquiry = this.inquiryRepository.create({
        name,
        description,
        image,
        isAssembly: isAssembly || false,
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
      });

      const savedInquiry = await this.inquiryRepository.save(inquiry);

      if (requests && Array.isArray(requests) && requests.length > 0) {
        let starBusinessDetails = customer.starBusinessDetails;
        if (!starBusinessDetails) {
          const starBusinessDetailsRepository = AppDataSource.getRepository(StarBusinessDetails);
          starBusinessDetails = starBusinessDetailsRepository.create({
            customer: customer,
          });
          await starBusinessDetailsRepository.save(starBusinessDetails);
        }

        const requestEntities = requests.map((reqData: any) => {
          let totalWeight = null;
          const currentQty = reqData.qty || reqData.quantity;
          if (reqData.unitWeight && currentQty) {
            totalWeight =
              parseFloat(reqData.unitWeight) * parseFloat(currentQty);
          }

          const requestItem = this.requestRepository.create({
            ...reqData,
            businessId: starBusinessDetails.id,
            business: starBusinessDetails,
            inquiry: savedInquiry,
            qty: currentQty,
            totalWeight: totalWeight || reqData.totalWeight,
          });

          return requestItem;
        });

        await this.requestRepository.save(requestEntities);
      }

      const completeInquiry = await this.inquiryRepository.findOne({
        where: { id: savedInquiry.id },
        relations: ["customer", "contactPerson", "requests"],
      });

      const user = (request as AuthorizedRequest).user;
      const filteredData = filterDataByRole(completeInquiry, user?.role || UserRole.STAFF);

      return response.status(201).json({
        success: true,
        message: "Inquiry created successfully",
        data: filteredData,
      });
    } catch (error) {
      console.error("Error creating inquiry:", error);
      if (error instanceof Error) {
        console.error("Stack trace:", error.stack);
      }
      return response.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  async updateInquiry(request: Request, response: Response) {
    try {
      const { id } = request.params;
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
      };

      if (contactPerson !== undefined) {
        updateData.contactPerson = contactPerson;
      }

      await this.inquiryRepository.update(id, updateData);

      if (requests && Array.isArray(requests)) {
        if (existingInquiry.requests && existingInquiry.requests.length > 0) {
          await this.requestRepository.remove(existingInquiry.requests);
        }

        if (requests.length > 0) {
          let starBusinessDetails = existingInquiry.customer?.starBusinessDetails;
          if (!starBusinessDetails && existingInquiry.customer) {
            const starBusinessDetailsRepository = AppDataSource.getRepository(StarBusinessDetails);
            starBusinessDetails = starBusinessDetailsRepository.create({
              customer: existingInquiry.customer,
            });
            await starBusinessDetailsRepository.save(starBusinessDetails);
          }

          if (starBusinessDetails) {
            const requestEntities = requests.map((reqData: any) => {
              let totalWeight = null;
              const currentQty = reqData.qty || reqData.quantity;
              if (reqData.unitWeight && currentQty) {
                totalWeight =
                  parseFloat(reqData.unitWeight) * parseFloat(currentQty);
              }

              const requestItem = this.requestRepository.create({
                ...reqData,
                businessId: starBusinessDetails.id,
                business: starBusinessDetails,
                inquiry: existingInquiry,
                qty: currentQty,
                totalWeight: totalWeight || reqData.totalWeight,
              });

              return requestItem;
            });

            await this.requestRepository.save(requestEntities);
          }
        }
      }

      if (status && status !== existingInquiry.status) {
        const updatedInquiry = await this.inquiryRepository.findOne({
          where: { id },
          relations: ["requests"],
        });

        if (
          updatedInquiry &&
          !updatedInquiry.isAssembly &&
          updatedInquiry.requests &&
          updatedInquiry.requests.length > 0
        ) {
          await Promise.all(
            updatedInquiry.requests.map(async (requestItem: any) => {
              await this.requestRepository.update(requestItem.id, {
                status: status,
              });
            })
          );
        }
      }

      const updatedInquiry = await this.inquiryRepository.findOne({
        where: { id },
        relations: [
          "customer",
          "contactPerson",
          "requests",
          "customer.starBusinessDetails",
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
      });

      if (!inquiry) {
        return response.status(404).json({
          success: false,
          message: "Inquiry not found",
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

      const requestItem = this.requestRepository.create({
        ...requestData,
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
        request.body
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
        };
      }

      const item = itemRepository.create(itemData);
      const savedItem = await itemRepository.save(item);

      inquiry.status = "Quoted";
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

  async convertRequestToItem(request: Request, response: Response) {
    try {
      const { requestId } = request.params;
      const conversionData = plainToInstance(
        ConvertRequestToItemDto,
        request.body
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

      const requestedItemRepository =
        AppDataSource.getRepository(RequestedItem);
      const itemRepository = AppDataSource.getRepository(Item);
      const taricRepository = AppDataSource.getRepository(Taric);
      const inquiryRepository = AppDataSource.getRepository(Inquiry);

      const requestedItem = await requestedItemRepository.findOne({
        where: { id: requestId },
        relations: ["inquiry", "business"],
      });

      if (!requestedItem) {
        return response.status(404).json({
          success: false,
          message: "Requested item not found",
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
            name_de: requestedItem.itemName,
            name_en: requestedItem.itemName,
            name_cn: conversionData.itemNameCN || requestedItem.specification,
            description_de: requestedItem.specification,
            description_en: requestedItem.specification,
            reguler_artikel: "Y",
            duty_rate: 0,
          });
          await taricRepository.save(taric);
        }
      }

      if (!taric) {
        taric = await ItemGenerator.createTaricForItem(requestedItem.itemName);
      }

      const itemData: any = {
        id: itemId,
        ean: ean,
        taric_id: taric.id,
        taric: taric,
        category: null,
        parent: null,
        item_name: requestedItem.itemName,
        item_name_cn: conversionData.itemNameCN || requestedItem.specification,
        model: conversionData.model,
        supp_cat: conversionData.suppCat,
        material: requestedItem.material,
        specification: requestedItem.specification,
        photo: "",
        isEstimated: requestedItem.isEstimated,
        weight: conversionData.weight || requestedItem.weight,
        width: conversionData.width || requestedItem.width,
        height: conversionData.height || requestedItem.height,
        length: conversionData.length || requestedItem.length,
        FOQ:
          conversionData.FOQ ||
          (requestedItem.qty ? parseInt(requestedItem.qty) || 0 : 0),
        FSQ:
          conversionData.FSQ ||
          (requestedItem.sampleQty
            ? parseInt(requestedItem.sampleQty) || 0
            : 0),
        remark: conversionData.remark || requestedItem.comment,
        note: conversionData.note || requestedItem.extraNote,
        RMB_Price: conversionData.RMBPrice || requestedItem.purchasePrice || 0,
        cat_id: conversionData.catId || null,
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
      };

      const item = itemRepository.create(itemData);
      const savedItem = await itemRepository.save(item);

      requestedItem.requestStatus = "Converted to Item";
      await requestedItemRepository.save(requestedItem);

      if (requestedItem.inquiry) {
        const inquiry = await inquiryRepository.findOne({
          where: { id: requestedItem.inquiry.id },
          relations: ["requests"],
        });

        if (inquiry) {
          const allConverted = inquiry.requests.every(
            (req) => req.requestStatus === "Converted to Item"
          );

          if (allConverted) {
            inquiry.status = "Quoted";
            await inquiryRepository.save(inquiry);
          }
        }
      }

      return response.status(201).json({
        success: true,
        message: "Item created successfully from requested item",
        data: {
          item: savedItem,
          taric: taric,
          originalRequest: {
            id: requestedItem.id,
            itemName: requestedItem.itemName,
            status: requestedItem.requestStatus,
          },
        },
      });
    } catch (error) {
      console.error("Error converting requested item to item:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

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

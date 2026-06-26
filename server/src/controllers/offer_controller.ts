import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import {
  Offer,
  CustomerSnapshot,
  QuantityPrice,
  UnitPrice,
  OfferLineItem,
  ItemSnapshot,
} from "../models/offer";
import { Inquiry } from "../models/inquiry";
import { RequestedItem } from "../models/requested_items";
import { Customer } from "../models/customers";

type ValidatorModule = any;
type TransformerModule = any;
type CanvasModule = any;

interface ValidationError {
  property: string;
  constraints?: { [key: string]: string };
}

type ClassConstructor<T> = new (...args: any[]) => T;

const getValidator = (): ValidatorModule => {
  try {
    return require("class-validator");
  } catch {
    return {
      IsDate: () => () => {},
      IsEnum: () => () => {},
      IsNumber: () => () => {},
      IsObject: () => () => {},
      IsOptional: () => () => {},
      IsString: () => () => {},
      Max: () => () => {},
      Min: () => () => {},
      IsBoolean: () => () => {},
      IsArray: () => () => {},
      validate: async () => [],
    };
  }
};

const getTransformer = (): TransformerModule => {
  try {
    return require("class-transformer");
  } catch {
    return {
      Type: () => () => {},
      plainToInstance: <T>(cls: ClassConstructor<T>, plain: any): T =>
        plain as T,
    };
  }
};

const getCanvas = (): CanvasModule => {
  try {
    return require("canvas");
  } catch {
    return {
      createCanvas: () => ({ width: 0, height: 0, getContext: () => ({}) }),
    };
  }
};

const {
  IsDate,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  IsBoolean,
  IsArray,
  validate,
} = getValidator();

const { plainToInstance, Type } = getTransformer();
const { createCanvas } = getCanvas();

import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { ConvertInquiryToItemDto, ItemGenerator } from "./inquiry_controller";
import { Item } from "../models/items";
import { Taric } from "../models/tarics";
import { _cachedCjkFontPath, _cachedCjkFontBuffer } from "./order_controller";

const formatCountry = (country?: string | null): string => {
  if (!country) return "";
  const code = country.trim().toUpperCase();
  if (code === "DE") return "Germany";
  if (code === "AT") return "Austria";
  if (code === "CH") return "Switzerland";
  return country.trim();
};

export class CreateOfferDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  validUntil?: Date;

  @IsOptional()
  @IsString()
  termsConditions?: string;

  @IsOptional()
  @IsString()
  deliveryTerms?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  deliveryTime?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  discountPercentage?: number;

  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  shippingCost?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  assemblyName?: string;

  @IsOptional()
  @IsString()
  assemblyDescription?: string;

  @IsOptional()
  @IsString()
  assemblyNotes?: string;

  @IsOptional()
  @IsObject()
  deliveryAddress?: {
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    contactName?: string;
    contactPhone?: string;
  };

  @IsOptional()
  @IsBoolean()
  useUnitPrices?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(4)
  unitPriceDecimalPlaces?: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(4)
  totalPriceDecimalPlaces?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxUnitPriceColumns?: number;

  @IsOptional()
  @IsArray()
  defaultUnitPrices?: UnitPrice[];
}

export class UpdateOfferDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum([
    "Draft",
    "Submitted",
    "Negotiation",
    "Accepted",
    "Rejected",
    "Expired",
    "Cancelled",
  ])
  status?:
    | "Draft"
    | "Submitted"
    | "Negotiation"
    | "Accepted"
    | "Rejected"
    | "Expired"
    | "Cancelled";

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  validUntil?: Date;

  @IsOptional()
  @IsString()
  termsConditions?: string;

  @IsOptional()
  @IsString()
  deliveryTerms?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  deliveryTime?: string;

  @IsOptional()
  @IsEnum(["RMB", "HKD", "EUR", "USD"])
  currency?: "RMB" | "HKD" | "EUR" | "USD";

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsObject()
  deliveryAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    additionalInfo?: string;
    contactName?: string;
    contactPhone?: string;
  };

  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsBoolean()
  useUnitPrices?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(4)
  unitPriceDecimalPlaces?: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(4)
  totalPriceDecimalPlaces?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxUnitPriceColumns?: number;

  @IsOptional()
  @IsArray()
  defaultUnitPrices?: UnitPrice[];
}

export class UnitPriceDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  quantity!: string;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPrice?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateLineItemDto {
  @IsOptional()
  @IsString()
  itemName?: string;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsString()
  specification?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  quantityPrices?: QuantityPrice[];

  @IsOptional()
  @IsArray()
  unitPrices?: UnitPriceDto[];

  @IsOptional()
  @IsString()
  baseQuantity?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  samplePrice?: number;

  @IsOptional()
  @IsString()
  sampleQuantity?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lineTotal?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  position?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkUpdateLineItemsDto {
  @IsArray()
  lineItems!: Array<{
    id: string;
    quantityPrices?: QuantityPrice[];
    unitPrices?: UnitPriceDto[];
    basePrice?: number;
    samplePrice?: number;
    lineTotal?: number;
    notes?: string;
  }>;
}

export class CopyPastePricesDto {
  @IsString()
  data!: string;
}

// ---------------------------------------------------------------------------
// New DTOs: creating offers from an Item or a Customer, and adding line items
// to an offer that did not originate from an inquiry.
// ---------------------------------------------------------------------------

export class CreateOfferFromItemDto {
  // Item-sourced offers may target a customer that differs from the item's
  // own customer; if omitted we fall back to the item's customer.
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(["RMB", "HKD", "EUR", "USD"])
  currency?: "RMB" | "HKD" | "EUR" | "USD";

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  validUntil?: Date;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  baseQuantity?: string;

  @IsOptional()
  @IsBoolean()
  useUnitPrices?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(4)
  unitPriceDecimalPlaces?: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(4)
  totalPriceDecimalPlaces?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxUnitPriceColumns?: number;
}

export class CreateOfferFromCustomerDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(["RMB", "HKD", "EUR", "USD"])
  currency?: "RMB" | "HKD" | "EUR" | "USD";

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  validUntil?: Date;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsBoolean()
  useUnitPrices?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(4)
  unitPriceDecimalPlaces?: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(4)
  totalPriceDecimalPlaces?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxUnitPriceColumns?: number;
}

export class CreateLineItemDto {
  @IsString()
  itemName!: string;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsString()
  specification?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  baseQuantity?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class OfferController {
  private offerRepository: any = AppDataSource.getRepository(Offer);
  private lineItemRepository: any = AppDataSource.getRepository(OfferLineItem);
  private inquiryRepository = AppDataSource.getRepository(Inquiry);
  private requestedItemRepository = AppDataSource.getRepository(RequestedItem);
  private customerRepository = AppDataSource.getRepository(Customer);

  private async generateOfferNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");

    const lastOffer = await this.offerRepository
      .createQueryBuilder("offer")
      .where("offer.offerNumber LIKE :pattern", {
        pattern: `OFF-${year}${month}-%`,
      })
      .orderBy("offer.offerNumber", "DESC")
      .getOne();

    let sequence = 1;
    if (lastOffer) {
      const lastNumber = parseInt(lastOffer.offerNumber.split("-")[2]) || 0;
      sequence = lastNumber + 1;
    }

    return `OFF-${year}${month}-${sequence.toString().padStart(4, "0")}`;
  }

  // -------------------------------------------------------------------------
  // Shared helpers for building snapshots from a Customer entity. Used by the
  // inquiry/item/customer create paths so the snapshot shape stays identical.
  // -------------------------------------------------------------------------
  private buildCustomerSnapshot(customer: Customer | any): CustomerSnapshot {
    return {
      id: customer.id,
      customerNumber: customer.customerNumber,
      companyName: customer.companyName,
      legalName: customer.legalName,
      email: customer.email,
      contactEmail: customer.contactEmail,
      contactPhoneNumber: customer.contactPhoneNumber,
      vatId: customer.vatTaxId || customer.taxNumber || "",
      address: customer.addressLine1 || customer.businessDetails?.address || "",
      city: customer.city || customer.businessDetails?.city || "",
      postalCode:
        customer.postalCode || customer.businessDetails?.postalCode || "",
      country: customer.country || customer.businessDetails?.country || "",
      state: customer.businessDetails?.state || "",
      street: customer.addressLine1 || "Street Address",
      additionalInfo: customer.addressLine2 || "Additional Info",
    };
  }

  private buildDeliveryAddress(customer: Customer | any) {
    return {
      street: customer.addressLine1 || "Street Address",
      city: customer.city || customer.businessDetails?.city,
      state: customer.businessDetails?.state,
      postalCode: customer.postalCode || customer.businessDetails?.postalCode,
      country: customer.country || customer.businessDetails?.country,
      contactName: customer.legalName || customer.companyName,
      contactPhone: customer.contactPhoneNumber,
    };
  }

  async createOfferFromInquiry(request: Request, response: Response) {
    try {
      const { inquiryId } = request.params;

      const createOfferDto = plainToInstance(CreateOfferDto, request.body, {
        excludeExtraneousValues: false,
        enableImplicitConversion: true,
      });

      if (!createOfferDto || typeof createOfferDto !== "object") {
        return response.status(400).json({
          success: false,
          message: "Invalid request body format",
        });
      }

      const errors: ValidationError[] = await validate(createOfferDto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });

      if (errors.length > 0) {
        return response.status(400).json({
          success: false,
          errors: errors.map((error: ValidationError) => ({
            property: error.property,
            constraints: error.constraints,
          })),
        });
      }

      const inquiry = await this.inquiryRepository.findOne({
        where: { id: inquiryId },
        relations: ["customer", "requests", "contactPerson"],
      });

      if (!inquiry) {
        return response.status(404).json({
          success: false,
          message: "Inquiry not found",
        });
      }

      const customer = inquiry.customer;
      if (!customer) {
        return response.status(404).json({
          success: false,
          message: "Customer not found for this inquiry",
        });
      }

      const offerNumber = await this.generateOfferNumber();

      const inquirySnapshot = {
        id: inquiry.id,
        name: inquiry.name,
        isAssembly: inquiry.isAssembly,
        description: inquiry.description,
        createdAt: inquiry.createdAt,
        referenceNumber: inquiry.referenceNumber,
        status: inquiry.status,
        requestsCount: inquiry.requests?.length || 0,
      };

      const customerSnapshot: CustomerSnapshot =
        this.buildCustomerSnapshot(customer);

      const defaultUnitPrices = createOfferDto.useUnitPrices
        ? createOfferDto.defaultUnitPrices || this.createDefaultUnitPrices()
        : [];

      const offer = this.offerRepository.create({
        offerNumber,
        sourceType: "inquiry",
        itemId: null,
        itemSnapshot: null,
        customerId: customer.id,
        title: createOfferDto.title || `Offer for ${inquiry.name}`,
        inquiry: inquiry,
        inquiryId: inquiry.id,
        inquirySnapshot,
        customerSnapshot,
        deliveryAddress: createOfferDto.deliveryAddress || {
          street: "Street Address",
          city: customer.businessDetails?.city,
          state: customer.businessDetails?.state,
          postalCode: customer.businessDetails?.postalCode,
          country: customer.businessDetails?.country,
          contactName: customer.legalName || customer.companyName,
          contactPhone: customer.contactPhoneNumber,
        },
        status: "Draft",
        validUntil:
          createOfferDto.validUntil ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        termsConditions: createOfferDto.termsConditions,
        deliveryTerms: createOfferDto.deliveryTerms,
        paymentTerms: createOfferDto.paymentTerms,
        deliveryTime: createOfferDto.deliveryTime,
        currency: createOfferDto.currency || "EUR",
        discountPercentage: createOfferDto.discountPercentage || 0,
        discountAmount: createOfferDto.discountAmount || 0,
        shippingCost: createOfferDto.shippingCost || 0,
        notes: createOfferDto.notes,
        internalNotes: createOfferDto.internalNotes,
        isAssembly: inquiry.isAssembly,
        assemblyName: createOfferDto.assemblyName || inquiry.name,
        assemblyDescription:
          createOfferDto.assemblyDescription || inquiry.description,
        assemblyNotes: createOfferDto.assemblyNotes,
        useUnitPrices: createOfferDto.useUnitPrices || false,
        unitPriceDecimalPlaces: createOfferDto.unitPriceDecimalPlaces || 3,
        totalPriceDecimalPlaces: createOfferDto.totalPriceDecimalPlaces || 2,
        maxUnitPriceColumns: createOfferDto.maxUnitPriceColumns || 3,
        defaultUnitPrices,
        revision: 1,
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
      });

      const savedOffer = await this.offerRepository.save(offer);
      let lineItems: OfferLineItem[] = [];
      let position = 1;

      if (inquiry.isAssembly) {
        const assemblyLineItem = this.lineItemRepository.create({
          offer: savedOffer,
          offerId: savedOffer.id,
          itemName: savedOffer.assemblyName || inquiry.name,
          description: savedOffer.assemblyDescription || inquiry.description,
          position: position++,
          isAssemblyItem: true,
          isEstimated: inquiry.isEstimated,
          notes: savedOffer.assemblyNotes,
          purchasePrice: inquiry.purchasePrice,
          purchaseCurrency: inquiry.purchasePriceCurrency,
          quantityPrices: [],
          unitPrices: savedOffer.useUnitPrices
            ? this.createDefaultUnitPrices()
            : [],
          lineTotal: 0,
        });
        lineItems.push(assemblyLineItem);

        const savedAssemblyItem =
          await this.lineItemRepository.save(assemblyLineItem);
        if (inquiry.requests && inquiry.requests.length > 0) {
          for (const request of inquiry.requests) {
            const componentItem = this.lineItemRepository.create({
              offer: savedOffer,
              offerId: savedOffer.id,
              requestedItemId: request.id,
              itemName: request.itemName || "Component",
              material: request.material,
              specification: request.specification,
              description: request.comment || request.extraNote,
              weight: request.weight,
              width: request.width,
              height: request.height,
              length: request.length,
              purchasePrice: request.purchasePrice,
              purchaseCurrency: request.currency,
              baseQuantity: request.qty,
              position: position++,
              isComponent: true,
              isEstimated: request.isEstimated,
              parentItemId: savedAssemblyItem.id,
              notes: request.comment,
              quantityPrices: [],
              unitPrices: [],
              lineTotal: 0,
            });
            lineItems.push(componentItem);
          }
        }
      } else {
        if (inquiry.requests && inquiry.requests.length > 0) {
          for (const request of inquiry.requests) {
            const lineItemUnitPrices = savedOffer.useUnitPrices
              ? this.createDefaultUnitPrices()
              : [];

            const lineItem = this.lineItemRepository.create({
              offer: savedOffer,
              offerId: savedOffer.id,
              requestedItemId: request.id,
              itemName: request.itemName || "Item",
              material: request.material,
              specification: request.specification,
              description: request.comment || request.extraNote,
              weight: request.weight,
              width: request.width,
              height: request.height,
              length: request.length,
              purchasePrice: request.purchasePrice,
              purchaseCurrency: request.currency,
              baseQuantity: request.qty,
              position: position++,
              isEstimated: request.isEstimated,
              notes: request.comment,
              quantityPrices: [],
              unitPrices: lineItemUnitPrices,
              lineTotal: 0,
            });
            lineItems.push(lineItem);
          }
        }
      }

      if (lineItems.length > 0) {
        await this.lineItemRepository.save(lineItems);
      }
      await this.calculateOfferTotals(savedOffer.id);

      const completeOffer = await this.offerRepository.findOne({
        where: { id: savedOffer.id },
        relations: ["lineItems", "inquiry", "inquiry.customer"],
      });

      return response.status(201).json({
        success: true,
        message: "Offer created successfully",
        data: completeOffer,
      });
    } catch (error) {
      console.error("Error creating offer:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ==========================================================================
  // CREATE FROM ITEM
  // POST /offers/from-item/:itemId
  // Prefills the customer (from the item's linked customer, or an explicit
  // body.customerId) and seeds a single line item from the item's data.
  // ==========================================================================
  async createOfferFromItem(request: Request, response: Response) {
    try {
      const { itemId } = request.params;
      const body: CreateOfferFromItemDto = request.body || {};

      const itemRepository = AppDataSource.getRepository(Item);
      const item: any = await itemRepository.findOne({
        where: { id: itemId as any },
        relations: ["customer", "taric"],
      });

      if (!item) {
        return response
          .status(404)
          .json({ success: false, message: "Item not found" });
      }

      // Resolve the customer: explicit body.customerId wins, else the item's
      // own customer. An offer must always carry a customer snapshot.
      let customer: any = null;
      if (body.customerId) {
        customer = await this.customerRepository.findOne({
          where: { id: body.customerId },
        });
      }
      if (!customer) {
        customer = item.customer || null;
      }
      if (!customer) {
        return response.status(400).json({
          success: false,
          message:
            "This item has no linked customer. Pass a customerId to create the offer.",
        });
      }

      const offerNumber = await this.generateOfferNumber();
      const customerSnapshot = this.buildCustomerSnapshot(customer);

      const itemSnapshot: ItemSnapshot = {
        id: item.id,
        itemName: item.item_name,
        itemNameCn: item.item_name_cn,
        ean: item.ean ? String(item.ean) : undefined,
        model: item.model,
        description: item.remark || item.note,
        specification: item.model,
        weight: item.weight,
        width: item.width,
        height: item.height,
        length: item.length,
        purchasePrice: item.RMB_Price || 0,
        purchaseCurrency: "RMB",
        photo: item.photo || "",
      };

      const useUnitPrices = body.useUnitPrices || false;
      const defaultUnitPrices = useUnitPrices
        ? this.createDefaultUnitPrices()
        : [];

      const offer = this.offerRepository.create({
        offerNumber,
        sourceType: "item",
        title: body.title || `Offer for ${itemSnapshot.itemName}`,
        inquiry: null,
        inquiryId: null,
        inquirySnapshot: null,
        itemId: itemSnapshot.id,
        itemSnapshot,
        customerId: customer.id,
        customerSnapshot,
        deliveryAddress: this.buildDeliveryAddress(customer),
        status: "Draft",
        validUntil:
          body.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currency: body.currency || "EUR",
        notes: body.notes,
        internalNotes: body.internalNotes,
        isAssembly: false,
        useUnitPrices,
        unitPriceDecimalPlaces: body.unitPriceDecimalPlaces || 3,
        totalPriceDecimalPlaces: body.totalPriceDecimalPlaces || 2,
        maxUnitPriceColumns: body.maxUnitPriceColumns || 3,
        defaultUnitPrices,
        revision: 1,
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
      });

      const savedOffer = await this.offerRepository.save(offer);

      const lineItem = this.lineItemRepository.create({
        offer: savedOffer,
        offerId: savedOffer.id,
        sourceItemId: itemSnapshot.id,
        itemName: itemSnapshot.itemName,
        specification: itemSnapshot.specification,
        description: itemSnapshot.description,
        weight: itemSnapshot.weight,
        width: itemSnapshot.width,
        height: itemSnapshot.height,
        length: itemSnapshot.length,
        purchasePrice: itemSnapshot.purchasePrice,
        purchaseCurrency: itemSnapshot.purchaseCurrency,
        baseQuantity: body.baseQuantity || "1",
        position: 1,
        quantityPrices: [],
        unitPrices: useUnitPrices ? this.createDefaultUnitPrices() : [],
        lineTotal: 0,
      });
      await this.lineItemRepository.save(lineItem);

      await this.calculateOfferTotals(savedOffer.id);

      const completeOffer = await this.offerRepository.findOne({
        where: { id: savedOffer.id },
        relations: ["lineItems"],
      });

      return response.status(201).json({
        success: true,
        message: "Offer created from item successfully",
        data: completeOffer,
      });
    } catch (error) {
      console.error("Error creating offer from item:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ==========================================================================
  // CREATE FROM CUSTOMER (blank offer, customer prefilled)
  // POST /offers/from-customer/:customerId
  // ==========================================================================
  async createOfferFromCustomer(request: Request, response: Response) {
    try {
      const { customerId } = request.params;
      const body: CreateOfferFromCustomerDto = request.body || {};

      const customer = await this.customerRepository.findOne({
        where: { id: customerId },
      });

      if (!customer) {
        return response
          .status(404)
          .json({ success: false, message: "Customer not found" });
      }

      const offerNumber = await this.generateOfferNumber();
      const customerSnapshot = this.buildCustomerSnapshot(customer);

      const useUnitPrices = body.useUnitPrices || false;
      const defaultUnitPrices = useUnitPrices
        ? this.createDefaultUnitPrices()
        : [];

      const offer = this.offerRepository.create({
        offerNumber,
        sourceType: "customer",
        title: body.title || `Offer for ${customer.companyName}`,
        inquiry: null,
        inquiryId: null,
        inquirySnapshot: null,
        itemId: null,
        itemSnapshot: null,
        customerId: customer.id,
        customerSnapshot,
        deliveryAddress: this.buildDeliveryAddress(customer),
        status: "Draft",
        validUntil:
          body.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currency: body.currency || "EUR",
        notes: body.notes,
        internalNotes: body.internalNotes,
        isAssembly: false,
        useUnitPrices,
        unitPriceDecimalPlaces: body.unitPriceDecimalPlaces || 3,
        totalPriceDecimalPlaces: body.totalPriceDecimalPlaces || 2,
        maxUnitPriceColumns: body.maxUnitPriceColumns || 3,
        defaultUnitPrices,
        revision: 1,
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
      });

      const savedOffer = await this.offerRepository.save(offer);

      // No line items yet — the user adds them via createLineItem.
      const completeOffer = await this.offerRepository.findOne({
        where: { id: savedOffer.id },
        relations: ["lineItems"],
      });

      return response.status(201).json({
        success: true,
        message: "Blank offer created for customer successfully",
        data: completeOffer,
      });
    } catch (error) {
      console.error("Error creating offer from customer:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ==========================================================================
  // ADD A LINE ITEM TO AN EXISTING OFFER
  // POST /offers/:offerId/line-items
  // Needed for customer/blank offers (and ad-hoc additions to any offer).
  // ==========================================================================
  async createLineItem(request: Request, response: Response) {
    try {
      const { offerId } = request.params;
      const body: CreateLineItemDto = request.body || {};

      if (!body.itemName || !body.itemName.trim()) {
        return response
          .status(400)
          .json({ success: false, message: "itemName is required" });
      }

      const offer = await this.offerRepository.findOne({
        where: { id: offerId },
        relations: ["lineItems"],
      });
      if (!offer) {
        return response
          .status(404)
          .json({ success: false, message: "Offer not found" });
      }

      const existing = (offer.lineItems || []).filter(
        (li: OfferLineItem) => !li.isComponent,
      );
      const nextPosition =
        existing.reduce(
          (max: number, li: OfferLineItem) => Math.max(max, li.position || 0),
          0,
        ) + 1;

      const lineItem = this.lineItemRepository.create({
        offer,
        offerId: offer.id,
        itemName: body.itemName.trim(),
        material: body.material,
        specification: body.specification,
        description: body.description,
        baseQuantity: body.baseQuantity || "1",
        basePrice: body.basePrice ?? undefined,
        notes: body.notes,
        position: nextPosition,
        quantityPrices: [],
        unitPrices: offer.useUnitPrices ? this.createDefaultUnitPrices() : [],
        lineTotal:
          body.basePrice && body.baseQuantity
            ? body.basePrice * (parseFloat(body.baseQuantity) || 1)
            : 0,
      });

      const saved = await this.lineItemRepository.save(lineItem);
      await this.calculateOfferTotals(offer.id);

      return response.status(201).json({
        success: true,
        message: "Line item added successfully",
        data: saved,
      });
    } catch (error) {
      console.error("Error adding line item:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ==========================================================================
  // DELETE A LINE ITEM
  // DELETE /offers/:offerId/line-items/:lineItemId
  // ==========================================================================
  async deleteLineItem(request: Request, response: Response) {
    try {
      const { offerId, lineItemId } = request.params;
      const lineItem = await this.lineItemRepository.findOne({
        where: { id: lineItemId, offerId },
      });
      if (!lineItem) {
        return response
          .status(404)
          .json({ success: false, message: "Line item not found" });
      }
      await this.lineItemRepository.remove(lineItem);
      await this.calculateOfferTotals(offerId);
      return response.status(200).json({
        success: true,
        message: "Line item deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting line item:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  private createDefaultUnitPrices(): UnitPrice[] {
    const now = new Date();
    return [
      {
        id: uuidv4(),
        quantity: "1000",
        unitPrice: 0,
        totalPrice: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        quantity: "5000",
        unitPrice: 0,
        totalPrice: 0,
        isActive: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        quantity: "10000",
        unitPrice: 0,
        totalPrice: 0,
        isActive: false,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  async convertOfferToItem(request: Request, response: Response) {
    try {
      const { offerId } = request.params;
      const { lineItemId } = request.query;
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

      const offerRepository = AppDataSource.getRepository(Offer);
      const itemRepository = AppDataSource.getRepository(Item);
      const taricRepository = AppDataSource.getRepository(Taric);
      const lineItemRepository = AppDataSource.getRepository(OfferLineItem);
      const offer = await offerRepository.findOne({
        where: { id: offerId },
        relations: ["lineItems", "inquiry"],
      });

      if (!offer) {
        return response.status(404).json({
          success: false,
          message: "Offer not found",
        });
      }

      let sourceData: any;
      if (offer.isAssembly) {
        const assemblyItem = offer.lineItems?.find((li) => li.isAssemblyItem);

        sourceData = {
          itemName: offer.assemblyName || offer.title || "New Assembly Item",
          specification: offer.assemblyDescription || offer.notes || "",
          weight:
            conversionData.weight ||
            assemblyItem?.weight ||
            offer.inquiry?.weight ||
            0,
          width:
            conversionData.width ||
            assemblyItem?.width ||
            offer.inquiry?.width ||
            0,
          height:
            conversionData.height ||
            assemblyItem?.height ||
            offer.inquiry?.height ||
            0,
          length:
            conversionData.length ||
            assemblyItem?.length ||
            offer.inquiry?.length ||
            0,
          purchasePrice:
            assemblyItem?.purchasePrice || offer.inquiry?.purchasePrice || 0,
          description: offer.assemblyDescription || offer.notes,
          photo: offer.inquiry?.image || "",
        };
      } else {
        const targetLineItem = lineItemId
          ? offer.lineItems.find((li) => li.id === lineItemId)
          : offer.lineItems[0];

        if (!targetLineItem) {
          return response.status(400).json({
            success: false,
            message: "No valid line items found in this offer to convert",
          });
        }
        sourceData = targetLineItem;
      }

      const itemId = await ItemGenerator.generateItemId();
      const ean = ItemGenerator.generateEAN(itemId);
      let taric: any = null;
      if (conversionData.taricId) {
        taric = await taricRepository.findOne({
          where: { id: conversionData.taricId },
        });

        if (!taric) {
          taric = taricRepository.create({
            id: conversionData.taricId,
            code: undefined,
            name_de: sourceData.itemName,
            name_en: sourceData.itemName,
            name_cn: conversionData.itemNameCN || sourceData.specification,
            description_de: sourceData.specification,
            description_en: sourceData.specification,
            reguler_artikel: "Y",
            duty_rate: 0,
          });
          await taricRepository.save(taric);
        }
      }

      if (!taric) {
        taric = await ItemGenerator.createTaricForItem(sourceData.itemName);
      }

      const itemData: any = {
        id: itemId,
        ean: ean,
        taric_id: taric.id,
        taric: taric,
        item_name: sourceData.itemName,
        item_name_cn: conversionData.itemNameCN || sourceData.itemName,
        photo: sourceData.photo || offer.inquiry?.image || "",
        weight: conversionData.weight || sourceData.weight,
        width: conversionData.width || sourceData.width,
        height: conversionData.height || sourceData.height,
        length: conversionData.length || sourceData.length,
        model: conversionData.model || sourceData.specification,
        remark: conversionData.remark || offer.notes || sourceData.description,
        note: conversionData.note || offer.internalNotes || sourceData.notes,
        RMB_Price: conversionData.RMBPrice || sourceData.purchasePrice || 0,
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
        category: null,
        parent: null,
      };

      const item = itemRepository.create(itemData);
      const savedItem = await itemRepository.save(item);

      offer.status = "Accepted";
      await offerRepository.save(offer);
      return response.status(201).json({
        success: true,
        message: "Offer successfully converted to Item",
        data: {
          item: savedItem,
          taric: taric,
          offerId: offer.id,
        },
      });
    } catch (error) {
      console.error("Error converting offer to item:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private async calculateOfferTotals(offerId: string): Promise<void> {
    try {
      const offer = await this.offerRepository.findOne({
        where: { id: offerId },
        relations: ["lineItems"],
      });

      if (!offer) {
        return;
      }

      let subtotal = 0;

      const customerItems =
        offer.lineItems?.filter((item: OfferLineItem) => !item.isComponent) ||
        [];

      for (const item of customerItems) {
        let lineTotal = 0;

        if (
          offer.useUnitPrices &&
          item.unitPrices &&
          item.unitPrices.length > 0
        ) {
          const activeUnitPrice = item.unitPrices.find(
            (up: UnitPrice) => up.isActive,
          );
          if (activeUnitPrice) {
            lineTotal = activeUnitPrice.totalPrice || 0;
          }
        } else if (item.quantityPrices && item.quantityPrices.length > 0) {
          const activePrice = item.quantityPrices.find(
            (qp: QuantityPrice) => qp.isActive,
          );
          if (activePrice) {
            lineTotal = activePrice.total || 0;
          }
        } else if (item.basePrice && item.baseQuantity) {
          const quantity = parseFloat(item.baseQuantity) || 1;
          const price = parseFloat(item.basePrice.toString()) || 0;
          lineTotal = quantity * price;
        }

        if (lineTotal > 0 && item.lineTotal !== lineTotal) {
          item.lineTotal = lineTotal;
          await this.lineItemRepository.save(item);
        }

        subtotal += lineTotal;
      }

      let total = subtotal;

      if (offer.discountPercentage && offer.discountPercentage > 0) {
        const discount = subtotal * (offer.discountPercentage / 100);
        total = subtotal - discount;
        offer.discountAmount = discount;
      } else if (offer.discountAmount && offer.discountAmount > 0) {
        total = subtotal - offer.discountAmount;
      }

      if (offer.shippingCost && offer.shippingCost > 0) {
        total += offer.shippingCost;
      }

      const taxRate = 0.19;
      const taxAmount = total * taxRate;
      const totalWithTax = total + taxAmount;

      const formatNumber = (num: number): number => {
        if (isNaN(num) || !isFinite(num)) {
          return 0;
        }
        return Math.round(num * 100) / 100;
      };

      offer.subtotal = formatNumber(subtotal);
      offer.taxAmount = formatNumber(taxAmount);
      offer.totalAmount = formatNumber(totalWithTax);

      await this.offerRepository.save(offer);
    } catch (error) {
      console.error("Error calculating offer totals:", error);
    }
  }

  private processUnitPrices(
    unitPricesDto: UnitPriceDto[],
    totalPriceDecimalPlaces: number = 2,
  ): UnitPrice[] {
    const now = new Date();
    return unitPricesDto.map((upDto: UnitPriceDto) => {
      const quantity = parseFloat(upDto.quantity) || 0;
      const unitPrice = parseFloat(upDto.unitPrice.toString()) || 0;
      const totalPrice =
        upDto.totalPrice ||
        parseFloat((quantity * unitPrice).toFixed(totalPriceDecimalPlaces));

      return {
        id: upDto.id || uuidv4(),
        quantity: upDto.quantity,
        unitPrice,
        totalPrice,
        isActive: upDto.isActive || false,
        createdAt: now,
        updatedAt: now,
      };
    });
  }

  async getAllOffers(request: Request, response: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        inquiryId,
        customerId,
        status,
        search,
      } = request.query;

      const queryBuilder = this.offerRepository
        .createQueryBuilder("offer")
        .leftJoinAndSelect("offer.lineItems", "lineItems")
        .leftJoinAndSelect("offer.inquiry", "inquiry")
        .orderBy("offer.createdAt", "DESC");

      if (inquiryId) {
        queryBuilder.andWhere("offer.inquiryId = :inquiryId", { inquiryId });
      }

      if (customerId) {
        queryBuilder.andWhere("offer.customerSnapshot->>'id' = :customerId", {
          customerId,
        });
      }

      if (status) {
        queryBuilder.andWhere("offer.status = :status", { status });
      }

      if (search) {
        queryBuilder.andWhere(
          "(offer.offerNumber LIKE :search OR offer.title LIKE :search OR offer.customerSnapshot->>'companyName' LIKE :search OR offer.inquirySnapshot->>'name' LIKE :search)",
          { search: `%${search}%` },
        );
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [offers, total] = await queryBuilder
        .skip(skip)
        .take(Number(limit))
        .getManyAndCount();

      for (const offer of offers) {
        if (offer.subtotal === 0 && offer.totalAmount === 0) {
          await this.calculateOfferTotals(offer.id);
        }
      }

      return response.status(200).json({
        success: true,
        data: offers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching offers:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getOfferById(request: Request, response: Response) {
    try {
      const { id } = request.params;

      const offer = await this.offerRepository.findOne({
        where: { id },
        relations: [
          "lineItems",
          "inquiry",
          "inquiry.customer",
          "inquiry.requests",
        ],
      });

      if (!offer) {
        return response.status(404).json({
          success: false,
          message: "Offer not found",
        });
      }

      if (offer.subtotal === 0 && offer.totalAmount === 0) {
        await this.calculateOfferTotals(offer.id);
        const updatedOffer = await this.offerRepository.findOne({
          where: { id },
          relations: ["lineItems"],
        });
        if (updatedOffer) {
          offer.subtotal = updatedOffer.subtotal;
          offer.taxAmount = updatedOffer.taxAmount;
          offer.totalAmount = updatedOffer.totalAmount;
        }
      }

      if (offer.lineItems) {
        offer.lineItems = offer.lineItems.map((item: any) => {
          let activePrice = null;

          if (
            offer.useUnitPrices &&
            item.unitPrices &&
            item.unitPrices.length > 0
          ) {
            activePrice =
              item.unitPrices.find((up: UnitPrice) => up.isActive) || null;
          } else if (item.quantityPrices && item.quantityPrices.length > 0) {
            activePrice =
              item.quantityPrices.find((qp: QuantityPrice) => qp.isActive) ||
              null;
          }

          return {
            ...item,
            activePrice,
          };
        });
      }

      return response.status(200).json({
        success: true,
        data: offer,
      });
    } catch (error) {
      console.error("Error fetching offer:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async updateOffer(request: Request, response: Response) {
    try {
      const { id } = request.params;

      const rawBody = request.body;

      const processedBody = {
        ...rawBody,
        discountPercentage:
          rawBody.discountPercentage !== undefined
            ? this.cleanNumberForDB(rawBody.discountPercentage)
            : undefined,
        discountAmount:
          rawBody.discountAmount !== undefined
            ? this.cleanNumberForDB(rawBody.discountAmount)
            : undefined,
        shippingCost:
          rawBody.shippingCost !== undefined
            ? this.cleanNumberForDB(rawBody.shippingCost)
            : undefined,
        subtotal:
          rawBody.subtotal !== undefined
            ? this.cleanNumberForDB(rawBody.subtotal)
            : undefined,
        taxAmount:
          rawBody.taxAmount !== undefined
            ? this.cleanNumberForDB(rawBody.taxAmount)
            : undefined,
        totalAmount:
          rawBody.totalAmount !== undefined
            ? this.cleanNumberForDB(rawBody.totalAmount)
            : undefined,
      };

      const offer = await this.offerRepository.findOne({
        where: { id },
        relations: ["lineItems"],
      });

      if (!offer) {
        return response.status(404).json({
          success: false,
          message: "Offer not found",
        });
      }

      console.log("Current offer from DB:", {
        subtotal: offer.subtotal,
        taxAmount: offer.taxAmount,
        totalAmount: offer.totalAmount,
        discountPercentage: offer.discountPercentage,
        discountAmount: offer.discountAmount,
        shippingCost: offer.shippingCost,
      });

      const updateOfferDto = plainToInstance(UpdateOfferDto, processedBody, {
        excludeExtraneousValues: false,
        enableImplicitConversion: true,
      });

      console.log(
        "UpdateOfferDto created:",
        JSON.stringify(updateOfferDto, null, 2),
      );

      if (!updateOfferDto || typeof updateOfferDto !== "object") {
        return response.status(400).json({
          success: false,
          message: "Invalid request body format",
        });
      }

      const errors: ValidationError[] = await validate(updateOfferDto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });

      if (errors.length > 0) {
        return response.status(400).json({
          success: false,
          errors: errors.map((error: ValidationError) => ({
            property: error.property,
            constraints: error.constraints,
          })),
        });
      }

      const unitPricingChanged =
        updateOfferDto.useUnitPrices !== undefined &&
        updateOfferDto.useUnitPrices !== offer.useUnitPrices;

      if (offer.subtotal && typeof offer.subtotal === "string") {
        console.log("Cleaning existing subtotal from DB:", offer.subtotal);
        offer.subtotal = this.cleanNumberForDB(offer.subtotal) || 0;
      }

      if (offer.taxAmount && typeof offer.taxAmount === "string") {
        console.log("Cleaning existing taxAmount from DB:", offer.taxAmount);
        offer.taxAmount = this.cleanNumberForDB(offer.taxAmount) || 0;
      }

      if (offer.totalAmount && typeof offer.totalAmount === "string") {
        console.log(
          "Cleaning existing totalAmount from DB:",
          offer.totalAmount,
        );
        offer.totalAmount = this.cleanNumberForDB(offer.totalAmount) || 0;
      }

      const fieldsToUpdate = [
        "title",
        "status",
        "validUntil",
        "deliveryTime",
        "paymentTerms",
        "deliveryTerms",
        "termsConditions",
        "notes",
        "currency",
        "deliveryAddress",
        "useUnitPrices",
        "unitPriceDecimalPlaces",
        "totalPriceDecimalPlaces",
        "maxUnitPriceColumns",
      ];

      fieldsToUpdate.forEach((field) => {
        if (updateOfferDto[field] !== undefined) {
          offer[field] = updateOfferDto[field];
        }
      });

      if (updateOfferDto.discountPercentage !== undefined) {
        offer.discountPercentage =
          this.cleanNumberForDB(updateOfferDto.discountPercentage) || 0;
      }

      if (updateOfferDto.discountAmount !== undefined) {
        offer.discountAmount =
          this.cleanNumberForDB(updateOfferDto.discountAmount) || 0;
      }

      if (updateOfferDto.shippingCost !== undefined) {
        offer.shippingCost =
          this.cleanNumberForDB(updateOfferDto.shippingCost) || 0;
      }

      if (updateOfferDto.subtotal !== undefined) {
        offer.subtotal = this.cleanNumberForDB(updateOfferDto.subtotal) || 0;
      }

      if (updateOfferDto.taxAmount !== undefined) {
        offer.taxAmount = this.cleanNumberForDB(updateOfferDto.taxAmount) || 0;
      }

      if (updateOfferDto.totalAmount !== undefined) {
        offer.totalAmount =
          this.cleanNumberForDB(updateOfferDto.totalAmount) || 0;
      }

      console.log("Offer before save:", {
        subtotal: offer.subtotal,
        taxAmount: offer.taxAmount,
        totalAmount: offer.totalAmount,
        type_subtotal: typeof offer.subtotal,
        type_taxAmount: typeof offer.taxAmount,
        type_totalAmount: typeof offer.totalAmount,
      });

      const updatedOffer = await this.offerRepository.save(offer);
      if (unitPricingChanged && offer.lineItems) {
        await this.updateLineItemsForUnitPricingChange(
          offer.id,
          updateOfferDto.useUnitPrices!,
        );
      }

      if (
        updateOfferDto.shippingCost !== undefined ||
        updateOfferDto.discountPercentage !== undefined ||
        updateOfferDto.discountAmount !== undefined ||
        updateOfferDto.subtotal !== undefined ||
        updateOfferDto.taxAmount !== undefined ||
        updateOfferDto.totalAmount !== undefined ||
        unitPricingChanged
      ) {
        await this.calculateOfferTotals(id);
      }

      const completeOffer = await this.offerRepository.findOne({
        where: { id: updatedOffer.id },
        relations: ["lineItems", "inquiry"],
      });

      return response.status(200).json({
        success: true,
        message: "Offer updated successfully",
        data: completeOffer,
      });
    } catch (error: any) {
      console.error("Error updating offer:", error);

      if (error) {
        console.error("SQL Error details:", {
          query: error.query,
          parameters: error.parameters,
          driverError: error.driverError,
        });
      }

      if (error.code === "22P02") {
        return response.status(400).json({
          success: false,
          message:
            "Invalid numeric value format. Please use numbers without thousand separators.",
          error: "Database rejected the numeric format",
          details: error.message,
        });
      }

      return response.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private cleanNumberForDB(value: any): number | undefined {
    if (value === null || value === undefined || value === "") {
      return undefined;
    }

    console.log(`cleanNumberForDB input: ${value}, type: ${typeof value}`);

    if (typeof value === "number") {
      return isNaN(value) ? 0 : value;
    }

    const str = String(value);

    if (str === "00.000.000" || str === "0.000.000") {
      console.log("Converting German zero format to 0");
      return 0;
    }
    const cleaned = str.replace(/\./g, "").replace(",", ".");

    const num = parseFloat(cleaned);

    console.log(`Result: ${num}`);

    return isNaN(num) ? 0 : num;
  }

  private async updateLineItemsForUnitPricingChange(
    offerId: string,
    useUnitPrices: boolean,
  ): Promise<void> {
    try {
      const lineItems = await this.lineItemRepository.find({
        where: { offerId, isComponent: false },
      });

      const updates = [];
      for (const lineItem of lineItems) {
        if (useUnitPrices) {
          if (!lineItem.unitPrices || lineItem.unitPrices.length === 0) {
            lineItem.unitPrices = this.createDefaultUnitPrices();
            updates.push(lineItem);
          }
        } else {
          lineItem.unitPrices = [];
          updates.push(lineItem);
        }
      }

      if (updates.length > 0) {
        await this.lineItemRepository.save(updates);
      }
    } catch (error) {
      console.error(
        "Error updating line items for unit pricing change:",
        error,
      );
    }
  }

  async updateLineItem(request: Request, response: Response) {
    try {
      const { offerId, lineItemId } = request.params;
      const updateLineItemDto = plainToInstance(
        UpdateLineItemDto,
        request.body,
      );

      const errors: ValidationError[] = await validate(updateLineItemDto);
      if (errors.length > 0) {
        return response.status(400).json({
          success: false,
          errors: errors.map((error: ValidationError) => ({
            property: error.property,
            constraints: error.constraints,
          })),
        });
      }

      const offer = await this.offerRepository.findOne({
        where: { id: offerId },
      });

      if (!offer) {
        return response.status(404).json({
          success: false,
          message: "Offer not found",
        });
      }

      const lineItem = await this.lineItemRepository.findOne({
        where: { id: lineItemId, offerId },
      });

      if (!lineItem) {
        return response.status(404).json({
          success: false,
          message: "Line item not found",
        });
      }

      if (updateLineItemDto.unitPrices && offer.useUnitPrices) {
        const processedUnitPrices = this.processUnitPrices(
          updateLineItemDto.unitPrices,
          offer.totalPriceDecimalPlaces || 2,
        );

        const activeCount = processedUnitPrices.filter(
          (up) => up.isActive,
        ).length;
        if (activeCount > 1) {
          processedUnitPrices.forEach((up, index) => {
            up.isActive = index === 0;
          });
        } else if (activeCount === 0 && processedUnitPrices.length > 0) {
          processedUnitPrices[0].isActive = true;
        }

        updateLineItemDto.unitPrices = processedUnitPrices;
      }

      if (updateLineItemDto.quantityPrices && !offer.useUnitPrices) {
        updateLineItemDto.quantityPrices = updateLineItemDto.quantityPrices.map(
          (qp: any) => ({
            ...qp,
            total: parseFloat(qp.quantity) * qp.price,
          }),
        );

        const activeCount = updateLineItemDto.quantityPrices.filter(
          (qp: any) => qp.isActive,
        ).length;
        if (activeCount > 1) {
          updateLineItemDto.quantityPrices =
            updateLineItemDto.quantityPrices.map((qp: any, index: number) => ({
              ...qp,
              isActive: index === 0,
            }));
        } else if (
          activeCount === 0 &&
          updateLineItemDto.quantityPrices.length > 0
        ) {
          updateLineItemDto.quantityPrices[0].isActive = true;
        }
      }
      Object.assign(lineItem, updateLineItemDto);
      if (
        offer.useUnitPrices &&
        updateLineItemDto.unitPrices &&
        updateLineItemDto.unitPrices.length > 0
      ) {
        const activeUnitPrice = updateLineItemDto.unitPrices.find(
          (up: UnitPrice) => up.isActive,
        );
        if (activeUnitPrice) {
          lineItem.lineTotal = activeUnitPrice.totalPrice;
        }
      } else if (
        updateLineItemDto.quantityPrices &&
        updateLineItemDto.quantityPrices.length > 0
      ) {
        const activePrice = updateLineItemDto.quantityPrices.find(
          (qp: any) => qp.isActive,
        );
        if (activePrice) {
          lineItem.lineTotal = activePrice.total;
        }
      } else if (
        updateLineItemDto.basePrice !== undefined &&
        updateLineItemDto.baseQuantity !== undefined
      ) {
        const quantity = parseFloat(updateLineItemDto.baseQuantity) || 1;
        lineItem.lineTotal = updateLineItemDto.basePrice * quantity;
      } else if (
        updateLineItemDto.basePrice !== undefined &&
        lineItem.baseQuantity
      ) {
        const quantity = parseFloat(lineItem.baseQuantity) || 1;
        lineItem.lineTotal = updateLineItemDto.basePrice * quantity;
      }

      const updatedLineItem = await this.lineItemRepository.save(lineItem);

      await this.calculateOfferTotals(offerId);

      return response.status(200).json({
        success: true,
        message: "Line item updated successfully",
        data: updatedLineItem,
      });
    } catch (error) {
      console.error("Error updating line item:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async addUnitPrice(request: Request, response: Response) {
    try {
      const { lineItemId } = request.params;
      const { quantity, unitPrice, isActive = false } = request.body;

      if (!quantity || !unitPrice) {
        return response.status(400).json({
          success: false,
          message: "Quantity and unit price are required",
        });
      }

      const lineItem = await this.lineItemRepository.findOne({
        where: { id: lineItemId },
        relations: ["offer"],
      });

      if (!lineItem) {
        return response.status(404).json({
          success: false,
          message: "Line item not found",
        });
      }

      const offer = lineItem.offer;
      if (!offer || !offer.useUnitPrices) {
        return response.status(400).json({
          success: false,
          message: "Unit pricing is not enabled for this offer",
        });
      }

      let unitPrices = lineItem.unitPrices || [];
      const qty = parseFloat(quantity) || 0;
      const price = parseFloat(unitPrice) || 0;
      const totalPriceDecimalPlaces = offer.totalPriceDecimalPlaces || 2;
      const totalPrice = parseFloat(
        (qty * price).toFixed(totalPriceDecimalPlaces),
      );
      const now = new Date();

      if (isActive) {
        unitPrices = unitPrices.map((up: UnitPrice) => ({
          ...up,
          isActive: false,
          updatedAt: now,
        }));
      }

      const newUnitPrice: UnitPrice = {
        id: uuidv4(),
        quantity,
        unitPrice: price,
        totalPrice,
        isActive,
        createdAt: now,
        updatedAt: now,
      };

      unitPrices.push(newUnitPrice);

      unitPrices.sort(
        (a: UnitPrice, b: UnitPrice) =>
          parseFloat(a.quantity) - parseFloat(b.quantity),
      );

      lineItem.unitPrices = unitPrices;

      const activeUnitPrice = unitPrices.find((up: UnitPrice) => up.isActive);
      if (activeUnitPrice) {
        lineItem.lineTotal = activeUnitPrice.totalPrice;
      } else if (unitPrices.length > 0) {
        lineItem.unitPrices[0].isActive = true;
        lineItem.lineTotal = lineItem.unitPrices[0].totalPrice;
      }

      const updatedLineItem = await this.lineItemRepository.save(lineItem);

      if (lineItem.offerId) {
        await this.calculateOfferTotals(lineItem.offerId);
      }

      return response.status(200).json({
        success: true,
        message: "Unit price added successfully",
        data: updatedLineItem,
      });
    } catch (error) {
      console.error("Error adding unit price:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async addQuantityPrice(request: Request, response: Response) {
    try {
      const { lineItemId } = request.params;
      const { quantity, price, isActive = false } = request.body;

      if (!quantity || !price) {
        return response.status(400).json({
          success: false,
          message: "Quantity and price are required",
        });
      }

      const lineItem = await this.lineItemRepository.findOne({
        where: { id: lineItemId },
        relations: ["offer"],
      });

      if (!lineItem) {
        return response.status(404).json({
          success: false,
          message: "Line item not found",
        });
      }

      const offer = lineItem.offer;
      if (offer && offer.useUnitPrices) {
        return response.status(400).json({
          success: false,
          message:
            "Unit pricing is enabled for this offer. Use unit prices instead.",
        });
      }

      let quantityPrices = lineItem.quantityPrices || [];
      const total = parseFloat(quantity) * parseFloat(price);

      if (isActive) {
        quantityPrices = quantityPrices.map((qp: any) => ({
          ...qp,
          isActive: false,
        }));
      }

      quantityPrices.push({
        quantity,
        price: parseFloat(price),
        isActive,
        total,
      });

      quantityPrices.sort(
        (a: any, b: any) => parseFloat(a.quantity) - parseFloat(b.quantity),
      );

      lineItem.quantityPrices = quantityPrices;

      const activePrice = quantityPrices.find((qp: any) => qp.isActive);
      if (activePrice) {
        lineItem.lineTotal = activePrice.total;
      } else if (quantityPrices.length > 0) {
        lineItem.quantityPrices[0].isActive = true;
        lineItem.lineTotal = lineItem.quantityPrices[0].total;
      }

      const updatedLineItem = await this.lineItemRepository.save(lineItem);

      if (lineItem.offerId) {
        await this.calculateOfferTotals(lineItem.offerId);
      }

      return response.status(200).json({
        success: true,
        message: "Quantity price added successfully",
        data: updatedLineItem,
      });
    } catch (error) {
      console.error("Error adding quantity price:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async bulkUpdateLineItems(request: Request, response: Response) {
    try {
      const { offerId } = request.params;
      const bulkUpdateDto = plainToInstance(
        BulkUpdateLineItemsDto,
        request.body,
      );

      const errors: ValidationError[] = await validate(bulkUpdateDto);
      if (errors.length > 0) {
        return response.status(400).json({
          success: false,
          errors: errors.map((error: ValidationError) => ({
            property: error.property,
            constraints: error.constraints,
          })),
        });
      }

      const offer = await this.offerRepository.findOne({
        where: { id: offerId },
      });

      if (!offer) {
        return response.status(404).json({
          success: false,
          message: "Offer not found",
        });
      }

      const results = [];
      const errorsList = [];

      for (const itemUpdate of bulkUpdateDto.lineItems) {
        try {
          const lineItem = await this.lineItemRepository.findOne({
            where: { id: itemUpdate.id, offerId },
          });

          if (!lineItem) {
            errorsList.push({
              id: itemUpdate.id,
              error: "Line item not found",
            });
            continue;
          }

          if (itemUpdate.quantityPrices !== undefined) {
            lineItem.quantityPrices = itemUpdate.quantityPrices.map(
              (qp: any) => ({
                ...qp,
                total: parseFloat(qp.quantity) * qp.price,
              }),
            );
          }

          if (itemUpdate.unitPrices !== undefined && offer.useUnitPrices) {
            lineItem.unitPrices = this.processUnitPrices(
              itemUpdate.unitPrices,
              offer.totalPriceDecimalPlaces || 2,
            );
          }

          if (itemUpdate.basePrice !== undefined)
            lineItem.basePrice = itemUpdate.basePrice;
          if (itemUpdate.samplePrice !== undefined)
            lineItem.samplePrice = itemUpdate.samplePrice;
          if (itemUpdate.lineTotal !== undefined)
            lineItem.lineTotal = itemUpdate.lineTotal;
          if (itemUpdate.notes !== undefined) lineItem.notes = itemUpdate.notes;

          const updatedItem = await this.lineItemRepository.save(lineItem);
          results.push(updatedItem);
        } catch (error) {
          errorsList.push({
            id: itemUpdate.id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      await this.calculateOfferTotals(offerId);

      return response.status(200).json({
        success: true,
        message: `Updated ${results.length} line items`,
        data: {
          updated: results,
          errors: errorsList.length > 0 ? errorsList : undefined,
        },
      });
    } catch (error) {
      console.error("Error in bulk update:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async copyPastePrices(request: Request, response: Response) {
    try {
      const { offerId } = request.params;
      const { data } = plainToInstance(CopyPastePricesDto, request.body);

      if (!data) {
        return response.status(400).json({
          success: false,
          message: "Data is required",
        });
      }

      const offer = await this.offerRepository.findOne({
        where: { id: offerId },
      });

      if (!offer) {
        return response.status(404).json({
          success: false,
          message: "Offer not found",
        });
      }

      const rows = data
        .trim()
        .split("\n")
        .map((row: string) => row.split("\t"));

      if (rows.length < 2) {
        return response.status(400).json({
          success: false,
          message: "Invalid data format",
        });
      }

      const lineItems = await this.lineItemRepository.find({
        where: { offerId, isComponent: false },
        order: { position: "ASC" },
      });

      const updates = [];
      for (let i = 1; i < rows.length && i - 1 < lineItems.length; i++) {
        const row = rows[i];
        const lineItem = lineItems[i - 1];

        if (row.length >= 3) {
          const unitPrices: UnitPriceDto[] = [];
          const now = new Date();

          for (let j = 1; j < row.length - 1; j += 2) {
            const quantity = row[j]?.trim();
            const unitPrice = parseFloat(row[j + 1]?.trim() || "0");

            if (quantity && !isNaN(unitPrice) && unitPrice > 0) {
              const qty = parseFloat(quantity) || 0;
              const totalPriceDecimalPlaces =
                offer.totalPriceDecimalPlaces || 2;
              const totalPrice = parseFloat(
                (qty * unitPrice).toFixed(totalPriceDecimalPlaces),
              );

              unitPrices.push({
                id: uuidv4(),
                quantity,
                unitPrice,
                totalPrice,
                isActive: j === 1,
              });
            }
          }

          if (unitPrices.length > 0) {
            if (offer.useUnitPrices) {
              lineItem.unitPrices = unitPrices.map((upDto: UnitPriceDto) => ({
                ...upDto,
                createdAt: now,
                updatedAt: now,
              }));

              const activeUnitPrice = unitPrices.find((up) => up.isActive);
              if (activeUnitPrice) {
                lineItem.lineTotal = activeUnitPrice.totalPrice || 0;
              }
            } else {
              lineItem.quantityPrices = unitPrices.map(
                (upDto: UnitPriceDto) => ({
                  quantity: upDto.quantity,
                  price: upDto.unitPrice,
                  isActive: upDto.isActive || false,
                  total: upDto.totalPrice || 0,
                }),
              );

              const activePrice = lineItem.quantityPrices.find(
                (qp: any) => qp.isActive,
              );
              if (activePrice) {
                lineItem.lineTotal = activePrice.total || 0;
              }
            }
            updates.push(lineItem);
          }
        }
      }

      if (updates.length > 0) {
        await this.lineItemRepository.save(updates);
        await this.calculateOfferTotals(offerId);
      }

      return response.status(200).json({
        success: true,
        message: `Updated prices for ${updates.length} items`,
        data: updates,
      });
    } catch (error) {
      console.error("Error processing copied prices:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async setActivePrice(request: Request, response: Response) {
    try {
      const { lineItemId, priceType, priceIndex } = request.params;

      const lineItem = await this.lineItemRepository.findOne({
        where: { id: lineItemId },
        relations: ["offer"],
      });

      if (!lineItem) {
        return response.status(404).json({
          success: false,
          message: "Line item not found",
        });
      }

      const offer = lineItem.offer;
      if (!offer) {
        return response.status(400).json({
          success: false,
          message: "Offer not found for line item",
        });
      }

      const index = parseInt(priceIndex);
      if (isNaN(index) || index < 0) {
        return response.status(400).json({
          success: false,
          message: "Invalid price index",
        });
      }

      if (priceType === "unit") {
        if (!offer.useUnitPrices) {
          return response.status(400).json({
            success: false,
            message: "Unit pricing is not enabled for this offer",
          });
        }

        if (!lineItem.unitPrices || lineItem.unitPrices.length === 0) {
          return response.status(400).json({
            success: false,
            message: "No unit prices found",
          });
        }

        if (index >= lineItem.unitPrices.length) {
          return response.status(400).json({
            success: false,
            message: "Invalid unit price index",
          });
        }

        const now = new Date();
        lineItem.unitPrices = lineItem.unitPrices.map(
          (up: UnitPrice, i: number) => ({
            ...up,
            isActive: i === index,
            updatedAt: i === index ? now : up.updatedAt,
          }),
        );

        const activeUnitPrice = lineItem.unitPrices[index];
        lineItem.lineTotal = activeUnitPrice.totalPrice;
      } else {
        if (offer.useUnitPrices) {
          return response.status(400).json({
            success: false,
            message:
              "Unit pricing is enabled for this offer. Use unit prices instead.",
          });
        }

        if (!lineItem.quantityPrices || lineItem.quantityPrices.length === 0) {
          return response.status(400).json({
            success: false,
            message: "No quantity prices found",
          });
        }

        if (index >= lineItem.quantityPrices.length) {
          return response.status(400).json({
            success: false,
            message: "Invalid price index",
          });
        }

        lineItem.quantityPrices = lineItem.quantityPrices.map(
          (qp: any, i: number) => ({
            ...qp,
            isActive: i === index,
          }),
        );

        const activePrice = lineItem.quantityPrices[index];
        lineItem.lineTotal = activePrice.total;
      }

      const updatedLineItem = await this.lineItemRepository.save(lineItem);

      if (lineItem.offerId) {
        await this.calculateOfferTotals(lineItem.offerId);
      }

      return response.status(200).json({
        success: true,
        message: "Active price set successfully",
        data: updatedLineItem,
      });
    } catch (error) {
      console.error("Error setting active price:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async toggleOfferUnitPrices(request: Request, response: Response) {
    try {
      const { offerId } = request.params;
      const { useUnitPrices } = request.body;

      if (useUnitPrices === undefined) {
        return response.status(400).json({
          success: false,
          message: "useUnitPrices is required",
        });
      }

      const offer = await this.offerRepository.findOne({
        where: { id: offerId },
      });

      if (!offer) {
        return response.status(404).json({
          success: false,
          message: "Offer not found",
        });
      }

      const cleanNumericValue = (value: any): number => {
        if (value === null || value === undefined) {
          return 0;
        }
        if (typeof value === "number" && !isNaN(value)) {
          return value;
        }

        if (typeof value === "string") {
          const cleaned = value.replace(/[^0-9.-]/g, "");
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        }

        return 0;
      };

      offer.subtotal = cleanNumericValue(offer.subtotal);
      offer.taxAmount = cleanNumericValue(offer.taxAmount);
      offer.totalAmount = cleanNumericValue(offer.totalAmount);
      offer.discountAmount = cleanNumericValue(offer.discountAmount);
      offer.shippingCost = cleanNumericValue(offer.shippingCost);

      const previousUseUnitPrices = offer.useUnitPrices;
      offer.useUnitPrices = useUnitPrices;

      if (useUnitPrices) {
        if (!offer.unitPriceDecimalPlaces) offer.unitPriceDecimalPlaces = 3;
        if (!offer.totalPriceDecimalPlaces) offer.totalPriceDecimalPlaces = 2;
        if (!offer.maxUnitPriceColumns) offer.maxUnitPriceColumns = 3;
        if (!offer.defaultUnitPrices || offer.defaultUnitPrices.length === 0) {
          offer.defaultUnitPrices = this.createDefaultUnitPrices();
        }
      }

      const updateData: any = {
        useUnitPrices: offer.useUnitPrices,
        updatedAt: new Date(),
      };
      if (typeof offer.subtotal === "number" && !isNaN(offer.subtotal)) {
        updateData.subtotal = offer.subtotal;
      }
      if (typeof offer.taxAmount === "number" && !isNaN(offer.taxAmount)) {
        updateData.taxAmount = offer.taxAmount;
      }
      if (typeof offer.totalAmount === "number" && !isNaN(offer.totalAmount)) {
        updateData.totalAmount = offer.totalAmount;
      }
      if (typeof offer.unitPriceDecimalPlaces === "number") {
        updateData.unitPriceDecimalPlaces = offer.unitPriceDecimalPlaces;
      }
      if (typeof offer.totalPriceDecimalPlaces === "number") {
        updateData.totalPriceDecimalPlaces = offer.totalPriceDecimalPlaces;
      }
      if (typeof offer.maxUnitPriceColumns === "number") {
        updateData.maxUnitPriceColumns = offer.maxUnitPriceColumns;
      }
      if (offer.defaultUnitPrices) {
        updateData.defaultUnitPrices = offer.defaultUnitPrices;
      }

      await this.offerRepository.update(offerId, updateData);

      if (previousUseUnitPrices !== useUnitPrices) {
        await this.updateLineItemsForUnitPricingChange(offerId, useUnitPrices);
        try {
          await this.calculateOfferTotals(offerId);
        } catch (calcError) {
          console.error(
            "Error calculating totals after toggling unit prices:",
            calcError,
          );
        }
      }

      const updatedOffer = await this.offerRepository.findOne({
        where: { id: offerId },
      });

      return response.status(200).json({
        success: true,
        message: `Unit prices ${
          useUnitPrices ? "enabled" : "disabled"
        } successfully for entire offer`,
        data: updatedOffer,
      });
    } catch (error) {
      console.error("Error toggling offer unit prices:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
  async bulkUpdateOfferUnitPrices(request: Request, response: Response) {
    try {
      const { offerId } = request.params;
      const { unitPrices } = request.body;

      if (!unitPrices || !Array.isArray(unitPrices)) {
        return response.status(400).json({
          success: false,
          message: "unitPrices array is required",
        });
      }

      const offer = await this.offerRepository.findOne({
        where: { id: offerId },
      });

      if (!offer) {
        return response.status(404).json({
          success: false,
          message: "Offer not found",
        });
      }

      if (!offer.useUnitPrices) {
        return response.status(400).json({
          success: false,
          message: "Unit pricing is not enabled for this offer",
        });
      }

      const processedUnitPrices = this.processUnitPrices(
        unitPrices,
        offer.totalPriceDecimalPlaces || 2,
      );
      offer.defaultUnitPrices = processedUnitPrices;
      await this.offerRepository.save(offer);

      const lineItems = await this.lineItemRepository.find({
        where: { offerId, isComponent: false },
      });

      const updates = [];
      for (const lineItem of lineItems) {
        const existingUnitPrices = lineItem.unitPrices || [];
        const updatedUnitPrices = processedUnitPrices.map(
          (newUp: UnitPrice) => {
            const existingUp = existingUnitPrices.find(
              (up: UnitPrice) => up.quantity === newUp.quantity,
            );
            if (existingUp) {
              return {
                ...newUp,
                unitPrice: existingUp.unitPrice,
                totalPrice: parseFloat(
                  (
                    parseFloat(existingUp.quantity) * existingUp.unitPrice
                  ).toFixed(offer.totalPriceDecimalPlaces || 2),
                ),
              };
            }
            return newUp;
          },
        );

        lineItem.unitPrices = updatedUnitPrices;

        const activeUnitPrice = updatedUnitPrices.find(
          (up: UnitPrice) => up.isActive,
        );
        if (activeUnitPrice) {
          lineItem.lineTotal = activeUnitPrice.totalPrice;
        }

        updates.push(lineItem);
      }

      if (updates.length > 0) {
        await this.lineItemRepository.save(updates);
      }

      await this.calculateOfferTotals(offerId);

      return response.status(200).json({
        success: true,
        message: "Unit prices updated for all line items",
        data: { updatedLineItems: updates.length },
      });
    } catch (error) {
      console.error("Error bulk updating offer unit prices:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
  async syncUnitPricesAcrossOffer(request: Request, response: Response) {
    try {
      const { offerId } = request.params;

      const offer = await this.offerRepository.findOne({
        where: { id: offerId },
      });

      if (!offer) {
        return response.status(404).json({
          success: false,
          message: "Offer not found",
        });
      }

      if (!offer.useUnitPrices) {
        return response.status(400).json({
          success: false,
          message: "Unit pricing is not enabled for this offer",
        });
      }

      const templateUnitPrices =
        offer.defaultUnitPrices || this.createDefaultUnitPrices();

      const lineItems = await this.lineItemRepository.find({
        where: { offerId, isComponent: false },
      });

      const updates = [];
      for (const lineItem of lineItems) {
        const existingUnitPrices = lineItem.unitPrices || [];
        const updatedUnitPrices = templateUnitPrices.map(
          (templateUp: UnitPrice) => {
            const existingUp = existingUnitPrices.find(
              (up: UnitPrice) => up.quantity === templateUp.quantity,
            );
            if (existingUp) {
              return {
                ...templateUp,
                unitPrice: existingUp.unitPrice,
                totalPrice: parseFloat(
                  (
                    parseFloat(existingUp.quantity) * existingUp.unitPrice
                  ).toFixed(offer.totalPriceDecimalPlaces || 2),
                ),
                isActive: existingUp.isActive,
              };
            }
            return templateUp;
          },
        );

        lineItem.unitPrices = updatedUnitPrices;

        const activeUnitPrice = updatedUnitPrices.find(
          (up: UnitPrice) => up.isActive,
        );
        if (activeUnitPrice) {
          lineItem.lineTotal = activeUnitPrice.totalPrice;
        } else if (updatedUnitPrices.length > 0) {
          lineItem.unitPrices[0].isActive = true;
          lineItem.lineTotal = lineItem.unitPrices[0].totalPrice;
        }

        updates.push(lineItem);
      }

      if (updates.length > 0) {
        await this.lineItemRepository.save(updates);
      }

      await this.calculateOfferTotals(offerId);

      return response.status(200).json({
        success: true,
        message: "Unit prices synced across all line items",
        data: { syncedLineItems: updates.length },
      });
    } catch (error) {
      console.error("Error syncing unit prices across offer:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async createRevision(request: Request, response: Response) {
    try {
      const { id } = request.params;
      const createOfferDto = plainToInstance(CreateOfferDto, request.body);

      const originalOffer = await this.offerRepository.findOne({
        where: { id },
        relations: ["lineItems"],
      });

      if (!originalOffer) {
        return response.status(404).json({
          success: false,
          message: "Original offer not found",
        });
      }

      const newOfferNumber = await this.generateOfferNumber();

      const newOffer = this.offerRepository.create({
        ...originalOffer,
        id: undefined,
        offerNumber: newOfferNumber,
        previousOfferNumber: originalOffer.offerNumber,
        revision: originalOffer.revision + 1,
        status: "Draft",
        pdfGenerated: false,
        pdfPath: null,
        pdfGeneratedAt: null,
        createdAt: undefined,
        updatedAt: undefined,
        lineItems: undefined,
      });

      Object.assign(newOffer, createOfferDto);

      const savedOffer = await this.offerRepository.save(newOffer);
      if (originalOffer.lineItems && originalOffer.lineItems.length > 0) {
        const newLineItems = originalOffer.lineItems.map((lineItem: any) => {
          return this.lineItemRepository.create({
            ...lineItem,
            id: undefined,
            offer: savedOffer,
            offerId: savedOffer.id,
            createdAt: undefined,
            updatedAt: undefined,
          });
        });

        await this.lineItemRepository.save(newLineItems);
      }

      const completeOffer = await this.offerRepository.findOne({
        where: { id: savedOffer.id },
        relations: ["lineItems", "inquiry"],
      });

      return response.status(201).json({
        success: true,
        message: "Offer revision created successfully",
        data: completeOffer,
      });
    } catch (error) {
      console.error("Error creating offer revision:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getOfferStatistics(request: Request, response: Response) {
    try {
      const totalOffers = await this.offerRepository.count();
      const draftOffers = await this.offerRepository.count({
        where: { status: "Draft" },
      });
      const submittedOffers = await this.offerRepository.count({
        where: { status: "Submitted" },
      });
      const acceptedOffers = await this.offerRepository.count({
        where: { status: "Accepted" },
      });
      const rejectedOffers = await this.offerRepository.count({
        where: { status: "Rejected" },
      });

      const offersWithUnitPricing = await this.offerRepository.count({
        where: { useUnitPrices: true },
      });
      const recentOffers = await this.offerRepository.find({
        order: { createdAt: "DESC" },
        take: 5,
        relations: ["inquiry"],
      });

      return response.status(200).json({
        success: true,
        data: {
          totalOffers,
          byStatus: {
            draft: draftOffers,
            submitted: submittedOffers,
            accepted: acceptedOffers,
            rejected: rejectedOffers,
          },
          unitPricing: {
            enabled: offersWithUnitPricing,
            disabled: totalOffers - offersWithUnitPricing,
          },
          recentOffers,
        },
      });
    } catch (error) {
      console.error("Error fetching offer statistics:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async generatePdf(request: Request, response: Response) {
    try {
      const { id } = request.params;

      if (!id) {
        return response.status(400).json({
          success: false,
          message: "Offer ID is required",
        });
      }

      const offer = await this.offerRepository.findOne({
        where: { id },
        relations: [
          "lineItems",
          "inquiry",
          "inquiry.contactPerson",
          "inquiry.customer",
        ],
      });

      if (!offer) {
        return response.status(404).json({
          success: false,
          message: "Offer not found",
        });
      }

      const formatDate = (dateValue: any): string => {
        if (!dateValue) return "N/A";
        const date =
          typeof dateValue === "string" ? new Date(dateValue) : dateValue;
        if (!(date instanceof Date) || isNaN(date.getTime())) return "N/A";
        return date.toLocaleDateString("de-DE");
      };

      const getSafeNumber = (numValue: any): number => {
        if (numValue === null || numValue === undefined || numValue === "")
          return 0;
        if (typeof numValue === "string") {
          const cleaned = numValue.replace(/[^0-9.-]/g, "");
          if (cleaned === "" || cleaned === "-") return 0;
          const num = parseFloat(cleaned);
          return isNaN(num) ? 0 : num;
        }
        const num = Number(numValue);
        return isNaN(num) ? 0 : num;
      };

      const formatNumber = (numValue: any, decimals: number = 2): string => {
        const num = getSafeNumber(numValue);
        const factor = Math.pow(10, decimals);
        const rounded = Math.round((num + Number.EPSILON) * factor) / factor;
        const fixedNum = Math.abs(rounded).toFixed(decimals);
        return rounded < 0 ? `-${fixedNum}` : fixedNum;
      };

      const calculateTotals = (offerData: any) => {
        let subtotal = 0;

        if (offerData.lineItems && Array.isArray(offerData.lineItems)) {
          const customerItems = offerData.lineItems.filter(
            (item: any) => !item.isComponent,
          );

          customerItems.forEach((item: any) => {
            if (
              offerData.useUnitPrices &&
              item.unitPrices &&
              Array.isArray(item.unitPrices)
            ) {
              const activeUnitPrice = item.unitPrices.find(
                (up: any) => up.isActive,
              );
              if (activeUnitPrice) {
                subtotal += getSafeNumber(activeUnitPrice.totalPrice);
              }
            } else if (
              item.quantityPrices &&
              Array.isArray(item.quantityPrices)
            ) {
              const activePrice = item.quantityPrices.find(
                (qp: any) => qp.isActive,
              );
              if (activePrice) {
                subtotal += getSafeNumber(activePrice.total);
              }
            } else if (item.baseQuantity || item.basePrice) {
              const quantity = getSafeNumber(item.baseQuantity);
              const price = getSafeNumber(item.basePrice);
              subtotal += quantity * price;
            }
          });
        }

        const discount = getSafeNumber(
          offerData.discountAmount || offerData.discount,
        );
        let discountedSubtotal = subtotal - discount;
        if (discountedSubtotal < 0) discountedSubtotal = 0;

        const shipping = getSafeNumber(
          offerData.shippingCost || offerData.shipping,
        );
        const amountBeforeTax = discountedSubtotal + shipping;

        const taxRate = offerData.taxRate
          ? getSafeNumber(offerData.taxRate) / 100
          : 0.19;
        const taxAmount = amountBeforeTax * taxRate;

        const totalAmount = amountBeforeTax + taxAmount;

        return {
          subtotal: subtotal.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          discountAmount: discount.toFixed(2),
          shippingCost: shipping.toFixed(2),
        };
      };

      const totals = calculateTotals(offer);

      const doc = new PDFDocument({
        margin: 50,
        size: "A4",
        bufferPages: true,
      });

      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 50;

      const leftAlignX = margin;
      const rightAlignX = 350;
      const centerColumnX = 200;
      const rightColumnX = 420;

      const companyInfo = {
        name: "GTech Industries GmbH",
        address: "Antonio-Segni-Str. 4",
        city: "44263 Dortmund",
        country: "Deutschland",
        phone: "+49 231 58697565",
        email: "info@gtech.de",
        website: "www.gtech.de",
        registrationNumber: "Amtsgericht Hagen HRB 12496",
        ceo: "Geschäftsführer Joschua Grenzheuser",
        vatId: "DE291514916",
        taxNumber: "316/5733/1295",
        weeeNumber: "DE 66370256",
        iban: "DE16 4404 0037 0210 9288 00",
        bic: "COBADEFFXXX",
        bank: "Commerzbank Dortmund",
      };

      const uploadsDir = path.join(__dirname, "../../uploads/offers");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const pdfFileName = `${offer.offerNumber || "offer"}.pdf`;
      const pdfPath = path.join(uploadsDir, pdfFileName);

      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);

      const pdfWritePromise = new Promise<void>((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      let yPos = 50;
      const logoPath = path.join(process.cwd(), "assets", "logo.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, leftAlignX, yPos, { width: 100, height: 50 });
      }
      const fontSource = _cachedCjkFontBuffer || _cachedCjkFontPath;

      doc.fontSize(12).font("Helvetica-Bold");
      doc.text(companyInfo.name, rightAlignX, yPos);

      yPos += 15;
      doc.fontSize(10).font("Helvetica");
      doc.text(companyInfo.address, rightAlignX, yPos);
      yPos += 12;
      doc.text(companyInfo.city, rightAlignX, yPos);
      yPos += 12;
      doc.text(companyInfo.country, rightAlignX, yPos);

      yPos += 15;
      doc.text(companyInfo.phone, rightAlignX, yPos);
      yPos += 12;
      doc.text(companyInfo.email, rightAlignX, yPos);
      yPos += 12;
      doc.text(companyInfo.website, rightAlignX, yPos);
      yPos = 180;
      doc.fontSize(8).font("Helvetica");
      doc.fillColor("#666666");
      doc.text(
        `${companyInfo.name} - ${companyInfo.address} - ${companyInfo.city}`,
        leftAlignX,
        yPos,
      );

      let customer: any = {};
      if (offer.customerSnapshot) {
        try {
          customer =
            typeof offer.customerSnapshot === "string"
              ? JSON.parse(offer.customerSnapshot)
              : offer.customerSnapshot;
        } catch (e) {
          customer = offer.customerSnapshot;
        }
      }
      yPos += 20;
      doc.fontSize(12).font("Helvetica-Bold");
      doc.fillColor("#000000");
      doc.text(customer.companyName || "", leftAlignX, yPos);

      yPos += 15;
      doc.fontSize(10).font("Helvetica");
      if (customer.legalName && customer.legalName !== customer.companyName) {
        doc.text(customer.legalName, leftAlignX, yPos);
        yPos += 12;
      } else if (
        customer.additionalInfo &&
        customer.additionalInfo !== "Additional Info"
      ) {
        doc.text(customer.additionalInfo, leftAlignX, yPos);
        yPos += 12;
      }

      doc.text(customer.address || customer.street || "", leftAlignX, yPos);
      yPos += 12;

      doc.text(
        `${customer.postalCode || ""} ${customer.city || ""}`.trim(),
        leftAlignX,
        yPos,
      );
      yPos += 12;

      const displayCountry = formatCountry(customer.country);
      if (
        displayCountry &&
        displayCountry.toUpperCase() !== "DE" &&
        displayCountry.toUpperCase() !== "GERMANY" &&
        displayCountry.toUpperCase() !== "DEUTSCHLAND"
      ) {
        doc.text(displayCountry, leftAlignX, yPos);
        yPos += 12;
      }

      const customerVatId =
        customer.vatId || customer.vatTaxId || customer.taxNumber || "";
      if (
        customerVatId &&
        displayCountry &&
        displayCountry.toUpperCase() !== "DE" &&
        displayCountry.toUpperCase() !== "GERMANY" &&
        displayCountry.toUpperCase() !== "DEUTSCHLAND"
      ) {
        doc.text(`VAT ID: ${customerVatId}`, leftAlignX, yPos);
        yPos += 12;
      }

      const boxY = 180;
      const boxWidth = 180;
      const boxHeight = 120;

      doc.lineWidth(0.3);
      doc.rect(rightAlignX, boxY, boxWidth, boxHeight).stroke("#CCCCCC");
      doc
        .rect(rightAlignX, boxY, boxWidth, 30)
        .fillAndStroke("#CCCCCC", "#CCCCCC");
      doc.fontSize(15).font("Helvetica-Bold");
      doc.fillColor("#000000");
      doc.text("Angebot", rightAlignX + 5, boxY + 8);

      const detailsStartY = boxY + 40;
      doc.fontSize(10).font("Helvetica");

      const contactName = offer.inquiry?.contactPerson
        ? `${offer.inquiry.contactPerson.name} ${offer.inquiry.contactPerson.familyName}`
        : "Alexander";

      const offerDetails = [
        ["Angebotsnr.", offer.offerNumber || ""],
        ["Datum", formatDate(offer.createdAt)],
        ["Gültig bis", formatDate(offer.validUntil)],
        ["Ansprechpartner", contactName],
        [
          "Kundennr.",
          offer.inquiry?.customer?.customerNumber ||
            customer.customerNumber ||
            "-",
        ],
      ];

      offerDetails.forEach((detail, index) => {
        const detailY = detailsStartY + index * 15;
        doc.text(detail[0], rightAlignX + 10, detailY);
        doc.font("Helvetica-Bold");
        doc.text(detail[1], rightAlignX + 90, detailY);
        doc.font("Helvetica");
      });

      yPos = 320;
      doc.fontSize(10).font("Helvetica");
      if (offer.deliveryTime) {
        doc.text(`Lieferzeit: ${offer.deliveryTime}`, leftAlignX, yPos);
      }
      if (offer.deliveryTerms) {
        doc.text(
          `Lieferbedingungen: ${offer.deliveryTerms}`,
          leftAlignX + 250,
          yPos,
        );
      }

      yPos += 20;
      const tableY = yPos;

      const columns = [
        { header: "Pos", width: 25, align: "left" },
        { header: "Art. Nr.", width: 60, align: "left" },
        { header: "Menge", width: 40, align: "left" },
        { header: "Bezeichnung", width: 155, align: "left" },
        { header: "Gesamt\n(Netto)", width: 55, align: "left" },
        { header: "MwSt", width: 45, align: "left" },
        { header: "E-Preis", width: 55, align: "left" },
        { header: "Gesamt\n(Brutto)", width: 60, align: "left" },
      ];

      const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
      const rowHeight = 40;
      const headerHeight = 35;

      doc.lineWidth(0.3);
      doc
        .rect(leftAlignX, tableY, tableWidth, headerHeight)
        .fillAndStroke("#E8E8E8", "#333333");
      doc.fontSize(9).font("Helvetica-Bold");
      doc.fillColor("#000000");

      let currentX = leftAlignX;
      columns.forEach((col) => {
        doc.text(col.header, currentX + 3, tableY + 8, {
          width: col.width - 6,
          align: col.align as "center" | "left" | "right" | "justify",
        });
        currentX += col.width;
      });

      doc.lineWidth(0.3);
      doc
        .moveTo(leftAlignX, tableY + headerHeight)
        .lineTo(leftAlignX + tableWidth, tableY + headerHeight)
        .stroke("#333333");

      doc.fontSize(9).font("Helvetica");

      const getActivePrice = (lineItem: any, offerUsesUnitPrices: boolean) => {
        if (
          offerUsesUnitPrices &&
          lineItem.unitPrices &&
          lineItem.unitPrices.length > 0
        ) {
          return lineItem.unitPrices.find((up: any) => up.isActive) || null;
        } else if (
          lineItem.quantityPrices &&
          lineItem.quantityPrices.length > 0
        ) {
          return lineItem.quantityPrices.find((qp: any) => qp.isActive) || null;
        }
        return null;
      };

      let currentY = tableY + headerHeight;

      if (offer.lineItems && Array.isArray(offer.lineItems)) {
        const customerItems = offer.lineItems.filter(
          (item: any) => !item.isComponent,
        );

        customerItems.forEach((item: any, rowIndex: number) => {
          const activePrice = getActivePrice(item, offer.useUnitPrices);

          let qtyStr = "1";
          let unitPriceNum = 0;
          let netTotalNum = 0;

          if (activePrice) {
            qtyStr = Number(activePrice.quantity).toString();
            unitPriceNum = getSafeNumber(
              "unitPrice" in activePrice
                ? activePrice.unitPrice
                : activePrice.price,
            );
            netTotalNum = getSafeNumber(
              "totalPrice" in activePrice
                ? activePrice.totalPrice
                : activePrice.total,
            );
          } else {
            qtyStr = Number(item.baseQuantity || 1).toString();
            unitPriceNum = getSafeNumber(item.basePrice);
            netTotalNum = qtyStr
              ? parseFloat(qtyStr) * unitPriceNum
              : unitPriceNum;
          }

          const vatRate = offer.taxRate ? getSafeNumber(offer.taxRate) : 19;
          const grossTotalNum = netTotalNum * (1 + vatRate / 100);

          let nameText = item.itemName || "Item";
          if (item.description) {
            nameText += `\n${item.description}`;
          }

          if (
            offer.useUnitPrices &&
            item.unitPrices &&
            item.unitPrices.length > 1
          ) {
            nameText += "\nStaffelpreise:";
            item.unitPrices.slice(0, 3).forEach((up: any) => {
              const activeMark = up.isActive ? " (*)" : "";
              nameText += `\n  - ${up.quantity} Stk: € ${formatNumber(up.unitPrice, offer.unitPriceDecimalPlaces || 3)} / Stk${activeMark}`;
            });
          } else if (item.quantityPrices && item.quantityPrices.length > 1) {
            nameText += "\nMengenstaffel:";
            item.quantityPrices.slice(0, 3).forEach((qp: any) => {
              const activeMark = qp.isActive ? " (*)" : "";
              nameText += `\n  - ${qp.quantity} Stk: € ${formatNumber(qp.price, 3)} / Stk${activeMark}`;
            });
          }
          const designationWidth = columns[3].width - 6;
          doc.fontSize(9);
          if (fontSource) {
            try {
              doc.font(fontSource, 0);
            } catch (e) {
              doc.font("Helvetica");
            }
          } else {
            doc.font("Helvetica");
          }
          const textHeight = doc.heightOfString(nameText, {
            width: designationWidth,
          });
          doc.font("Helvetica");
          const computedRowHeight = Math.max(40, textHeight + 12);
          if (currentY + computedRowHeight > pageHeight - 120) {
            doc.lineWidth(0.3);
            doc
              .moveTo(leftAlignX, currentY)
              .lineTo(leftAlignX + tableWidth, currentY)
              .stroke("#333333");

            doc.addPage();

            const newTableY = 60;
            doc.lineWidth(0.3);
            doc
              .rect(leftAlignX, newTableY, tableWidth, headerHeight)
              .fillAndStroke("#E8E8E8", "#333333");
            doc.fontSize(9).font("Helvetica-Bold");
            doc.fillColor("#000000");

            let tempX = leftAlignX;
            columns.forEach((col) => {
              doc.text(col.header, tempX + 3, newTableY + 8, {
                width: col.width - 6,
                align: col.align as "center" | "left" | "right" | "justify",
              });
              tempX += col.width;
            });

            doc.lineWidth(0.3);
            doc
              .moveTo(leftAlignX, newTableY + headerHeight)
              .lineTo(leftAlignX + tableWidth, newTableY + headerHeight)
              .stroke("#333333");

            currentY = newTableY + headerHeight;
          }

          if (rowIndex % 2 === 1) {
            doc
              .rect(leftAlignX, currentY, tableWidth, computedRowHeight)
              .fill("#FAFAFA");
          }

          const rowData = [
            (rowIndex + 1).toString(),
            item.material || item.id.substring(0, 8),
            qtyStr,
            nameText,
            `${formatNumber(netTotalNum, 2)} ${offer.currency || "EUR"}`,
            `${vatRate}%`,
            `${formatNumber(unitPriceNum, offer.unitPriceDecimalPlaces || 3)} ${offer.currency || "EUR"}`,
            `${formatNumber(grossTotalNum, 2)} ${offer.currency || "EUR"}`,
          ];

          currentX = leftAlignX;
          rowData.forEach((data, colIndex) => {
            const align: any = columns[colIndex].align;
            let textX = currentX + 3;

            if (align === "right") {
              textX = currentX + columns[colIndex].width - 3;
            } else if (align === "center") {
              textX = currentX + columns[colIndex].width / 2;
            }

            if (colIndex === 3 && fontSource) {
              try {
                doc.font(fontSource, 0);
              } catch (e) {
                doc.font("Helvetica");
              }
            } else {
              doc.font("Helvetica");
            }

            doc.fillColor("#000000");
            doc.text(data, textX, currentY + 6, {
              width: columns[colIndex].width - 6,
              align: align,
            });
            currentX += columns[colIndex].width;
          });

          doc.font("Helvetica");

          if (rowIndex < customerItems.length - 1) {
            doc.lineWidth(0.5);
            doc
              .moveTo(leftAlignX, currentY + computedRowHeight)
              .lineTo(leftAlignX + tableWidth, currentY + computedRowHeight)
              .stroke("#E0E0E0");
          }

          currentY += computedRowHeight;
        });
      }

      doc.lineWidth(0.3);
      doc
        .moveTo(leftAlignX, currentY)
        .lineTo(leftAlignX + tableWidth, currentY)
        .stroke("#333333");

      yPos = currentY + 30;
      if (yPos + 150 > pageHeight - 120) {
        doc.addPage();
        yPos = 60;
      }

      doc.fontSize(10).font("Helvetica");
      doc.text("Gesamtpreis Netto", rightAlignX, yPos);
      doc.text(
        `${Number(totals.subtotal || 0).toFixed(2)} ${offer.currency || "EUR"}`,
        rightAlignX + 120,
        yPos,
        { align: "right" },
      );

      if (Number(totals.discountAmount || 0) > 0) {
        yPos += 18;
        doc.text(
          `Rabatt (${offer.discountPercentage || 0}%)`,
          rightAlignX,
          yPos,
        );
        doc.text(
          `-${Number(totals.discountAmount).toFixed(2)} ${offer.currency || "EUR"}`,
          rightAlignX + 120,
          yPos,
          { align: "right" },
        );
      }

      if (Number(totals.shippingCost || 0) > 0) {
        yPos += 18;
        doc.text("Versandkosten", rightAlignX, yPos);
        doc.text(
          `${Number(totals.shippingCost).toFixed(2)} ${offer.currency || "EUR"}`,
          rightAlignX + 120,
          yPos,
          { align: "right" },
        );
      }

      const taxRatePercent = offer.taxRate ? Number(offer.taxRate) : 19;
      yPos += 18;
      doc.text(`MwSt. ${taxRatePercent.toFixed(2)}%`, rightAlignX, yPos);
      doc.text(
        `${Number(totals.taxAmount || 0).toFixed(2)} ${offer.currency || "EUR"}`,
        rightAlignX + 120,
        yPos,
        { align: "right" },
      );

      yPos += 20;
      doc.lineWidth(0.3);
      doc
        .rect(rightAlignX - 5, yPos - 3, 200, 22)
        .fillAndStroke("#F5F5F5", "#CCCCCC");
      doc.fontSize(11).font("Helvetica-Bold");
      doc.fillColor("#000000");
      doc.text("Gesamtpreis Brutto", rightAlignX, yPos + 5);
      doc.text(
        `${Number(totals.totalAmount || 0).toFixed(2)} ${offer.currency || "EUR"}`,
        rightAlignX + 120,
        yPos + 5,
        { align: "right" },
      );
      yPos += 35;
      let notesHeight = 15;
      if (offer.paymentTerms) notesHeight += 15;
      if (offer.notes)
        notesHeight +=
          doc.heightOfString(`Hinweise: ${offer.notes}`, { width: 500 }) + 5;

      if (yPos + notesHeight > pageHeight - 120) {
        doc.addPage();
        yPos = 60;
      }

      doc.fontSize(10).font("Helvetica");
      doc.fillColor("#000000");

      doc.text("All prices are net prices.", leftAlignX, yPos);
      yPos += 15;

      if (offer.paymentTerms) {
        doc.text(
          `Zahlungsbedingungen: ${offer.paymentTerms}`,
          leftAlignX,
          yPos,
        );
        yPos += 15;
      }

      if (offer.notes) {
        doc.text(`Hinweise: ${offer.notes}`, leftAlignX, yPos, { width: 500 });
      }

      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        const pNum = i + 1;

        const footerY = pageHeight - 120;
        doc.lineWidth(0.5);
        doc
          .moveTo(leftAlignX, footerY - 15)
          .lineTo(pageWidth - margin, footerY - 15)
          .stroke("#CCCCCC");

        doc.fontSize(8).fillColor("#666666");
        if (fontSource) {
          try {
            doc.font(fontSource);
          } catch (e) {
            doc.font("Helvetica");
          }
        } else {
          doc.font("Helvetica");
        }

        doc.font("Helvetica-Bold");
        doc.text(companyInfo.name, leftAlignX, footerY);
        doc.font("Helvetica");
        doc.text(`IBAN: ${companyInfo.iban}`, leftAlignX, footerY + 12);
        doc.text(`BIC: ${companyInfo.bic}`, leftAlignX, footerY + 24);
        doc.text(companyInfo.bank, leftAlignX, footerY + 36);

        doc.text(companyInfo.registrationNumber, centerColumnX, footerY);
        doc.text(companyInfo.ceo, centerColumnX, footerY + 12);
        doc.text(`Ust.-ID: ${companyInfo.vatId}`, centerColumnX, footerY + 24);
        doc.text(
          `SteuerNR: ${companyInfo.taxNumber}`,
          centerColumnX,
          footerY + 36,
        );
        doc.text(
          `WEEE-Reg.-Nr. ${companyInfo.weeeNumber}`,
          centerColumnX,
          footerY + 48,
        );

        doc.text(`Angebotsnr:`, rightColumnX, footerY);
        doc.font("Helvetica-Bold");
        doc.text(`${offer.offerNumber || "N/A"}`, rightColumnX + 60, footerY);
        doc.font("Helvetica");
        doc.text(
          `Seite ${pNum} / ${pages.count}`,
          rightColumnX + 60,
          footerY + 48,
        );
      }

      doc.end();
      await pdfWritePromise;

      try {
        offer.pdfPath = `/uploads/offers/${pdfFileName}`;
        offer.pdfGenerated = true;
        offer.pdfGeneratedAt = new Date();
        await this.offerRepository.save(offer);
      } catch (dbError) {
        console.warn("Database update failed but PDF was created:", dbError);
      }

      response.setHeader("Content-Type", "application/pdf");
      response.setHeader(
        "Content-Disposition",
        `attachment; filename="${pdfFileName}"`,
      );

      const fileStream = fs.createReadStream(pdfPath);
      fileStream.pipe(response);
    } catch (error: any) {
      console.error("Error generating PDF:", error);

      return response.status(500).json({
        success: false,
        message: "Internal server error while generating PDF",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
  async generateAndDownloadPdf(request: Request, response: Response) {
    try {
      const { id } = request.params;

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (!id || !uuidRegex.test(id)) {
        console.error(`[PDF Error] Blocked invalid UUID: "${id}"`);
        return response.status(400).json({
          success: false,
          message:
            "Invalid Offer ID format. The request never reached the database to prevent a crash.",
        });
      }

      const offer = await this.offerRepository.findOne({
        where: { id: id },
        relations: ["lineItems"],
      });

      if (!offer) {
        return response.status(404).json({
          success: false,
          message: "Offer not found.",
        });
      }

      const uploadsDir = path.join(__dirname, "../../uploads/offers");
      const pdfFileName = `${offer.offerNumber || "offer"}.pdf`;
      const pdfPath = path.join(uploadsDir, pdfFileName);

      if (fs.existsSync(pdfPath)) {
        response.setHeader("Content-Type", "application/pdf");
        response.setHeader(
          "Content-Disposition",
          `attachment; filename="${pdfFileName}"`,
        );
        response.setHeader(
          "Access-Control-Expose-Headers",
          "Content-Disposition",
        );
        const fileStream = fs.createReadStream(pdfPath);
        fileStream.pipe(response);
        return new Promise<void>((resolve, reject) => {
          response.on("finish", resolve);
          response.on("error", (err) => {
            console.error("Streaming error:", err);
            reject(err);
          });
        });
      } else {
        return this.generatePdf(request, response);
      }
    } catch (error: any) {
      console.error("Fatal Controller Error:", error);
      if (!response.headersSent) {
        return response.status(500).json({
          success: false,
          message: "Internal server error during PDF generation",
          details: error.message,
        });
      }
    }
  }

  async deleteOffer(request: Request, response: Response) {
    try {
      const { id } = request.params;

      const offer = await this.offerRepository.findOne({
        where: { id },
      });

      if (!offer) {
        return response.status(404).json({
          success: false,
          message: "Offer not found",
        });
      }

      await this.offerRepository.remove(offer);

      return response.status(200).json({
        success: true,
        message: "Offer deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting offer:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getOffersByInquiry(request: Request, response: Response) {
    try {
      const { inquiryId } = request.params;
      const { page = 1, limit = 20 } = request.query;

      const inquiry = await this.inquiryRepository.findOne({
        where: { id: inquiryId },
      });

      if (!inquiry) {
        return response.status(404).json({
          success: false,
          message: "Inquiry not found",
        });
      }

      const queryBuilder = this.offerRepository
        .createQueryBuilder("offer")
        .leftJoinAndSelect("offer.lineItems", "lineItems")
        .where("offer.inquiryId = :inquiryId", { inquiryId })
        .orderBy("offer.createdAt", "DESC");

      const skip = (Number(page) - 1) * Number(limit);
      const [offers, total] = await queryBuilder
        .skip(skip)
        .take(Number(limit))
        .getManyAndCount();

      return response.status(200).json({
        success: true,
        data: offers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching offers by inquiry:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getOfferStatuses(request: Request, response: Response) {
    try {
      const statuses = [
        { value: "Draft", label: "Draft" },
        { value: "Submitted", label: "Submitted" },
        { value: "Negotiation", label: "Negotiation" },
        { value: "Accepted", label: "Accepted" },
        { value: "Rejected", label: "Rejected" },
        { value: "Expired", label: "Expired" },
        { value: "Cancelled", label: "Cancelled" },
      ];

      return response.status(200).json({
        success: true,
        data: statuses,
      });
    } catch (error) {
      console.error("Error fetching offer statuses:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getAvailableCurrencies(request: Request, response: Response) {
    try {
      const currencies = [
        { code: "EUR", symbol: "€", name: "Euro" },
        { code: "USD", symbol: "$", name: "US Dollar" },
        { code: "RMB", symbol: "¥", name: "Chinese Yuan" },
        { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
      ];

      return response.status(200).json({
        success: true,
        data: currencies,
      });
    } catch (error) {
      console.error("Error fetching currencies:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

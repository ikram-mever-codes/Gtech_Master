import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import {
  Offer,
  CustomerSnapshot,
  PriceMatrixEntry,
  PricingMode,
  OfferLineItem,
  ItemSnapshot,
} from "../models/offer";
import { Inquiry } from "../models/inquiry";
import { RequestedItem } from "../models/requested_items";
import { Customer } from "../models/customers";
import {
  parseFlexibleNumber,
  parseFlexibleNumberOrZero,
} from "../utils/decimal";

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
import { resolveGtechFonts } from "../utils/gtech_fonts";
import {
  registerGtechFonts,
  fontRegular,
  fontMedium,
  fontSemiBold,
  drawGtechBrandLayer,
} from "../services/gtechDocumentTemplate";

import { In } from "typeorm";

const formatCountry = (country?: string | null): string => {
  if (!country) return "";
  const code = country.trim().toUpperCase();
  if (code === "DE") return "Germany";
  if (code === "AT") return "Austria";
  if (code === "CH") return "Switzerland";
  return country.trim();
};

const coerceDate = (value: any): Date | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
};

export class PriceMatrixEntryDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  quantity!: string;

  // number, or null/undefined/"." for "not calculated"
  @IsOptional()
  price?: number | string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

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
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  shippingMethod?: string;

  @IsOptional()
  @IsString()
  deliveryTime?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(["classic", "matrix"])
  pricingMode?: PricingMode;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

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
  defaultPriceMatrix?: PriceMatrixEntryDto[];
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
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  shippingMethod?: string;

  @IsOptional()
  @IsString()
  deliveryTime?: string;

  @IsOptional()
  @IsEnum(["RMB", "HKD", "EUR", "USD"])
  currency?: "RMB" | "HKD" | "EUR" | "USD";

  @IsOptional()
  @IsEnum(["classic", "matrix"])
  pricingMode?: PricingMode;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

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
  defaultPriceMatrix?: PriceMatrixEntryDto[];
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
  priceMatrix?: PriceMatrixEntryDto[];

  @IsOptional()
  @IsString()
  baseQuantity?: string;

  @IsOptional()
  basePrice?: number | string;

  @IsOptional()
  samplePrice?: number | string;

  @IsOptional()
  @IsString()
  sampleQuantity?: string;

  @IsOptional()
  lineTotal?: number | string;

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
    priceMatrix?: PriceMatrixEntryDto[];
    basePrice?: number | string;
    samplePrice?: number | string;
    lineTotal?: number | string;
    notes?: string;
  }>;
}

export class PasteMatrixDto {
  @IsString()
  data!: string;

  @IsNumber()
  @Min(1)
  tierCount!: number;
}

export class CreateOfferFromItemDto {
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
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  shippingMethod?: string;

  @IsOptional()
  @IsString()
  baseQuantity?: string;

  @IsOptional()
  @IsEnum(["classic", "matrix"])
  pricingMode?: PricingMode;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

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
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  shippingMethod?: string;

  @IsOptional()
  @IsEnum(["classic", "matrix"])
  pricingMode?: PricingMode;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

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
  basePrice?: number | string;

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
    const sc = customer.starCustomerDetails;
    if (sc && sc.deliveryAddressLine1) {
      return {
        street: sc.deliveryAddressLine1,
        city:
          sc.deliveryCity ||
          customer.city ||
          customer.businessDetails?.city ||
          "",
        state: sc.deliveryState || customer.businessDetails?.state || "",
        postalCode:
          sc.deliveryPostalCode ||
          customer.postalCode ||
          customer.businessDetails?.postalCode ||
          "",
        country:
          sc.deliveryCountry ||
          customer.country ||
          customer.businessDetails?.country ||
          "",
        contactName: customer.legalName || customer.companyName || "",
        contactPhone: customer.contactPhoneNumber || "",
      };
    }
    return {
      street: customer.addressLine1 || "Street Address",
      city: customer.city || customer.businessDetails?.city || "",
      state: customer.businessDetails?.state || "",
      postalCode:
        customer.postalCode || customer.businessDetails?.postalCode || "",
      country: customer.country || customer.businessDetails?.country || "",
      contactName: customer.legalName || customer.companyName || "",
      contactPhone: customer.contactPhoneNumber || "",
    };
  }

  // ---------------------------------------------------------------------
  // Pricing helpers
  // ---------------------------------------------------------------------

  private createDefaultPriceMatrix(): PriceMatrixEntry[] {
    const now = new Date();
    return ["1000", "5000", "10000"].map((q, i) => ({
      id: uuidv4(),
      quantity: q,
      price: null,
      total: null,
      isActive: i === 0,
      createdAt: now,
      updatedAt: now,
    }));
  }

  private processPriceMatrix(
    entries: PriceMatrixEntryDto[],
    totalPriceDecimalPlaces: number = 2,
  ): PriceMatrixEntry[] {
    const now = new Date();
    const processed: PriceMatrixEntry[] = entries.map((e) => {
      const price = parseFlexibleNumber(e.price);
      const qty = parseFlexibleNumber(e.quantity) ?? 0;
      const total =
        price === null
          ? null
          : parseFloat((qty * price).toFixed(totalPriceDecimalPlaces));

      return {
        id: e.id || uuidv4(),
        quantity: e.quantity,
        price,
        total,
        isActive: !!e.isActive,
        createdAt: now,
        updatedAt: now,
      };
    });

    // Only entries with a real price can be active. Never more than one.
    const activeCandidates = processed.filter(
      (p) => p.isActive && p.price !== null,
    );
    if (activeCandidates.length > 1) {
      let first = true;
      processed.forEach((p) => {
        if (p.isActive && p.price !== null) {
          p.isActive = first;
          first = false;
        } else {
          p.isActive = false;
        }
      });
    } else if (activeCandidates.length === 0) {
      const firstReal = processed.find((p) => p.price !== null);
      if (firstReal) firstReal.isActive = true;
      processed.forEach((p) => {
        if (p !== firstReal) p.isActive = false;
      });
    } else {
      processed.forEach((p) => {
        if (p.price === null) p.isActive = false;
      });
    }

    return processed;
  }

  private getActiveMatrixEntry(item: any): PriceMatrixEntry | null {
    return (
      (item.priceMatrix || []).find((p: PriceMatrixEntry) => p.isActive) || null
    );
  }

  private getLineItemTotal(item: any, pricingMode: PricingMode): number {
    if (pricingMode === "matrix") {
      const active = this.getActiveMatrixEntry(item);
      return active?.total ?? 0;
    }
    const qty = parseFlexibleNumberOrZero(item.baseQuantity) || 1;
    const price = parseFlexibleNumberOrZero(item.basePrice);
    return qty * price;
  }

  async createOfferFromInquiry(request: Request, response: Response) {
    try {
      const { inquiryId } = request.params;

      const bodyForDto = {
        ...request.body,
        validUntil: coerceDate(request.body?.validUntil),
      };

      const createOfferDto = plainToInstance(CreateOfferDto, bodyForDto, {
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
        referenceNumber: inquiry.inquiryNo || inquiry.referenceNumber,
        status: inquiry.status,
        requestsCount: inquiry.requests?.length || 0,
      };

      const customerSnapshot: CustomerSnapshot =
        this.buildCustomerSnapshot(customer);

      const pricingMode: PricingMode = createOfferDto.pricingMode || "classic";
      const defaultPriceMatrix =
        pricingMode === "matrix"
          ? createOfferDto.defaultPriceMatrix
            ? this.processPriceMatrix(
                createOfferDto.defaultPriceMatrix,
                createOfferDto.totalPriceDecimalPlaces || 2,
              )
            : this.createDefaultPriceMatrix()
          : undefined;

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
          coerceDate(createOfferDto.validUntil) ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        termsConditions: createOfferDto.termsConditions,
        deliveryTerms: createOfferDto.deliveryTerms,
        paymentTerms: createOfferDto.paymentTerms,
        paymentMethod: createOfferDto.paymentMethod,
        shippingMethod: createOfferDto.shippingMethod,
        deliveryTime: createOfferDto.deliveryTime,
        currency: createOfferDto.currency || "EUR",
        pricingMode,
        taxRate: createOfferDto.taxRate ?? 19,
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
        unitPriceDecimalPlaces: createOfferDto.unitPriceDecimalPlaces || 3,
        totalPriceDecimalPlaces: createOfferDto.totalPriceDecimalPlaces || 2,
        maxUnitPriceColumns: createOfferDto.maxUnitPriceColumns || 3,
        defaultPriceMatrix,
        revision: 1,
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
      });

      const savedOffer = await this.offerRepository.save(offer);
      let lineItems: OfferLineItem[] = [];
      let position = 1;

      const matrixForLine = () =>
        pricingMode === "matrix" ? this.createDefaultPriceMatrix() : undefined;

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
          priceMatrix: matrixForLine(),
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
              lineTotal: 0,
            });
            lineItems.push(componentItem);
          }
        }
      } else {
        if (inquiry.requests && inquiry.requests.length > 0) {
          for (const request of inquiry.requests) {
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
              priceMatrix: matrixForLine(),
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

  async createOfferFromItem(request: Request, response: Response) {
    try {
      const { itemId } = request.params;
      const body: CreateOfferFromItemDto & { itemIds?: string[] } =
        request.body || {};
      const requestedIds: number[] = Array.from(
        new Set(
          [itemId, ...(Array.isArray(body.itemIds) ? body.itemIds : [])]
            .map((id) => parseInt(String(id), 10))
            .filter((id) => !isNaN(id)),
        ),
      );

      if (requestedIds.length === 0) {
        return response
          .status(400)
          .json({ success: false, message: "No item ids provided." });
      }

      const itemRepository = AppDataSource.getRepository(Item);
      const fetchedItems: any[] = await itemRepository.find({
        where: { id: In(requestedIds) },
        relations: ["customer", "taric"],
      });

      if (fetchedItems.length === 0) {
        return response
          .status(404)
          .json({ success: false, message: "No matching items found." });
      }

      const itemById = new Map(fetchedItems.map((it) => [String(it.id), it]));
      const orderedItems = requestedIds
        .map((id) => itemById.get(String(id)))
        .filter((it): it is any => !!it);

      if (orderedItems.length === 0) {
        return response
          .status(404)
          .json({ success: false, message: "No matching items found." });
      }

      let customer: any = null;
      if (body.customerId) {
        customer = await this.customerRepository.findOne({
          where: { id: body.customerId },
          relations: ["businessDetails", "starCustomerDetails"],
        });
      }
      if (!customer) {
        customer = orderedItems[0].customer || null;
      }
      if (!customer) {
        return response.status(400).json({
          success: false,
          message:
            "No recipient customer could be resolved. Pass a customerId to create the offer.",
        });
      }

      const offerNumber = await this.generateOfferNumber();
      const customerSnapshot = this.buildCustomerSnapshot(customer);

      const pricingMode: PricingMode = body.pricingMode || "classic";
      const defaultPriceMatrix =
        pricingMode === "matrix" ? this.createDefaultPriceMatrix() : undefined;

      const primary = orderedItems[0];
      const primarySnapshot: ItemSnapshot = this.buildItemSnapshot(primary);

      const offer = this.offerRepository.create({
        offerNumber,
        sourceType: "item",
        title:
          body.title ||
          (orderedItems.length > 1
            ? `Offer for ${primarySnapshot.itemName} +${orderedItems.length - 1} more`
            : `Offer for ${primarySnapshot.itemName}`),
        inquiry: null,
        inquiryId: null,
        inquirySnapshot: null,
        itemId: primarySnapshot.id,
        itemSnapshot: primarySnapshot,
        customerId: customer.id,
        customerSnapshot,
        deliveryAddress: this.buildDeliveryAddress(customer),
        status: "Draft",
        validUntil:
          coerceDate(body.validUntil) ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currency: body.currency || "EUR",
        notes: body.notes,
        internalNotes: body.internalNotes,
        paymentMethod: body.paymentMethod,
        shippingMethod: body.shippingMethod,
        isAssembly: false,
        pricingMode,
        taxRate: body.taxRate ?? 19,
        unitPriceDecimalPlaces: body.unitPriceDecimalPlaces || 3,
        totalPriceDecimalPlaces: body.totalPriceDecimalPlaces || 2,
        maxUnitPriceColumns: body.maxUnitPriceColumns || 3,
        defaultPriceMatrix,
        revision: 1,
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
      });

      const savedOffer = await this.offerRepository.save(offer);
      const lineItems = orderedItems.map((item, idx) => {
        const snap = this.buildItemSnapshot(item);
        return this.lineItemRepository.create({
          offer: savedOffer,
          offerId: savedOffer.id,
          sourceItemId: snap.id,
          itemName: snap.itemName,
          specification: snap.specification,
          description: snap.description,
          weight: snap.weight,
          width: snap.width,
          height: snap.height,
          length: snap.length,
          purchasePrice: snap.purchasePrice,
          purchaseCurrency: snap.purchaseCurrency,
          baseQuantity: body.baseQuantity || "1",
          position: idx + 1,
          priceMatrix:
            pricingMode === "matrix"
              ? this.createDefaultPriceMatrix()
              : undefined,
          lineTotal: 0,
        });
      });

      await this.lineItemRepository.save(lineItems);
      await this.calculateOfferTotals(savedOffer.id);

      const completeOffer = await this.offerRepository.findOne({
        where: { id: savedOffer.id },
        relations: ["lineItems"],
      });

      return response.status(201).json({
        success: true,
        message:
          orderedItems.length > 1
            ? `Offer created from ${orderedItems.length} items successfully`
            : "Offer created from item successfully",
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
      const basePrice = parseFlexibleNumber(body.basePrice) ?? 0;
      const baseQuantity = body.baseQuantity?.trim() || "1";

      const lineItem = this.lineItemRepository.create({
        offer,
        offerId: offer.id,
        itemName: body.itemName.trim(),
        material: body.material,
        specification: body.specification,
        description: body.description,
        baseQuantity: baseQuantity || "1",
        basePrice: basePrice ?? undefined,
        notes: body.notes,
        position: nextPosition,
        priceMatrix: offer.pricingMode === "matrix" ? [] : undefined,
        lineTotal:
          basePrice !== null
            ? basePrice * (parseFlexibleNumber(body.baseQuantity) || 1)
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
  async deletePriceColumn(request: Request, response: Response) {
    try {
      const { offerId } = request.params;
      const quantity = (request.query.quantity ?? request.body?.quantity) as
        | string
        | undefined;

      if (!quantity) {
        return response.status(400).json({
          success: false,
          message: "A quantity is required to identify the column to delete.",
        });
      }

      const offer = await this.offerRepository.findOne({
        where: { id: offerId },
      });
      if (!offer) {
        return response
          .status(404)
          .json({ success: false, message: "Offer not found" });
      }
      if (offer.pricingMode !== "matrix") {
        return response.status(400).json({
          success: false,
          message:
            "This offer is in Classic mode; there are no tiers to delete.",
        });
      }

      const lineItems = await this.lineItemRepository.find({
        where: { offerId, isComponent: false },
      });

      const target = String(quantity).trim();
      const updates = [];

      for (const lineItem of lineItems) {
        const before: PriceMatrixEntry[] = lineItem.priceMatrix || [];
        const after = before.filter(
          (p) => String(p.quantity).trim() !== target,
        );
        if (after.length !== before.length) {
          if (after.length > 0 && !after.some((p) => p.isActive)) {
            const firstReal = after.find((p) => p.price !== null);
            if (firstReal) firstReal.isActive = true;
          }
          lineItem.priceMatrix = after;
          updates.push(lineItem);
        }
      }

      if (offer.defaultPriceMatrix) {
        offer.defaultPriceMatrix = offer.defaultPriceMatrix.filter(
          (p: PriceMatrixEntry) => String(p.quantity).trim() !== target,
        );
        await this.offerRepository.save(offer);
      }

      if (updates.length > 0) {
        await this.lineItemRepository.save(updates);
      }

      await this.calculateOfferTotals(offerId);

      return response.status(200).json({
        success: true,
        message: `Removed the ${target} tier from ${updates.length} line items`,
        data: { updatedLineItems: updates.length },
      });
    } catch (error) {
      console.error("Error deleting price column:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
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

      if (!offer) return;

      let subtotal = 0;
      const customerItems =
        offer.lineItems?.filter((item: OfferLineItem) => !item.isComponent) ||
        [];

      for (const item of customerItems) {
        const lineTotal = this.getLineItemTotal(item, offer.pricingMode);

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

      const taxRate = (offer.taxRate ?? 19) / 100;
      const taxAmount = total * taxRate;
      const totalWithTax = total + taxAmount;

      const formatNumber = (num: number): number => {
        if (isNaN(num) || !isFinite(num)) return 0;
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
        offer.lineItems = offer.lineItems.map((item: any) => ({
          ...item,
          activePrice: this.getActiveMatrixEntry(item),
        }));
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
        validUntil:
          rawBody.validUntil !== undefined
            ? coerceDate(rawBody.validUntil)
            : undefined,
        discountPercentage:
          rawBody.discountPercentage !== undefined
            ? parseFlexibleNumberOrZero(rawBody.discountPercentage)
            : undefined,
        discountAmount:
          rawBody.discountAmount !== undefined
            ? parseFlexibleNumberOrZero(rawBody.discountAmount)
            : undefined,
        shippingCost:
          rawBody.shippingCost !== undefined
            ? parseFlexibleNumberOrZero(rawBody.shippingCost)
            : undefined,
        subtotal:
          rawBody.subtotal !== undefined
            ? parseFlexibleNumberOrZero(rawBody.subtotal)
            : undefined,
        taxAmount:
          rawBody.taxAmount !== undefined
            ? parseFlexibleNumberOrZero(rawBody.taxAmount)
            : undefined,
        totalAmount:
          rawBody.totalAmount !== undefined
            ? parseFlexibleNumberOrZero(rawBody.totalAmount)
            : undefined,
        taxRate:
          rawBody.taxRate !== undefined
            ? parseFlexibleNumberOrZero(rawBody.taxRate)
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

      const updateOfferDto = plainToInstance(UpdateOfferDto, processedBody, {
        excludeExtraneousValues: false,
        enableImplicitConversion: true,
      });

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

      const pricingModeChanged =
        updateOfferDto.pricingMode !== undefined &&
        updateOfferDto.pricingMode !== offer.pricingMode;

      if (typeof offer.subtotal === "string") {
        offer.subtotal = parseFlexibleNumberOrZero(offer.subtotal);
      }
      if (typeof offer.taxAmount === "string") {
        offer.taxAmount = parseFlexibleNumberOrZero(offer.taxAmount);
      }
      if (typeof offer.totalAmount === "string") {
        offer.totalAmount = parseFlexibleNumberOrZero(offer.totalAmount);
      }

      const fieldsToUpdate = [
        "title",
        "status",
        "validUntil",
        "deliveryTime",
        "paymentTerms",
        "paymentMethod",
        "shippingMethod",
        "deliveryTerms",
        "termsConditions",
        "notes",
        "internalNotes",
        "currency",
        "deliveryAddress",
        "pricingMode",
        "taxRate",
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
        offer.discountPercentage = updateOfferDto.discountPercentage;
      }
      if (updateOfferDto.discountAmount !== undefined) {
        offer.discountAmount = updateOfferDto.discountAmount;
      }
      if (updateOfferDto.shippingCost !== undefined) {
        offer.shippingCost = updateOfferDto.shippingCost;
      }
      if (updateOfferDto.subtotal !== undefined) {
        offer.subtotal = updateOfferDto.subtotal;
      }
      if (updateOfferDto.taxAmount !== undefined) {
        offer.taxAmount = updateOfferDto.taxAmount;
      }
      if (updateOfferDto.totalAmount !== undefined) {
        offer.totalAmount = updateOfferDto.totalAmount;
      }

      if (
        pricingModeChanged &&
        offer.pricingMode === "matrix" &&
        !offer.defaultPriceMatrix
      ) {
        offer.defaultPriceMatrix = this.createDefaultPriceMatrix();
      }

      const updatedOffer = await this.offerRepository.save(offer);

      if (pricingModeChanged) {
        await this.applyPricingModeChange(
          offer.id,
          updateOfferDto.pricingMode!,
        );
      }

      if (
        updateOfferDto.shippingCost !== undefined ||
        updateOfferDto.discountPercentage !== undefined ||
        updateOfferDto.discountAmount !== undefined ||
        updateOfferDto.subtotal !== undefined ||
        updateOfferDto.taxAmount !== undefined ||
        updateOfferDto.totalAmount !== undefined ||
        updateOfferDto.taxRate !== undefined ||
        pricingModeChanged
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

      if (error.code === "22P02") {
        return response.status(400).json({
          success: false,
          message: "Invalid numeric value format.",
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

  private async applyPricingModeChange(
    offerId: string,
    pricingMode: PricingMode,
  ): Promise<void> {
    try {
      const lineItems = await this.lineItemRepository.find({
        where: { offerId, isComponent: false },
      });

      const updates = [];
      for (const lineItem of lineItems) {
        if (pricingMode === "matrix") {
          if (!lineItem.priceMatrix || lineItem.priceMatrix.length === 0) {
            lineItem.priceMatrix = this.createDefaultPriceMatrix();
            updates.push(lineItem);
          }
        }
        // Switching to classic keeps priceMatrix data intact (not shown, not deleted)
        // in case the user switches back.
      }

      if (updates.length > 0) {
        await this.lineItemRepository.save(updates);
      }
    } catch (error) {
      console.error("Error applying pricing mode change:", error);
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

      if (updateLineItemDto.priceMatrix && offer.pricingMode === "matrix") {
        (updateLineItemDto as any).priceMatrix = this.processPriceMatrix(
          updateLineItemDto.priceMatrix,
          offer.totalPriceDecimalPlaces || 2,
        );
      }

      if (updateLineItemDto.basePrice !== undefined) {
        (updateLineItemDto as any).basePrice =
          parseFlexibleNumber(updateLineItemDto.basePrice) ?? 0;
      }
      if (updateLineItemDto.samplePrice !== undefined) {
        (updateLineItemDto as any).samplePrice =
          parseFlexibleNumber(updateLineItemDto.samplePrice) ?? 0;
      }
      if (
        updateLineItemDto.baseQuantity !== undefined &&
        !updateLineItemDto.baseQuantity.trim()
      ) {
        (updateLineItemDto as any).baseQuantity = "1";
      }
      Object.assign(lineItem, updateLineItemDto);

      if (offer.pricingMode === "matrix" && lineItem.priceMatrix?.length) {
        const active = lineItem.priceMatrix.find(
          (p: PriceMatrixEntry) => p.isActive,
        );
        if (active && active.total !== null) {
          lineItem.lineTotal = active.total;
        }
      } else if (
        updateLineItemDto.basePrice !== undefined ||
        updateLineItemDto.baseQuantity !== undefined
      ) {
        const qty = parseFlexibleNumber(lineItem.baseQuantity) || 1;
        const price = parseFlexibleNumberOrZero(lineItem.basePrice);
        lineItem.lineTotal = qty * price;
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

  // ==========================================================================
  // Add a single price tier to a line item's matrix. Price may be omitted
  // (or ".") to add an "not calculated yet" tier.
  // ==========================================================================
  async addPriceMatrixEntry(request: Request, response: Response) {
    try {
      const { lineItemId } = request.params;
      const { quantity, price } = request.body;

      if (!quantity) {
        return response.status(400).json({
          success: false,
          message: "Quantity is required",
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
      if (!offer || offer.pricingMode !== "matrix") {
        return response.status(400).json({
          success: false,
          message: "Matrix pricing is not enabled for this offer",
        });
      }

      const parsedPrice = parseFlexibleNumber(price);
      const now = new Date();
      const entries: PriceMatrixEntry[] = lineItem.priceMatrix || [];
      const qtyNum = parseFlexibleNumber(quantity) ?? 0;
      const totalPriceDecimalPlaces = offer.totalPriceDecimalPlaces || 2;
      const total =
        parsedPrice === null
          ? null
          : parseFloat((qtyNum * parsedPrice).toFixed(totalPriceDecimalPlaces));

      entries.push({
        id: uuidv4(),
        quantity,
        price: parsedPrice,
        total,
        isActive: false,
        createdAt: now,
        updatedAt: now,
      });

      entries.sort(
        (a, b) =>
          (parseFlexibleNumber(a.quantity) || 0) -
          (parseFlexibleNumber(b.quantity) || 0),
      );

      if (!entries.some((e) => e.isActive)) {
        const firstReal = entries.find((e) => e.price !== null);
        if (firstReal) firstReal.isActive = true;
      }

      lineItem.priceMatrix = entries;
      const active = entries.find((e) => e.isActive);
      lineItem.lineTotal = active?.total || 0;

      const updatedLineItem = await this.lineItemRepository.save(lineItem);
      if (lineItem.offerId) {
        await this.calculateOfferTotals(lineItem.offerId);
      }

      return response.status(200).json({
        success: true,
        message: "Price tier added successfully",
        data: updatedLineItem,
      });
    } catch (error) {
      console.error("Error adding price tier:", error);
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

          if (
            itemUpdate.priceMatrix !== undefined &&
            offer.pricingMode === "matrix"
          ) {
            lineItem.priceMatrix = this.processPriceMatrix(
              itemUpdate.priceMatrix,
              offer.totalPriceDecimalPlaces || 2,
            );
          }

          if (itemUpdate.basePrice !== undefined)
            lineItem.basePrice = parseFlexibleNumber(itemUpdate.basePrice) ?? 0;
          if (itemUpdate.samplePrice !== undefined)
            lineItem.samplePrice =
              parseFlexibleNumber(itemUpdate.samplePrice) ?? 0;
          if (itemUpdate.lineTotal !== undefined)
            lineItem.lineTotal = parseFlexibleNumberOrZero(
              itemUpdate.lineTotal,
            );
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

  // ==========================================================================
  // PASTE-IN MATRIX IMPORT
  // POST /offers/:offerId/paste-matrix   { data: string, tierCount: number }
  //
  // Expected format (one value per line):
  //   [optional label line, e.g. "Muster"]
  //   <tier 1 quantity>
  //   <tier 2 quantity>
  //   ...<tierCount tiers total>
  //   <item 1, tier 1 price>       ("." = not calculated)
  //   <item 1, tier 2 price>
  //   ...
  //   [optional "." separator line before the next item]
  //   <item 2, tier 1 price>
  //   ...
  //
  // Chunks are applied in order to the offer's existing non-component line
  // items (by position). Add the line items first, then paste their prices —
  // this mirrors copying a column out of a Google Sheet where the item
  // columns already exist.
  // ==========================================================================
  async pasteMatrixPrices(request: Request, response: Response) {
    try {
      const { offerId } = request.params;
      const { data, tierCount } = request.body as {
        data: string;
        tierCount: number;
      };

      if (!data || !tierCount || tierCount < 1) {
        return response.status(400).json({
          success: false,
          message: "Paste data and a tier count are required.",
        });
      }

      const offer = await this.offerRepository.findOne({
        where: { id: offerId },
      });
      if (!offer) {
        return response
          .status(404)
          .json({ success: false, message: "Offer not found" });
      }
      if (offer.pricingMode !== "matrix") {
        return response.status(400).json({
          success: false,
          message:
            "This offer is in Classic pricing mode. Switch to Matrix mode first.",
        });
      }

      const lineItems: OfferLineItem[] = await this.lineItemRepository.find({
        where: { offerId, isComponent: false },
        order: { position: "ASC" },
      });
      if (lineItems.length === 0) {
        return response.status(400).json({
          success: false,
          message:
            "Add the line items first, then paste their matching prices.",
        });
      }

      const rawLines = data
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      let cursor = 0;

      // Optional label line (e.g. "Muster") — anything that isn't a number
      // or "." is treated as a label and skipped.
      if (rawLines[cursor] && !/^[.\d,]+$/.test(rawLines[cursor])) {
        cursor++;
      }

      const tiers = rawLines.slice(cursor, cursor + tierCount);
      cursor += tierCount;
      if (tiers.length < tierCount) {
        return response.status(400).json({
          success: false,
          message: `Expected ${tierCount} quantity tiers, found ${tiers.length}.`,
        });
      }

      const now = new Date();
      const updates: OfferLineItem[] = [];
      const totalPriceDecimalPlaces = offer.totalPriceDecimalPlaces || 2;

      for (const lineItem of lineItems) {
        // A lone "." at a chunk boundary separates items — consume it before
        // reading the next block.
        if (rawLines[cursor] === ".") cursor++;

        const block = rawLines.slice(cursor, cursor + tierCount);
        if (block.length < tierCount) break;
        cursor += tierCount;

        const priceMatrix: PriceMatrixEntry[] = tiers.map((qty, i) => {
          const raw = block[i];
          const price = raw === "." ? null : parseFlexibleNumber(raw);
          const total =
            price === null
              ? null
              : parseFloat(
                  ((parseFlexibleNumber(qty) ?? 0) * price).toFixed(
                    totalPriceDecimalPlaces,
                  ),
                );
          return {
            id: uuidv4(),
            quantity: qty,
            price,
            total,
            isActive: false,
            createdAt: now,
            updatedAt: now,
          };
        });

        const firstReal = priceMatrix.find((p) => p.price !== null);
        if (firstReal) firstReal.isActive = true;

        lineItem.priceMatrix = priceMatrix;
        lineItem.lineTotal = firstReal?.total || 0;
        updates.push(lineItem);
      }

      if (updates.length > 0) {
        await this.lineItemRepository.save(updates);
        await this.calculateOfferTotals(offerId);
      }

      return response.status(200).json({
        success: true,
        message: `Imported the price matrix for ${updates.length} of ${lineItems.length} line items.`,
        data: { updatedLineItems: updates.length, tiers },
      });
    } catch (error) {
      console.error("Error pasting matrix prices:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Kept for route/name compatibility with any existing wiring; delegates to
  // the new matrix paste implementation.
  async copyPastePrices(request: Request, response: Response) {
    return this.pasteMatrixPrices(request, response);
  }

  async setActivePrice(request: Request, response: Response) {
    try {
      const { lineItemId, priceIndex } = request.params;

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
      if (
        isNaN(index) ||
        index < 0 ||
        !lineItem.priceMatrix ||
        index >= lineItem.priceMatrix.length
      ) {
        return response.status(400).json({
          success: false,
          message: "Invalid price index",
        });
      }

      if (lineItem.priceMatrix[index].price === null) {
        return response.status(400).json({
          success: false,
          message: "This tier has no calculated price yet.",
        });
      }

      const now = new Date();
      lineItem.priceMatrix = lineItem.priceMatrix.map(
        (p: PriceMatrixEntry, i: number) => ({
          ...p,
          isActive: i === index,
          updatedAt: i === index ? now : p.updatedAt,
        }),
      );

      lineItem.lineTotal = lineItem.priceMatrix[index].total || 0;

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

  async togglePricingMode(request: Request, response: Response) {
    try {
      const { offerId } = request.params;
      const { pricingMode, useUnitPrices } = request.body;

      const mode: PricingMode =
        pricingMode || (useUnitPrices ? "matrix" : "classic");

      if (mode !== "classic" && mode !== "matrix") {
        return response.status(400).json({
          success: false,
          message: "pricingMode must be 'classic' or 'matrix'",
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

      const previousMode = offer.pricingMode;
      offer.pricingMode = mode;

      if (
        mode === "matrix" &&
        (!offer.defaultPriceMatrix || offer.defaultPriceMatrix.length === 0)
      ) {
        offer.defaultPriceMatrix = this.createDefaultPriceMatrix();
      }

      await this.offerRepository.save(offer);

      if (previousMode !== mode) {
        await this.applyPricingModeChange(offerId, mode);
        await this.calculateOfferTotals(offerId);
      }

      const updatedOffer = await this.offerRepository.findOne({
        where: { id: offerId },
      });

      return response.status(200).json({
        success: true,
        message: `Pricing mode set to ${mode}`,
        data: updatedOffer,
      });
    } catch (error) {
      console.error("Error toggling pricing mode:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async syncPriceMatrixAcrossOffer(request: Request, response: Response) {
    try {
      const { offerId } = request.params;

      const offer = await this.offerRepository.findOne({
        where: { id: offerId },
      });
      if (!offer) {
        return response
          .status(404)
          .json({ success: false, message: "Offer not found" });
      }
      if (offer.pricingMode !== "matrix") {
        return response.status(400).json({
          success: false,
          message: "Matrix pricing is not enabled for this offer",
        });
      }

      const templateTiers =
        offer.defaultPriceMatrix || this.createDefaultPriceMatrix();
      const lineItems = await this.lineItemRepository.find({
        where: { offerId, isComponent: false },
      });

      const updates = [];
      for (const lineItem of lineItems) {
        const existing: PriceMatrixEntry[] = lineItem.priceMatrix || [];
        const updated = templateTiers.map((tpl: PriceMatrixEntry) => {
          const match = existing.find((e) => e.quantity === tpl.quantity);
          return match
            ? {
                ...tpl,
                price: match.price,
                total: match.total,
                isActive: match.isActive,
              }
            : { ...tpl };
        });

        lineItem.priceMatrix = updated;
        const active = updated.find((p: any) => p.isActive && p.price !== null);
        lineItem.lineTotal = active?.total || 0;
        updates.push(lineItem);
      }

      if (updates.length > 0) {
        await this.lineItemRepository.save(updates);
      }
      await this.calculateOfferTotals(offerId);

      return response.status(200).json({
        success: true,
        message: "Price matrix synced across all line items",
        data: { syncedLineItems: updates.length },
      });
    } catch (error) {
      console.error("Error syncing price matrix across offer:", error);
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
      const matrixOffers = await this.offerRepository.count({
        where: { pricingMode: "matrix" },
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
          pricingMode: {
            matrix: matrixOffers,
            classic: totalOffers - matrixOffers,
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
        const parsed = parseFlexibleNumber(numValue);
        return parsed ?? 0;
      };

      const formatNumber = (numValue: any, decimals: number = 2): string => {
        const num = getSafeNumber(numValue);
        const factor = Math.pow(10, decimals);
        const rounded = Math.round((num + Number.EPSILON) * factor) / factor;
        const fixedNum = Math.abs(rounded).toFixed(decimals);
        return rounded < 0 ? `-${fixedNum}` : fixedNum;
      };

      const getLineTotal = (item: any): number => {
        if (offer.pricingMode === "matrix" && item.priceMatrix?.length) {
          const active = item.priceMatrix.find(
            (p: PriceMatrixEntry) => p.isActive,
          );
          return active?.total ?? 0;
        }
        const qty = getSafeNumber(item.baseQuantity) || 1;
        return qty * getSafeNumber(item.basePrice);
      };

      const calculateTotals = (offerData: any) => {
        let subtotal = 0;
        if (offerData.lineItems && Array.isArray(offerData.lineItems)) {
          const customerItems = offerData.lineItems.filter(
            (item: any) => !item.isComponent,
          );
          customerItems.forEach((item: any) => {
            subtotal += getLineTotal(item);
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

        const taxRate = getSafeNumber(offerData.taxRate ?? 19) / 100;
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
      const gtechFonts = resolveGtechFonts();

      const doc = new PDFDocument({
        margin: 0,
        size: "A4",
        bufferPages: true,
      });

      const pageWidth = 595.28;
      const pageHeight = 841.89;

      const MM = (v: number) => v * 2.8346;

      const LEFT_X = MM(18);
      const INFO_BOX_X = MM(125);
      const TABLE_END_X = MM(192);
      const CONTENT_WIDTH = MM(174);

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

      registerGtechFonts(doc, gtechFonts);
      const R = fontRegular(gtechFonts);
      const M = fontMedium(gtechFonts);
      const SB = fontSemiBold(gtechFonts);

      drawGtechBrandLayer(doc, gtechFonts);

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

      let addrY = MM(55);
      doc.fillColor("#3F4446");

      if (customer.companyName) {
        doc
          .font(M)
          .fontSize(10)
          .text(customer.companyName, MM(25), addrY, {
            width: MM(80),
            lineBreak: false,
          });
        addrY += 13;
      }

      doc.font(R).fontSize(10);
      if (customer.legalName && customer.legalName !== customer.companyName) {
        doc.text(customer.legalName, MM(25), addrY, {
          width: MM(80),
          lineBreak: false,
        });
        addrY += 12;
      } else if (
        customer.additionalInfo &&
        customer.additionalInfo !== "Additional Info"
      ) {
        doc.text(customer.additionalInfo, MM(25), addrY, {
          width: MM(80),
          lineBreak: false,
        });
        addrY += 12;
      }

      if (customer.address || customer.street) {
        doc.text(customer.address || customer.street || "", MM(25), addrY, {
          width: MM(80),
          lineBreak: false,
        });
        addrY += 12;
      }

      const cityLine =
        `${customer.postalCode || ""} ${customer.city || ""}`.trim();
      if (cityLine) {
        doc.text(cityLine, MM(25), addrY, { width: MM(80), lineBreak: false });
        addrY += 12;
      }

      const displayCountry = formatCountry(customer.country);
      if (
        displayCountry &&
        displayCountry.toUpperCase() !== "DE" &&
        displayCountry.toUpperCase() !== "GERMANY" &&
        displayCountry.toUpperCase() !== "DEUTSCHLAND"
      ) {
        doc.text(displayCountry, MM(25), addrY, {
          width: MM(80),
          lineBreak: false,
        });
        addrY += 12;
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
        doc.text(`VAT ID: ${customerVatId}`, MM(25), addrY, {
          width: MM(80),
          lineBreak: false,
        });
        addrY += 12;
      }

      const titleBoxX = MM(125);
      const titleBoxY = MM(48);
      const titleBoxW = MM(67);
      const titleBoxH = 22;

      doc.rect(titleBoxX, titleBoxY, titleBoxW, titleBoxH).fill("#D1D5DB");

      doc
        .font(SB)
        .fontSize(14)
        .fillColor("#3F4446")
        .text("Angebot", titleBoxX + 8, titleBoxY + 4, { lineBreak: false });

      if (offer.title) {
        doc
          .font(R)
          .fontSize(11)
          .fillColor("#3F4446")
          .text(offer.title, titleBoxX + 70, titleBoxY + 6, {
            width: titleBoxW - 75,
            align: "right",
            lineBreak: false,
          });
      }

      const contactName = offer.inquiry?.contactPerson
        ? `${offer.inquiry.contactPerson.name} ${offer.inquiry.contactPerson.familyName}`
        : "Alexander";

      const infoItems = [
        ["Angebotsnr.", offer.offerNumber || ""],
        ["Datum", formatDate(offer.createdAt)],
        ["Gültig bis", formatDate(offer.validUntil)],
        ["Ansprechpartner", contactName],
        ["", ""],
        [
          "Kundennr.",
          offer.inquiry?.customer?.customerNumber ||
            customer.customerNumber ||
            "—",
        ],
      ];

      let infoY = titleBoxY + titleBoxH + 8;
      const LABEL_W = MM(32);
      const VALUE_X = titleBoxX + LABEL_W + 4;
      const VALUE_W = titleBoxW - LABEL_W - 4;

      doc.fontSize(8.5).fillColor("#3F4446");
      infoItems.forEach(([label, value]) => {
        if (!label && !value) {
          infoY += 6;
          return;
        }
        doc
          .font(R)
          .text(label, titleBoxX, infoY, { width: LABEL_W, lineBreak: false });
        doc
          .font(M)
          .text(value, VALUE_X, infoY, { width: VALUE_W, lineBreak: false });
        infoY += 12;
      });

      let yPos = Math.max(addrY + 10, MM(98));
      if (offer.shippingMethod || offer.deliveryTime || offer.deliveryTerms) {
        doc.font(R).fontSize(9.5).fillColor("#3F4446");
        const deliveryParts: string[] = [];
        if (offer.shippingMethod)
          deliveryParts.push(`Versandart: ${offer.shippingMethod}`);
        if (offer.deliveryTime)
          deliveryParts.push(`Lieferzeit: ${offer.deliveryTime}`);
        if (offer.deliveryTerms)
          deliveryParts.push(`Lieferbedingungen: ${offer.deliveryTerms}`);
        doc.text(deliveryParts.join("   ·   "), LEFT_X, yPos, {
          width: CONTENT_WIDTH,
        });
        yPos += 16;
      }

      yPos = Math.max(yPos + 5, MM(112));
      const tableY = yPos;

      const columns = [
        { header: "Pos", width: 25, align: "left" },
        { header: "Art. Nr.", width: 60, align: "left" },
        { header: "Menge", width: 40, align: "left" },
        { header: "Bezeichnung", width: 155, align: "left" },
        { header: "Gesamt\n(Netto)", width: 60, align: "right" },
        { header: "MwSt", width: 40, align: "center" },
        { header: "E-Preis", width: 55, align: "right" },
        { header: "Gesamt\n(Brutto)", width: 59, align: "right" },
      ];

      const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
      const headerHeight = 24;

      doc.rect(LEFT_X, tableY, tableWidth, headerHeight).fill("#D1D5DB");
      doc.font(SB).fontSize(8.5).fillColor("#3F4446");

      let currentX = LEFT_X;
      columns.forEach((col) => {
        const headerYOffset = col.header.includes("\n") ? 3 : 7;
        doc.text(col.header, currentX + 2, tableY + headerYOffset, {
          width: col.width - 4,
          align: col.align as any,
        });
        currentX += col.width;
      });

      doc
        .moveTo(LEFT_X, tableY + headerHeight)
        .lineTo(LEFT_X + tableWidth, tableY + headerHeight)
        .lineWidth(0.8)
        .strokeColor("#3F4446")
        .stroke();

      const formatGermanNum = (numVal: any, decimals: number = 2): string => {
        const num = getSafeNumber(numVal);
        const factor = Math.pow(10, decimals);
        const rounded = Math.round((num + Number.EPSILON) * factor) / factor;
        return rounded.toLocaleString("de-DE", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
      };

      doc.font(R).fontSize(8.5).fillColor("#3F4446");

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
      const vatRatePercent = getSafeNumber(offer.taxRate ?? 19);

      if (offer.lineItems && Array.isArray(offer.lineItems)) {
        const customerItems = offer.lineItems.filter(
          (item: any) => !item.isComponent,
        );

        customerItems.forEach((item: any, rowIndex: number) => {
          let qtyStr = "1";
          let unitPriceNum = 0;
          let netTotalNum = 0;

          if (offer.pricingMode === "matrix" && item.priceMatrix?.length) {
            const active = item.priceMatrix.find(
              (p: PriceMatrixEntry) => p.isActive,
            );
            if (active) {
              qtyStr = String(active.quantity);
              unitPriceNum = getSafeNumber(active.price);
              netTotalNum = getSafeNumber(active.total);
            }
          } else {
            qtyStr = String(item.baseQuantity || 1);
            unitPriceNum = getSafeNumber(item.basePrice);
            netTotalNum =
              (getSafeNumber(item.baseQuantity) || 1) * unitPriceNum;
          }

          const grossTotalNum = netTotalNum * (1 + vatRatePercent / 100);

          let nameText = item.itemName || "Item";
          if (item.description) {
            nameText += `\n${item.description}`;
          }

          if (offer.pricingMode === "matrix" && item.priceMatrix?.length > 1) {
            nameText += "\nStaffelpreise:";
            item.priceMatrix.slice(0, 4).forEach((p: PriceMatrixEntry) => {
              const activeMark = p.isActive ? " (*)" : "";
              const priceLabel =
                p.price === null
                  ? "."
                  : `€ ${formatNumber(p.price, offer.unitPriceDecimalPlaces || 3)}`;
              nameText += `\n  - ${p.quantity} Stk: ${priceLabel} / Stk${activeMark}`;
            });
          }

          const designationWidth = columns[3].width - 6;
          doc.font(R).fontSize(8.5);
          const textHeight = doc.heightOfString(nameText, {
            width: designationWidth,
          });
          const computedRowHeight = Math.max(36, textHeight + 12);

          if (currentY + computedRowHeight > MM(265)) {
            doc
              .moveTo(LEFT_X, currentY)
              .lineTo(LEFT_X + tableWidth, currentY)
              .lineWidth(0.5)
              .strokeColor("#CCCCCC")
              .stroke();

            doc.addPage();
            drawGtechBrandLayer(doc, gtechFonts);

            const newTableY = MM(30);
            doc.font(SB).fontSize(8).fillColor("#3F4446");
            let tempX = LEFT_X;
            columns.forEach((col) => {
              doc.text(col.header, tempX + 3, newTableY + 6, {
                width: col.width - 6,
                align: col.align as any,
                lineBreak: false,
              });
              tempX += col.width;
            });
            doc
              .moveTo(LEFT_X, newTableY + headerHeight)
              .lineTo(LEFT_X + tableWidth, newTableY + headerHeight)
              .lineWidth(0.75)
              .strokeColor("#2F6B46")
              .stroke();

            doc.font(R).fontSize(8.5).fillColor("#3F4446");
            currentY = newTableY + headerHeight;
          }

          if (rowIndex % 2 === 1) {
            doc
              .rect(LEFT_X, currentY, tableWidth, computedRowHeight)
              .fill("#FAFAFA");
          }

          const rowData = [
            (rowIndex + 1).toString(),
            item.material || item.id.substring(0, 8),
            qtyStr,
            nameText,
            `${formatNumber(netTotalNum, 2)} ${offer.currency || "EUR"}`,
            `${vatRatePercent}%`,
            `${formatNumber(unitPriceNum, offer.unitPriceDecimalPlaces || 3)} ${offer.currency || "EUR"}`,
            `${formatNumber(grossTotalNum, 2)} ${offer.currency || "EUR"}`,
          ];

          currentX = LEFT_X;
          rowData.forEach((data, colIndex) => {
            doc.font(R).fontSize(8.5).fillColor("#3F4446");
            doc.text(data, currentX + 3, currentY + 5, {
              width: columns[colIndex].width - 6,
              align: columns[colIndex].align as any,
              lineBreak: false,
            });
            currentX += columns[colIndex].width;
          });

          if (rowIndex < customerItems.length - 1) {
            doc
              .moveTo(LEFT_X, currentY + computedRowHeight)
              .lineTo(LEFT_X + tableWidth, currentY + computedRowHeight)
              .lineWidth(0.3)
              .strokeColor("#DEDEDE")
              .stroke();
          }

          currentY += computedRowHeight;
        });
      }

      doc
        .moveTo(LEFT_X, currentY)
        .lineTo(LEFT_X + tableWidth, currentY)
        .lineWidth(0.5)
        .strokeColor("#DEDEDE")
        .stroke();

      yPos = currentY + 20;

      if (yPos + 120 > MM(265)) {
        doc.addPage();
        drawGtechBrandLayer(doc, gtechFonts);
        yPos = MM(30);
      }

      const TOTALS_LABEL_X = MM(115);
      const TOTALS_VAL_X = MM(158);
      const TOTALS_VAL_W = MM(34);

      doc.font(R).fontSize(9.5).fillColor("#3F4446");

      doc.font(M).text("Gesamtpreis Netto", TOTALS_LABEL_X, yPos);
      doc
        .font(M)
        .text(
          `${formatGermanNum(totals.subtotal, 2)} ${offer.currency || "EUR"}`,
          TOTALS_VAL_X,
          yPos,
          { align: "right", width: TOTALS_VAL_W },
        );

      if (Number(totals.discountAmount || 0) > 0) {
        yPos += 16;
        doc
          .font(R)
          .text(
            `Rabatt (${offer.discountPercentage || 0}%)`,
            TOTALS_LABEL_X,
            yPos,
          );
        doc
          .font(R)
          .text(
            `-${formatGermanNum(totals.discountAmount, 2)} ${offer.currency || "EUR"}`,
            TOTALS_VAL_X,
            yPos,
            { align: "right", width: TOTALS_VAL_W },
          );
      }

      if (Number(totals.shippingCost || 0) > 0) {
        yPos += 16;
        doc.font(R).text("Versandkosten", TOTALS_LABEL_X, yPos);
        doc
          .font(R)
          .text(
            `${formatGermanNum(totals.shippingCost, 2)} ${offer.currency || "EUR"}`,
            TOTALS_VAL_X,
            yPos,
            { align: "right", width: TOTALS_VAL_W },
          );
      }

      const taxRatePercent = offer.taxRate ? Number(offer.taxRate) : 19;
      yPos += 16;
      doc
        .font(R)
        .text(
          `MwSt. ${formatGermanNum(taxRatePercent, 2)}%`,
          TOTALS_LABEL_X,
          yPos,
        );
      doc
        .font(R)
        .text(
          `${formatGermanNum(totals.taxAmount, 2)} ${offer.currency || "EUR"}`,
          TOTALS_VAL_X,
          yPos,
          { align: "right", width: TOTALS_VAL_W },
        );

      yPos += 22;
      const bruttoBoxX = TOTALS_LABEL_X - 6;
      const bruttoBoxW = TOTALS_VAL_X + TOTALS_VAL_W - bruttoBoxX + 4;
      doc.rect(bruttoBoxX, yPos - 4, bruttoBoxW, 20).fill("#D1D5DB");

      doc.font(SB).fontSize(10).fillColor("#3F4446");
      doc.text("Gesamtpreis Brutto", TOTALS_LABEL_X, yPos);
      doc.text(
        `${formatGermanNum(totals.totalAmount, 2)} ${offer.currency || "EUR"}`,
        TOTALS_VAL_X,
        yPos,
        { align: "right", width: TOTALS_VAL_W },
      );

      yPos += 35;
      let notesHeight = 15;
      if (offer.paymentTerms) notesHeight += 15;
      if (offer.paymentMethod) notesHeight += 15;
      if (offer.notes) {
        notesHeight +=
          doc.heightOfString(`Hinweise: ${offer.notes}`, {
            width: CONTENT_WIDTH,
          }) + 5;
      }

      if (yPos + notesHeight > MM(265)) {
        doc.addPage();
        drawGtechBrandLayer(doc, gtechFonts);
        yPos = MM(30);
      }

      doc.font(R).fontSize(9).fillColor("#3F4446");
      doc.text("All prices are net prices.", LEFT_X, yPos);
      yPos += 14;

      if (offer.paymentMethod) {
        doc.text(`Zahlungsart: ${offer.paymentMethod}`, LEFT_X, yPos);
        yPos += 14;
      }
      if (offer.paymentTerms) {
        doc.text(`Zahlungsbedingungen: ${offer.paymentTerms}`, LEFT_X, yPos);
        yPos += 14;
      }
      if (offer.notes) {
        doc.text(`Hinweise: ${offer.notes}`, LEFT_X, yPos, {
          width: CONTENT_WIDTH,
        });
      }

      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        const pNum = i + 1;
        doc
          .font(R)
          .fontSize(7.5)
          .fillColor("#3F4446")
          .text(`${pNum}/${pages.count}`, MM(170), MM(282), {
            align: "right",
            width: MM(22),
            lineBreak: false,
          });
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

      return this.generatePdf(request, response);
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
      const offer = await this.offerRepository.findOne({ where: { id } });
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
      return response.status(200).json({ success: true, data: statuses });
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
      return response.status(200).json({ success: true, data: currencies });
    } catch (error) {
      console.error("Error fetching currencies:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getPaymentMethods(request: Request, response: Response) {
    try {
      const methods = [
        { value: "Prepayment", label: "Prepayment" },
        { value: "Bank transfer", label: "Bank transfer" },
        { value: "Cash on delivery", label: "Cash on delivery" },
        { value: "Invoice", label: "Invoice" },
        { value: "Credit card", label: "Credit card" },
        { value: "PayPal", label: "PayPal" },
      ];
      return response.status(200).json({ success: true, data: methods });
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async getShippingMethods(request: Request, response: Response) {
    try {
      const methods = [
        { value: "Standard shipping", label: "Standard shipping" },
        { value: "Express shipping", label: "Express shipping" },
        { value: "Freight", label: "Freight" },
        { value: "Courier", label: "Courier" },
        { value: "Pickup", label: "Pickup" },
      ];
      return response.status(200).json({ success: true, data: methods });
    } catch (error) {
      console.error("Error fetching shipping methods:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  private buildItemSnapshot(item: any): ItemSnapshot {
    return {
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
  }
}

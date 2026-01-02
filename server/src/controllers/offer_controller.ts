import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import {
  Offer,
  CustomerSnapshot,
  QuantityPrice,
  UnitPrice,
  OfferLineItem,
} from "../models/offer";
import { Inquiry } from "../models/inquiry";
import { RequestedItem } from "../models/requested_items";
import { Customer } from "../models/customers";

// Fixed imports with type safety
type ValidatorModule = any;
type TransformerModule = any;
type CanvasModule = any;

// Mock types for missing modules (you should install these packages)
interface ValidationError {
  property: string;
  constraints?: { [key: string]: string };
}

type ClassConstructor<T> = new (...args: any[]) => T;

// Helper functions to handle missing modules
const getValidator = (): ValidatorModule => {
  try {
    return require("class-validator");
  } catch {
    // Mock implementation if module is not installed
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
    // Mock implementation if module is not installed
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
    // Mock implementation if module is not installed
    return {
      createCanvas: () => ({ width: 0, height: 0, getContext: () => ({}) }),
    };
  }
};

// Import modules using helper functions
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
    useUnitPrices?: boolean;
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

  async createOfferFromInquiry(request: Request, response: Response) {
    try {
      const { inquiryId } = request.params;

      // Transform and create DTO instance with explicit options
      const createOfferDto = plainToInstance(CreateOfferDto, request.body, {
        excludeExtraneousValues: false,
        enableImplicitConversion: true,
      });

      // Check if DTO was properly created
      if (!createOfferDto || typeof createOfferDto !== "object") {
        return response.status(400).json({
          success: false,
          message: "Invalid request body format",
        });
      }

      // Validate DTO with options
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

      // Find inquiry with requests and customer
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

      // Get customer data
      const customer = inquiry.customer;
      if (!customer) {
        return response.status(404).json({
          success: false,
          message: "Customer not found for this inquiry",
        });
      }

      // Generate offer number
      const offerNumber = await this.generateOfferNumber();

      // Create inquiry snapshot
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

      // Create customer snapshot
      const customerSnapshot: CustomerSnapshot = {
        id: customer.id,
        companyName: customer.companyName,
        legalName: customer.legalName,
        email: customer.email,
        contactEmail: customer.contactEmail,
        contactPhoneNumber: customer.contactPhoneNumber,
        vatId: "",
        address: customer.businessDetails?.address,
        city: customer.businessDetails?.city,
        postalCode: customer.businessDetails?.postalCode,
        country: customer.businessDetails?.country,
        state: customer.businessDetails?.state,
        street: "Street Address",
        additionalInfo: "Additional Info",
      };

      // Create offer
      const offer = this.offerRepository.create({
        offerNumber,
        title: createOfferDto.title || `Offer for ${inquiry.name}`,
        inquiry: inquiry,
        inquiryId: inquiry.id,
        // Inquiry snapshot
        inquirySnapshot,
        // Customer snapshot
        customerSnapshot,
        // Delivery address (default to customer address, can be changed)
        deliveryAddress: createOfferDto.deliveryAddress || {
          street: "Street Address",
          city: customer.businessDetails?.city,
          state: customer.businessDetails?.state,
          postalCode: customer.businessDetails?.postalCode,
          country: customer.businessDetails?.country,
          contactName: customer.legalName || customer.companyName,
          contactPhone: customer.contactPhoneNumber,
        },
        // Offer details
        status: "Draft",
        validUntil:
          createOfferDto.validUntil ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
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
        // Assembly specific
        isAssembly: inquiry.isAssembly,
        assemblyName: createOfferDto.assemblyName || inquiry.name,
        assemblyDescription:
          createOfferDto.assemblyDescription || inquiry.description,
        assemblyNotes: createOfferDto.assemblyNotes,
        revision: 1,
        // Initialize totals
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
      });

      // Save offer first to get ID
      const savedOffer = await this.offerRepository.save(offer);

      // Create line items from requests
      let lineItems: OfferLineItem[] = [];
      let position = 1;

      if (inquiry.isAssembly) {
        // For assembly offers, create main assembly item
        const assemblyLineItem = this.lineItemRepository.create({
          offer: savedOffer,
          offerId: savedOffer.id,
          itemName: savedOffer.assemblyName || inquiry.name,
          description: savedOffer.assemblyDescription || inquiry.description,
          position: position++,
          isAssemblyItem: true,
          isEstimated: inquiry.isEstimated,
          notes: savedOffer.assemblyNotes,
          // Unit prices configuration
          useUnitPrices: false, // Default to false for assembly items
          unitPriceDecimalPlaces: 3,
          totalPriceDecimalPlaces: 2,
          maxUnitPriceColumns: 0,
          // Copy purchase price from inquiry if available
          purchasePrice: inquiry.purchasePrice,
          purchaseCurrency: inquiry.purchasePriceCurrency,
          // Set initial prices (empty, will be filled later)
          quantityPrices: [],
          unitPrices: [],
          lineTotal: 0,
        });
        lineItems.push(assemblyLineItem);

        // Save assembly item first to get its ID
        const savedAssemblyItem = await this.lineItemRepository.save(
          assemblyLineItem
        );

        // Add components as hidden items
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
              // Unit prices configuration
              useUnitPrices: false,
              unitPriceDecimalPlaces: 3,
              totalPriceDecimalPlaces: 2,
              maxUnitPriceColumns: 0,
              // Components don't have customer-facing prices
              quantityPrices: [],
              unitPrices: [],
              lineTotal: 0,
            });
            lineItems.push(componentItem);
          }
        }
      } else {
        // For non-assembly offers, create line items for each request
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
              // Unit prices configuration
              useUnitPrices: false, // Default to false, can be enabled later
              unitPriceDecimalPlaces: 3,
              totalPriceDecimalPlaces: 2,
              maxUnitPriceColumns: 3, // Default to 3 columns
              // Set initial prices (empty, will be filled later)
              quantityPrices: [],
              unitPrices: [],
              lineTotal: 0,
            });
            lineItems.push(lineItem);
          }
        }
      }

      // Save all line items
      if (lineItems.length > 0) {
        await this.lineItemRepository.save(lineItems);
      }

      // Calculate initial totals
      await this.calculateOfferTotals(savedOffer.id);

      // Return complete offer with relations
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

  private async calculateOfferTotals(offerId: string): Promise<void> {
    try {
      const lineItems = await this.lineItemRepository.find({
        where: { offerId, isComponent: false }, // Don't include components in total
        order: { position: "ASC" },
      });

      let subtotal = 0;

      // Calculate subtotal from line items
      for (const item of lineItems) {
        let lineTotal = 0;

        if (
          item.useUnitPrices &&
          item.unitPrices &&
          item.unitPrices.length > 0
        ) {
          // Calculate from active unit price
          const activeUnitPrice = item.unitPrices.find(
            (up: UnitPrice) => up.isActive
          );
          if (activeUnitPrice) {
            lineTotal = activeUnitPrice.totalPrice || 0;
          }
        } else if (item.quantityPrices && item.quantityPrices.length > 0) {
          // Calculate from active quantity price (legacy)
          const activePrice = item.quantityPrices.find(
            (qp: QuantityPrice) => qp.isActive
          );
          if (activePrice) {
            lineTotal = activePrice.total || 0;
          }
        } else if (item.basePrice && item.baseQuantity) {
          // Calculate from base price if no unit prices
          const quantity = parseFloat(item.baseQuantity) || 1;
          const price = parseFloat(item.basePrice.toString()) || 0;
          lineTotal = quantity * price;
        }

        // Update line total if calculated
        if (lineTotal > 0 && item.lineTotal !== lineTotal) {
          item.lineTotal = lineTotal;
          await this.lineItemRepository.save(item);
        }

        subtotal += lineTotal;
      }

      // Get offer to update
      const offer = await this.offerRepository.findOne({
        where: { id: offerId },
      });

      if (offer) {
        // Apply discount
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

        offer.subtotal = parseFloat(subtotal.toFixed(2));
        offer.taxAmount = parseFloat(taxAmount.toFixed(2));
        offer.totalAmount = parseFloat(totalWithTax.toFixed(2));

        await this.offerRepository.save(offer);
      }
    } catch (error) {
      console.error("Error calculating offer totals:", error);
    }
  }

  // Helper function to process unit prices
  private processUnitPrices(unitPricesDto: UnitPriceDto[]): UnitPrice[] {
    const now = new Date();
    return unitPricesDto.map((upDto: UnitPriceDto) => {
      const quantity = parseFloat(upDto.quantity) || 0;
      const unitPrice = parseFloat(upDto.unitPrice.toString()) || 0;
      const totalPrice = upDto.totalPrice || quantity * unitPrice;

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

      // Apply filters
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
          { search: `%${search}%` }
        );
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [offers, total] = await queryBuilder
        .skip(skip)
        .take(Number(limit))
        .getManyAndCount();

      // Ensure totals are calculated for each offer
      for (const offer of offers) {
        if (offer.subtotal === 0 && offer.totalAmount === 0) {
          // Recalculate totals if they appear to be zero
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

      // Recalculate totals if they appear to be zero
      if (offer.subtotal === 0 && offer.totalAmount === 0) {
        await this.calculateOfferTotals(offer.id);
        // Refetch offer with updated totals
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

      // Calculate which price is active for each line item
      if (offer.lineItems) {
        offer.lineItems = offer.lineItems.map((item: any) => {
          let activePrice = null;

          if (
            item.useUnitPrices &&
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

      // Transform and create DTO instance with explicit options
      const updateOfferDto = plainToInstance(UpdateOfferDto, request.body, {
        excludeExtraneousValues: false,
        enableImplicitConversion: true,
      });

      // Check if DTO was properly created
      if (!updateOfferDto || typeof updateOfferDto !== "object") {
        return response.status(400).json({
          success: false,
          message: "Invalid request body format",
        });
      }

      // Validate DTO with options
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

      const offer = await this.offerRepository.findOne({
        where: { id },
      });

      if (!offer) {
        return response.status(404).json({
          success: false,
          message: "Offer not found",
        });
      }

      // Update offer fields
      Object.assign(offer, updateOfferDto);
      const updatedOffer = await this.offerRepository.save(offer);

      // Recalculate totals if pricing-related fields changed
      if (
        updateOfferDto.shippingCost !== undefined ||
        updateOfferDto.discountPercentage !== undefined ||
        updateOfferDto.discountAmount !== undefined ||
        updateOfferDto.subtotal !== undefined ||
        updateOfferDto.taxAmount !== undefined ||
        updateOfferDto.totalAmount !== undefined
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
    } catch (error) {
      console.error("Error updating offer:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async updateLineItem(request: Request, response: Response) {
    try {
      const { offerId, lineItemId } = request.params;
      const updateLineItemDto = plainToInstance(
        UpdateLineItemDto,
        request.body
      );

      // Validate DTO
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

      const lineItem = await this.lineItemRepository.findOne({
        where: { id: lineItemId, offerId },
      });

      if (!lineItem) {
        return response.status(404).json({
          success: false,
          message: "Line item not found",
        });
      }

      // Process unit prices if provided
      if (updateLineItemDto.unitPrices && updateLineItemDto.useUnitPrices) {
        const processedUnitPrices = this.processUnitPrices(
          updateLineItemDto.unitPrices
        );

        // Ensure only one is active
        const activeCount = processedUnitPrices.filter(
          (up) => up.isActive
        ).length;
        if (activeCount > 1) {
          // Keep only the first one active
          processedUnitPrices.forEach((up, index) => {
            up.isActive = index === 0;
          });
        } else if (activeCount === 0 && processedUnitPrices.length > 0) {
          // Set first one as active if none are active
          processedUnitPrices[0].isActive = true;
        }

        updateLineItemDto.unitPrices = processedUnitPrices;
      }

      // If quantityPrices are being updated (legacy), ensure only one is active
      if (
        updateLineItemDto.quantityPrices &&
        !updateLineItemDto.useUnitPrices
      ) {
        updateLineItemDto.quantityPrices = updateLineItemDto.quantityPrices.map(
          (qp: any) => ({
            ...qp,
            total: parseFloat(qp.quantity) * qp.price,
          })
        );

        // Ensure only one price is active
        const activeCount = updateLineItemDto.quantityPrices.filter(
          (qp: any) => qp.isActive
        ).length;
        if (activeCount > 1) {
          // Keep only the first one active
          updateLineItemDto.quantityPrices =
            updateLineItemDto.quantityPrices.map((qp: any, index: number) => ({
              ...qp,
              isActive: index === 0,
            }));
        } else if (
          activeCount === 0 &&
          updateLineItemDto.quantityPrices.length > 0
        ) {
          // Set first one as active if none are active
          updateLineItemDto.quantityPrices[0].isActive = true;
        }
      }

      // Update line item fields
      Object.assign(lineItem, updateLineItemDto);

      // Calculate line total
      if (
        updateLineItemDto.useUnitPrices &&
        updateLineItemDto.unitPrices &&
        updateLineItemDto.unitPrices.length > 0
      ) {
        const activeUnitPrice = updateLineItemDto.unitPrices.find(
          (up: UnitPrice) => up.isActive
        );
        if (activeUnitPrice) {
          lineItem.lineTotal = activeUnitPrice.totalPrice;
        }
      } else if (
        updateLineItemDto.quantityPrices &&
        updateLineItemDto.quantityPrices.length > 0
      ) {
        const activePrice = updateLineItemDto.quantityPrices.find(
          (qp: any) => qp.isActive
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

      // Recalculate offer totals
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

  // Add unit price to line item
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
      });

      if (!lineItem) {
        return response.status(404).json({
          success: false,
          message: "Line item not found",
        });
      }

      // Ensure useUnitPrices is enabled
      lineItem.useUnitPrices = true;

      // Initialize or update unitPrices array
      let unitPrices = lineItem.unitPrices || [];
      const qty = parseFloat(quantity) || 0;
      const price = parseFloat(unitPrice) || 0;
      const totalPrice = qty * price;
      const now = new Date();

      // If setting as active, deactivate others
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

      // Sort by quantity
      unitPrices.sort(
        (a: UnitPrice, b: UnitPrice) =>
          parseFloat(a.quantity) - parseFloat(b.quantity)
      );

      lineItem.unitPrices = unitPrices;

      // Update line total from active price
      const activeUnitPrice = unitPrices.find((up: UnitPrice) => up.isActive);
      if (activeUnitPrice) {
        lineItem.lineTotal = activeUnitPrice.totalPrice;
      } else if (unitPrices.length > 0) {
        // If no active price, use the first one
        lineItem.unitPrices[0].isActive = true;
        lineItem.lineTotal = lineItem.unitPrices[0].totalPrice;
      }

      const updatedLineItem = await this.lineItemRepository.save(lineItem);

      // Recalculate offer totals
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

  // Add quantity-price to line item (legacy)
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
      });

      if (!lineItem) {
        return response.status(404).json({
          success: false,
          message: "Line item not found",
        });
      }

      // Ensure useUnitPrices is disabled
      lineItem.useUnitPrices = false;

      // Initialize or update quantityPrices array
      let quantityPrices = lineItem.quantityPrices || [];
      const total = parseFloat(quantity) * parseFloat(price);

      // If setting as active, deactivate others
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

      // Sort by quantity
      quantityPrices.sort(
        (a: any, b: any) => parseFloat(a.quantity) - parseFloat(b.quantity)
      );

      lineItem.quantityPrices = quantityPrices;

      // Update line total from active price
      const activePrice = quantityPrices.find((qp: any) => qp.isActive);
      if (activePrice) {
        lineItem.lineTotal = activePrice.total;
      } else if (quantityPrices.length > 0) {
        // If no active price, use the first one
        lineItem.quantityPrices[0].isActive = true;
        lineItem.lineTotal = lineItem.quantityPrices[0].total;
      }

      const updatedLineItem = await this.lineItemRepository.save(lineItem);

      // Recalculate offer totals
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

  // Bulk update line items (for copy/paste from spreadsheet)
  async bulkUpdateLineItems(request: Request, response: Response) {
    try {
      const { offerId } = request.params;
      const bulkUpdateDto = plainToInstance(
        BulkUpdateLineItemsDto,
        request.body
      );

      // Validate DTO
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

          // Update only allowed fields
          if (itemUpdate.quantityPrices !== undefined) {
            lineItem.quantityPrices = itemUpdate.quantityPrices.map(
              (qp: any) => ({
                ...qp,
                total: parseFloat(qp.quantity) * qp.price,
              })
            );
            lineItem.useUnitPrices = false;
          }

          if (itemUpdate.unitPrices !== undefined) {
            lineItem.unitPrices = this.processUnitPrices(itemUpdate.unitPrices);
            lineItem.useUnitPrices = true;
          }

          if (itemUpdate.useUnitPrices !== undefined) {
            lineItem.useUnitPrices = itemUpdate.useUnitPrices;
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

      // Recalculate offer totals
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

  // Copy/paste prices from spreadsheet
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

      // Parse tab-separated values
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

      // Map rows to line items
      const updates = [];
      for (let i = 1; i < rows.length && i - 1 < lineItems.length; i++) {
        const row = rows[i];
        const lineItem = lineItems[i - 1];

        // Expecting format: Item Name | Quantity 1 | Price 1 | Quantity 2 | Price 2 | ...
        if (row.length >= 3) {
          const unitPrices: UnitPriceDto[] = [];
          const now = new Date();

          // Start from column 1 (skip item name at column 0)
          for (let j = 1; j < row.length - 1; j += 2) {
            const quantity = row[j]?.trim();
            const unitPrice = parseFloat(row[j + 1]?.trim() || "0");

            if (quantity && !isNaN(unitPrice) && unitPrice > 0) {
              const qty = parseFloat(quantity) || 0;
              const totalPrice = qty * unitPrice;

              unitPrices.push({
                id: uuidv4(),
                quantity,
                unitPrice,
                totalPrice,
                isActive: j === 1, // First price is active by default
              });
            }
          }

          if (unitPrices.length > 0) {
            lineItem.useUnitPrices = true;
            lineItem.unitPrices = unitPrices.map((upDto: UnitPriceDto) => ({
              ...upDto,
              createdAt: now,
              updatedAt: now,
            }));
            lineItem.unitPriceDecimalPlaces = 3;
            lineItem.totalPriceDecimalPlaces = 2;
            lineItem.maxUnitPriceColumns = Math.min(unitPrices.length, 5); // Max 5 columns

            // Calculate line total from active price
            const activeUnitPrice = unitPrices.find((up) => up.isActive);
            if (activeUnitPrice) {
              lineItem.lineTotal = activeUnitPrice.totalPrice || 0;
            }
            updates.push(lineItem);
          }
        }
      }

      // Save all updates
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
      });

      if (!lineItem) {
        return response.status(404).json({
          success: false,
          message: "Line item not found",
        });
      }

      const index = parseInt(priceIndex);
      if (isNaN(index) || index < 0) {
        return response.status(400).json({
          success: false,
          message: "Invalid price index",
        });
      }

      if (priceType === "unit" && lineItem.useUnitPrices) {
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

        // Update all unit prices, set only the selected one as active
        const now = new Date();
        lineItem.unitPrices = lineItem.unitPrices.map(
          (up: UnitPrice, i: number) => ({
            ...up,
            isActive: i === index,
            updatedAt: i === index ? now : up.updatedAt,
          })
        );

        // Update line total from active price
        const activeUnitPrice = lineItem.unitPrices[index];
        lineItem.lineTotal = activeUnitPrice.totalPrice;
      } else {
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

        // Update all prices, set only the selected one as active
        lineItem.quantityPrices = lineItem.quantityPrices.map(
          (qp: any, i: number) => ({
            ...qp,
            isActive: i === index,
          })
        );

        // Update line total from active price
        const activePrice = lineItem.quantityPrices[index];
        lineItem.lineTotal = activePrice.total;
      }

      const updatedLineItem = await this.lineItemRepository.save(lineItem);

      // Recalculate offer totals
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

  // Toggle unit prices for line item
  async toggleUnitPrices(request: Request, response: Response) {
    try {
      const { lineItemId } = request.params;
      const { useUnitPrices } = request.body;

      if (useUnitPrices === undefined) {
        return response.status(400).json({
          success: false,
          message: "useUnitPrices is required",
        });
      }

      const lineItem = await this.lineItemRepository.findOne({
        where: { id: lineItemId },
      });

      if (!lineItem) {
        return response.status(404).json({
          success: false,
          message: "Line item not found",
        });
      }

      lineItem.useUnitPrices = useUnitPrices;

      // Set default values if enabling unit prices
      if (useUnitPrices) {
        if (!lineItem.unitPriceDecimalPlaces)
          lineItem.unitPriceDecimalPlaces = 3;
        if (!lineItem.totalPriceDecimalPlaces)
          lineItem.totalPriceDecimalPlaces = 2;
        if (!lineItem.maxUnitPriceColumns) lineItem.maxUnitPriceColumns = 3;

        // Initialize empty unit prices if not exist
        if (!lineItem.unitPrices) {
          lineItem.unitPrices = [];
        }
      } else {
        // Initialize empty quantity prices if not exist (legacy)
        if (!lineItem.quantityPrices) {
          lineItem.quantityPrices = [];
        }
      }

      const updatedLineItem = await this.lineItemRepository.save(lineItem);

      return response.status(200).json({
        success: true,
        message: `Unit prices ${
          useUnitPrices ? "enabled" : "disabled"
        } successfully`,
        data: updatedLineItem,
      });
    } catch (error) {
      console.error("Error toggling unit prices:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Create offer revision
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

      // Generate new offer number
      const newOfferNumber = await this.generateOfferNumber();

      // Create new offer as revision
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

      // Apply any updates from DTO
      Object.assign(newOffer, createOfferDto);

      const savedOffer = await this.offerRepository.save(newOffer);

      // Duplicate line items
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

      // Get recent offers
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

  // Generate PDF for offer (updated to handle unit prices)
  async generatePdf(request: Request, response: Response) {
    try {
      const { id } = request.params;

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

      // Helper function to safely format dates
      const formatDate = (dateValue: any): string => {
        if (!dateValue) return "N/A";

        // Convert to Date object if it's a string
        const date =
          typeof dateValue === "string" ? new Date(dateValue) : dateValue;

        // Check if it's a valid date
        if (!(date instanceof Date) || isNaN(date.getTime())) {
          return "N/A";
        }

        return date.toLocaleDateString();
      };

      // Helper function to safely format numbers
      const formatNumber = (numValue: any, decimals: number = 2): string => {
        if (numValue === null || numValue === undefined) {
          return `0.${"0".repeat(decimals)}`;
        }

        // Convert to number if it's a string
        const num =
          typeof numValue === "string"
            ? parseFloat(numValue)
            : Number(numValue);

        // Check if it's a valid number
        if (isNaN(num)) {
          return `0.${"0".repeat(decimals)}`;
        }

        return num.toFixed(decimals);
      };

      // Helper function to get safe number value
      const getSafeNumber = (numValue: any): number => {
        if (numValue === null || numValue === undefined) {
          return 0;
        }

        const num =
          typeof numValue === "string"
            ? parseFloat(numValue)
            : Number(numValue);

        return isNaN(num) ? 0 : num;
      };

      // Create PDF document
      const doc = new PDFDocument({ margin: 50, size: "A4" });

      // Set up PDF content
      // Header
      doc.fontSize(20).text(`OFFER ${offer.offerNumber}`, { align: "center" });
      doc.moveDown();

      doc.fontSize(12);
      doc.text(`Date: ${formatDate(offer.createdAt)}`);
      doc.text(`Valid Until: ${formatDate(offer.validUntil)}`);
      doc.moveDown();

      // Customer Information
      doc.fontSize(14).text("Customer Information:", { underline: true });
      doc.fontSize(11);
      if (offer.customerSnapshot) {
        const customer = offer.customerSnapshot;
        doc.text(`${customer.companyName || ""}`);
        if (customer.legalName) doc.text(`${customer.legalName}`);
        if (customer.address) doc.text(`${customer.address}`);
        if (customer.postalCode && customer.city)
          doc.text(`${customer.postalCode} ${customer.city}`);
        if (customer.country) doc.text(`${customer.country}`);
        if (customer.vatId) doc.text(`VAT ID: ${customer.vatId}`);
      }
      doc.moveDown();

      // Delivery Address (if different)
      if (offer.deliveryAddress) {
        doc.fontSize(14).text("Delivery Address:", { underline: true });
        doc.fontSize(11);
        const addr = offer.deliveryAddress;
        if (addr.contactName) doc.text(`${addr.contactName}`);
        if (addr.street) doc.text(`${addr.street}`);
        if (addr.postalCode && addr.city)
          doc.text(`${addr.postalCode} ${addr.city}`);
        if (addr.state) doc.text(`${addr.state}`);
        if (addr.country) doc.text(`${addr.country}`);
        if (addr.contactPhone) doc.text(`Phone: ${addr.contactPhone}`);
        doc.moveDown();
      }

      // Line Items Table
      doc.fontSize(14).text("Offer Positions:", { underline: true });
      doc.moveDown();

      const tableTop = doc.y;
      const itemX = 50;
      const descX = 150;
      const qtyX = 350;
      const priceX = 400;
      const totalX = 500;

      // Table Headers
      doc.fontSize(10);
      doc.text("Pos.", itemX, tableTop);
      doc.text("Description", descX, tableTop);
      doc.text("Qty", qtyX, tableTop);
      doc.text("Price", priceX, tableTop);
      doc.text("Total", totalX, tableTop);

      doc
        .moveTo(50, tableTop + 20)
        .lineTo(550, tableTop + 20)
        .stroke();

      let y = tableTop + 30;

      // Get safe numeric values for totals
      const subtotal = getSafeNumber(offer.subtotal);
      const taxAmount = getSafeNumber(offer.taxAmount);
      const totalAmount = getSafeNumber(offer.totalAmount);
      const shippingCost = getSafeNumber(offer.shippingCost);
      const discountAmount = getSafeNumber(offer.discountAmount);

      // Line Items
      if (offer.lineItems) {
        const customerItems = offer.lineItems.filter(
          (item: any) => !item.isComponent
        );

        customerItems.forEach((item: any, index: number) => {
          doc.text(`${index + 1}.`, itemX, y);
          doc.text(item.itemName || "", descX, y, { width: 200 });

          // Show unit prices if enabled and available
          if (
            item.useUnitPrices &&
            item.unitPrices &&
            item.unitPrices.length > 0
          ) {
            const maxColumns = item.maxUnitPriceColumns || 3;
            const displayedPrices = item.unitPrices.slice(0, maxColumns);

            displayedPrices.forEach((up: UnitPrice, upIndex: number) => {
              const qty = getSafeNumber(up.quantity);
              const unitPrice = getSafeNumber(up.unitPrice);
              const priceText = `${qty} pcs: €${unitPrice.toFixed(3)} (unit)`;
              const highlight = up.isActive ? { color: "red" } : {};
              doc.text(priceText, qtyX, y + upIndex * 15, {
                ...highlight,
                width: 150,
              });
            });

            // Show total price for active unit price
            const activeUnitPrice = item.unitPrices.find(
              (up: UnitPrice) => up.isActive
            );
            if (activeUnitPrice) {
              doc.text(`€${activeUnitPrice.totalPrice.toFixed(2)}`, totalX, y);
            }
          }
          // Fallback to legacy quantity prices
          else if (item.quantityPrices && item.quantityPrices.length > 0) {
            item.quantityPrices.forEach((qp: any, qpIndex: number) => {
              const qpQuantity = getSafeNumber(qp.quantity);
              const qpPrice = getSafeNumber(qp.price);
              const priceText = `${qpQuantity} pcs: €${qpPrice.toFixed(3)}`;
              const highlight = qp.isActive ? { color: "red" } : {};
              doc.text(priceText, qtyX, y + qpIndex * 15, {
                ...highlight,
                width: 150,
              });
            });

            // Show total price for active quantity price
            const activePrice = item.quantityPrices.find(
              (qp: any) => qp.isActive
            );
            if (activePrice) {
              doc.text(`€${activePrice.total.toFixed(2)}`, totalX, y);
            }
          }
          // Fallback to base price
          else if (item.baseQuantity || item.basePrice) {
            const quantity = getSafeNumber(item.baseQuantity);
            const price = getSafeNumber(item.basePrice);

            doc.text(quantity.toString(), qtyX, y);
            doc.text(`€${price.toFixed(3)}`, priceX, y);
            const total = quantity * price;
            doc.text(`€${total.toFixed(2)}`, totalX, y);
          } else {
            // Fallback for items without prices
            doc.text("N/A", qtyX, y);
            doc.text("N/A", priceX, y);
            doc.text("N/A", totalX, y);
          }

          // Calculate height based on number of prices
          const numPrices = Math.max(
            item.useUnitPrices && item.unitPrices ? item.unitPrices.length : 0,
            item.quantityPrices ? item.quantityPrices.length : 0,
            1
          );
          y += Math.max(30, numPrices * 20);
        });
      }

      // Totals
      y += 20;
      doc.moveTo(400, y).lineTo(550, y).stroke();
      y += 10;

      doc.text("Subtotal:", 400, y);
      doc.text(`€${formatNumber(subtotal)}`, 500, y);
      y += 20;

      if (discountAmount > 0) {
        doc.text("Discount:", 400, y);
        doc.text(`-€${formatNumber(discountAmount)}`, 500, y);
        y += 20;
      }

      if (shippingCost > 0) {
        doc.text("Shipping:", 400, y);
        doc.text(`€${formatNumber(shippingCost)}`, 500, y);
        y += 20;
      }

      doc.text("VAT (19%):", 400, y);
      doc.text(`€${formatNumber(taxAmount)}`, 500, y);
      y += 20;

      doc.fontSize(12).font("Helvetica-Bold");
      doc.text("TOTAL:", 400, y);
      doc.text(`€${formatNumber(totalAmount)}`, 500, y);

      // Footer Notes
      y += 40;
      doc.fontSize(10).font("Helvetica");
      doc.text("All prices are net prices.", 50, y);
      y += 15;

      if (offer.deliveryTime) {
        doc.text(`Delivery Time: ${offer.deliveryTime}`, 50, y);
        y += 15;
      }

      if (offer.paymentTerms) {
        doc.text(`Payment Terms: ${offer.paymentTerms}`, 50, y);
        y += 15;
      }

      if (offer.notes) {
        doc.text(`Notes: ${offer.notes}`, 50, y);
      }

      // Save PDF to file
      const uploadsDir = path.join(__dirname, "../../uploads/offers");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const pdfPath = path.join(uploadsDir, `${offer.offerNumber}.pdf`);
      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);
      doc.end();

      // Wait for PDF to be written
      await new Promise((resolve: any, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      // Update offer with PDF info
      offer.pdfPath = `/uploads/offers/${offer.offerNumber}.pdf`;
      offer.pdfGenerated = true;
      offer.pdfGeneratedAt = new Date();
      await this.offerRepository.save(offer);

      return response.status(200).json({
        success: true,
        message: "PDF generated successfully",
        data: {
          pdfPath: offer.pdfPath,
          downloadUrl: `/api/offers/${id}/download-pdf`,
        },
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Download PDF
  async downloadPdf(request: Request, response: Response) {
    try {
      const { id } = request.params;

      const offer = await this.offerRepository.findOne({
        where: { id },
      });

      if (!offer || !offer.pdfPath) {
        return response.status(404).json({
          success: false,
          message: "PDF not found",
        });
      }

      const pdfPath = path.join(__dirname, "../..", offer.pdfPath);

      if (!fs.existsSync(pdfPath)) {
        return response.status(404).json({
          success: false,
          message: "PDF file not found",
        });
      }

      response.setHeader("Content-Type", "application/pdf");
      response.setHeader(
        "Content-Disposition",
        `attachment; filename="${offer.offerNumber}.pdf"`
      );

      const fileStream = fs.createReadStream(pdfPath);
      fileStream.pipe(response);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Delete offer
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

  // Get offers by inquiry
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

  // Get offer statuses
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

  // Get available currencies
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

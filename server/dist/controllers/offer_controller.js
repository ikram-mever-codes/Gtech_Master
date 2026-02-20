"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfferController = exports.CopyPastePricesDto = exports.BulkUpdateLineItemsDto = exports.UpdateLineItemDto = exports.UnitPriceDto = exports.UpdateOfferDto = exports.CreateOfferDto = void 0;
const database_1 = require("../config/database");
const offer_1 = require("../models/offer");
const inquiry_1 = require("../models/inquiry");
const requested_items_1 = require("../models/requested_items");
const customers_1 = require("../models/customers");
// Helper functions to handle missing modules
const getValidator = () => {
    try {
        return require("class-validator");
    }
    catch (_a) {
        // Mock implementation if module is not installed
        return {
            IsDate: () => () => { },
            IsEnum: () => () => { },
            IsNumber: () => () => { },
            IsObject: () => () => { },
            IsOptional: () => () => { },
            IsString: () => () => { },
            Max: () => () => { },
            Min: () => () => { },
            IsBoolean: () => () => { },
            IsArray: () => () => { },
            validate: () => __awaiter(void 0, void 0, void 0, function* () { return []; }),
        };
    }
};
const getTransformer = () => {
    try {
        return require("class-transformer");
    }
    catch (_a) {
        // Mock implementation if module is not installed
        return {
            Type: () => () => { },
            plainToInstance: (cls, plain) => plain,
        };
    }
};
const getCanvas = () => {
    try {
        return require("canvas");
    }
    catch (_a) {
        // Mock implementation if module is not installed
        return {
            createCanvas: () => ({ width: 0, height: 0, getContext: () => ({}) }),
        };
    }
};
// Import modules using helper functions
const { IsDate, IsEnum, IsNumber, IsObject, IsOptional, IsString, Max, Min, IsBoolean, IsArray, validate, } = getValidator();
const { plainToInstance, Type } = getTransformer();
const { createCanvas } = getCanvas();
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const inquiry_controller_1 = require("./inquiry_controller");
const items_1 = require("../models/items");
const tarics_1 = require("../models/tarics");
class CreateOfferDto {
}
exports.CreateOfferDto = CreateOfferDto;
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "title", void 0);
__decorate([
    IsOptional(),
    IsDate(),
    Type(() => Date),
    __metadata("design:type", Date)
], CreateOfferDto.prototype, "validUntil", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "termsConditions", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "deliveryTerms", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "paymentTerms", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "deliveryTime", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "currency", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    __metadata("design:type", Number)
], CreateOfferDto.prototype, "discountPercentage", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    __metadata("design:type", Number)
], CreateOfferDto.prototype, "discountAmount", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    __metadata("design:type", Number)
], CreateOfferDto.prototype, "shippingCost", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "notes", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "internalNotes", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "assemblyName", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "assemblyDescription", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "assemblyNotes", void 0);
__decorate([
    IsOptional(),
    IsObject(),
    __metadata("design:type", Object)
], CreateOfferDto.prototype, "deliveryAddress", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], CreateOfferDto.prototype, "useUnitPrices", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(2),
    Max(4),
    __metadata("design:type", Number)
], CreateOfferDto.prototype, "unitPriceDecimalPlaces", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(2),
    Max(4),
    __metadata("design:type", Number)
], CreateOfferDto.prototype, "totalPriceDecimalPlaces", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    Max(10),
    __metadata("design:type", Number)
], CreateOfferDto.prototype, "maxUnitPriceColumns", void 0);
__decorate([
    IsOptional(),
    IsArray(),
    __metadata("design:type", Array)
], CreateOfferDto.prototype, "defaultUnitPrices", void 0);
class UpdateOfferDto {
}
exports.UpdateOfferDto = UpdateOfferDto;
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], UpdateOfferDto.prototype, "title", void 0);
__decorate([
    IsOptional(),
    IsEnum([
        "Draft",
        "Submitted",
        "Negotiation",
        "Accepted",
        "Rejected",
        "Expired",
        "Cancelled",
    ]),
    __metadata("design:type", String)
], UpdateOfferDto.prototype, "status", void 0);
__decorate([
    IsOptional(),
    IsDate(),
    Type(() => Date),
    __metadata("design:type", Date)
], UpdateOfferDto.prototype, "validUntil", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], UpdateOfferDto.prototype, "termsConditions", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], UpdateOfferDto.prototype, "deliveryTerms", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], UpdateOfferDto.prototype, "paymentTerms", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], UpdateOfferDto.prototype, "deliveryTime", void 0);
__decorate([
    IsOptional(),
    IsEnum(["RMB", "HKD", "EUR", "USD"]),
    __metadata("design:type", String)
], UpdateOfferDto.prototype, "currency", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    Max(100),
    __metadata("design:type", Number)
], UpdateOfferDto.prototype, "discountPercentage", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], UpdateOfferDto.prototype, "discountAmount", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], UpdateOfferDto.prototype, "shippingCost", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], UpdateOfferDto.prototype, "notes", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], UpdateOfferDto.prototype, "internalNotes", void 0);
__decorate([
    IsOptional(),
    IsObject(),
    __metadata("design:type", Object)
], UpdateOfferDto.prototype, "deliveryAddress", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], UpdateOfferDto.prototype, "subtotal", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], UpdateOfferDto.prototype, "taxAmount", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], UpdateOfferDto.prototype, "totalAmount", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], UpdateOfferDto.prototype, "useUnitPrices", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(2),
    Max(4),
    __metadata("design:type", Number)
], UpdateOfferDto.prototype, "unitPriceDecimalPlaces", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(2),
    Max(4),
    __metadata("design:type", Number)
], UpdateOfferDto.prototype, "totalPriceDecimalPlaces", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    Max(10),
    __metadata("design:type", Number)
], UpdateOfferDto.prototype, "maxUnitPriceColumns", void 0);
__decorate([
    IsOptional(),
    IsArray(),
    __metadata("design:type", Array)
], UpdateOfferDto.prototype, "defaultUnitPrices", void 0);
class UnitPriceDto {
}
exports.UnitPriceDto = UnitPriceDto;
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], UnitPriceDto.prototype, "id", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], UnitPriceDto.prototype, "quantity", void 0);
__decorate([
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], UnitPriceDto.prototype, "unitPrice", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], UnitPriceDto.prototype, "totalPrice", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], UnitPriceDto.prototype, "isActive", void 0);
class UpdateLineItemDto {
}
exports.UpdateLineItemDto = UpdateLineItemDto;
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], UpdateLineItemDto.prototype, "itemName", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], UpdateLineItemDto.prototype, "material", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], UpdateLineItemDto.prototype, "specification", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], UpdateLineItemDto.prototype, "description", void 0);
__decorate([
    IsOptional(),
    IsArray(),
    __metadata("design:type", Array)
], UpdateLineItemDto.prototype, "quantityPrices", void 0);
__decorate([
    IsOptional(),
    IsArray(),
    __metadata("design:type", Array)
], UpdateLineItemDto.prototype, "unitPrices", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], UpdateLineItemDto.prototype, "baseQuantity", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], UpdateLineItemDto.prototype, "basePrice", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], UpdateLineItemDto.prototype, "samplePrice", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], UpdateLineItemDto.prototype, "sampleQuantity", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], UpdateLineItemDto.prototype, "lineTotal", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(1),
    __metadata("design:type", Number)
], UpdateLineItemDto.prototype, "position", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], UpdateLineItemDto.prototype, "notes", void 0);
class BulkUpdateLineItemsDto {
}
exports.BulkUpdateLineItemsDto = BulkUpdateLineItemsDto;
__decorate([
    IsArray(),
    __metadata("design:type", Array)
], BulkUpdateLineItemsDto.prototype, "lineItems", void 0);
class CopyPastePricesDto {
}
exports.CopyPastePricesDto = CopyPastePricesDto;
__decorate([
    IsString(),
    __metadata("design:type", String)
], CopyPastePricesDto.prototype, "data", void 0);
class OfferController {
    constructor() {
        this.offerRepository = database_1.AppDataSource.getRepository(offer_1.Offer);
        this.lineItemRepository = database_1.AppDataSource.getRepository(offer_1.OfferLineItem);
        this.inquiryRepository = database_1.AppDataSource.getRepository(inquiry_1.Inquiry);
        this.requestedItemRepository = database_1.AppDataSource.getRepository(requested_items_1.RequestedItem);
        this.customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
    }
    generateOfferNumber() {
        return __awaiter(this, void 0, void 0, function* () {
            const date = new Date();
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            const lastOffer = yield this.offerRepository
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
        });
    }
    createOfferFromInquiry(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
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
                const errors = yield validate(createOfferDto, {
                    whitelist: true,
                    forbidNonWhitelisted: false,
                });
                if (errors.length > 0) {
                    return response.status(400).json({
                        success: false,
                        errors: errors.map((error) => ({
                            property: error.property,
                            constraints: error.constraints,
                        })),
                    });
                }
                // Find inquiry with requests and customer
                const inquiry = yield this.inquiryRepository.findOne({
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
                const offerNumber = yield this.generateOfferNumber();
                // Create inquiry snapshot
                const inquirySnapshot = {
                    id: inquiry.id,
                    name: inquiry.name,
                    isAssembly: inquiry.isAssembly,
                    description: inquiry.description,
                    createdAt: inquiry.createdAt,
                    referenceNumber: inquiry.referenceNumber,
                    status: inquiry.status,
                    requestsCount: ((_a = inquiry.requests) === null || _a === void 0 ? void 0 : _a.length) || 0,
                };
                // Create customer snapshot
                const customerSnapshot = {
                    id: customer.id,
                    companyName: customer.companyName,
                    legalName: customer.legalName,
                    email: customer.email,
                    contactEmail: customer.contactEmail,
                    contactPhoneNumber: customer.contactPhoneNumber,
                    vatId: "",
                    address: (_b = customer.businessDetails) === null || _b === void 0 ? void 0 : _b.address,
                    city: (_c = customer.businessDetails) === null || _c === void 0 ? void 0 : _c.city,
                    postalCode: (_d = customer.businessDetails) === null || _d === void 0 ? void 0 : _d.postalCode,
                    country: (_e = customer.businessDetails) === null || _e === void 0 ? void 0 : _e.country,
                    state: (_f = customer.businessDetails) === null || _f === void 0 ? void 0 : _f.state,
                    street: "Street Address",
                    additionalInfo: "Additional Info",
                };
                // Process default unit prices if provided
                const defaultUnitPrices = createOfferDto.useUnitPrices
                    ? createOfferDto.defaultUnitPrices || this.createDefaultUnitPrices()
                    : [];
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
                        city: (_g = customer.businessDetails) === null || _g === void 0 ? void 0 : _g.city,
                        state: (_h = customer.businessDetails) === null || _h === void 0 ? void 0 : _h.state,
                        postalCode: (_j = customer.businessDetails) === null || _j === void 0 ? void 0 : _j.postalCode,
                        country: (_k = customer.businessDetails) === null || _k === void 0 ? void 0 : _k.country,
                        contactName: customer.legalName || customer.companyName,
                        contactPhone: customer.contactPhoneNumber,
                    },
                    // Offer details
                    status: "Draft",
                    validUntil: createOfferDto.validUntil ||
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
                    assemblyDescription: createOfferDto.assemblyDescription || inquiry.description,
                    assemblyNotes: createOfferDto.assemblyNotes,
                    // Unit pricing at offer level
                    useUnitPrices: createOfferDto.useUnitPrices || false,
                    unitPriceDecimalPlaces: createOfferDto.unitPriceDecimalPlaces || 3,
                    totalPriceDecimalPlaces: createOfferDto.totalPriceDecimalPlaces || 2,
                    maxUnitPriceColumns: createOfferDto.maxUnitPriceColumns || 3,
                    defaultUnitPrices,
                    revision: 1,
                    // Initialize totals
                    subtotal: 0,
                    taxAmount: 0,
                    totalAmount: 0,
                });
                // Save offer first to get ID
                const savedOffer = yield this.offerRepository.save(offer);
                // Create line items from requests
                let lineItems = [];
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
                        // Copy purchase price from inquiry if available
                        purchasePrice: inquiry.purchasePrice,
                        purchaseCurrency: inquiry.purchasePriceCurrency,
                        // Set initial prices based on offer's unit pricing mode
                        quantityPrices: [],
                        unitPrices: savedOffer.useUnitPrices
                            ? this.createDefaultUnitPrices()
                            : [],
                        lineTotal: 0,
                    });
                    lineItems.push(assemblyLineItem);
                    // Save assembly item first to get its ID
                    const savedAssemblyItem = yield this.lineItemRepository.save(assemblyLineItem);
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
                                // Components don't have customer-facing prices
                                quantityPrices: [],
                                unitPrices: [],
                                lineTotal: 0,
                            });
                            lineItems.push(componentItem);
                        }
                    }
                }
                else {
                    // For non-assembly offers, create line items for each request
                    if (inquiry.requests && inquiry.requests.length > 0) {
                        for (const request of inquiry.requests) {
                            // Create unit prices for line item based on offer settings
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
                                // Set initial prices based on offer's unit pricing mode
                                quantityPrices: [],
                                unitPrices: lineItemUnitPrices,
                                lineTotal: 0,
                            });
                            lineItems.push(lineItem);
                        }
                    }
                }
                // Save all line items
                if (lineItems.length > 0) {
                    yield this.lineItemRepository.save(lineItems);
                }
                // Calculate initial totals
                yield this.calculateOfferTotals(savedOffer.id);
                // Return complete offer with relations
                const completeOffer = yield this.offerRepository.findOne({
                    where: { id: savedOffer.id },
                    relations: ["lineItems", "inquiry", "inquiry.customer"],
                });
                return response.status(201).json({
                    success: true,
                    message: "Offer created successfully",
                    data: completeOffer,
                });
            }
            catch (error) {
                console.error("Error creating offer:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    }
    createDefaultUnitPrices() {
        const now = new Date();
        return [
            {
                id: (0, uuid_1.v4)(),
                quantity: "1000",
                unitPrice: 0,
                totalPrice: 0,
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: (0, uuid_1.v4)(),
                quantity: "5000",
                unitPrice: 0,
                totalPrice: 0,
                isActive: false,
                createdAt: now,
                updatedAt: now,
            },
            {
                id: (0, uuid_1.v4)(),
                quantity: "10000",
                unitPrice: 0,
                totalPrice: 0,
                isActive: false,
                createdAt: now,
                updatedAt: now,
            },
        ];
    }
    convertOfferToItem(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            try {
                const { offerId } = request.params;
                const { lineItemId } = request.query;
                // 1. Transform and Validate DTO
                const conversionData = plainToInstance(inquiry_controller_1.ConvertInquiryToItemDto, request.body);
                const errors = yield validate(conversionData);
                if (errors.length > 0) {
                    return response.status(400).json({
                        success: false,
                        errors: errors.map((error) => ({
                            property: error.property,
                            constraints: error.constraints,
                        })),
                    });
                }
                // 2. Initialize Repositories
                const offerRepository = database_1.AppDataSource.getRepository(offer_1.Offer);
                const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
                const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
                const lineItemRepository = database_1.AppDataSource.getRepository(offer_1.OfferLineItem);
                // 3. Find Offer with Relations
                const offer = yield offerRepository.findOne({
                    where: { id: offerId },
                    relations: ["lineItems", "inquiry"],
                });
                if (!offer) {
                    return response.status(404).json({
                        success: false,
                        message: "Offer not found",
                    });
                }
                // 4. Extract Source Data (Assembly vs Single Line Item)
                let sourceData;
                if (offer.isAssembly) {
                    // Find the specific assembly header item among line items
                    const assemblyItem = (_a = offer.lineItems) === null || _a === void 0 ? void 0 : _a.find((li) => li.isAssemblyItem);
                    sourceData = {
                        itemName: offer.assemblyName || offer.title || "New Assembly Item",
                        specification: offer.assemblyDescription || offer.notes || "",
                        weight: conversionData.weight ||
                            (assemblyItem === null || assemblyItem === void 0 ? void 0 : assemblyItem.weight) ||
                            ((_b = offer.inquiry) === null || _b === void 0 ? void 0 : _b.weight) ||
                            0,
                        width: conversionData.width ||
                            (assemblyItem === null || assemblyItem === void 0 ? void 0 : assemblyItem.width) ||
                            ((_c = offer.inquiry) === null || _c === void 0 ? void 0 : _c.width) ||
                            0,
                        height: conversionData.height ||
                            (assemblyItem === null || assemblyItem === void 0 ? void 0 : assemblyItem.height) ||
                            ((_d = offer.inquiry) === null || _d === void 0 ? void 0 : _d.height) ||
                            0,
                        length: conversionData.length ||
                            (assemblyItem === null || assemblyItem === void 0 ? void 0 : assemblyItem.length) ||
                            ((_e = offer.inquiry) === null || _e === void 0 ? void 0 : _e.length) ||
                            0,
                        purchasePrice: (assemblyItem === null || assemblyItem === void 0 ? void 0 : assemblyItem.purchasePrice) || ((_f = offer.inquiry) === null || _f === void 0 ? void 0 : _f.purchasePrice) || 0,
                        description: offer.assemblyDescription || offer.notes,
                        photo: ((_g = offer.inquiry) === null || _g === void 0 ? void 0 : _g.image) || "",
                    };
                }
                else {
                    // Find specific line item via query param OR grab the first one
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
                // 5. Generate Item Identifiers
                const itemId = yield inquiry_controller_1.ItemGenerator.generateItemId();
                const ean = inquiry_controller_1.ItemGenerator.generateEAN(itemId);
                let taric = null;
                // 6. Handle Taric Logic
                if (conversionData.taricId) {
                    taric = yield taricRepository.findOne({
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
                        yield taricRepository.save(taric);
                    }
                }
                if (!taric) {
                    taric = yield inquiry_controller_1.ItemGenerator.createTaricForItem(sourceData.itemName);
                }
                // 7. Map Data to Item Entity
                const itemData = {
                    id: itemId,
                    ean: ean,
                    taric_id: taric.id,
                    taric: taric,
                    item_name: sourceData.itemName,
                    item_name_cn: conversionData.itemNameCN || sourceData.itemName,
                    photo: sourceData.photo || ((_h = offer.inquiry) === null || _h === void 0 ? void 0 : _h.image) || "",
                    weight: conversionData.weight || sourceData.weight,
                    width: conversionData.width || sourceData.width,
                    height: conversionData.height || sourceData.height,
                    length: conversionData.length || sourceData.length,
                    model: conversionData.model || sourceData.specification,
                    remark: conversionData.remark || offer.notes || sourceData.description,
                    note: conversionData.note || offer.internalNotes || sourceData.notes,
                    RMB_Price: conversionData.RMBPrice || sourceData.purchasePrice || 0,
                    cat_id: conversionData.catId || null,
                    // Fixed system values
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
                // 8. Final Save and Status Update
                const item = itemRepository.create(itemData);
                const savedItem = yield itemRepository.save(item);
                offer.status = "Accepted";
                yield offerRepository.save(offer);
                // 9. Send Response
                return response.status(201).json({
                    success: true,
                    message: "Offer successfully converted to Item",
                    data: {
                        item: savedItem,
                        taric: taric,
                        offerId: offer.id,
                    },
                });
            }
            catch (error) {
                console.error("Error converting offer to item:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    }
    calculateOfferTotals(offerId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const offer = yield this.offerRepository.findOne({
                    where: { id: offerId },
                    relations: ["lineItems"],
                });
                if (!offer) {
                    return;
                }
                let subtotal = 0;
                // Calculate subtotal from line items (excluding components)
                const customerItems = ((_a = offer.lineItems) === null || _a === void 0 ? void 0 : _a.filter((item) => !item.isComponent)) ||
                    [];
                for (const item of customerItems) {
                    let lineTotal = 0;
                    if (offer.useUnitPrices &&
                        item.unitPrices &&
                        item.unitPrices.length > 0) {
                        // Calculate from active unit price based on offer's unit pricing setting
                        const activeUnitPrice = item.unitPrices.find((up) => up.isActive);
                        if (activeUnitPrice) {
                            lineTotal = activeUnitPrice.totalPrice || 0;
                        }
                    }
                    else if (item.quantityPrices && item.quantityPrices.length > 0) {
                        // Calculate from active quantity price (legacy)
                        const activePrice = item.quantityPrices.find((qp) => qp.isActive);
                        if (activePrice) {
                            lineTotal = activePrice.total || 0;
                        }
                    }
                    else if (item.basePrice && item.baseQuantity) {
                        // Calculate from base price if no unit prices
                        const quantity = parseFloat(item.baseQuantity) || 1;
                        const price = parseFloat(item.basePrice.toString()) || 0;
                        lineTotal = quantity * price;
                    }
                    // Update line total if calculated
                    if (lineTotal > 0 && item.lineTotal !== lineTotal) {
                        item.lineTotal = lineTotal;
                        yield this.lineItemRepository.save(item);
                    }
                    subtotal += lineTotal;
                }
                // Apply discount
                let total = subtotal;
                if (offer.discountPercentage && offer.discountPercentage > 0) {
                    const discount = subtotal * (offer.discountPercentage / 100);
                    total = subtotal - discount;
                    offer.discountAmount = discount;
                }
                else if (offer.discountAmount && offer.discountAmount > 0) {
                    total = subtotal - offer.discountAmount;
                }
                if (offer.shippingCost && offer.shippingCost > 0) {
                    total += offer.shippingCost;
                }
                const taxRate = 0.19;
                const taxAmount = total * taxRate;
                const totalWithTax = total + taxAmount;
                // FIX: Use proper number formatting to avoid invalid strings
                const formatNumber = (num) => {
                    // Ensure we have a valid number
                    if (isNaN(num) || !isFinite(num)) {
                        return 0;
                    }
                    // Round to 2 decimal places and return as number
                    return Math.round(num * 100) / 100;
                };
                offer.subtotal = formatNumber(subtotal);
                offer.taxAmount = formatNumber(taxAmount);
                offer.totalAmount = formatNumber(totalWithTax);
                yield this.offerRepository.save(offer);
            }
            catch (error) {
                console.error("Error calculating offer totals:", error);
            }
        });
    }
    // Helper function to process unit prices
    processUnitPrices(unitPricesDto, totalPriceDecimalPlaces = 2) {
        const now = new Date();
        return unitPricesDto.map((upDto) => {
            const quantity = parseFloat(upDto.quantity) || 0;
            const unitPrice = parseFloat(upDto.unitPrice.toString()) || 0;
            const totalPrice = upDto.totalPrice ||
                parseFloat((quantity * unitPrice).toFixed(totalPriceDecimalPlaces));
            return {
                id: upDto.id || (0, uuid_1.v4)(),
                quantity: upDto.quantity,
                unitPrice,
                totalPrice,
                isActive: upDto.isActive || false,
                createdAt: now,
                updatedAt: now,
            };
        });
    }
    getAllOffers(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = 1, limit = 20, inquiryId, customerId, status, search, } = request.query;
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
                    queryBuilder.andWhere("(offer.offerNumber LIKE :search OR offer.title LIKE :search OR offer.customerSnapshot->>'companyName' LIKE :search OR offer.inquirySnapshot->>'name' LIKE :search)", { search: `%${search}%` });
                }
                const skip = (Number(page) - 1) * Number(limit);
                const [offers, total] = yield queryBuilder
                    .skip(skip)
                    .take(Number(limit))
                    .getManyAndCount();
                // Ensure totals are calculated for each offer
                for (const offer of offers) {
                    if (offer.subtotal === 0 && offer.totalAmount === 0) {
                        // Recalculate totals if they appear to be zero
                        yield this.calculateOfferTotals(offer.id);
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
            }
            catch (error) {
                console.error("Error fetching offers:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    getOfferById(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
                const offer = yield this.offerRepository.findOne({
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
                    yield this.calculateOfferTotals(offer.id);
                    // Refetch offer with updated totals
                    const updatedOffer = yield this.offerRepository.findOne({
                        where: { id },
                        relations: ["lineItems"],
                    });
                    if (updatedOffer) {
                        offer.subtotal = updatedOffer.subtotal;
                        offer.taxAmount = updatedOffer.taxAmount;
                        offer.totalAmount = updatedOffer.totalAmount;
                    }
                }
                // Calculate which price is active for each line item based on offer's unit pricing mode
                if (offer.lineItems) {
                    offer.lineItems = offer.lineItems.map((item) => {
                        let activePrice = null;
                        if (offer.useUnitPrices &&
                            item.unitPrices &&
                            item.unitPrices.length > 0) {
                            activePrice =
                                item.unitPrices.find((up) => up.isActive) || null;
                        }
                        else if (item.quantityPrices && item.quantityPrices.length > 0) {
                            activePrice =
                                item.quantityPrices.find((qp) => qp.isActive) ||
                                    null;
                        }
                        return Object.assign(Object.assign({}, item), { activePrice });
                    });
                }
                return response.status(200).json({
                    success: true,
                    data: offer,
                });
            }
            catch (error) {
                console.error("Error fetching offer:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    updateOffer(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
                // Get raw body first for custom processing
                const rawBody = request.body;
                console.log("Raw body received:", JSON.stringify(rawBody, null, 2));
                // Transform numeric fields from German format to standard numeric
                const processedBody = Object.assign(Object.assign({}, rawBody), { 
                    // Only process fields that are actually being sent
                    discountPercentage: rawBody.discountPercentage !== undefined
                        ? this.cleanNumberForDB(rawBody.discountPercentage)
                        : undefined, discountAmount: rawBody.discountAmount !== undefined
                        ? this.cleanNumberForDB(rawBody.discountAmount)
                        : undefined, shippingCost: rawBody.shippingCost !== undefined
                        ? this.cleanNumberForDB(rawBody.shippingCost)
                        : undefined, 
                    // ONLY process subtotal/taxAmount/totalAmount if they're being sent
                    subtotal: rawBody.subtotal !== undefined
                        ? this.cleanNumberForDB(rawBody.subtotal)
                        : undefined, taxAmount: rawBody.taxAmount !== undefined
                        ? this.cleanNumberForDB(rawBody.taxAmount)
                        : undefined, totalAmount: rawBody.totalAmount !== undefined
                        ? this.cleanNumberForDB(rawBody.totalAmount)
                        : undefined });
                console.log("Processed body:", JSON.stringify(processedBody, null, 2));
                // Get the offer FIRST to see what's already in the database
                const offer = yield this.offerRepository.findOne({
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
                // Transform and create DTO instance with explicit options
                const updateOfferDto = plainToInstance(UpdateOfferDto, processedBody, {
                    excludeExtraneousValues: false,
                    enableImplicitConversion: true,
                });
                console.log("UpdateOfferDto created:", JSON.stringify(updateOfferDto, null, 2));
                // Check if DTO was properly created
                if (!updateOfferDto || typeof updateOfferDto !== "object") {
                    return response.status(400).json({
                        success: false,
                        message: "Invalid request body format",
                    });
                }
                // Validate DTO with options
                const errors = yield validate(updateOfferDto, {
                    whitelist: true,
                    forbidNonWhitelisted: false,
                });
                if (errors.length > 0) {
                    return response.status(400).json({
                        success: false,
                        errors: errors.map((error) => ({
                            property: error.property,
                            constraints: error.constraints,
                        })),
                    });
                }
                // Check if unit pricing mode is changing
                const unitPricingChanged = updateOfferDto.useUnitPrices !== undefined &&
                    updateOfferDto.useUnitPrices !== offer.useUnitPrices;
                // CLEAN ALL NUMERIC FIELDS IN THE EXISTING OFFER FIRST
                // This is the key fix: clean the existing database values
                if (offer.subtotal && typeof offer.subtotal === "string") {
                    console.log("Cleaning existing subtotal from DB:", offer.subtotal);
                    offer.subtotal = this.cleanNumberForDB(offer.subtotal) || 0;
                }
                if (offer.taxAmount && typeof offer.taxAmount === "string") {
                    console.log("Cleaning existing taxAmount from DB:", offer.taxAmount);
                    offer.taxAmount = this.cleanNumberForDB(offer.taxAmount) || 0;
                }
                if (offer.totalAmount && typeof offer.totalAmount === "string") {
                    console.log("Cleaning existing totalAmount from DB:", offer.totalAmount);
                    offer.totalAmount = this.cleanNumberForDB(offer.totalAmount) || 0;
                }
                // Update only the fields that are being sent in the request
                // DO NOT include subtotal/taxAmount/totalAmount unless they're in the request
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
                // Only update numeric fields if they're in the request
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
                // Only update subtotal/taxAmount/totalAmount if they're explicitly in the request
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
                // Save the offer
                const updatedOffer = yield this.offerRepository.save(offer);
                // If unit pricing mode changed, update line items
                if (unitPricingChanged && offer.lineItems) {
                    yield this.updateLineItemsForUnitPricingChange(offer.id, updateOfferDto.useUnitPrices);
                }
                // Recalculate totals if pricing-related fields changed
                if (updateOfferDto.shippingCost !== undefined ||
                    updateOfferDto.discountPercentage !== undefined ||
                    updateOfferDto.discountAmount !== undefined ||
                    updateOfferDto.subtotal !== undefined ||
                    updateOfferDto.taxAmount !== undefined ||
                    updateOfferDto.totalAmount !== undefined ||
                    unitPricingChanged) {
                    yield this.calculateOfferTotals(id);
                }
                const completeOffer = yield this.offerRepository.findOne({
                    where: { id: updatedOffer.id },
                    relations: ["lineItems", "inquiry"],
                });
                return response.status(200).json({
                    success: true,
                    message: "Offer updated successfully",
                    data: completeOffer,
                });
            }
            catch (error) {
                console.error("Error updating offer:", error);
                // Log full error details
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
                        message: "Invalid numeric value format. Please use numbers without thousand separators.",
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
        });
    }
    // SIMPLIFIED cleanNumberForDB method
    cleanNumberForDB(value) {
        if (value === null || value === undefined || value === "") {
            return undefined;
        }
        console.log(`cleanNumberForDB input: ${value}, type: ${typeof value}`);
        // If it's already a number, return it
        if (typeof value === "number") {
            return isNaN(value) ? 0 : value;
        }
        const str = String(value);
        // SPECIAL CASE: Handle "00.000.000" format
        if (str === "00.000.000" || str === "0.000.000") {
            console.log("Converting German zero format to 0");
            return 0;
        }
        // Remove all dots (they're thousand separators in German format)
        // Replace comma with dot (German decimal separator)
        const cleaned = str.replace(/\./g, "").replace(",", ".");
        // Parse to number
        const num = parseFloat(cleaned);
        console.log(`Result: ${num}`);
        return isNaN(num) ? 0 : num;
    }
    updateLineItemsForUnitPricingChange(offerId, useUnitPrices) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const lineItems = yield this.lineItemRepository.find({
                    where: { offerId, isComponent: false },
                });
                const updates = [];
                for (const lineItem of lineItems) {
                    if (useUnitPrices) {
                        // Enable unit prices: ensure line item has unit prices
                        if (!lineItem.unitPrices || lineItem.unitPrices.length === 0) {
                            lineItem.unitPrices = this.createDefaultUnitPrices();
                            updates.push(lineItem);
                        }
                    }
                    else {
                        // Disable unit prices: clear unit prices (keep quantity prices if they exist)
                        lineItem.unitPrices = [];
                        updates.push(lineItem);
                    }
                }
                if (updates.length > 0) {
                    yield this.lineItemRepository.save(updates);
                }
            }
            catch (error) {
                console.error("Error updating line items for unit pricing change:", error);
            }
        });
    }
    updateLineItem(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { offerId, lineItemId } = request.params;
                const updateLineItemDto = plainToInstance(UpdateLineItemDto, request.body);
                // Validate DTO
                const errors = yield validate(updateLineItemDto);
                if (errors.length > 0) {
                    return response.status(400).json({
                        success: false,
                        errors: errors.map((error) => ({
                            property: error.property,
                            constraints: error.constraints,
                        })),
                    });
                }
                const offer = yield this.offerRepository.findOne({
                    where: { id: offerId },
                });
                if (!offer) {
                    return response.status(404).json({
                        success: false,
                        message: "Offer not found",
                    });
                }
                const lineItem = yield this.lineItemRepository.findOne({
                    where: { id: lineItemId, offerId },
                });
                if (!lineItem) {
                    return response.status(404).json({
                        success: false,
                        message: "Line item not found",
                    });
                }
                // Process unit prices if provided (use offer's decimal places)
                if (updateLineItemDto.unitPrices && offer.useUnitPrices) {
                    const processedUnitPrices = this.processUnitPrices(updateLineItemDto.unitPrices, offer.totalPriceDecimalPlaces || 2);
                    // Ensure only one is active
                    const activeCount = processedUnitPrices.filter((up) => up.isActive).length;
                    if (activeCount > 1) {
                        // Keep only the first one active
                        processedUnitPrices.forEach((up, index) => {
                            up.isActive = index === 0;
                        });
                    }
                    else if (activeCount === 0 && processedUnitPrices.length > 0) {
                        // Set first one as active if none are active
                        processedUnitPrices[0].isActive = true;
                    }
                    updateLineItemDto.unitPrices = processedUnitPrices;
                }
                // If quantityPrices are being updated (legacy), ensure only one is active
                if (updateLineItemDto.quantityPrices && !offer.useUnitPrices) {
                    updateLineItemDto.quantityPrices = updateLineItemDto.quantityPrices.map((qp) => (Object.assign(Object.assign({}, qp), { total: parseFloat(qp.quantity) * qp.price })));
                    // Ensure only one price is active
                    const activeCount = updateLineItemDto.quantityPrices.filter((qp) => qp.isActive).length;
                    if (activeCount > 1) {
                        // Keep only the first one active
                        updateLineItemDto.quantityPrices =
                            updateLineItemDto.quantityPrices.map((qp, index) => (Object.assign(Object.assign({}, qp), { isActive: index === 0 })));
                    }
                    else if (activeCount === 0 &&
                        updateLineItemDto.quantityPrices.length > 0) {
                        // Set first one as active if none are active
                        updateLineItemDto.quantityPrices[0].isActive = true;
                    }
                }
                // Update line item fields
                Object.assign(lineItem, updateLineItemDto);
                // Calculate line total based on offer's unit pricing mode
                if (offer.useUnitPrices &&
                    updateLineItemDto.unitPrices &&
                    updateLineItemDto.unitPrices.length > 0) {
                    const activeUnitPrice = updateLineItemDto.unitPrices.find((up) => up.isActive);
                    if (activeUnitPrice) {
                        lineItem.lineTotal = activeUnitPrice.totalPrice;
                    }
                }
                else if (updateLineItemDto.quantityPrices &&
                    updateLineItemDto.quantityPrices.length > 0) {
                    const activePrice = updateLineItemDto.quantityPrices.find((qp) => qp.isActive);
                    if (activePrice) {
                        lineItem.lineTotal = activePrice.total;
                    }
                }
                else if (updateLineItemDto.basePrice !== undefined &&
                    updateLineItemDto.baseQuantity !== undefined) {
                    const quantity = parseFloat(updateLineItemDto.baseQuantity) || 1;
                    lineItem.lineTotal = updateLineItemDto.basePrice * quantity;
                }
                else if (updateLineItemDto.basePrice !== undefined &&
                    lineItem.baseQuantity) {
                    const quantity = parseFloat(lineItem.baseQuantity) || 1;
                    lineItem.lineTotal = updateLineItemDto.basePrice * quantity;
                }
                const updatedLineItem = yield this.lineItemRepository.save(lineItem);
                // Recalculate offer totals
                yield this.calculateOfferTotals(offerId);
                return response.status(200).json({
                    success: true,
                    message: "Line item updated successfully",
                    data: updatedLineItem,
                });
            }
            catch (error) {
                console.error("Error updating line item:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    // Add unit price to line item
    addUnitPrice(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { lineItemId } = request.params;
                const { quantity, unitPrice, isActive = false } = request.body;
                if (!quantity || !unitPrice) {
                    return response.status(400).json({
                        success: false,
                        message: "Quantity and unit price are required",
                    });
                }
                const lineItem = yield this.lineItemRepository.findOne({
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
                // Initialize or update unitPrices array
                let unitPrices = lineItem.unitPrices || [];
                const qty = parseFloat(quantity) || 0;
                const price = parseFloat(unitPrice) || 0;
                const totalPriceDecimalPlaces = offer.totalPriceDecimalPlaces || 2;
                const totalPrice = parseFloat((qty * price).toFixed(totalPriceDecimalPlaces));
                const now = new Date();
                // If setting as active, deactivate others
                if (isActive) {
                    unitPrices = unitPrices.map((up) => (Object.assign(Object.assign({}, up), { isActive: false, updatedAt: now })));
                }
                const newUnitPrice = {
                    id: (0, uuid_1.v4)(),
                    quantity,
                    unitPrice: price,
                    totalPrice,
                    isActive,
                    createdAt: now,
                    updatedAt: now,
                };
                unitPrices.push(newUnitPrice);
                // Sort by quantity
                unitPrices.sort((a, b) => parseFloat(a.quantity) - parseFloat(b.quantity));
                lineItem.unitPrices = unitPrices;
                // Update line total from active price
                const activeUnitPrice = unitPrices.find((up) => up.isActive);
                if (activeUnitPrice) {
                    lineItem.lineTotal = activeUnitPrice.totalPrice;
                }
                else if (unitPrices.length > 0) {
                    // If no active price, use the first one
                    lineItem.unitPrices[0].isActive = true;
                    lineItem.lineTotal = lineItem.unitPrices[0].totalPrice;
                }
                const updatedLineItem = yield this.lineItemRepository.save(lineItem);
                // Recalculate offer totals
                if (lineItem.offerId) {
                    yield this.calculateOfferTotals(lineItem.offerId);
                }
                return response.status(200).json({
                    success: true,
                    message: "Unit price added successfully",
                    data: updatedLineItem,
                });
            }
            catch (error) {
                console.error("Error adding unit price:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    // Add quantity-price to line item (legacy)
    addQuantityPrice(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { lineItemId } = request.params;
                const { quantity, price, isActive = false } = request.body;
                if (!quantity || !price) {
                    return response.status(400).json({
                        success: false,
                        message: "Quantity and price are required",
                    });
                }
                const lineItem = yield this.lineItemRepository.findOne({
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
                        message: "Unit pricing is enabled for this offer. Use unit prices instead.",
                    });
                }
                // Initialize or update quantityPrices array
                let quantityPrices = lineItem.quantityPrices || [];
                const total = parseFloat(quantity) * parseFloat(price);
                // If setting as active, deactivate others
                if (isActive) {
                    quantityPrices = quantityPrices.map((qp) => (Object.assign(Object.assign({}, qp), { isActive: false })));
                }
                quantityPrices.push({
                    quantity,
                    price: parseFloat(price),
                    isActive,
                    total,
                });
                // Sort by quantity
                quantityPrices.sort((a, b) => parseFloat(a.quantity) - parseFloat(b.quantity));
                lineItem.quantityPrices = quantityPrices;
                // Update line total from active price
                const activePrice = quantityPrices.find((qp) => qp.isActive);
                if (activePrice) {
                    lineItem.lineTotal = activePrice.total;
                }
                else if (quantityPrices.length > 0) {
                    // If no active price, use the first one
                    lineItem.quantityPrices[0].isActive = true;
                    lineItem.lineTotal = lineItem.quantityPrices[0].total;
                }
                const updatedLineItem = yield this.lineItemRepository.save(lineItem);
                // Recalculate offer totals
                if (lineItem.offerId) {
                    yield this.calculateOfferTotals(lineItem.offerId);
                }
                return response.status(200).json({
                    success: true,
                    message: "Quantity price added successfully",
                    data: updatedLineItem,
                });
            }
            catch (error) {
                console.error("Error adding quantity price:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    // Bulk update line items (for copy/paste from spreadsheet)
    bulkUpdateLineItems(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { offerId } = request.params;
                const bulkUpdateDto = plainToInstance(BulkUpdateLineItemsDto, request.body);
                // Validate DTO
                const errors = yield validate(bulkUpdateDto);
                if (errors.length > 0) {
                    return response.status(400).json({
                        success: false,
                        errors: errors.map((error) => ({
                            property: error.property,
                            constraints: error.constraints,
                        })),
                    });
                }
                const offer = yield this.offerRepository.findOne({
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
                        const lineItem = yield this.lineItemRepository.findOne({
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
                            lineItem.quantityPrices = itemUpdate.quantityPrices.map((qp) => (Object.assign(Object.assign({}, qp), { total: parseFloat(qp.quantity) * qp.price })));
                        }
                        if (itemUpdate.unitPrices !== undefined && offer.useUnitPrices) {
                            lineItem.unitPrices = this.processUnitPrices(itemUpdate.unitPrices, offer.totalPriceDecimalPlaces || 2);
                        }
                        if (itemUpdate.basePrice !== undefined)
                            lineItem.basePrice = itemUpdate.basePrice;
                        if (itemUpdate.samplePrice !== undefined)
                            lineItem.samplePrice = itemUpdate.samplePrice;
                        if (itemUpdate.lineTotal !== undefined)
                            lineItem.lineTotal = itemUpdate.lineTotal;
                        if (itemUpdate.notes !== undefined)
                            lineItem.notes = itemUpdate.notes;
                        const updatedItem = yield this.lineItemRepository.save(lineItem);
                        results.push(updatedItem);
                    }
                    catch (error) {
                        errorsList.push({
                            id: itemUpdate.id,
                            error: error instanceof Error ? error.message : "Unknown error",
                        });
                    }
                }
                // Recalculate offer totals
                yield this.calculateOfferTotals(offerId);
                return response.status(200).json({
                    success: true,
                    message: `Updated ${results.length} line items`,
                    data: {
                        updated: results,
                        errors: errorsList.length > 0 ? errorsList : undefined,
                    },
                });
            }
            catch (error) {
                console.error("Error in bulk update:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    // Copy/paste prices from spreadsheet
    copyPastePrices(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { offerId } = request.params;
                const { data } = plainToInstance(CopyPastePricesDto, request.body);
                if (!data) {
                    return response.status(400).json({
                        success: false,
                        message: "Data is required",
                    });
                }
                const offer = yield this.offerRepository.findOne({
                    where: { id: offerId },
                });
                if (!offer) {
                    return response.status(404).json({
                        success: false,
                        message: "Offer not found",
                    });
                }
                // Parse tab-separated values
                const rows = data
                    .trim()
                    .split("\n")
                    .map((row) => row.split("\t"));
                if (rows.length < 2) {
                    return response.status(400).json({
                        success: false,
                        message: "Invalid data format",
                    });
                }
                const lineItems = yield this.lineItemRepository.find({
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
                        const unitPrices = [];
                        const now = new Date();
                        // Start from column 1 (skip item name at column 0)
                        for (let j = 1; j < row.length - 1; j += 2) {
                            const quantity = (_a = row[j]) === null || _a === void 0 ? void 0 : _a.trim();
                            const unitPrice = parseFloat(((_b = row[j + 1]) === null || _b === void 0 ? void 0 : _b.trim()) || "0");
                            if (quantity && !isNaN(unitPrice) && unitPrice > 0) {
                                const qty = parseFloat(quantity) || 0;
                                const totalPriceDecimalPlaces = offer.totalPriceDecimalPlaces || 2;
                                const totalPrice = parseFloat((qty * unitPrice).toFixed(totalPriceDecimalPlaces));
                                unitPrices.push({
                                    id: (0, uuid_1.v4)(),
                                    quantity,
                                    unitPrice,
                                    totalPrice,
                                    isActive: j === 1, // First price is active by default
                                });
                            }
                        }
                        if (unitPrices.length > 0) {
                            if (offer.useUnitPrices) {
                                lineItem.unitPrices = unitPrices.map((upDto) => (Object.assign(Object.assign({}, upDto), { createdAt: now, updatedAt: now })));
                                // Calculate line total from active price
                                const activeUnitPrice = unitPrices.find((up) => up.isActive);
                                if (activeUnitPrice) {
                                    lineItem.lineTotal = activeUnitPrice.totalPrice || 0;
                                }
                            }
                            else {
                                // Convert to quantity prices if unit pricing is not enabled
                                lineItem.quantityPrices = unitPrices.map((upDto) => ({
                                    quantity: upDto.quantity,
                                    price: upDto.unitPrice,
                                    isActive: upDto.isActive || false,
                                    total: upDto.totalPrice || 0,
                                }));
                                // Calculate line total from active price
                                const activePrice = lineItem.quantityPrices.find((qp) => qp.isActive);
                                if (activePrice) {
                                    lineItem.lineTotal = activePrice.total || 0;
                                }
                            }
                            updates.push(lineItem);
                        }
                    }
                }
                // Save all updates
                if (updates.length > 0) {
                    yield this.lineItemRepository.save(updates);
                    yield this.calculateOfferTotals(offerId);
                }
                return response.status(200).json({
                    success: true,
                    message: `Updated prices for ${updates.length} items`,
                    data: updates,
                });
            }
            catch (error) {
                console.error("Error processing copied prices:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    setActivePrice(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { lineItemId, priceType, priceIndex } = request.params;
                const lineItem = yield this.lineItemRepository.findOne({
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
                    // Update all unit prices, set only the selected one as active
                    const now = new Date();
                    lineItem.unitPrices = lineItem.unitPrices.map((up, i) => (Object.assign(Object.assign({}, up), { isActive: i === index, updatedAt: i === index ? now : up.updatedAt })));
                    // Update line total from active price
                    const activeUnitPrice = lineItem.unitPrices[index];
                    lineItem.lineTotal = activeUnitPrice.totalPrice;
                }
                else {
                    if (offer.useUnitPrices) {
                        return response.status(400).json({
                            success: false,
                            message: "Unit pricing is enabled for this offer. Use unit prices instead.",
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
                    // Update all prices, set only the selected one as active
                    lineItem.quantityPrices = lineItem.quantityPrices.map((qp, i) => (Object.assign(Object.assign({}, qp), { isActive: i === index })));
                    // Update line total from active price
                    const activePrice = lineItem.quantityPrices[index];
                    lineItem.lineTotal = activePrice.total;
                }
                const updatedLineItem = yield this.lineItemRepository.save(lineItem);
                // Recalculate offer totals
                if (lineItem.offerId) {
                    yield this.calculateOfferTotals(lineItem.offerId);
                }
                return response.status(200).json({
                    success: true,
                    message: "Active price set successfully",
                    data: updatedLineItem,
                });
            }
            catch (error) {
                console.error("Error setting active price:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    toggleOfferUnitPrices(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { offerId } = request.params;
                const { useUnitPrices } = request.body;
                if (useUnitPrices === undefined) {
                    return response.status(400).json({
                        success: false,
                        message: "useUnitPrices is required",
                    });
                }
                const offer = yield this.offerRepository.findOne({
                    where: { id: offerId },
                });
                if (!offer) {
                    return response.status(404).json({
                        success: false,
                        message: "Offer not found",
                    });
                }
                // FIX: Clean up corrupted numeric values before updating
                const cleanNumericValue = (value) => {
                    if (value === null || value === undefined) {
                        return 0;
                    }
                    // If it's already a number, return it
                    if (typeof value === "number" && !isNaN(value)) {
                        return value;
                    }
                    // If it's a string, try to parse it
                    if (typeof value === "string") {
                        // Remove any non-numeric characters except dots and minus signs
                        const cleaned = value.replace(/[^0-9.-]/g, "");
                        const parsed = parseFloat(cleaned);
                        return isNaN(parsed) ? 0 : parsed;
                    }
                    return 0;
                };
                // Clean up existing corrupted values
                offer.subtotal = cleanNumericValue(offer.subtotal);
                offer.taxAmount = cleanNumericValue(offer.taxAmount);
                offer.totalAmount = cleanNumericValue(offer.totalAmount);
                offer.discountAmount = cleanNumericValue(offer.discountAmount);
                offer.shippingCost = cleanNumericValue(offer.shippingCost);
                const previousUseUnitPrices = offer.useUnitPrices;
                offer.useUnitPrices = useUnitPrices;
                // Set default values if enabling unit prices
                if (useUnitPrices) {
                    if (!offer.unitPriceDecimalPlaces)
                        offer.unitPriceDecimalPlaces = 3;
                    if (!offer.totalPriceDecimalPlaces)
                        offer.totalPriceDecimalPlaces = 2;
                    if (!offer.maxUnitPriceColumns)
                        offer.maxUnitPriceColumns = 3;
                    // Initialize default unit prices if not exist
                    if (!offer.defaultUnitPrices || offer.defaultUnitPrices.length === 0) {
                        offer.defaultUnitPrices = this.createDefaultUnitPrices();
                    }
                }
                // FIX: Save with only the fields we want to update
                const updateData = {
                    useUnitPrices: offer.useUnitPrices,
                    updatedAt: new Date(),
                };
                // Only include numeric fields if they are valid numbers
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
                // Use update instead of save to have more control
                yield this.offerRepository.update(offerId, updateData);
                // Update line items when unit pricing mode changes
                if (previousUseUnitPrices !== useUnitPrices) {
                    yield this.updateLineItemsForUnitPricingChange(offerId, useUnitPrices);
                    // Recalculate totals - but first fix any corrupted line item values
                    try {
                        yield this.calculateOfferTotals(offerId);
                    }
                    catch (calcError) {
                        console.error("Error calculating totals after toggling unit prices:", calcError);
                        // Don't fail the entire operation
                    }
                }
                // Fetch the updated offer
                const updatedOffer = yield this.offerRepository.findOne({
                    where: { id: offerId },
                });
                return response.status(200).json({
                    success: true,
                    message: `Unit prices ${useUnitPrices ? "enabled" : "disabled"} successfully for entire offer`,
                    data: updatedOffer,
                });
            }
            catch (error) {
                console.error("Error toggling offer unit prices:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    // Bulk update unit prices for all line items in an offer
    bulkUpdateOfferUnitPrices(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { offerId } = request.params;
                const { unitPrices } = request.body;
                if (!unitPrices || !Array.isArray(unitPrices)) {
                    return response.status(400).json({
                        success: false,
                        message: "unitPrices array is required",
                    });
                }
                const offer = yield this.offerRepository.findOne({
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
                // Process unit prices with offer's decimal places
                const processedUnitPrices = this.processUnitPrices(unitPrices, offer.totalPriceDecimalPlaces || 2);
                // Update offer's default unit prices
                offer.defaultUnitPrices = processedUnitPrices;
                yield this.offerRepository.save(offer);
                // Update unit prices for all non-component line items
                const lineItems = yield this.lineItemRepository.find({
                    where: { offerId, isComponent: false },
                });
                const updates = [];
                for (const lineItem of lineItems) {
                    // Preserve existing unit price values
                    const existingUnitPrices = lineItem.unitPrices || [];
                    const updatedUnitPrices = processedUnitPrices.map((newUp) => {
                        const existingUp = existingUnitPrices.find((up) => up.quantity === newUp.quantity);
                        if (existingUp) {
                            return Object.assign(Object.assign({}, newUp), { unitPrice: existingUp.unitPrice, totalPrice: parseFloat((parseFloat(existingUp.quantity) * existingUp.unitPrice).toFixed(offer.totalPriceDecimalPlaces || 2)) });
                        }
                        return newUp;
                    });
                    lineItem.unitPrices = updatedUnitPrices;
                    // Update line total from active price
                    const activeUnitPrice = updatedUnitPrices.find((up) => up.isActive);
                    if (activeUnitPrice) {
                        lineItem.lineTotal = activeUnitPrice.totalPrice;
                    }
                    updates.push(lineItem);
                }
                if (updates.length > 0) {
                    yield this.lineItemRepository.save(updates);
                }
                // Recalculate offer totals
                yield this.calculateOfferTotals(offerId);
                return response.status(200).json({
                    success: true,
                    message: "Unit prices updated for all line items",
                    data: { updatedLineItems: updates.length },
                });
            }
            catch (error) {
                console.error("Error bulk updating offer unit prices:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    // Sync unit prices across all line items in an offer
    syncUnitPricesAcrossOffer(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { offerId } = request.params;
                const offer = yield this.offerRepository.findOne({
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
                // Get offer's default unit prices or create default ones
                const templateUnitPrices = offer.defaultUnitPrices || this.createDefaultUnitPrices();
                // Update unit prices for all non-component line items
                const lineItems = yield this.lineItemRepository.find({
                    where: { offerId, isComponent: false },
                });
                const updates = [];
                for (const lineItem of lineItems) {
                    // Preserve existing unit price values
                    const existingUnitPrices = lineItem.unitPrices || [];
                    const updatedUnitPrices = templateUnitPrices.map((templateUp) => {
                        const existingUp = existingUnitPrices.find((up) => up.quantity === templateUp.quantity);
                        if (existingUp) {
                            return Object.assign(Object.assign({}, templateUp), { unitPrice: existingUp.unitPrice, totalPrice: parseFloat((parseFloat(existingUp.quantity) * existingUp.unitPrice).toFixed(offer.totalPriceDecimalPlaces || 2)), isActive: existingUp.isActive });
                        }
                        return templateUp;
                    });
                    lineItem.unitPrices = updatedUnitPrices;
                    // Update line total from active price
                    const activeUnitPrice = updatedUnitPrices.find((up) => up.isActive);
                    if (activeUnitPrice) {
                        lineItem.lineTotal = activeUnitPrice.totalPrice;
                    }
                    else if (updatedUnitPrices.length > 0) {
                        // Set first as active if none active
                        lineItem.unitPrices[0].isActive = true;
                        lineItem.lineTotal = lineItem.unitPrices[0].totalPrice;
                    }
                    updates.push(lineItem);
                }
                if (updates.length > 0) {
                    yield this.lineItemRepository.save(updates);
                }
                // Recalculate offer totals
                yield this.calculateOfferTotals(offerId);
                return response.status(200).json({
                    success: true,
                    message: "Unit prices synced across all line items",
                    data: { syncedLineItems: updates.length },
                });
            }
            catch (error) {
                console.error("Error syncing unit prices across offer:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    // Create offer revision
    createRevision(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
                const createOfferDto = plainToInstance(CreateOfferDto, request.body);
                const originalOffer = yield this.offerRepository.findOne({
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
                const newOfferNumber = yield this.generateOfferNumber();
                // Create new offer as revision
                const newOffer = this.offerRepository.create(Object.assign(Object.assign({}, originalOffer), { id: undefined, offerNumber: newOfferNumber, previousOfferNumber: originalOffer.offerNumber, revision: originalOffer.revision + 1, status: "Draft", pdfGenerated: false, pdfPath: null, pdfGeneratedAt: null, createdAt: undefined, updatedAt: undefined, lineItems: undefined }));
                // Apply any updates from DTO
                Object.assign(newOffer, createOfferDto);
                const savedOffer = yield this.offerRepository.save(newOffer);
                // Duplicate line items
                if (originalOffer.lineItems && originalOffer.lineItems.length > 0) {
                    const newLineItems = originalOffer.lineItems.map((lineItem) => {
                        return this.lineItemRepository.create(Object.assign(Object.assign({}, lineItem), { id: undefined, offer: savedOffer, offerId: savedOffer.id, createdAt: undefined, updatedAt: undefined }));
                    });
                    yield this.lineItemRepository.save(newLineItems);
                }
                const completeOffer = yield this.offerRepository.findOne({
                    where: { id: savedOffer.id },
                    relations: ["lineItems", "inquiry"],
                });
                return response.status(201).json({
                    success: true,
                    message: "Offer revision created successfully",
                    data: completeOffer,
                });
            }
            catch (error) {
                console.error("Error creating offer revision:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    getOfferStatistics(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const totalOffers = yield this.offerRepository.count();
                const draftOffers = yield this.offerRepository.count({
                    where: { status: "Draft" },
                });
                const submittedOffers = yield this.offerRepository.count({
                    where: { status: "Submitted" },
                });
                const acceptedOffers = yield this.offerRepository.count({
                    where: { status: "Accepted" },
                });
                const rejectedOffers = yield this.offerRepository.count({
                    where: { status: "Rejected" },
                });
                // Get offers with unit pricing enabled
                const offersWithUnitPricing = yield this.offerRepository.count({
                    where: { useUnitPrices: true },
                });
                // Get recent offers
                const recentOffers = yield this.offerRepository.find({
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
            }
            catch (error) {
                console.error("Error fetching offer statistics:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    generatePdf(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
                if (!id) {
                    return response.status(400).json({
                        success: false,
                        message: "Offer ID is required",
                    });
                }
                const offer = yield this.offerRepository.findOne({
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
                const formatDate = (dateValue) => {
                    if (!dateValue)
                        return "N/A";
                    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
                    if (!(date instanceof Date) || isNaN(date.getTime()))
                        return "N/A";
                    return date.toLocaleDateString();
                };
                // Helper function to get safe number value
                const getSafeNumber = (numValue) => {
                    if (numValue === null || numValue === undefined || numValue === "")
                        return 0;
                    if (typeof numValue === "string") {
                        const cleaned = numValue.replace(/[^0-9.-]/g, "");
                        if (cleaned === "" || cleaned === "-")
                            return 0;
                        const num = parseFloat(cleaned);
                        return isNaN(num) ? 0 : num;
                    }
                    const num = Number(numValue);
                    return isNaN(num) ? 0 : num;
                };
                // Helper function to format numbers
                const formatNumber = (numValue, decimals = 2) => {
                    const num = getSafeNumber(numValue);
                    const factor = Math.pow(10, decimals);
                    const rounded = Math.round((num + Number.EPSILON) * factor) / factor;
                    const fixedNum = Math.abs(rounded).toFixed(decimals);
                    return rounded < 0 ? `-${fixedNum}` : fixedNum;
                };
                // Calculate totals
                const calculateTotals = (offerData) => {
                    let subtotal = 0;
                    if (offerData.lineItems && Array.isArray(offerData.lineItems)) {
                        const customerItems = offerData.lineItems.filter((item) => !item.isComponent);
                        customerItems.forEach((item) => {
                            if (offerData.useUnitPrices &&
                                item.unitPrices &&
                                Array.isArray(item.unitPrices)) {
                                const activeUnitPrice = item.unitPrices.find((up) => up.isActive);
                                if (activeUnitPrice) {
                                    subtotal += getSafeNumber(activeUnitPrice.totalPrice);
                                }
                            }
                            else if (item.quantityPrices &&
                                Array.isArray(item.quantityPrices)) {
                                const activePrice = item.quantityPrices.find((qp) => qp.isActive);
                                if (activePrice) {
                                    subtotal += getSafeNumber(activePrice.total);
                                }
                            }
                            else if (item.baseQuantity || item.basePrice) {
                                const quantity = getSafeNumber(item.baseQuantity);
                                const price = getSafeNumber(item.basePrice);
                                subtotal += quantity * price;
                            }
                        });
                    }
                    const discount = getSafeNumber(offerData.discountAmount || offerData.discount);
                    let discountedSubtotal = subtotal - discount;
                    if (discountedSubtotal < 0)
                        discountedSubtotal = 0;
                    const shipping = getSafeNumber(offerData.shippingCost || offerData.shipping);
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
                // Calculate totals
                const totals = calculateTotals(offer);
                // Create PDF document - THIS IS WHERE doc IS DEFINED
                const doc = new pdfkit_1.default({ margin: 50, size: "A4" });
                // Set up PDF content
                // Header
                doc
                    .fontSize(20)
                    .text(`OFFER ${offer.offerNumber || "N/A"}`, { align: "center" });
                doc.moveDown();
                doc.fontSize(12);
                doc.text(`Date: ${formatDate(offer.createdAt)}`);
                doc.text(`Valid Until: ${formatDate(offer.validUntil)}`);
                if (offer.useUnitPrices) {
                    doc.text(`Pricing Mode: Unit Pricing (${offer.maxUnitPriceColumns || 3} columns)`);
                }
                doc.moveDown();
                // Customer Information
                doc.fontSize(14).text("Customer Information:", { underline: true });
                doc.fontSize(11);
                if (offer.customerSnapshot) {
                    let customer;
                    try {
                        customer =
                            typeof offer.customerSnapshot === "string"
                                ? JSON.parse(offer.customerSnapshot)
                                : offer.customerSnapshot;
                    }
                    catch (e) {
                        customer = offer.customerSnapshot;
                    }
                    if (customer && typeof customer === "object") {
                        doc.text(`${customer.companyName || customer.name || ""}`);
                        if (customer.legalName &&
                            customer.legalName !== customer.companyName) {
                            doc.text(`${customer.legalName}`);
                        }
                        if (customer.address)
                            doc.text(`${customer.address}`);
                        if (customer.postalCode && customer.city)
                            doc.text(`${customer.postalCode} ${customer.city}`);
                        if (customer.country)
                            doc.text(`${customer.country}`);
                        if (customer.vatId)
                            doc.text(`VAT ID: ${customer.vatId}`);
                    }
                }
                doc.moveDown();
                // Delivery Address
                if (offer.deliveryAddress) {
                    try {
                        let deliveryAddress;
                        if (typeof offer.deliveryAddress === "string") {
                            deliveryAddress = JSON.parse(offer.deliveryAddress);
                        }
                        else {
                            deliveryAddress = offer.deliveryAddress;
                        }
                        if (deliveryAddress && typeof deliveryAddress === "object") {
                            doc.fontSize(14).text("Delivery Address:", { underline: true });
                            doc.fontSize(11);
                            if (deliveryAddress.contactName)
                                doc.text(`${deliveryAddress.contactName}`);
                            if (deliveryAddress.street)
                                doc.text(`${deliveryAddress.street}`);
                            if (deliveryAddress.postalCode && deliveryAddress.city)
                                doc.text(`${deliveryAddress.postalCode} ${deliveryAddress.city}`);
                            if (deliveryAddress.state)
                                doc.text(`${deliveryAddress.state}`);
                            if (deliveryAddress.country)
                                doc.text(`${deliveryAddress.country}`);
                            if (deliveryAddress.contactPhone)
                                doc.text(`Phone: ${deliveryAddress.contactPhone}`);
                            doc.moveDown();
                        }
                    }
                    catch (e) {
                        console.warn("Failed to parse delivery address:", e);
                    }
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
                // Line Items
                if (offer.lineItems && Array.isArray(offer.lineItems)) {
                    const customerItems = offer.lineItems.filter((item) => !item.isComponent);
                    if (customerItems.length === 0) {
                        doc.text("No items in this offer", itemX, y);
                        y += 30;
                    }
                    else {
                        customerItems.forEach((item, index) => {
                            const itemNumber = `${index + 1}.`;
                            const itemName = item.itemName || item.description || "Unnamed Item";
                            doc.text(itemNumber, itemX, y);
                            doc.text(itemName, descX, y, { width: 180 });
                            if (offer.useUnitPrices &&
                                item.unitPrices &&
                                Array.isArray(item.unitPrices)) {
                                const maxColumns = offer.maxUnitPriceColumns || 3;
                                const displayedPrices = item.unitPrices.slice(0, maxColumns);
                                let itemY = y;
                                displayedPrices.forEach((up, upIndex) => {
                                    const qty = getSafeNumber(up.quantity);
                                    const unitPrice = getSafeNumber(up.unitPrice);
                                    const unitPriceDecimalPlaces = offer.unitPriceDecimalPlaces || 3;
                                    const priceText = `${qty} pcs: €${formatNumber(unitPrice, unitPriceDecimalPlaces)} (unit)`;
                                    const highlight = up.isActive ? { color: "red" } : {};
                                    doc.text(priceText, qtyX, itemY + upIndex * 15, Object.assign(Object.assign({}, highlight), { width: 150 }));
                                });
                                const activeUnitPrice = item.unitPrices.find((up) => up.isActive);
                                if (activeUnitPrice) {
                                    const totalPriceDecimalPlaces = offer.totalPriceDecimalPlaces || 2;
                                    doc.text(`€${formatNumber(activeUnitPrice.totalPrice, totalPriceDecimalPlaces)}`, totalX, y);
                                }
                            }
                            else if (item.quantityPrices &&
                                Array.isArray(item.quantityPrices)) {
                                let itemY = y;
                                item.quantityPrices.forEach((qp, qpIndex) => {
                                    const qpQuantity = getSafeNumber(qp.quantity);
                                    const qpPrice = getSafeNumber(qp.price);
                                    const priceText = `${qpQuantity} pcs: €${formatNumber(qpPrice, 3)}`;
                                    const highlight = qp.isActive ? { color: "red" } : {};
                                    doc.text(priceText, qtyX, itemY + qpIndex * 15, Object.assign(Object.assign({}, highlight), { width: 150 }));
                                });
                                const activePrice = item.quantityPrices.find((qp) => qp.isActive);
                                if (activePrice) {
                                    doc.text(`€${formatNumber(activePrice.total, 2)}`, totalX, y);
                                }
                            }
                            else if (item.baseQuantity || item.basePrice) {
                                const quantity = getSafeNumber(item.baseQuantity);
                                const price = getSafeNumber(item.basePrice);
                                doc.text(quantity.toString(), qtyX, y);
                                doc.text(`€${formatNumber(price, 3)}`, priceX, y);
                                const total = quantity * price;
                                doc.text(`€${formatNumber(total, 2)}`, totalX, y);
                            }
                            else {
                                doc.text("N/A", qtyX, y);
                                doc.text("N/A", priceX, y);
                                doc.text("N/A", totalX, y);
                            }
                            const numPrices = Math.max(offer.useUnitPrices && item.unitPrices
                                ? item.unitPrices.length
                                : 0, item.quantityPrices ? item.quantityPrices.length : 0, 1);
                            y += Math.max(30, numPrices * 20);
                        });
                    }
                }
                // Get safe numeric values for PDF display
                const displaySubtotal = getSafeNumber(totals.subtotal);
                const displayTaxAmount = getSafeNumber(totals.taxAmount);
                const displayTotalAmount = getSafeNumber(totals.totalAmount);
                const displayShippingCost = getSafeNumber(totals.shippingCost);
                const displayDiscountAmount = getSafeNumber(totals.discountAmount);
                // Totals section
                y += 20;
                doc.moveTo(400, y).lineTo(550, y).stroke();
                y += 10;
                doc.fontSize(10);
                doc.text("Subtotal:", 400, y);
                doc.text(`€${formatNumber(displaySubtotal, 2)}`, 500, y);
                y += 20;
                if (displayDiscountAmount > 0) {
                    doc.text("Discount:", 400, y);
                    doc.text(`-€${formatNumber(displayDiscountAmount, 2)}`, 500, y);
                    y += 20;
                }
                if (displayShippingCost > 0) {
                    doc.text("Shipping:", 400, y);
                    doc.text(`€${formatNumber(displayShippingCost, 2)}`, 500, y);
                    y += 20;
                }
                const taxRate = offer.taxRate ? getSafeNumber(offer.taxRate) : 19;
                doc.text(`VAT (${taxRate}%):`, 400, y);
                doc.text(`€${formatNumber(displayTaxAmount, 2)}`, 500, y);
                y += 20;
                doc.fontSize(12).font("Helvetica-Bold");
                doc.text("TOTAL:", 400, y);
                doc.text(`€${formatNumber(displayTotalAmount, 2)}`, 500, y);
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
                    const notes = offer.notes.length > 200
                        ? offer.notes.substring(0, 200) + "..."
                        : offer.notes;
                    doc.text(`Notes: ${notes}`, 50, y, { width: 500 });
                }
                // Save PDF to file
                const uploadsDir = path_1.default.join(__dirname, "../../uploads/offers");
                if (!fs_1.default.existsSync(uploadsDir)) {
                    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
                }
                const pdfFileName = `${offer.offerNumber || "offer"}.pdf`;
                const pdfPath = path_1.default.join(uploadsDir, pdfFileName);
                // Create a write stream and pipe the PDF to it
                const writeStream = fs_1.default.createWriteStream(pdfPath);
                // Create promise for PDF writing
                const pdfWritePromise = new Promise((resolve, reject) => {
                    writeStream.on("finish", resolve);
                    writeStream.on("error", reject);
                    // Pipe the PDF document to the file stream
                    doc.pipe(writeStream);
                    doc.end();
                });
                // Wait for PDF to be written
                yield pdfWritePromise;
                // Try to update database (optional)
                try {
                    offer.pdfPath = `/uploads/offers/${pdfFileName}`;
                    offer.pdfGenerated = true;
                    offer.pdfGeneratedAt = new Date();
                    yield this.offerRepository.save(offer);
                }
                catch (dbError) {
                    console.warn("Database update failed but PDF was created:", dbError);
                }
                // Send the PDF file directly
                response.setHeader("Content-Type", "application/pdf");
                response.setHeader("Content-Disposition", `attachment; filename="${pdfFileName}"`);
                const fileStream = fs_1.default.createReadStream(pdfPath);
                fileStream.pipe(response);
            }
            catch (error) {
                console.error("Error generating PDF:", error);
                // Send JSON error response
                return response.status(500).json({
                    success: false,
                    message: "Internal server error while generating PDF",
                    error: process.env.NODE_ENV === "development" ? error.message : undefined,
                });
            }
        });
    }
    generateAndDownloadPdf(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
                if (!id) {
                    return response.status(400).json({
                        success: false,
                        message: "Offer ID is required",
                    });
                }
                const offer = yield this.offerRepository.findOne({
                    where: { id },
                    relations: ["lineItems"],
                });
                if (!offer) {
                    return response.status(404).json({
                        success: false,
                        message: "Offer not found",
                    });
                }
                // Helper functions
                const formatDate = (dateValue) => {
                    if (!dateValue)
                        return "N/A";
                    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
                    if (!(date instanceof Date) || isNaN(date.getTime()))
                        return "N/A";
                    return date.toLocaleDateString();
                };
                const getSafeNumber = (numValue) => {
                    if (numValue === null || numValue === undefined || numValue === "")
                        return 0;
                    if (typeof numValue === "string") {
                        const cleaned = numValue.replace(/[^0-9.-]/g, "");
                        if (cleaned === "" || cleaned === "-")
                            return 0;
                        const num = parseFloat(cleaned);
                        return isNaN(num) ? 0 : num;
                    }
                    const num = Number(numValue);
                    return isNaN(num) ? 0 : num;
                };
                const formatNumber = (numValue, decimals = 2) => {
                    const num = getSafeNumber(numValue);
                    const factor = Math.pow(10, decimals);
                    const rounded = Math.round((num + Number.EPSILON) * factor) / factor;
                    const fixedNum = Math.abs(rounded).toFixed(decimals);
                    return rounded < 0 ? `-${fixedNum}` : fixedNum;
                };
                // Create PDF document
                const doc = new pdfkit_1.default({ margin: 50, size: "A4" });
                // Header
                doc
                    .fontSize(20)
                    .text(`OFFER ${offer.offerNumber || "N/A"}`, { align: "center" });
                doc.moveDown();
                doc.fontSize(12);
                doc.text(`Date: ${formatDate(offer.createdAt)}`);
                doc.text(`Valid Until: ${formatDate(offer.validUntil)}`);
                if (offer.useUnitPrices) {
                    doc.text(`Pricing Mode: Unit Pricing (${offer.maxUnitPriceColumns || 3} columns)`);
                }
                doc.moveDown();
                // Customer Information
                doc.fontSize(14).text("Customer Information:", { underline: true });
                doc.fontSize(11);
                if (offer.customerSnapshot) {
                    let customer;
                    try {
                        customer =
                            typeof offer.customerSnapshot === "string"
                                ? JSON.parse(offer.customerSnapshot)
                                : offer.customerSnapshot;
                    }
                    catch (e) {
                        customer = offer.customerSnapshot;
                    }
                    if (customer && typeof customer === "object") {
                        doc.text(`${customer.companyName || customer.name || ""}`);
                        if (customer.legalName &&
                            customer.legalName !== customer.companyName) {
                            doc.text(`${customer.legalName}`);
                        }
                        if (customer.address)
                            doc.text(`${customer.address}`);
                        if (customer.postalCode && customer.city)
                            doc.text(`${customer.postalCode} ${customer.city}`);
                        if (customer.country)
                            doc.text(`${customer.country}`);
                        if (customer.vatId)
                            doc.text(`VAT ID: ${customer.vatId}`);
                    }
                }
                doc.moveDown();
                // Delivery Address
                if (offer.deliveryAddress) {
                    try {
                        let deliveryAddress;
                        if (typeof offer.deliveryAddress === "string") {
                            deliveryAddress = JSON.parse(offer.deliveryAddress);
                        }
                        else {
                            deliveryAddress = offer.deliveryAddress;
                        }
                        if (deliveryAddress && typeof deliveryAddress === "object") {
                            doc.fontSize(14).text("Delivery Address:", { underline: true });
                            doc.fontSize(11);
                            if (deliveryAddress.contactName)
                                doc.text(`${deliveryAddress.contactName}`);
                            if (deliveryAddress.street)
                                doc.text(`${deliveryAddress.street}`);
                            if (deliveryAddress.postalCode && deliveryAddress.city)
                                doc.text(`${deliveryAddress.postalCode} ${deliveryAddress.city}`);
                            if (deliveryAddress.state)
                                doc.text(`${deliveryAddress.state}`);
                            if (deliveryAddress.country)
                                doc.text(`${deliveryAddress.country}`);
                            if (deliveryAddress.contactPhone)
                                doc.text(`Phone: ${deliveryAddress.contactPhone}`);
                            doc.moveDown();
                        }
                    }
                    catch (e) {
                        console.warn("Failed to parse delivery address:", e);
                    }
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
                // Calculate totals as we render
                let subtotal = 0;
                // Line Items
                if (offer.lineItems && Array.isArray(offer.lineItems)) {
                    const customerItems = offer.lineItems.filter((item) => !item.isComponent);
                    customerItems.forEach((item, index) => {
                        const itemNumber = `${index + 1}.`;
                        const itemName = item.itemName || item.description || "Unnamed Item";
                        doc.text(itemNumber, itemX, y);
                        doc.text(itemName, descX, y, { width: 180 });
                        let itemTotal = 0;
                        if (offer.useUnitPrices &&
                            item.unitPrices &&
                            Array.isArray(item.unitPrices)) {
                            const maxColumns = offer.maxUnitPriceColumns || 3;
                            const displayedPrices = item.unitPrices.slice(0, maxColumns);
                            let itemY = y;
                            displayedPrices.forEach((up, upIndex) => {
                                const qty = getSafeNumber(up.quantity);
                                const unitPrice = getSafeNumber(up.unitPrice);
                                const unitPriceDecimalPlaces = offer.unitPriceDecimalPlaces || 3;
                                const priceText = `${qty} pcs: €${formatNumber(unitPrice, unitPriceDecimalPlaces)} (unit)`;
                                const highlight = up.isActive ? { color: "red" } : {};
                                doc.text(priceText, qtyX, itemY + upIndex * 15, Object.assign(Object.assign({}, highlight), { width: 150 }));
                            });
                            const activeUnitPrice = item.unitPrices.find((up) => up.isActive);
                            if (activeUnitPrice) {
                                const totalPriceDecimalPlaces = offer.totalPriceDecimalPlaces || 2;
                                itemTotal = getSafeNumber(activeUnitPrice.totalPrice);
                                doc.text(`€${formatNumber(activeUnitPrice.totalPrice, totalPriceDecimalPlaces)}`, totalX, y);
                            }
                        }
                        else if (item.quantityPrices &&
                            Array.isArray(item.quantityPrices)) {
                            let itemY = y;
                            item.quantityPrices.forEach((qp, qpIndex) => {
                                const qpQuantity = getSafeNumber(qp.quantity);
                                const qpPrice = getSafeNumber(qp.price);
                                const priceText = `${qpQuantity} pcs: €${formatNumber(qpPrice, 3)}`;
                                const highlight = qp.isActive ? { color: "red" } : {};
                                doc.text(priceText, qtyX, itemY + qpIndex * 15, Object.assign(Object.assign({}, highlight), { width: 150 }));
                            });
                            const activePrice = item.quantityPrices.find((qp) => qp.isActive);
                            if (activePrice) {
                                itemTotal = getSafeNumber(activePrice.total);
                                doc.text(`€${formatNumber(activePrice.total, 2)}`, totalX, y);
                            }
                        }
                        else if (item.baseQuantity || item.basePrice) {
                            const quantity = getSafeNumber(item.baseQuantity);
                            const price = getSafeNumber(item.basePrice);
                            itemTotal = quantity * price;
                            doc.text(quantity.toString(), qtyX, y);
                            doc.text(`€${formatNumber(price, 3)}`, priceX, y);
                            doc.text(`€${formatNumber(itemTotal, 2)}`, totalX, y);
                        }
                        else {
                            doc.text("N/A", qtyX, y);
                            doc.text("N/A", priceX, y);
                            doc.text("N/A", totalX, y);
                        }
                        subtotal += itemTotal;
                        const numPrices = Math.max(offer.useUnitPrices && item.unitPrices ? item.unitPrices.length : 0, item.quantityPrices ? item.quantityPrices.length : 0, 1);
                        y += Math.max(30, numPrices * 20);
                    });
                }
                // Calculate final totals
                const discount = getSafeNumber(offer.discountAmount || offer.discount);
                let discountedSubtotal = subtotal - discount;
                if (discountedSubtotal < 0)
                    discountedSubtotal = 0;
                const shipping = getSafeNumber(offer.shippingCost || offer.shipping);
                const amountBeforeTax = discountedSubtotal + shipping;
                const taxRate = offer.taxRate ? getSafeNumber(offer.taxRate) / 100 : 0.19;
                const taxAmount = amountBeforeTax * taxRate;
                const totalAmount = amountBeforeTax + taxAmount;
                // Totals section
                y += 20;
                doc.moveTo(400, y).lineTo(550, y).stroke();
                y += 10;
                doc.fontSize(10);
                doc.text("Subtotal:", 400, y);
                doc.text(`€${formatNumber(subtotal, 2)}`, 500, y);
                y += 20;
                if (discount > 0) {
                    doc.text("Discount:", 400, y);
                    doc.text(`-€${formatNumber(discount, 2)}`, 500, y);
                    y += 20;
                }
                if (shipping > 0) {
                    doc.text("Shipping:", 400, y);
                    doc.text(`€${formatNumber(shipping, 2)}`, 500, y);
                    y += 20;
                }
                const displayTaxRate = offer.taxRate ? getSafeNumber(offer.taxRate) : 19;
                doc.text(`VAT (${displayTaxRate}%):`, 400, y);
                doc.text(`€${formatNumber(taxAmount, 2)}`, 500, y);
                y += 20;
                doc.fontSize(12).font("Helvetica-Bold");
                doc.text("TOTAL:", 400, y);
                doc.text(`€${formatNumber(totalAmount, 2)}`, 500, y);
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
                    const notes = offer.notes.length > 200
                        ? offer.notes.substring(0, 200) + "..."
                        : offer.notes;
                    doc.text(`Notes: ${notes}`, 50, y, { width: 500 });
                }
                // Set response headers BEFORE piping
                response.setHeader("Content-Type", "application/pdf");
                response.setHeader("Content-Disposition", `attachment; filename="Offer-${offer.offerNumber || id}.pdf"`);
                // Pipe PDF directly to response
                doc.pipe(response);
                doc.end();
            }
            catch (error) {
                console.error("Error generating PDF:", error);
                // If headers already sent, we can't send JSON
                if (response.headersSent) {
                    return;
                }
                return response.status(500).json({
                    success: false,
                    message: "Internal server error while generating PDF",
                    error: process.env.NODE_ENV === "development" ? error.message : undefined,
                });
            }
        });
    }
    deleteOffer(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
                const offer = yield this.offerRepository.findOne({
                    where: { id },
                });
                if (!offer) {
                    return response.status(404).json({
                        success: false,
                        message: "Offer not found",
                    });
                }
                yield this.offerRepository.remove(offer);
                return response.status(200).json({
                    success: true,
                    message: "Offer deleted successfully",
                });
            }
            catch (error) {
                console.error("Error deleting offer:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    // Get offers by inquiry
    getOffersByInquiry(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { inquiryId } = request.params;
                const { page = 1, limit = 20 } = request.query;
                const inquiry = yield this.inquiryRepository.findOne({
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
                const [offers, total] = yield queryBuilder
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
            }
            catch (error) {
                console.error("Error fetching offers by inquiry:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    // Get offer statuses
    getOfferStatuses(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
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
            }
            catch (error) {
                console.error("Error fetching offer statuses:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    getAvailableCurrencies(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
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
            }
            catch (error) {
                console.error("Error fetching currencies:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
}
exports.OfferController = OfferController;

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
exports.OfferController = exports.CopyPastePricesDto = exports.BulkUpdateLineItemsDto = exports.UpdateLineItemDto = exports.UpdateOfferDto = exports.CreateOfferDto = void 0;
const database_1 = require("../config/database");
const offer_1 = require("../models/offer");
const inquiry_1 = require("../models/inquiry");
const requested_items_1 = require("../models/requested_items");
const customers_1 = require("../models/customers");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class CreateOfferDto {
}
exports.CreateOfferDto = CreateOfferDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], CreateOfferDto.prototype, "validUntil", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "termsConditions", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "deliveryTerms", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "paymentTerms", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "deliveryTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateOfferDto.prototype, "discountPercentage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateOfferDto.prototype, "discountAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateOfferDto.prototype, "shippingCost", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "internalNotes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "assemblyName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "assemblyDescription", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "assemblyNotes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateOfferDto.prototype, "deliveryAddress", void 0);
class UpdateOfferDto {
}
exports.UpdateOfferDto = UpdateOfferDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateOfferDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)([
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
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], UpdateOfferDto.prototype, "validUntil", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateOfferDto.prototype, "termsConditions", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateOfferDto.prototype, "deliveryTerms", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateOfferDto.prototype, "paymentTerms", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateOfferDto.prototype, "deliveryTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(["RMB", "HKD", "EUR", "USD"]),
    __metadata("design:type", String)
], UpdateOfferDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], UpdateOfferDto.prototype, "discountPercentage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateOfferDto.prototype, "discountAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateOfferDto.prototype, "shippingCost", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateOfferDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateOfferDto.prototype, "internalNotes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateOfferDto.prototype, "deliveryAddress", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateOfferDto.prototype, "subtotal", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateOfferDto.prototype, "taxAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateOfferDto.prototype, "totalAmount", void 0);
class UpdateLineItemDto {
}
exports.UpdateLineItemDto = UpdateLineItemDto;
class BulkUpdateLineItemsDto {
}
exports.BulkUpdateLineItemsDto = BulkUpdateLineItemsDto;
class CopyPastePricesDto {
}
exports.CopyPastePricesDto = CopyPastePricesDto;
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
                const createOfferDto = (0, class_transformer_1.plainToInstance)(CreateOfferDto, request.body, {
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
                const errors = yield (0, class_validator_1.validate)(createOfferDto, {
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
                        // Set initial quantity prices (empty, will be filled later)
                        quantityPrices: [],
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
                                quantityPrices: [], // Components don't have customer-facing prices
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
                                quantityPrices: [], // Empty initially, will be set by user
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
    calculateOfferTotals(offerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const lineItems = yield this.lineItemRepository.find({
                    where: { offerId, isComponent: false }, // Don't include components in total
                    order: { position: "ASC" },
                });
                let subtotal = 0;
                // Calculate subtotal from line items
                for (const item of lineItems) {
                    if (item.lineTotal && !isNaN(item.lineTotal)) {
                        subtotal += parseFloat(item.lineTotal.toString());
                    }
                    else if (item.basePrice && item.baseQuantity) {
                        // Calculate from base price if no line total
                        const quantity = parseFloat(item.baseQuantity) || 1;
                        const price = parseFloat(item.basePrice.toString()) || 0;
                        const lineTotal = quantity * price;
                        item.lineTotal = lineTotal;
                        subtotal += lineTotal;
                        // Save updated line total
                        yield this.lineItemRepository.save(item);
                    }
                    else if (item.quantityPrices && item.quantityPrices.length > 0) {
                        // Calculate from active quantity price
                        const activePrice = item.quantityPrices.find((qp) => qp.isActive);
                        if (activePrice) {
                            item.lineTotal = activePrice.total || 0;
                            subtotal += item.lineTotal;
                            // Save updated line total
                            yield this.lineItemRepository.save(item);
                        }
                    }
                }
                // Get offer to update
                const offer = yield this.offerRepository.findOne({
                    where: { id: offerId },
                });
                if (offer) {
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
                    offer.subtotal = parseFloat(subtotal.toFixed(2));
                    offer.taxAmount = parseFloat(taxAmount.toFixed(2));
                    offer.totalAmount = parseFloat(totalWithTax.toFixed(2));
                    yield this.offerRepository.save(offer);
                }
            }
            catch (error) {
                console.error("Error calculating offer totals:", error);
            }
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
                // Calculate which price is active for each line item
                if (offer.lineItems) {
                    offer.lineItems = offer.lineItems.map((item) => {
                        var _a;
                        return (Object.assign(Object.assign({}, item), { activePrice: ((_a = item.quantityPrices) === null || _a === void 0 ? void 0 : _a.find((qp) => qp.isActive)) || null }));
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
                // Transform and create DTO instance with explicit options
                const updateOfferDto = (0, class_transformer_1.plainToInstance)(UpdateOfferDto, request.body, {
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
                const errors = yield (0, class_validator_1.validate)(updateOfferDto, {
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
                const offer = yield this.offerRepository.findOne({
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
                const updatedOffer = yield this.offerRepository.save(offer);
                // Recalculate totals if pricing-related fields changed
                if (updateOfferDto.shippingCost !== undefined ||
                    updateOfferDto.discountPercentage !== undefined ||
                    updateOfferDto.discountAmount !== undefined ||
                    updateOfferDto.subtotal !== undefined ||
                    updateOfferDto.taxAmount !== undefined ||
                    updateOfferDto.totalAmount !== undefined) {
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
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    }
    updateLineItem(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { offerId, lineItemId } = request.params;
                const updateLineItemDto = (0, class_transformer_1.plainToInstance)(UpdateLineItemDto, request.body);
                // Validate DTO
                const errors = yield (0, class_validator_1.validate)(updateLineItemDto);
                if (errors.length > 0) {
                    return response.status(400).json({
                        success: false,
                        errors: errors.map((error) => ({
                            property: error.property,
                            constraints: error.constraints,
                        })),
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
                // If quantityPrices are being updated, ensure only one is active
                if (updateLineItemDto.quantityPrices) {
                    updateLineItemDto.quantityPrices = updateLineItemDto.quantityPrices.map((qp) => (Object.assign(Object.assign({}, qp), { total: parseFloat(qp.quantity) * qp.price })));
                    // Ensure only one price is active
                    const activeCount = updateLineItemDto.quantityPrices.filter((qp) => qp.isActive).length;
                    if (activeCount > 1) {
                        // Keep only the first one active
                        updateLineItemDto.quantityPrices =
                            updateLineItemDto.quantityPrices.map((qp, index) => (Object.assign(Object.assign({}, qp), { isActive: index === 0 })));
                    }
                }
                // Update line item fields
                Object.assign(lineItem, updateLineItemDto);
                // Calculate line total if quantity prices or base price changes
                if (updateLineItemDto.quantityPrices) {
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
    // Add quantity-price to line item
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
                });
                if (!lineItem) {
                    return response.status(404).json({
                        success: false,
                        message: "Line item not found",
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
                const bulkUpdateDto = (0, class_transformer_1.plainToInstance)(BulkUpdateLineItemsDto, request.body);
                // Validate DTO
                const errors = yield (0, class_validator_1.validate)(bulkUpdateDto);
                if (errors.length > 0) {
                    return response.status(400).json({
                        success: false,
                        errors: errors.map((error) => ({
                            property: error.property,
                            constraints: error.constraints,
                        })),
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
                const { data } = (0, class_transformer_1.plainToInstance)(CopyPastePricesDto, request.body);
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
                        const quantityPrices = [];
                        // Start from column 1 (skip item name at column 0)
                        for (let j = 1; j < row.length - 1; j += 2) {
                            const quantity = (_a = row[j]) === null || _a === void 0 ? void 0 : _a.trim();
                            const price = parseFloat(((_b = row[j + 1]) === null || _b === void 0 ? void 0 : _b.trim()) || "0");
                            if (quantity && !isNaN(price) && price > 0) {
                                quantityPrices.push({
                                    quantity,
                                    price,
                                    isActive: j === 1, // First price is active by default
                                    total: parseFloat(quantity) * price,
                                });
                            }
                        }
                        if (quantityPrices.length > 0) {
                            lineItem.quantityPrices = quantityPrices;
                            // Calculate line total from active price
                            const activePrice = quantityPrices.find((qp) => qp.isActive);
                            if (activePrice) {
                                lineItem.lineTotal = activePrice.total;
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
                const { lineItemId, priceIndex } = request.params;
                const lineItem = yield this.lineItemRepository.findOne({
                    where: { id: lineItemId },
                });
                if (!lineItem) {
                    return response.status(404).json({
                        success: false,
                        message: "Line item not found",
                    });
                }
                if (!lineItem.quantityPrices || lineItem.quantityPrices.length === 0) {
                    return response.status(400).json({
                        success: false,
                        message: "No quantity prices found",
                    });
                }
                const index = parseInt(priceIndex);
                if (isNaN(index) ||
                    index < 0 ||
                    index >= lineItem.quantityPrices.length) {
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
    // Create offer revision
    createRevision(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
                const createOfferDto = (0, class_transformer_1.plainToInstance)(CreateOfferDto, request.body);
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
    // Generate PDF for offer
    generatePdf(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
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
                    // Convert to Date object if it's a string
                    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
                    // Check if it's a valid date
                    if (!(date instanceof Date) || isNaN(date.getTime())) {
                        return "N/A";
                    }
                    return date.toLocaleDateString();
                };
                // Helper function to safely format numbers
                const formatNumber = (numValue, decimals = 2) => {
                    if (numValue === null || numValue === undefined) {
                        return `0.${"0".repeat(decimals)}`;
                    }
                    // Convert to number if it's a string
                    const num = typeof numValue === "string"
                        ? parseFloat(numValue)
                        : Number(numValue);
                    // Check if it's a valid number
                    if (isNaN(num)) {
                        return `0.${"0".repeat(decimals)}`;
                    }
                    return num.toFixed(decimals);
                };
                // Helper function to get safe number value
                const getSafeNumber = (numValue) => {
                    if (numValue === null || numValue === undefined) {
                        return 0;
                    }
                    const num = typeof numValue === "string"
                        ? parseFloat(numValue)
                        : Number(numValue);
                    return isNaN(num) ? 0 : num;
                };
                // Create PDF document
                const doc = new pdfkit_1.default({ margin: 50, size: "A4" });
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
                    if (customer.legalName)
                        doc.text(`${customer.legalName}`);
                    if (customer.address)
                        doc.text(`${customer.address}`);
                    if (customer.postalCode && customer.city)
                        doc.text(`${customer.postalCode} ${customer.city}`);
                    if (customer.country)
                        doc.text(`${customer.country}`);
                    if (customer.vatId)
                        doc.text(`VAT ID: ${customer.vatId}`);
                }
                doc.moveDown();
                // Delivery Address (if different)
                if (offer.deliveryAddress) {
                    doc.fontSize(14).text("Delivery Address:", { underline: true });
                    doc.fontSize(11);
                    const addr = offer.deliveryAddress;
                    if (addr.contactName)
                        doc.text(`${addr.contactName}`);
                    if (addr.street)
                        doc.text(`${addr.street}`);
                    if (addr.postalCode && addr.city)
                        doc.text(`${addr.postalCode} ${addr.city}`);
                    if (addr.state)
                        doc.text(`${addr.state}`);
                    if (addr.country)
                        doc.text(`${addr.country}`);
                    if (addr.contactPhone)
                        doc.text(`Phone: ${addr.contactPhone}`);
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
                    const customerItems = offer.lineItems.filter((item) => !item.isComponent);
                    customerItems.forEach((item, index) => {
                        var _a;
                        doc.text(`${index + 1}.`, itemX, y);
                        doc.text(item.itemName || "", descX, y, { width: 200 });
                        // Show quantity prices if available
                        if (item.quantityPrices && item.quantityPrices.length > 0) {
                            item.quantityPrices.forEach((qp, qpIndex) => {
                                const qpQuantity = getSafeNumber(qp.quantity);
                                const qpPrice = getSafeNumber(qp.price);
                                const priceText = `${qpQuantity} pcs: €${qpPrice.toFixed(3)}`;
                                const highlight = qp.isActive ? { color: "red" } : {};
                                doc.text(priceText, qtyX, y + qpIndex * 15, Object.assign(Object.assign({}, highlight), { width: 150 }));
                            });
                        }
                        else if (item.baseQuantity || item.basePrice) {
                            const quantity = getSafeNumber(item.baseQuantity);
                            const price = getSafeNumber(item.basePrice);
                            doc.text(quantity.toString(), qtyX, y);
                            doc.text(`€${price.toFixed(3)}`, priceX, y);
                            const total = quantity * price;
                            doc.text(`€${total.toFixed(2)}`, totalX, y);
                        }
                        else {
                            // Fallback for items without prices
                            doc.text("N/A", qtyX, y);
                            doc.text("N/A", priceX, y);
                            doc.text("N/A", totalX, y);
                        }
                        y += Math.max(30, (((_a = item.quantityPrices) === null || _a === void 0 ? void 0 : _a.length) || 1) * 20);
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
                const uploadsDir = path_1.default.join(__dirname, "../../uploads/offers");
                if (!fs_1.default.existsSync(uploadsDir)) {
                    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
                }
                const pdfPath = path_1.default.join(uploadsDir, `${offer.offerNumber}.pdf`);
                const writeStream = fs_1.default.createWriteStream(pdfPath);
                doc.pipe(writeStream);
                doc.end();
                // Wait for PDF to be written
                yield new Promise((resolve, reject) => {
                    writeStream.on("finish", resolve);
                    writeStream.on("error", reject);
                });
                // Update offer with PDF info
                offer.pdfPath = `/uploads/offers/${offer.offerNumber}.pdf`;
                offer.pdfGenerated = true;
                offer.pdfGeneratedAt = new Date();
                yield this.offerRepository.save(offer);
                return response.status(200).json({
                    success: true,
                    message: "PDF generated successfully",
                    data: {
                        pdfPath: offer.pdfPath,
                        downloadUrl: `/api/offers/${id}/download-pdf`,
                    },
                });
            }
            catch (error) {
                console.error("Error generating PDF:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    }
    // Download PDF
    downloadPdf(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
                const offer = yield this.offerRepository.findOne({
                    where: { id },
                });
                if (!offer || !offer.pdfPath) {
                    return response.status(404).json({
                        success: false,
                        message: "PDF not found",
                    });
                }
                const pdfPath = path_1.default.join(__dirname, "../..", offer.pdfPath);
                if (!fs_1.default.existsSync(pdfPath)) {
                    return response.status(404).json({
                        success: false,
                        message: "PDF file not found",
                    });
                }
                response.setHeader("Content-Type", "application/pdf");
                response.setHeader("Content-Disposition", `attachment; filename="${offer.offerNumber}.pdf"`);
                const fileStream = fs_1.default.createReadStream(pdfPath);
                fileStream.pipe(response);
            }
            catch (error) {
                console.error("Error downloading PDF:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    // Delete offer
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
}
exports.OfferController = OfferController;

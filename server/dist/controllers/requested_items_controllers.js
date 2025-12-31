"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestedItemController = void 0;
const requested_items_1 = require("../models/requested_items");
const star_business_details_1 = require("../models/star_business_details");
const contact_person_1 = require("../models/contact_person");
const database_1 = require("../config/database");
const customers_1 = require("../models/customers");
const inquiry_1 = require("../models/inquiry");
class RequestedItemController {
    constructor() {
        this.requestedItemRepository = database_1.AppDataSource.getRepository(requested_items_1.RequestedItem);
        this.businessRepository = database_1.AppDataSource.getRepository(star_business_details_1.StarBusinessDetails);
        this.contactPersonRepository = database_1.AppDataSource.getRepository(contact_person_1.ContactPerson);
        this.inquiryRepository = database_1.AppDataSource.getRepository(inquiry_1.Inquiry);
    }
    getAllRequestedItems(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = 1, limit = 10, businessId, status, priority, contactPersonId, inquiryId, minWeight, maxWeight, } = request.query;
                const queryBuilder = this.requestedItemRepository
                    .createQueryBuilder("requestedItem")
                    .leftJoinAndSelect("requestedItem.business", "starBusiness")
                    .leftJoinAndSelect("requestedItem.contactPerson", "contactPerson")
                    .leftJoinAndSelect("requestedItem.inquiry", "inquiry")
                    .orderBy("requestedItem.createdAt", "DESC");
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
                    queryBuilder.andWhere("requestedItem.contactPersonId = :contactPersonId", {
                        contactPersonId,
                    });
                }
                if (inquiryId) {
                    queryBuilder.andWhere("requestedItem.inquiry.id = :inquiryId", {
                        inquiryId,
                    });
                }
                if (minWeight) {
                    queryBuilder.andWhere("requestedItem.weight >= :minWeight", {
                        minWeight: parseFloat(minWeight),
                    });
                }
                if (maxWeight) {
                    queryBuilder.andWhere("requestedItem.weight <= :maxWeight", {
                        maxWeight: parseFloat(maxWeight),
                    });
                }
                const skip = (Number(page) - 1) * Number(limit);
                const [items, total] = yield queryBuilder
                    .skip(skip)
                    .take(Number(limit))
                    .getManyAndCount();
                const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
                const enrichedItems = yield Promise.all(items.map((item) => __awaiter(this, void 0, void 0, function* () {
                    const customer = yield customerRepository.findOne({
                        where: { starBusinessDetails: { id: item.businessId } },
                        relations: ["starBusinessDetails"],
                    });
                    return Object.assign(Object.assign({}, item), { business: Object.assign(Object.assign({}, item.business), { customer: customer
                                ? {
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
                                }
                                : null }) });
                })));
                return response.status(200).json({
                    success: true,
                    data: enrichedItems,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total,
                        pages: Math.ceil(total / Number(limit)),
                    },
                });
            }
            catch (error) {
                console.error("Error fetching requested items:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    getRequestedItemById(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
                const item = yield this.requestedItemRepository.findOne({
                    where: { id },
                    relations: ["business", "contactPerson", "inquiry"],
                });
                if (!item) {
                    return response.status(404).json({
                        success: false,
                        message: "Requested item not found",
                    });
                }
                // Get customer information for the business
                const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
                const customer = yield customerRepository.findOne({
                    where: { starBusinessDetails: { id: item.businessId } },
                });
                const enrichedItem = Object.assign(Object.assign({}, item), { business: Object.assign(Object.assign({}, item.business), { customer: customer
                            ? {
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
                            }
                            : null }) });
                return response.status(200).json({
                    success: true,
                    data: enrichedItem,
                });
            }
            catch (error) {
                console.error("Error fetching requested item:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    createRequestedItem(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { businessId, contactPersonId, extraNote, itemName, material, specification, extraItems, extraItemsDescriptions, qty, asanaLink, interval, sampleQty, expectedDelivery, priority, requestStatus, comment, 
                // New dimension fields
                weight, width, height, length, 
                // Purchase price fields
                purchasePrice, currency, 
                // Inquiry reference
                inquiryId, } = request.body;
                console.log("Received contactPersonId:", contactPersonId); // Debug log
                // Basic validation
                if (!businessId || !itemName || !qty) {
                    return response.status(400).json({
                        success: false,
                        message: "Missing required fields: businessId, itemName, and qty are required",
                    });
                }
                const business = yield this.businessRepository.findOne({
                    where: { id: businessId },
                });
                if (!business) {
                    return response.status(404).json({
                        success: false,
                        message: "Business not found",
                    });
                }
                let contactPerson = null;
                if (contactPersonId) {
                    contactPerson = yield this.contactPersonRepository.findOne({
                        where: { id: contactPersonId },
                    });
                    if (!contactPerson) {
                        return response.status(404).json({
                            success: false,
                            message: "Contact person not found",
                        });
                    }
                }
                let inquiry = null;
                if (inquiryId) {
                    inquiry = yield this.inquiryRepository.findOne({
                        where: { id: inquiryId },
                    });
                    if (!inquiry) {
                        return response.status(404).json({
                            success: false,
                            message: "Inquiry not found",
                        });
                    }
                }
                const requestedItem = this.requestedItemRepository.create({
                    business: business,
                    contactPerson: contactPerson,
                    contactPersonId: contactPersonId || null,
                    inquiry: inquiry,
                    itemName,
                    material,
                    asanaLink,
                    extraNote,
                    specification,
                    extraItems: extraItems || "NO",
                    extraItemsDescriptions,
                    qty,
                    interval: interval || "Monatlich",
                    sampleQty,
                    expectedDelivery,
                    priority: priority || "Normal",
                    requestStatus: requestStatus || "Open",
                    comment,
                    // Dimension fields
                    weight,
                    width,
                    height,
                    length,
                    // Purchase price fields
                    purchasePrice,
                    currency: currency || "RMB",
                });
                const savedItem = yield this.requestedItemRepository.save(requestedItem);
                const itemWithRelations = yield this.requestedItemRepository.findOne({
                    where: { id: savedItem.id },
                    relations: ["business", "contactPerson", "inquiry"],
                });
                return response.status(201).json({
                    success: true,
                    message: "Requested item created successfully",
                    data: itemWithRelations,
                });
            }
            catch (error) {
                console.error("Error creating requested item:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    updateRequestedItem(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
                const { contactPersonId, itemName, material, specification, extraItems, extraNote, extraItemsDescriptions, qty, asanaLink, interval, sampleQty, expectedDelivery, priority, requestStatus, comment, 
                // New dimension fields
                weight, width, height, length, 
                // Purchase price fields
                purchasePrice, currency, 
                // Inquiry reference
                inquiryId, } = request.body;
                const existingItem = yield this.requestedItemRepository.findOne({
                    where: { id },
                    relations: ["business", "contactPerson", "inquiry"],
                });
                if (!existingItem) {
                    return response.status(404).json({
                        success: false,
                        message: "Requested item not found",
                    });
                }
                let contactPerson = null;
                if (contactPersonId !== undefined) {
                    if (contactPersonId) {
                        contactPerson = yield this.contactPersonRepository.findOne({
                            where: { id: contactPersonId },
                        });
                        if (!contactPerson) {
                            return response.status(404).json({
                                success: false,
                                message: "Contact person not found",
                            });
                        }
                    }
                    else {
                        // If contactPersonId is explicitly set to null/empty, clear the relation
                        contactPerson = null;
                    }
                }
                let inquiry = null;
                if (inquiryId !== undefined) {
                    if (inquiryId) {
                        inquiry = yield this.inquiryRepository.findOne({
                            where: { id: inquiryId },
                        });
                        if (!inquiry) {
                            return response.status(404).json({
                                success: false,
                                message: "Inquiry not found",
                            });
                        }
                    }
                    else {
                        // If inquiryId is explicitly set to null/empty, clear the relation
                        inquiry = null;
                    }
                }
                const updateData = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (itemName && { itemName })), (extraNote !== undefined && { extraNote })), (asanaLink !== undefined && { asanaLink })), (material !== undefined && { material })), (specification !== undefined && { specification })), (extraItems && { extraItems })), (extraItemsDescriptions !== undefined && { extraItemsDescriptions })), (qty && { qty })), (interval && { interval })), (sampleQty !== undefined && { sampleQty })), (expectedDelivery !== undefined && { expectedDelivery })), (priority && { priority })), (requestStatus && { requestStatus })), (comment !== undefined && { comment })), (weight !== undefined && { weight })), (width !== undefined && { width })), (height !== undefined && { height })), (length !== undefined && { length })), (purchasePrice !== undefined && { purchasePrice })), (currency && { currency }));
                if (contactPerson !== undefined) {
                    updateData.contactPerson = contactPerson;
                    updateData.contactPersonId = contactPerson ? contactPerson.id : null;
                }
                if (inquiry !== undefined) {
                    updateData.inquiry = inquiry;
                }
                yield this.requestedItemRepository.update(id, updateData);
                const updatedItem = yield this.requestedItemRepository.findOne({
                    where: { id },
                    relations: ["business", "contactPerson", "inquiry"],
                });
                return response.status(200).json({
                    success: true,
                    message: "Requested item updated successfully",
                    data: updatedItem,
                });
            }
            catch (error) {
                console.error("Error updating requested item:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    deleteRequestedItem(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
                const item = yield this.requestedItemRepository.findOne({
                    where: { id },
                });
                if (!item) {
                    return response.status(404).json({
                        success: false,
                        message: "Requested item not found",
                    });
                }
                yield this.requestedItemRepository.remove(item);
                return response.status(200).json({
                    success: true,
                    message: "Requested item deleted successfully",
                });
            }
            catch (error) {
                console.error("Error deleting requested item:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    getRequestedItemsByBusiness(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { businessId } = request.params;
                const { page = 1, limit = 10, status, priority, minWeight, maxWeight, hasDimensions, } = request.query;
                const business = yield this.businessRepository.findOne({
                    where: { id: businessId },
                });
                if (!business) {
                    return response.status(404).json({
                        success: false,
                        message: "Business not found",
                    });
                }
                const queryBuilder = this.requestedItemRepository
                    .createQueryBuilder("requestedItem")
                    .leftJoinAndSelect("requestedItem.business", "business")
                    .leftJoinAndSelect("requestedItem.contactPerson", "contactPerson")
                    .leftJoinAndSelect("requestedItem.inquiry", "inquiry")
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
                    queryBuilder.andWhere("requestedItem.weight >= :minWeight", {
                        minWeight: parseFloat(minWeight),
                    });
                }
                if (maxWeight) {
                    queryBuilder.andWhere("requestedItem.weight <= :maxWeight", {
                        maxWeight: parseFloat(maxWeight),
                    });
                }
                if (hasDimensions === "true") {
                    queryBuilder.andWhere("(requestedItem.weight IS NOT NULL OR requestedItem.width IS NOT NULL OR requestedItem.height IS NOT NULL OR requestedItem.length IS NOT NULL)");
                }
                else if (hasDimensions === "false") {
                    queryBuilder.andWhere("(requestedItem.weight IS NULL AND requestedItem.width IS NULL AND requestedItem.height IS NULL AND requestedItem.length IS NULL)");
                }
                const skip = (Number(page) - 1) * Number(limit);
                const [items, total] = yield queryBuilder
                    .skip(skip)
                    .take(Number(limit))
                    .getManyAndCount();
                return response.status(200).json({
                    success: true,
                    data: items,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total,
                        pages: Math.ceil(total / Number(limit)),
                    },
                });
            }
            catch (error) {
                console.error("Error fetching requested items by business:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    getRequestedItemsByInquiry(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { inquiryId } = request.params;
                const { page = 1, limit = 10, status, priority } = request.query;
                const inquiry = yield this.inquiryRepository.findOne({
                    where: { id: inquiryId },
                });
                if (!inquiry) {
                    return response.status(404).json({
                        success: false,
                        message: "Inquiry not found",
                    });
                }
                const queryBuilder = this.requestedItemRepository
                    .createQueryBuilder("requestedItem")
                    .leftJoinAndSelect("requestedItem.business", "business")
                    .leftJoinAndSelect("requestedItem.contactPerson", "contactPerson")
                    .leftJoinAndSelect("requestedItem.inquiry", "inquiry")
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
                const [items, total] = yield queryBuilder
                    .skip(skip)
                    .take(Number(limit))
                    .getManyAndCount();
                return response.status(200).json({
                    success: true,
                    data: items,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total,
                        pages: Math.ceil(total / Number(limit)),
                    },
                });
            }
            catch (error) {
                console.error("Error fetching requested items by inquiry:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    // New method: Calculate volume for a requested item
    calculateItemVolume(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
                const item = yield this.requestedItemRepository.findOne({
                    where: { id },
                });
                if (!item) {
                    return response.status(404).json({
                        success: false,
                        message: "Requested item not found",
                    });
                }
                let volume = null;
                let volumeMessage = "Cannot calculate volume";
                if (item.length && item.width && item.height) {
                    volume =
                        parseFloat(item.length.toString()) *
                            parseFloat(item.width.toString()) *
                            parseFloat(item.height.toString());
                    volumeMessage = `Volume calculated: ${volume.toFixed(3)} cubic units`;
                }
                else {
                    volumeMessage = "Missing dimension data (length, width, or height)";
                }
                return response.status(200).json({
                    success: true,
                    data: {
                        itemId: item.id,
                        itemName: item.itemName,
                        dimensions: {
                            length: item.length,
                            width: item.width,
                            height: item.height,
                        },
                        volume,
                        message: volumeMessage,
                    },
                });
            }
            catch (error) {
                console.error("Error calculating item volume:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    // New method: Update multiple requested items with dimensions
    bulkUpdateDimensions(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { items } = request.body;
                if (!Array.isArray(items) || items.length === 0) {
                    return response.status(400).json({
                        success: false,
                        message: "Items array is required and cannot be empty",
                    });
                }
                const results = [];
                const errors = [];
                for (const itemData of items) {
                    const { id, weight, width, height, length } = itemData;
                    if (!id) {
                        errors.push({ itemData, error: "Missing item ID" });
                        continue;
                    }
                    try {
                        const item = yield this.requestedItemRepository.findOne({
                            where: { id },
                        });
                        if (!item) {
                            errors.push({ id, error: "Item not found" });
                            continue;
                        }
                        const updateData = {};
                        if (weight !== undefined)
                            updateData.weight = weight;
                        if (width !== undefined)
                            updateData.width = width;
                        if (height !== undefined)
                            updateData.height = height;
                        if (length !== undefined)
                            updateData.length = length;
                        yield this.requestedItemRepository.update(id, updateData);
                        const updatedItem = yield this.requestedItemRepository.findOne({
                            where: { id },
                        });
                        results.push({
                            id,
                            success: true,
                            data: updatedItem,
                        });
                    }
                    catch (error) {
                        errors.push({
                            id,
                            error: error instanceof Error ? error.message : "Unknown error",
                        });
                    }
                }
                return response.status(200).json({
                    success: true,
                    message: `Updated ${results.length} items successfully`,
                    data: {
                        updated: results,
                        errors: errors.length > 0 ? errors : undefined,
                    },
                });
            }
            catch (error) {
                console.error("Error in bulk update dimensions:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    // New method: Get items with missing dimensions
    getItemsWithMissingDimensions(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = 1, limit = 10, businessId } = request.query;
                const queryBuilder = this.requestedItemRepository
                    .createQueryBuilder("requestedItem")
                    .leftJoinAndSelect("requestedItem.business", "business")
                    .leftJoinAndSelect("requestedItem.contactPerson", "contactPerson")
                    .where("(requestedItem.weight IS NULL OR requestedItem.width IS NULL OR requestedItem.height IS NULL OR requestedItem.length IS NULL)")
                    .orderBy("requestedItem.createdAt", "DESC");
                if (businessId) {
                    queryBuilder.andWhere("requestedItem.businessId = :businessId", {
                        businessId,
                    });
                }
                const skip = (Number(page) - 1) * Number(limit);
                const [items, total] = yield queryBuilder
                    .skip(skip)
                    .take(Number(limit))
                    .getManyAndCount();
                return response.status(200).json({
                    success: true,
                    data: items,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total,
                        pages: Math.ceil(total / Number(limit)),
                    },
                    summary: {
                        totalMissingDimensionItems: total,
                        message: "Items with missing dimension data",
                    },
                });
            }
            catch (error) {
                console.error("Error fetching items with missing dimensions:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
}
exports.RequestedItemController = RequestedItemController;

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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InquiryController = exports.ItemGenerator = exports.ConvertRequestToItemDto = exports.ConvertInquiryToItemDto = exports.BaseItemConversionDto = void 0;
const inquiry_1 = require("../models/inquiry");
const customers_1 = require("../models/customers");
const contact_person_1 = require("../models/contact_person");
const database_1 = require("../config/database");
const requested_items_1 = require("../models/requested_items");
const tarics_1 = require("../models/tarics");
const items_1 = require("../models/items");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
// Alternative: Simplified DTOs
const class_validator_2 = require("class-validator");
const class_transformer_2 = require("class-transformer");
class BaseItemConversionDto {
}
exports.BaseItemConversionDto = BaseItemConversionDto;
__decorate([
    (0, class_validator_2.IsOptional)(),
    (0, class_transformer_2.Type)(() => Number),
    __metadata("design:type", Number)
], BaseItemConversionDto.prototype, "taricId", void 0);
__decorate([
    (0, class_validator_2.IsOptional)(),
    (0, class_transformer_2.Type)(() => Number),
    __metadata("design:type", Number)
], BaseItemConversionDto.prototype, "catId", void 0);
__decorate([
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_2.IsString)(),
    __metadata("design:type", String)
], BaseItemConversionDto.prototype, "model", void 0);
__decorate([
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_2.IsString)(),
    __metadata("design:type", String)
], BaseItemConversionDto.prototype, "suppCat", void 0);
__decorate([
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_2.IsNumber)(),
    (0, class_validator_2.Min)(0),
    (0, class_transformer_2.Type)(() => Number),
    __metadata("design:type", Number)
], BaseItemConversionDto.prototype, "weight", void 0);
__decorate([
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_2.IsNumber)(),
    (0, class_validator_2.Min)(0),
    (0, class_transformer_2.Type)(() => Number),
    __metadata("design:type", Number)
], BaseItemConversionDto.prototype, "width", void 0);
__decorate([
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_2.IsNumber)(),
    (0, class_validator_2.Min)(0),
    (0, class_transformer_2.Type)(() => Number),
    __metadata("design:type", Number)
], BaseItemConversionDto.prototype, "height", void 0);
__decorate([
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_2.IsNumber)(),
    (0, class_validator_2.Min)(0),
    (0, class_transformer_2.Type)(() => Number),
    __metadata("design:type", Number)
], BaseItemConversionDto.prototype, "length", void 0);
__decorate([
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_2.IsString)(),
    __metadata("design:type", String)
], BaseItemConversionDto.prototype, "itemNameCN", void 0);
__decorate([
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_2.IsNumber)(),
    (0, class_validator_2.Min)(0),
    (0, class_transformer_2.Type)(() => Number),
    __metadata("design:type", Number)
], BaseItemConversionDto.prototype, "FOQ", void 0);
__decorate([
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_2.IsNumber)(),
    (0, class_validator_2.Min)(0),
    (0, class_transformer_2.Type)(() => Number),
    __metadata("design:type", Number)
], BaseItemConversionDto.prototype, "FSQ", void 0);
__decorate([
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_2.IsString)(),
    __metadata("design:type", String)
], BaseItemConversionDto.prototype, "remark", void 0);
__decorate([
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_2.IsNumber)(),
    (0, class_validator_2.Min)(0),
    (0, class_transformer_2.Type)(() => Number),
    __metadata("design:type", Number)
], BaseItemConversionDto.prototype, "RMBPrice", void 0);
__decorate([
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_2.IsString)(),
    __metadata("design:type", String)
], BaseItemConversionDto.prototype, "note", void 0);
class ConvertInquiryToItemDto extends BaseItemConversionDto {
}
exports.ConvertInquiryToItemDto = ConvertInquiryToItemDto;
class ConvertRequestToItemDto extends BaseItemConversionDto {
}
exports.ConvertRequestToItemDto = ConvertRequestToItemDto;
__decorate([
    (0, class_validator_2.IsOptional)(),
    (0, class_validator_2.IsString)(),
    __metadata("design:type", String)
], ConvertRequestToItemDto.prototype, "extraItemsDescriptions", void 0);
class ItemGenerator {
    static generateTaricCode() {
        return __awaiter(this, void 0, void 0, function* () {
            const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
            const highestTaric = yield taricRepository
                .createQueryBuilder("taric")
                .select("MAX(CAST(taric.code AS UNSIGNED))", "maxCode")
                .where("taric.code REGEXP :regex", { regex: "^[0-9]+$" })
                .getRawOne();
            let nextCode = 1;
            if (highestTaric === null || highestTaric === void 0 ? void 0 : highestTaric.maxCode) {
                nextCode = parseInt(highestTaric.maxCode) + 1;
            }
            return nextCode.toString().padStart(11, "0");
        });
    }
    static generateItemId() {
        return __awaiter(this, void 0, void 0, function* () {
            const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
            const highestItem = yield itemRepository
                .createQueryBuilder("item")
                .select("MAX(item.id)", "maxId")
                .getRawOne();
            return ((highestItem === null || highestItem === void 0 ? void 0 : highestItem.maxId) || 0) + 1;
        });
    }
    static generateEAN(itemId) {
        const prefix = 789;
        const timestamp = Date.now() % 1000000;
        const baseNumber = parseInt(`${itemId.toString().padStart(6, "0")}${timestamp
            .toString()
            .padStart(6, "0")}`.slice(0, 9));
        const eanWithoutCheck = `${prefix}${baseNumber
            .toString()
            .padStart(9, "0")}`;
        const checkDigit = this.calculateEANCheckDigit(eanWithoutCheck);
        return parseInt(`${eanWithoutCheck}${checkDigit}`);
    }
    static calculateEANCheckDigit(code) {
        let sum = 0;
        for (let i = 0; i < code.length; i++) {
            const digit = parseInt(code[i]);
            sum += i % 2 === 0 ? digit * 1 : digit * 3;
        }
        const remainder = sum % 10;
        return remainder === 0 ? 0 : 10 - remainder;
    }
    static createTaricForItem(itemName) {
        return __awaiter(this, void 0, void 0, function* () {
            const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
            const highestTaricId = yield taricRepository
                .createQueryBuilder("taric")
                .select("MAX(taric.id)", "maxId")
                .getRawOne();
            const newTaricId = ((highestTaricId === null || highestTaricId === void 0 ? void 0 : highestTaricId.maxId) || 0) + 1;
            const taricCode = yield this.generateTaricCode();
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
            return yield taricRepository.save(taric);
        });
    }
}
exports.ItemGenerator = ItemGenerator;
class InquiryController {
    constructor() {
        this.inquiryRepository = database_1.AppDataSource.getRepository(inquiry_1.Inquiry);
        this.requestRepository = database_1.AppDataSource.getRepository(requested_items_1.RequestedItem);
        this.customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        this.contactPersonRepository = database_1.AppDataSource.getRepository(contact_person_1.ContactPerson);
    }
    getAllInquiries(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = 1, limit = 10, customerId, status, priority, contactPersonId, isAssembly, } = request.query;
                const queryBuilder = this.inquiryRepository
                    .createQueryBuilder("inquiry")
                    .leftJoinAndSelect("inquiry.customer", "customer")
                    .leftJoinAndSelect("inquiry.contactPerson", "contactPerson")
                    .leftJoinAndSelect("inquiry.requests", "requests")
                    .leftJoinAndSelect("requests.business", "business")
                    .leftJoinAndSelect("business.customer", "businessCustomer", "businessCustomer.id = business.customerId")
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
                const [inquiries, total] = yield queryBuilder
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
            }
            catch (error) {
                console.error("Error fetching inquiries:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    getInquiryById(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
                const inquiry = yield this.inquiryRepository.findOne({
                    where: { id },
                    relations: ["customer", "contactPerson", "requests"],
                });
                if (!inquiry) {
                    return response.status(404).json({
                        success: false,
                        message: "Inquiry not found",
                    });
                }
                return response.status(200).json({
                    success: true,
                    data: inquiry,
                });
            }
            catch (error) {
                console.error("Error fetching inquiry:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    createInquiry(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, description, image, isAssembly, customerId, isEstimated, contactPersonId, status, priority, referenceNumber, requiredByDate, internalNotes, termsConditions, projectLink, assemblyInstructions, 
                // New dimension fields
                weight, width, height, length, 
                // New shipping fields
                isFragile, requiresSpecialHandling, handlingInstructions, numberOfPackages, packageType, 
                // Purchase price fields
                purchasePrice, purchasePriceCurrency, requests, } = request.body;
                // Basic validation
                if (!name || !customerId) {
                    return response.status(400).json({
                        success: false,
                        message: "Missing required fields: name and customerId are required",
                    });
                }
                const customer = yield this.customerRepository.findOne({
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
                // Create inquiry with all fields including dimensions
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
                    assemblyInstructions,
                    // Dimension fields
                    weight,
                    width,
                    height,
                    length,
                    isEstimated,
                    // Shipping fields
                    isFragile: isFragile || false,
                    requiresSpecialHandling: requiresSpecialHandling || false,
                    handlingInstructions,
                    numberOfPackages,
                    packageType,
                    // Purchase price fields
                    purchasePrice,
                    purchasePriceCurrency,
                });
                // Save inquiry first to get ID
                const savedInquiry = yield this.inquiryRepository.save(inquiry);
                // Create and save requests if provided
                if (requests && Array.isArray(requests) && requests.length > 0) {
                    const requestEntities = requests.map((reqData) => {
                        // Calculate total weight if unit weight and quantity are provided
                        let totalWeight = null;
                        if (reqData.unitWeight && reqData.quantity) {
                            totalWeight =
                                parseFloat(reqData.unitWeight) * parseFloat(reqData.quantity);
                        }
                        const requestItem = this.requestRepository.create(Object.assign(Object.assign({}, reqData), { businessId: customer.starBusinessDetails.id, businessDetails: customer.starBusinessDetails, inquiry: savedInquiry, qty: reqData.quantity, 
                            // Calculate total weight for requested item
                            totalWeight: totalWeight || reqData.totalWeight }));
                        return requestItem;
                    });
                    yield this.requestRepository.save(requestEntities);
                }
                // Fetch complete inquiry with relations
                const completeInquiry = yield this.inquiryRepository.findOne({
                    where: { id: savedInquiry.id },
                    relations: ["customer", "contactPerson", "requests"],
                });
                return response.status(201).json({
                    success: true,
                    message: "Inquiry created successfully",
                    data: completeInquiry,
                });
            }
            catch (error) {
                console.error("Error creating inquiry:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    updateInquiry(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = request.params;
                const { name, description, image, isAssembly, contactPersonId, status, priority, referenceNumber, isEstimated, requiredByDate, internalNotes, termsConditions, projectLink, assemblyInstructions, 
                // New dimension fields
                weight, width, height, length, 
                // New shipping fields
                isFragile, requiresSpecialHandling, handlingInstructions, numberOfPackages, packageType, 
                // Purchase price fields
                purchasePrice, purchasePriceCurrency, requests, } = request.body;
                const existingInquiry = yield this.inquiryRepository.findOne({
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
                // Update data including all new fields
                const updateData = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (name && { name })), (description !== undefined && { description })), (image !== undefined && { image })), (isAssembly !== undefined && { isAssembly })), (status !== undefined && { status })), (priority !== undefined && { priority })), (referenceNumber !== undefined && { referenceNumber })), (requiredByDate !== undefined && { requiredByDate })), (internalNotes !== undefined && { internalNotes })), (termsConditions !== undefined && { termsConditions })), (projectLink !== undefined && { projectLink })), (assemblyInstructions !== undefined && { assemblyInstructions })), (isEstimated !== undefined && { isEstimated })), (weight !== undefined && { weight })), (width !== undefined && { width })), (height !== undefined && { height })), (length !== undefined && { length })), (isFragile !== undefined && { isFragile })), (requiresSpecialHandling !== undefined && {
                    requiresSpecialHandling,
                })), (handlingInstructions !== undefined && { handlingInstructions })), (numberOfPackages !== undefined && { numberOfPackages })), (packageType !== undefined && { packageType })), (purchasePrice !== undefined && { purchasePrice })), (purchasePriceCurrency !== undefined && { purchasePriceCurrency }));
                if (contactPerson !== undefined) {
                    updateData.contactPerson = contactPerson;
                }
                // Apply the update
                yield this.inquiryRepository.update(id, updateData);
                // Handle requests update if provided
                if (requests && Array.isArray(requests)) {
                    // First, remove existing requests
                    if (existingInquiry.requests && existingInquiry.requests.length > 0) {
                        yield this.requestRepository.remove(existingInquiry.requests);
                    }
                    // Then create new requests with proper business details
                    if (requests.length > 0 &&
                        ((_a = existingInquiry.customer) === null || _a === void 0 ? void 0 : _a.starBusinessDetails)) {
                        const requestEntities = requests.map((reqData) => {
                            // Calculate total weight if unit weight and quantity are provided
                            let totalWeight = null;
                            if (reqData.unitWeight && reqData.quantity) {
                                totalWeight =
                                    parseFloat(reqData.unitWeight) * parseFloat(reqData.quantity);
                            }
                            const requestItem = this.requestRepository.create(Object.assign(Object.assign({}, reqData), { businessId: existingInquiry.customer.starBusinessDetails.id, businessDetails: existingInquiry.customer.starBusinessDetails, inquiry: existingInquiry, qty: reqData.quantity, 
                                // Calculate total weight for requested item
                                totalWeight: totalWeight || reqData.totalWeight }));
                            return requestItem;
                        });
                        yield this.requestRepository.save(requestEntities);
                    }
                }
                // Handle status synchronization logic
                if (status && status !== existingInquiry.status) {
                    // Get updated inquiry with requests
                    const updatedInquiry = yield this.inquiryRepository.findOne({
                        where: { id },
                        relations: ["requests"],
                    });
                    // If inquiry is NOT an assembly, update all request statuses
                    if (updatedInquiry &&
                        !updatedInquiry.isAssembly &&
                        updatedInquiry.requests &&
                        updatedInquiry.requests.length > 0) {
                        yield Promise.all(updatedInquiry.requests.map((requestItem) => __awaiter(this, void 0, void 0, function* () {
                            yield this.requestRepository.update(requestItem.id, {
                                status: status,
                            });
                        })));
                    }
                    // If inquiry IS an assembly, don't update request statuses
                    // (they remain independent)
                }
                const updatedInquiry = yield this.inquiryRepository.findOne({
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
            }
            catch (error) {
                console.error("Error updating inquiry:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    deleteInquiry(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
                const inquiry = yield this.inquiryRepository.findOne({
                    where: { id },
                });
                if (!inquiry) {
                    return response.status(404).json({
                        success: false,
                        message: "Inquiry not found",
                    });
                }
                yield this.inquiryRepository.remove(inquiry);
                return response.status(200).json({
                    success: true,
                    message: "Inquiry deleted successfully",
                });
            }
            catch (error) {
                console.error("Error deleting inquiry:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    getInquiriesByCustomer(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { customerId } = request.params;
                const { page = 1, limit = 10, status, isAssembly } = request.query;
                const customer = yield this.customerRepository.findOne({
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
                const [inquiries, total] = yield queryBuilder
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
            }
            catch (error) {
                console.error("Error fetching inquiries by customer:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    addRequestToInquiry(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
                const requestData = request.body;
                const inquiry = yield this.inquiryRepository.findOne({
                    where: { id },
                });
                if (!inquiry) {
                    return response.status(404).json({
                        success: false,
                        message: "Inquiry not found",
                    });
                }
                // Calculate total weight if unit weight and quantity are provided
                let totalWeight = null;
                if (requestData.unitWeight && requestData.quantity) {
                    totalWeight =
                        parseFloat(requestData.unitWeight) * parseFloat(requestData.quantity);
                }
                const requestItem = this.requestRepository.create(Object.assign(Object.assign({}, requestData), { inquiry, qty: requestData.quantity, totalWeight: totalWeight || requestData.totalWeight }));
                const savedRequest = yield this.requestRepository.save(requestItem);
                // Update inquiry status based on first request if not already set
                if (inquiry.status === "Draft") {
                    inquiry.status = savedRequest.status || "Draft";
                    yield this.inquiryRepository.save(inquiry);
                }
                return response.status(201).json({
                    success: true,
                    message: "Request added to inquiry successfully",
                    data: savedRequest,
                });
            }
            catch (error) {
                console.error("Error adding request to inquiry:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    updateRequestInInquiry(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id, requestId } = request.params;
                const requestData = request.body;
                const inquiry = yield this.inquiryRepository.findOne({
                    where: { id },
                });
                if (!inquiry) {
                    return response.status(404).json({
                        success: false,
                        message: "Inquiry not found",
                    });
                }
                const existingRequest = yield this.requestRepository.findOne({
                    where: { id: requestId, inquiry: { id } },
                });
                if (!existingRequest) {
                    return response.status(404).json({
                        success: false,
                        message: "Request not found in this inquiry",
                    });
                }
                // Calculate total weight if unit weight and quantity are provided
                if (requestData.unitWeight && requestData.quantity) {
                    requestData.totalWeight =
                        parseFloat(requestData.unitWeight) * parseFloat(requestData.quantity);
                }
                // Map quantity to qty if provided
                if (requestData.quantity !== undefined) {
                    requestData.qty = requestData.quantity;
                }
                yield this.requestRepository.update(requestId, requestData);
                const updatedRequest = yield this.requestRepository.findOne({
                    where: { id: requestId },
                });
                return response.status(200).json({
                    success: true,
                    message: "Request updated successfully",
                    data: updatedRequest,
                });
            }
            catch (error) {
                console.error("Error updating request in inquiry:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    convertInquiryToItem(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const { inquiryId } = request.params;
                const conversionData = (0, class_transformer_1.plainToInstance)(ConvertInquiryToItemDto, request.body);
                // Validate conversion data
                const errors = yield (0, class_validator_1.validate)(conversionData);
                if (errors.length > 0) {
                    return response.status(400).json({
                        success: false,
                        errors: errors.map((error) => ({
                            property: error.property,
                            constraints: error.constraints,
                        })),
                    });
                }
                const inquiryRepository = database_1.AppDataSource.getRepository(inquiry_1.Inquiry);
                const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
                const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
                // Find the inquiry
                const inquiry = yield inquiryRepository.findOne({
                    where: { id: inquiryId },
                    relations: ["requests"],
                });
                if (!inquiry) {
                    return response.status(404).json({
                        success: false,
                        message: "Inquiry not found",
                    });
                }
                // Generate new item ID and EAN
                const itemId = yield ItemGenerator.generateItemId();
                const ean = ItemGenerator.generateEAN(itemId);
                let taric = null;
                if (conversionData.taricId) {
                    // Try to find existing TARIC by ID
                    taric = yield taricRepository.findOne({
                        where: { id: conversionData.taricId },
                    });
                    if (!taric) {
                        // If TARIC ID is provided but not found, create a new one with the provided ID
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
                        yield taricRepository.save(taric);
                    }
                }
                if (!taric) {
                    // Create new TARIC with auto-generated ID
                    taric = yield ItemGenerator.createTaricForItem(inquiry.name);
                }
                // Prepare item data based on inquiry type
                let itemData = {
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
                    // For assembly inquiries: Use inquiry fields directly
                    itemData = Object.assign(Object.assign({}, itemData), { item_name: inquiry.name, item_name_cn: conversionData.itemNameCN || inquiry.description, photo: inquiry.image, remark: conversionData.remark || inquiry.description, note: conversionData.note || inquiry.internalNotes, 
                        // Use dimension fields from inquiry or conversion data
                        weight: conversionData.weight || inquiry.weight, width: conversionData.width || inquiry.width, height: conversionData.height || inquiry.height, length: conversionData.length || inquiry.length, isEstimated: inquiry.isEstimated, 
                        // Parse quantity from first requested item if exists
                        FOQ: conversionData.FOQ ||
                            (((_b = (_a = inquiry.requests) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.qty)
                                ? parseInt(inquiry.requests[0].qty) || 0
                                : 0), 
                        // Use purchase price if available
                        RMB_Price: conversionData.RMBPrice || inquiry.purchasePrice || 0 });
                }
                else {
                    // For non-assembly: Use inquiry fields where available, body fields for others
                    itemData = Object.assign(Object.assign({}, itemData), { item_name: inquiry.name, item_name_cn: conversionData.itemNameCN || inquiry.description, photo: inquiry.image, model: conversionData.model, supp_cat: conversionData.suppCat, 
                        // Use dimension fields from inquiry or conversion data
                        isEstimated: inquiry.isEstimated, weight: conversionData.weight || inquiry.weight, width: conversionData.width || inquiry.width, height: conversionData.height || inquiry.height, length: conversionData.length || inquiry.length, FOQ: conversionData.FOQ ||
                            (((_d = (_c = inquiry.requests) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.qty)
                                ? parseInt(inquiry.requests[0].qty) || 0
                                : 0), FSQ: conversionData.FSQ, remark: conversionData.remark || inquiry.description, note: conversionData.note || inquiry.internalNotes, RMB_Price: conversionData.RMBPrice || inquiry.purchasePrice || 0 });
                }
                // Create and save the item
                const item = itemRepository.create(itemData);
                const savedItem = yield itemRepository.save(item);
                // Update inquiry status to "Quoted" or similar
                inquiry.status = "Quoted";
                yield inquiryRepository.save(inquiry);
                return response.status(201).json({
                    success: true,
                    message: "Item created successfully from inquiry",
                    data: {
                        item: savedItem,
                        taric: taric,
                    },
                });
            }
            catch (error) {
                console.error("Error converting inquiry to item:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    }
    convertRequestToItem(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { requestId } = request.params;
                const conversionData = (0, class_transformer_1.plainToInstance)(ConvertRequestToItemDto, request.body);
                // Validate conversion data
                const errors = yield (0, class_validator_1.validate)(conversionData);
                if (errors.length > 0) {
                    return response.status(400).json({
                        success: false,
                        errors: errors.map((error) => ({
                            property: error.property,
                            constraints: error.constraints,
                        })),
                    });
                }
                const requestedItemRepository = database_1.AppDataSource.getRepository(requested_items_1.RequestedItem);
                const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
                const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
                const inquiryRepository = database_1.AppDataSource.getRepository(inquiry_1.Inquiry);
                // Find the requested item
                const requestedItem = yield requestedItemRepository.findOne({
                    where: { id: requestId },
                    relations: ["inquiry", "business"],
                });
                if (!requestedItem) {
                    return response.status(404).json({
                        success: false,
                        message: "Requested item not found",
                    });
                }
                const itemId = yield ItemGenerator.generateItemId();
                const ean = ItemGenerator.generateEAN(itemId);
                let taric = null;
                if (conversionData.taricId) {
                    taric = yield taricRepository.findOne({
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
                        yield taricRepository.save(taric);
                    }
                }
                if (!taric) {
                    // Create new TARIC with auto-generated ID
                    taric = yield ItemGenerator.createTaricForItem(requestedItem.itemName);
                }
                const itemData = {
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
                    FOQ: conversionData.FOQ ||
                        (requestedItem.qty ? parseInt(requestedItem.qty) || 0 : 0),
                    FSQ: conversionData.FSQ ||
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
                const savedItem = yield itemRepository.save(item);
                requestedItem.requestStatus = "Converted to Item";
                yield requestedItemRepository.save(requestedItem);
                if (requestedItem.inquiry) {
                    const inquiry = yield inquiryRepository.findOne({
                        where: { id: requestedItem.inquiry.id },
                        relations: ["requests"],
                    });
                    if (inquiry) {
                        const allConverted = inquiry.requests.every((req) => req.requestStatus === "Converted to Item");
                        if (allConverted) {
                            inquiry.status = "Quoted";
                            yield inquiryRepository.save(inquiry);
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
            }
            catch (error) {
                console.error("Error converting requested item to item:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    }
    removeRequestFromInquiry(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id, requestId } = request.params;
                const inquiry = yield this.inquiryRepository.findOne({
                    where: { id },
                });
                if (!inquiry) {
                    return response.status(404).json({
                        success: false,
                        message: "Inquiry not found",
                    });
                }
                const existingRequest = yield this.requestRepository.findOne({
                    where: { id: requestId, inquiry: { id } },
                });
                if (!existingRequest) {
                    return response.status(404).json({
                        success: false,
                        message: "Request not found in this inquiry",
                    });
                }
                yield this.requestRepository.remove(existingRequest);
                return response.status(200).json({
                    success: true,
                    message: "Request removed from inquiry successfully",
                });
            }
            catch (error) {
                console.error("Error removing request from inquiry:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    // New method to calculate total dimensions for an inquiry
    calculateInquiryDimensions(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
                const inquiry = yield this.inquiryRepository.findOne({
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
                    inquiry.requests.forEach((req) => {
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
                            const volume = parseFloat(req.length.toString()) *
                                parseFloat(req.width.toString()) *
                                parseFloat(req.height.toString());
                            totalVolume += volume;
                        }
                    });
                }
                // Update inquiry with calculated dimensions
                inquiry.weight = totalWeight > 0 ? totalWeight : inquiry.weight;
                inquiry.length = maxLength > 0 ? maxLength : inquiry.length;
                inquiry.width = maxWidth > 0 ? maxWidth : inquiry.width;
                inquiry.height = maxHeight > 0 ? maxHeight : inquiry.height;
                yield this.inquiryRepository.save(inquiry);
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
            }
            catch (error) {
                console.error("Error calculating inquiry dimensions:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
}
exports.InquiryController = InquiryController;

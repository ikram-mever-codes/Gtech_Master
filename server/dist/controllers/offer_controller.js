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
exports.OfferController = exports.CreateLineItemDto = exports.CreateOfferFromCustomerDto = exports.CreateOfferFromItemDto = exports.PasteMatrixDto = exports.BulkUpdateLineItemsDto = exports.UpdateLineItemDto = exports.UpdateOfferDto = exports.CreateOfferDto = exports.PriceMatrixEntryDto = void 0;
const database_1 = require("../config/database");
const offer_1 = require("../models/offer");
const inquiry_1 = require("../models/inquiry");
const requested_items_1 = require("../models/requested_items");
const customers_1 = require("../models/customers");
const decimal_1 = require("../utils/decimal");
const getValidator = () => {
    try {
        return require("class-validator");
    }
    catch (_a) {
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
        return {
            createCanvas: () => ({ width: 0, height: 0, getContext: () => ({}) }),
        };
    }
};
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
const gtech_fonts_1 = require("../utils/gtech_fonts");
// @ts-ignore
const svg_to_pdfkit_1 = __importDefault(require("svg-to-pdfkit"));
const gtechDocumentTemplate_1 = require("../services/gtechDocumentTemplate");
const number_sequence_service_1 = require("../services/number_sequence_service");
const typeorm_1 = require("typeorm");
let cachedCustomerSvg = null;
function drawCustomerSvgBackground(doc) {
    if (cachedCustomerSvg === null) {
        const svgPath = path_1.default.join(process.cwd(), "public/Customer_Document.svg");
        if (fs_1.default.existsSync(svgPath)) {
            try {
                const rawSvg = fs_1.default.readFileSync(svgPath, "utf8");
                cachedCustomerSvg = rawSvg.replace(/<path[^>]*id="path25"[^>]*\/>/gi, "");
            }
            catch (err) {
                console.error("Failed to load Customer_Document.svg:", err);
                cachedCustomerSvg = "";
            }
        }
        else {
            cachedCustomerSvg = "";
        }
    }
    if (cachedCustomerSvg) {
        try {
            (0, svg_to_pdfkit_1.default)(doc, cachedCustomerSvg, 0, 0, {
                width: 595.28,
                height: 841.89,
                preserveAspectRatio: "none",
            });
        }
        catch (e) {
            console.error("Error rendering Customer_Document.svg background:", e);
        }
    }
}
const formatCountry = (country) => {
    if (!country)
        return "";
    const code = country.trim().toUpperCase();
    if (code === "DE")
        return "Germany";
    if (code === "AT")
        return "Austria";
    if (code === "CH")
        return "Switzerland";
    return country.trim();
};
const coerceDate = (value) => {
    if (value === undefined || value === null || value === "")
        return undefined;
    if (value instanceof Date)
        return isNaN(value.getTime()) ? undefined : value;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
};
class PriceMatrixEntryDto {
}
exports.PriceMatrixEntryDto = PriceMatrixEntryDto;
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], PriceMatrixEntryDto.prototype, "id", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], PriceMatrixEntryDto.prototype, "quantity", void 0);
__decorate([
    IsOptional(),
    __metadata("design:type", Object)
], PriceMatrixEntryDto.prototype, "price", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], PriceMatrixEntryDto.prototype, "isActive", void 0);
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
], CreateOfferDto.prototype, "paymentMethod", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "shippingMethod", void 0);
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
    IsEnum(["classic", "matrix"]),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "pricingMode", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    Max(100),
    __metadata("design:type", Number)
], CreateOfferDto.prototype, "taxRate", void 0);
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
], CreateOfferDto.prototype, "defaultPriceMatrix", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "highlightColor", void 0);
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
], UpdateOfferDto.prototype, "paymentMethod", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], UpdateOfferDto.prototype, "shippingMethod", void 0);
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
    IsEnum(["classic", "matrix"]),
    __metadata("design:type", String)
], UpdateOfferDto.prototype, "pricingMode", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    Max(100),
    __metadata("design:type", Number)
], UpdateOfferDto.prototype, "taxRate", void 0);
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
    IsString(),
    __metadata("design:type", String)
], UpdateOfferDto.prototype, "highlightColor", void 0);
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
], UpdateOfferDto.prototype, "defaultPriceMatrix", void 0);
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
], UpdateLineItemDto.prototype, "priceMatrix", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], UpdateLineItemDto.prototype, "baseQuantity", void 0);
__decorate([
    IsOptional(),
    __metadata("design:type", Object)
], UpdateLineItemDto.prototype, "basePrice", void 0);
__decorate([
    IsOptional(),
    __metadata("design:type", Object)
], UpdateLineItemDto.prototype, "samplePrice", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], UpdateLineItemDto.prototype, "sampleQuantity", void 0);
__decorate([
    IsOptional(),
    __metadata("design:type", Object)
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
class PasteMatrixDto {
}
exports.PasteMatrixDto = PasteMatrixDto;
__decorate([
    IsString(),
    __metadata("design:type", String)
], PasteMatrixDto.prototype, "data", void 0);
__decorate([
    IsNumber(),
    Min(1),
    __metadata("design:type", Number)
], PasteMatrixDto.prototype, "tierCount", void 0);
class CreateOfferFromItemDto {
}
exports.CreateOfferFromItemDto = CreateOfferFromItemDto;
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferFromItemDto.prototype, "customerId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferFromItemDto.prototype, "title", void 0);
__decorate([
    IsOptional(),
    IsEnum(["RMB", "HKD", "EUR", "USD"]),
    __metadata("design:type", String)
], CreateOfferFromItemDto.prototype, "currency", void 0);
__decorate([
    IsOptional(),
    IsDate(),
    Type(() => Date),
    __metadata("design:type", Date)
], CreateOfferFromItemDto.prototype, "validUntil", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferFromItemDto.prototype, "notes", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferFromItemDto.prototype, "internalNotes", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferFromItemDto.prototype, "paymentMethod", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferFromItemDto.prototype, "shippingMethod", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferFromItemDto.prototype, "baseQuantity", void 0);
__decorate([
    IsOptional(),
    IsEnum(["classic", "matrix"]),
    __metadata("design:type", String)
], CreateOfferFromItemDto.prototype, "pricingMode", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    Max(100),
    __metadata("design:type", Number)
], CreateOfferFromItemDto.prototype, "taxRate", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(2),
    Max(4),
    __metadata("design:type", Number)
], CreateOfferFromItemDto.prototype, "unitPriceDecimalPlaces", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(2),
    Max(4),
    __metadata("design:type", Number)
], CreateOfferFromItemDto.prototype, "totalPriceDecimalPlaces", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    Max(10),
    __metadata("design:type", Number)
], CreateOfferFromItemDto.prototype, "maxUnitPriceColumns", void 0);
class CreateOfferFromCustomerDto {
}
exports.CreateOfferFromCustomerDto = CreateOfferFromCustomerDto;
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferFromCustomerDto.prototype, "title", void 0);
__decorate([
    IsOptional(),
    IsEnum(["RMB", "HKD", "EUR", "USD"]),
    __metadata("design:type", String)
], CreateOfferFromCustomerDto.prototype, "currency", void 0);
__decorate([
    IsOptional(),
    IsDate(),
    Type(() => Date),
    __metadata("design:type", Date)
], CreateOfferFromCustomerDto.prototype, "validUntil", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferFromCustomerDto.prototype, "notes", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferFromCustomerDto.prototype, "internalNotes", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferFromCustomerDto.prototype, "paymentMethod", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateOfferFromCustomerDto.prototype, "shippingMethod", void 0);
__decorate([
    IsOptional(),
    IsEnum(["classic", "matrix"]),
    __metadata("design:type", String)
], CreateOfferFromCustomerDto.prototype, "pricingMode", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    Max(100),
    __metadata("design:type", Number)
], CreateOfferFromCustomerDto.prototype, "taxRate", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(2),
    Max(4),
    __metadata("design:type", Number)
], CreateOfferFromCustomerDto.prototype, "unitPriceDecimalPlaces", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(2),
    Max(4),
    __metadata("design:type", Number)
], CreateOfferFromCustomerDto.prototype, "totalPriceDecimalPlaces", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    Max(10),
    __metadata("design:type", Number)
], CreateOfferFromCustomerDto.prototype, "maxUnitPriceColumns", void 0);
class CreateLineItemDto {
}
exports.CreateLineItemDto = CreateLineItemDto;
__decorate([
    IsString(),
    __metadata("design:type", String)
], CreateLineItemDto.prototype, "itemName", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateLineItemDto.prototype, "material", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateLineItemDto.prototype, "specification", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateLineItemDto.prototype, "description", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateLineItemDto.prototype, "baseQuantity", void 0);
__decorate([
    IsOptional(),
    __metadata("design:type", Object)
], CreateLineItemDto.prototype, "basePrice", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateLineItemDto.prototype, "notes", void 0);
__decorate([
    IsOptional(),
    __metadata("design:type", Object)
], CreateLineItemDto.prototype, "weight", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateLineItemDto.prototype, "sourceItemId", void 0);
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
            try {
                return yield number_sequence_service_1.NumberSequenceService.getNextNumber("offer");
            }
            catch (e) {
                const date = new Date();
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, "0");
                const offers = yield this.offerRepository
                    .createQueryBuilder("offer")
                    .select(["offer.offerNumber"])
                    .getMany();
                let maxSeq = 0;
                for (const off of offers) {
                    if (off.offerNumber) {
                        const parts = off.offerNumber.split("-");
                        const num = parseInt(parts[parts.length - 1], 10);
                        if (!isNaN(num) && num > maxSeq) {
                            maxSeq = num;
                        }
                    }
                }
                return `A${year}${month}-${maxSeq + 1}`;
            }
        });
    }
    buildCustomerSnapshot(customer) {
        var _a, _b, _c, _d, _e;
        return {
            id: customer.id,
            customerNumber: customer.customerNumber,
            companyName: customer.companyName,
            legalName: customer.legalName,
            email: customer.email,
            contactEmail: customer.contactEmail,
            contactPhoneNumber: customer.contactPhoneNumber,
            vatId: customer.vatTaxId || customer.taxNumber || "",
            address: customer.addressLine1 || ((_a = customer.businessDetails) === null || _a === void 0 ? void 0 : _a.address) || "",
            city: customer.city || ((_b = customer.businessDetails) === null || _b === void 0 ? void 0 : _b.city) || "",
            postalCode: customer.postalCode || ((_c = customer.businessDetails) === null || _c === void 0 ? void 0 : _c.postalCode) || "",
            country: customer.country || ((_d = customer.businessDetails) === null || _d === void 0 ? void 0 : _d.country) || "",
            state: ((_e = customer.businessDetails) === null || _e === void 0 ? void 0 : _e.state) || "",
            street: customer.addressLine1 || "Street Address",
            additionalInfo: customer.addressLine2 || "Additional Info",
        };
    }
    buildDeliveryAddress(customer) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const sc = customer.starCustomerDetails;
        if (sc && sc.deliveryAddressLine1) {
            return {
                street: sc.deliveryAddressLine1,
                city: sc.deliveryCity ||
                    customer.city ||
                    ((_a = customer.businessDetails) === null || _a === void 0 ? void 0 : _a.city) ||
                    "",
                state: sc.deliveryState || ((_b = customer.businessDetails) === null || _b === void 0 ? void 0 : _b.state) || "",
                postalCode: sc.deliveryPostalCode ||
                    customer.postalCode ||
                    ((_c = customer.businessDetails) === null || _c === void 0 ? void 0 : _c.postalCode) ||
                    "",
                country: sc.deliveryCountry ||
                    customer.country ||
                    ((_d = customer.businessDetails) === null || _d === void 0 ? void 0 : _d.country) ||
                    "",
                contactName: customer.legalName || customer.companyName || "",
                contactPhone: customer.contactPhoneNumber || "",
            };
        }
        return {
            street: customer.addressLine1 || "Street Address",
            city: customer.city || ((_e = customer.businessDetails) === null || _e === void 0 ? void 0 : _e.city) || "",
            state: ((_f = customer.businessDetails) === null || _f === void 0 ? void 0 : _f.state) || "",
            postalCode: customer.postalCode || ((_g = customer.businessDetails) === null || _g === void 0 ? void 0 : _g.postalCode) || "",
            country: customer.country || ((_h = customer.businessDetails) === null || _h === void 0 ? void 0 : _h.country) || "",
            contactName: customer.legalName || customer.companyName || "",
            contactPhone: customer.contactPhoneNumber || "",
        };
    }
    // ---------------------------------------------------------------------
    // Pricing helpers
    // ---------------------------------------------------------------------
    createDefaultPriceMatrix() {
        const now = new Date();
        return ["1000", "5000", "10000"].map((q, i) => ({
            id: (0, uuid_1.v4)(),
            quantity: q,
            price: null,
            total: null,
            isActive: i === 0,
            createdAt: now,
            updatedAt: now,
        }));
    }
    processPriceMatrix(entries, totalPriceDecimalPlaces = 2) {
        const now = new Date();
        const processed = entries.map((e) => {
            var _a;
            const price = (0, decimal_1.parseFlexibleNumber)(e.price);
            const qty = (_a = (0, decimal_1.parseFlexibleNumber)(e.quantity)) !== null && _a !== void 0 ? _a : 0;
            const total = price === null
                ? null
                : parseFloat((qty * price).toFixed(totalPriceDecimalPlaces));
            return {
                id: e.id || (0, uuid_1.v4)(),
                quantity: e.quantity,
                price,
                total,
                isActive: !!e.isActive,
                createdAt: now,
                updatedAt: now,
            };
        });
        // Only entries with a real price can be active. Never more than one.
        const activeCandidates = processed.filter((p) => p.isActive && p.price !== null);
        if (activeCandidates.length > 1) {
            let first = true;
            processed.forEach((p) => {
                if (p.isActive && p.price !== null) {
                    p.isActive = first;
                    first = false;
                }
                else {
                    p.isActive = false;
                }
            });
        }
        else if (activeCandidates.length === 0) {
            const firstReal = processed.find((p) => p.price !== null);
            if (firstReal)
                firstReal.isActive = true;
            processed.forEach((p) => {
                if (p !== firstReal)
                    p.isActive = false;
            });
        }
        else {
            processed.forEach((p) => {
                if (p.price === null)
                    p.isActive = false;
            });
        }
        return processed;
    }
    getActiveMatrixEntry(item) {
        return ((item.priceMatrix || []).find((p) => p.isActive) || null);
    }
    getLineItemTotal(item, pricingMode) {
        var _a;
        if (pricingMode === "matrix") {
            const active = this.getActiveMatrixEntry(item);
            return (_a = active === null || active === void 0 ? void 0 : active.total) !== null && _a !== void 0 ? _a : 0;
        }
        const qty = (0, decimal_1.parseFlexibleNumberOrZero)(item.baseQuantity) || 1;
        const price = (0, decimal_1.parseFlexibleNumberOrZero)(item.basePrice);
        return qty * price;
    }
    createOfferFromInquiry(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            try {
                const { inquiryId } = request.params;
                const bodyForDto = Object.assign(Object.assign({}, request.body), { validUntil: coerceDate((_a = request.body) === null || _a === void 0 ? void 0 : _a.validUntil) });
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
                const customer = inquiry.customer;
                if (!customer) {
                    return response.status(404).json({
                        success: false,
                        message: "Customer not found for this inquiry",
                    });
                }
                const offerNumber = yield this.generateOfferNumber();
                const inquirySnapshot = {
                    id: inquiry.id,
                    name: inquiry.name,
                    isAssembly: inquiry.isAssembly,
                    description: inquiry.description,
                    createdAt: inquiry.createdAt,
                    referenceNumber: inquiry.inquiryNo || inquiry.referenceNumber,
                    status: inquiry.status,
                    requestsCount: ((_b = inquiry.requests) === null || _b === void 0 ? void 0 : _b.length) || 0,
                };
                const customerSnapshot = this.buildCustomerSnapshot(customer);
                const pricingMode = createOfferDto.pricingMode || "classic";
                const defaultPriceMatrix = pricingMode === "matrix"
                    ? createOfferDto.defaultPriceMatrix
                        ? this.processPriceMatrix(createOfferDto.defaultPriceMatrix, createOfferDto.totalPriceDecimalPlaces || 2)
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
                        city: (_c = customer.businessDetails) === null || _c === void 0 ? void 0 : _c.city,
                        state: (_d = customer.businessDetails) === null || _d === void 0 ? void 0 : _d.state,
                        postalCode: (_e = customer.businessDetails) === null || _e === void 0 ? void 0 : _e.postalCode,
                        country: (_f = customer.businessDetails) === null || _f === void 0 ? void 0 : _f.country,
                        contactName: customer.legalName || customer.companyName,
                        contactPhone: customer.contactPhoneNumber,
                    },
                    status: "Draft",
                    validUntil: coerceDate(createOfferDto.validUntil) ||
                        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    termsConditions: createOfferDto.termsConditions,
                    deliveryTerms: createOfferDto.deliveryTerms,
                    paymentTerms: createOfferDto.paymentTerms,
                    paymentMethod: createOfferDto.paymentMethod,
                    shippingMethod: createOfferDto.shippingMethod,
                    deliveryTime: createOfferDto.deliveryTime,
                    currency: createOfferDto.currency || "EUR",
                    pricingMode,
                    taxRate: (_g = createOfferDto.taxRate) !== null && _g !== void 0 ? _g : 19,
                    discountPercentage: createOfferDto.discountPercentage || 0,
                    discountAmount: createOfferDto.discountAmount || 0,
                    shippingCost: createOfferDto.shippingCost || 0,
                    notes: createOfferDto.notes,
                    internalNotes: createOfferDto.internalNotes,
                    highlightColor: createOfferDto.highlightColor,
                    isAssembly: inquiry.isAssembly,
                    assemblyName: createOfferDto.assemblyName || inquiry.name,
                    assemblyDescription: createOfferDto.assemblyDescription || inquiry.description,
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
                const savedOffer = yield this.offerRepository.save(offer);
                let lineItems = [];
                let position = 1;
                const matrixForLine = () => pricingMode === "matrix" ? this.createDefaultPriceMatrix() : undefined;
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
                    const savedAssemblyItem = yield this.lineItemRepository.save(assemblyLineItem);
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
                }
                else {
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
                    yield this.lineItemRepository.save(lineItems);
                }
                yield this.calculateOfferTotals(savedOffer.id);
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
    createOfferFromItem(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { itemId } = request.params;
                const body = request.body || {};
                const requestedIds = Array.from(new Set([itemId, ...(Array.isArray(body.itemIds) ? body.itemIds : [])]
                    .map((id) => parseInt(String(id), 10))
                    .filter((id) => !isNaN(id))));
                if (requestedIds.length === 0) {
                    return response
                        .status(400)
                        .json({ success: false, message: "No item ids provided." });
                }
                const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
                const fetchedItems = yield itemRepository.find({
                    where: { id: (0, typeorm_1.In)(requestedIds) },
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
                    .filter((it) => !!it);
                if (orderedItems.length === 0) {
                    return response
                        .status(404)
                        .json({ success: false, message: "No matching items found." });
                }
                let customer = null;
                if (body.customerId) {
                    customer = yield this.customerRepository.findOne({
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
                        message: "No recipient customer could be resolved. Pass a customerId to create the offer.",
                    });
                }
                const offerNumber = yield this.generateOfferNumber();
                const customerSnapshot = this.buildCustomerSnapshot(customer);
                const pricingMode = body.pricingMode || "classic";
                const defaultPriceMatrix = pricingMode === "matrix" ? this.createDefaultPriceMatrix() : undefined;
                const primary = orderedItems[0];
                const primarySnapshot = this.buildItemSnapshot(primary);
                const offer = this.offerRepository.create({
                    offerNumber,
                    sourceType: "item",
                    title: body.title ||
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
                    validUntil: coerceDate(body.validUntil) ||
                        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    currency: body.currency || "EUR",
                    notes: body.notes,
                    internalNotes: body.internalNotes,
                    paymentMethod: body.paymentMethod,
                    shippingMethod: body.shippingMethod,
                    isAssembly: false,
                    pricingMode,
                    taxRate: (_a = body.taxRate) !== null && _a !== void 0 ? _a : 19,
                    unitPriceDecimalPlaces: body.unitPriceDecimalPlaces || 3,
                    totalPriceDecimalPlaces: body.totalPriceDecimalPlaces || 2,
                    maxUnitPriceColumns: body.maxUnitPriceColumns || 3,
                    defaultPriceMatrix,
                    revision: 1,
                    subtotal: 0,
                    taxAmount: 0,
                    totalAmount: 0,
                });
                const savedOffer = yield this.offerRepository.save(offer);
                const lineItems = orderedItems.map((item, idx) => {
                    var _a;
                    const snap = this.buildItemSnapshot(item);
                    // ---------------------------------------------------------------
                    // NEW: pull the price and item number straight from the source
                    // Item entity, so the offer line item starts pre-filled with the
                    // item's own values instead of only whatever buildItemSnapshot()
                    // already derives.
                    //
                    // - basePrice  <- item.price (the Item entity's own `price` column)
                    // - material   <- item's item number. Item doesn't have a plain
                    //   "itemNo" column itself; ItemID_DE is the closest direct
                    //   identifier on the entity, with parent_no_de as a fallback for
                    //   items that only carry the number via their parent link.
                    //   Adjust this fallback chain if your "item no" should come from
                    //   a different column.
                    // ---------------------------------------------------------------
                    const itemNo = item.ItemID_DE
                        ? String(item.ItemID_DE)
                        : item.parent_no_de || "";
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
                        basePrice: (_a = item.price) !== null && _a !== void 0 ? _a : 0,
                        material: itemNo,
                        position: idx + 1,
                        priceMatrix: pricingMode === "matrix"
                            ? this.createDefaultPriceMatrix()
                            : undefined,
                        lineTotal: 0,
                    });
                });
                yield this.lineItemRepository.save(lineItems);
                yield this.calculateOfferTotals(savedOffer.id);
                const completeOffer = yield this.offerRepository.findOne({
                    where: { id: savedOffer.id },
                    relations: ["lineItems"],
                });
                return response.status(201).json({
                    success: true,
                    message: orderedItems.length > 1
                        ? `Offer created from ${orderedItems.length} items successfully`
                        : "Offer created from item successfully",
                    data: completeOffer,
                });
            }
            catch (error) {
                console.error("Error creating offer from item:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    }
    createLineItem(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { offerId } = request.params;
                const body = request.body || {};
                if (!body.itemName || !body.itemName.trim()) {
                    return response
                        .status(400)
                        .json({ success: false, message: "itemName is required" });
                }
                const offer = yield this.offerRepository.findOne({
                    where: { id: offerId },
                    relations: ["lineItems"],
                });
                if (!offer) {
                    return response
                        .status(404)
                        .json({ success: false, message: "Offer not found" });
                }
                const existing = (offer.lineItems || []).filter((li) => !li.isComponent);
                const nextPosition = existing.reduce((max, li) => Math.max(max, li.position || 0), 0) + 1;
                const basePrice = (_a = (0, decimal_1.parseFlexibleNumber)(body.basePrice)) !== null && _a !== void 0 ? _a : 0;
                const baseQuantity = ((_b = body.baseQuantity) === null || _b === void 0 ? void 0 : _b.trim()) || "1";
                const weight = (0, decimal_1.parseFlexibleNumber)(body.weight);
                const lineItem = this.lineItemRepository.create({
                    offer,
                    offerId: offer.id,
                    itemName: body.itemName.trim(),
                    material: body.material,
                    specification: body.specification,
                    description: body.description,
                    baseQuantity: baseQuantity || "1",
                    basePrice: basePrice !== null && basePrice !== void 0 ? basePrice : undefined,
                    notes: body.notes,
                    position: nextPosition,
                    priceMatrix: offer.pricingMode === "matrix" ? [] : undefined,
                    weight: weight !== null && weight !== void 0 ? weight : undefined,
                    sourceItemId: body.sourceItemId || undefined,
                    lineTotal: basePrice !== null
                        ? basePrice * ((0, decimal_1.parseFlexibleNumber)(body.baseQuantity) || 1)
                        : 0,
                });
                const saved = yield this.lineItemRepository.save(lineItem);
                yield this.calculateOfferTotals(offer.id);
                return response.status(201).json({
                    success: true,
                    message: "Line item added successfully",
                    data: saved,
                });
            }
            catch (error) {
                console.error("Error adding line item:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        });
    }
    deleteLineItem(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { offerId, lineItemId } = request.params;
                const lineItem = yield this.lineItemRepository.findOne({
                    where: { id: lineItemId, offerId },
                });
                if (!lineItem) {
                    return response
                        .status(404)
                        .json({ success: false, message: "Line item not found" });
                }
                yield this.lineItemRepository.remove(lineItem);
                yield this.calculateOfferTotals(offerId);
                return response.status(200).json({
                    success: true,
                    message: "Line item deleted successfully",
                });
            }
            catch (error) {
                console.error("Error deleting line item:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    deletePriceColumn(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { offerId } = request.params;
                const quantity = ((_a = request.query.quantity) !== null && _a !== void 0 ? _a : (_b = request.body) === null || _b === void 0 ? void 0 : _b.quantity);
                if (!quantity) {
                    return response.status(400).json({
                        success: false,
                        message: "A quantity is required to identify the column to delete.",
                    });
                }
                const offer = yield this.offerRepository.findOne({
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
                        message: "This offer is in Classic mode; there are no tiers to delete.",
                    });
                }
                const lineItems = yield this.lineItemRepository.find({
                    where: { offerId, isComponent: false },
                });
                const target = String(quantity).trim();
                const updates = [];
                for (const lineItem of lineItems) {
                    const before = lineItem.priceMatrix || [];
                    const after = before.filter((p) => String(p.quantity).trim() !== target);
                    if (after.length !== before.length) {
                        if (after.length > 0 && !after.some((p) => p.isActive)) {
                            const firstReal = after.find((p) => p.price !== null);
                            if (firstReal)
                                firstReal.isActive = true;
                        }
                        lineItem.priceMatrix = after;
                        updates.push(lineItem);
                    }
                }
                if (offer.defaultPriceMatrix) {
                    offer.defaultPriceMatrix = offer.defaultPriceMatrix.filter((p) => String(p.quantity).trim() !== target);
                    yield this.offerRepository.save(offer);
                }
                if (updates.length > 0) {
                    yield this.lineItemRepository.save(updates);
                }
                yield this.calculateOfferTotals(offerId);
                return response.status(200).json({
                    success: true,
                    message: `Removed the ${target} tier from ${updates.length} line items`,
                    data: { updatedLineItems: updates.length },
                });
            }
            catch (error) {
                console.error("Error deleting price column:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    convertOfferToItem(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            try {
                const { offerId } = request.params;
                const { lineItemId } = request.query;
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
                const offerRepository = database_1.AppDataSource.getRepository(offer_1.Offer);
                const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
                const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
                const lineItemRepository = database_1.AppDataSource.getRepository(offer_1.OfferLineItem);
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
                let sourceData;
                if (offer.isAssembly) {
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
                const itemId = yield inquiry_controller_1.ItemGenerator.generateItemId();
                const ean = inquiry_controller_1.ItemGenerator.generateEAN(itemId);
                let taric = null;
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
                const savedItem = yield itemRepository.save(item);
                offer.status = "Accepted";
                yield offerRepository.save(offer);
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
            var _a, _b;
            try {
                const offer = yield this.offerRepository.findOne({
                    where: { id: offerId },
                    relations: ["lineItems"],
                });
                if (!offer)
                    return;
                let subtotal = 0;
                const customerItems = ((_a = offer.lineItems) === null || _a === void 0 ? void 0 : _a.filter((item) => !item.isComponent)) ||
                    [];
                for (const item of customerItems) {
                    const lineTotal = this.getLineItemTotal(item, offer.pricingMode);
                    if (lineTotal > 0 && item.lineTotal !== lineTotal) {
                        item.lineTotal = lineTotal;
                        yield this.lineItemRepository.save(item);
                    }
                    subtotal += lineTotal;
                }
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
                const taxRate = ((_b = offer.taxRate) !== null && _b !== void 0 ? _b : 19) / 100;
                const taxAmount = total * taxRate;
                const totalWithTax = total + taxAmount;
                const formatNumber = (num) => {
                    if (isNaN(num) || !isFinite(num))
                        return 0;
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
    getOfferById(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
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
                if (offer.subtotal === 0 && offer.totalAmount === 0) {
                    yield this.calculateOfferTotals(offer.id);
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
                // ---------------------------------------------------------------
                // NEW: backfill `material` (Art.-Nr.) / `basePrice` (Price) from the
                // originating Item whenever a line item is missing them — e.g. for
                // line items created before this snapshot logic existed, or ones
                // whose sourceItemId points to an item that never had these set on
                // creation. Only touches line items that actually have a
                // sourceItemId and are missing the value; never overwrites a value
                // that's already there (so manual edits in the offer itself are
                // preserved).
                // ---------------------------------------------------------------
                if (offer.lineItems && offer.lineItems.length > 0) {
                    const missingIds = offer.lineItems
                        .filter((li) => li.sourceItemId &&
                        (li.material === null ||
                            li.material === undefined ||
                            li.material === "" ||
                            li.basePrice === null ||
                            li.basePrice === undefined))
                        .map((li) => Number(li.sourceItemId))
                        .filter((id) => !isNaN(id));
                    if (missingIds.length > 0) {
                        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
                        const sourceItems = yield itemRepository.find({
                            where: { id: (0, typeorm_1.In)(Array.from(new Set(missingIds))) },
                        });
                        const itemById = new Map(sourceItems.map((it) => [String(it.id), it]));
                        let needsSave = false;
                        for (const li of offer.lineItems) {
                            if (!li.sourceItemId)
                                continue;
                            const src = itemById.get(String(li.sourceItemId));
                            if (!src)
                                continue;
                            if (li.material === null ||
                                li.material === undefined ||
                                li.material === "") {
                                li.material = src.ItemID_DE
                                    ? String(src.ItemID_DE)
                                    : src.parent_no_de || "";
                                needsSave = true;
                            }
                            if (li.basePrice === null || li.basePrice === undefined) {
                                li.basePrice = (_a = src.price) !== null && _a !== void 0 ? _a : 0;
                                needsSave = true;
                            }
                        }
                        if (needsSave) {
                            yield this.lineItemRepository.save(offer.lineItems);
                        }
                    }
                }
                if (offer.lineItems) {
                    offer.lineItems = offer.lineItems.map((item) => (Object.assign(Object.assign({}, item), { 
                        // Alias so the "Art.-Nr." cell shows the same value whether the
                        // frontend reads `item.itemNo` (edit mode) or `item.material`
                        // (view mode) — both now resolve to the same stored field.
                        itemNo: item.material, activePrice: this.getActiveMatrixEntry(item) })));
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
    getAllOffers(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { page = 1, limit = 20, inquiryId, customerId, status, search, } = request.query;
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
                    queryBuilder.andWhere("(offer.offerNumber LIKE :search OR offer.title LIKE :search OR offer.customerSnapshot->>'companyName' LIKE :search OR offer.inquirySnapshot->>'name' LIKE :search)", { search: `%${search}%` });
                }
                const skip = (Number(page) - 1) * Number(limit);
                const [offers, total] = yield queryBuilder
                    .skip(skip)
                    .take(Number(limit))
                    .getManyAndCount();
                for (const offer of offers) {
                    if (offer.subtotal === 0 && offer.totalAmount === 0) {
                        yield this.calculateOfferTotals(offer.id);
                    }
                }
                const offersWithItemNo = offers.map((offer) => (Object.assign(Object.assign({}, offer), { lineItems: (offer.lineItems || []).map((item) => (Object.assign(Object.assign({}, item), { itemNo: item.material }))) })));
                return response.status(200).json({
                    success: true,
                    data: offersWithItemNo,
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
    updateOffer(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
                const rawBody = request.body;
                const processedBody = Object.assign(Object.assign({}, rawBody), { validUntil: rawBody.validUntil !== undefined
                        ? coerceDate(rawBody.validUntil)
                        : undefined, discountPercentage: rawBody.discountPercentage !== undefined
                        ? (0, decimal_1.parseFlexibleNumberOrZero)(rawBody.discountPercentage)
                        : undefined, discountAmount: rawBody.discountAmount !== undefined
                        ? (0, decimal_1.parseFlexibleNumberOrZero)(rawBody.discountAmount)
                        : undefined, shippingCost: rawBody.shippingCost !== undefined
                        ? (0, decimal_1.parseFlexibleNumberOrZero)(rawBody.shippingCost)
                        : undefined, subtotal: rawBody.subtotal !== undefined
                        ? (0, decimal_1.parseFlexibleNumberOrZero)(rawBody.subtotal)
                        : undefined, taxAmount: rawBody.taxAmount !== undefined
                        ? (0, decimal_1.parseFlexibleNumberOrZero)(rawBody.taxAmount)
                        : undefined, totalAmount: rawBody.totalAmount !== undefined
                        ? (0, decimal_1.parseFlexibleNumberOrZero)(rawBody.totalAmount)
                        : undefined, taxRate: rawBody.taxRate !== undefined
                        ? (0, decimal_1.parseFlexibleNumberOrZero)(rawBody.taxRate)
                        : undefined });
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
                const pricingModeChanged = updateOfferDto.pricingMode !== undefined &&
                    updateOfferDto.pricingMode !== offer.pricingMode;
                if (typeof offer.subtotal === "string") {
                    offer.subtotal = (0, decimal_1.parseFlexibleNumberOrZero)(offer.subtotal);
                }
                if (typeof offer.taxAmount === "string") {
                    offer.taxAmount = (0, decimal_1.parseFlexibleNumberOrZero)(offer.taxAmount);
                }
                if (typeof offer.totalAmount === "string") {
                    offer.totalAmount = (0, decimal_1.parseFlexibleNumberOrZero)(offer.totalAmount);
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
                    "highlightColor",
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
                if (pricingModeChanged &&
                    offer.pricingMode === "matrix" &&
                    !offer.defaultPriceMatrix) {
                    offer.defaultPriceMatrix = this.createDefaultPriceMatrix();
                }
                const updatedOffer = yield this.offerRepository.save(offer);
                if (pricingModeChanged) {
                    yield this.applyPricingModeChange(offer.id, updateOfferDto.pricingMode);
                }
                if (updateOfferDto.shippingCost !== undefined ||
                    updateOfferDto.discountPercentage !== undefined ||
                    updateOfferDto.discountAmount !== undefined ||
                    updateOfferDto.subtotal !== undefined ||
                    updateOfferDto.taxAmount !== undefined ||
                    updateOfferDto.totalAmount !== undefined ||
                    updateOfferDto.taxRate !== undefined ||
                    pricingModeChanged) {
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
        });
    }
    applyPricingModeChange(offerId, pricingMode) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const lineItems = yield this.lineItemRepository.find({
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
                    yield this.lineItemRepository.save(updates);
                }
            }
            catch (error) {
                console.error("Error applying pricing mode change:", error);
            }
        });
    }
    updateLineItem(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const { offerId, lineItemId } = request.params;
                const updateLineItemDto = plainToInstance(UpdateLineItemDto, request.body);
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
                if (updateLineItemDto.priceMatrix && offer.pricingMode === "matrix") {
                    updateLineItemDto.priceMatrix = this.processPriceMatrix(updateLineItemDto.priceMatrix, offer.totalPriceDecimalPlaces || 2);
                }
                if (updateLineItemDto.basePrice !== undefined) {
                    updateLineItemDto.basePrice =
                        (_a = (0, decimal_1.parseFlexibleNumber)(updateLineItemDto.basePrice)) !== null && _a !== void 0 ? _a : 0;
                }
                if (updateLineItemDto.samplePrice !== undefined) {
                    updateLineItemDto.samplePrice =
                        (_b = (0, decimal_1.parseFlexibleNumber)(updateLineItemDto.samplePrice)) !== null && _b !== void 0 ? _b : 0;
                }
                if (updateLineItemDto.baseQuantity !== undefined &&
                    !updateLineItemDto.baseQuantity.trim()) {
                    updateLineItemDto.baseQuantity = "1";
                }
                Object.assign(lineItem, updateLineItemDto);
                if (offer.pricingMode === "matrix" && ((_c = lineItem.priceMatrix) === null || _c === void 0 ? void 0 : _c.length)) {
                    const active = lineItem.priceMatrix.find((p) => p.isActive);
                    if (active && active.total !== null) {
                        lineItem.lineTotal = active.total;
                    }
                }
                else if (updateLineItemDto.basePrice !== undefined ||
                    updateLineItemDto.baseQuantity !== undefined) {
                    const qty = (0, decimal_1.parseFlexibleNumber)(lineItem.baseQuantity) || 1;
                    const price = (0, decimal_1.parseFlexibleNumberOrZero)(lineItem.basePrice);
                    lineItem.lineTotal = qty * price;
                }
                const updatedLineItem = yield this.lineItemRepository.save(lineItem);
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
    // ==========================================================================
    // Add a single price tier to a line item's matrix. Price may be omitted
    // (or ".") to add an "not calculated yet" tier.
    // ==========================================================================
    addPriceMatrixEntry(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { lineItemId } = request.params;
                const { quantity, price } = request.body;
                if (!quantity) {
                    return response.status(400).json({
                        success: false,
                        message: "Quantity is required",
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
                if (!offer || offer.pricingMode !== "matrix") {
                    return response.status(400).json({
                        success: false,
                        message: "Matrix pricing is not enabled for this offer",
                    });
                }
                const parsedPrice = (0, decimal_1.parseFlexibleNumber)(price);
                const now = new Date();
                const entries = lineItem.priceMatrix || [];
                const qtyNum = (_a = (0, decimal_1.parseFlexibleNumber)(quantity)) !== null && _a !== void 0 ? _a : 0;
                const totalPriceDecimalPlaces = offer.totalPriceDecimalPlaces || 2;
                const total = parsedPrice === null
                    ? null
                    : parseFloat((qtyNum * parsedPrice).toFixed(totalPriceDecimalPlaces));
                entries.push({
                    id: (0, uuid_1.v4)(),
                    quantity,
                    price: parsedPrice,
                    total,
                    isActive: false,
                    createdAt: now,
                    updatedAt: now,
                });
                entries.sort((a, b) => ((0, decimal_1.parseFlexibleNumber)(a.quantity) || 0) -
                    ((0, decimal_1.parseFlexibleNumber)(b.quantity) || 0));
                if (!entries.some((e) => e.isActive)) {
                    const firstReal = entries.find((e) => e.price !== null);
                    if (firstReal)
                        firstReal.isActive = true;
                }
                lineItem.priceMatrix = entries;
                const active = entries.find((e) => e.isActive);
                lineItem.lineTotal = (active === null || active === void 0 ? void 0 : active.total) || 0;
                const updatedLineItem = yield this.lineItemRepository.save(lineItem);
                if (lineItem.offerId) {
                    yield this.calculateOfferTotals(lineItem.offerId);
                }
                return response.status(200).json({
                    success: true,
                    message: "Price tier added successfully",
                    data: updatedLineItem,
                });
            }
            catch (error) {
                console.error("Error adding price tier:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    bulkUpdateLineItems(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { offerId } = request.params;
                const bulkUpdateDto = plainToInstance(BulkUpdateLineItemsDto, request.body);
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
                        if (itemUpdate.priceMatrix !== undefined &&
                            offer.pricingMode === "matrix") {
                            lineItem.priceMatrix = this.processPriceMatrix(itemUpdate.priceMatrix, offer.totalPriceDecimalPlaces || 2);
                        }
                        if (itemUpdate.basePrice !== undefined)
                            lineItem.basePrice = (_a = (0, decimal_1.parseFlexibleNumber)(itemUpdate.basePrice)) !== null && _a !== void 0 ? _a : 0;
                        if (itemUpdate.samplePrice !== undefined)
                            lineItem.samplePrice =
                                (_b = (0, decimal_1.parseFlexibleNumber)(itemUpdate.samplePrice)) !== null && _b !== void 0 ? _b : 0;
                        if (itemUpdate.lineTotal !== undefined)
                            lineItem.lineTotal = (0, decimal_1.parseFlexibleNumberOrZero)(itemUpdate.lineTotal);
                        if (itemUpdate.notes !== undefined)
                            lineItem.notes = itemUpdate.notes;
                        if (itemUpdate.expectedDeliveryDate !== undefined)
                            lineItem.expectedDeliveryDate = coerceDate(itemUpdate.expectedDeliveryDate);
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
    pasteMatrixPrices(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { offerId } = request.params;
                const { data, tierCount } = request.body;
                if (!data || !tierCount || tierCount < 1) {
                    return response.status(400).json({
                        success: false,
                        message: "Paste data and a tier count are required.",
                    });
                }
                const offer = yield this.offerRepository.findOne({
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
                        message: "This offer is in Classic pricing mode. Switch to Matrix mode first.",
                    });
                }
                const lineItems = yield this.lineItemRepository.find({
                    where: { offerId, isComponent: false },
                    order: { position: "ASC" },
                });
                if (lineItems.length === 0) {
                    return response.status(400).json({
                        success: false,
                        message: "Add the line items first, then paste their matching prices.",
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
                const updates = [];
                const totalPriceDecimalPlaces = offer.totalPriceDecimalPlaces || 2;
                for (const lineItem of lineItems) {
                    // A lone "." at a chunk boundary separates items — consume it before
                    // reading the next block.
                    if (rawLines[cursor] === ".")
                        cursor++;
                    const block = rawLines.slice(cursor, cursor + tierCount);
                    if (block.length < tierCount)
                        break;
                    cursor += tierCount;
                    const priceMatrix = tiers.map((qty, i) => {
                        var _a;
                        const raw = block[i];
                        const price = raw === "." ? null : (0, decimal_1.parseFlexibleNumber)(raw);
                        const total = price === null
                            ? null
                            : parseFloat((((_a = (0, decimal_1.parseFlexibleNumber)(qty)) !== null && _a !== void 0 ? _a : 0) * price).toFixed(totalPriceDecimalPlaces));
                        return {
                            id: (0, uuid_1.v4)(),
                            quantity: qty,
                            price,
                            total,
                            isActive: false,
                            createdAt: now,
                            updatedAt: now,
                        };
                    });
                    const firstReal = priceMatrix.find((p) => p.price !== null);
                    if (firstReal)
                        firstReal.isActive = true;
                    lineItem.priceMatrix = priceMatrix;
                    lineItem.lineTotal = (firstReal === null || firstReal === void 0 ? void 0 : firstReal.total) || 0;
                    updates.push(lineItem);
                }
                if (updates.length > 0) {
                    yield this.lineItemRepository.save(updates);
                    yield this.calculateOfferTotals(offerId);
                }
                return response.status(200).json({
                    success: true,
                    message: `Imported the price matrix for ${updates.length} of ${lineItems.length} line items.`,
                    data: { updatedLineItems: updates.length, tiers },
                });
            }
            catch (error) {
                console.error("Error pasting matrix prices:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    // Kept for route/name compatibility with any existing wiring; delegates to
    // the new matrix paste implementation.
    copyPastePrices(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.pasteMatrixPrices(request, response);
        });
    }
    setActivePrice(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { lineItemId, priceIndex } = request.params;
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
                if (isNaN(index) ||
                    index < 0 ||
                    !lineItem.priceMatrix ||
                    index >= lineItem.priceMatrix.length) {
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
                lineItem.priceMatrix = lineItem.priceMatrix.map((p, i) => (Object.assign(Object.assign({}, p), { isActive: i === index, updatedAt: i === index ? now : p.updatedAt })));
                lineItem.lineTotal = lineItem.priceMatrix[index].total || 0;
                const updatedLineItem = yield this.lineItemRepository.save(lineItem);
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
    togglePricingMode(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { offerId } = request.params;
                const { pricingMode, useUnitPrices } = request.body;
                const mode = pricingMode || (useUnitPrices ? "matrix" : "classic");
                if (mode !== "classic" && mode !== "matrix") {
                    return response.status(400).json({
                        success: false,
                        message: "pricingMode must be 'classic' or 'matrix'",
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
                const previousMode = offer.pricingMode;
                offer.pricingMode = mode;
                if (mode === "matrix" &&
                    (!offer.defaultPriceMatrix || offer.defaultPriceMatrix.length === 0)) {
                    offer.defaultPriceMatrix = this.createDefaultPriceMatrix();
                }
                yield this.offerRepository.save(offer);
                if (previousMode !== mode) {
                    yield this.applyPricingModeChange(offerId, mode);
                    yield this.calculateOfferTotals(offerId);
                }
                const updatedOffer = yield this.offerRepository.findOne({
                    where: { id: offerId },
                });
                return response.status(200).json({
                    success: true,
                    message: `Pricing mode set to ${mode}`,
                    data: updatedOffer,
                });
            }
            catch (error) {
                console.error("Error toggling pricing mode:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    syncPriceMatrixAcrossOffer(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { offerId } = request.params;
                const offer = yield this.offerRepository.findOne({
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
                const templateTiers = offer.defaultPriceMatrix || this.createDefaultPriceMatrix();
                const lineItems = yield this.lineItemRepository.find({
                    where: { offerId, isComponent: false },
                });
                const updates = [];
                for (const lineItem of lineItems) {
                    const existing = lineItem.priceMatrix || [];
                    const updated = templateTiers.map((tpl) => {
                        const match = existing.find((e) => e.quantity === tpl.quantity);
                        return match
                            ? Object.assign(Object.assign({}, tpl), { price: match.price, total: match.total, isActive: match.isActive }) : Object.assign({}, tpl);
                    });
                    lineItem.priceMatrix = updated;
                    const active = updated.find((p) => p.isActive && p.price !== null);
                    lineItem.lineTotal = (active === null || active === void 0 ? void 0 : active.total) || 0;
                    updates.push(lineItem);
                }
                if (updates.length > 0) {
                    yield this.lineItemRepository.save(updates);
                }
                yield this.calculateOfferTotals(offerId);
                return response.status(200).json({
                    success: true,
                    message: "Price matrix synced across all line items",
                    data: { syncedLineItems: updates.length },
                });
            }
            catch (error) {
                console.error("Error syncing price matrix across offer:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
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
                const newOfferNumber = yield this.generateOfferNumber();
                const newOffer = this.offerRepository.create(Object.assign(Object.assign({}, originalOffer), { id: undefined, offerNumber: newOfferNumber, previousOfferNumber: originalOffer.offerNumber, revision: originalOffer.revision + 1, status: "Draft", pdfGenerated: false, pdfPath: null, pdfGeneratedAt: null, createdAt: undefined, updatedAt: undefined, lineItems: undefined }));
                Object.assign(newOffer, createOfferDto);
                const savedOffer = yield this.offerRepository.save(newOffer);
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
                const matrixOffers = yield this.offerRepository.count({
                    where: { pricingMode: "matrix" },
                });
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
                        pricingMode: {
                            matrix: matrixOffers,
                            classic: totalOffers - matrixOffers,
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
            var _a, _b, _c, _d;
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
                const formatDate = (dateValue) => {
                    if (!dateValue)
                        return "N/A";
                    const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
                    if (!(date instanceof Date) || isNaN(date.getTime()))
                        return "N/A";
                    return date.toLocaleDateString("de-DE");
                };
                const getSafeNumber = (numValue) => {
                    const parsed = (0, decimal_1.parseFlexibleNumber)(numValue);
                    return parsed !== null && parsed !== void 0 ? parsed : 0;
                };
                const formatNumber = (numValue, decimals = 2) => {
                    const num = getSafeNumber(numValue);
                    const factor = Math.pow(10, decimals);
                    const rounded = Math.round((num + Number.EPSILON) * factor) / factor;
                    const fixedNum = Math.abs(rounded).toFixed(decimals);
                    return rounded < 0 ? `-${fixedNum}` : fixedNum;
                };
                const getLineTotal = (item) => {
                    var _a, _b;
                    if (offer.pricingMode === "matrix" && ((_a = item.priceMatrix) === null || _a === void 0 ? void 0 : _a.length)) {
                        const active = item.priceMatrix.find((p) => p.isActive);
                        return (_b = active === null || active === void 0 ? void 0 : active.total) !== null && _b !== void 0 ? _b : 0;
                    }
                    const qty = getSafeNumber(item.baseQuantity) || 1;
                    return qty * getSafeNumber(item.basePrice);
                };
                const calculateTotals = (offerData) => {
                    var _a;
                    let subtotal = 0;
                    if (offerData.lineItems && Array.isArray(offerData.lineItems)) {
                        const customerItems = offerData.lineItems.filter((item) => !item.isComponent);
                        customerItems.forEach((item) => {
                            subtotal += getLineTotal(item);
                        });
                    }
                    const discount = getSafeNumber(offerData.discountAmount || offerData.discount);
                    let discountedSubtotal = subtotal - discount;
                    if (discountedSubtotal < 0)
                        discountedSubtotal = 0;
                    const shipping = getSafeNumber(offerData.shippingCost || offerData.shipping);
                    const amountBeforeTax = discountedSubtotal + shipping;
                    const taxRate = getSafeNumber((_a = offerData.taxRate) !== null && _a !== void 0 ? _a : 19) / 100;
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
                const gtechFonts = (0, gtech_fonts_1.resolveGtechFonts)();
                const doc = new pdfkit_1.default({
                    margin: 0,
                    size: "A4",
                    bufferPages: true,
                });
                const pageWidth = 595.28;
                const pageHeight = 841.89;
                const MM = (v) => v * 2.8346;
                const LEFT_X = MM(18);
                const INFO_BOX_X = MM(125);
                const TABLE_END_X = MM(192);
                const CONTENT_WIDTH = MM(174);
                const uploadsDir = path_1.default.join(__dirname, "../../uploads/offers");
                if (!fs_1.default.existsSync(uploadsDir)) {
                    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
                }
                const pdfFileName = `${offer.offerNumber || "offer"}.pdf`;
                const pdfPath = path_1.default.join(uploadsDir, pdfFileName);
                const writeStream = fs_1.default.createWriteStream(pdfPath);
                doc.pipe(writeStream);
                const pdfWritePromise = new Promise((resolve, reject) => {
                    writeStream.on("finish", resolve);
                    writeStream.on("error", reject);
                });
                (0, gtechDocumentTemplate_1.registerGtechFonts)(doc, gtechFonts);
                const R = (0, gtechDocumentTemplate_1.fontRegular)(gtechFonts);
                const M = (0, gtechDocumentTemplate_1.fontMedium)(gtechFonts);
                const SB = (0, gtechDocumentTemplate_1.fontSemiBold)(gtechFonts);
                drawCustomerSvgBackground(doc);
                let customer = {};
                if (offer.customerSnapshot) {
                    try {
                        customer =
                            typeof offer.customerSnapshot === "string"
                                ? JSON.parse(offer.customerSnapshot)
                                : offer.customerSnapshot;
                    }
                    catch (e) {
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
                }
                else if (customer.additionalInfo &&
                    customer.additionalInfo !== "Additional Info") {
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
                const cityLine = `${customer.postalCode || ""} ${customer.city || ""}`.trim();
                if (cityLine) {
                    doc.text(cityLine, MM(25), addrY, { width: MM(80), lineBreak: false });
                    addrY += 12;
                }
                const displayCountry = formatCountry(customer.country);
                if (displayCountry &&
                    displayCountry.toUpperCase() !== "DE" &&
                    displayCountry.toUpperCase() !== "GERMANY" &&
                    displayCountry.toUpperCase() !== "DEUTSCHLAND") {
                    doc.text(displayCountry, MM(25), addrY, {
                        width: MM(80),
                        lineBreak: false,
                    });
                    addrY += 12;
                }
                const customerVatId = customer.vatId || customer.vatTaxId || customer.taxNumber || "";
                if (customerVatId &&
                    displayCountry &&
                    displayCountry.toUpperCase() !== "DE" &&
                    displayCountry.toUpperCase() !== "GERMANY" &&
                    displayCountry.toUpperCase() !== "DEUTSCHLAND") {
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
                // Grey title box background matching Image 2 design
                doc.rect(titleBoxX, titleBoxY, titleBoxW, titleBoxH).fill("#D1D5DB");
                // "Angebot" label on left inside grey box
                doc.font(SB).fontSize(12).fillColor("#3F4446").text("Angebot", titleBoxX + 6, titleBoxY + 5, {
                    lineBreak: false,
                });
                // Dynamic Title / Offer Number on right inside grey box
                const titleText = offer.title || offer.offerNumber || "";
                doc.font(R).fontSize(9.5).fillColor("#3F4446").text(titleText, titleBoxX + 65, titleBoxY + 6, {
                    width: titleBoxW - 70,
                    align: "right",
                    lineBreak: false,
                });
                const contactName = ((_a = offer.inquiry) === null || _a === void 0 ? void 0 : _a.contactPerson)
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
                        ((_c = (_b = offer.inquiry) === null || _b === void 0 ? void 0 : _b.customer) === null || _c === void 0 ? void 0 : _c.customerNumber) ||
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
                    const deliveryParts = [];
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
                        align: col.align,
                    });
                    currentX += col.width;
                });
                doc
                    .moveTo(LEFT_X, tableY + headerHeight)
                    .lineTo(LEFT_X + tableWidth, tableY + headerHeight)
                    .lineWidth(0.8)
                    .strokeColor("#3F4446")
                    .stroke();
                const formatGermanNum = (numVal, decimals = 2) => {
                    const num = getSafeNumber(numVal);
                    const factor = Math.pow(10, decimals);
                    const rounded = Math.round((num + Number.EPSILON) * factor) / factor;
                    return rounded.toLocaleString("de-DE", {
                        minimumFractionDigits: decimals,
                        maximumFractionDigits: decimals,
                    });
                };
                doc.font(R).fontSize(8.5).fillColor("#3F4446");
                const getActivePrice = (lineItem, offerUsesUnitPrices) => {
                    if (offerUsesUnitPrices &&
                        lineItem.unitPrices &&
                        lineItem.unitPrices.length > 0) {
                        return lineItem.unitPrices.find((up) => up.isActive) || null;
                    }
                    else if (lineItem.quantityPrices &&
                        lineItem.quantityPrices.length > 0) {
                        return lineItem.quantityPrices.find((qp) => qp.isActive) || null;
                    }
                    return null;
                };
                let currentY = tableY + headerHeight;
                const vatRatePercent = getSafeNumber((_d = offer.taxRate) !== null && _d !== void 0 ? _d : 19);
                if (offer.lineItems && Array.isArray(offer.lineItems)) {
                    const customerItems = offer.lineItems.filter((item) => !item.isComponent);
                    customerItems.forEach((item, rowIndex) => {
                        var _a, _b;
                        let qtyStr = "1";
                        let unitPriceNum = 0;
                        let netTotalNum = 0;
                        if (offer.pricingMode === "matrix" && ((_a = item.priceMatrix) === null || _a === void 0 ? void 0 : _a.length)) {
                            const active = item.priceMatrix.find((p) => p.isActive);
                            if (active) {
                                qtyStr = String(active.quantity);
                                unitPriceNum = getSafeNumber(active.price);
                                netTotalNum = getSafeNumber(active.total);
                            }
                        }
                        else {
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
                        if (offer.pricingMode === "matrix" && ((_b = item.priceMatrix) === null || _b === void 0 ? void 0 : _b.length) > 1) {
                            nameText += "\nStaffelpreise:";
                            item.priceMatrix.slice(0, 4).forEach((p) => {
                                const activeMark = p.isActive ? " (*)" : "";
                                const priceLabel = p.price === null
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
                            drawCustomerSvgBackground(doc);
                            const newTableY = MM(30);
                            doc.font(SB).fontSize(8).fillColor("#3F4446");
                            let tempX = LEFT_X;
                            columns.forEach((col) => {
                                doc.text(col.header, tempX + 3, newTableY + 6, {
                                    width: col.width - 6,
                                    align: col.align,
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
                                align: columns[colIndex].align,
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
                    drawCustomerSvgBackground(doc);
                    yPos = MM(30);
                }
                const TOTALS_LABEL_X = MM(115);
                const TOTALS_VAL_X = MM(158);
                const TOTALS_VAL_W = MM(34);
                doc.font(R).fontSize(9.5).fillColor("#3F4446");
                doc.font(M).text("Gesamtpreis Netto", TOTALS_LABEL_X, yPos);
                doc
                    .font(M)
                    .text(`${formatGermanNum(totals.subtotal, 2)} ${offer.currency || "EUR"}`, TOTALS_VAL_X, yPos, { align: "right", width: TOTALS_VAL_W });
                if (Number(totals.discountAmount || 0) > 0) {
                    yPos += 16;
                    doc
                        .font(R)
                        .text(`Rabatt (${offer.discountPercentage || 0}%)`, TOTALS_LABEL_X, yPos);
                    doc
                        .font(R)
                        .text(`-${formatGermanNum(totals.discountAmount, 2)} ${offer.currency || "EUR"}`, TOTALS_VAL_X, yPos, { align: "right", width: TOTALS_VAL_W });
                }
                if (Number(totals.shippingCost || 0) > 0) {
                    yPos += 16;
                    doc.font(R).text("Versandkosten", TOTALS_LABEL_X, yPos);
                    doc
                        .font(R)
                        .text(`${formatGermanNum(totals.shippingCost, 2)} ${offer.currency || "EUR"}`, TOTALS_VAL_X, yPos, { align: "right", width: TOTALS_VAL_W });
                }
                const taxRatePercent = offer.taxRate ? Number(offer.taxRate) : 19;
                yPos += 16;
                doc
                    .font(R)
                    .text(`MwSt. ${formatGermanNum(taxRatePercent, 2)}%`, TOTALS_LABEL_X, yPos);
                doc
                    .font(R)
                    .text(`${formatGermanNum(totals.taxAmount, 2)} ${offer.currency || "EUR"}`, TOTALS_VAL_X, yPos, { align: "right", width: TOTALS_VAL_W });
                yPos += 22;
                const bruttoBoxX = TOTALS_LABEL_X - 6;
                const bruttoBoxW = TOTALS_VAL_X + TOTALS_VAL_W - bruttoBoxX + 4;
                doc.rect(bruttoBoxX, yPos - 4, bruttoBoxW, 20).fill("#D1D5DB");
                doc.font(SB).fontSize(10).fillColor("#3F4446");
                doc.text("Gesamtpreis Brutto", TOTALS_LABEL_X, yPos);
                doc.text(`${formatGermanNum(totals.totalAmount, 2)} ${offer.currency || "EUR"}`, TOTALS_VAL_X, yPos, { align: "right", width: TOTALS_VAL_W });
                yPos += 35;
                let notesHeight = 15;
                if (offer.paymentTerms)
                    notesHeight += 15;
                if (offer.paymentMethod)
                    notesHeight += 15;
                if (offer.notes) {
                    notesHeight +=
                        doc.heightOfString(`Hinweise: ${offer.notes}`, {
                            width: CONTENT_WIDTH,
                        }) + 5;
                }
                if (yPos + notesHeight > MM(265)) {
                    doc.addPage();
                    drawCustomerSvgBackground(doc);
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
                yield pdfWritePromise;
                try {
                    offer.pdfPath = `/uploads/offers/${pdfFileName}`;
                    offer.pdfGenerated = true;
                    offer.pdfGeneratedAt = new Date();
                    yield this.offerRepository.save(offer);
                }
                catch (dbError) {
                    console.warn("Database update failed but PDF was created:", dbError);
                }
                response.setHeader("Content-Type", "application/pdf");
                response.setHeader("Content-Disposition", `attachment; filename="${pdfFileName}"`);
                const fileStream = fs_1.default.createReadStream(pdfPath);
                fileStream.pipe(response);
            }
            catch (error) {
                console.error("Error generating PDF:", error);
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
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                if (!id || !uuidRegex.test(id)) {
                    console.error(`[PDF Error] Blocked invalid UUID: "${id}"`);
                    return response.status(400).json({
                        success: false,
                        message: "Invalid Offer ID format. The request never reached the database to prevent a crash.",
                    });
                }
                return this.generatePdf(request, response);
            }
            catch (error) {
                console.error("Fatal Controller Error:", error);
                if (!response.headersSent) {
                    return response.status(500).json({
                        success: false,
                        message: "Internal server error during PDF generation",
                        details: error.message,
                    });
                }
            }
        });
    }
    // ==========================================================================
    // Linked documents (orders / invoices / invoice corrections / delivery
    // notes) tied to this offer. Returns an empty-but-valid shape until the
    // Order/Invoice/DeliveryNote entities are wired in here — the frontend
    // already handles an empty result gracefully.
    // ==========================================================================
    getLinkedDocuments(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
                const offer = yield this.offerRepository.findOne({ where: { id } });
                if (!offer) {
                    return response
                        .status(404)
                        .json({ success: false, message: "Offer not found" });
                }
                // TODO: replace with real queries once Order / Invoice / DeliveryNote
                // repositories are available, e.g. filtering by offer.id or
                // offer.offerNumber.
                return response.status(200).json({
                    success: true,
                    data: {
                        orders: [],
                        invoices: [],
                        invoiceCorrections: [],
                        deliveryNotes: [],
                    },
                });
            }
            catch (error) {
                console.error("Error fetching linked documents:", error);
                return response.status(500).json({
                    success: false,
                    message: "Internal server error",
                });
            }
        });
    }
    deleteOffer(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = request.params;
                const offer = yield this.offerRepository.findOne({ where: { id } });
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
                return response.status(200).json({ success: true, data: statuses });
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
                return response.status(200).json({ success: true, data: currencies });
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
    getPaymentMethods(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
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
            }
            catch (error) {
                console.error("Error fetching payment methods:", error);
                return response
                    .status(500)
                    .json({ success: false, message: "Internal server error" });
            }
        });
    }
    getShippingMethods(request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const methods = [
                    { value: "Standard shipping", label: "Standard shipping" },
                    { value: "Express shipping", label: "Express shipping" },
                    { value: "Freight", label: "Freight" },
                    { value: "Courier", label: "Courier" },
                    { value: "Pickup", label: "Pickup" },
                ];
                return response.status(200).json({ success: true, data: methods });
            }
            catch (error) {
                console.error("Error fetching shipping methods:", error);
                return response
                    .status(500)
                    .json({ success: false, message: "Internal server error" });
            }
        });
    }
    buildItemSnapshot(item) {
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
exports.OfferController = OfferController;

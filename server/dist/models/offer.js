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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfferLineItem = exports.Offer = void 0;
const typeorm_1 = require("typeorm");
const inquiry_1 = require("./inquiry");
let Offer = class Offer {
    generateOfferNumber() {
        if (!this.offerNumber) {
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const random = Math.floor(Math.random() * 1000)
                .toString()
                .padStart(3, "0");
            this.offerNumber = `OFF-${year}${month}${day}-${random}`;
        }
    }
    calculateTotals() {
        if (this.lineItems && this.lineItems.length > 0) {
            this.subtotal = this.lineItems.reduce((sum, item) => {
                if (this.useUnitPrices &&
                    item.unitPrices &&
                    item.unitPrices.length > 0) {
                    const activeUnitPrice = item.unitPrices.find((up) => up.isActive);
                    if (activeUnitPrice) {
                        return sum + (activeUnitPrice.totalPrice || 0);
                    }
                }
                else if (item.quantityPrices && item.quantityPrices.length > 0) {
                    const activePrice = item.quantityPrices.find((qp) => qp.isActive);
                    if (activePrice) {
                        return sum + (activePrice.total || 0);
                    }
                }
                else if (item.basePrice && item.baseQuantity) {
                    const quantity = parseFloat(item.baseQuantity) || 1;
                    return sum + item.basePrice * quantity;
                }
                return sum + (item.lineTotal || 0);
            }, 0);
        }
        if (this.discountPercentage > 0) {
            this.discountAmount = (this.subtotal * this.discountPercentage) / 100;
        }
        const taxableAmount = this.subtotal - this.discountAmount + (this.shippingCost || 0);
        this.taxAmount = taxableAmount * 0.19;
        this.totalAmount = taxableAmount + this.taxAmount;
    }
    initializeDefaultUnitPrices() {
        if (this.useUnitPrices && !this.defaultUnitPrices) {
            this.defaultUnitPrices = [
                {
                    id: `unit-price-default-1-${Date.now()}`,
                    quantity: "1000",
                    unitPrice: 0,
                    totalPrice: 0,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: `unit-price-default-2-${Date.now()}`,
                    quantity: "5000",
                    unitPrice: 0,
                    totalPrice: 0,
                    isActive: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: `unit-price-default-3-${Date.now()}`,
                    quantity: "10000",
                    unitPrice: 0,
                    totalPrice: 0,
                    isActive: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
        }
    }
    getActiveUnitPrice() {
        if (this.useUnitPrices &&
            this.defaultUnitPrices &&
            this.defaultUnitPrices.length > 0) {
            return this.defaultUnitPrices.find((up) => up.isActive) || null;
        }
        return null;
    }
    updateLineItemsForUnitPricing() {
        if (!this.lineItems)
            return;
        this.lineItems.forEach((lineItem) => {
            if (this.useUnitPrices &&
                (!lineItem.unitPrices || lineItem.unitPrices.length === 0)) {
                lineItem.unitPrices = this.defaultUnitPrices
                    ? JSON.parse(JSON.stringify(this.defaultUnitPrices)) // Deep copy
                    : [];
            }
            lineItem.calculateLineTotal(this.useUnitPrices);
        });
    }
    constructor(partial) {
        if (partial) {
            Object.assign(this, partial);
        }
    }
};
exports.Offer = Offer;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Offer.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, unique: true }),
    __metadata("design:type", String)
], Offer.prototype, "offerNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255 }),
    __metadata("design:type", String)
], Offer.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => inquiry_1.Inquiry, (inquiry) => inquiry.offers, {
        nullable: false,
        onDelete: "CASCADE",
    }),
    (0, typeorm_1.JoinColumn)({ name: "inquiry_id" }),
    __metadata("design:type", inquiry_1.Inquiry)
], Offer.prototype, "inquiry", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "inquiry_id" }),
    __metadata("design:type", String)
], Offer.prototype, "inquiryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Object)
], Offer.prototype, "inquirySnapshot", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: false }),
    __metadata("design:type", Object)
], Offer.prototype, "customerSnapshot", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Object)
], Offer.prototype, "deliveryAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: [
            "Draft",
            "Submitted",
            "Negotiation",
            "Accepted",
            "Rejected",
            "Expired",
            "Cancelled",
        ],
        default: "Draft",
    }),
    __metadata("design:type", String)
], Offer.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "date", nullable: true }),
    __metadata("design:type", Date)
], Offer.prototype, "validUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Offer.prototype, "termsConditions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Offer.prototype, "deliveryTerms", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Offer.prototype, "paymentTerms", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], Offer.prototype, "deliveryTime", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ["RMB", "HKD", "EUR", "USD"],
        default: "EUR",
    }),
    __metadata("design:type", String)
], Offer.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "decimal",
        precision: 10,
        scale: 2,
        default: 0,
        nullable: true,
    }),
    __metadata("design:type", Number)
], Offer.prototype, "discountPercentage", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "decimal",
        precision: 10,
        scale: 2,
        default: 0,
        nullable: true,
    }),
    __metadata("design:type", Number)
], Offer.prototype, "discountAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", Number)
], Offer.prototype, "subtotal", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "decimal",
        precision: 12,
        scale: 2,
        default: 0,
        nullable: true,
    }),
    __metadata("design:type", Number)
], Offer.prototype, "shippingCost", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Offer.prototype, "taxAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Offer.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Offer.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Offer.prototype, "internalNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], Offer.prototype, "isAssembly", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], Offer.prototype, "assemblyName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Offer.prototype, "assemblyDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Offer.prototype, "assemblyNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], Offer.prototype, "useUnitPrices", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", default: 3, nullable: true }),
    __metadata("design:type", Number)
], Offer.prototype, "unitPriceDecimalPlaces", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", default: 2, nullable: true }),
    __metadata("design:type", Number)
], Offer.prototype, "totalPriceDecimalPlaces", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", default: 3, nullable: true }),
    __metadata("design:type", Number)
], Offer.prototype, "maxUnitPriceColumns", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Array)
], Offer.prototype, "defaultUnitPrices", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Offer.prototype, "pdfPath", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], Offer.prototype, "pdfGenerated", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], Offer.prototype, "pdfGeneratedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Offer.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Offer.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", default: 1 }),
    __metadata("design:type", Number)
], Offer.prototype, "revision", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], Offer.prototype, "previousOfferNumber", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => OfferLineItem, (lineItem) => lineItem.offer, {
        cascade: true,
        eager: true,
    }),
    __metadata("design:type", Array)
], Offer.prototype, "lineItems", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Offer.prototype, "generateOfferNumber", null);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    (0, typeorm_1.BeforeUpdate)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Offer.prototype, "calculateTotals", null);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Offer.prototype, "initializeDefaultUnitPrices", null);
exports.Offer = Offer = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], Offer);
let OfferLineItem = class OfferLineItem {
    calculateLineTotal(useUnitPrices) {
        var _a;
        const shouldUseUnitPrices = useUnitPrices !== undefined
            ? useUnitPrices
            : ((_a = this.offer) === null || _a === void 0 ? void 0 : _a.useUnitPrices) || false;
        if (shouldUseUnitPrices && this.unitPrices && this.unitPrices.length > 0) {
            const activeUnitPrice = this.unitPrices.find((up) => up.isActive);
            if (activeUnitPrice) {
                this.lineTotal = activeUnitPrice.totalPrice || 0;
                return;
            }
        }
        if (this.quantityPrices && this.quantityPrices.length > 0) {
            const activePrice = this.quantityPrices.find((qp) => qp.isActive);
            if (activePrice) {
                this.lineTotal = activePrice.total || 0;
                return;
            }
        }
        if (this.basePrice && this.baseQuantity) {
            const quantity = parseFloat(this.baseQuantity) || 1;
            this.lineTotal = this.basePrice * quantity;
        }
    }
    getActivePrice(useUnitPrices) {
        var _a;
        const shouldUseUnitPrices = useUnitPrices !== undefined
            ? useUnitPrices
            : ((_a = this.offer) === null || _a === void 0 ? void 0 : _a.useUnitPrices) || false;
        if (shouldUseUnitPrices && this.unitPrices && this.unitPrices.length > 0) {
            return this.unitPrices.find((up) => up.isActive) || null;
        }
        else if (this.quantityPrices && this.quantityPrices.length > 0) {
            return this.quantityPrices.find((qp) => qp.isActive) || null;
        }
        return null;
    }
    getActivePriceType(useUnitPrices) {
        const activePrice = this.getActivePrice(useUnitPrices);
        if (activePrice) {
            return "totalPrice" in activePrice ? "unit" : "quantity";
        }
        return null;
    }
    formatUnitPrice(price, offer) {
        const decimalPlaces = (offer === null || offer === void 0 ? void 0 : offer.unitPriceDecimalPlaces) || 3;
        if (isNaN(price) || !isFinite(price)) {
            return `0.${"0".repeat(decimalPlaces)}`;
        }
        return price.toFixed(decimalPlaces);
    }
    formatTotalPrice(price, offer) {
        const decimalPlaces = (offer === null || offer === void 0 ? void 0 : offer.totalPriceDecimalPlaces) || 2;
        if (isNaN(price) || !isFinite(price)) {
            return `0.${"0".repeat(decimalPlaces)}`;
        }
        return price.toFixed(decimalPlaces);
    }
    syncUnitPricesWithOffer(offer) {
        if (offer.useUnitPrices && offer.defaultUnitPrices) {
            this.unitPrices = JSON.parse(JSON.stringify(offer.defaultUnitPrices));
            if (this.unitPrices && this.unitPrices.length > 0) {
                const existingPrices = this.unitPrices || [];
                this.unitPrices.forEach((newUp, index) => {
                    const existingUp = existingPrices.find((up) => up.quantity === newUp.quantity);
                    if (existingUp) {
                        newUp.unitPrice = existingUp.unitPrice;
                        newUp.totalPrice = existingUp.totalPrice;
                    }
                });
            }
        }
    }
    constructor(partial) {
        if (partial) {
            Object.assign(this, partial);
        }
    }
};
exports.OfferLineItem = OfferLineItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], OfferLineItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Offer, (offer) => offer.lineItems, {
        nullable: false,
        onDelete: "CASCADE",
    }),
    (0, typeorm_1.JoinColumn)({ name: "offer_id" }),
    __metadata("design:type", Offer)
], OfferLineItem.prototype, "offer", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "offer_id" }),
    __metadata("design:type", String)
], OfferLineItem.prototype, "offerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], OfferLineItem.prototype, "isEstimated", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "requested_item_id", nullable: true }),
    __metadata("design:type", String)
], OfferLineItem.prototype, "requestedItemId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255 }),
    __metadata("design:type", String)
], OfferLineItem.prototype, "itemName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], OfferLineItem.prototype, "material", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], OfferLineItem.prototype, "specification", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], OfferLineItem.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], OfferLineItem.prototype, "weight", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], OfferLineItem.prototype, "width", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], OfferLineItem.prototype, "height", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], OfferLineItem.prototype, "length", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], OfferLineItem.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Array)
], OfferLineItem.prototype, "unitPrices", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 12, scale: 3, nullable: true }),
    __metadata("design:type", Number)
], OfferLineItem.prototype, "purchasePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ["RMB", "HKD", "EUR", "USD"],
        nullable: true,
    }),
    __metadata("design:type", String)
], OfferLineItem.prototype, "purchaseCurrency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Array)
], OfferLineItem.prototype, "quantityPrices", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], OfferLineItem.prototype, "baseQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 3, nullable: true }),
    __metadata("design:type", Number)
], OfferLineItem.prototype, "basePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 3, nullable: true }),
    __metadata("design:type", Number)
], OfferLineItem.prototype, "samplePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], OfferLineItem.prototype, "sampleQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], OfferLineItem.prototype, "lineTotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", default: 1 }),
    __metadata("design:type", Number)
], OfferLineItem.prototype, "position", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], OfferLineItem.prototype, "isAssemblyItem", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], OfferLineItem.prototype, "isComponent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "parent_item_id", nullable: true }),
    __metadata("design:type", String)
], OfferLineItem.prototype, "parentItemId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], OfferLineItem.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], OfferLineItem.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], OfferLineItem.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    (0, typeorm_1.BeforeUpdate)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", void 0)
], OfferLineItem.prototype, "calculateLineTotal", null);
exports.OfferLineItem = OfferLineItem = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], OfferLineItem);

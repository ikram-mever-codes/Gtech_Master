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
const uuid_1 = require("uuid");
const inquiry_1 = require("./inquiry");
const numeric_transformer_1 = require("../utils/numeric-transformer");
const decimal_1 = require("../utils/decimal");
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
        var _a;
        if (this.lineItems && this.lineItems.length > 0) {
            this.subtotal = this.lineItems.reduce((sum, item) => {
                if (item.isComponent)
                    return sum;
                return sum + (item.getLineTotal(this.pricingMode) || 0);
            }, 0);
        }
        if (this.discountPercentage > 0) {
            this.discountAmount = (this.subtotal * this.discountPercentage) / 100;
        }
        const taxableAmount = this.subtotal - this.discountAmount + (this.shippingCost || 0);
        const rate = ((_a = this.taxRate) !== null && _a !== void 0 ? _a : 19) / 100;
        this.taxAmount = taxableAmount * rate;
        this.totalAmount = taxableAmount + this.taxAmount;
    }
    initializeDefaultPriceMatrix() {
        if (this.pricingMode === "matrix" && !this.defaultPriceMatrix) {
            const now = new Date();
            this.defaultPriceMatrix = ["1000", "5000", "10000"].map((q, i) => ({
                id: (0, uuid_1.v4)(),
                quantity: q,
                price: null,
                total: null,
                isActive: i === 0,
                createdAt: now,
                updatedAt: now,
            }));
        }
    }
    getActiveDefaultTier() {
        var _a;
        if (this.pricingMode === "matrix" && ((_a = this.defaultPriceMatrix) === null || _a === void 0 ? void 0 : _a.length)) {
            return this.defaultPriceMatrix.find((t) => t.isActive) || null;
        }
        return null;
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
    (0, typeorm_1.Column)({ type: "varchar", length: 20, default: "inquiry" }),
    __metadata("design:type", String)
], Offer.prototype, "sourceType", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => inquiry_1.Inquiry, (inquiry) => inquiry.offers, {
        nullable: true,
        onDelete: "SET NULL",
    }),
    (0, typeorm_1.JoinColumn)({ name: "inquiry_id" }),
    __metadata("design:type", Object)
], Offer.prototype, "inquiry", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "inquiry_id", nullable: true }),
    __metadata("design:type", Object)
], Offer.prototype, "inquiryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Object)
], Offer.prototype, "inquirySnapshot", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "item_id", type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", Object)
], Offer.prototype, "itemId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Object)
], Offer.prototype, "itemSnapshot", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "customer_id", type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", Object)
], Offer.prototype, "customerId", void 0);
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
], Offer.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], Offer.prototype, "shippingMethod", void 0);
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
    (0, typeorm_1.Column)({ type: "varchar", length: 20, default: "classic" }),
    __metadata("design:type", String)
], Offer.prototype, "pricingMode", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "decimal",
        precision: 5,
        scale: 2,
        default: 19,
        transformer: numeric_transformer_1.numericTransformer,
    }),
    __metadata("design:type", Number)
], Offer.prototype, "taxRate", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "decimal",
        precision: 10,
        scale: 2,
        default: 0,
        nullable: true,
        transformer: numeric_transformer_1.numericTransformer,
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
        transformer: numeric_transformer_1.numericTransformer,
    }),
    __metadata("design:type", Number)
], Offer.prototype, "discountAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "decimal",
        precision: 12,
        scale: 2,
        default: 0,
        nullable: true,
        transformer: numeric_transformer_1.numericTransformer,
    }),
    __metadata("design:type", Number)
], Offer.prototype, "subtotal", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "decimal",
        precision: 12,
        scale: 2,
        default: 0,
        nullable: true,
        transformer: numeric_transformer_1.numericTransformer,
    }),
    __metadata("design:type", Number)
], Offer.prototype, "shippingCost", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "decimal",
        precision: 12,
        scale: 2,
        default: 0,
        transformer: numeric_transformer_1.numericTransformer,
    }),
    __metadata("design:type", Number)
], Offer.prototype, "taxAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "decimal",
        precision: 12,
        scale: 2,
        default: 0,
        transformer: numeric_transformer_1.numericTransformer,
    }),
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
    (0, typeorm_1.Column)({ type: "varchar", length: 20, nullable: true }),
    __metadata("design:type", String)
], Offer.prototype, "highlightColor", void 0);
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
], Offer.prototype, "defaultPriceMatrix", void 0);
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
], Offer.prototype, "initializeDefaultPriceMatrix", null);
exports.Offer = Offer = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], Offer);
let OfferLineItem = class OfferLineItem {
    calculateLineTotal(pricingMode) {
        var _a;
        const mode = pricingMode || ((_a = this.offer) === null || _a === void 0 ? void 0 : _a.pricingMode) || "classic";
        if (mode === "matrix" && this.priceMatrix && this.priceMatrix.length > 0) {
            const active = this.priceMatrix.find((p) => p.isActive);
            if (active && active.total !== null) {
                this.lineTotal = active.total;
                return;
            }
        }
        const price = Number(this.basePrice) || 0;
        const quantity = (0, decimal_1.parseFlexibleNumber)(this.baseQuantity) || 1;
        this.lineTotal = price * quantity;
    }
    getLineTotal(pricingMode) {
        this.calculateLineTotal(pricingMode);
        return this.lineTotal || 0;
    }
    getActiveMatrixEntry() {
        return (this.priceMatrix || []).find((p) => p.isActive) || null;
    }
    formatPrice(price, decimals = 3) {
        if (price === null || price === undefined)
            return ".";
        return price.toFixed(decimals);
    }
    formatTotalPrice(price, decimals = 2) {
        if (isNaN(price) || !isFinite(price))
            return `0.${"0".repeat(decimals)}`;
        return price.toFixed(decimals);
    }
    /** Applies the offer's tier template to this line, keeping any already-entered prices for matching tiers. */
    syncPriceMatrixWithOffer(offer) {
        if (offer.pricingMode === "matrix" && offer.defaultPriceMatrix) {
            const existing = this.priceMatrix || [];
            this.priceMatrix = offer.defaultPriceMatrix.map((tpl) => {
                const match = existing.find((e) => e.quantity === tpl.quantity);
                return match
                    ? Object.assign(Object.assign({}, tpl), { price: match.price, total: match.total, isActive: match.isActive }) : Object.assign({}, tpl);
            });
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
    (0, typeorm_1.Column)({
        name: "source_item_id",
        type: "varchar",
        length: 100,
        nullable: true,
    }),
    __metadata("design:type", String)
], OfferLineItem.prototype, "sourceItemId", void 0);
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
], OfferLineItem.prototype, "baseQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 12, scale: 3, nullable: true }),
    __metadata("design:type", Number)
], OfferLineItem.prototype, "basePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Array)
], OfferLineItem.prototype, "priceMatrix", void 0);
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
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OfferLineItem.prototype, "calculateLineTotal", null);
exports.OfferLineItem = OfferLineItem = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], OfferLineItem);

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
exports.Inquiry = exports.DeliveryAddress = void 0;
const typeorm_1 = require("typeorm");
const customers_1 = require("./customers");
const contact_person_1 = require("./contact_person");
const requested_items_1 = require("./requested_items");
const offer_1 = require("./offer");
let DeliveryAddress = class DeliveryAddress {
    constructor(partial) {
        if (partial) {
            Object.assign(this, partial);
        }
    }
};
exports.DeliveryAddress = DeliveryAddress;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], DeliveryAddress.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], DeliveryAddress.prototype, "street", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], DeliveryAddress.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], DeliveryAddress.prototype, "state", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 20, nullable: true }),
    __metadata("design:type", String)
], DeliveryAddress.prototype, "postalCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], DeliveryAddress.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], DeliveryAddress.prototype, "additionalInfo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], DeliveryAddress.prototype, "contactName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, nullable: true }),
    __metadata("design:type", String)
], DeliveryAddress.prototype, "contactPhone", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], DeliveryAddress.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], DeliveryAddress.prototype, "updatedAt", void 0);
exports.DeliveryAddress = DeliveryAddress = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], DeliveryAddress);
let Inquiry = class Inquiry {
    constructor(partial) {
        if (partial) {
            Object.assign(this, partial);
        }
    }
};
exports.Inquiry = Inquiry;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Inquiry.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255 }),
    __metadata("design:type", String)
], Inquiry.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Inquiry.prototype, "image", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], Inquiry.prototype, "isAssembly", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], Inquiry.prototype, "isEstimated", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Inquiry.prototype, "assemblyInstructions", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "decimal",
        precision: 12,
        scale: 2,
        nullable: true,
        comment: "Purchase price for assembly inquiries only",
    }),
    __metadata("design:type", Number)
], Inquiry.prototype, "purchasePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ["RMB", "HKD", "EUR", "USD"],
        default: "RMB",
        comment: "Currency for purchase price",
        nullable: true,
    }),
    __metadata("design:type", String)
], Inquiry.prototype, "purchasePriceCurrency", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => customers_1.Customer, (customer) => customer.inquiries, {
        nullable: false,
        onDelete: "CASCADE",
    }),
    (0, typeorm_1.JoinColumn)({ name: "customer_id" }),
    __metadata("design:type", customers_1.Customer)
], Inquiry.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "customer_id" }),
    __metadata("design:type", String)
], Inquiry.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => contact_person_1.ContactPerson, {
        nullable: true,
        onDelete: "SET NULL",
    }),
    (0, typeorm_1.JoinColumn)({ name: "contact_person_id" }),
    __metadata("design:type", contact_person_1.ContactPerson)
], Inquiry.prototype, "contactPerson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "contact_person_id", nullable: true }),
    __metadata("design:type", String)
], Inquiry.prototype, "contactPersonId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => requested_items_1.RequestedItem, (request) => request.inquiry, {
        cascade: true,
    }),
    __metadata("design:type", Array)
], Inquiry.prototype, "requests", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], Inquiry.prototype, "weight", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], Inquiry.prototype, "width", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], Inquiry.prototype, "height", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], Inquiry.prototype, "length", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Inquiry.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: [
            "Draft",
            "Submitted",
            "In Review",
            "Quoted",
            "Negotiation",
            "Accepted",
            "Rejected",
            "Cancelled",
        ],
        default: "Draft",
    }),
    __metadata("design:type", String)
], Inquiry.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 12, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Inquiry.prototype, "totalEstimatedCost", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ["Low", "Medium", "High", "Urgent"],
        default: "Medium",
    }),
    __metadata("design:type", String)
], Inquiry.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], Inquiry.prototype, "referenceNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "date", nullable: true }),
    __metadata("design:type", Date)
], Inquiry.prototype, "requiredByDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Inquiry.prototype, "internalNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Inquiry.prototype, "termsConditions", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Inquiry.prototype, "isFragile", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Inquiry.prototype, "requiresSpecialHandling", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Inquiry.prototype, "handlingInstructions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], Inquiry.prototype, "numberOfPackages", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Inquiry.prototype, "packageType", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => offer_1.Offer, (offer) => offer.inquiry, {
        cascade: false,
    }),
    __metadata("design:type", Array)
], Inquiry.prototype, "offers", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 500, nullable: true }),
    __metadata("design:type", String)
], Inquiry.prototype, "projectLink", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Inquiry.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Inquiry.prototype, "updatedAt", void 0);
exports.Inquiry = Inquiry = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], Inquiry);

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
exports.RequestedItem = void 0;
const typeorm_1 = require("typeorm");
const star_business_details_1 = require("./star_business_details");
const contact_person_1 = require("./contact_person");
const inquiry_1 = require("./inquiry");
const tags_1 = require("./tags");
const parents_1 = require("./parents");
const tarics_1 = require("./tarics");
const categories_1 = require("./categories");
const suppliers_1 = require("./suppliers");
let RequestedItem = class RequestedItem {
    constructor(partial) {
        if (partial) {
            Object.assign(this, partial);
        }
    }
};
exports.RequestedItem = RequestedItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], RequestedItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => star_business_details_1.StarBusinessDetails, (business) => business.requestedItems, {
        nullable: false,
        onDelete: "CASCADE",
    }),
    (0, typeorm_1.JoinColumn)({ name: "business_id" }),
    __metadata("design:type", star_business_details_1.StarBusinessDetails)
], RequestedItem.prototype, "business", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "business_id" }),
    __metadata("design:type", String)
], RequestedItem.prototype, "businessId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "contact_person_id", nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "contactPersonId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255 }),
    __metadata("design:type", String)
], RequestedItem.prototype, "itemName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "itemNo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "material", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "specification", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ["YES", "NO"],
        default: "NO",
    }),
    __metadata("design:type", String)
], RequestedItem.prototype, "extraItems", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "extraItemsDescriptions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100 }),
    __metadata("design:type", String)
], RequestedItem.prototype, "qty", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ["Monatlich", "2 monatlich", "Quartal", "halbjährlich", "jährlich"],
        default: "Monatlich",
    }),
    __metadata("design:type", String)
], RequestedItem.prototype, "interval", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "sampleQty", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "expectedDelivery", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ["High", "Normal"],
        default: "Normal",
    }),
    __metadata("design:type", String)
], RequestedItem.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true, default: "Open" }),
    __metadata("design:type", String)
], RequestedItem.prototype, "requestStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], RequestedItem.prototype, "weight", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], RequestedItem.prototype, "width", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], RequestedItem.prototype, "height", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], RequestedItem.prototype, "length", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => contact_person_1.ContactPerson, (contactPerson) => contactPerson.requestedItems, {
        nullable: true,
        onDelete: "SET NULL",
    }),
    (0, typeorm_1.JoinColumn)({ name: "contact_person_id" }),
    __metadata("design:type", contact_person_1.ContactPerson)
], RequestedItem.prototype, "contactPerson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "comment", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "extraNote", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "asanaLink", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "decimal",
        precision: 12,
        scale: 2,
        nullable: true,
        comment: "Purchase price for this requested item",
    }),
    __metadata("design:type", Number)
], RequestedItem.prototype, "purchasePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "decimal",
        precision: 12,
        scale: 2,
        nullable: true,
        comment: "Target price for this requested item in EUR",
    }),
    __metadata("design:type", Number)
], RequestedItem.prototype, "targetPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "decimal",
        precision: 12,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Number)
], RequestedItem.prototype, "annualPotential", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "decimal",
        precision: 12,
        scale: 2,
        nullable: true,
    }),
    __metadata("design:type", Number)
], RequestedItem.prototype, "annualPotentialKEur", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ["RMB", "HKD", "EUR", "USD"],
        default: "RMB",
        comment: "Currency for the purchase price",
    }),
    __metadata("design:type", String)
], RequestedItem.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], RequestedItem.prototype, "isEstimated", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Array)
], RequestedItem.prototype, "qualityCriteria", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Array)
], RequestedItem.prototype, "attachments", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "taric", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "urgency1", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "urgency2", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Array)
], RequestedItem.prototype, "painPoints", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => inquiry_1.Inquiry, (inquiry) => inquiry.requests, {
        nullable: true,
        onDelete: "CASCADE",
    }),
    (0, typeorm_1.JoinColumn)({ name: "inquiry_id" }),
    __metadata("design:type", inquiry_1.Inquiry)
], RequestedItem.prototype, "inquiry", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], RequestedItem.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], RequestedItem.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => tags_1.Tag, (tag) => tag.requestedItems),
    (0, typeorm_1.JoinTable)({ name: "requested_item_tags" }),
    __metadata("design:type", Array)
], RequestedItem.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "tagOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "parent_id", nullable: true }),
    __metadata("design:type", Number)
], RequestedItem.prototype, "parent_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "model", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "ean", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "taric_id", nullable: true }),
    __metadata("design:type", Number)
], RequestedItem.prototype, "taric_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "item_name_cn", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "cat_id", nullable: true }),
    __metadata("design:type", Number)
], RequestedItem.prototype, "cat_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "remark", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "photo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "pix_path", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "pix_path_eBay", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 1, default: "N" }),
    __metadata("design:type", String)
], RequestedItem.prototype, "is_rmb_special", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 1, default: "N" }),
    __metadata("design:type", String)
], RequestedItem.prototype, "is_eur_special", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 1, default: "Y" }),
    __metadata("design:type", String)
], RequestedItem.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "supplier_id", nullable: true }),
    __metadata("design:type", Number)
], RequestedItem.prototype, "supplier_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], RequestedItem.prototype, "item_name_de", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => parents_1.Parent, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "parent_id" }),
    __metadata("design:type", Object)
], RequestedItem.prototype, "parent", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tarics_1.Taric, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "taric_id" }),
    __metadata("design:type", Object)
], RequestedItem.prototype, "taricRel", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => categories_1.Category, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "cat_id" }),
    __metadata("design:type", Object)
], RequestedItem.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => suppliers_1.Supplier, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "supplier_id" }),
    __metadata("design:type", Object)
], RequestedItem.prototype, "supplier", void 0);
exports.RequestedItem = RequestedItem = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], RequestedItem);

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
exports.Item = void 0;
const typeorm_1 = require("typeorm");
const parents_1 = require("./parents");
const tarics_1 = require("./tarics");
const categories_1 = require("./categories");
const order_items_1 = require("./order_items");
let Item = class Item {
};
exports.Item = Item;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Item.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Item.prototype, "parent_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Item.prototype, "ItemID_DE", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, nullable: true }),
    __metadata("design:type", String)
], Item.prototype, "parent_no_de", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 1, default: "N" }),
    __metadata("design:type", String)
], Item.prototype, "is_dimension_special", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], Item.prototype, "model", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 3, nullable: true }),
    __metadata("design:type", String)
], Item.prototype, "supp_cat", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "bigint", nullable: true }),
    __metadata("design:type", Number)
], Item.prototype, "ean", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Item.prototype, "taric_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], Item.prototype, "weight", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], Item.prototype, "width", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], Item.prototype, "height", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], Item.prototype, "length", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Item.prototype, "item_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Item.prototype, "item_name_cn", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 0, nullable: true }),
    __metadata("design:type", Number)
], Item.prototype, "FOQ", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 0, nullable: true }),
    __metadata("design:type", Number)
], Item.prototype, "FSQ", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 1, default: "Y" }),
    __metadata("design:type", String)
], Item.prototype, "is_qty_dividable", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Item.prototype, "ISBN", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Item.prototype, "cat_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Item.prototype, "remark", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Item.prototype, "RMB_Price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], Item.prototype, "photo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Item.prototype, "pix_path", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Item.prototype, "pix_path_eBay", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 1, default: "N" }),
    __metadata("design:type", String)
], Item.prototype, "is_npr", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], Item.prototype, "npr_remark", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Item.prototype, "many_components", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Item.prototype, "effort_rating", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 1, default: "N" }),
    __metadata("design:type", String)
], Item.prototype, "is_rmb_special", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 1, default: "N" }),
    __metadata("design:type", String)
], Item.prototype, "is_eur_special", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Item.prototype, "is_pu_item", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Item.prototype, "is_meter_item", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 1, default: "Y" }),
    __metadata("design:type", String)
], Item.prototype, "is_new", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 1, default: "Y" }),
    __metadata("design:type", String)
], Item.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 200, nullable: true }),
    __metadata("design:type", String)
], Item.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Item.prototype, "synced_at", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Item.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Item.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => parents_1.Parent, (parent) => parent.items, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "parent_id" }),
    __metadata("design:type", Object)
], Item.prototype, "parent", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tarics_1.Taric, (taric) => taric.items, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "taric_id" }),
    __metadata("design:type", Object)
], Item.prototype, "taric", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => categories_1.Category, (category) => category.items, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "cat_id" }),
    __metadata("design:type", Object)
], Item.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => order_items_1.OrderItem, orderItem => orderItem.item),
    __metadata("design:type", Array)
], Item.prototype, "orderItems", void 0);
exports.Item = Item = __decorate([
    (0, typeorm_1.Entity)()
], Item);

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
exports.WarehouseItem = void 0;
const typeorm_1 = require("typeorm");
let WarehouseItem = class WarehouseItem {
};
exports.WarehouseItem = WarehouseItem;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", Number)
], WarehouseItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], WarehouseItem.prototype, "item_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], WarehouseItem.prototype, "ItemID_DE", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 1, nullable: true }),
    __metadata("design:type", Number)
], WarehouseItem.prototype, "category_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 13, nullable: true }),
    __metadata("design:type", String)
], WarehouseItem.prototype, "ean", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], WarehouseItem.prototype, "item_no_de", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 500, nullable: true }),
    __metadata("design:type", String)
], WarehouseItem.prototype, "item_name_de", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 500, nullable: true }),
    __metadata("design:type", String)
], WarehouseItem.prototype, "item_name_en", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 1, default: "N" }),
    __metadata("design:type", String)
], WarehouseItem.prototype, "is_no_auto_order", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 1, default: "Y" }),
    __metadata("design:type", String)
], WarehouseItem.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], WarehouseItem.prototype, "stock_qty", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], WarehouseItem.prototype, "msq", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], WarehouseItem.prototype, "buffer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 1, default: "Y" }),
    __metadata("design:type", String)
], WarehouseItem.prototype, "is_stock_item", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 1, default: "Y" }),
    __metadata("design:type", String)
], WarehouseItem.prototype, "is_SnSI", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, nullable: true }),
    __metadata("design:type", String)
], WarehouseItem.prototype, "ship_class", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WarehouseItem.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], WarehouseItem.prototype, "updated_at", void 0);
exports.WarehouseItem = WarehouseItem = __decorate([
    (0, typeorm_1.Entity)()
], WarehouseItem);

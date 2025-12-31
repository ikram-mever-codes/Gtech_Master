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
exports.SupplierItem = void 0;
// src/entities/supplier_items.ts
const typeorm_1 = require("typeorm");
const suppliers_1 = require("./suppliers");
let SupplierItem = class SupplierItem {
};
exports.SupplierItem = SupplierItem;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", Number)
], SupplierItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SupplierItem.prototype, "item_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SupplierItem.prototype, "supplier_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 1, default: "Y" }),
    __metadata("design:type", String)
], SupplierItem.prototype, "is_default", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], SupplierItem.prototype, "moq", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], SupplierItem.prototype, "oi", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, nullable: true }) // FIXED: double precision → decimal
    ,
    __metadata("design:type", Number)
], SupplierItem.prototype, "price_rmb", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 1000, nullable: true }),
    __metadata("design:type", String)
], SupplierItem.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], SupplierItem.prototype, "note_cn", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, default: "No" }),
    __metadata("design:type", String)
], SupplierItem.prototype, "is_po", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], SupplierItem.prototype, "lead_time", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 25, nullable: true }),
    __metadata("design:type", String)
], SupplierItem.prototype, "updated_by", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => suppliers_1.Supplier, (supplier) => supplier.supplierItems),
    (0, typeorm_1.JoinColumn)({ name: "supplier_id" }),
    __metadata("design:type", suppliers_1.Supplier)
], SupplierItem.prototype, "supplier", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SupplierItem.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SupplierItem.prototype, "updated_at", void 0);
exports.SupplierItem = SupplierItem = __decorate([
    (0, typeorm_1.Entity)()
], SupplierItem);

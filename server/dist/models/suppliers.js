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
exports.Supplier = void 0;
const typeorm_1 = require("typeorm");
const supplier_items_1 = require("./supplier_items");
const parents_1 = require("./parents");
let Supplier = class Supplier {
};
exports.Supplier = Supplier;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Supplier.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 1 }),
    __metadata("design:type", Number)
], Supplier.prototype, "order_type_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "name_cn", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "company_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "extra_note", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], Supplier.prototype, "min_order_value", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 3, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "is_fully_prepared", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 2, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "is_tax_included", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 2, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "is_freight_included", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "province", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "street", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "full_address", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 150, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "contact_person", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 12, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "mobile", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 25, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 142, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "website", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 245, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "bank_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 45, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "account_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 45, nullable: true }),
    __metadata("design:type", String)
], Supplier.prototype, "beneficiary", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], Supplier.prototype, "deposit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], Supplier.prototype, "bbgd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], Supplier.prototype, "bagd", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 0, nullable: true }),
    __metadata("design:type", Number)
], Supplier.prototype, "percentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 0, nullable: true }),
    __metadata("design:type", Number)
], Supplier.prototype, "percentage2", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 0, nullable: true }),
    __metadata("design:type", Number)
], Supplier.prototype, "percentage3", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => supplier_items_1.SupplierItem, (supplierItem) => supplierItem.supplier),
    __metadata("design:type", Array)
], Supplier.prototype, "supplierItems", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => parents_1.Parent, (parent) => parent.supplier),
    __metadata("design:type", Array)
], Supplier.prototype, "parents", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Supplier, (supplier) => supplier.parents),
    (0, typeorm_1.JoinColumn)({ name: "supplier_id" }),
    __metadata("design:type", Supplier)
], Supplier.prototype, "supplier", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Supplier.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Supplier.prototype, "updated_at", void 0);
exports.Supplier = Supplier = __decorate([
    (0, typeorm_1.Entity)()
], Supplier);

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
exports.SupplierOrder = void 0;
const typeorm_1 = require("typeorm");
const suppliers_1 = require("./suppliers");
const categories_1 = require("./categories");
const order_items_1 = require("./order_items");
let SupplierOrder = class SupplierOrder {
};
exports.SupplierOrder = SupplierOrder;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], SupplierOrder.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Object)
], SupplierOrder.prototype, "supplier_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Object)
], SupplierOrder.prototype, "order_type_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 1, default: "N", nullable: true }),
    __metadata("design:type", String)
], SupplierOrder.prototype, "send2cargo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 20, nullable: true }),
    __metadata("design:type", String)
], SupplierOrder.prototype, "ref_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 1, default: "N" }),
    __metadata("design:type", String)
], SupplierOrder.prototype, "paid", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], SupplierOrder.prototype, "remark", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", default: 0 }),
    __metadata("design:type", Number)
], SupplierOrder.prototype, "is_po_created", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SupplierOrder.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SupplierOrder.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => suppliers_1.Supplier),
    (0, typeorm_1.JoinColumn)({ name: "supplier_id" }),
    __metadata("design:type", suppliers_1.Supplier)
], SupplierOrder.prototype, "supplier", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => categories_1.Category),
    (0, typeorm_1.JoinColumn)({ name: "order_type_id" }),
    __metadata("design:type", categories_1.Category)
], SupplierOrder.prototype, "order_type", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => order_items_1.OrderItem, (item) => item.supplier_order),
    __metadata("design:type", Array)
], SupplierOrder.prototype, "items", void 0);
exports.SupplierOrder = SupplierOrder = __decorate([
    (0, typeorm_1.Entity)("supplier_orders")
], SupplierOrder);

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
exports.OrderItem = void 0;
const typeorm_1 = require("typeorm");
const items_1 = require("./items");
const orders_1 = require("./orders");
const cargos_1 = require("./cargos");
const supplier_orders_1 = require("./supplier_orders");
let OrderItem = class OrderItem {
};
exports.OrderItem = OrderItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], OrderItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 25, nullable: true }),
    __metadata("design:type", String)
], OrderItem.prototype, "master_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "ItemID_DE", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "item_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "order_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "qty", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], OrderItem.prototype, "remark_de", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "qty_delivered", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "category_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "rmb_special_price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "eur_special_price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 10, nullable: true }),
    __metadata("design:type", String)
], OrderItem.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "taric_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "bigint", nullable: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "set_taric_code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 20, nullable: true }),
    __metadata("design:type", String)
], OrderItem.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], OrderItem.prototype, "remarks_cn", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], OrderItem.prototype, "problems", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "qty_label", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "qty_split", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "supplier_order_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], OrderItem.prototype, "ref_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], OrderItem.prototype, "cargo_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 1, nullable: true }),
    __metadata("design:type", String)
], OrderItem.prototype, "printed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], OrderItem.prototype, "cargo_date", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => items_1.Item, (item) => item.orderItems),
    (0, typeorm_1.JoinColumn)({ name: "item_id" }),
    __metadata("design:type", items_1.Item)
], OrderItem.prototype, "item", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => orders_1.Order, (order) => order.orderItems),
    (0, typeorm_1.JoinColumn)({ name: "order_id" }),
    __metadata("design:type", orders_1.Order)
], OrderItem.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => supplier_orders_1.SupplierOrder, (so) => so.items, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "supplier_order_id" }),
    __metadata("design:type", supplier_orders_1.SupplierOrder)
], OrderItem.prototype, "supplier_order", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => cargos_1.Cargo, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "cargo_id" }),
    __metadata("design:type", cargos_1.Cargo)
], OrderItem.prototype, "cargo", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], OrderItem.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], OrderItem.prototype, "updated_at", void 0);
exports.OrderItem = OrderItem = __decorate([
    (0, typeorm_1.Entity)()
], OrderItem);

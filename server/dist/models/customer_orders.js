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
exports.CustomerOrder = void 0;
const typeorm_1 = require("typeorm");
const order_items_1 = require("./order_items");
const categories_1 = require("./categories");
const suppliers_1 = require("./suppliers");
const cargos_1 = require("./cargos");
const customers_1 = require("./customers");
let CustomerOrder = class CustomerOrder {
};
exports.CustomerOrder = CustomerOrder;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], CustomerOrder.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, unique: true }),
    __metadata("design:type", String)
], CustomerOrder.prototype, "order_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid", nullable: true }),
    __metadata("design:type", String)
], CustomerOrder.prototype, "customer_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => customers_1.Customer, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "customer_id" }),
    __metadata("design:type", customers_1.Customer)
], CustomerOrder.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], CustomerOrder.prototype, "offer_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], CustomerOrder.prototype, "discount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 5, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], CustomerOrder.prototype, "discount_percent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 12, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], CustomerOrder.prototype, "subtotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 12, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], CustomerOrder.prototype, "total_amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], CustomerOrder.prototype, "is_fulfilled", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], CustomerOrder.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], CustomerOrder.prototype, "comment", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], CustomerOrder.prototype, "date_created", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], CustomerOrder.prototype, "date_emailed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], CustomerOrder.prototype, "date_delivery", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], CustomerOrder.prototype, "category_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => categories_1.Category),
    (0, typeorm_1.JoinColumn)({ name: "category_id", referencedColumnName: "id" }),
    __metadata("design:type", categories_1.Category)
], CustomerOrder.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], CustomerOrder.prototype, "supplier_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => suppliers_1.Supplier),
    (0, typeorm_1.JoinColumn)({ name: "supplier_id" }),
    __metadata("design:type", suppliers_1.Supplier)
], CustomerOrder.prototype, "supplier", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], CustomerOrder.prototype, "cargo_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => cargos_1.Cargo),
    (0, typeorm_1.JoinColumn)({ name: "cargo_id" }),
    __metadata("design:type", cargos_1.Cargo)
], CustomerOrder.prototype, "cargo", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => order_items_1.OrderItem, (orderItem) => orderItem.order),
    __metadata("design:type", Array)
], CustomerOrder.prototype, "orderItems", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CustomerOrder.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CustomerOrder.prototype, "updated_at", void 0);
exports.CustomerOrder = CustomerOrder = __decorate([
    (0, typeorm_1.Entity)({ name: "customer_orders" })
], CustomerOrder);

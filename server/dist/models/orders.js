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
exports.Order = void 0;
// src/entities/orders.ts
const typeorm_1 = require("typeorm");
const order_items_1 = require("./order_items");
const categories_1 = require("./categories");
const suppliers_1 = require("./suppliers");
let Order = class Order {
};
exports.Order = Order;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Order.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, unique: true }),
    __metadata("design:type", String)
], Order.prototype, "order_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, nullable: true }),
    __metadata("design:type", String)
], Order.prototype, "customer_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], Order.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Order.prototype, "comment", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], Order.prototype, "date_created", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], Order.prototype, "date_emailed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], Order.prototype, "date_delivery", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], Order.prototype, "category_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => categories_1.Category, (category) => category.orders),
    (0, typeorm_1.JoinColumn)({ name: "category_id", referencedColumnName: "id" }),
    __metadata("design:type", categories_1.Category)
], Order.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], Order.prototype, "supplier_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => suppliers_1.Supplier),
    (0, typeorm_1.JoinColumn)({ name: "supplier_id" }),
    __metadata("design:type", suppliers_1.Supplier)
], Order.prototype, "supplier", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => order_items_1.OrderItem, (orderItem) => orderItem.order),
    __metadata("design:type", Array)
], Order.prototype, "orderItems", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Order.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Order.prototype, "updated_at", void 0);
exports.Order = Order = __decorate([
    (0, typeorm_1.Entity)()
], Order);

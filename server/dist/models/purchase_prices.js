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
exports.PurchasePrice = void 0;
const typeorm_1 = require("typeorm");
const items_1 = require("./items");
const suppliers_1 = require("./suppliers");
let PurchasePrice = class PurchasePrice {
};
exports.PurchasePrice = PurchasePrice;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PurchasePrice.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], PurchasePrice.prototype, "item_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], PurchasePrice.prototype, "supplier_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, default: 1 }),
    __metadata("design:type", Number)
], PurchasePrice.prototype, "min_quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 4 }),
    __metadata("design:type", Number)
], PurchasePrice.prototype, "unit_price_cny", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 10, default: "RMB" }),
    __metadata("design:type", String)
], PurchasePrice.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => items_1.Item),
    (0, typeorm_1.JoinColumn)({ name: "item_id" }),
    __metadata("design:type", items_1.Item)
], PurchasePrice.prototype, "item", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => suppliers_1.Supplier),
    (0, typeorm_1.JoinColumn)({ name: "supplier_id" }),
    __metadata("design:type", suppliers_1.Supplier)
], PurchasePrice.prototype, "supplier", void 0);
exports.PurchasePrice = PurchasePrice = __decorate([
    (0, typeorm_1.Entity)("purchase_prices")
], PurchasePrice);

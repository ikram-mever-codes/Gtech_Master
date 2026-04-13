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
exports.SalesPrice = void 0;
const typeorm_1 = require("typeorm");
const items_1 = require("./items");
// Assuming you have a Customer entity, if not, use customer_id: number
// import { Customer } from "./customers";
let SalesPrice = class SalesPrice {
};
exports.SalesPrice = SalesPrice;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], SalesPrice.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SalesPrice.prototype, "item_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], SalesPrice.prototype, "customer_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, default: 1 }),
    __metadata("design:type", Number)
], SalesPrice.prototype, "min_quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 4 }),
    __metadata("design:type", Number)
], SalesPrice.prototype, "unit_price_eur", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => items_1.Item),
    (0, typeorm_1.JoinColumn)({ name: "item_id" }),
    __metadata("design:type", items_1.Item)
], SalesPrice.prototype, "item", void 0);
exports.SalesPrice = SalesPrice = __decorate([
    (0, typeorm_1.Entity)("sales_prices")
], SalesPrice);

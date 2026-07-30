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
exports.CompanyShippingAddress = void 0;
const typeorm_1 = require("typeorm");
const customers_1 = require("./customers");
const country_1 = require("./country");
let CompanyShippingAddress = class CompanyShippingAddress {
};
exports.CompanyShippingAddress = CompanyShippingAddress;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], CompanyShippingAddress.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => customers_1.Customer, (customer) => customer.shippingAddresses, {
        onDelete: "CASCADE",
        nullable: false,
    }),
    (0, typeorm_1.JoinColumn)({ name: "company_id" }),
    __metadata("design:type", customers_1.Customer)
], CompanyShippingAddress.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 150 }),
    __metadata("design:type", String)
], CompanyShippingAddress.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", Object)
], CompanyShippingAddress.prototype, "address_additional_line", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255 }),
    __metadata("design:type", String)
], CompanyShippingAddress.prototype, "street", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50 }),
    __metadata("design:type", String)
], CompanyShippingAddress.prototype, "postal_code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 150 }),
    __metadata("design:type", String)
], CompanyShippingAddress.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => country_1.Country, { nullable: true, onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)({ name: "country_id" }),
    __metadata("design:type", Object)
], CompanyShippingAddress.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], CompanyShippingAddress.prototype, "is_default", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CompanyShippingAddress.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CompanyShippingAddress.prototype, "updated_at", void 0);
exports.CompanyShippingAddress = CompanyShippingAddress = __decorate([
    (0, typeorm_1.Entity)({ name: "company_shipping_addresses" })
], CompanyShippingAddress);

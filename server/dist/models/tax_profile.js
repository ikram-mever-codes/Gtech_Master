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
exports.TaxProfile = void 0;
const typeorm_1 = require("typeorm");
<<<<<<< HEAD
const country_1 = require("./country");
=======
>>>>>>> 8f5804b02278fb456cf7e905aeaba4806ef9d96f
let TaxProfile = class TaxProfile {
    get rate() {
        return this.tax_rate;
    }
    set rate(value) {
        this.tax_rate = value;
    }
};
exports.TaxProfile = TaxProfile;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], TaxProfile.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 150 }),
    __metadata("design:type", String)
], TaxProfile.prototype, "name", void 0);
__decorate([
<<<<<<< HEAD
    (0, typeorm_1.ManyToOne)(() => country_1.Country, { nullable: true, onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)({ name: "country_id" }),
    __metadata("design:type", Object)
], TaxProfile.prototype, "country", void 0);
__decorate([
=======
>>>>>>> 8f5804b02278fb456cf7e905aeaba4806ef9d96f
    (0, typeorm_1.Column)({ type: "varchar", length: 150, nullable: true }),
    __metadata("design:type", Object)
], TaxProfile.prototype, "tax_case", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 5, scale: 2, default: 0.0 }),
    __metadata("design:type", Number)
], TaxProfile.prototype, "tax_rate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", Object)
], TaxProfile.prototype, "tax_code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", Object)
], TaxProfile.prototype, "revenue_account_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], TaxProfile.prototype, "requires_vat_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], TaxProfile.prototype, "requires_confirmed_vat_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: true }),
    __metadata("design:type", Boolean)
], TaxProfile.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], TaxProfile.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TaxProfile.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], TaxProfile.prototype, "updated_at", void 0);
exports.TaxProfile = TaxProfile = __decorate([
    (0, typeorm_1.Entity)()
], TaxProfile);

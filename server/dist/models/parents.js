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
exports.Parent = void 0;
// Updated parents.ts with proper nullable handling
const typeorm_1 = require("typeorm");
const items_1 = require("./items");
const tarics_1 = require("./tarics");
const suppliers_1 = require("./suppliers");
let Parent = class Parent {
};
exports.Parent = Parent;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", Number)
], Parent.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Parent.prototype, "taric_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Parent.prototype, "supplier_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Parent.prototype, "de_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 9, nullable: true }),
    __metadata("design:type", String)
], Parent.prototype, "de_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 1, default: "Y" }),
    __metadata("design:type", String)
], Parent.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 111, nullable: true }),
    __metadata("design:type", String)
], Parent.prototype, "name_de", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 80, nullable: true }),
    __metadata("design:type", String)
], Parent.prototype, "name_en", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], Parent.prototype, "name_cn", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 27, nullable: true }),
    __metadata("design:type", String)
], Parent.prototype, "var_de_1", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 23, nullable: true }),
    __metadata("design:type", String)
], Parent.prototype, "var_de_2", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 18, nullable: true }),
    __metadata("design:type", String)
], Parent.prototype, "var_de_3", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 25, nullable: true }),
    __metadata("design:type", String)
], Parent.prototype, "var_en_1", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 17, nullable: true }),
    __metadata("design:type", String)
], Parent.prototype, "var_en_2", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 18, nullable: true }),
    __metadata("design:type", String)
], Parent.prototype, "var_en_3", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 1, default: "N" }),
    __metadata("design:type", String)
], Parent.prototype, "is_NwV", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "smallint", default: 3 }),
    __metadata("design:type", Number)
], Parent.prototype, "parent_rank", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 1, default: "N" }),
    __metadata("design:type", String)
], Parent.prototype, "is_var_unilingual", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tarics_1.Taric, (taric) => taric.parents, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "taric_id" }),
    __metadata("design:type", Object)
], Parent.prototype, "taric", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => suppliers_1.Supplier, (supplier) => supplier.parents, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "supplier_id" }),
    __metadata("design:type", Object)
], Parent.prototype, "supplier", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => items_1.Item, (item) => item.parent),
    __metadata("design:type", Array)
], Parent.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Parent.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Parent.prototype, "updated_at", void 0);
exports.Parent = Parent = __decorate([
    (0, typeorm_1.Entity)()
], Parent);

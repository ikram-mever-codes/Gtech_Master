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
exports.Taric = void 0;
const typeorm_1 = require("typeorm");
const items_1 = require("./items");
const parents_1 = require("./parents");
let Taric = class Taric {
};
exports.Taric = Taric;
__decorate([
    (0, typeorm_1.PrimaryColumn)(),
    __metadata("design:type", Number)
], Taric.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 11, nullable: true }),
    __metadata("design:type", String)
], Taric.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "char", length: 1, default: "Y" }),
    __metadata("design:type", String)
], Taric.prototype, "reguler_artikel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Taric.prototype, "duty_rate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 132, nullable: true }),
    __metadata("design:type", String)
], Taric.prototype, "name_de", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Taric.prototype, "description_de", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], Taric.prototype, "name_en", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Taric.prototype, "description_en", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Taric.prototype, "name_cn", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => items_1.Item, (item) => item.taric),
    __metadata("design:type", Array)
], Taric.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => parents_1.Parent, (parent) => parent.taric),
    __metadata("design:type", Array)
], Taric.prototype, "parents", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Taric.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Taric.prototype, "updated_at", void 0);
exports.Taric = Taric = __decorate([
    (0, typeorm_1.Entity)()
], Taric);

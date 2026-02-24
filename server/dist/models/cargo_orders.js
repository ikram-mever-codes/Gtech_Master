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
exports.CargoOrder = void 0;
const typeorm_1 = require("typeorm");
const cargos_1 = require("./cargos");
const orders_1 = require("./orders");
let CargoOrder = class CargoOrder {
};
exports.CargoOrder = CargoOrder;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], CargoOrder.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int" }),
    __metadata("design:type", Number)
], CargoOrder.prototype, "cargo_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int" }),
    __metadata("design:type", Number)
], CargoOrder.prototype, "order_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => cargos_1.Cargo, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "cargo_id" }),
    __metadata("design:type", cargos_1.Cargo)
], CargoOrder.prototype, "cargo", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => orders_1.Order, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "order_id" }),
    __metadata("design:type", orders_1.Order)
], CargoOrder.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CargoOrder.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CargoOrder.prototype, "updated_at", void 0);
exports.CargoOrder = CargoOrder = __decorate([
    (0, typeorm_1.Entity)()
], CargoOrder);

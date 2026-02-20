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
exports.StarBusinessDetails = void 0;
const typeorm_1 = require("typeorm");
const customers_1 = require("./customers");
const users_1 = require("./users");
const contact_person_1 = require("./contact_person");
const requested_items_1 = require("./requested_items");
let StarBusinessDetails = class StarBusinessDetails {
    constructor(partial) {
        if (partial) {
            Object.assign(this, partial);
        }
    }
};
exports.StarBusinessDetails = StarBusinessDetails;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], StarBusinessDetails.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ["Yes", "No"],
        nullable: true,
    }),
    __metadata("design:type", String)
], StarBusinessDetails.prototype, "inSeries", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ["Yes", "No"],
        nullable: true,
    }),
    __metadata("design:type", String)
], StarBusinessDetails.prototype, "madeIn", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], StarBusinessDetails.prototype, "lastChecked", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ["manual", "AI"],
        nullable: true,
    }),
    __metadata("design:type", String)
], StarBusinessDetails.prototype, "checkedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StarBusinessDetails.prototype, "device", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], StarBusinessDetails.prototype, "converted_timestamp", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => users_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "check_by" }),
    __metadata("design:type", users_1.User)
], StarBusinessDetails.prototype, "convertedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StarBusinessDetails.prototype, "industry", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], StarBusinessDetails.prototype, "comment", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => customers_1.Customer, (customer) => customer.starBusinessDetails),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", customers_1.Customer)
], StarBusinessDetails.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => contact_person_1.ContactPerson, (contactPerson) => contactPerson.starBusinessDetails, {
        cascade: true,
    }),
    __metadata("design:type", Array)
], StarBusinessDetails.prototype, "contactPersons", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => requested_items_1.RequestedItem, (requestedItem) => requestedItem.business, {
        cascade: true,
    }),
    __metadata("design:type", Array)
], StarBusinessDetails.prototype, "requestedItems", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], StarBusinessDetails.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], StarBusinessDetails.prototype, "updatedAt", void 0);
exports.StarBusinessDetails = StarBusinessDetails = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], StarBusinessDetails);

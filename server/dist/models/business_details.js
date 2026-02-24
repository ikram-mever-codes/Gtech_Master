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
exports.BusinessDetails = void 0;
const typeorm_1 = require("typeorm");
const customers_1 = require("./customers");
const users_1 = require("./users");
let BusinessDetails = class BusinessDetails {
};
exports.BusinessDetails = BusinessDetails;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], BusinessDetails.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BusinessDetails.prototype, "businessSource", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 8, nullable: true }),
    __metadata("design:type", Number)
], BusinessDetails.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 10, scale: 8, nullable: true }),
    __metadata("design:type", Number)
], BusinessDetails.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BusinessDetails.prototype, "googleMapsUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], BusinessDetails.prototype, "reviewCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BusinessDetails.prototype, "website", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BusinessDetails.prototype, "contactPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, unique: true }),
    __metadata("design:type", String)
], BusinessDetails.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Object)
], BusinessDetails.prototype, "socialLinks", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ["Yes", "No", "Unsure"],
        nullable: true,
    }),
    __metadata("design:type", String)
], BusinessDetails.prototype, "isDeviceMaker", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], BusinessDetails.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BusinessDetails.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BusinessDetails.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BusinessDetails.prototype, "state", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BusinessDetails.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BusinessDetails.prototype, "postalCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BusinessDetails.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "simple-array", nullable: true }),
    __metadata("design:type", Array)
], BusinessDetails.prototype, "additionalCategories", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BusinessDetails.prototype, "industry", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true }),
    __metadata("design:type", Number)
], BusinessDetails.prototype, "employeeCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], BusinessDetails.prototype, "isStarBusiness", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], BusinessDetails.prototype, "isStarCustomer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], BusinessDetails.prototype, "check_timestamp", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => users_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "check_by" }),
    __metadata("design:type", users_1.User)
], BusinessDetails.prototype, "check_by", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => customers_1.Customer, (customer) => customer.businessDetails),
    __metadata("design:type", customers_1.Customer)
], BusinessDetails.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BusinessDetails.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], BusinessDetails.prototype, "updatedAt", void 0);
exports.BusinessDetails = BusinessDetails = __decorate([
    (0, typeorm_1.Entity)()
], BusinessDetails);

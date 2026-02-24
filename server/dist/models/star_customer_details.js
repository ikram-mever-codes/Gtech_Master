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
exports.StarCustomerDetails = void 0;
const typeorm_1 = require("typeorm");
const customers_1 = require("./customers");
const invoice_1 = require("./invoice");
const inquiry_1 = require("./inquiry");
let StarCustomerDetails = class StarCustomerDetails {
};
exports.StarCustomerDetails = StarCustomerDetails;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => customers_1.Customer, (customer) => customer.starCustomerDetails),
    __metadata("design:type", customers_1.Customer)
], StarCustomerDetails.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "taxNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], StarCustomerDetails.prototype, "isEmailVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "emailVerificationCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], StarCustomerDetails.prototype, "emailVerificationExp", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], StarCustomerDetails.prototype, "isPhoneVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "phoneVerificationCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], StarCustomerDetails.prototype, "phoneVerificationExp", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ["pending", "verified", "rejected"],
        default: "pending",
    }),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "accountVerificationStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "verificationRemark", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", nullable: true }),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "resetPasswordToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], StarCustomerDetails.prototype, "resetPasswordExp", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "billingStreet", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "billingCity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "billingState", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 20, nullable: true }),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "billingPostalCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "billingCountry", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "deliveryAddressLine1", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "deliveryAddressLine2", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 20, nullable: true }),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "deliveryPostalCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "deliveryCity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100, nullable: true }),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "deliveryCountry", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "deliveryContactName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, nullable: true }),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "deliveryContactPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "deliveryAdditionalInfo", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => inquiry_1.DeliveryAddress, {
        nullable: true,
        onDelete: "SET NULL",
    }),
    (0, typeorm_1.JoinColumn)({ name: "delivery_address_id" }),
    __metadata("design:type", inquiry_1.DeliveryAddress)
], StarCustomerDetails.prototype, "deliveryAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "delivery_address_id", nullable: true }),
    __metadata("design:type", String)
], StarCustomerDetails.prototype, "deliveryAddressId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], StarCustomerDetails.prototype, "deletedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => invoice_1.Invoice, (invoice) => invoice.customer),
    __metadata("design:type", Array)
], StarCustomerDetails.prototype, "invoices", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], StarCustomerDetails.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], StarCustomerDetails.prototype, "updatedAt", void 0);
exports.StarCustomerDetails = StarCustomerDetails = __decorate([
    (0, typeorm_1.Entity)()
], StarCustomerDetails);

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
exports.Customer = void 0;
const typeorm_1 = require("typeorm");
const invoice_1 = require("./invoice");
const business_details_1 = require("./business_details");
const star_business_details_1 = require("./star_business_details");
const star_customer_details_1 = require("./star_customer_details");
const inquiry_1 = require("./inquiry");
let Customer = class Customer {
    populateDetails() {
        if (this.businessDetails) {
            this.city = this.city || this.businessDetails.city;
            this.postalCode = this.postalCode || this.businessDetails.postalCode;
            this.addressLine1 = this.addressLine1 || this.businessDetails.address;
            this.country = this.country || this.businessDetails.country;
        }
        if (this.starCustomerDetails) {
            this.city = this.city || this.starCustomerDetails.deliveryCity;
            this.postalCode =
                this.postalCode || this.starCustomerDetails.deliveryPostalCode;
            this.addressLine1 =
                this.addressLine1 || this.starCustomerDetails.deliveryAddressLine1;
            this.country =
                this.country || this.starCustomerDetails.deliveryCountry;
            this.taxNumber = this.taxNumber || this.starCustomerDetails.taxNumber;
        }
    }
    constructor(partial) {
        if (partial) {
            Object.assign(this, partial);
        }
    }
};
exports.Customer = Customer;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Customer.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ["business", "star_business", "star_customer", "device_maker"],
        default: "business",
    }),
    __metadata("design:type", String)
], Customer.prototype, "stage", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Customer.prototype, "companyName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "legalName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "avatar", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "contactEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "contactPhoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "taxNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "addressLine1", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "addressLine2", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "postalCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => business_details_1.BusinessDetails, { nullable: true, cascade: true }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", business_details_1.BusinessDetails)
], Customer.prototype, "businessDetails", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => star_business_details_1.StarBusinessDetails, { nullable: true, cascade: true }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", star_business_details_1.StarBusinessDetails)
], Customer.prototype, "starBusinessDetails", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => star_customer_details_1.StarCustomerDetails, { nullable: true, cascade: true }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", star_customer_details_1.StarCustomerDetails)
], Customer.prototype, "starCustomerDetails", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => invoice_1.Invoice, (invoice) => invoice.customer),
    __metadata("design:type", Array)
], Customer.prototype, "invoices", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => inquiry_1.Inquiry, (inquiry) => inquiry.customer),
    __metadata("design:type", inquiry_1.Inquiry)
], Customer.prototype, "inquiries", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Customer.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Customer.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.AfterLoad)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Customer.prototype, "populateDetails", null);
exports.Customer = Customer = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], Customer);

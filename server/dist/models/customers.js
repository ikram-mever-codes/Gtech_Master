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
const tags_1 = require("./tags");
const items_1 = require("./items");
const tax_profile_1 = require("./tax_profile");
const company_shipping_address_1 = require("./company_shipping_address");
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
            this.country = this.country || this.starCustomerDetails.deliveryCountry;
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
], Customer.prototype, "asanaLink", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "vatTaxId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "debtor_no", nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "debtor_no", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "default_tax_profile_id", nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "default_tax_profile_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tax_profile_1.TaxProfile, { nullable: true, onDelete: "SET NULL" }),
    (0, typeorm_1.JoinColumn)({ name: "default_tax_profile_id" }),
    __metadata("design:type", tax_profile_1.TaxProfile)
], Customer.prototype, "defaultTaxProfile", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "vat_id_status",
        type: "enum",
        enum: [
            "unchecked",
            "vies_valid",
            "vies_invalid",
            "bzst_qualified_valid",
            "bzst_qualified_invalid",
        ],
        default: "unchecked",
    }),
    __metadata("design:type", String)
], Customer.prototype, "vat_id_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "vat_id_checked_at", type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], Customer.prototype, "vat_id_checked_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "vat_id_check_source", nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "vat_id_check_source", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "vat_id_check_response_json", type: "text", nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "vat_id_check_response_json", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "customerNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "avatar", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "companyLabelPrintLogo", void 0);
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
    (0, typeorm_1.OneToMany)(() => items_1.Item, (item) => item.customer),
    __metadata("design:type", Array)
], Customer.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => company_shipping_address_1.CompanyShippingAddress, (address) => address.company),
    __metadata("design:type", Array)
], Customer.prototype, "shippingAddresses", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Customer.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Customer.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => tags_1.Tag, (tag) => tag.customers),
    (0, typeorm_1.JoinTable)({ name: "customer_tags" }),
    __metadata("design:type", Array)
], Customer.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "tagOrder", void 0);
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

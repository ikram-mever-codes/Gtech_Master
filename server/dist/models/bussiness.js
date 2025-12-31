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
exports.Business = exports.BUSINESS_SOURCE = exports.BUSINESS_STATUS = void 0;
const typeorm_1 = require("typeorm");
var BUSINESS_STATUS;
(function (BUSINESS_STATUS) {
    BUSINESS_STATUS["ACTIVE"] = "active";
    BUSINESS_STATUS["INACTIVE"] = "inactive";
    BUSINESS_STATUS["NO_WEBSITE"] = "no_website";
})(BUSINESS_STATUS || (exports.BUSINESS_STATUS = BUSINESS_STATUS = {}));
var BUSINESS_SOURCE;
(function (BUSINESS_SOURCE) {
    BUSINESS_SOURCE["SHOP"] = "Shop";
    BUSINESS_SOURCE["INQUIRY"] = "Anfrage";
    BUSINESS_SOURCE["RECOMMENDATION"] = "Empfehlung";
    BUSINESS_SOURCE["SEARCH"] = "Suche";
    BUSINESS_SOURCE["MANUAL"] = "Manual";
    BUSINESS_SOURCE["GOOGLE_MAPS"] = "Google Maps";
})(BUSINESS_SOURCE || (exports.BUSINESS_SOURCE = BUSINESS_SOURCE = {}));
let Business = class Business {
    shouldImport() {
        return this.hasWebsite && this.status !== BUSINESS_STATUS.NO_WEBSITE;
    }
    getFullAddress() {
        return [this.address, this.city, this.state, this.postalCode, this.country]
            .filter((part) => part && part.trim() !== "")
            .join(", ");
    }
    needsVerification() {
        if (!this.lastVerifiedAt)
            return true;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return this.lastVerifiedAt < thirtyDaysAgo;
    }
};
exports.Business = Business;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Business.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: false }),
    __metadata("design:type", String)
], Business.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Business.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: false }),
    __metadata("design:type", String)
], Business.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Business.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Business.prototype, "state", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Business.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Business.prototype, "postalCode", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal", { precision: 10, scale: 7, nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Number)
], Business.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal", { precision: 10, scale: 7, nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Number)
], Business.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Business.prototype, "website", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Business.prototype, "phoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Business.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Object)
], Business.prototype, "socialMedia", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, unique: true }),
    __metadata("design:type", String)
], Business.prototype, "googlePlaceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Business.prototype, "googleMapsUrl", void 0);
__decorate([
    (0, typeorm_1.Column)("int", { nullable: true }),
    __metadata("design:type", Number)
], Business.prototype, "reviewCount", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal", { precision: 3, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Business.prototype, "averageRating", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Business.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)("simple-array", { nullable: true }),
    __metadata("design:type", Array)
], Business.prototype, "additionalCategories", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Object)
], Business.prototype, "businessHours", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: BUSINESS_SOURCE,
        default: BUSINESS_SOURCE.SHOP,
    }),
    __metadata("design:type", String)
], Business.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: BUSINESS_STATUS,
        default: BUSINESS_STATUS.ACTIVE,
    }),
    __metadata("design:type", String)
], Business.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Business.prototype, "hasWebsite", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], Business.prototype, "lastVerifiedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Business.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Business.prototype, "updatedAt", void 0);
exports.Business = Business = __decorate([
    (0, typeorm_1.Entity)()
], Business);

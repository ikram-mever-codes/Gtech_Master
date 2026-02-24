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
exports.ContactPerson = void 0;
const typeorm_1 = require("typeorm");
const star_business_details_1 = require("./star_business_details");
const requested_items_1 = require("./requested_items");
let ContactPerson = class ContactPerson {
    constructor(partial) {
        if (partial) {
            Object.assign(this, partial);
        }
    }
};
exports.ContactPerson = ContactPerson;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], ContactPerson.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ["male", "female", "Not Specified"],
        default: "Not Specified",
    }),
    __metadata("design:type", String)
], ContactPerson.prototype, "sex", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => star_business_details_1.StarBusinessDetails, (starBusiness) => starBusiness.contactPersons, {
        nullable: false,
        onDelete: "CASCADE",
    }),
    (0, typeorm_1.JoinColumn)({ name: "star_business_details_id" }),
    __metadata("design:type", star_business_details_1.StarBusinessDetails)
], ContactPerson.prototype, "starBusinessDetails", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => requested_items_1.RequestedItem, (requestedItem) => requestedItem.contactPerson),
    __metadata("design:type", Array)
], ContactPerson.prototype, "requestedItems", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "star_business_details_id" }),
    __metadata("design:type", String)
], ContactPerson.prototype, "starBusinessDetailsId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255 }),
    __metadata("design:type", String)
], ContactPerson.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255 }),
    __metadata("design:type", String)
], ContactPerson.prototype, "familyName", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: [
            "Einkauf",
            "Entwickler",
            "Produktionsleiter",
            "Betriebsleiter",
            "Geschäftsführer",
            "Owner",
            "Others",
            "",
        ],
        default: "",
    }),
    __metadata("design:type", String)
], ContactPerson.prototype, "position", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], ContactPerson.prototype, "positionOthers", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true }),
    __metadata("design:type", String)
], ContactPerson.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, nullable: true }),
    __metadata("design:type", String)
], ContactPerson.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 500, nullable: true }),
    __metadata("design:type", String)
], ContactPerson.prototype, "linkedInLink", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], ContactPerson.prototype, "noteContactPreference", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: [
            "open",
            "NoLinkedIn",
            "Vernetzung geschickt",
            "Linked angenommen",
            "Erstkontakt",
            "im Gespräch",
            "NichtAnsprechpartner",
        ],
        default: "open",
    }),
    __metadata("design:type", String)
], ContactPerson.prototype, "stateLinkedIn", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: [
            "User",
            "Purchaser",
            "Influencer",
            "Gatekeeper",
            "DecisionMaker technical",
            "DecisionMaker financial",
            "real DecisionMaker",
            "",
        ],
        default: "",
    }),
    __metadata("design:type", String)
], ContactPerson.prototype, "contact", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], ContactPerson.prototype, "isDecisionMaker", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: [
            "",
            "open",
            "ErstEmail",
            "Folgetelefonat",
            "2.Email",
            "Anfragtelefonat",
            "weiteres Serienteil",
            "kein Interesse",
        ],
        default: "",
    }),
    __metadata("design:type", String)
], ContactPerson.prototype, "decisionMakerState", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], ContactPerson.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], ContactPerson.prototype, "decisionMakerNote", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ContactPerson.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ContactPerson.prototype, "updatedAt", void 0);
exports.ContactPerson = ContactPerson = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], ContactPerson);

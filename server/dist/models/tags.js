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
exports.Tag = exports.TagColor = exports.TagCategory = void 0;
const typeorm_1 = require("typeorm");
const customers_1 = require("./customers");
const contact_person_1 = require("./contact_person");
const inquiry_1 = require("./inquiry");
const requested_items_1 = require("./requested_items");
const items_1 = require("./items");
const suppliers_1 = require("./suppliers");
var TagCategory;
(function (TagCategory) {
    TagCategory["COMPANY"] = "company";
    TagCategory["CONTACT"] = "contact";
    TagCategory["INQUIRY"] = "inquiry";
    TagCategory["REQUEST_ITEM"] = "request_item";
    TagCategory["ITEM"] = "item";
    TagCategory["SUPPLIER"] = "supplier";
})(TagCategory || (exports.TagCategory = TagCategory = {}));
var TagColor;
(function (TagColor) {
    TagColor["NONE"] = "none";
    TagColor["GRAY"] = "gray";
    TagColor["BLUE"] = "blue";
    TagColor["GREEN"] = "green";
    TagColor["YELLOW"] = "yellow";
    TagColor["ORANGE"] = "orange";
    TagColor["RED"] = "red";
    TagColor["PURPLE"] = "purple";
})(TagColor || (exports.TagColor = TagColor = {}));
let Tag = class Tag {
};
exports.Tag = Tag;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], Tag.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 100 }),
    __metadata("design:type", String)
], Tag.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: TagCategory,
    }),
    __metadata("design:type", String)
], Tag.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: TagColor,
        default: TagColor.NONE,
    }),
    __metadata("design:type", String)
], Tag.prototype, "color", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => customers_1.Customer, (customer) => customer.tags),
    __metadata("design:type", Array)
], Tag.prototype, "customers", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => contact_person_1.ContactPerson, (contact) => contact.tags),
    __metadata("design:type", Array)
], Tag.prototype, "contacts", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => inquiry_1.Inquiry, (inquiry) => inquiry.tags),
    __metadata("design:type", Array)
], Tag.prototype, "inquiries", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => requested_items_1.RequestedItem, (reqItem) => reqItem.tags),
    __metadata("design:type", Array)
], Tag.prototype, "requestedItems", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => items_1.Item, (item) => item.tags),
    __metadata("design:type", Array)
], Tag.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => suppliers_1.Supplier, (supplier) => supplier.tags),
    __metadata("design:type", Array)
], Tag.prototype, "suppliers", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Tag.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Tag.prototype, "updated_at", void 0);
exports.Tag = Tag = __decorate([
    (0, typeorm_1.Entity)(),
    (0, typeorm_1.Unique)(["name", "category"])
], Tag);

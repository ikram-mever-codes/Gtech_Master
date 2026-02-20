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
exports.LibraryFile = exports.FileType = void 0;
// models/library.ts
const typeorm_1 = require("typeorm");
const users_1 = require("./users");
const customers_1 = require("./customers");
var FileType;
(function (FileType) {
    FileType["IMAGE"] = "IMAGE";
    FileType["DOCUMENT"] = "DOCUMENT";
    FileType["PDF"] = "PDF";
    FileType["SPREADSHEET"] = "SPREADSHEET";
    FileType["PRESENTATION"] = "PRESENTATION";
    FileType["ARCHIVE"] = "ARCHIVE";
    FileType["OTHER"] = "OTHER";
})(FileType || (exports.FileType = FileType = {}));
let LibraryFile = class LibraryFile {
    constructor(partial) {
        this.tags = [];
        if (partial) {
            Object.assign(this, partial);
        }
    }
};
exports.LibraryFile = LibraryFile;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], LibraryFile.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], LibraryFile.prototype, "filename", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], LibraryFile.prototype, "originalName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], LibraryFile.prototype, "fileSize", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], LibraryFile.prototype, "mimeType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: FileType,
        default: FileType.OTHER,
    }),
    __metadata("design:type", String)
], LibraryFile.prototype, "fileType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], LibraryFile.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], LibraryFile.prototype, "thumbnailUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], LibraryFile.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)("simple-array", { nullable: true }),
    __metadata("design:type", Array)
], LibraryFile.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], LibraryFile.prototype, "isPublic", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => users_1.User, (user) => user.id, { nullable: true }),
    __metadata("design:type", users_1.User)
], LibraryFile.prototype, "uploadedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], LibraryFile.prototype, "uploadedById", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => customers_1.Customer, (customer) => customer.id, { nullable: true }),
    __metadata("design:type", customers_1.Customer)
], LibraryFile.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], LibraryFile.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], LibraryFile.prototype, "uploadedAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], LibraryFile.prototype, "updatedAt", void 0);
exports.LibraryFile = LibraryFile = __decorate([
    (0, typeorm_1.Entity)(),
    __metadata("design:paramtypes", [Object])
], LibraryFile);

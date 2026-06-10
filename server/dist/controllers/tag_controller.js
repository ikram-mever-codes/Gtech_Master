"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncEntityTags = exports.deleteTag = exports.updateTag = exports.createTag = exports.getAllTags = void 0;
const database_1 = require("../config/database");
const tags_1 = require("../models/tags");
const customers_1 = require("../models/customers");
const contact_person_1 = require("../models/contact_person");
const inquiry_1 = require("../models/inquiry");
const requested_items_1 = require("../models/requested_items");
const items_1 = require("../models/items");
const suppliers_1 = require("../models/suppliers");
const entityMap = {
    company: { repo: customers_1.Customer, relation: "tags" },
    contact: { repo: contact_person_1.ContactPerson, relation: "tags" },
    inquiry: { repo: inquiry_1.Inquiry, relation: "tags" },
    request_item: { repo: requested_items_1.RequestedItem, relation: "tags" },
    item: { repo: items_1.Item, relation: "tags" },
    supplier: { repo: suppliers_1.Supplier, relation: "tags" },
};
const getAllTags = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { category } = req.query;
        const tagRepo = database_1.AppDataSource.getRepository(tags_1.Tag);
        let whereClause = {};
        if (category) {
            whereClause.category = category;
        }
        const tags = yield tagRepo.find({
            where: whereClause,
            order: { name: "ASC" },
        });
        return res.status(200).json({ data: tags });
    }
    catch (error) {
        console.error("Error fetching tags:", error);
        return res.status(500).json({ message: "Failed to fetch tags", error: error.message });
    }
});
exports.getAllTags = getAllTags;
const createTag = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, category, color } = req.body;
        if (!name || !category) {
            return res.status(400).json({ message: "Name and Category are required." });
        }
        if (!Object.values(tags_1.TagCategory).includes(category)) {
            return res.status(400).json({ message: `Invalid category. Allowed: ${Object.values(tags_1.TagCategory).join(", ")}` });
        }
        if (color && !Object.values(tags_1.TagColor).includes(color)) {
            return res.status(400).json({ message: `Invalid color. Allowed: ${Object.values(tags_1.TagColor).join(", ")}` });
        }
        const tagRepo = database_1.AppDataSource.getRepository(tags_1.Tag);
        const existing = yield tagRepo.findOne({
            where: { name, category },
        });
        if (existing) {
            return res.status(400).json({ message: `Tag "${name}" already exists in category "${category}".` });
        }
        const tag = tagRepo.create({
            name,
            category,
            color: color || tags_1.TagColor.GRAY,
        });
        yield tagRepo.save(tag);
        return res.status(201).json({ message: "Tag created successfully", data: tag });
    }
    catch (error) {
        console.error("Error creating tag:", error);
        return res.status(500).json({ message: "Failed to create tag", error: error.message });
    }
});
exports.createTag = createTag;
const updateTag = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, category, color } = req.body;
        const tagRepo = database_1.AppDataSource.getRepository(tags_1.Tag);
        const tag = yield tagRepo.findOne({ where: { id } });
        if (!tag) {
            return res.status(404).json({ message: "Tag not found" });
        }
        if (category && !Object.values(tags_1.TagCategory).includes(category)) {
            return res.status(400).json({ message: `Invalid category. Allowed: ${Object.values(tags_1.TagCategory).join(", ")}` });
        }
        if (color && !Object.values(tags_1.TagColor).includes(color)) {
            return res.status(400).json({ message: `Invalid color. Allowed: ${Object.values(tags_1.TagColor).join(", ")}` });
        }
        if ((name && name !== tag.name) || (category && category !== tag.category)) {
            const checkName = name || tag.name;
            const checkCategory = category || tag.category;
            const existing = yield tagRepo.findOne({
                where: { name: checkName, category: checkCategory },
            });
            if (existing && existing.id !== tag.id) {
                return res.status(400).json({ message: `Tag "${checkName}" already exists in category "${checkCategory}".` });
            }
        }
        if (name)
            tag.name = name;
        if (category)
            tag.category = category;
        if (color)
            tag.color = color;
        yield tagRepo.save(tag);
        return res.status(200).json({ message: "Tag updated successfully", data: tag });
    }
    catch (error) {
        console.error("Error updating tag:", error);
        return res.status(500).json({ message: "Failed to update tag", error: error.message });
    }
});
exports.updateTag = updateTag;
const deleteTag = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const { id } = req.params;
        const tagRepo = database_1.AppDataSource.getRepository(tags_1.Tag);
        const tag = yield tagRepo.findOne({
            where: { id },
            relations: ["customers", "contacts", "inquiries", "requestedItems", "items", "suppliers"],
        });
        if (!tag) {
            return res.status(404).json({ message: "Tag not found" });
        }
        let assignedCount = 0;
        let categoryName = "";
        if (tag.category === tags_1.TagCategory.COMPANY) {
            assignedCount = ((_a = tag.customers) === null || _a === void 0 ? void 0 : _a.length) || 0;
            categoryName = "company/business";
        }
        else if (tag.category === tags_1.TagCategory.CONTACT) {
            assignedCount = ((_b = tag.contacts) === null || _b === void 0 ? void 0 : _b.length) || 0;
            categoryName = "contact";
        }
        else if (tag.category === tags_1.TagCategory.INQUIRY) {
            assignedCount = ((_c = tag.inquiries) === null || _c === void 0 ? void 0 : _c.length) || 0;
            categoryName = "inquiry";
        }
        else if (tag.category === tags_1.TagCategory.REQUEST_ITEM) {
            assignedCount = ((_d = tag.requestedItems) === null || _d === void 0 ? void 0 : _d.length) || 0;
            categoryName = "request item";
        }
        else if (tag.category === tags_1.TagCategory.ITEM) {
            assignedCount = ((_e = tag.items) === null || _e === void 0 ? void 0 : _e.length) || 0;
            categoryName = "item";
        }
        else if (tag.category === tags_1.TagCategory.SUPPLIER) {
            assignedCount = ((_f = tag.suppliers) === null || _f === void 0 ? void 0 : _f.length) || 0;
            categoryName = "supplier";
        }
        if (assignedCount > 0) {
            return res.status(400).json({
                message: `Cannot delete tag "${tag.name}": it is currently assigned to ${assignedCount} ${categoryName} record(s). Remove all assignments first.`,
            });
        }
        const queryRunner = database_1.AppDataSource.createQueryRunner();
        yield queryRunner.connect();
        yield queryRunner.startTransaction();
        try {
            yield queryRunner.query('DELETE FROM "customer_tags" WHERE "tagId" = $1', [id]);
            yield queryRunner.query('DELETE FROM "contact_tags" WHERE "tagId" = $1', [id]);
            yield queryRunner.query('DELETE FROM "inquiry_tags" WHERE "tagId" = $1', [id]);
            yield queryRunner.query('DELETE FROM "requested_item_tags" WHERE "tagId" = $1', [id]);
            yield queryRunner.query('DELETE FROM "item_tags" WHERE "tagId" = $1', [id]);
            yield queryRunner.query('DELETE FROM "supplier_tag" WHERE "tag_id" = $1', [id]);
            yield queryRunner.manager.remove(tag);
            yield queryRunner.commitTransaction();
        }
        catch (dbError) {
            yield queryRunner.rollbackTransaction();
            throw dbError;
        }
        finally {
            yield queryRunner.release();
        }
        return res.status(200).json({ message: "Tag deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting tag:", error);
        return res.status(500).json({ message: "Failed to delete tag", error: error.message });
    }
});
exports.deleteTag = deleteTag;
const syncEntityTags = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { entityId, entityType, tagIds } = req.body;
        if (!entityId || !entityType || !Array.isArray(tagIds)) {
            return res.status(400).json({ message: "Invalid parameters. Required: entityId, entityType, tagIds (array)" });
        }
        const config = entityMap[entityType];
        if (!config) {
            return res.status(400).json({ message: `Unsupported entity type: ${entityType}` });
        }
        const entityRepo = database_1.AppDataSource.getRepository(config.repo);
        const tagRepo = database_1.AppDataSource.getRepository(tags_1.Tag);
        const entity = yield entityRepo.findOne({
            where: { id: entityId },
            relations: [config.relation],
        });
        if (!entity) {
            return res.status(404).json({ message: `Entity of type ${entityType} with ID ${entityId} not found` });
        }
        let tags = [];
        if (tagIds.length > 0) {
            const { In } = require("typeorm");
            const foundTags = yield tagRepo.find({
                where: {
                    id: In(tagIds),
                },
            });
            const tagMap = new Map(foundTags.map((t) => [t.id, t]));
            tags = tagIds.map((tid) => tagMap.get(tid)).filter(Boolean);
        }
        entity[config.relation] = tags;
        entity.tagOrder = tagIds.join(",");
        yield entityRepo.save(entity);
        return res.status(200).json({ message: "Tags synced successfully", data: entity });
    }
    catch (error) {
        console.error("Error syncing entity tags:", error);
        return res.status(500).json({ message: "Failed to sync tags", error: error.message });
    }
});
exports.syncEntityTags = syncEntityTags;

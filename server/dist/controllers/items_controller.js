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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUpsertTarics = exports.getTaricStatistics = exports.searchTarics = exports.deleteTaric = exports.updateTaric = exports.createTaric = exports.getTaricById = exports.getAllTarics = exports.deleteQualityCriterion = exports.updateQualityCriterion = exports.createQualityCriterion = exports.getItemQualityCriteria = exports.updateItemVariations = exports.getItemVariations = exports.updateWarehouseStock = exports.getWarehouseItems = exports.searchParents = exports.deleteParent = exports.updateParent = exports.createParent = exports.getParentById = exports.getParents = exports.searchItems = exports.getItemStatistics = exports.bulkUpdateItems = exports.toggleItemStatus = exports.deleteItem = exports.updateItem = exports.createItem = exports.getItemById = exports.getItems = void 0;
const database_1 = require("../config/database");
const items_1 = require("../models/items");
const parents_1 = require("../models/parents");
const tarics_1 = require("../models/tarics");
const categories_1 = require("../models/categories");
const variation_values_1 = require("../models/variation_values");
const warehouse_items_1 = require("../models/warehouse_items");
const order_items_1 = require("../models/order_items");
const item_qualities_1 = require("../models/item_qualities");
const suppliers_1 = require("../models/suppliers");
const typeorm_1 = require("typeorm");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const getItems = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        // Get query parameters
        const { page = "1", limit = "30", search = "", status = "", category = "", supplier = "", isActive = "", sortBy = "created_at", sortOrder = "DESC", parentId, taricId, } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        // Build where conditions
        const whereConditions = {};
        // Search across multiple fields
        if (search) {
            whereConditions.item_name = (0, typeorm_1.ILike)(`%${search}%`);
        }
        // Filter by status/active
        if (isActive) {
            whereConditions.isActive = isActive;
        }
        // Filter by category
        if (category) {
            whereConditions.cat_id = parseInt(category);
        }
        // Filter by parent
        if (parentId) {
            whereConditions.parent_id = parseInt(parentId);
        }
        // Filter by taric
        if (taricId) {
            whereConditions.taric_id = parseInt(taricId);
        }
        // Build relations
        const relations = ["parent", "taric", "category"];
        // Get total count
        const totalRecords = yield itemRepository.count({ where: whereConditions });
        // Get paginated items
        const items = yield itemRepository.find({
            where: whereConditions,
            relations,
            order: {
                [sortBy]: sortOrder === "DESC" ? "DESC" : "ASC",
            },
            skip,
            take: limitNum,
        });
        // Format response
        const formattedItems = items.map((item) => {
            var _a, _b, _c, _d, _e;
            return ({
                id: item.id,
                de_no: ((_a = item.parent) === null || _a === void 0 ? void 0 : _a.de_no) || null,
                name_de: ((_b = item.parent) === null || _b === void 0 ? void 0 : _b.name_de) || null,
                name_en: ((_c = item.parent) === null || _c === void 0 ? void 0 : _c.name_en) || null,
                name_cn: ((_d = item.parent) === null || _d === void 0 ? void 0 : _d.name_cn) || null,
                item_name: item.item_name,
                item_name_cn: item.item_name_cn,
                ean: item.ean,
                is_active: item.isActive,
                parent_id: item.parent_id,
                taric_id: item.taric_id,
                category_id: item.cat_id,
                category: ((_e = item.category) === null || _e === void 0 ? void 0 : _e.name) || null,
                weight: item.weight,
                length: item.length,
                width: item.width,
                height: item.height,
                remark: item.remark,
                model: item.model,
                created_at: item.created_at,
                updated_at: item.updated_at,
            });
        });
        return res.status(200).json({
            success: true,
            data: formattedItems,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalRecords,
                totalPages: Math.ceil(totalRecords / limitNum),
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getItems = getItems;
// Get item by ID
const getItemById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6;
    try {
        const { id } = req.params;
        if (!id) {
            return next(new errorHandler_1.default("Item ID is required", 400));
        }
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const warehouseRepository = database_1.AppDataSource.getRepository(warehouse_items_1.WarehouseItem);
        const variationRepository = database_1.AppDataSource.getRepository(variation_values_1.VariationValue);
        const qualityRepository = database_1.AppDataSource.getRepository(item_qualities_1.ItemQuality);
        const orderItemRepository = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
        // Get item with relations
        const item = yield itemRepository.findOne({
            where: { id: parseInt(id) },
            relations: ["parent", "taric", "category"],
        });
        if (!item) {
            return next(new errorHandler_1.default("Item not found", 404));
        }
        // Get related data
        const warehouseItems = yield warehouseRepository.find({
            where: { item_id: parseInt(id) },
        });
        const variationValues = yield variationRepository.find({
            where: { item_id: parseInt(id) },
        });
        const qualityCriteria = yield qualityRepository.find({
            where: { item_id: parseInt(id) },
        });
        // const orderItems = await orderItemRepository.find({
        //   where: { item: parseInt(id) },
        //   relations: ["order"],
        // });
        // Format response based on your frontend structure
        const formattedItem = {
            id: item.id,
            itemNo: `${item.id} / ${((_a = item.parent) === null || _a === void 0 ? void 0 : _a.de_no) || ""}`,
            name: item.item_name || "",
            nameCN: item.item_name_cn || "",
            ean: ((_b = item.ean) === null || _b === void 0 ? void 0 : _b.toString()) || "",
            category: ((_c = item.category) === null || _c === void 0 ? void 0 : _c.name) || "STD",
            model: item.model || "",
            remark: item.remark || "",
            isActive: item.isActive === "Y",
            // Parent details
            parent: {
                noDE: ((_d = item.parent) === null || _d === void 0 ? void 0 : _d.de_no) || "NONE",
                nameDE: ((_e = item.parent) === null || _e === void 0 ? void 0 : _e.name_de) || "NONE",
                nameEN: ((_f = item.parent) === null || _f === void 0 ? void 0 : _f.name_en) || "NONE",
                isActive: ((_g = item.parent) === null || _g === void 0 ? void 0 : _g.is_active) === "Y",
                isSpecialItem: ((_h = item.parent) === null || _h === void 0 ? void 0 : _h.is_NwV) === "Y",
                priceEUR: 0, // You'll need to add this to your model
                priceRMB: 0, // You'll need to add this to your model
                isEURSpecial: item.is_eur_special === "Y",
                isRMBSpecial: item.is_rmb_special === "Y",
            },
            // Dimensions
            dimensions: {
                isbn: ((_j = item.ISBN) === null || _j === void 0 ? void 0 : _j.toString()) || "1",
                weight: ((_k = item.weight) === null || _k === void 0 ? void 0 : _k.toString()) || "0",
                length: ((_l = item.length) === null || _l === void 0 ? void 0 : _l.toString()) || "0",
                width: ((_m = item.width) === null || _m === void 0 ? void 0 : _m.toString()) || "0",
                height: ((_o = item.height) === null || _o === void 0 ? void 0 : _o.toString()) || "0",
            },
            // Variations
            variationsDE: {
                variations: [
                    (_p = item.parent) === null || _p === void 0 ? void 0 : _p.var_de_1,
                    (_q = item.parent) === null || _q === void 0 ? void 0 : _q.var_de_2,
                    (_r = item.parent) === null || _r === void 0 ? void 0 : _r.var_de_3,
                ].filter(Boolean),
                values: variationValues.map((v) => v.value_de).filter(Boolean),
            },
            variationsEN: {
                variations: [
                    (_s = item.parent) === null || _s === void 0 ? void 0 : _s.var_en_1,
                    (_t = item.parent) === null || _t === void 0 ? void 0 : _t.var_en_2,
                    (_u = item.parent) === null || _u === void 0 ? void 0 : _u.var_en_3,
                ].filter(Boolean),
                values: variationValues.map((v) => v.value_en).filter(Boolean),
            },
            // Others
            others: {
                taricCode: ((_v = item.taric) === null || _v === void 0 ? void 0 : _v.code) || "",
                isQTYdiv: item.is_qty_dividable === "Y",
                mc: ((_w = item.many_components) === null || _w === void 0 ? void 0 : _w.toString()) || "0",
                er: ((_x = item.effort_rating) === null || _x === void 0 ? void 0 : _x.toString()) || "0",
                isMeter: item.is_meter_item === 1,
                isPU: item.is_pu_item === 1,
                isNPR: item.is_npr === "Y",
                isNew: item.is_new === "Y",
                warehouseItem: ((_z = (_y = warehouseItems[0]) === null || _y === void 0 ? void 0 : _y.id) === null || _z === void 0 ? void 0 : _z.toString()) || "",
                idDE: ((_0 = item.ItemID_DE) === null || _0 === void 0 ? void 0 : _0.toString()) || "",
                noDE: item.parent_no_de || "",
                nameDE: ((_1 = item.parent) === null || _1 === void 0 ? void 0 : _1.name_de) || "",
                nameEN: ((_2 = item.parent) === null || _2 === void 0 ? void 0 : _2.name_en) || "",
                isActive: item.isActive === "Y",
                isStock: warehouseItems.some((wi) => wi.stock_qty > 0),
                qty: warehouseItems
                    .reduce((sum, wi) => sum + wi.stock_qty, 0)
                    .toString(),
                msq: ((_4 = (_3 = warehouseItems[0]) === null || _3 === void 0 ? void 0 : _3.msq) === null || _4 === void 0 ? void 0 : _4.toString()) || "0",
                isNAO: false,
                buffer: ((_6 = (_5 = warehouseItems[0]) === null || _5 === void 0 ? void 0 : _5.buffer) === null || _6 === void 0 ? void 0 : _6.toString()) || "0",
                isSnSI: false,
            },
            // Quality criteria
            qualityCriteria: qualityCriteria.map((qc) => ({
                id: qc.id,
                name: qc.name || "",
                picture: qc.picture || "",
                description: qc.description || "",
                descriptionCN: qc.description_cn || "",
            })),
            // Attachments
            attachments: [],
            // Pictures
            pictures: {
                shopPicture: item.photo || "",
                ebayPictures: item.pix_path_eBay || "",
            },
            // NPR Remarks
            nprRemarks: item.npr_remark || "",
        };
        return res.status(200).json({
            success: true,
            data: formattedItem,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getItemById = getItemById;
// Create new item
const createItem = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
        const categoryRepository = database_1.AppDataSource.getRepository(categories_1.Category);
        const { item_name, item_name_cn, ean, parent_id, taric_id, cat_id, weight, length, width, height, remark, model, isActive = "Y", is_qty_dividable = "Y", is_npr = "N", is_eur_special = "N", is_rmb_special = "N", } = req.body;
        // Validate required fields
        if (!item_name || !parent_id) {
            return next(new errorHandler_1.default("Item name and parent ID are required", 400));
        }
        // Check if parent exists
        const parent = yield parentRepository.findOne({ where: { id: parent_id } });
        if (!parent) {
            return next(new errorHandler_1.default("Parent not found", 404));
        }
        // Check if taric exists
        if (taric_id) {
            const taric = yield taricRepository.findOne({ where: { id: taric_id } });
            if (!taric) {
                return next(new errorHandler_1.default("Taric not found", 404));
            }
        }
        // Check if category exists
        if (cat_id) {
            const category = yield categoryRepository.findOne({
                where: { id: cat_id },
            });
            if (!category) {
                return next(new errorHandler_1.default("Category not found", 404));
            }
        }
        // Check if EAN already exists
        if (ean) {
            const existingItem = yield itemRepository.findOne({ where: { ean } });
            if (existingItem) {
                return next(new errorHandler_1.default("Item with this EAN already exists", 400));
            }
        }
        // Create new item
        const newItem = itemRepository.create({
            item_name,
            item_name_cn,
            ean: ean ? BigInt(ean) : null,
            parent_id,
            taric_id,
            cat_id,
            weight: weight ? parseFloat(weight) : null,
            length: length ? parseFloat(length) : 0,
            width: width ? parseFloat(width) : null,
            height: height ? parseFloat(height) : null,
            remark,
            model,
            isActive,
            is_qty_dividable,
            is_npr,
            is_eur_special,
            is_rmb_special,
            created_at: new Date(),
            updated_at: new Date(),
        });
        yield itemRepository.save(newItem);
        // Create warehouse entry for the item
        const warehouseRepository = database_1.AppDataSource.getRepository(warehouse_items_1.WarehouseItem);
        const warehouseItem = warehouseRepository.create({
            item_id: newItem.id,
            item_no_de: parent.de_no,
            item_name_de: item_name,
            item_name_en: item_name,
            stock_qty: 0,
            msq: 0,
            buffer: 0,
            is_active: "Y",
            is_stock_item: "N",
            created_at: new Date(),
        });
        yield warehouseRepository.save(warehouseItem);
        return res.status(201).json({
            success: true,
            message: "Item created successfully",
            data: {
                id: newItem.id,
                item_name: newItem.item_name,
                ean: newItem.ean,
                parent_id: newItem.parent_id,
                isActive: newItem.isActive,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.createItem = createItem;
// Update item
const updateItem = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        if (!id) {
            return next(new errorHandler_1.default("Item ID is required", 400));
        }
        const item = yield itemRepository.findOne({ where: { id: parseInt(id) } });
        if (!item) {
            return next(new errorHandler_1.default("Item not found", 404));
        }
        // Update fields
        const updatableFields = [
            "item_name",
            "item_name_cn",
            "ean",
            "parent_id",
            "taric_id",
            "cat_id",
            "weight",
            "length",
            "width",
            "height",
            "remark",
            "model",
            "isActive",
            "is_qty_dividable",
            "is_npr",
            "is_eur_special",
            "is_rmb_special",
            "note",
            "photo",
            "pix_path",
            "pix_path_eBay",
            "npr_remark",
        ];
        updatableFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                if (field === "ean" && req.body[field]) {
                    item[field] = BigInt(req.body[field]);
                }
                else {
                    item[field] = req.body[field];
                }
            }
        });
        item.updated_at = new Date();
        yield itemRepository.save(item);
        return res.status(200).json({
            success: true,
            message: "Item updated successfully",
            data: {
                id: item.id,
                item_name: item.item_name,
                isActive: item.isActive,
                updated_at: item.updated_at,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.updateItem = updateItem;
// Delete item
const deleteItem = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new errorHandler_1.default("Item ID is required", 400));
        }
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const warehouseRepository = database_1.AppDataSource.getRepository(warehouse_items_1.WarehouseItem);
        const variationRepository = database_1.AppDataSource.getRepository(variation_values_1.VariationValue);
        const qualityRepository = database_1.AppDataSource.getRepository(item_qualities_1.ItemQuality);
        const orderItemRepository = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
        // Check if item exists
        const item = yield itemRepository.findOne({ where: { id: parseInt(id) } });
        if (!item) {
            return next(new errorHandler_1.default("Item not found", 404));
        }
        // Check if there's stock in warehouse
        const warehouseItems = yield warehouseRepository.find({
            where: { item_id: parseInt(id) },
        });
        const totalStock = warehouseItems.reduce((sum, wi) => sum + wi.stock_qty, 0);
        if (totalStock > 0) {
            return next(new errorHandler_1.default("Cannot delete item. There is stock in warehouse. Please clear stock first.", 400));
        }
        // Use transaction to delete all related data
        yield database_1.AppDataSource.transaction((transactionalEntityManager) => __awaiter(void 0, void 0, void 0, function* () {
            yield transactionalEntityManager.delete(warehouse_items_1.WarehouseItem, {
                item_id: parseInt(id),
            });
            yield transactionalEntityManager.delete(variation_values_1.VariationValue, {
                item_id: parseInt(id),
            });
            yield transactionalEntityManager.delete(item_qualities_1.ItemQuality, {
                item_id: parseInt(id),
            });
            yield transactionalEntityManager.delete(items_1.Item, parseInt(id));
        }));
        return res.status(200).json({
            success: true,
            message: "Item deleted successfully",
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.deleteItem = deleteItem;
// Toggle item status
const toggleItemStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        if (!id) {
            return next(new errorHandler_1.default("Item ID is required", 400));
        }
        if (isActive === undefined) {
            return next(new errorHandler_1.default("Status is required", 400));
        }
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const item = yield itemRepository.findOne({ where: { id: parseInt(id) } });
        if (!item) {
            return next(new errorHandler_1.default("Item not found", 404));
        }
        item.isActive = isActive ? "Y" : "N";
        item.updated_at = new Date();
        yield itemRepository.save(item);
        return res.status(200).json({
            success: true,
            message: `Item ${isActive ? "activated" : "deactivated"} successfully`,
            data: {
                id: item.id,
                isActive: item.isActive,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.toggleItemStatus = toggleItemStatus;
// Bulk update items
const bulkUpdateItems = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids, updates } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return next(new errorHandler_1.default("Item IDs are required", 400));
        }
        if (!updates || typeof updates !== "object") {
            return next(new errorHandler_1.default("Updates object is required", 400));
        }
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const updatedItems = [];
        for (const id of ids) {
            const item = yield itemRepository.findOne({
                where: { id: parseInt(id) },
            });
            if (item) {
                Object.keys(updates).forEach((key) => {
                    if (key in item && key !== "id") {
                        item[key] = updates[key];
                    }
                });
                item.updated_at = new Date();
                yield itemRepository.save(item);
                updatedItems.push(item);
            }
        }
        return res.status(200).json({
            success: true,
            message: `${updatedItems.length} items updated successfully`,
            data: {
                count: updatedItems.length,
                items: updatedItems.map((item) => ({
                    id: item.id,
                    item_name: item.item_name,
                    isActive: item.isActive,
                })),
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.bulkUpdateItems = bulkUpdateItems;
// Get item statistics
const getItemStatistics = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const warehouseRepository = database_1.AppDataSource.getRepository(warehouse_items_1.WarehouseItem);
        // Total items count
        const totalItems = yield itemRepository.count();
        // Active items count
        const activeItems = yield itemRepository.count({
            where: { isActive: "Y" },
        });
        // Items with stock
        const itemsWithStock = yield warehouseRepository
            .createQueryBuilder("warehouse")
            .select("COUNT(DISTINCT warehouse.item_id)", "count")
            .where("warehouse.stock_qty > 0")
            .getRawOne();
        // Items by category
        const itemsByCategory = yield itemRepository
            .createQueryBuilder("item")
            .leftJoin("item.category", "category")
            .select("category.name", "category")
            .addSelect("COUNT(item.id)", "count")
            .groupBy("category.name")
            .orderBy("count", "DESC")
            .getRawMany();
        return res.status(200).json({
            success: true,
            data: {
                totalItems,
                activeItems,
                inactiveItems: totalItems - activeItems,
                itemsWithStock: parseInt(itemsWithStock.count) || 0,
                itemsByCategory,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getItemStatistics = getItemStatistics;
// Search items by name or EAN
const searchItems = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { q, limit = "10" } = req.query;
        if (!q) {
            return next(new errorHandler_1.default("Search query is required", 400));
        }
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const searchTerm = `%${q}%`;
        const items = yield itemRepository
            .createQueryBuilder("item")
            .leftJoinAndSelect("item.parent", "parent")
            .leftJoinAndSelect("item.category", "category")
            .where("item.item_name ILIKE :search", { search: searchTerm })
            .orWhere("item.item_name_cn ILIKE :search", { search: searchTerm })
            .orWhere("item.ean::text ILIKE :search", { search: searchTerm })
            .orWhere("parent.name_de ILIKE :search", { search: searchTerm })
            .orWhere("parent.name_en ILIKE :search", { search: searchTerm })
            .orderBy("item.created_at", "DESC")
            .take(parseInt(limit))
            .getMany();
        const formattedItems = items.map((item) => {
            var _a, _b, _c, _d;
            return ({
                id: item.id,
                de_no: ((_a = item.parent) === null || _a === void 0 ? void 0 : _a.de_no) || null,
                name_de: ((_b = item.parent) === null || _b === void 0 ? void 0 : _b.name_de) || null,
                name_en: ((_c = item.parent) === null || _c === void 0 ? void 0 : _c.name_en) || null,
                item_name: item.item_name,
                ean: item.ean,
                category: ((_d = item.category) === null || _d === void 0 ? void 0 : _d.name) || null,
                is_active: item.isActive,
            });
        });
        return res.status(200).json({
            success: true,
            data: formattedItems,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.searchItems = searchItems;
// ============================================
// PARENTS CONTROLLERS
// ============================================
// Get all parents with pagination and filters
const getParents = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        // Get query parameters
        const { page = "1", limit = "30", search = "", status = "", isActive = "", sortBy = "created_at", sortOrder = "DESC", supplierId, taricId, } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        // Build where conditions
        const whereConditions = {};
        // Search across multiple fields
        if (search) {
            whereConditions.name_de = (0, typeorm_1.ILike)(`%${search}%`);
        }
        // Filter by status/active
        if (isActive) {
            whereConditions.is_active = isActive;
        }
        // Filter by supplier
        if (supplierId) {
            whereConditions.supplier_id = parseInt(supplierId);
        }
        // Filter by taric
        if (taricId) {
            whereConditions.taric_id = parseInt(taricId);
        }
        // Build relations
        const relations = ["taric", "supplier", "items"];
        // Get total count
        const totalRecords = yield parentRepository.count({
            where: whereConditions,
        });
        // Get paginated parents
        const parents = yield parentRepository.find({
            where: whereConditions,
            relations,
            order: {
                [sortBy]: sortOrder === "DESC" ? "DESC" : "ASC",
            },
            skip,
            take: limitNum,
        });
        // Format response
        const formattedParents = parents.map((parent) => {
            var _a;
            return ({
                id: parent.id,
                de_no: parent.de_no,
                name_de: parent.name_de,
                name_en: parent.name_en,
                name_cn: parent.name_cn,
                is_active: parent.is_active,
                taric_id: parent.taric_id,
                supplier_id: parent.supplier_id,
                supplier: parent.supplier
                    ? {
                        id: parent.supplier.id,
                        name: parent.supplier.name,
                    }
                    : null,
                item_count: ((_a = parent.items) === null || _a === void 0 ? void 0 : _a.length) || 0,
                created_at: parent.created_at,
                updated_at: parent.updated_at,
            });
        });
        return res.status(200).json({
            success: true,
            data: formattedParents,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalRecords,
                totalPages: Math.ceil(totalRecords / limitNum),
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getParents = getParents;
// Get parent by ID
const getParentById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new errorHandler_1.default("Parent ID is required", 400));
        }
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        // Get parent with relations
        const parent = yield parentRepository.findOne({
            where: { id: parseInt(id) },
            relations: ["taric", "supplier"],
        });
        if (!parent) {
            return next(new errorHandler_1.default("Parent not found", 404));
        }
        // Get child items
        const items = yield itemRepository.find({
            where: { parent_id: parseInt(id) },
            relations: ["category"],
        });
        const formattedItems = items.map((item) => {
            var _a;
            return ({
                id: item.id,
                item_name: item.item_name,
                item_name_cn: item.item_name_cn,
                ean: item.ean,
                is_active: item.isActive,
                category: ((_a = item.category) === null || _a === void 0 ? void 0 : _a.name) || null,
                created_at: item.created_at,
            });
        });
        // Format response
        const formattedParent = {
            id: parent.id,
            de_no: parent.de_no,
            name_de: parent.name_de,
            name_en: parent.name_en,
            name_cn: parent.name_cn,
            is_active: parent.is_active,
            taric: parent.taric
                ? {
                    id: parent.taric.id,
                    code: parent.taric.code,
                    name_de: parent.taric.name_de,
                }
                : null,
            supplier: parent.supplier
                ? {
                    id: parent.supplier.id,
                    name: parent.supplier.name,
                    contact_person: parent.supplier.contact_person,
                }
                : null,
            variations: {
                de: [parent.var_de_1, parent.var_de_2, parent.var_de_3].filter(Boolean),
                en: [parent.var_en_1, parent.var_en_2, parent.var_en_3].filter(Boolean),
            },
            is_NwV: parent.is_NwV === "Y",
            parent_rank: parent.parent_rank,
            is_var_unilingual: parent.is_var_unilingual === "Y",
            items: formattedItems,
            item_count: items.length,
            created_at: parent.created_at,
            updated_at: parent.updated_at,
        };
        return res.status(200).json({
            success: true,
            data: formattedParent,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getParentById = getParentById;
// Create new parent
const createParent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
        const supplierRepository = database_1.AppDataSource.getRepository(suppliers_1.Supplier);
        const { de_no, name_de, name_en, name_cn, taric_id, supplier_id, var_de_1, var_de_2, var_de_3, var_en_1, var_en_2, var_en_3, is_NwV = "N", is_var_unilingual = "N", is_active = "Y", } = req.body;
        // Validate required fields
        if (!de_no || !name_de) {
            return next(new errorHandler_1.default("DE number and German name are required", 400));
        }
        // Check if DE number already exists
        const existingParent = yield parentRepository.findOne({ where: { de_no } });
        if (existingParent) {
            return next(new errorHandler_1.default("Parent with this DE number already exists", 400));
        }
        // Check if taric exists
        if (taric_id) {
            const taric = yield taricRepository.findOne({ where: { id: taric_id } });
            if (!taric) {
                return next(new errorHandler_1.default("Taric not found", 404));
            }
        }
        // Check if supplier exists
        if (supplier_id) {
            const supplier = yield supplierRepository.findOne({
                where: { id: supplier_id },
            });
            if (!supplier) {
                return next(new errorHandler_1.default("Supplier not found", 404));
            }
        }
        // Create new parent
        const newParent = parentRepository.create({
            de_no,
            name_de,
            name_en,
            name_cn,
            taric_id,
            supplier_id,
            var_de_1,
            var_de_2,
            var_de_3,
            var_en_1,
            var_en_2,
            var_en_3,
            is_NwV,
            is_var_unilingual,
            is_active,
            created_at: new Date(),
            updated_at: new Date(),
        });
        yield parentRepository.save(newParent);
        return res.status(201).json({
            success: true,
            message: "Parent created successfully",
            data: {
                id: newParent.id,
                de_no: newParent.de_no,
                name_de: newParent.name_de,
                is_active: newParent.is_active,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.createParent = createParent;
// Update parent
const updateParent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        if (!id) {
            return next(new errorHandler_1.default("Parent ID is required", 400));
        }
        const parent = yield parentRepository.findOne({
            where: { id: parseInt(id) },
        });
        if (!parent) {
            return next(new errorHandler_1.default("Parent not found", 404));
        }
        // Update fields
        const updatableFields = [
            "de_no",
            "name_de",
            "name_en",
            "name_cn",
            "taric_id",
            "supplier_id",
            "var_de_1",
            "var_de_2",
            "var_de_3",
            "var_en_1",
            "var_en_2",
            "var_en_3",
            "is_NwV",
            "is_var_unilingual",
            "is_active",
            "parent_rank",
        ];
        updatableFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                parent[field] = req.body[field];
            }
        });
        parent.updated_at = new Date();
        yield parentRepository.save(parent);
        return res.status(200).json({
            success: true,
            message: "Parent updated successfully",
            data: {
                id: parent.id,
                de_no: parent.de_no,
                name_de: parent.name_de,
                is_active: parent.is_active,
                updated_at: parent.updated_at,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.updateParent = updateParent;
// Delete parent
const deleteParent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new errorHandler_1.default("Parent ID is required", 400));
        }
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        // Check if parent exists
        const parent = yield parentRepository.findOne({
            where: { id: parseInt(id) },
        });
        if (!parent) {
            return next(new errorHandler_1.default("Parent not found", 404));
        }
        // Check if parent has child items
        const childItems = yield itemRepository.find({
            where: { parent_id: parseInt(id) },
        });
        if (childItems.length > 0) {
            return next(new errorHandler_1.default("Cannot delete parent. It has child items. Please delete or reassign child items first.", 400));
        }
        yield parentRepository.delete(parseInt(id));
        return res.status(200).json({
            success: true,
            message: "Parent deleted successfully",
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.deleteParent = deleteParent;
// Search parents by name or DE number
const searchParents = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { q, limit = "10" } = req.query;
        if (!q) {
            return next(new errorHandler_1.default("Search query is required", 400));
        }
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        const searchTerm = `%${q}%`;
        const parents = yield parentRepository
            .createQueryBuilder("parent")
            .where("parent.name_de ILIKE :search", { search: searchTerm })
            .orWhere("parent.name_en ILIKE :search", { search: searchTerm })
            .orWhere("parent.de_no ILIKE :search", { search: searchTerm })
            .orderBy("parent.created_at", "DESC")
            .take(parseInt(limit))
            .getMany();
        const formattedParents = parents.map((parent) => ({
            id: parent.id,
            de_no: parent.de_no,
            name_de: parent.name_de,
            name_en: parent.name_en,
            is_active: parent.is_active,
            item_count: 0, // You might want to fetch this separately
        }));
        return res.status(200).json({
            success: true,
            data: formattedParents,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.searchParents = searchParents;
// ============================================
// WAREHOUSE ITEMS CONTROLLERS
// ============================================
// Get warehouse items
const getWarehouseItems = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const warehouseRepository = database_1.AppDataSource.getRepository(warehouse_items_1.WarehouseItem);
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        // Get query parameters
        const { page = "1", limit = "30", search = "", hasStock = "", isStockItem = "", sortBy = "created_at", sortOrder = "DESC", } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        // Build query
        const query = warehouseRepository.createQueryBuilder("warehouse");
        // Apply filters
        if (search) {
            query
                .where("warehouse.item_name_de ILIKE :search", {
                search: `%${search}%`,
            })
                .orWhere("warehouse.item_name_en ILIKE :search", {
                search: `%${search}%`,
            })
                .orWhere("warehouse.item_no_de ILIKE :search", {
                search: `%${search}%`,
            });
        }
        if (hasStock === "true") {
            query.andWhere("warehouse.stock_qty > 0");
        }
        else if (hasStock === "false") {
            query.andWhere("warehouse.stock_qty = 0");
        }
        if (isStockItem) {
            query.andWhere("warehouse.is_stock_item = :isStockItem", { isStockItem });
        }
        // Get total count
        const totalRecords = yield query.getCount();
        // Apply pagination and sorting
        const warehouseItems = yield query
            .orderBy(`warehouse.${sortBy}`, sortOrder === "DESC" ? "DESC" : "ASC")
            .skip(skip)
            .take(limitNum)
            .getMany();
        // Format response
        const formattedItems = warehouseItems.map((warehouse) => ({
            id: warehouse.id,
            item_id: warehouse.item_id,
            item_no_de: warehouse.item_no_de,
            item_name_de: warehouse.item_name_de,
            item_name_en: warehouse.item_name_en,
            stock_qty: warehouse.stock_qty,
            msq: warehouse.msq,
            buffer: warehouse.buffer,
            is_active: warehouse.is_active,
            is_stock_item: warehouse.is_stock_item,
            //   parent_de_no: warehouse.ite?.parent?.de_no || null,
            //   parent_name_de: warehouse.item?.parent?.name_de || null,
            created_at: warehouse.created_at,
        }));
        return res.status(200).json({
            success: true,
            data: formattedItems,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalRecords,
                totalPages: Math.ceil(totalRecords / limitNum),
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getWarehouseItems = getWarehouseItems;
// Update warehouse item stock
const updateWarehouseStock = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { stock_qty, msq, buffer, is_stock_item } = req.body;
        if (!id) {
            return next(new errorHandler_1.default("Warehouse item ID is required", 400));
        }
        const warehouseRepository = database_1.AppDataSource.getRepository(warehouse_items_1.WarehouseItem);
        const warehouseItem = yield warehouseRepository.findOne({
            where: { id: parseInt(id) },
        });
        if (!warehouseItem) {
            return next(new errorHandler_1.default("Warehouse item not found", 404));
        }
        // Update fields
        if (stock_qty !== undefined) {
            if (stock_qty < 0) {
                return next(new errorHandler_1.default("Stock quantity cannot be negative", 400));
            }
            warehouseItem.stock_qty = stock_qty;
        }
        if (msq !== undefined) {
            warehouseItem.msq = msq;
        }
        if (buffer !== undefined) {
            warehouseItem.buffer = buffer;
        }
        if (is_stock_item !== undefined) {
            warehouseItem.is_stock_item = is_stock_item;
        }
        warehouseItem.updated_at = new Date();
        yield warehouseRepository.save(warehouseItem);
        return res.status(200).json({
            success: true,
            message: "Warehouse stock updated successfully",
            data: {
                id: warehouseItem.id,
                stock_qty: warehouseItem.stock_qty,
                msq: warehouseItem.msq,
                buffer: warehouseItem.buffer,
                is_stock_item: warehouseItem.is_stock_item,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.updateWarehouseStock = updateWarehouseStock;
// ============================================
// VARIATION VALUES CONTROLLERS
// ============================================
// Get variation values for an item
const getItemVariations = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { itemId } = req.params;
        if (!itemId) {
            return next(new errorHandler_1.default("Item ID is required", 400));
        }
        const variationRepository = database_1.AppDataSource.getRepository(variation_values_1.VariationValue);
        const variations = yield variationRepository.find({
            where: { item_id: parseInt(itemId) },
            order: { created_at: "ASC" },
        });
        const formattedVariations = variations.map((variation) => ({
            id: variation.id,
            item_id: variation.item_id,
            value_de: variation.value_de,
            value_de_2: variation.value_de_2,
            value_de_3: variation.value_de_3,
            value_en: variation.value_en,
            value_en_2: variation.value_en_2,
            value_en_3: variation.value_en_3,
            created_at: variation.created_at,
            updated_at: variation.updated_at,
        }));
        return res.status(200).json({
            success: true,
            data: formattedVariations,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getItemVariations = getItemVariations;
// Create or update variation values
const updateItemVariations = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { itemId } = req.params;
        const variations = req.body; // Array of variation objects
        if (!itemId) {
            return next(new errorHandler_1.default("Item ID is required", 400));
        }
        if (!Array.isArray(variations)) {
            return next(new errorHandler_1.default("Variations must be an array", 400));
        }
        const variationRepository = database_1.AppDataSource.getRepository(variation_values_1.VariationValue);
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        // Check if item exists
        const item = yield itemRepository.findOne({
            where: { id: parseInt(itemId) },
        });
        if (!item) {
            return next(new errorHandler_1.default("Item not found", 404));
        }
        // Use transaction for batch operations
        yield database_1.AppDataSource.transaction((transactionalEntityManager) => __awaiter(void 0, void 0, void 0, function* () {
            // Delete existing variations for this item
            yield transactionalEntityManager.delete(variation_values_1.VariationValue, {
                item_id: parseInt(itemId),
            });
            // Create new variations
            const newVariations = variations.map((variation) => variationRepository.create({
                item_id: parseInt(itemId),
                value_de: variation.value_de,
                value_de_2: variation.value_de_2,
                value_de_3: variation.value_de_3,
                value_en: variation.value_en,
                value_en_2: variation.value_en_2,
                value_en_3: variation.value_en_3,
                created_at: new Date(),
                updated_at: new Date(),
            }));
            if (newVariations.length > 0) {
                yield transactionalEntityManager.save(variation_values_1.VariationValue, newVariations);
            }
        }));
        return res.status(200).json({
            success: true,
            message: "Variation values updated successfully",
            data: {
                item_id: parseInt(itemId),
                count: variations.length,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.updateItemVariations = updateItemVariations;
// ============================================
// QUALITY CRITERIA CONTROLLERS
// ============================================
// Get quality criteria for an item
const getItemQualityCriteria = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { itemId } = req.params;
        if (!itemId) {
            return next(new errorHandler_1.default("Item ID is required", 400));
        }
        const qualityRepository = database_1.AppDataSource.getRepository(item_qualities_1.ItemQuality);
        const criteria = yield qualityRepository.find({
            where: { item_id: parseInt(itemId) },
            order: { created_at: "ASC" },
        });
        return res.status(200).json({
            success: true,
            data: criteria,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getItemQualityCriteria = getItemQualityCriteria;
// Create quality criteria
const createQualityCriterion = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { itemId } = req.params;
        const { name, picture, description, description_cn } = req.body;
        if (!itemId) {
            return next(new errorHandler_1.default("Item ID is required", 400));
        }
        if (!name) {
            return next(new errorHandler_1.default("Criterion name is required", 400));
        }
        const qualityRepository = database_1.AppDataSource.getRepository(item_qualities_1.ItemQuality);
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        // Check if item exists
        const item = yield itemRepository.findOne({
            where: { id: parseInt(itemId) },
        });
        if (!item) {
            return next(new errorHandler_1.default("Item not found", 404));
        }
        const newCriterion = qualityRepository.create({
            item_id: parseInt(itemId),
            name,
            picture,
            description,
            description_cn,
            created_at: new Date(),
            updated_at: new Date(),
        });
        yield qualityRepository.save(newCriterion);
        return res.status(201).json({
            success: true,
            message: "Quality criterion created successfully",
            data: newCriterion,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.createQualityCriterion = createQualityCriterion;
// Update quality criterion
const updateQualityCriterion = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, picture, description, description_cn } = req.body;
        if (!id) {
            return next(new errorHandler_1.default("Criterion ID is required", 400));
        }
        const qualityRepository = database_1.AppDataSource.getRepository(item_qualities_1.ItemQuality);
        const criterion = yield qualityRepository.findOne({
            where: { id: parseInt(id) },
        });
        if (!criterion) {
            return next(new errorHandler_1.default("Quality criterion not found", 404));
        }
        // Update fields
        if (name !== undefined)
            criterion.name = name;
        if (picture !== undefined)
            criterion.picture = picture;
        if (description !== undefined)
            criterion.description = description;
        // if (description_cn !== undefined) criterion.description_cn = description_cn;
        criterion.updated_at = new Date();
        yield qualityRepository.save(criterion);
        return res.status(200).json({
            success: true,
            message: "Quality criterion updated successfully",
            data: criterion,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.updateQualityCriterion = updateQualityCriterion;
// Delete quality criterion
const deleteQualityCriterion = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new errorHandler_1.default("Criterion ID is required", 400));
        }
        const qualityRepository = database_1.AppDataSource.getRepository(item_qualities_1.ItemQuality);
        const criterion = yield qualityRepository.findOne({
            where: { id: parseInt(id) },
        });
        if (!criterion) {
            return next(new errorHandler_1.default("Quality criterion not found", 404));
        }
        yield qualityRepository.delete(parseInt(id));
        return res.status(200).json({
            success: true,
            message: "Quality criterion deleted successfully",
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.deleteQualityCriterion = deleteQualityCriterion;
const getAllTarics = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
        // Get query parameters
        const { page = "1", limit = "30", search = "", code = "", name = "", sortBy = "id", sortOrder = "ASC", } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        // Build where conditions
        const whereConditions = {};
        // Search across multiple fields
        if (search) {
            whereConditions.code = (0, typeorm_1.ILike)(`%${search}%`);
            whereConditions.name_de = (0, typeorm_1.ILike)(`%${search}%`);
            whereConditions.name_en = (0, typeorm_1.ILike)(`%${search}%`);
            whereConditions.name_cn = (0, typeorm_1.ILike)(`%${search}%`);
        }
        // Filter by specific fields
        if (code) {
            whereConditions.code = (0, typeorm_1.ILike)(`%${code}%`);
        }
        if (name) {
            whereConditions.name_de = (0, typeorm_1.ILike)(`%${name}%`);
        }
        // Get total count
        const totalRecords = yield taricRepository.count({
            where: whereConditions,
        });
        // Get paginated tarics
        const tarics = yield taricRepository.find({
            where: whereConditions,
            order: {
                [sortBy]: sortOrder === "DESC" ? "DESC" : "ASC",
            },
            skip,
            take: limitNum,
        });
        // Format response
        const formattedTarics = tarics.map((taric) => {
            var _a, _b;
            return ({
                id: taric.id,
                code: taric.code,
                name_de: taric.name_de,
                name_en: taric.name_en,
                name_cn: taric.name_cn,
                description_de: taric.description_de,
                description_en: taric.description_en,
                reguler_artikel: taric.reguler_artikel,
                duty_rate: taric.duty_rate,
                item_count: ((_a = taric.items) === null || _a === void 0 ? void 0 : _a.length) || 0,
                parent_count: ((_b = taric.parents) === null || _b === void 0 ? void 0 : _b.length) || 0,
                created_at: taric.created_at,
                updated_at: taric.updated_at,
            });
        });
        return res.status(200).json({
            success: true,
            data: formattedTarics,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalRecords,
                totalPages: Math.ceil(totalRecords / limitNum),
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getAllTarics = getAllTarics;
// Get taric by ID with relationships
const getTaricById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new errorHandler_1.default("TARIC ID is required", 400));
        }
        const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        // Get taric with relations
        const taric = yield taricRepository.findOne({
            where: { id: parseInt(id) },
        });
        if (!taric) {
            return next(new errorHandler_1.default("TARIC not found", 404));
        }
        // Get related items
        const items = yield itemRepository.find({
            where: { taric_id: parseInt(id) },
            relations: ["parent", "category"],
            take: 10, // Limit to 10 items for preview
        });
        // Get related parents
        const parents = yield parentRepository.find({
            where: { taric_id: parseInt(id) },
            take: 10, // Limit to 10 parents for preview
        });
        // Format response
        const formattedTaric = {
            id: taric.id,
            code: taric.code,
            name_de: taric.name_de,
            name_en: taric.name_en,
            name_cn: taric.name_cn,
            description_de: taric.description_de,
            description_en: taric.description_en,
            reguler_artikel: taric.reguler_artikel,
            duty_rate: taric.duty_rate,
            created_at: taric.created_at,
            updated_at: taric.updated_at,
            items: items.map((item) => {
                var _a, _b;
                return ({
                    id: item.id,
                    item_name: item.item_name,
                    item_name_cn: item.item_name_cn,
                    ean: item.ean,
                    parent: ((_a = item.parent) === null || _a === void 0 ? void 0 : _a.name_de) || null,
                    category: ((_b = item.category) === null || _b === void 0 ? void 0 : _b.name) || null,
                });
            }),
            parents: parents.map((parent) => ({
                id: parent.id,
                de_no: parent.de_no,
                name_de: parent.name_de,
                name_en: parent.name_en,
            })),
            statistics: {
                total_items: yield itemRepository.count({
                    where: { taric_id: parseInt(id) },
                }),
                total_parents: yield parentRepository.count({
                    where: { taric_id: parseInt(id) },
                }),
            },
        };
        return res.status(200).json({
            success: true,
            data: formattedTaric,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getTaricById = getTaricById;
// Create new taric
const createTaric = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
        const { code, name_de, name_en, name_cn, description_de, description_en, reguler_artikel = "Y", duty_rate = 0, } = req.body;
        // Validate required fields
        if (!code) {
            return next(new errorHandler_1.default("TARIC code is required", 400));
        }
        // Check if code already exists
        const existingTaric = yield taricRepository.findOne({ where: { code } });
        if (existingTaric) {
            return next(new errorHandler_1.default("TARIC with this code already exists", 400));
        }
        // Create new taric
        const newTaric = taricRepository.create({
            code,
            name_de,
            name_en,
            name_cn,
            description_de,
            description_en,
            reguler_artikel,
            duty_rate,
            created_at: new Date(),
            updated_at: new Date(),
        });
        yield taricRepository.save(newTaric);
        return res.status(201).json({
            success: true,
            message: "TARIC created successfully",
            data: {
                id: newTaric.id,
                code: newTaric.code,
                name_de: newTaric.name_de,
                name_en: newTaric.name_en,
                duty_rate: newTaric.duty_rate,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.createTaric = createTaric;
// Update taric
const updateTaric = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
        if (!id) {
            return next(new errorHandler_1.default("TARIC ID is required", 400));
        }
        const taric = yield taricRepository.findOne({
            where: { id: parseInt(id) },
        });
        if (!taric) {
            return next(new errorHandler_1.default("TARIC not found", 404));
        }
        // Update fields
        const updatableFields = [
            "code",
            "name_de",
            "name_en",
            "name_cn",
            "description_de",
            "description_en",
            "reguler_artikel",
            "duty_rate",
        ];
        updatableFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                taric[field] = req.body[field];
            }
        });
        taric.updated_at = new Date();
        yield taricRepository.save(taric);
        return res.status(200).json({
            success: true,
            message: "TARIC updated successfully",
            data: {
                id: taric.id,
                code: taric.code,
                name_de: taric.name_de,
                updated_at: taric.updated_at,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.updateTaric = updateTaric;
// Delete taric
const deleteTaric = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new errorHandler_1.default("TARIC ID is required", 400));
        }
        const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        // Check if taric exists
        const taric = yield taricRepository.findOne({
            where: { id: parseInt(id) },
        });
        if (!taric) {
            return next(new errorHandler_1.default("TARIC not found", 404));
        }
        // Check if taric has related items
        const relatedItems = yield itemRepository.count({
            where: { taric_id: parseInt(id) },
        });
        // Check if taric has related parents
        const relatedParents = yield parentRepository.count({
            where: { taric_id: parseInt(id) },
        });
        if (relatedItems > 0 || relatedParents > 0) {
            return next(new errorHandler_1.default("Cannot delete TARIC. It has related items or parents. Please reassign them first.", 400));
        }
        yield taricRepository.delete(parseInt(id));
        return res.status(200).json({
            success: true,
            message: "TARIC deleted successfully",
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.deleteTaric = deleteTaric;
// Search tarics by code or name
const searchTarics = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { q, limit = "20" } = req.query;
        if (!q) {
            return next(new errorHandler_1.default("Search query is required", 400));
        }
        const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
        const searchTerm = `%${q}%`;
        const tarics = yield taricRepository
            .createQueryBuilder("taric")
            .where("taric.code ILIKE :search", { search: searchTerm })
            .orWhere("taric.name_de ILIKE :search", { search: searchTerm })
            .orWhere("taric.name_en ILIKE :search", { search: searchTerm })
            .orWhere("taric.name_cn ILIKE :search", { search: searchTerm })
            .orderBy("taric.code", "ASC")
            .take(parseInt(limit))
            .getMany();
        const formattedTarics = tarics.map((taric) => ({
            id: taric.id,
            code: taric.code,
            name_de: taric.name_de,
            name_en: taric.name_en,
            name_cn: taric.name_cn,
            duty_rate: taric.duty_rate,
        }));
        return res.status(200).json({
            success: true,
            data: formattedTarics,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.searchTarics = searchTarics;
// Get taric statistics
const getTaricStatistics = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        // Total tarics count
        const totalTarics = yield taricRepository.count();
        // Tarics with items count
        const taricsWithItems = yield itemRepository
            .createQueryBuilder("item")
            .select("COUNT(DISTINCT item.taric_id)", "count")
            .where("item.taric_id IS NOT NULL")
            .getRawOne();
        // Tarics with parents count
        const taricsWithParents = yield parentRepository
            .createQueryBuilder("parent")
            .select("COUNT(DISTINCT parent.taric_id)", "count")
            .where("parent.taric_id IS NOT NULL")
            .getRawOne();
        // Top tarics by item count
        const topTaricsByItems = yield taricRepository
            .createQueryBuilder("taric")
            .leftJoin("taric.items", "item")
            .select("taric.id", "id")
            .addSelect("taric.code", "code")
            .addSelect("taric.name_de", "name_de")
            .addSelect("COUNT(item.id)", "item_count")
            .groupBy("taric.id")
            .orderBy("item_count", "DESC")
            .take(10)
            .getRawMany();
        // Top tarics by parent count
        const topTaricsByParents = yield taricRepository
            .createQueryBuilder("taric")
            .leftJoin("taric.parents", "parent")
            .select("taric.id", "id")
            .addSelect("taric.code", "code")
            .addSelect("taric.name_de", "name_de")
            .addSelect("COUNT(parent.id)", "parent_count")
            .groupBy("taric.id")
            .orderBy("parent_count", "DESC")
            .take(10)
            .getRawMany();
        return res.status(200).json({
            success: true,
            data: {
                totalTarics,
                taricsWithItems: parseInt(taricsWithItems.count) || 0,
                taricsWithParents: parseInt(taricsWithParents.count) || 0,
                taricsWithoutRelations: totalTarics - (parseInt(taricsWithItems.count) || 0),
                topTaricsByItems,
                topTaricsByParents,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getTaricStatistics = getTaricStatistics;
// Bulk create/update tarics
const bulkUpsertTarics = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tarics } = req.body; // Array of taric objects
        if (!tarics || !Array.isArray(tarics) || tarics.length === 0) {
            return next(new errorHandler_1.default("TARICS array is required", 400));
        }
        const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
        const results = {
            created: 0,
            updated: 0,
            failed: 0,
            errors: [],
        };
        // Process each taric
        for (const taricData of tarics) {
            try {
                if (!taricData.code) {
                    results.failed++;
                    results.errors.push({ data: taricData, error: "Code is required" });
                    continue;
                }
                // Check if taric exists by code
                let taric = yield taricRepository.findOne({
                    where: { code: taricData.code },
                });
                if (taric) {
                    // Update existing taric
                    Object.assign(taric, taricData);
                    taric.updated_at = new Date();
                    results.updated++;
                }
                else {
                    // Create new taric
                    taric = taricRepository.create(Object.assign(Object.assign({}, taricData), { created_at: new Date(), updated_at: new Date() }));
                    results.created++;
                }
                yield taricRepository.save(taric);
            }
            catch (error) {
                results.failed++;
                results.errors.push({
                    data: taricData,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }
        return res.status(200).json({
            success: true,
            message: "Bulk TARIC operation completed",
            data: results,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.bulkUpsertTarics = bulkUpsertTarics;

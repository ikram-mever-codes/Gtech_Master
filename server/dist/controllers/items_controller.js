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
exports.syncSuppCatWithCategoryName = exports.exportNewItemsToCSV = exports.getNewItems = exports.exportItemsToCSV = exports.bulkUpsertTarics = exports.getTaricStatistics = exports.searchTarics = exports.deleteTaric = exports.updateTaric = exports.createTaric = exports.getTaricById = exports.getAllTarics = exports.deleteQualityCriterion = exports.updateQualityCriterion = exports.createQualityCriterion = exports.getItemQualityCriteria = exports.updateItemVariations = exports.getItemVariations = exports.updateWarehouseStock = exports.getWarehouseItems = exports.searchParents = exports.deleteParent = exports.updateParent = exports.createParent = exports.getParentById = exports.getParents = exports.resetUpdatedFlag = exports.searchItems = exports.getItemStatistics = exports.bulkUpdateItems = exports.toggleItemStatus = exports.deleteItem = exports.syncTransferPrices = exports.updateItem = exports.createItem = exports.getItemById = exports.getItems = exports.feedTransferPrices = exports.getRMBPriceFromSupplier = void 0;
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
const supplier_items_1 = require("../models/supplier_items");
const library_1 = require("../models/library");
const cloudinary_1 = require("../config/cloudinary");
const typeorm_1 = require("typeorm");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const users_1 = require("../models/users");
const dataFilter_1 = require("../utils/dataFilter");
const getRMBPriceFromSupplier = (itemId, supplierId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const supplierItemRepository = database_1.AppDataSource.getRepository(supplier_items_1.SupplierItem);
        let supplierItem = null;
        if (supplierId) {
            supplierItem = yield supplierItemRepository.findOne({
                where: { item_id: itemId, supplier_id: supplierId },
            });
        }
        if (!supplierItem) {
            supplierItem =
                (yield supplierItemRepository.findOne({
                    where: { item_id: itemId, is_default: "Y" },
                })) ||
                    (yield supplierItemRepository.findOne({
                        where: { item_id: itemId },
                    }));
        }
        return supplierItem &&
            supplierItem.price_rmb !== undefined &&
            supplierItem.price_rmb !== null
            ? Number(supplierItem.price_rmb)
            : null;
    }
    catch (error) {
        console.error(`Error fetching RMB_Price for item ${itemId}:`, error);
        return null;
    }
});
exports.getRMBPriceFromSupplier = getRMBPriceFromSupplier;
const calculateTransferPrice = (rmbPrice, categoryName) => {
    const flatCategories = ["GTR", "GBL", "PRO", "ERS"];
    if (flatCategories.includes(categoryName)) {
        return parseFloat(((rmbPrice / 7) * 1.5).toFixed(2));
    }
    let multiplier;
    if (rmbPrice < 0.25)
        multiplier = 2.5;
    else if (rmbPrice < 0.5)
        multiplier = 2.25;
    else if (rmbPrice < 1)
        multiplier = 2;
    else if (rmbPrice < 2)
        multiplier = 1.9;
    else if (rmbPrice < 4)
        multiplier = 1.8;
    else if (rmbPrice < 8)
        multiplier = 1.7;
    else if (rmbPrice < 14)
        multiplier = 1.6;
    else if (rmbPrice < 28)
        multiplier = 1.5;
    else
        multiplier = 1.45;
    return parseFloat(((rmbPrice * multiplier) / 7).toFixed(2));
};
const feedTransferPrices = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const itemRepo = database_1.AppDataSource.getRepository(items_1.Item);
        const supplierItemRepo = database_1.AppDataSource.getRepository(supplier_items_1.SupplierItem);
        const categoryRepo = database_1.AppDataSource.getRepository(categories_1.Category);
        const targetCategoryNames = ["STD", "GTR", "GBL", "PRO", "ERS"];
        const categories = yield categoryRepo.find({
            where: { name: (0, typeorm_1.In)(targetCategoryNames) },
        });
        if (categories.length === 0) {
            return next(new errorHandler_1.default("No matching categories found in system", 404));
        }
        const categoryMap = new Map(categories.map((c) => [c.de_cat, c.name]));
        const categoryIds = Array.from(categoryMap.keys());
        console.log(categoryIds);
        const items = yield itemRepo.find({
            where: { supp_cat: (0, typeorm_1.In)(targetCategoryNames) },
        });
        console.log(items);
        let updatedCount = 0;
        for (const item of items) {
            const supplierItem = yield supplierItemRepo.findOne({
                where: { item_id: item.id },
            });
            if (supplierItem && supplierItem.price_rmb) {
                const newPrice = calculateTransferPrice(supplierItem.price_rmb, item.supp_cat || "");
                if (item.transfer_price_EUR !== newPrice || item.price !== newPrice) {
                    item.transfer_price_EUR = newPrice;
                    item.price = newPrice;
                    item.is_updated = true;
                    yield itemRepo.save(item);
                    updatedCount++;
                }
            }
        }
        return res.status(200).json({
            success: true,
            message: `Successfully updated transfer prices for ${updatedCount} items.`,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.feedTransferPrices = feedTransferPrices;
const getItems = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
        const categoryRepository = database_1.AppDataSource.getRepository(categories_1.Category);
        const supplierRepository = database_1.AppDataSource.getRepository(suppliers_1.Supplier);
        const warehouseRepository = database_1.AppDataSource.getRepository(warehouse_items_1.WarehouseItem);
        const { page = "1", limit = "50", search = "", status = "", category = "", supplier = "", isActive = "", sortBy = "created_at", sortOrder = "DESC", parentId, taricId, isNew, eanSearch, tags, filter, } = req.query;
        let pageNum = parseInt(page);
        if (isNaN(pageNum))
            pageNum = 1;
        let limitNum = parseInt(limit);
        if (isNaN(limitNum))
            limitNum = 50;
        const skip = (pageNum - 1) * limitNum;
        const queryBuilder = itemRepository.createQueryBuilder("item")
            .leftJoinAndSelect("item.tags", "tags");
        if (tags) {
            const tagIds = tags.split(",");
            const includeTagIds = tagIds.filter((id) => !id.startsWith("!")).map((id) => id.trim());
            const excludeTagIds = tagIds.filter((id) => id.startsWith("!")).map((id) => id.substring(1).trim());
            if (includeTagIds.length > 0) {
                queryBuilder.andWhere((qb) => {
                    const subQuery = qb
                        .subQuery()
                        .select("c.id")
                        .from(items_1.Item, "c")
                        .innerJoin("c.tags", "t")
                        .where("t.id IN (:...itemIncludeTagIds)")
                        .groupBy("c.id")
                        .having("COUNT(t.id) = :itemIncludeCount");
                    return `item.id IN ${subQuery.getQuery()}`;
                });
                queryBuilder.setParameter("itemIncludeTagIds", includeTagIds);
                queryBuilder.setParameter("itemIncludeCount", includeTagIds.length);
            }
            if (excludeTagIds.length > 0) {
                queryBuilder.andWhere((qb) => {
                    const subQuery = qb
                        .subQuery()
                        .select("c.id")
                        .from(items_1.Item, "c")
                        .innerJoin("c.tags", "t")
                        .where("t.id IN (:...itemExcludeTagIds)");
                    return `item.id NOT IN ${subQuery.getQuery()}`;
                });
                queryBuilder.setParameter("itemExcludeTagIds", excludeTagIds);
            }
        }
        if (eanSearch) {
            const eanStr = eanSearch.replace(/\s+/g, "");
            console.log(`[DEBUG] EAN Search triggered for: ${eanStr}`);
            queryBuilder.andWhere(new typeorm_1.Brackets((qb) => {
                qb.where("REPLACE(CAST(item.ean AS TEXT), ' ', '') ILIKE :ean", {
                    ean: `%${eanStr}%`,
                }).orWhere('EXISTS (SELECT 1 FROM warehouse_item wi WHERE (wi.item_id = item.id OR (wi."ItemID_DE" = item."ItemID_DE" AND item."ItemID_DE" IS NOT NULL)) AND (REPLACE(CAST(wi.ean AS TEXT), \' \', \'\') ILIKE :ean))', { ean: `%${eanStr}%` });
            }));
        }
        if (search) {
            const searchStr = search.trim();
            queryBuilder.andWhere(new typeorm_1.Brackets((qb) => {
                qb.where("(item.item_name ILIKE :search OR item.item_name_cn ILIKE :search OR item.ean ILIKE :search OR item.model ILIKE :search)", { search: `%${searchStr}%` }).orWhere('EXISTS (SELECT 1 FROM warehouse_item wi WHERE (wi.item_id = item.id OR (wi."ItemID_DE" = item."ItemID_DE" AND item."ItemID_DE" IS NOT NULL)) AND (wi.ean ILIKE :search OR wi.item_no_de ILIKE :search))', { search: `%${searchStr}%` });
            }));
            const parsedId = parseInt(searchStr);
            if (!isNaN(parsedId) && parsedId <= 2147483647) {
                queryBuilder.orWhere("item.id = :id", { id: parsedId });
            }
        }
        if (isActive) {
            queryBuilder.andWhere("item.isActive = :isActive", { isActive });
        }
        if (category) {
            const categoryValue = category.trim();
            queryBuilder.leftJoin("item.category", "cat");
            if (!isNaN(parseInt(categoryValue))) {
                queryBuilder.andWhere("(item.cat_id = :catId OR TRIM(cat.name) ILIKE :catNameExact)", {
                    catId: parseInt(categoryValue),
                    catNameExact: categoryValue,
                });
            }
            else {
                queryBuilder.andWhere("TRIM(cat.name) ILIKE :catNameExact", {
                    catNameExact: categoryValue,
                });
            }
        }
        if (supplier) {
            queryBuilder.andWhere("item.supplier_id = :supplierId", {
                supplierId: parseInt(supplier),
            });
        }
        if (parentId) {
            queryBuilder.andWhere("item.parent_id = :parentId", {
                parentId: parseInt(parentId),
            });
        }
        if (taricId) {
            queryBuilder.andWhere("item.taric_id = :taricId", {
                taricId: parseInt(taricId),
            });
        }
        if (isNew === "Y") {
            queryBuilder.andWhere("item.is_new = :isNew", { isNew: "Y" });
        }
        if (filter) {
            const filterStr = filter;
            if (filterStr === "rmb_special_no_value") {
                queryBuilder.leftJoin("supplier_item", "si_filter", "si_filter.item_id = item.id AND si_filter.is_default = 'Y'");
                queryBuilder.andWhere("item.is_rmb_special = 'Y'");
                queryBuilder.andWhere("(si_filter.price_rmb IS NULL OR si_filter.price_rmb = 0)");
            }
            else if (filterStr === "eur_special_no_value") {
                queryBuilder.andWhere("item.is_eur_special = 'Y'");
                queryBuilder.andWhere("(item.price IS NULL OR item.price = 0 OR item.transfer_price_EUR IS NULL OR item.transfer_price_EUR = 0)");
            }
            else if (filterStr === "dimension_special_no_value") {
                queryBuilder.andWhere("item.is_dimension_special = 'Y'");
                queryBuilder.andWhere("(item.weight IS NULL OR item.weight = 0 OR item.length IS NULL OR item.length = 0 OR item.width IS NULL OR item.width = 0 OR item.height IS NULL OR item.height = 0)");
            }
            else if (filterStr === "missing_var_values_en") {
                queryBuilder.andWhere((qb) => {
                    const subQuery = qb
                        .subQuery()
                        .select("1")
                        .from(variation_values_1.VariationValue, "vv")
                        .where("vv.item_id = item.id")
                        .andWhere("((vv.value_de IS NOT NULL AND vv.value_de != '' AND (vv.value_en IS NULL OR vv.value_en = '')) OR " +
                        "(vv.value_de_2 IS NOT NULL AND vv.value_de_2 != '' AND (vv.value_en_2 IS NULL OR vv.value_en_2 = '')) OR " +
                        "(vv.value_de_3 IS NOT NULL AND vv.value_de_3 != '' AND (vv.value_en_3 IS NULL OR vv.value_en_3 = '')))");
                    return `EXISTS ${subQuery.getQuery()}`;
                });
            }
            else if (filterStr === "no_taric") {
                queryBuilder.andWhere("(item.taric_id IS NULL OR item.taric_id = 0)");
            }
            else if (filterStr === "mismatched_tarics") {
                queryBuilder.innerJoin("item.parent", "p_filter");
                queryBuilder.andWhere("item.taric_id IS NOT NULL AND item.taric_id != 0");
                queryBuilder.andWhere("p_filter.taric_id IS NOT NULL AND p_filter.taric_id != 0");
                queryBuilder.andWhere("item.taric_id <> p_filter.taric_id");
            }
            else if (filterStr === "null_category") {
                queryBuilder.andWhere("(item.cat_id IS NULL OR item.cat_id = 0)");
            }
            else if (filterStr === "no_supplier") {
                queryBuilder.leftJoin("supplier_item", "si_filter", "si_filter.item_id = item.id AND si_filter.is_default = 'Y'");
                queryBuilder.andWhere("item.isActive = 'Y'");
                queryBuilder.andWhere("(item.supplier_id IS NULL OR item.supplier_id = 0)");
                queryBuilder.andWhere("(si_filter.supplier_id IS NULL OR si_filter.supplier_id = 0)");
            }
            else if (filterStr === "no_rmb_price") {
                queryBuilder.leftJoin("supplier_item", "si_filter", "si_filter.item_id = item.id AND si_filter.is_default = 'Y'");
                queryBuilder.andWhere("item.isActive = 'Y'");
                queryBuilder.andWhere("(si_filter.price_rmb IS NULL OR si_filter.price_rmb = 0)");
            }
            else if (filterStr === "is_po_no_url_null") {
                queryBuilder.leftJoin("supplier_item", "si_filter", "si_filter.item_id = item.id AND si_filter.is_default = 'Y'");
                queryBuilder.andWhere("si_filter.is_po = 'No'");
                queryBuilder.andWhere("(si_filter.url IS NULL OR si_filter.url = '' OR si_filter.url = 'null' OR si_filter.url = 'NULL')");
            }
            else if (filterStr === "is_po_null") {
                queryBuilder.leftJoin("supplier_item", "si_filter", "si_filter.item_id = item.id AND si_filter.is_default = 'Y'");
                queryBuilder.andWhere("(si_filter.is_po IS NULL OR si_filter.is_po = '' OR si_filter.is_po = 'null' OR si_filter.is_po = 'NULL')");
            }
            else if (filterStr === "new_picture_required") {
                queryBuilder.andWhere("item.is_npr = 'Y'");
            }
            else if (filterStr === "no_picture") {
                queryBuilder.andWhere("item.isActive = 'Y'");
                queryBuilder.andWhere("(item.photo IS NULL OR item.photo = '' OR item.photo = 'null' OR item.photo = 'NULL')");
            }
            else if (filterStr === "multiple_parents_pictures") {
                queryBuilder.andWhere((qb) => {
                    const subQuery = qb
                        .subQuery()
                        .select("sub_item.photo")
                        .from(items_1.Item, "sub_item")
                        .where("sub_item.photo IS NOT NULL AND sub_item.photo != '' AND sub_item.photo != 'null' AND sub_item.photo != 'NULL' AND sub_item.parent_id IS NOT NULL")
                        .groupBy("sub_item.photo")
                        .having("COUNT(DISTINCT sub_item.parent_id) > 1");
                    return `item.photo IN ${subQuery.getQuery()}`;
                });
            }
        }
        queryBuilder.orderBy(`item.${sortBy}`, sortOrder === "DESC" ? "DESC" : "ASC");
        const totalRecords = yield queryBuilder.getCount();
        if (eanSearch || search) {
            console.log(`[DEBUG] Search found ${totalRecords} records.`);
        }
        queryBuilder.skip(skip).take(limitNum);
        const items = yield queryBuilder.getMany();
        const itemIds = items.map((item) => item.id);
        const parentIds = [
            ...new Set(items.map((i) => i.parent_id).filter(Boolean)),
        ];
        const taricIds = [
            ...new Set(items.map((i) => i.taric_id).filter(Boolean)),
        ];
        const catIds = [
            ...new Set(items.map((i) => i.cat_id).filter(Boolean)),
        ];
        const itemSupplierIds = [
            ...new Set(items.map((i) => i.supplier_id).filter(Boolean)),
        ];
        const [parents, tarics, cats, suppliersList, warehouseItems, supplierItems,] = yield Promise.all([
            parentIds.length > 0
                ? parentRepository.find({
                    where: { id: (0, typeorm_1.In)(parentIds) },
                    select: ["id", "de_no", "name_de", "name_en", "name_cn"],
                })
                : Promise.resolve([]),
            taricIds.length > 0
                ? taricRepository.find({
                    where: { id: (0, typeorm_1.In)(taricIds) },
                    select: ["id", "code", "description_de"],
                })
                : Promise.resolve([]),
            catIds.length > 0
                ? categoryRepository.find({
                    where: { id: (0, typeorm_1.In)(catIds) },
                    select: ["id", "name"],
                })
                : Promise.resolve([]),
            itemSupplierIds.length > 0
                ? supplierRepository.find({
                    where: { id: (0, typeorm_1.In)(itemSupplierIds) },
                    select: ["id", "name", "company_name"],
                })
                : Promise.resolve([]),
            itemIds.length > 0
                ? warehouseRepository.find({
                    where: [
                        { item_id: (0, typeorm_1.In)(itemIds) },
                        {
                            ItemID_DE: (0, typeorm_1.In)(items.map((i) => i.ItemID_DE).filter(Boolean)),
                        },
                    ],
                })
                : Promise.resolve([]),
            itemIds.length > 0
                ? database_1.AppDataSource.getRepository(supplier_items_1.SupplierItem).find({
                    where: { item_id: (0, typeorm_1.In)(itemIds) },
                })
                : Promise.resolve([]),
        ]);
        const parentMap = new Map(parents.map((p) => [p.id, p]));
        const taricMap = new Map(tarics.map((t) => [t.id, t]));
        const catMap = new Map(cats.map((c) => [c.id, c]));
        const supplierMap = new Map(suppliersList.map((s) => [s.id, s]));
        const rmbPriceMap = new Map();
        supplierItems.forEach((si) => {
            const existing = rmbPriceMap.get(si.item_id);
            if (!existing || si.is_default === "Y") {
                rmbPriceMap.set(si.item_id, si.price_rmb);
            }
        });
        const warehouseByItemId = new Map(warehouseItems.filter((wi) => wi.item_id).map((wi) => [wi.item_id, wi]));
        const warehouseByItemIdDE = new Map(warehouseItems
            .filter((wi) => wi.ItemID_DE)
            .map((wi) => [wi.ItemID_DE, wi]));
        const missingSupplierIds = items
            .filter((i) => !i.supplier_id)
            .map((i) => i.id);
        const defaultSIMap = new Map();
        if (missingSupplierIds.length > 0) {
            const defaultSIs = yield database_1.AppDataSource.getRepository(supplier_items_1.SupplierItem).find({
                where: { item_id: (0, typeorm_1.In)(missingSupplierIds), is_default: "Y" },
                relations: ["supplier"],
            });
            defaultSIs.forEach((si) => {
                var _a, _b;
                defaultSIMap.set(si.item_id, {
                    id: si.supplier_id,
                    name: ((_a = si.supplier) === null || _a === void 0 ? void 0 : _a.name) || null,
                    company_name: ((_b = si.supplier) === null || _b === void 0 ? void 0 : _b.company_name) || null,
                });
            });
        }
        const formattedItems = items.map((item) => {
            var _a, _b, _c;
            const parentData = item.parent_id ? parentMap.get(item.parent_id) : null;
            const taricData = item.taric_id ? taricMap.get(item.taric_id) : null;
            const warehouseData = (item.ItemID_DE ? warehouseByItemIdDE.get(item.ItemID_DE) : null) ||
                warehouseByItemId.get(item.id) ||
                null;
            let supplierData = item.supplier_id
                ? supplierMap.get(item.supplier_id)
                : defaultSIMap.get(item.id);
            const effectiveSupplierId = item.supplier_id || ((_a = defaultSIMap.get(item.id)) === null || _a === void 0 ? void 0 : _a.id) || null;
            return {
                id: item.id,
                de_no: (warehouseData === null || warehouseData === void 0 ? void 0 : warehouseData.item_no_de) || (parentData === null || parentData === void 0 ? void 0 : parentData.de_no) || null,
                name_de: (parentData === null || parentData === void 0 ? void 0 : parentData.name_de) || null,
                name_en: (parentData === null || parentData === void 0 ? void 0 : parentData.name_en) || null,
                name_cn: (parentData === null || parentData === void 0 ? void 0 : parentData.name_cn) || null,
                item_name: item.item_name,
                item_name_cn: item.item_name_cn,
                ean: item.ean || (warehouseData === null || warehouseData === void 0 ? void 0 : warehouseData.ean) || null,
                ItemID_DE: item.ItemID_DE || null,
                is_active: item.isActive,
                parent_id: item.parent_id || null,
                taric_id: item.taric_id || null,
                category_id: item.cat_id || null,
                category: (item === null || item === void 0 ? void 0 : item.supp_cat) || null,
                supplier_id: effectiveSupplierId,
                supplier_name: (supplierData === null || supplierData === void 0 ? void 0 : supplierData.company_name) || (supplierData === null || supplierData === void 0 ? void 0 : supplierData.name) || null,
                weight: item.weight,
                length: item.length,
                width: item.width,
                height: item.height,
                remark: item.remark,
                model: item.model,
                painPoints: item.painPoints || [],
                taric_code: (taricData === null || taricData === void 0 ? void 0 : taricData.code) || null,
                synced_at: item.synced_at,
                is_rmb_special: item.is_rmb_special,
                is_eur_special: item.is_eur_special,
                is_dimension_special: item.is_dimension_special,
                is_npr: item.is_npr,
                ship_class: (warehouseData === null || warehouseData === void 0 ? void 0 : warehouseData.ship_class) || null,
                is_po: ((_b = supplierItems.find((si) => si.item_id === item.id && si.is_default === "Y")) === null || _b === void 0 ? void 0 : _b.is_po) || null,
                url: ((_c = supplierItems.find((si) => si.item_id === item.id && si.is_default === "Y")) === null || _c === void 0 ? void 0 : _c.url) || null,
                rmb_price: rmbPriceMap.get(item.id) || null,
                price: item.price,
                transfer_price_EUR: item.transfer_price_EUR,
                warehouse_data: warehouseData
                    ? {
                        id: warehouseData.id,
                        item_no_de: warehouseData.item_no_de,
                        stock_qty: warehouseData.stock_qty,
                        msq: warehouseData.msq,
                        buffer: warehouseData.buffer,
                        is_stock_item: warehouseData.is_stock_item,
                    }
                    : null,
                created_at: item.created_at,
                updated_at: item.updated_at,
                tags: item.tags || [],
                tagOrder: item.tagOrder,
            };
        });
        const user = req.user;
        const filteredData = (0, dataFilter_1.filterDataByRole)(formattedItems, (user === null || user === void 0 ? void 0 : user.role) || users_1.UserRole.STAFF);
        return res.status(200).json({
            success: true,
            data: filteredData,
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
const getItemById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6;
    try {
        const { id } = req.params;
        if (!id) {
            return next(new errorHandler_1.default("Item ID is required", 400));
        }
        if (id === "tarics" ||
            id === "stats" ||
            id === "parents" ||
            id === "warehouse") {
            return next();
        }
        if (isNaN(parseInt(id))) {
            return next(new errorHandler_1.default("Valid numeric Item ID is required", 400));
        }
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const warehouseRepository = database_1.AppDataSource.getRepository(warehouse_items_1.WarehouseItem);
        const variationRepository = database_1.AppDataSource.getRepository(variation_values_1.VariationValue);
        const qualityRepository = database_1.AppDataSource.getRepository(item_qualities_1.ItemQuality);
        const orderItemRepository = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
        const supplierItemRepository = database_1.AppDataSource.getRepository(supplier_items_1.SupplierItem);
        const item = yield itemRepository.findOne({
            where: { id: parseInt(id) },
            relations: ["parent", "taric", "category", "supplier", "tags"],
        });
        console.log(item);
        if (!item) {
            return next(new errorHandler_1.default("Item not found", 404));
        }
        let warehouseItems = [];
        try {
            if (item.ItemID_DE) {
                warehouseItems = yield warehouseRepository.find({
                    where: { ItemID_DE: item.ItemID_DE },
                });
            }
            if (warehouseItems.length === 0) {
                warehouseItems = yield warehouseRepository.find({
                    where: { item_id: parseInt(id) },
                });
            }
        }
        catch (e) {
            console.warn("warehouse_items table not available:", e.message);
        }
        let variationValues = [];
        try {
            variationValues = yield variationRepository.find({
                where: { item_id: parseInt(id) },
            });
        }
        catch (e) {
            console.warn("variation_values table not available:", e.message);
        }
        let qualityCriteria = [];
        try {
            qualityCriteria = yield qualityRepository.find({
                where: { item_id: parseInt(id) },
            });
        }
        catch (e) {
            console.warn("item_qualities table not available:", e.message);
        }
        let supplierItems = [];
        try {
            supplierItems = yield supplierItemRepository.find({
                where: { item_id: parseInt(id) },
                relations: ["supplier"],
            });
            if (item.supplier_id &&
                !supplierItems.some((si) => Number(si.supplier_id) === Number(item.supplier_id))) {
                const newSupplierItem = supplierItemRepository.create({
                    item_id: item.id,
                    supplier_id: item.supplier_id,
                    is_default: supplierItems.length === 0 ? "Y" : "N",
                    moq: 1,
                    oi: 0,
                    is_po: "No",
                    lead_time: "",
                    url: "",
                });
                yield supplierItemRepository.save(newSupplierItem);
                supplierItems = yield supplierItemRepository.find({
                    where: { item_id: parseInt(id) },
                    relations: ["supplier"],
                });
            }
        }
        catch (e) {
            console.warn("supplier_items table not available:", e.message);
        }
        const primaryWarehouseItem = warehouseItems[0] || null;
        let attachments = [];
        try {
            const libraryRepository = database_1.AppDataSource.getRepository(library_1.LibraryFile);
            attachments = yield libraryRepository.find({
                where: { itemId: parseInt(id) },
            });
        }
        catch (e) {
            console.warn("library_files table not available:", e.message);
        }
        const de_no = (primaryWarehouseItem === null || primaryWarehouseItem === void 0 ? void 0 : primaryWarehouseItem.item_no_de) || ((_a = item.parent) === null || _a === void 0 ? void 0 : _a.de_no) || "";
        const ean = item.ean || (primaryWarehouseItem === null || primaryWarehouseItem === void 0 ? void 0 : primaryWarehouseItem.ean) || "";
        const rmbPrice = yield (0, exports.getRMBPriceFromSupplier)(parseInt(id), (_b = item.supplier_id) !== null && _b !== void 0 ? _b : undefined);
        const formattedItem = {
            id: item.id,
            de_no: de_no,
            is_new: item.is_new || "N",
            itemNo: `${item.id} / ${de_no}`,
            item_name: item.item_name || "",
            is_active: item.isActive || "N",
            created_at: item.created_at,
            name: item.item_name || "",
            nameCN: item.item_name_cn || "",
            ean: (ean === null || ean === void 0 ? void 0 : ean.toString()) || "",
            category: item.supp_cat,
            category_id: item.cat_id,
            model: item.model || "",
            remark: item.remark || "",
            supplier_id: item.supplier_id,
            supplier_name: ((_c = item.supplier) === null || _c === void 0 ? void 0 : _c.company_name) || ((_d = item.supplier) === null || _d === void 0 ? void 0 : _d.name) || "",
            painPoints: item.painPoints || [],
            isActive: item.isActive === "Y",
            tags: item.tags || [],
            tagOrder: item.tagOrder,
            is_updated: item.is_updated,
            isLabelPrint: item.isLabelPrint || false,
            transfer_price: item.transfer_price_EUR
                ? Number(item.transfer_price_EUR).toFixed(2)
                : "null",
            parent: {
                noDE: ((_e = item.parent) === null || _e === void 0 ? void 0 : _e.de_no) || item.parent_no_de || "",
                nameDE: ((_f = item.parent) === null || _f === void 0 ? void 0 : _f.name_de) || "",
                nameEN: ((_g = item.parent) === null || _g === void 0 ? void 0 : _g.name_en) || "",
                isActive: ((_h = item.parent) === null || _h === void 0 ? void 0 : _h.is_active) === "Y",
                isSpecialItem: ((_j = item.parent) === null || _j === void 0 ? void 0 : _j.is_NwV) === "Y",
                priceEUR: 0,
                priceRMB: rmbPrice || 0,
                isEURSpecial: item.is_eur_special || "N",
                isRMBSpecial: item.is_rmb_special || "N",
                isDimensionSpecial: item.is_dimension_special || "N",
            },
            dimensions: {
                isbn: ((_k = item.ISBN) === null || _k === void 0 ? void 0 : _k.toString()) || "0",
                weight: ((_l = item.weight) === null || _l === void 0 ? void 0 : _l.toString()) || "0",
                length: ((_m = item.length) === null || _m === void 0 ? void 0 : _m.toString()) || "0",
                width: ((_o = item.width) === null || _o === void 0 ? void 0 : _o.toString()) || "0",
                height: ((_p = item.height) === null || _p === void 0 ? void 0 : _p.toString()) || "0",
            },
            variationsDE: {
                variations: [
                    (_q = item.parent) === null || _q === void 0 ? void 0 : _q.var_de_1,
                    (_r = item.parent) === null || _r === void 0 ? void 0 : _r.var_de_2,
                    (_s = item.parent) === null || _s === void 0 ? void 0 : _s.var_de_3,
                ].filter(Boolean),
                values: variationValues.map((v) => v.value_de).filter(Boolean),
            },
            variationsEN: {
                variations: [
                    (_t = item.parent) === null || _t === void 0 ? void 0 : _t.var_en_1,
                    (_u = item.parent) === null || _u === void 0 ? void 0 : _u.var_en_2,
                    (_v = item.parent) === null || _v === void 0 ? void 0 : _v.var_en_3,
                ].filter(Boolean),
                values: variationValues.map((v) => v.value_en).filter(Boolean),
            },
            others: {
                taricCode: ((_w = item.taric) === null || _w === void 0 ? void 0 : _w.code) || "",
                isQTYdiv: item.is_qty_dividable === "Y",
                mc: ((_x = item.many_components) === null || _x === void 0 ? void 0 : _x.toString()) || "0",
                er: ((_y = item.effort_rating) === null || _y === void 0 ? void 0 : _y.toString()) || "0",
                isMeter: item.is_meter_item === 1,
                isPU: item.is_pu_item === 1,
                isNPR: item.is_npr || "N",
                isNew: item.is_new || "N",
                warehouseItem: ((_z = primaryWarehouseItem === null || primaryWarehouseItem === void 0 ? void 0 : primaryWarehouseItem.id) === null || _z === void 0 ? void 0 : _z.toString()) || "",
                idDE: ((_0 = item.ItemID_DE) === null || _0 === void 0 ? void 0 : _0.toString()) || "",
                noDE: (primaryWarehouseItem === null || primaryWarehouseItem === void 0 ? void 0 : primaryWarehouseItem.item_no_de) || item.parent_no_de || "",
                nameDE: (primaryWarehouseItem === null || primaryWarehouseItem === void 0 ? void 0 : primaryWarehouseItem.item_name_de) || ((_1 = item.parent) === null || _1 === void 0 ? void 0 : _1.name_de) || "",
                nameEN: (primaryWarehouseItem === null || primaryWarehouseItem === void 0 ? void 0 : primaryWarehouseItem.item_name_en) || ((_2 = item.parent) === null || _2 === void 0 ? void 0 : _2.name_en) || "",
                isActive: item.isActive === "Y",
                isStock: warehouseItems.some((wi) => (wi.stock_qty || 0) > 0),
                qty: warehouseItems
                    .reduce((sum, wi) => sum + (wi.stock_qty || 0), 0)
                    .toString(),
                msq: ((_3 = primaryWarehouseItem === null || primaryWarehouseItem === void 0 ? void 0 : primaryWarehouseItem.msq) === null || _3 === void 0 ? void 0 : _3.toString()) || "0",
                isNAO: (primaryWarehouseItem === null || primaryWarehouseItem === void 0 ? void 0 : primaryWarehouseItem.is_no_auto_order) === "Y",
                buffer: ((_4 = primaryWarehouseItem === null || primaryWarehouseItem === void 0 ? void 0 : primaryWarehouseItem.buffer) === null || _4 === void 0 ? void 0 : _4.toString()) || "0",
                isSnSI: (primaryWarehouseItem === null || primaryWarehouseItem === void 0 ? void 0 : primaryWarehouseItem.is_SnSI) === "Y",
                foq: ((_5 = item.FOQ) === null || _5 === void 0 ? void 0 : _5.toString()) || "0",
                fsq: ((_6 = item.FSQ) === null || _6 === void 0 ? void 0 : _6.toString()) || "0",
                rmbPrice: (rmbPrice === null || rmbPrice === void 0 ? void 0 : rmbPrice.toString()) || "0",
                isDimensionSpecial: item.is_dimension_special || "N",
                pixPath: item.pix_path || "",
                suppCat: item.supp_cat || "",
            },
            qualityCriteria: qualityCriteria.map((qc) => ({
                id: qc.id,
                itemId: qc.item_id,
                name: qc.name || "",
                picture: qc.picture || "",
                description: qc.description || "",
                descriptionCN: qc.description_cn || "",
            })),
            attachments: attachments.map((file) => ({
                id: file.id,
                filename: file.filename,
                originalName: file.originalName,
                url: (0, cloudinary_1.signCloudinaryPdfUrl)(file.url),
                fileType: file.fileType,
                uploadedAt: file.uploadedAt,
            })),
            pictures: {
                shopPicture: item.photo || "",
                ebayPictures: item.pix_path_eBay || "",
                pixPath: item.pix_path || "",
            },
            supplierItems: supplierItems.map((si) => {
                var _a, _b, _c, _d, _e;
                return ({
                    id: si.id,
                    supplierId: si.supplier_id,
                    supplierName: ((_a = si.supplier) === null || _a === void 0 ? void 0 : _a.company_name) || ((_b = si.supplier) === null || _b === void 0 ? void 0 : _b.name) || "Unknown",
                    priceRMB: ((_c = si.price_rmb) === null || _c === void 0 ? void 0 : _c.toString()) || "0",
                    isPO: si.is_po || "No",
                    moq: ((_d = si.moq) === null || _d === void 0 ? void 0 : _d.toString()) || "0",
                    interval: ((_e = si.oi) === null || _e === void 0 ? void 0 : _e.toString()) || "0",
                    leadTime: si.lead_time || "",
                    noteCN: si.note_cn || "",
                    url: si.url || "",
                    isDefault: si.is_default === "Y",
                });
            }),
            supplierItem: (() => {
                var _a, _b, _c, _d, _e;
                const defaultSi = supplierItems.find((si) => item.supplier_id &&
                    Number(si.supplier_id) === Number(item.supplier_id)) ||
                    supplierItems.find((si) => si.is_default === "Y") ||
                    supplierItems[0];
                return defaultSi
                    ? {
                        id: defaultSi.id,
                        supplierId: defaultSi.supplier_id,
                        supplierName: ((_a = defaultSi.supplier) === null || _a === void 0 ? void 0 : _a.company_name) ||
                            ((_b = defaultSi.supplier) === null || _b === void 0 ? void 0 : _b.name) ||
                            "Unknown",
                        priceRMB: ((_c = defaultSi.price_rmb) === null || _c === void 0 ? void 0 : _c.toString()) || "0",
                        isPO: defaultSi.is_po || "No",
                        moq: ((_d = defaultSi.moq) === null || _d === void 0 ? void 0 : _d.toString()) || "0",
                        interval: ((_e = defaultSi.oi) === null || _e === void 0 ? void 0 : _e.toString()) || "0",
                        leadTime: defaultSi.lead_time || "",
                        noteCN: defaultSi.note_cn || "",
                        url: defaultSi.url || "",
                    }
                    : {
                        priceRMB: "0",
                        isPO: "No",
                        moq: "0",
                        interval: "0",
                        leadTime: "",
                        noteCN: "",
                        url: "",
                    };
            })(),
            nprRemarks: item.npr_remark || "",
        };
        const user = req.user;
        const filteredData = (0, dataFilter_1.filterDataByRole)(formattedItem, (user === null || user === void 0 ? void 0 : user.role) || users_1.UserRole.STAFF);
        return res.status(200).json({
            success: true,
            data: filteredData,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getItemById = getItemById;
const createItem = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
        const categoryRepository = database_1.AppDataSource.getRepository(categories_1.Category);
        let { item_name, item_name_cn, ean, parent_id, taric_id, cat_id, weight, length, width, height, supplier_id, remark, model, RMB_Price, price, currency, isActive = "Y", is_qty_dividable = "Y", is_npr = "N", is_eur_special = "N", is_rmb_special = "N", painPoints = [], item_no_de, item_name_de, isLabelPrint = false, } = req.body;
        if (!item_name || !parent_id || !supplier_id) {
            return next(new errorHandler_1.default("Item name, Parent, and Supplier are required", 400));
        }
        if (supplier_id) {
            const supplier = yield database_1.AppDataSource.getRepository(suppliers_1.Supplier).findOne({
                where: { id: supplier_id },
            });
            if (!supplier)
                return next(new errorHandler_1.default("Supplier not found", 404));
        }
        const parent = yield parentRepository.findOne({ where: { id: parent_id } });
        if (!parent)
            return next(new errorHandler_1.default("Parent not found", 404));
        if (taric_id) {
            const taric = yield taricRepository.findOne({ where: { id: taric_id } });
            if (!taric)
                return next(new errorHandler_1.default("Taric not found", 404));
        }
        let category = null;
        if (cat_id) {
            category = yield categoryRepository.findOne({ where: { id: cat_id } });
            if (!category)
                return next(new errorHandler_1.default("Category not found", 404));
        }
        if (!ean || ean.trim() === "") {
            const prefix = "789";
            const timestamp = (Date.now() % 1000000).toString().padStart(6, "0");
            const random = Math.floor(Math.random() * 1000000)
                .toString()
                .padStart(6, "0");
            const baseNumber = (timestamp + random).slice(0, 9);
            const eanWithoutCheck = prefix + baseNumber;
            let sum = 0;
            for (let i = 0; i < eanWithoutCheck.length; i++) {
                const digit = parseInt(eanWithoutCheck[i]);
                sum += i % 2 === 0 ? digit * 1 : digit * 3;
            }
            const remainder = sum % 10;
            const checkDigit = remainder === 0 ? 0 : 10 - remainder;
            ean = eanWithoutCheck + checkDigit;
        }
        else {
            const existingItem = yield itemRepository.findOne({
                where: { ean: ean.toString() },
            });
            if (existingItem)
                return next(new errorHandler_1.default("Item with this EAN already exists", 400));
        }
        const finalRMB = RMB_Price ? parseFloat(RMB_Price) : null;
        let finalPrice = null;
        if (finalRMB !== null && !isNaN(finalRMB)) {
            finalPrice = calculateTransferPrice(finalRMB, (category === null || category === void 0 ? void 0 : category.name) || "STD");
        }
        const newItem = itemRepository.create({
            item_name,
            item_name_cn,
            ean: ean ? ean.toString() : null,
            parent_id,
            taric_id,
            cat_id,
            supplier_id,
            weight: weight ? parseFloat(weight) : null,
            length: length ? parseFloat(length) : 0,
            width: width ? parseFloat(width) : null,
            height: height ? parseFloat(height) : null,
            remark,
            model,
            RMB_Price: finalRMB,
            price: finalPrice,
            currency,
            isActive,
            is_qty_dividable,
            is_npr,
            is_eur_special,
            is_rmb_special,
            painPoints,
            is_new: "Y",
            is_updated: false,
            isLabelPrint,
            created_at: new Date(),
            updated_at: new Date(),
        });
        yield itemRepository.save(newItem);
        try {
            if (supplier_id) {
                const supplierItemRepository = database_1.AppDataSource.getRepository(supplier_items_1.SupplierItem);
                const supplierItem = supplierItemRepository.create({
                    item_id: newItem.id,
                    supplier_id: supplier_id,
                    price_rmb: finalRMB || 0,
                    is_default: "Y",
                    is_po: "No",
                    oi: 0,
                    moq: 1,
                });
                yield supplierItemRepository.save(supplierItem);
            }
        }
        catch (err) {
            console.warn("Supplier item creation failed:", err);
        }
        try {
            const warehouseRepository = database_1.AppDataSource.getRepository(warehouse_items_1.WarehouseItem);
            const warehouseItem = warehouseRepository.create({
                item_id: newItem.id,
                item_no_de: item_no_de || parent.de_no,
                item_name_de: item_name_de || item_name,
                item_name_en: item_name,
                stock_qty: 0,
                msq: 0,
                buffer: 0,
                is_active: "Y",
                is_stock_item: "N",
                created_at: new Date(),
            });
            yield warehouseRepository.save(warehouseItem);
        }
        catch (err) {
            console.warn("Warehouse creation failed:", err);
        }
        return res.status(201).json({
            success: true,
            message: "Item created successfully",
            data: newItem,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.createItem = createItem;
const updateItem = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { id } = req.params;
        console.log(`[DEBUG] updateItem called for ID: ${id}. Body:`, JSON.stringify(req.body, null, 2));
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const supplierItemRepository = database_1.AppDataSource.getRepository(supplier_items_1.SupplierItem);
        const warehouseRepository = database_1.AppDataSource.getRepository(warehouse_items_1.WarehouseItem);
        const categoryRepository = database_1.AppDataSource.getRepository(categories_1.Category);
        if (!id)
            return next(new errorHandler_1.default("Item ID is required", 400));
        const item = yield itemRepository.findOne({ where: { id: parseInt(id) }, relations: ["tags"] });
        if (!item)
            return next(new errorHandler_1.default("Item not found", 404));
        let newSupplierId = req.body.supplier_id;
        if (!newSupplierId || newSupplierId === 0) {
            const defaultSI = yield supplierItemRepository.findOne({
                where: { item_id: item.id, is_default: "Y" },
            });
            if (defaultSI) {
                newSupplierId = defaultSI.supplier_id;
                req.body.supplier_id = newSupplierId;
            }
            else {
                const anySI = yield supplierItemRepository.findOne({
                    where: { item_id: item.id },
                });
                if (anySI) {
                    newSupplierId = anySI.supplier_id;
                    req.body.supplier_id = newSupplierId;
                }
            }
        }
        if (!newSupplierId && !item.supplier_id) {
            return next(new errorHandler_1.default("This item needs a supplier assigned before saving changes", 400));
        }
        if (newSupplierId) {
            const allSIs = yield supplierItemRepository.find({
                where: { item_id: item.id },
            });
            let foundActive = false;
            for (const si of allSIs) {
                const shouldBeDefault = Number(si.supplier_id) === Number(newSupplierId);
                if (shouldBeDefault) {
                    foundActive = true;
                }
                const targetIsDefault = shouldBeDefault ? "Y" : "N";
                if (si.is_default !== targetIsDefault) {
                    si.is_default = targetIsDefault;
                    yield supplierItemRepository.save(si);
                }
            }
            if (!foundActive) {
                const supplierItemData = req.body.supplierItem;
                const newSI = supplierItemRepository.create({
                    item_id: item.id,
                    supplier_id: newSupplierId,
                    is_default: "Y",
                    price_rmb: (supplierItemData === null || supplierItemData === void 0 ? void 0 : supplierItemData.price_rmb) !== undefined
                        ? parseFloat(supplierItemData.price_rmb)
                        : 0,
                    is_po: (supplierItemData === null || supplierItemData === void 0 ? void 0 : supplierItemData.is_po) || "No",
                    moq: (supplierItemData === null || supplierItemData === void 0 ? void 0 : supplierItemData.moq) !== undefined
                        ? parseInt(supplierItemData.moq)
                        : 1,
                    oi: (supplierItemData === null || supplierItemData === void 0 ? void 0 : supplierItemData.oi) !== undefined
                        ? parseInt(supplierItemData.oi)
                        : 0,
                    lead_time: (supplierItemData === null || supplierItemData === void 0 ? void 0 : supplierItemData.lead_time) || "",
                    url: (supplierItemData === null || supplierItemData === void 0 ? void 0 : supplierItemData.url) || "",
                });
                yield supplierItemRepository.save(newSI);
            }
        }
        const updatableFields = [
            "item_name",
            "item_name_cn",
            "ean",
            "parent_id",
            "taric_id",
            "cat_id",
            "supplier_id",
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
            "is_dimension_special",
            "FOQ",
            "FSQ",
            "ISBN",
            "many_components",
            "effort_rating",
            "is_pu_item",
            "is_meter_item",
            "is_new",
            "supp_cat",
            "ItemID_DE",
            "painPoints",
            "price",
            "transfer_price_EUR",
            "isLabelPrint",
        ];
        let hasChanges = false;
        updatableFields.forEach((field) => {
            const value = req.body[field];
            if (value !== undefined) {
                const currentValue = item[field];
                let newValue = field === "ean" ? (value ? value.toString() : null) : value;
                if (currentValue != newValue) {
                    hasChanges = true;
                    item[field] = newValue;
                }
            }
        });
        const supplierItemData = req.body.supplierItem;
        const supplierItemsData = req.body.supplierItems;
        if (supplierItemsData && Array.isArray(supplierItemsData)) {
            const existingSupplierItems = yield supplierItemRepository.find({
                where: { item_id: item.id },
            });
            const incomingIds = supplierItemsData
                .filter((si) => si.id > 0)
                .map((si) => si.id);
            for (const existing of existingSupplierItems) {
                if (!incomingIds.includes(existing.id)) {
                    yield supplierItemRepository.delete(existing.id);
                }
            }
            for (const siData of supplierItemsData) {
                if (siData.id > 0) {
                    yield supplierItemRepository.update(siData.id, {
                        is_default: siData.isDefault ? "Y" : "N",
                        price_rmb: siData.priceRMB !== undefined && siData.priceRMB !== "" ? parseFloat(siData.priceRMB) : undefined,
                        moq: siData.moq !== undefined && siData.moq !== "" ? parseInt(siData.moq) : undefined,
                        oi: siData.interval !== undefined && siData.interval !== "" ? parseInt(siData.interval) : undefined,
                        lead_time: siData.leadTime !== undefined ? siData.leadTime : undefined,
                        url: siData.url !== undefined ? siData.url : undefined,
                        note_cn: siData.noteCN !== undefined ? siData.noteCN : undefined,
                        is_po: siData.isPO !== undefined ? siData.isPO : undefined,
                    });
                }
                else if (siData.id < 0 && siData.supplierId) {
                    const newSI = supplierItemRepository.create({
                        item_id: item.id,
                        supplier_id: siData.supplierId,
                        is_default: siData.isDefault ? "Y" : "N",
                        price_rmb: parseFloat(siData.priceRMB) || 0,
                        moq: parseInt(siData.moq) || 0,
                        lead_time: siData.leadTime || "",
                    });
                    yield supplierItemRepository.save(newSI);
                }
            }
            hasChanges = true;
        }
        const category = yield categoryRepository.findOne({
            where: { id: item.cat_id },
        });
        let currentRMBPrice = null;
        if (supplierItemData) {
            const targetSupplierId = req.body.supplier_id || item.supplier_id;
            let supplierItem = yield supplierItemRepository.findOne({
                where: { item_id: item.id, supplier_id: targetSupplierId },
            });
            if (supplierItem) {
                let sChanges = false;
                if (supplierItemData.price_rmb !== undefined) {
                    const newRMB = parseFloat(supplierItemData.price_rmb);
                    if (supplierItem.price_rmb !== newRMB) {
                        supplierItem.price_rmb = newRMB;
                        currentRMBPrice = newRMB;
                        sChanges = true;
                    }
                }
                if (supplierItemData.is_po !== undefined) {
                    supplierItem.is_po = supplierItemData.is_po;
                    sChanges = true;
                }
                if (supplierItemData.moq !== undefined) {
                    supplierItem.moq = parseInt(supplierItemData.moq);
                    sChanges = true;
                }
                if (supplierItemData.oi !== undefined) {
                    supplierItem.oi = parseInt(supplierItemData.oi);
                    sChanges = true;
                }
                if (supplierItemData.lead_time !== undefined) {
                    supplierItem.lead_time = supplierItemData.lead_time;
                    sChanges = true;
                }
                if (supplierItemData.url !== undefined) {
                    supplierItem.url = supplierItemData.url;
                    sChanges = true;
                }
                if (supplierItemData.note_cn !== undefined) {
                    supplierItem.note_cn = supplierItemData.note_cn;
                    sChanges = true;
                }
                if (sChanges) {
                    yield supplierItemRepository.save(supplierItem);
                    hasChanges = true;
                }
            }
            else {
                const newSI = supplierItemRepository.create({
                    item_id: item.id,
                    supplier_id: targetSupplierId || 0,
                    price_rmb: toNum(supplierItemData.price_rmb),
                    is_po: supplierItemData.is_po || "No",
                    moq: toInt(supplierItemData.moq),
                    oi: toInt(supplierItemData.oi),
                    lead_time: supplierItemData.lead_time || "",
                    url: supplierItemData.url || "",
                    is_default: "Y",
                });
                yield supplierItemRepository.save(newSI);
                currentRMBPrice = newSI.price_rmb;
                hasChanges = true;
            }
        }
        const categoryName = (category === null || category === void 0 ? void 0 : category.name) || item.supp_cat || "STD";
        let rmbPriceToUse = null;
        if (supplierItemData && supplierItemData.price_rmb !== undefined) {
            rmbPriceToUse = parseFloat(supplierItemData.price_rmb);
        }
        else {
            const existingSI = (yield supplierItemRepository.findOne({
                where: { item_id: item.id, is_default: "Y" },
            })) ||
                (yield supplierItemRepository.findOne({
                    where: { item_id: item.id },
                }));
            rmbPriceToUse =
                (existingSI === null || existingSI === void 0 ? void 0 : existingSI.price_rmb) !== undefined && (existingSI === null || existingSI === void 0 ? void 0 : existingSI.price_rmb) !== null
                    ? parseFloat(existingSI.price_rmb)
                    : null;
        }
        if (rmbPriceToUse !== null && !isNaN(rmbPriceToUse)) {
            const calculatedPrice = calculateTransferPrice(rmbPriceToUse, categoryName);
            if (item.price !== calculatedPrice ||
                item.transfer_price_EUR !== calculatedPrice) {
                item.price = calculatedPrice;
                item.transfer_price_EUR = calculatedPrice;
                hasChanges = true;
            }
        }
        else {
            if (item.price !== null || item.transfer_price_EUR !== null) {
                item.price = null;
                item.transfer_price_EUR = null;
                hasChanges = true;
            }
        }
        if (hasChanges) {
            item.is_updated = true;
            item.updated_at = new Date();
            yield itemRepository.save(item);
        }
        const warehouseItemData = req.body.warehouseItemData;
        if (warehouseItemData) {
            let warehouseItem = yield warehouseRepository.findOne({
                where: { item_id: item.id },
            });
            if (warehouseItem) {
                Object.assign(warehouseItem, {
                    is_stock_item: (_a = warehouseItemData.is_stock_item) !== null && _a !== void 0 ? _a : warehouseItem.is_stock_item,
                    is_active: (_b = warehouseItemData.is_active) !== null && _b !== void 0 ? _b : warehouseItem.is_active,
                    msq: warehouseItemData.msq
                        ? parseFloat(warehouseItemData.msq)
                        : warehouseItem.msq,
                    buffer: warehouseItemData.buffer
                        ? parseInt(warehouseItemData.buffer)
                        : warehouseItem.buffer,
                    item_no_de: (_c = warehouseItemData.item_no_de) !== null && _c !== void 0 ? _c : warehouseItem.item_no_de,
                    item_name_de: (_d = warehouseItemData.item_name_de) !== null && _d !== void 0 ? _d : warehouseItem.item_name_de,
                });
                yield warehouseRepository.save(warehouseItem);
            }
        }
        return res.status(200).json({
            success: true,
            message: "Item updated successfully",
            data: item,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.updateItem = updateItem;
const syncTransferPrices = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const itemRepo = database_1.AppDataSource.getRepository(items_1.Item);
        const categoryRepo = database_1.AppDataSource.getRepository(categories_1.Category);
        const supplierItemRepo = database_1.AppDataSource.getRepository(supplier_items_1.SupplierItem);
        const stdCategory = yield categoryRepo.findOne({ where: { name: "STD" } });
        if (!stdCategory)
            return next(new errorHandler_1.default("STD Category not found", 404));
        const items = yield itemRepo.find({ where: { supp_cat: "STD" } });
        console.log(items);
        let count = 0;
        for (const item of items) {
            const sItem = yield supplierItemRepo.findOne({
                where: { item_id: item.id },
            });
            if (sItem && sItem.price_rmb) {
                const newTransferPrice = calculateTransferPrice(sItem.price_rmb, ((_a = item.category) === null || _a === void 0 ? void 0 : _a.name) || "STD");
                if (item.transfer_price_EUR !== newTransferPrice ||
                    item.price !== newTransferPrice) {
                    item.transfer_price_EUR = newTransferPrice;
                    item.price = newTransferPrice;
                    item.is_updated = true;
                    yield itemRepo.save(item);
                    count++;
                }
            }
        }
        return res
            .status(200)
            .json({ success: true, message: `Updated ${count} transfer prices.` });
    }
    catch (error) {
        next(error);
    }
});
exports.syncTransferPrices = syncTransferPrices;
const toNum = (val) => {
    if (val === null || val === undefined || val === "")
        return null;
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
};
const toInt = (val) => {
    if (val === null || val === undefined || val === "")
        return null;
    const n = parseInt(val);
    return isNaN(n) ? null : n;
};
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
        const item = yield itemRepository.findOne({ where: { id: parseInt(id) } });
        if (!item) {
            return next(new errorHandler_1.default("Item not found", 404));
        }
        const warehouseItems = yield warehouseRepository.find({
            where: { item_id: parseInt(id) },
        });
        const totalStock = warehouseItems.reduce((sum, wi) => sum + wi.stock_qty, 0);
        if (totalStock > 0) {
            return next(new errorHandler_1.default("Cannot delete item. There is stock in warehouse. Please clear stock first.", 400));
        }
        yield database_1.AppDataSource.transaction((transactionalEntityManager) => __awaiter(void 0, void 0, void 0, function* () {
            yield transactionalEntityManager
                .createQueryBuilder()
                .delete()
                .from(warehouse_items_1.WarehouseItem)
                .where("item_id = :itemId", { itemId: parseInt(id) })
                .execute();
            yield transactionalEntityManager
                .createQueryBuilder()
                .delete()
                .from(variation_values_1.VariationValue)
                .where("item_id = :itemId", { itemId: parseInt(id) })
                .execute();
            yield transactionalEntityManager
                .createQueryBuilder()
                .delete()
                .from(item_qualities_1.ItemQuality)
                .where("item_id = :itemId", { itemId: parseInt(id) })
                .execute();
            yield transactionalEntityManager
                .createQueryBuilder()
                .delete()
                .from(supplier_items_1.SupplierItem)
                .where("item_id = :itemId", { itemId: parseInt(id) })
                .execute();
            yield transactionalEntityManager
                .createQueryBuilder()
                .delete()
                .from(library_1.LibraryFile)
                .where('"itemId" = :itemId', { itemId: parseInt(id) })
                .execute();
            yield transactionalEntityManager
                .createQueryBuilder()
                .delete()
                .from(order_items_1.OrderItem)
                .where("item_id = :itemId", { itemId: parseInt(id) })
                .execute();
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
        const newStatus = isActive ? "Y" : "N";
        if (item.isActive !== newStatus) {
            item.isActive = newStatus;
            item.is_updated = true;
            item.updated_at = new Date();
            yield itemRepository.save(item);
        }
        return res.status(200).json({
            success: true,
            message: `Item ${isActive ? "activated" : "deactivated"} successfully`,
            data: {
                id: item.id,
                isActive: item.isActive,
                is_updated: item.is_updated,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.toggleItemStatus = toggleItemStatus;
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
                let hasChanges = false;
                Object.keys(updates).forEach((key) => {
                    if (key in item && key !== "id") {
                        const currentValue = item[key];
                        const newValue = updates[key];
                        if (currentValue !== newValue) {
                            hasChanges = true;
                            item[key] = newValue;
                        }
                    }
                });
                if (hasChanges) {
                    item.is_updated = true;
                    item.updated_at = new Date();
                    yield itemRepository.save(item);
                    updatedItems.push(item);
                }
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
                    is_updated: item.is_updated,
                })),
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.bulkUpdateItems = bulkUpdateItems;
const getItemStatistics = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const warehouseRepository = database_1.AppDataSource.getRepository(warehouse_items_1.WarehouseItem);
        const totalItems = yield itemRepository.count();
        const activeItems = yield itemRepository.count({
            where: { isActive: "Y" },
        });
        const itemsNeedingSync = yield itemRepository.count({
            where: { is_updated: true },
        });
        const itemsPendingNew = yield itemRepository.count({
            where: { is_new: "Y" },
        });
        let itemsWithStock = { count: 0 };
        try {
            itemsWithStock = (yield warehouseRepository
                .createQueryBuilder("warehouse")
                .select("COUNT(DISTINCT warehouse.item_id)", "count")
                .where("warehouse.stock_qty > 0")
                .getRawOne()) || { count: 0 };
        }
        catch (e) {
            console.warn("Could not fetch warehouse stock statistics:", e.message);
        }
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
                itemsNeedingSync,
                itemsPendingNew,
                itemsByCategory,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getItemStatistics = getItemStatistics;
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
            .orWhere("CAST(item.id AS TEXT) ILIKE :search", { search: searchTerm })
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
                is_updated: item.is_updated,
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
const resetUpdatedFlag = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ids } = req.body;
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        if (ids && Array.isArray(ids) && ids.length > 0) {
            yield itemRepository.update({ id: (0, typeorm_1.In)(ids) }, { is_updated: false });
            return res.status(200).json({
                success: true,
                message: `Reset is_updated flag for ${ids.length} items`,
            });
        }
        else {
            yield itemRepository.update({}, { is_updated: false });
            return res.status(200).json({
                success: true,
                message: "Reset is_updated flag for all items",
            });
        }
    }
    catch (error) {
        return next(error);
    }
});
exports.resetUpdatedFlag = resetUpdatedFlag;
const getParents = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        const { page = "1", limit = "30", search = "", status = "", isActive = "", sortBy = "created_at", sortOrder = "DESC", supplierId, taricId, } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        let whereConditions = {};
        if (search) {
            const searchStr = search;
            whereConditions = [
                { name_de: (0, typeorm_1.ILike)(`%${searchStr}%`) },
                { name_en: (0, typeorm_1.ILike)(`%${searchStr}%`) },
                { name_cn: (0, typeorm_1.ILike)(`%${searchStr}%`) },
                { de_no: (0, typeorm_1.ILike)(`%${searchStr}%`) },
            ];
            const parsedId = parseInt(searchStr);
            if (!isNaN(parsedId) && parsedId <= 2147483647) {
                whereConditions.push({ id: parsedId });
            }
        }
        else {
            whereConditions = {};
        }
        if (isActive) {
            const activeFilter = { is_active: isActive };
            if (Array.isArray(whereConditions)) {
                whereConditions = whereConditions.map((cond) => (Object.assign(Object.assign({}, cond), activeFilter)));
            }
            else {
                whereConditions.is_active = isActive;
            }
        }
        if (supplierId) {
            const supplierFilter = { supplier_id: parseInt(supplierId) };
            if (Array.isArray(whereConditions)) {
                whereConditions = whereConditions.map((cond) => (Object.assign(Object.assign({}, cond), supplierFilter)));
            }
            else {
                whereConditions.supplier_id = parseInt(supplierId);
            }
        }
        if (taricId) {
            const taricFilter = { taric_id: parseInt(taricId) };
            if (Array.isArray(whereConditions)) {
                whereConditions = whereConditions.map((cond) => (Object.assign(Object.assign({}, cond), taricFilter)));
            }
            else {
                whereConditions.taric_id = parseInt(taricId);
            }
        }
        const relations = ["taric", "supplier", "items"];
        const totalRecords = yield parentRepository.count({
            where: whereConditions,
        });
        const parents = yield parentRepository.find({
            where: whereConditions,
            relations,
            order: {
                [sortBy]: sortOrder === "DESC" ? "DESC" : "ASC",
            },
            skip,
            take: limitNum,
        });
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
        const user = req.user;
        const filteredData = (0, dataFilter_1.filterDataByRole)(formattedParents, (user === null || user === void 0 ? void 0 : user.role) || users_1.UserRole.STAFF);
        return res.status(200).json({
            success: true,
            data: filteredData,
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
const getParentById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new errorHandler_1.default("Parent ID is required", 400));
        }
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const parent = yield parentRepository.findOne({
            where: { id: parseInt(id) },
            relations: ["taric", "supplier"],
        });
        if (!parent) {
            return next(new errorHandler_1.default("Parent not found", 404));
        }
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
        const user = req.user;
        const filteredData = (0, dataFilter_1.filterDataByRole)(formattedParent, (user === null || user === void 0 ? void 0 : user.role) || users_1.UserRole.STAFF);
        return res.status(200).json({
            success: true,
            data: filteredData,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getParentById = getParentById;
const createParent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
        const supplierRepository = database_1.AppDataSource.getRepository(suppliers_1.Supplier);
        const { de_no, name_de, name_en, name_cn, taric_id, supplier_id, var_de_1, var_de_2, var_de_3, var_en_1, var_en_2, var_en_3, is_NwV = "N", is_var_unilingual = "N", is_active = "Y", } = req.body;
        if (!de_no || !name_de) {
            return next(new errorHandler_1.default("DE number and German name are required", 400));
        }
        const existingParent = yield parentRepository.findOne({ where: { de_no } });
        if (existingParent) {
            return next(new errorHandler_1.default("Parent with this DE number already exists", 400));
        }
        if (taric_id) {
            const taric = yield taricRepository.findOne({ where: { id: taric_id } });
            if (!taric) {
                return next(new errorHandler_1.default("Taric not found", 404));
            }
        }
        if (supplier_id) {
            const supplier = yield supplierRepository.findOne({
                where: { id: supplier_id },
            });
            if (!supplier) {
                return next(new errorHandler_1.default("Supplier not found", 404));
            }
        }
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
const deleteParent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new errorHandler_1.default("Parent ID is required", 400));
        }
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const parent = yield parentRepository.findOne({
            where: { id: parseInt(id) },
        });
        if (!parent) {
            return next(new errorHandler_1.default("Parent not found", 404));
        }
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
            item_count: 0,
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
const getWarehouseItems = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const warehouseRepository = database_1.AppDataSource.getRepository(warehouse_items_1.WarehouseItem);
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const { page = "1", limit = "30", search = "", hasStock = "", isStockItem = "", sortBy = "created_at", sortOrder = "DESC", filter = "", } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const query = warehouseRepository.createQueryBuilder("warehouse");
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
            })
                .orWhere("CAST(warehouse.id AS TEXT) ILIKE :search", {
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
        if (filter === "wrong_shipping_class") {
            query.andWhere("(warehouse.ship_class IS NULL OR warehouse.ship_class = 'Na' OR warehouse.ship_class = 'NA' OR warehouse.ship_class = '')");
        }
        const totalRecords = yield query.getCount();
        const warehouseItems = yield query
            .orderBy(`warehouse.${sortBy}`, sortOrder === "DESC" ? "DESC" : "ASC")
            .skip(skip)
            .take(limitNum)
            .getMany();
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
            ship_class: warehouse.ship_class,
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
const updateItemVariations = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { itemId } = req.params;
        const variations = req.body;
        if (!itemId) {
            return next(new errorHandler_1.default("Item ID is required", 400));
        }
        if (!Array.isArray(variations)) {
            return next(new errorHandler_1.default("Variations must be an array", 400));
        }
        const variationRepository = database_1.AppDataSource.getRepository(variation_values_1.VariationValue);
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const item = yield itemRepository.findOne({
            where: { id: parseInt(itemId) },
        });
        if (!item) {
            return next(new errorHandler_1.default("Item not found", 404));
        }
        yield database_1.AppDataSource.transaction((transactionalEntityManager) => __awaiter(void 0, void 0, void 0, function* () {
            yield transactionalEntityManager.delete(variation_values_1.VariationValue, {
                item_id: parseInt(itemId),
            });
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
        const formattedCriteria = criteria.map((qc) => ({
            id: qc.id,
            itemId: qc.item_id,
            name: qc.name || "",
            picture: qc.picture || "",
            description: qc.description || "",
            descriptionCN: qc.description_cn || "",
            created_at: qc.created_at,
            updated_at: qc.updated_at,
        }));
        return res.status(200).json({
            success: true,
            data: formattedCriteria,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getItemQualityCriteria = getItemQualityCriteria;
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
        if (name !== undefined)
            criterion.name = name;
        if (picture !== undefined)
            criterion.picture = picture;
        if (description !== undefined)
            criterion.description = description;
        if (description_cn !== undefined)
            criterion.description_cn = description_cn;
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
        const { page = "1", limit = "30", search = "", code = "", name = "", sortBy = "id", sortOrder = "ASC", } = req.query;
        let pageNum = parseInt(page);
        if (isNaN(pageNum))
            pageNum = 1;
        let limitNum = parseInt(limit);
        if (isNaN(limitNum))
            limitNum = 30;
        const skip = (pageNum - 1) * limitNum;
        let whereConditions = {};
        if (search) {
            whereConditions = [
                { code: (0, typeorm_1.ILike)(`%${search}%`) },
                { name_de: (0, typeorm_1.ILike)(`%${search}%`) },
                { name_en: (0, typeorm_1.ILike)(`%${search}%`) },
                { name_cn: (0, typeorm_1.ILike)(`%${search}%`) },
            ];
        }
        else {
            if (code) {
                whereConditions.code = (0, typeorm_1.ILike)(`%${code}%`);
            }
            if (name) {
                whereConditions.name_de = (0, typeorm_1.ILike)(`%${name}%`);
            }
        }
        const totalRecords = yield taricRepository.count({
            where: whereConditions,
        });
        const tarics = yield taricRepository.find({
            where: whereConditions,
            order: {
                [sortBy]: sortOrder === "DESC" ? "DESC" : "ASC",
            },
            skip,
            take: limitNum,
        });
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
const getTaricById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new errorHandler_1.default("TARIC ID is required", 400));
        }
        const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        const taric = yield taricRepository.findOne({
            where: { id: parseInt(id) },
        });
        if (!taric) {
            return next(new errorHandler_1.default("TARIC not found", 404));
        }
        const items = yield itemRepository.find({
            where: { taric_id: parseInt(id) },
            relations: ["parent", "category"],
            take: 10,
        });
        const parents = yield parentRepository.find({
            where: { taric_id: parseInt(id) },
            take: 10,
        });
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
const createTaric = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
        const { code, name_de, name_en, name_cn, description_de, description_en, reguler_artikel = "Y", duty_rate = 0, } = req.body;
        if (!code) {
            return next(new errorHandler_1.default("TARIC code is required", 400));
        }
        const existingTaric = yield taricRepository.findOne({ where: { code } });
        if (existingTaric) {
            return next(new errorHandler_1.default("TARIC with this code already exists", 400));
        }
        const maxIdResult = yield taricRepository
            .createQueryBuilder("taric")
            .select("MAX(taric.id)", "max")
            .getRawOne();
        const nextId = ((maxIdResult === null || maxIdResult === void 0 ? void 0 : maxIdResult.max) || 0) + 1;
        const newTaric = taricRepository.create({
            id: nextId,
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
        if (req.body.code !== undefined && req.body.code !== taric.code) {
            const existingTaric = yield taricRepository.findOne({
                where: { code: req.body.code },
            });
            if (existingTaric) {
                return next(new errorHandler_1.default("TARIC with this code already exists", 400));
            }
        }
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
const deleteTaric = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return next(new errorHandler_1.default("TARIC ID is required", 400));
        }
        const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        const taric = yield taricRepository.findOne({
            where: { id: parseInt(id) },
        });
        if (!taric) {
            return next(new errorHandler_1.default("TARIC not found", 404));
        }
        const relatedItems = yield itemRepository.count({
            where: { taric_id: parseInt(id) },
        });
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
const getTaricStatistics = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taricRepository = database_1.AppDataSource.getRepository(tarics_1.Taric);
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        const totalTarics = yield taricRepository.count();
        const taricsWithItems = yield itemRepository
            .createQueryBuilder("item")
            .select("COUNT(DISTINCT item.taric_id)", "count")
            .where("item.taric_id IS NOT NULL")
            .getRawOne();
        const taricsWithParents = yield parentRepository
            .createQueryBuilder("parent")
            .select("COUNT(DISTINCT parent.taric_id)", "count")
            .where("parent.taric_id IS NOT NULL")
            .getRawOne();
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
const bulkUpsertTarics = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tarics } = req.body;
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
        for (const taricData of tarics) {
            try {
                if (!taricData.code) {
                    results.failed++;
                    results.errors.push({ data: taricData, error: "Code is required" });
                    continue;
                }
                let taric = yield taricRepository.findOne({
                    where: { code: taricData.code },
                });
                if (taric) {
                    Object.assign(taric, taricData);
                    taric.updated_at = new Date();
                    results.updated++;
                }
                else {
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
const exportItemsToCSV = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    try {
        const { type = "updated" } = req.query;
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const warehouseRepository = database_1.AppDataSource.getRepository(warehouse_items_1.WarehouseItem);
        const variationRepository = database_1.AppDataSource.getRepository(variation_values_1.VariationValue);
        const supplierItemRepository = database_1.AppDataSource.getRepository(supplier_items_1.SupplierItem);
        let whereClause = { is_updated: true };
        if (type === "new") {
            whereClause = { is_new: "Y" };
        }
        const items = yield itemRepository.find({
            where: whereClause,
            relations: ["parent", "taric", "category"],
            order: {
                id: "ASC",
            },
        });
        if (items.length === 0) {
            return res.status(200).json({
                success: true,
                message: `No ${type} items need to be synced`,
                data: [],
            });
        }
        const itemIds = items.map((item) => item.id);
        const supplierItems = yield supplierItemRepository.find({
            where: { item_id: (0, typeorm_1.In)(itemIds) },
        });
        const rmbPriceMap = new Map();
        supplierItems.forEach((supplierItem) => {
            if (supplierItem.price_rmb) {
                rmbPriceMap.set(supplierItem.item_id, supplierItem.price_rmb);
            }
        });
        const formatDate = (date) => {
            if (!date)
                return "";
            const d = new Date(date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
        };
        const getWarehouseData = (itemId, itemIdDE) => __awaiter(void 0, void 0, void 0, function* () {
            let warehouseItems = [];
            if (itemIdDE) {
                warehouseItems = yield warehouseRepository.find({
                    where: { ItemID_DE: itemIdDE },
                });
            }
            if (warehouseItems.length === 0) {
                warehouseItems = yield warehouseRepository.find({
                    where: { item_id: itemId },
                });
            }
            return warehouseItems[0] || null;
        });
        const getVariationValues = (itemId) => __awaiter(void 0, void 0, void 0, function* () {
            const variations = yield variationRepository.find({
                where: { item_id: itemId },
            });
            return variations[0] || null;
        });
        const getPriceColumns = (rmbPrice) => {
            const basePrice = rmbPrice || 0;
            const priceLevels = [1, 2, 5, 10, 25, 50, 100, 200, 500, 1000, 2000];
            return priceLevels.map((level) => {
                let discount = 0;
                if (level >= 1000)
                    discount = 0.3;
                else if (level >= 500)
                    discount = 0.25;
                else if (level >= 200)
                    discount = 0.2;
                else if (level >= 100)
                    discount = 0.15;
                else if (level >= 50)
                    discount = 0.1;
                else if (level >= 25)
                    discount = 0.05;
                const price = basePrice * (1 - discount);
                return price.toFixed(2).replace(".", ",");
            });
        };
        const headers = [
            "Timestamp",
            "EAN",
            "Parent No DE",
            "Item No DE",
            "Sup_cat",
            "Item Name DE",
            "Variation DE 1",
            "Value DE",
            "Variation DE 2",
            "Value DE 2",
            "Variation DE 3",
            "Value DE 3",
            "Item Name EN",
            "Item Name",
            "Variation EN 1",
            "Value EN",
            "Variation EN 2",
            "Value EN 2",
            "Variation EN 3",
            "Value EN 3",
            "Code",
            "ISBN",
            "Width",
            "Height",
            "Length",
            "Weight",
            "Shipping Weight",
            "Shipping Class",
            "Is Qty Dividable",
            "Is Stock Item",
            "FOQ",
            "FSQ",
            "MSQ",
            "MOQ Result",
            "Interval",
            "Buffer Result",
            "Price RMB",
            "Y/N",
            "Many Components",
            "Effort Rating",
            "EK Net",
            "Item Volume (dm³)",
            "Freight Costs Volume",
            "Freight Costs Weight",
            "Freight Costs",
            "Import Duty Charge (EUR)",
            "SP_eBay",
            "SP_DE_NET_1",
            "SP_DE_NET_2",
            "SP_DE_NET_5",
            "SP_DE_NET_10",
            "SP_DE_NET_25",
            "SP_DE_NET_50",
            "SP_DE_NET_100",
            "SP_DE_NET_200",
            "SP_DE_NET_500",
            "SP_DE_NET_1000",
            "SP_DE_NET_2000",
            "BulkQty_2",
            "BulkQty_5",
            "BulkQty_10",
            "BulkQty_25",
            "BulkQty_50",
            "BulkQty_100",
            "BulkQty_200",
            "BulkQty_500",
            "BulkQty_1000",
            "BulkQty_2000",
            "USt %",
            "Dummy-Bild01",
            "Image Path EAN",
            "Image Path eBay",
            "Max Quantity",
        ];
        const csvRows = [];
        csvRows.push(headers.join(";"));
        const updatedItemIds = [];
        for (const item of items) {
            try {
                const warehouseData = yield getWarehouseData(item.id, item.ItemID_DE);
                const variationData = yield getVariationValues(item.id);
                const rmbPrice = Number(rmbPriceMap.get(item.id)) || 0;
                const priceColumns = getPriceColumns(rmbPrice);
                const parent = item.parent;
                const volume = ((item.length || 0) * (item.width || 0) * (item.height || 0)) / 1000;
                const bulkQuantities = [2, 5, 10, 25, 50, 100, 200, 500, 1000, 2000];
                const rowData = [
                    formatDate(item.updated_at || item.created_at || new Date()),
                    ((_a = item.ean) === null || _a === void 0 ? void 0 : _a.toString()) || "",
                    (parent === null || parent === void 0 ? void 0 : parent.de_no) || "NONE",
                    ((_b = item.ItemID_DE) === null || _b === void 0 ? void 0 : _b.toString()) || item.id.toString(),
                    item.supp_cat || ((_c = item.category) === null || _c === void 0 ? void 0 : _c.name) || "STD",
                    item.item_name || (parent === null || parent === void 0 ? void 0 : parent.name_de) || "",
                    (parent === null || parent === void 0 ? void 0 : parent.var_de_1) || "",
                    (variationData === null || variationData === void 0 ? void 0 : variationData.value_de) || "",
                    (parent === null || parent === void 0 ? void 0 : parent.var_de_2) || "",
                    (variationData === null || variationData === void 0 ? void 0 : variationData.value_de_2) || "",
                    (parent === null || parent === void 0 ? void 0 : parent.var_de_3) || "",
                    (variationData === null || variationData === void 0 ? void 0 : variationData.value_de_3) || "",
                    item.item_name_cn || (parent === null || parent === void 0 ? void 0 : parent.name_en) || "",
                    item.item_name || (parent === null || parent === void 0 ? void 0 : parent.name_en) || "",
                    (parent === null || parent === void 0 ? void 0 : parent.var_en_1) || "",
                    (variationData === null || variationData === void 0 ? void 0 : variationData.value_en) || "",
                    (parent === null || parent === void 0 ? void 0 : parent.var_en_2) || "",
                    (variationData === null || variationData === void 0 ? void 0 : variationData.value_en_2) || "",
                    (parent === null || parent === void 0 ? void 0 : parent.var_en_3) || "",
                    (variationData === null || variationData === void 0 ? void 0 : variationData.value_en_3) || "",
                    ((_d = item.taric) === null || _d === void 0 ? void 0 : _d.code) || "",
                    ((_e = item.ISBN) === null || _e === void 0 ? void 0 : _e.toString()) || "0",
                    (item.width || 0).toFixed(1).replace(".", ","),
                    (item.height || 0).toFixed(1).replace(".", ","),
                    (item.length || 0).toFixed(1).replace(".", ","),
                    (item.weight || 0).toFixed(2).replace(".", ","),
                    (item.weight || 0).toFixed(4).replace(".", ","),
                    (warehouseData === null || warehouseData === void 0 ? void 0 : warehouseData.ship_class) || "1",
                    item.is_qty_dividable || "Y",
                    (warehouseData === null || warehouseData === void 0 ? void 0 : warehouseData.is_stock_item) || "N",
                    ((_f = item.FOQ) === null || _f === void 0 ? void 0 : _f.toString()) || "0",
                    ((_g = item.FSQ) === null || _g === void 0 ? void 0 : _g.toString()) || "0",
                    ((_h = warehouseData === null || warehouseData === void 0 ? void 0 : warehouseData.msq) === null || _h === void 0 ? void 0 : _h.toString()) || "0",
                    "0",
                    "0",
                    ((_j = warehouseData === null || warehouseData === void 0 ? void 0 : warehouseData.buffer) === null || _j === void 0 ? void 0 : _j.toString()) || "0",
                    rmbPrice.toFixed(2).replace(".", ","),
                    "Y",
                    ((_k = item.many_components) === null || _k === void 0 ? void 0 : _k.toString()) || "1",
                    ((_l = item.effort_rating) === null || _l === void 0 ? void 0 : _l.toString()) || "3",
                    rmbPrice.toFixed(2).replace(".", ","),
                    volume.toFixed(2).replace(".", ","),
                    "0,00",
                    "0,00",
                    "0,00",
                    "0,00",
                    rmbPrice.toFixed(2).replace(".", ","),
                    ...priceColumns,
                    ...bulkQuantities.map((qty) => qty.toString()),
                    "19",
                    item.photo ? item.photo.split("\\").pop() : "DummyPicture.jpg",
                    item.pix_path || "",
                    item.pix_path_eBay || "",
                    "10000",
                ];
                if (rowData.length !== headers.length) {
                    console.warn(`Row data length mismatch for item ${item.id}: ${rowData.length} vs ${headers.length}`);
                }
                const formattedRow = rowData.map((value) => {
                    if (value === null || value === undefined)
                        return "";
                    const stringValue = value.toString();
                    if (stringValue.includes(";") ||
                        stringValue.includes("\n") ||
                        stringValue.includes('"')) {
                        return `"${stringValue.replace(/"/g, '""')}"`;
                    }
                    return stringValue;
                });
                csvRows.push(formattedRow.join(";"));
                updatedItemIds.push(item.id);
            }
            catch (itemError) {
                console.error(`Error processing item ${item.id}:`, itemError);
            }
        }
        if (updatedItemIds.length > 0) {
            if (type === "new") {
                yield itemRepository.update({ id: (0, typeorm_1.In)(updatedItemIds) }, { is_new: "N" });
                console.log(`Reset is_new flag for ${updatedItemIds.length} items`);
            }
            else {
                yield itemRepository.update({ id: (0, typeorm_1.In)(updatedItemIds) }, { is_updated: false });
                console.log(`Reset is_updated flag for ${updatedItemIds.length} items`);
            }
        }
        const csvContent = csvRows.join("\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment; filename=updated_Item_List.csv");
        res.setHeader("Content-Length", Buffer.byteLength(csvContent, "utf8"));
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("X-Content-Type-Options", "nosniff");
        const bom = "\uFEFF";
        return res.status(200).send(bom + csvContent);
    }
    catch (error) {
        console.error("Error exporting CSV:", error);
        return next(error);
    }
});
exports.exportItemsToCSV = exportItemsToCSV;
const getNewItems = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const parentRepository = database_1.AppDataSource.getRepository(parents_1.Parent);
        const categoryRepository = database_1.AppDataSource.getRepository(categories_1.Category);
        const supplierRepository = database_1.AppDataSource.getRepository(suppliers_1.Supplier);
        const warehouseRepository = database_1.AppDataSource.getRepository(warehouse_items_1.WarehouseItem);
        const { page = "1", limit = "50", search = "" } = req.query;
        let pageNum = parseInt(page);
        if (isNaN(pageNum))
            pageNum = 1;
        let limitNum = parseInt(limit);
        if (isNaN(limitNum))
            limitNum = 50;
        const skip = (pageNum - 1) * limitNum;
        const queryBuilder = itemRepository
            .createQueryBuilder("item")
            .where("item.is_new = :isNew", { isNew: "Y" })
            .skip(skip)
            .take(limitNum)
            .orderBy("item.created_at", "DESC");
        if (search) {
            const searchStr = search;
            queryBuilder.andWhere("(item.item_name ILIKE :search OR item.ean ILIKE :search)", { search: `%${searchStr}%` });
        }
        const totalRecords = yield queryBuilder.getCount();
        const items = yield queryBuilder.getMany();
        const formattedItems = yield Promise.all(items.map((item) => __awaiter(void 0, void 0, void 0, function* () {
            const parentData = item.parent_id
                ? yield parentRepository.findOne({
                    where: { id: item.parent_id },
                    select: ["id", "de_no", "name_de", "name_en"],
                })
                : null;
            const categoryData = item.cat_id
                ? yield categoryRepository.findOne({
                    where: { id: item.cat_id },
                    select: ["id", "name"],
                })
                : null;
            const supplierData = item.supplier_id
                ? yield supplierRepository.findOne({
                    where: { id: item.supplier_id },
                    select: ["id", "name", "company_name"],
                })
                : null;
            let warehouseData = null;
            if (item.ItemID_DE) {
                const wdList = yield warehouseRepository.find({
                    where: { ItemID_DE: item.ItemID_DE },
                });
                warehouseData = wdList[0] || null;
            }
            if (!warehouseData) {
                const wdList = yield warehouseRepository.find({
                    where: { item_id: item.id },
                });
                warehouseData = wdList[0] || null;
            }
            const ean = item.ean || (warehouseData === null || warehouseData === void 0 ? void 0 : warehouseData.ean) || null;
            return {
                id: item.id,
                de_no: (warehouseData === null || warehouseData === void 0 ? void 0 : warehouseData.item_no_de) || (parentData === null || parentData === void 0 ? void 0 : parentData.de_no) || null,
                name_de: (parentData === null || parentData === void 0 ? void 0 : parentData.name_de) || null,
                name_en: (parentData === null || parentData === void 0 ? void 0 : parentData.name_en) || null,
                item_name: item.item_name,
                item_name_cn: item.item_name_cn,
                ean,
                is_active: item.isActive,
                is_new: item.is_new,
                is_updated: item.is_updated,
                category: (categoryData === null || categoryData === void 0 ? void 0 : categoryData.name) || null,
                supplier_name: (supplierData === null || supplierData === void 0 ? void 0 : supplierData.company_name) || (supplierData === null || supplierData === void 0 ? void 0 : supplierData.name) || null,
                created_at: item.created_at,
                updated_at: item.updated_at,
                synced_at: item.synced_at,
            };
        })));
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
exports.getNewItems = getNewItems;
const exportNewItemsToCSV = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    try {
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const warehouseRepository = database_1.AppDataSource.getRepository(warehouse_items_1.WarehouseItem);
        const variationRepository = database_1.AppDataSource.getRepository(variation_values_1.VariationValue);
        const supplierItemRepository = database_1.AppDataSource.getRepository(supplier_items_1.SupplierItem);
        const items = yield itemRepository.find({
            where: { is_new: "Y" },
            relations: ["parent", "taric", "category"],
            order: { id: "ASC" },
        });
        if (items.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No new items to export",
                data: [],
            });
        }
        const itemIds = items.map((item) => item.id);
        const supplierItems = yield supplierItemRepository.find({
            where: { item_id: (0, typeorm_1.In)(itemIds) },
        });
        const rmbPriceMap = new Map();
        supplierItems.forEach((si) => {
            if (si.price_rmb)
                rmbPriceMap.set(si.item_id, si.price_rmb);
        });
        const formatDate = (date) => {
            if (!date)
                return "";
            const d = new Date(date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
        };
        const getWarehouseData = (itemId, itemIdDE) => __awaiter(void 0, void 0, void 0, function* () {
            let wItems = [];
            if (itemIdDE) {
                wItems = yield warehouseRepository.find({
                    where: { ItemID_DE: itemIdDE },
                });
            }
            if (wItems.length === 0) {
                wItems = yield warehouseRepository.find({ where: { item_id: itemId } });
            }
            return wItems[0] || null;
        });
        const getVariationValues = (itemId) => __awaiter(void 0, void 0, void 0, function* () {
            const variations = yield variationRepository.find({
                where: { item_id: itemId },
            });
            return variations[0] || null;
        });
        const getPriceColumns = (rmbPrice) => {
            const basePrice = rmbPrice || 0;
            const priceLevels = [1, 2, 5, 10, 25, 50, 100, 200, 500, 1000, 2000];
            return priceLevels.map((level) => {
                let discount = 0;
                if (level >= 1000)
                    discount = 0.3;
                else if (level >= 500)
                    discount = 0.25;
                else if (level >= 200)
                    discount = 0.2;
                else if (level >= 100)
                    discount = 0.15;
                else if (level >= 50)
                    discount = 0.1;
                else if (level >= 25)
                    discount = 0.05;
                return (basePrice * (1 - discount)).toFixed(2).replace(".", ",");
            });
        };
        const headers = [
            "Timestamp",
            "EAN",
            "Parent No DE",
            "Item No DE",
            "Item ID DE",
            "Sup_cat",
            "Item Name DE",
            "Variation DE 1",
            "Value DE",
            "Variation DE 2",
            "Value DE 2",
            "Variation DE 3",
            "Value DE 3",
            "Item Name EN",
            "Item Name",
            "Variation EN 1",
            "Value EN",
            "Variation EN 2",
            "Value EN 2",
            "Variation EN 3",
            "Value EN 3",
            "Code",
            "ISBN",
            "Width",
            "Height",
            "Length",
            "Weight",
            "Shipping Weight",
            "Shipping Class",
            "Is Qty Dividable",
            "Is Stock Item",
            "FOQ",
            "FSQ",
            "MSQ",
            "MOQ Result",
            "Interval",
            "Buffer Result",
            "Price RMB",
            "Y/N",
            "Many Components",
            "Effort Rating",
            "EK Net",
            "Item Volume (dm³)",
            "Freight Costs Volume",
            "Freight Costs Weight",
            "Freight Costs",
            "Import Duty Charge (EUR)",
            "SP_eBay",
            "SP_DE_NET_1",
            "SP_DE_NET_2",
            "SP_DE_NET_5",
            "SP_DE_NET_10",
            "SP_DE_NET_25",
            "SP_DE_NET_50",
            "SP_DE_NET_100",
            "SP_DE_NET_200",
            "SP_DE_NET_500",
            "SP_DE_NET_1000",
            "SP_DE_NET_2000",
            "BulkQty_2",
            "BulkQty_5",
            "BulkQty_10",
            "BulkQty_25",
            "BulkQty_50",
            "BulkQty_100",
            "BulkQty_200",
            "BulkQty_500",
            "BulkQty_1000",
            "BulkQty_2000",
            "USt %",
            "Dummy-Bild01",
            "Image Path EAN",
            "Image Path eBay",
            "Max Quantity",
        ];
        const csvRows = [];
        csvRows.push(headers.join(";"));
        const exportedIds = [];
        for (const item of items) {
            try {
                const warehouseData = yield getWarehouseData(item.id, item.ItemID_DE);
                const variationData = yield getVariationValues(item.id);
                const rmbPrice = Number(rmbPriceMap.get(item.id)) || 0;
                const priceColumns = getPriceColumns(rmbPrice);
                const parent = item.parent;
                const volume = ((item.length || 0) * (item.width || 0) * (item.height || 0)) / 1000;
                const bulkQuantities = [2, 5, 10, 25, 50, 100, 200, 500, 1000, 2000];
                const rowData = [
                    formatDate(item.created_at || new Date()),
                    ((_a = item.ean) === null || _a === void 0 ? void 0 : _a.toString()) || "",
                    (parent === null || parent === void 0 ? void 0 : parent.de_no) || "NONE",
                    (warehouseData === null || warehouseData === void 0 ? void 0 : warehouseData.item_no_de) ||
                        ((_b = item.ItemID_DE) === null || _b === void 0 ? void 0 : _b.toString()) ||
                        item.id.toString(),
                    ((_c = item.ItemID_DE) === null || _c === void 0 ? void 0 : _c.toString()) || "",
                    item.supp_cat || ((_d = item.category) === null || _d === void 0 ? void 0 : _d.name) || "STD",
                    (warehouseData === null || warehouseData === void 0 ? void 0 : warehouseData.item_name_de) || (parent === null || parent === void 0 ? void 0 : parent.name_de) || "",
                    (parent === null || parent === void 0 ? void 0 : parent.var_de_1) || "",
                    (variationData === null || variationData === void 0 ? void 0 : variationData.value_de) || "",
                    (parent === null || parent === void 0 ? void 0 : parent.var_de_2) || "",
                    (variationData === null || variationData === void 0 ? void 0 : variationData.value_de_2) || "",
                    (parent === null || parent === void 0 ? void 0 : parent.var_de_3) || "",
                    (variationData === null || variationData === void 0 ? void 0 : variationData.value_de_3) || "",
                    item.item_name || (parent === null || parent === void 0 ? void 0 : parent.name_en) || "",
                    item.item_name || (parent === null || parent === void 0 ? void 0 : parent.name_en) || "",
                    (parent === null || parent === void 0 ? void 0 : parent.var_en_1) || "",
                    (variationData === null || variationData === void 0 ? void 0 : variationData.value_en) || "",
                    (parent === null || parent === void 0 ? void 0 : parent.var_en_2) || "",
                    (variationData === null || variationData === void 0 ? void 0 : variationData.value_en_2) || "",
                    (parent === null || parent === void 0 ? void 0 : parent.var_en_3) || "",
                    (variationData === null || variationData === void 0 ? void 0 : variationData.value_en_3) || "",
                    ((_e = item.taric) === null || _e === void 0 ? void 0 : _e.code) || "",
                    ((_f = item.ISBN) === null || _f === void 0 ? void 0 : _f.toString()) || "0",
                    (item.width || 0).toFixed(1).replace(".", ","),
                    (item.height || 0).toFixed(1).replace(".", ","),
                    (item.length || 0).toFixed(1).replace(".", ","),
                    (item.weight || 0).toFixed(2).replace(".", ","),
                    (item.weight || 0).toFixed(4).replace(".", ","),
                    (warehouseData === null || warehouseData === void 0 ? void 0 : warehouseData.ship_class) || "1",
                    item.is_qty_dividable || "Y",
                    (warehouseData === null || warehouseData === void 0 ? void 0 : warehouseData.is_stock_item) || "N",
                    ((_g = item.FOQ) === null || _g === void 0 ? void 0 : _g.toString()) || "0",
                    ((_h = item.FSQ) === null || _h === void 0 ? void 0 : _h.toString()) || "0",
                    ((_j = warehouseData === null || warehouseData === void 0 ? void 0 : warehouseData.msq) === null || _j === void 0 ? void 0 : _j.toString()) || "0",
                    "0",
                    "0",
                    ((_k = warehouseData === null || warehouseData === void 0 ? void 0 : warehouseData.buffer) === null || _k === void 0 ? void 0 : _k.toString()) || "0",
                    rmbPrice.toFixed(2).replace(".", ","),
                    "Y",
                    ((_l = item.many_components) === null || _l === void 0 ? void 0 : _l.toString()) || "1",
                    ((_m = item.effort_rating) === null || _m === void 0 ? void 0 : _m.toString()) || "3",
                    rmbPrice.toFixed(2).replace(".", ","),
                    volume.toFixed(2).replace(".", ","),
                    "0,00",
                    "0,00",
                    "0,00",
                    "0,00",
                    rmbPrice.toFixed(2).replace(".", ","),
                    ...priceColumns,
                    ...bulkQuantities.map((qty) => qty.toString()),
                    "19",
                    item.photo ? item.photo.split("\\").pop() : "DummyPicture.jpg",
                    item.pix_path || "",
                    item.pix_path_eBay || "",
                    "10000",
                ];
                const formattedRow = rowData.map((value) => {
                    if (value === null || value === undefined)
                        return "";
                    const s = value.toString();
                    if (s.includes(";") || s.includes("\n") || s.includes('"')) {
                        return `"${s.replace(/"/g, '""')}"`;
                    }
                    return s;
                });
                csvRows.push(formattedRow.join(";"));
                exportedIds.push(item.id);
            }
            catch (itemError) {
                console.error(`Error processing new item ${item.id}:`, itemError);
            }
        }
        if (exportedIds.length > 0) {
            yield itemRepository.update({ id: (0, typeorm_1.In)(exportedIds) }, { is_new: "N" });
            console.log(`Set is_new='N' for ${exportedIds.length} new items after export`);
        }
        const csvContent = csvRows.join("\n");
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename=new_items_${timestamp}.csv`);
        res.setHeader("Content-Length", Buffer.byteLength(csvContent, "utf8"));
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        const bom = "\uFEFF";
        return res.status(200).send(bom + csvContent);
    }
    catch (error) {
        console.error("Error exporting new items CSV:", error);
        return next(error);
    }
});
exports.exportNewItemsToCSV = exportNewItemsToCSV;
const syncSuppCatWithCategoryName = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const itemRepo = database_1.AppDataSource.getRepository(items_1.Item);
        const itemsWithMismatches = yield itemRepo
            .createQueryBuilder("item")
            .leftJoinAndSelect("item.category", "category")
            .where("item.supp_cat IS NULL")
            .orWhere("item.supp_cat != category.name")
            .getMany();
        if (itemsWithMismatches.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No category mismatches found. All items are in sync.",
            });
        }
        let updatedCount = 0;
        const updatePromises = itemsWithMismatches.map((item) => __awaiter(void 0, void 0, void 0, function* () {
            if (item.category && item.category.name) {
                const oldCat = item.supp_cat;
                const newCat = item.category.name;
                item.supp_cat = newCat;
                item.is_updated = true;
                console.log(`[FIX] Item ID ${item.id}: Reassigning supp_cat from "${oldCat}" to "${newCat}"`);
                yield itemRepo.save(item);
                updatedCount++;
            }
        }));
        yield Promise.all(updatePromises);
        return res.status(200).json({
            success: true,
            message: `Successfully synchronized categories for ${updatedCount} items.`,
            details: `Audit found ${itemsWithMismatches.length} items with mismatches.`,
        });
    }
    catch (error) {
        console.error("Error during category sync:", error);
        return next(error);
    }
});
exports.syncSuppCatWithCategoryName = syncSuppCatWithCategoryName;

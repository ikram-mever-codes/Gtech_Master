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
exports.migrateAndCleanupCategories = exports.getCategories = void 0;
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const database_1 = require("../config/database");
const categories_1 = require("../models/categories");
const items_1 = require("../models/items");
const getCategories = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categoryRepo = database_1.AppDataSource.getRepository(categories_1.Category);
        const categories = yield categoryRepo.find({
            where: [
                { name: "PRO" },
                { name: "STD" },
                { name: "ERS" },
            ],
            order: { id: "ASC" },
        });
        return res.status(200).json({
            success: true,
            data: categories,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getCategories = getCategories;
const migrateAndCleanupCategories = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categoryRepo = database_1.AppDataSource.getRepository(categories_1.Category);
        const itemRepo = database_1.AppDataSource.getRepository(items_1.Item);
        const report = {};
        const canonical = [
            { name: "PRO", de_cat: "PRO" },
            { name: "STD", de_cat: "STD" },
            { name: "ERS", de_cat: "ERS" },
        ];
        for (const c of canonical) {
            const exists = yield categoryRepo.findOne({ where: { name: c.name } });
            if (!exists) {
                const newCat = categoryRepo.create({
                    name: c.name,
                    de_cat: c.de_cat,
                    is_ignored_value: "N",
                });
                yield categoryRepo.save(newCat);
            }
        }
        const allCats = yield categoryRepo.find({ order: { id: "ASC" } });
        const seenNames = new Map();
        const duplicateIds = [];
        for (const cat of allCats) {
            const normalizedName = (cat.name || "").trim().toLowerCase();
            if (seenNames.has(normalizedName)) {
                duplicateIds.push(cat.id);
            }
            else {
                seenNames.set(normalizedName, cat.id);
            }
        }
        for (const dupId of duplicateIds) {
            const dupCat = yield categoryRepo.findOne({ where: { id: dupId } });
            if (!dupCat)
                continue;
            const survivorId = seenNames.get((dupCat.name || "").trim().toLowerCase());
            if (survivorId && survivorId !== dupId) {
                yield itemRepo
                    .createQueryBuilder()
                    .update(items_1.Item)
                    .set({ cat_id: survivorId })
                    .where("cat_id = :dupId", { dupId })
                    .execute();
            }
        }
        if (duplicateIds.length > 0) {
            yield categoryRepo.delete(duplicateIds);
        }
        report.duplicatesRemoved = duplicateIds.length;
        const refreshedCats = yield categoryRepo.find({ order: { id: "ASC" } });
        const catByName = new Map(refreshedCats.map((c) => [(c.name || "").trim().toLowerCase(), c]));
        const proCat = catByName.get("pro");
        if (!proCat) {
            return next(new errorHandler_1.default("PRO category not found after setup", 500));
        }
        const gblCat = catByName.get("gbl");
        let gblMigrated = 0;
        if (gblCat) {
            const gblResult = yield itemRepo
                .createQueryBuilder()
                .update(items_1.Item)
                .set({ cat_id: proCat.id, supp_cat: "PRO" })
                .where("cat_id = :id", { id: gblCat.id })
                .execute();
            gblMigrated = gblResult.affected || 0;
        }
        report.gblItemsMigratedToPRO = gblMigrated;
        const gtrCat = catByName.get("gtr");
        let gtrMigrated = 0;
        if (gtrCat) {
            const gtrResult = yield itemRepo
                .createQueryBuilder()
                .update(items_1.Item)
                .set({ cat_id: proCat.id, supp_cat: "PRO" })
                .where("cat_id = :id", { id: gtrCat.id })
                .execute();
            gtrMigrated = gtrResult.affected || 0;
        }
        report.gtrItemsMigratedToPRO = gtrMigrated;
        const suppCatGblResult = yield itemRepo
            .createQueryBuilder()
            .update(items_1.Item)
            .set({ cat_id: proCat.id, supp_cat: "PRO" })
            .where("supp_cat IN (:...vals)", { vals: ["GBL", "GTR"] })
            .execute();
        report.suppCatGblGtrMigrated = suppCatGblResult.affected || 0;
        const toDelete = ["tba", "1688", "taobao", "purchase order", "others", "gbl", "gtr", "purchaseorder"];
        const deletedNames = [];
        for (const targetName of toDelete) {
            const cat = catByName.get(targetName);
            if (!cat)
                continue;
            const itemCount = yield itemRepo.count({ where: { cat_id: cat.id } });
            if (itemCount > 0) {
                yield itemRepo
                    .createQueryBuilder()
                    .update(items_1.Item)
                    .set({ cat_id: proCat.id, supp_cat: "PRO" })
                    .where("cat_id = :id", { id: cat.id })
                    .execute();
            }
            try {
                yield categoryRepo.delete(cat.id);
                deletedNames.push(cat.name || cat.de_cat);
            }
            catch (e) {
                report[`deleteError_${cat.name}`] = e.message;
            }
        }
        report.categoriesDeleted = deletedNames;
        const finalCats = yield categoryRepo.find({ order: { id: "ASC" } });
        report.remainingCategories = finalCats.map((c) => ({
            id: c.id,
            name: c.name,
            de_cat: c.de_cat,
        }));
        return res.status(200).json({
            success: true,
            message: "Category cleanup completed successfully",
            report,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.migrateAndCleanupCategories = migrateAndCleanupCategories;

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
exports.getCategories = void 0;
const typeorm_1 = require("typeorm");
const database_1 = require("../config/database");
const categories_1 = require("../models/categories");
const getCategories = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categoryRepo = database_1.AppDataSource.getRepository(categories_1.Category);
        const essentialTypes = [
            { name: "Purchase Order", de_cat: "PO" },
            { name: "Taobao", de_cat: "TB" },
            { name: "1688", de_cat: "1688" },
            { name: "Others", de_cat: "OTH" }
        ];
        for (const type of essentialTypes) {
            const exists = yield categoryRepo.findOne({ where: { name: type.name } });
            if (!exists) {
                const newCat = categoryRepo.create({ name: type.name, de_cat: type.de_cat, is_ignored_value: "N" });
                yield categoryRepo.save(newCat);
            }
        }
        const categories = yield categoryRepo.find({
            where: {
                name: (0, typeorm_1.Not)((0, typeorm_1.ILike)('Imported%'))
            },
            order: {
                id: 'DESC'
            }
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

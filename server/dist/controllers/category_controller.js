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
const database_1 = require("../config/database");
const categories_1 = require("../models/categories");
// ────────────────────────────────────────────────
//              CATEGORY MANAGEMENT
// ────────────────────────────────────────────────
const getCategories = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categoryRepo = database_1.AppDataSource.getRepository(categories_1.Category);
        const qb = categoryRepo
            .createQueryBuilder("c")
            .select([
            "c.id",
            "c.name",
        ]);
        const categories = yield qb.orderBy("c.id", "DESC").getMany();
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

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
const database_1 = require("./config/database");
const items_1 = require("./models/items");
const typeorm_1 = require("typeorm");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield database_1.AppDataSource.initialize();
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const isActive = 'Y';
        const queryBuilder = itemRepository.createQueryBuilder("item")
            .leftJoinAndSelect("item.tags", "tags");
        queryBuilder.andWhere(new typeorm_1.Brackets((qb) => {
            qb.where('EXISTS (SELECT 1 FROM warehouse_item wi WHERE (wi.item_id = item.id OR (wi."ItemID_DE" = item."ItemID_DE" AND item."ItemID_DE" IS NOT NULL)) AND wi.is_active = :isActive)', { isActive }).orWhere('NOT EXISTS (SELECT 1 FROM warehouse_item wi WHERE wi.item_id = item.id OR (wi."ItemID_DE" = item."ItemID_DE" AND item."ItemID_DE" IS NOT NULL)) AND item.isActive = :isActive', { isActive });
        }));
        queryBuilder.orderBy("item.created_at", "DESC");
        queryBuilder.take(10);
        const items = yield queryBuilder.getMany();
        console.log("Top 10 active items returned by query builder:");
        items.forEach(i => {
            console.log(`ID: ${i.id}, Name: ${i.item_name}, Created: ${i.created_at}, isActive: ${i.isActive}`);
        });
        yield database_1.AppDataSource.destroy();
    });
}
run().catch(console.error);

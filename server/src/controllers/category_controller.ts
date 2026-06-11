import { Request, Response, NextFunction } from "express";
import { Not, ILike, In } from "typeorm";

import ErrorHandler from "../utils/errorHandler";
import { AppDataSource } from "../config/database";
import { Category } from "../models/categories";
import { Item } from "../models/items";

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryRepo = AppDataSource.getRepository(Category);

    const categories = await categoryRepo.find({
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
  } catch (error) {
    return next(error);
  }
};

export const migrateAndCleanupCategories = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const categoryRepo = AppDataSource.getRepository(Category);
    const itemRepo = AppDataSource.getRepository(Item);

    const report: Record<string, any> = {};

    const canonical = [
      { name: "PRO", de_cat: "PRO" },
      { name: "STD", de_cat: "STD" },
      { name: "ERS", de_cat: "ERS" },
    ];
    for (const c of canonical) {
      const exists = await categoryRepo.findOne({ where: { name: c.name } });
      if (!exists) {
        const newCat = categoryRepo.create({
          name: c.name,
          de_cat: c.de_cat,
          is_ignored_value: "N",
        });
        await categoryRepo.save(newCat);
      }
    }

    const allCats = await categoryRepo.find({ order: { id: "ASC" } });
    const seenNames = new Map<string, number>();
    const duplicateIds: number[] = [];

    for (const cat of allCats) {
      const normalizedName = (cat.name || "").trim().toLowerCase();
      if (seenNames.has(normalizedName)) {
        duplicateIds.push(cat.id);
      } else {
        seenNames.set(normalizedName, cat.id);
      }
    }

    for (const dupId of duplicateIds) {
      const dupCat = await categoryRepo.findOne({ where: { id: dupId } });
      if (!dupCat) continue;
      const survivorId = seenNames.get((dupCat.name || "").trim().toLowerCase());
      if (survivorId && survivorId !== dupId) {
        await itemRepo
          .createQueryBuilder()
          .update(Item)
          .set({ cat_id: survivorId })
          .where("cat_id = :dupId", { dupId })
          .execute();
      }
    }

    if (duplicateIds.length > 0) {
      await categoryRepo.delete(duplicateIds);
    }
    report.duplicatesRemoved = duplicateIds.length;

    const refreshedCats = await categoryRepo.find({ order: { id: "ASC" } });
    const catByName = new Map(
      refreshedCats.map((c) => [(c.name || "").trim().toLowerCase(), c]),
    );

    const proCat = catByName.get("pro");
    if (!proCat) {
      return next(new ErrorHandler("PRO category not found after setup", 500));
    }

    const gblCat = catByName.get("gbl");
    let gblMigrated = 0;
    if (gblCat) {
      const gblResult = await itemRepo
        .createQueryBuilder()
        .update(Item)
        .set({ cat_id: proCat.id, supp_cat: "PRO" })
        .where("cat_id = :id", { id: gblCat.id })
        .execute();
      gblMigrated = gblResult.affected || 0;
    }
    report.gblItemsMigratedToPRO = gblMigrated;

    const gtrCat = catByName.get("gtr");
    let gtrMigrated = 0;
    if (gtrCat) {
      const gtrResult = await itemRepo
        .createQueryBuilder()
        .update(Item)
        .set({ cat_id: proCat.id, supp_cat: "PRO" })
        .where("cat_id = :id", { id: gtrCat.id })
        .execute();
      gtrMigrated = gtrResult.affected || 0;
    }
    report.gtrItemsMigratedToPRO = gtrMigrated;

    const suppCatGblResult = await itemRepo
      .createQueryBuilder()
      .update(Item)
      .set({ cat_id: proCat.id, supp_cat: "PRO" })
      .where("supp_cat IN (:...vals)", { vals: ["GBL", "GTR"] })
      .execute();
    report.suppCatGblGtrMigrated = suppCatGblResult.affected || 0;

    const toDelete = ["tba", "1688", "taobao", "purchase order", "others", "gbl", "gtr", "purchaseorder"];
    const deletedNames: string[] = [];

    for (const targetName of toDelete) {
      const cat = catByName.get(targetName);
      if (!cat) continue;

      const itemCount = await itemRepo.count({ where: { cat_id: cat.id } });
      if (itemCount > 0) {
        await itemRepo
          .createQueryBuilder()
          .update(Item)
          .set({ cat_id: proCat.id, supp_cat: "PRO" })
          .where("cat_id = :id", { id: cat.id })
          .execute();
      }

      try {
        await categoryRepo.delete(cat.id);
        deletedNames.push(cat.name || cat.de_cat);
      } catch (e: any) {
        report[`deleteError_${cat.name}`] = e.message;
      }
    }
    report.categoriesDeleted = deletedNames;

    const finalCats = await categoryRepo.find({ order: { id: "ASC" } });
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
  } catch (error) {
    return next(error);
  }
};

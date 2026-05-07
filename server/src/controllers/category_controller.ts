import { Request, Response, NextFunction } from "express";
import { Not, ILike } from "typeorm";

import ErrorHandler from "../utils/errorHandler";
import { AppDataSource } from "../config/database";
import { Category } from "../models/categories";

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryRepo = AppDataSource.getRepository(Category);

    const essentialTypes = [
      { name: "Purchase Order", de_cat: "PO" },
      { name: "Taobao", de_cat: "TB" },
      { name: "1688", de_cat: "1688" },
      { name: "Others", de_cat: "OTH" }
    ];

    for (const type of essentialTypes) {
      const exists = await categoryRepo.findOne({ where: { name: type.name } });
      if (!exists) {
        const newCat = categoryRepo.create({ name: type.name, de_cat: type.de_cat, is_ignored_value: "N" });
        await categoryRepo.save(newCat);
      }
    }

    const categories = await categoryRepo.find({
      where: {
        name: Not(ILike('Imported%'))
      },
      order: {
        id: 'DESC'
      }
    });

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    return next(error);
  }
};





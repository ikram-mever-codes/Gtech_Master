import { Request, Response, NextFunction } from "express";

import ErrorHandler from "../utils/errorHandler";
import { AppDataSource } from "../config/database";
import { Category } from "../models/categories";

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryRepo = AppDataSource.getRepository(Category);
    const qb = categoryRepo
      .createQueryBuilder("c")
      .select([
        "c.id",
        "c.name",
      ]);

    const categories = await qb
      .where("c.name NOT ILIKE :prefix", { prefix: "Imported%" })
      .orderBy("c.id", "DESC")
      .getMany();
    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    return next(error);
  }
};





import { Request, Response, NextFunction } from "express";

import ErrorHandler from "../utils/errorHandler";
import { AppDataSource } from "../config/database";
import { Category } from "../models/categories";

// ────────────────────────────────────────────────
//              CATEGORY MANAGEMENT
// ────────────────────────────────────────────────

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryRepo = AppDataSource.getRepository(Category);
    const qb = categoryRepo
      .createQueryBuilder("c")
      .select([
        "c.id",
        "c.name",
      ]);

    const categories = await qb.orderBy("c.id", "DESC").getMany();
    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    return next(error);
  }
};





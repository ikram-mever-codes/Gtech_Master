import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { TaxProfile } from "../models/tax_profile";
import ErrorHandler from "../utils/errorHandler";

export const getAllTaxProfiles = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const taxProfileRepository = AppDataSource.getRepository(TaxProfile);
    const taxProfiles = await taxProfileRepository.find({
      order: {
        rate: "DESC",
        name: "ASC",
      },
    });

    return res.status(200).json({
      success: true,
      data: taxProfiles,
    });
  } catch (error) {
    console.error("Error fetching tax profiles:", error);
    return next(new ErrorHandler("Failed to retrieve tax profiles", 500));
  }
};
import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { TaxProfile } from "../models/tax_profile";
import ErrorHandler from "../utils/errorHandler";

export const getAllTaxProfiles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const taxProfileRepository = AppDataSource.getRepository(TaxProfile);
    const includeInactive = req.query.all === "true";

    const taxProfiles = await taxProfileRepository.find({
      where: includeInactive ? {} : { is_active: true },
      order: {
        tax_rate: "DESC",
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

export const createTaxProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const taxProfileRepository = AppDataSource.getRepository(TaxProfile);
    const {
      name,
      tax_case,
      tax_rate,
      tax_code,
      revenue_account_no,
      requires_vat_id,
      requires_confirmed_vat_id,
      description,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Tax Profile name is required.",
      });
    }
    const taxProfile = taxProfileRepository.create({
      name: name.trim(),
      tax_case: tax_case ? tax_case.trim() : null,
      tax_rate: tax_rate !== undefined ? Number(tax_rate) : 0.0,
      tax_code: tax_code ? tax_code.trim() : null,
      revenue_account_no: revenue_account_no ? revenue_account_no.trim() : null,
      requires_vat_id: !!requires_vat_id,
      requires_confirmed_vat_id: !!requires_confirmed_vat_id,
      is_active: true,
      description: description ? description.trim() : undefined,
    });

    const saved = await taxProfileRepository.save(taxProfile);

    return res.status(201).json({
      success: true,
      data: saved,
    });
  } catch (error) {
    console.error("Error creating tax profile:", error);
    return next(new ErrorHandler("Failed to create tax profile", 500));
  }
};

export const updateTaxProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const taxProfileRepository = AppDataSource.getRepository(TaxProfile);
    const { id } = req.params;
    const {
      name,
      tax_case,
      tax_rate,
      tax_code,
      revenue_account_no,
      requires_vat_id,
      requires_confirmed_vat_id,
      is_active,
      description,
    } = req.body;

    const profile = await taxProfileRepository.findOne({
      where: { id },
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Tax Profile not found.",
      });
    }

    if (name !== undefined) profile.name = name.trim();
    if (tax_case !== undefined) profile.tax_case = tax_case ? tax_case.trim() : null;
    if (tax_rate !== undefined) profile.tax_rate = Number(tax_rate);
    if (tax_code !== undefined) profile.tax_code = tax_code ? tax_code.trim() : null;
    if (revenue_account_no !== undefined)
      profile.revenue_account_no = revenue_account_no ? revenue_account_no.trim() : null;
    if (requires_vat_id !== undefined) profile.requires_vat_id = !!requires_vat_id;
    if (requires_confirmed_vat_id !== undefined)
      profile.requires_confirmed_vat_id = !!requires_confirmed_vat_id;
    if (is_active !== undefined) profile.is_active = !!is_active;
    if (description !== undefined) profile.description = description ? description.trim() : undefined;



    const updated = await taxProfileRepository.save(profile);

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating tax profile:", error);
    return next(new ErrorHandler("Failed to update tax profile", 500));
  }
};

export const deactivateTaxProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const taxProfileRepository = AppDataSource.getRepository(TaxProfile);
    const { id } = req.params;

    const profile = await taxProfileRepository.findOne({ where: { id } });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Tax Profile not found.",
      });
    }

    profile.is_active = false;
    await taxProfileRepository.save(profile);

    return res.status(200).json({
      success: true,
      message: "Tax Profile deactivated successfully.",
    });
  } catch (error) {
    console.error("Error deactivating tax profile:", error);
    return next(new ErrorHandler("Failed to deactivate tax profile", 500));
  }
};

export const deleteTaxProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const taxProfileRepository = AppDataSource.getRepository(TaxProfile);
    const { id } = req.params;

    const profile = await taxProfileRepository.findOne({ where: { id } });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Tax Profile not found.",
      });
    }

    try {
      await taxProfileRepository.remove(profile);
      return res.status(200).json({ success: true, message: "Tax Profile deleted successfully." });
    } catch (err: any) {
      profile.is_active = false;
      await taxProfileRepository.save(profile);
      return res.status(200).json({
        success: true,
        message: "Tax Profile is in use by other data, so it has been set to Inactive instead.",
      });
    }
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

export const getTaxProfileById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const taxProfileRepository = AppDataSource.getRepository(TaxProfile);
    const { id } = req.params;

    const profile = await taxProfileRepository.findOne({
      where: { id },
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Tax Profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("Error fetching tax profile by ID:", error);
    return next(new ErrorHandler("Failed to retrieve tax profile details", 500));
  }
};
import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { GtechCompany } from "../models/gtech_company";
import ErrorHandler from "../utils/errorHandler";

const repo = () => AppDataSource.getRepository(GtechCompany);

export const getAllGtechCompanies = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const companies = await repo().find({ order: { legal_name: "ASC" } });
    return res.status(200).json({ success: true, data: companies });
  } catch (error) {
    console.error("Error fetching gtech companies:", error);
    return next(new ErrorHandler("Failed to retrieve GTech companies", 500));
  }
};

export const getGtechCompanyById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const company = await repo().findOne({ where: { id: req.params.id } });
    if (!company)
      return res.status(404).json({ success: false, message: "GTech company not found." });
    return res.status(200).json({ success: true, data: company });
  } catch (error) {
    return next(new ErrorHandler("Failed to retrieve GTech company", 500));
  }
};

export const createGtechCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { legal_name } = req.body;
    if (!legal_name?.trim())
      return res.status(400).json({ success: false, message: "Legal name is required." });

    const company = repo().create({
      legal_name: legal_name.trim(),
      display_name: req.body.display_name?.trim() || null,
      additional_address: req.body.additional_address?.trim() || null,
      street: req.body.street?.trim() || null,
      postal_code: req.body.postal_code?.trim() || null,
      city: req.body.city?.trim() || null,
      country: req.body.country?.trim() || null,
      shipping_additional_address: req.body.shipping_additional_address?.trim() || null,
      shipping_street: req.body.shipping_street?.trim() || null,
      shipping_postal_code: req.body.shipping_postal_code?.trim() || null,
      shipping_city: req.body.shipping_city?.trim() || null,
      shipping_country: req.body.shipping_country?.trim() || null,
      registry_no: req.body.registry_no?.trim() || null,
      vat_id: req.body.vat_id?.trim() || null,
      tax_no: req.body.tax_no?.trim() || null,
      official_no1: req.body.official_no1?.trim() || null,
      official_no2: req.body.official_no2?.trim() || null,
      date_of_incorporation: req.body.date_of_incorporation || null,
      contact_person_name: req.body.contact_person_name?.trim() || null,
      contact_phone: req.body.contact_phone?.trim() || null,
      contact_email: req.body.contact_email?.trim() || null,
    });

    const saved = await repo().save(company);
    return res.status(201).json({ success: true, data: saved });
  } catch (error) {
    console.error("Error creating gtech company:", error);
    return next(new ErrorHandler("Failed to create GTech company", 500));
  }
};

export const updateGtechCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const company = await repo().findOne({ where: { id: req.params.id } });
    if (!company)
      return res.status(404).json({ success: false, message: "GTech company not found." });

    const fields: (keyof GtechCompany)[] = [
      "legal_name", "display_name", "additional_address", "street",
      "postal_code", "city", "country",
      "shipping_additional_address", "shipping_street", "shipping_postal_code",
      "shipping_city", "shipping_country",
      "registry_no", "vat_id", "tax_no", "official_no1", "official_no2",
      "date_of_incorporation", "contact_person_name", "contact_phone", "contact_email",
    ];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        (company as any)[field] =
          typeof req.body[field] === "string"
            ? req.body[field].trim() || null
            : req.body[field];
      }
    }

    const updated = await repo().save(company);
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating gtech company:", error);
    return next(new ErrorHandler("Failed to update GTech company", 500));
  }
};

export const deleteGtechCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const company = await repo().findOne({ where: { id: req.params.id } });
    if (!company)
      return res.status(404).json({ success: false, message: "GTech company not found." });

    await repo().remove(company);
    return res.status(200).json({ success: true, message: "GTech company deleted successfully." });
  } catch (error) {
    console.error("Error deleting gtech company:", error);
    return next(new ErrorHandler("Failed to delete GTech company", 500));
  }
};

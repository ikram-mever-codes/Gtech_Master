import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Country } from "../models/country";

export const getAllCountries = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const countryRepository = AppDataSource.getRepository(Country);
    const includeInactive = req.query.all === "true";

    const countries = await countryRepository.find({
      where: includeInactive ? {} : { is_active: true },
      order: { name: "ASC" },
    });

    return res.status(200).json({ success: true, data: countries });
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

export const createCountry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const countryRepository = AppDataSource.getRepository(Country);
    const { iso2, name, is_eu, is_igl_country } = req.body;

    if (!iso2 || !name) {
      return res
        .status(400)
        .json({ success: false, message: "ISO2 code and name are required." });
    }

    const existing = await countryRepository.findOne({
      where: { iso2: iso2.trim().toUpperCase() },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Country with ISO2 code "${iso2.toUpperCase()}" already exists.`,
      });
    }

    const country = countryRepository.create({
      iso2: iso2.trim().toUpperCase(),
      name: name.trim(),
      is_eu: !!is_eu,
      is_igl_country: !!is_igl_country,
      is_active: true,
    });

    const saved = await countryRepository.save(country);
    return res.status(201).json({ success: true, data: saved });
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

export const updateCountry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const countryRepository = AppDataSource.getRepository(Country);
    const { id } = req.params;
    const { name, is_eu, is_igl_country, is_active } = req.body;

    const country = await countryRepository.findOne({ where: { id } });
    if (!country) {
      return res
        .status(404)
        .json({ success: false, message: "Country not found." });
    }

    if (name !== undefined) country.name = name.trim();
    if (is_eu !== undefined) country.is_eu = !!is_eu;
    if (is_igl_country !== undefined) country.is_igl_country = !!is_igl_country;
    if (is_active !== undefined) country.is_active = !!is_active;

    const updated = await countryRepository.save(country);
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

export const deactivateCountry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const countryRepository = AppDataSource.getRepository(Country);
    const { id } = req.params;

    const country = await countryRepository.findOne({ where: { id } });
    if (!country) {
      return res
        .status(404)
        .json({ success: false, message: "Country not found." });
    }

    country.is_active = false;
    await countryRepository.save(country);
    return res
      .status(200)
      .json({ success: true, message: "Country deactivated successfully." });
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

export const deleteCountry = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const countryRepository = AppDataSource.getRepository(Country);
    const { id } = req.params;

    const country = await countryRepository.findOne({ where: { id } });
    if (!country) {
      return res
        .status(404)
        .json({ success: false, message: "Country not found." });
    }

    try {
      await countryRepository.remove(country);
      return res.status(200).json({ success: true, message: "Country deleted successfully." });
    } catch (err: any) {
      country.is_active = false;
      await countryRepository.save(country);
      return res.status(200).json({
        success: true,
        message: "Country is in use by other data, so it has been set to Inactive instead.",
      });
    }
  } catch (error) {
    console.error(error);
    return next(error);
  }
};

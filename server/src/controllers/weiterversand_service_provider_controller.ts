import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { WeiterversandServiceProvider } from "../models/weiterversand_service_provider";
import ErrorHandler from "../utils/errorHandler";

export const getAllWeiterversandServiceProviders = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const repo = AppDataSource.getRepository(WeiterversandServiceProvider);
    const providers = await repo.find({
      order: { pos: "ASC", id: "ASC" },
    });

    return res.status(200).json({
      success: true,
      data: providers,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Failed to fetch service providers", 500));
  }
};

export const getWeiterversandServiceProviderById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const repo = AppDataSource.getRepository(WeiterversandServiceProvider);
    const provider = await repo.findOne({ where: { id: parseInt(id) } });

    if (!provider) {
      return next(new ErrorHandler("Service provider not found", 404));
    }

    return res.status(200).json({
      success: true,
      data: provider,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Failed to fetch service provider", 500));
  }
};

export const createWeiterversandServiceProvider = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { pos, name, website, remark } = req.body;

    if (!name || name.trim() === "") {
      return next(new ErrorHandler("Name is required", 400));
    }

    const repo = AppDataSource.getRepository(WeiterversandServiceProvider);

    // If pos is not specified, auto-assign next highest pos
    let finalPos = pos !== undefined ? parseInt(pos) || 0 : 0;
    if (pos === undefined) {
      const maxPosResult = await repo
        .createQueryBuilder("provider")
        .select("MAX(provider.pos)", "max")
        .getRawOne();
      finalPos = ((maxPosResult?.max || 0) as number) + 1;
    }

    const provider = repo.create({
      pos: finalPos,
      name: name.trim(),
      website: website ? website.trim() : "",
      remark: remark ? remark.trim() : "",
    });

    await repo.save(provider);

    return res.status(201).json({
      success: true,
      message: "Service provider created successfully",
      data: provider,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Failed to create service provider", 500));
  }
};

export const updateWeiterversandServiceProvider = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { pos, name, website, remark } = req.body;

    const repo = AppDataSource.getRepository(WeiterversandServiceProvider);
    const provider = await repo.findOne({ where: { id: parseInt(id) } });

    if (!provider) {
      return next(new ErrorHandler("Service provider not found", 404));
    }

    if (name !== undefined) {
      if (!name || name.trim() === "") {
        return next(new ErrorHandler("Name cannot be empty", 400));
      }
      provider.name = name.trim();
    }

    if (pos !== undefined) {
      provider.pos = parseInt(pos) || 0;
    }

    if (website !== undefined) {
      provider.website = website ? website.trim() : "";
    }

    if (remark !== undefined) {
      provider.remark = remark ? remark.trim() : "";
    }

    await repo.save(provider);

    return res.status(200).json({
      success: true,
      message: "Service provider updated successfully",
      data: provider,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Failed to update service provider", 500));
  }
};

export const deleteWeiterversandServiceProvider = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const repo = AppDataSource.getRepository(WeiterversandServiceProvider);
    const provider = await repo.findOne({ where: { id: parseInt(id) } });

    if (!provider) {
      return next(new ErrorHandler("Service provider not found", 404));
    }

    await repo.remove(provider);

    return res.status(200).json({
      success: true,
      message: "Service provider deleted successfully",
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Failed to delete service provider", 500));
  }
};

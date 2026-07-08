import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { ShippingMethod } from "../models/shipping_methods";
import ErrorHandler from "../utils/errorHandler";

export const getAllShippingMethods = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const shippingMethodRepository = AppDataSource.getRepository(ShippingMethod);
    const includeInactive = req.query.all === "true";

    const shippingMethods = await shippingMethodRepository.find({
      where: includeInactive ? {} : { is_active: true },
      order: {
        name: "ASC",
      },
    });

    return res.status(200).json({
      success: true,
      data: shippingMethods,
    });
  } catch (error) {
    console.error("Error fetching shipping methods:", error);
    return next(new ErrorHandler("Failed to retrieve shipping methods", 500));
  }
};

export const getShippingMethodById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const shippingMethodRepository = AppDataSource.getRepository(ShippingMethod);
    const { id } = req.params;

    const shippingMethod = await shippingMethodRepository.findOne({
      where: { id },
    });

    if (!shippingMethod) {
      return res.status(404).json({
        success: false,
        message: "Shipping Method not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: shippingMethod,
    });
  } catch (error) {
    console.error("Error fetching shipping method by ID:", error);
    return next(new ErrorHandler("Failed to retrieve shipping method details", 500));
  }
};

export const createShippingMethod = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const shippingMethodRepository = AppDataSource.getRepository(ShippingMethod);
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Shipping Method name is required.",
      });
    }

    const existing = await shippingMethodRepository.findOne({
      where: { name: name.trim() },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Shipping Method with this name already exists.",
      });
    }

    const shippingMethod = shippingMethodRepository.create({
      name: name.trim(),
      is_active: true,
    });

    const saved = await shippingMethodRepository.save(shippingMethod);

    return res.status(201).json({
      success: true,
      data: saved,
    });
  } catch (error) {
    console.error("Error creating shipping method:", error);
    return next(new ErrorHandler("Failed to create shipping method", 500));
  }
};

export const updateShippingMethod = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const shippingMethodRepository = AppDataSource.getRepository(ShippingMethod);
    const { id } = req.params;
    const { name, is_active } = req.body;

    const shippingMethod = await shippingMethodRepository.findOne({
      where: { id },
    });

    if (!shippingMethod) {
      return res.status(404).json({
        success: false,
        message: "Shipping Method not found.",
      });
    }

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: "Shipping Method name cannot be empty.",
        });
      }

      const existing = await shippingMethodRepository.findOne({
        where: { name: trimmedName },
      });

      if (existing && existing.id !== id) {
        return res.status(400).json({
          success: false,
          message: "Shipping Method with this name already exists.",
        });
      }

      shippingMethod.name = trimmedName;
    }

    if (is_active !== undefined) {
      shippingMethod.is_active = !!is_active;
    }

    const updated = await shippingMethodRepository.save(shippingMethod);

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating shipping method:", error);
    return next(new ErrorHandler("Failed to update shipping method", 500));
  }
};

export const deleteShippingMethod = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const shippingMethodRepository = AppDataSource.getRepository(ShippingMethod);
    const { id } = req.params;

    const shippingMethod = await shippingMethodRepository.findOne({
      where: { id },
    });

    if (!shippingMethod) {
      return res.status(404).json({
        success: false,
        message: "Shipping Method not found.",
      });
    }

    await shippingMethodRepository.remove(shippingMethod);

    return res.status(200).json({
      success: true,
      message: "Shipping Method deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting shipping method:", error);
    return next(new ErrorHandler("Failed to delete shipping method", 500));
  }
};
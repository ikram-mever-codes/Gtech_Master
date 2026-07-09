import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { PaymentMethod } from "../models/payment_methods";
import ErrorHandler from "../utils/errorHandler";

export const getAllPaymentMethods = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentMethodRepository = AppDataSource.getRepository(PaymentMethod);
    const includeInactive = req.query.all === "true";

    const paymentMethods = await paymentMethodRepository.find({
      where: includeInactive ? {} : { is_active: true },
      order: {
        name: "ASC",
      },
    });

    return res.status(200).json({
      success: true,
      data: paymentMethods,
    });
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return next(new ErrorHandler("Failed to retrieve payment methods", 500));
  }
};

export const getPaymentMethodById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentMethodRepository = AppDataSource.getRepository(PaymentMethod);
    const { id } = req.params;

    const paymentMethod = await paymentMethodRepository.findOne({
      where: { id },
    });

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: "Payment Method not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: paymentMethod,
    });
  } catch (error) {
    console.error("Error fetching payment method by ID:", error);
    return next(new ErrorHandler("Failed to retrieve payment method details", 500));
  }
};

export const createPaymentMethod = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentMethodRepository = AppDataSource.getRepository(PaymentMethod);
    const { name, is_prepayment } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Payment Method name is required.",
      });
    }

    const existing = await paymentMethodRepository.findOne({
      where: { name: name.trim() },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Payment Method with this name already exists.",
      });
    }

    const paymentMethod = paymentMethodRepository.create({
      name: name.trim(),
      is_prepayment: !!is_prepayment,
      is_active: true,
    });

    const saved = await paymentMethodRepository.save(paymentMethod);

    return res.status(201).json({
      success: true,
      data: saved,
    });
  } catch (error) {
    console.error("Error creating payment method:", error);
    return next(new ErrorHandler("Failed to create payment method", 500));
  }
};

export const updatePaymentMethod = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentMethodRepository = AppDataSource.getRepository(PaymentMethod);
    const { id } = req.params;
    const { name, is_prepayment, is_active } = req.body;

    const paymentMethod = await paymentMethodRepository.findOne({
      where: { id },
    });

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: "Payment Method not found.",
      });
    }

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: "Payment Method name cannot be empty.",
        });
      }
      
      const existing = await paymentMethodRepository.findOne({
        where: { name: trimmedName },
      });

      if (existing && existing.id !== id) {
        return res.status(400).json({
          success: false,
          message: "Payment Method with this name already exists.",
        });
      }

      paymentMethod.name = trimmedName;
    }

    if (is_prepayment !== undefined) {
      paymentMethod.is_prepayment = !!is_prepayment;
    }

    if (is_active !== undefined) {
      paymentMethod.is_active = !!is_active;
    }

    const updated = await paymentMethodRepository.save(paymentMethod);

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error updating payment method:", error);
    return next(new ErrorHandler("Failed to update payment method", 500));
  }
};

export const deletePaymentMethod = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentMethodRepository = AppDataSource.getRepository(PaymentMethod);
    const { id } = req.params;

    const paymentMethod = await paymentMethodRepository.findOne({
      where: { id },
    });

    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        message: "Payment Method not found.",
      });
    }

    await paymentMethodRepository.remove(paymentMethod);

    return res.status(200).json({
      success: true,
      message: "Payment Method deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting payment method:", error);
    return next(new ErrorHandler("Failed to delete payment method", 500));
  }
};

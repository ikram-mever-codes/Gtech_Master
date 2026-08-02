import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { PaymentAccount } from "../models/payment_account";
import ErrorHandler from "../utils/errorHandler";

export const getAllPaymentAccounts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentAccountRepository = AppDataSource.getRepository(PaymentAccount);
    const includeInactive = req.query.all === "true";

    const paymentAccounts = await paymentAccountRepository.find({
      where: includeInactive ? {} : { is_active: true },
      order: {
        created_at: "DESC",
      },
    });

    return res.status(200).json({
      success: true,
      data: paymentAccounts,
    });
  } catch (error) {
    console.error("Error fetching payment accounts:", error);
    return next(new ErrorHandler("Failed to retrieve payment accounts", 500));
  }
};

export const getPaymentAccountById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentAccountRepository = AppDataSource.getRepository(PaymentAccount);
    const { id } = req.params;

    const paymentAccount = await paymentAccountRepository.findOne({
      where: { id },
    });

    if (!paymentAccount) {
      return res.status(404).json({
        success: false,
        message: "Payment Account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: paymentAccount,
    });
  } catch (error) {
    console.error("Error fetching payment account by ID:", error);
    return next(new ErrorHandler("Failed to retrieve payment account details", 500));
  }
};

export const createPaymentAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentAccountRepository = AppDataSource.getRepository(PaymentAccount);
    const { name, currency_code, external_account_id, is_active } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Payment Account name is required.",
      });
    }

    const trimmedName = name.trim();
    const existing = await paymentAccountRepository.findOne({
      where: { name: trimmedName },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Payment Account with this name already exists.",
      });
    }

    const paymentAccount = paymentAccountRepository.create({
      name: trimmedName,
      currency_code: (currency_code || "EUR").trim().toUpperCase(),
      external_account_id: external_account_id ? external_account_id.trim() : undefined,
      is_active: is_active !== undefined ? !!is_active : true,
    });

    const saved = await paymentAccountRepository.save(paymentAccount);

    return res.status(201).json({
      success: true,
      data: saved,
      message: "Payment Account created successfully.",
    });
  } catch (error) {
    console.error("Error creating payment account:", error);
    return next(new ErrorHandler("Failed to create payment account", 500));
  }
};

export const updatePaymentAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentAccountRepository = AppDataSource.getRepository(PaymentAccount);
    const { id } = req.params;
    const { name, currency_code, external_account_id, is_active } = req.body;

    const paymentAccount = await paymentAccountRepository.findOne({
      where: { id },
    });

    if (!paymentAccount) {
      return res.status(404).json({
        success: false,
        message: "Payment Account not found.",
      });
    }

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: "Payment Account name cannot be empty.",
        });
      }

      const existing = await paymentAccountRepository.findOne({
        where: { name: trimmedName },
      });

      if (existing && existing.id !== id) {
        return res.status(400).json({
          success: false,
          message: "Payment Account with this name already exists.",
        });
      }

      paymentAccount.name = trimmedName;
    }

    if (currency_code !== undefined) {
      paymentAccount.currency_code = (currency_code || "EUR").trim().toUpperCase();
    }

    if (external_account_id !== undefined) {
      paymentAccount.external_account_id = external_account_id ? external_account_id.trim() : undefined;
    }

    if (is_active !== undefined) {
      paymentAccount.is_active = !!is_active;
    }

    const updated = await paymentAccountRepository.save(paymentAccount);

    return res.status(200).json({
      success: true,
      data: updated,
      message: "Payment Account updated successfully.",
    });
  } catch (error) {
    console.error("Error updating payment account:", error);
    return next(new ErrorHandler("Failed to update payment account", 500));
  }
};

export const deletePaymentAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const paymentAccountRepository = AppDataSource.getRepository(PaymentAccount);
    const { id } = req.params;

    const paymentAccount = await paymentAccountRepository.findOne({
      where: { id },
    });

    if (!paymentAccount) {
      return res.status(404).json({
        success: false,
        message: "Payment Account not found.",
      });
    }

    await paymentAccountRepository.remove(paymentAccount);

    return res.status(200).json({
      success: true,
      message: "Payment Account deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting payment account:", error);
    return next(new ErrorHandler("Failed to delete payment account", 500));
  }
};

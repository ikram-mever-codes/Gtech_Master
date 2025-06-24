import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/database";
import { Customer } from "../models/customers";
import ErrorHandler from "../utils/errorHandler";

export interface AuthorizedCustomerRequest extends Request {
  customer?: Customer;
}

export const authenticateCustomer = async (
  req: AuthorizedCustomerRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies?.token;
  if (!token) {
    return next(new ErrorHandler("Session expired! Please login again", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
    };

    const customerRepository = AppDataSource.getRepository(Customer);

    const customer = await customerRepository.findOne({
      where: { id: decoded.id },
    });
    if (!customer) {
      return next(new ErrorHandler("Customer not found", 404));
    }

    if (!customer.isEmailVerified) {
      return next(new ErrorHandler("Please verify your email first", 401));
    }

    if (customer.accountVerificationStatus !== "verified") {
      return next(new ErrorHandler("Your account is not verified yet", 403));
    }

    req.customer = customer;
    next();
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Session expired! Please login again", 401));
  }
};

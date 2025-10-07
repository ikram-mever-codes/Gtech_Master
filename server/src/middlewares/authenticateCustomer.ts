import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../config/database";
import { Customer } from "../models/customers";
import { StarCustomerDetails } from "../models/star_customer_details";
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
      relations: ["starCustomerDetails"], // Load the relation
    });

    if (!customer) {
      return next(new ErrorHandler("Customer not found", 404));
    }

    // Check if customer has starCustomerDetails
    if (!customer.starCustomerDetails) {
      return next(new ErrorHandler("Customer details not found", 404));
    }

    // Check email verification status from starCustomerDetails
    if (!customer.starCustomerDetails.isEmailVerified) {
      return next(new ErrorHandler("Please verify your email first", 401));
    }

    // Check account verification status from starCustomerDetails
    if (customer.starCustomerDetails.accountVerificationStatus !== "verified") {
      return next(new ErrorHandler("Your account is not verified yet", 403));
    }

    req.customer = customer;
    next();
  } catch (error) {
    console.log("Authentication error:", error);
    return next(new ErrorHandler("Session expired! Please login again", 401));
  }
};

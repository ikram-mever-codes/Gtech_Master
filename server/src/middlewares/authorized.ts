import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { User, UserRole } from "../models/users";
import ErrorHandler from "../utils/errorHandler";
import { AppDataSource } from "../config/database";

export interface AuthorizedRequest extends Request {
  user?: User;
}

export const authenticateUser: RequestHandler = async (
  req,
  res,
  next
): Promise<void> => {
  const authReq = req as AuthorizedRequest;

  const token = authReq.cookies?.token;
  if (!token) {
    return next(
      new ErrorHandler("Session expired! Please login again", 401)
    );
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
    };

    const userRepository = AppDataSource.getRepository(User);

    const user = await userRepository.findOne({
      where: { id: decoded.id },
      relations: ["permissions"],
    });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    if (!user.isEmailVerified) {
      return next(
        new ErrorHandler("Please verify your email first", 401)
      );
    }

    if (!user.isLoginEnabled) {
      return next(
        new ErrorHandler("Your account has been disabled. Please contact support.", 403)
      );
    }

    authReq.user = user;
    next();
  } catch (error) {
    console.error(error);
    return next(
      new ErrorHandler("Session expired! Please login again", 401)
    );
  }
};

export const isAdmin: RequestHandler = async (
  req,
  res,
  next
): Promise<void> => {
  const authReq = req as AuthorizedRequest;

  try {
    if (!authReq.user) {
      return next(new ErrorHandler("Authentication required", 401));
    }

    if (authReq.user.role !== UserRole.ADMIN) {
      return next(new ErrorHandler("Admin access required", 403));
    }

    next();
  } catch (error) {
    console.error("Admin check error:", error);
    return next(new ErrorHandler("Authorization failed", 500));
  }
};

/**
 * Middleware to restrict access based on user roles.
 * Admins always bypass this check.
 */
export const authorize = (...roles: UserRole[]): RequestHandler => {
  return (req, res, next) => {
    const authReq = req as AuthorizedRequest;

    if (!authReq.user) {
      return next(new ErrorHandler("Authentication required", 401));
    }

    if (authReq.user.role === UserRole.ADMIN) {
      return next();
    }

    if (roles.length && !roles.includes(authReq.user.role)) {
      return next(
        new ErrorHandler(
          `Forbidden: ${authReq.user.role} role does not have access to this resource`,
          403
        )
      );
    }

    next();
  };
};

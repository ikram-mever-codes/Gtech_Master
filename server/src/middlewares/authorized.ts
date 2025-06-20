import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getRepository } from "typeorm";
import { User } from "../models/users";
import ErrorHandler from "../utils/errorHandler";
import { AppDataSource } from "../config/database";

export interface AuthorizedRequest extends Request {
  user?: User;
}

export const authenticateUser = async (
  req: AuthorizedRequest,
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

    const userRepository = AppDataSource.getRepository(User);

    const user = await userRepository.findOne({
      where: { id: decoded.id },
      relations: ["permissions"],
    });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    if (!user.isEmailVerified) {
      return next(new ErrorHandler("Please verify your email first", 401));
    }

    req.user = user;
    next();
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Session expired! Please login again", 401));
  }
};

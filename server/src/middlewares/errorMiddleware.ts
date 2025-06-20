import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/errorHandler";

const errorMiddleware = (
  err: ErrorHandler | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = err instanceof ErrorHandler ? err.status : 500;
  const success = err instanceof ErrorHandler ? err.success : false;
  console.log(err);
  return res.status(status).json({
    success,
    message: err.message || "Internal Server Error",
    errors: err instanceof ErrorHandler ? err.errors : undefined,
  });
};

export default errorMiddleware;

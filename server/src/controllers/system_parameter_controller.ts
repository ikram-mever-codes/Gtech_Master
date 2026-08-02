import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { SystemParameter } from "../models/system_parameter";
import { Offer } from "../models/offer";
import ErrorHandler from "../utils/errorHandler";
import fs from "fs";
import path from "path";

export const getAllSystemParameters = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const repository = AppDataSource.getRepository(SystemParameter);
    const parameters = await repository.find();

    return res.status(200).json({
      success: true,
      data: parameters,
    });
  } catch (error) {
    return next(error);
  }
};

export const getSystemParameterByKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { key } = req.params;
    const repository = AppDataSource.getRepository(SystemParameter);
    const param = await repository.findOne({ where: { key } });

    return res.status(200).json({
      success: true,
      data: param || null,
    });
  } catch (error) {
    return next(error);
  }
};

export const checkColourInUse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { hex } = req.body;
    if (!hex) {
      return res.status(200).json({ success: true, count: 0, inUse: false });
    }

    const offerRepo = AppDataSource.getRepository(Offer);
    const count = await offerRepo.count({
      where: { highlightColor: hex },
    });

    return res.status(200).json({
      success: true,
      count,
      inUse: count > 0,
    });
  } catch (error) {
    return next(error);
  }
};


export const updateSystemColours = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { colours } = req.body;
    if (!colours) {
      return next(new ErrorHandler("Colours object or array is required", 400));
    }

    const repository = AppDataSource.getRepository(SystemParameter);
    let param = await repository.findOne({ where: { key: "system_colours" } });

    if (param && Array.isArray(param.value) && Array.isArray(colours)) {
      const oldColours: any[] = param.value;
      const newHexes = new Set(
        colours.map((c: any) => c.hex?.toLowerCase()).filter(Boolean)
      );

      const deletedColours = oldColours.filter(
        (c: any) => c.hex && !newHexes.has(c.hex.toLowerCase())
      );

      if (deletedColours.length > 0) {
        const offerRepo = AppDataSource.getRepository(Offer);
        for (const del of deletedColours) {
          const count = await offerRepo.count({
            where: { highlightColor: del.hex },
          });

          if (count > 0) {
            return next(
              new ErrorHandler(
                `Color '${del.name || del.hex}' (${del.hex}) is currently assigned to ${count} Angebot(s) and cannot be deleted. Please reassign those records first.`,
                400
              )
            );
          }
        }
      }
    }

    if (!param) {
      param = repository.create({
        key: "system_colours",
        value: colours,
      });
    } else {
      param.value = colours;
    }

    await repository.save(param);

    return res.status(200).json({
      success: true,
      message: "System colours updated successfully",
      data: param,
    });
  } catch (error) {
    return next(error);
  }
};

export const uploadDocumentTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const file = req.file;
    if (!file) {
      return next(new ErrorHandler("Template file is required", 400));
    }

    const key = req.body.key || "customer_doc_template";
    const repository = AppDataSource.getRepository(SystemParameter);
    let param = await repository.findOne({ where: { key } });
    const file_url = `/uploads/${file.filename}`;

    if (!param) {
      param = repository.create({
        key,
        file_url,
        file_name: file.originalname,
        file_type: file.mimetype,
        uploaded_at: new Date(),
      });
    } else {
      if (param.file_url && param.file_url.startsWith("/uploads/")) {
        const oldFilePath = path.join(process.cwd(), param.file_url);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
          } catch (e) {
            console.warn("Could not delete old template file:", e);
          }
        }
      }

      param.file_url = file_url;
      param.file_name = file.originalname;
      param.file_type = file.mimetype;
      param.uploaded_at = new Date();
    }

    await repository.save(param);

    return res.status(200).json({
      success: true,
      message: "Document template uploaded successfully",
      data: param,
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteDocumentTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { key } = req.params;
    const repository = AppDataSource.getRepository(SystemParameter);
    const param = await repository.findOne({ where: { key } });

    if (!param) {
      return next(new ErrorHandler("Template parameter not found", 404));
    }

    if (param.file_url && param.file_url.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), param.file_url);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn("Could not delete template file:", e);
        }
      }
    }

    param.file_url = undefined;
    param.file_name = undefined;
    param.file_type = undefined;
    param.uploaded_at = undefined;

    await repository.save(param);

    return res.status(200).json({
      success: true,
      message: "Document template deleted successfully",
      data: param,
    });
  } catch (error) {
    return next(error);
  }
};
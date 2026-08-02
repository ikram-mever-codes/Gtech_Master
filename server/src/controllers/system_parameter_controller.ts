import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { SystemParameter } from "../models/system_parameter";
import { Offer } from "../models/offer";
import ErrorHandler from "../utils/errorHandler";
import fs from "fs";
import path from "path";

export interface TemplateVersion {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  valid_from: string;
  valid_to?: string;
  is_active: boolean;
  is_default?: boolean;
}

export const DEFAULT_CUSTOMER_TEMPLATE: TemplateVersion = {
  id: "default_svg",
  file_url: "/public/Customer_Document.svg",
  file_name: "Customer_Document.svg",
  file_type: "image/svg+xml",
  valid_from: new Date("2026-01-01T00:00:00.000Z").toISOString(),
  is_active: true,
  is_default: true,
};

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
    const nowIso = new Date().toISOString();

    let versions: TemplateVersion[] = [];

    if (param && param.value && Array.isArray(param.value.versions)) {
      versions = param.value.versions;
    } else {
      versions.push({
        ...DEFAULT_CUSTOMER_TEMPLATE,
        valid_to: nowIso,
        is_active: false,
      });
    }

    versions = versions.map((v) => {
      if (v.is_active) {
        return {
          ...v,
          is_active: false,
          valid_to: v.valid_to || nowIso,
        };
      }
      return v;
    });

    const newVersion: TemplateVersion = {
      id: `ver_${Date.now()}`,
      file_url,
      file_name: file.originalname,
      file_type: file.mimetype,
      valid_from: nowIso,
      is_active: true,
    };

    versions.unshift(newVersion);

    if (!param) {
      param = repository.create({
        key,
        file_url,
        file_name: file.originalname,
        file_type: file.mimetype,
        uploaded_at: new Date(),
        value: { versions },
      });
    } else {
      param.file_url = file_url;
      param.file_name = file.originalname;
      param.file_type = file.mimetype;
      param.uploaded_at = new Date();
      param.value = { ...(param.value || {}), versions };
    }

    await repository.save(param);

    return res.status(200).json({
      success: true,
      message: "Document template uploaded & archived successfully",
      data: param,
    });
  } catch (error) {
    return next(error);
  }
};

export const restoreDocumentTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { key, versionId } = req.body;
    if (!key || !versionId) {
      return next(new ErrorHandler("Key and versionId are required", 400));
    }

    const repository = AppDataSource.getRepository(SystemParameter);
    const param = await repository.findOne({ where: { key } });

    if (!param || !param.value || !Array.isArray(param.value.versions)) {
      return next(new ErrorHandler("No template version history found", 404));
    }

    const nowIso = new Date().toISOString();
    let targetVersion: TemplateVersion | undefined;

    let versions: TemplateVersion[] = param.value.versions.map((v: TemplateVersion) => {
      if (v.id === versionId) {
        targetVersion = {
          ...v,
          is_active: true,
          valid_from: nowIso,
          valid_to: undefined,
        };
        return targetVersion;
      }
      return {
        ...v,
        is_active: false,
        valid_to: v.valid_to || nowIso,
      };
    });

    if (!targetVersion) {
      return next(new ErrorHandler("Specified version not found in history", 404));
    }

    versions = [
      targetVersion,
      ...versions.filter((v) => v.id !== versionId),
    ];

    param.file_url = targetVersion.file_url;
    param.file_name = targetVersion.file_name;
    param.file_type = targetVersion.file_type;
    param.uploaded_at = new Date();
    param.value = { ...param.value, versions };

    await repository.save(param);

    return res.status(200).json({
      success: true,
      message: "Template version restored successfully",
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

    param.file_url = undefined;
    param.file_name = undefined;
    param.file_type = undefined;
    param.uploaded_at = undefined;
    param.value = { versions: [] };

    await repository.save(param);

    return res.status(200).json({
      success: true,
      message: "Document template reset successfully",
      data: param,
    });
  } catch (error) {
    return next(error);
  }
};

export const getActiveTemplateFilePath = async (
  key: string = "customer_doc_template"
): Promise<string> => {
  try {
    const repository = AppDataSource.getRepository(SystemParameter);
    const param = await repository.findOne({ where: { key } });

    if (param && param.file_url) {
      if (param.file_url.startsWith("/public/")) {
        const fallbackPath = path.join(process.cwd(), param.file_url);
        if (fs.existsSync(fallbackPath)) return fallbackPath;
      }

      if (param.file_url.startsWith("/uploads/")) {
        const uploadPath = path.join(process.cwd(), param.file_url);
        if (fs.existsSync(uploadPath)) return uploadPath;
      }
    }
  } catch (err) {
    console.warn("Error resolving active document template:", err);
  }

  return path.join(process.cwd(), "public/Customer_Document.svg");
};

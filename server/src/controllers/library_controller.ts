// controllers/library.controller.ts
import { Request, Response, NextFunction } from "express";
import { LibraryFile, FileType } from "../models/library";
import { AppDataSource } from "../config/database";
import cloudinary from "../config/cloudinary";
import fs from "fs";
import { User } from "../models/users";
import { Customer } from "../models/customers";
import ErrorHandler from "../utils/errorHandler";

// Helper function to determine file type from mime type
const getFileType = (mimeType: string): FileType => {
  if (mimeType.startsWith("image/")) return FileType.IMAGE;
  if (mimeType === "application/pdf") return FileType.PDF;
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("sheet")
  )
    return FileType.SPREADSHEET;
  if (
    mimeType.includes("document") ||
    mimeType.includes("word") ||
    mimeType.includes("text")
  )
    return FileType.DOCUMENT;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return FileType.PRESENTATION;
  if (mimeType.includes("zip") || mimeType.includes("archive"))
    return FileType.ARCHIVE;
  return FileType.OTHER;
};

// Upload single file
export const uploadFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { description, tags, isPublic, customerId } = req.body;
    const userId = (req as any).user?.id;

    if (!req.file) {
      return next(new ErrorHandler("No file uploaded", 400));
    }

    // Validate file exists
    if (!fs.existsSync(req.file.path)) {
      return next(new ErrorHandler("File not found", 404));
    }

    const fileRepository: any = AppDataSource.getRepository(LibraryFile);
    const userRepository = AppDataSource.getRepository(User);
    const customerRepository = AppDataSource.getRepository(Customer);

    // Get user who uploaded
    let uploadedBy = null;
    if (userId) {
      uploadedBy = await userRepository.findOne({ where: { id: userId } });
    }

    // Get customer if provided
    let customer = null;
    if (customerId) {
      customer = await customerRepository.findOne({
        where: { id: customerId },
      });
    }

    let cloudinaryResult;
    try {
      // Upload to Cloudinary
      cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "library",
        resource_type: "auto",
      });

      // Generate thumbnail for images
      let thumbnailUrl = undefined;
      if (req.file.mimetype.startsWith("image/")) {
        const thumbnail = await cloudinary.uploader.upload(req.file.path, {
          folder: "library/thumbnails",
          width: 300,
          height: 200,
          crop: "fill",
        });
        thumbnailUrl = thumbnail.secure_url;
      }

      // Create file record
      const file = fileRepository.create({
        filename: req.file.filename || "",
        originalName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        fileType: getFileType(req.file.mimetype),
        url: cloudinaryResult.secure_url,
        thumbnailUrl,
        description: description || null,
        tags: tags ? tags.split(",").map((tag: string) => tag.trim()) : [],
        isPublic: isPublic === "true" || isPublic === true,
        uploadedBy,
        uploadedById: userId || null,
        customer,
        customerId: customerId || null,
      });

      await fileRepository.save(file);

      // Delete local file after successful upload
      fs.unlinkSync(req.file.path);

      return res.status(201).json({
        success: true,
        message: "File uploaded successfully",
        data: file,
      });
    } catch (uploadError) {
      // Clean up local file if upload failed
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return next(new ErrorHandler("Failed to upload file to cloud", 500));
    }
  } catch (error) {
    return next(error);
  }
};

// Get all files (with filters)
export const getFiles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      type,
      search,
      customerId,
      isPublic,
      page = 1,
      limit = 20,
    } = req.query;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const fileRepository = AppDataSource.getRepository(LibraryFile);
    const query = fileRepository.createQueryBuilder("file");

    // Apply filters
    if (type) {
      query.andWhere("file.fileType = :type", { type });
    }

    if (search) {
      query.andWhere(
        "(file.originalName LIKE :search OR file.description LIKE :search OR file.tags LIKE :search)",
        { search: `%${search}%` }
      );
    }

    if (customerId) {
      query.andWhere("file.customerId = :customerId", { customerId });
    }

    // Regular users can only see public files or their own files
    if (userRole !== "ADMIN" && userRole !== "MANAGER") {
      query.andWhere(
        "(file.isPublic = :isPublic OR file.uploadedById = :userId)",
        { isPublic: true, userId }
      );
    } else if (isPublic !== undefined) {
      // Admins/Managers can filter by isPublic if specified
      query.andWhere("file.isPublic = :isPublic", {
        isPublic: isPublic === "true",
      });
    }

    // Pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    query.skip(skip).take(parseInt(limit as string));

    // Order by upload date
    query.orderBy("file.uploadedAt", "DESC");

    const [files, total] = await query.getManyAndCount();

    return res.status(200).json({
      success: true,
      data: files,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Get single file by ID
export const getFileById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileId } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!fileId) {
      return next(new ErrorHandler("File ID is required", 400));
    }

    const fileRepository = AppDataSource.getRepository(LibraryFile);
    const file = await fileRepository.findOne({
      where: { id: fileId },
      relations: ["uploadedBy", "customer"],
    });

    if (!file) {
      return next(new ErrorHandler("File not found", 404));
    }

    // Check access permissions
    if (
      userRole !== "ADMIN" &&
      userRole !== "MANAGER" &&
      !file.isPublic &&
      file.uploadedById !== userId
    ) {
      return next(new ErrorHandler("Access denied", 403));
    }

    return res.status(200).json({
      success: true,
      data: file,
    });
  } catch (error) {
    return next(error);
  }
};

// Delete file
export const deleteFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileId } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!fileId) {
      return next(new ErrorHandler("File ID is required", 400));
    }

    const fileRepository = AppDataSource.getRepository(LibraryFile);
    const file = await fileRepository.findOne({ where: { id: fileId } });

    if (!file) {
      return next(new ErrorHandler("File not found", 404));
    }

    // Check permissions: Only admin/manager or file owner can delete
    if (
      userRole !== "ADMIN" &&
      userRole !== "MANAGER" &&
      file.uploadedById !== userId
    ) {
      return next(new ErrorHandler("Access denied", 403));
    }

    // Delete from Cloudinary
    try {
      const publicId = file.url.split("/").pop()?.split(".")[0];
      if (publicId) {
        await cloudinary.uploader.destroy(`library/${publicId}`);
      }

      // Delete thumbnail if exists
      if (file.thumbnailUrl) {
        const thumbPublicId = file.thumbnailUrl.split("/").pop()?.split(".")[0];
        if (thumbPublicId) {
          await cloudinary.uploader.destroy(
            `library/thumbnails/${thumbPublicId}`
          );
        }
      }
    } catch (cloudinaryError) {
      console.error("Cloudinary deletion error:", cloudinaryError);
      // Continue with database deletion even if cloudinary fails
    }

    // Delete from database
    await fileRepository.delete(fileId);

    return res.status(200).json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

// Update file metadata
export const updateFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileId } = req.params;
    const { description, tags, isPublic } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!fileId) {
      return next(new ErrorHandler("File ID is required", 400));
    }

    const fileRepository = AppDataSource.getRepository(LibraryFile);
    const file = await fileRepository.findOne({ where: { id: fileId } });

    if (!file) {
      return next(new ErrorHandler("File not found", 404));
    }

    // Check permissions: Only admin/manager or file owner can update
    if (
      userRole !== "ADMIN" &&
      userRole !== "MANAGER" &&
      file.uploadedById !== userId
    ) {
      return next(new ErrorHandler("Access denied", 403));
    }

    // Update fields
    if (description !== undefined) file.description = description;
    if (tags !== undefined) {
      file.tags = Array.isArray(tags)
        ? tags
        : tags.split(",").map((tag: string) => tag.trim());
    }
    if (isPublic !== undefined) {
      file.isPublic = isPublic === "true" || isPublic === true;
    }

    await fileRepository.save(file);

    return res.status(200).json({
      success: true,
      message: "File updated successfully",
      data: file,
    });
  } catch (error) {
    return next(error);
  }
};

// Get file statistics
export const getFileStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const fileRepository = AppDataSource.getRepository(LibraryFile);

    const stats = await fileRepository
      .createQueryBuilder("file")
      .select("file.fileType", "type")
      .addSelect("COUNT(*)", "count")
      .addSelect("SUM(file.fileSize)", "totalSize")
      .groupBy("file.fileType")
      .getRawMany();

    const total = await fileRepository.count();
    const totalSize = await fileRepository
      .createQueryBuilder("file")
      .select("SUM(file.fileSize)", "total")
      .getRawOne();

    return res.status(200).json({
      success: true,
      data: {
        stats,
        totalFiles: total,
        totalSize: totalSize?.total || 0,
      },
    });
  } catch (error) {
    return next(error);
  }
};

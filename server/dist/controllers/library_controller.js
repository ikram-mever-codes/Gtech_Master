"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileStats = exports.updateFile = exports.deleteFile = exports.getFileById = exports.getFiles = exports.uploadFile = void 0;
const library_1 = require("../models/library");
const database_1 = require("../config/database");
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const fs_1 = __importDefault(require("fs"));
const users_1 = require("../models/users");
const customers_1 = require("../models/customers");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
// Helper function to determine file type from mime type
const getFileType = (mimeType) => {
    if (mimeType.startsWith("image/"))
        return library_1.FileType.IMAGE;
    if (mimeType === "application/pdf")
        return library_1.FileType.PDF;
    if (mimeType.includes("spreadsheet") ||
        mimeType.includes("excel") ||
        mimeType.includes("sheet"))
        return library_1.FileType.SPREADSHEET;
    if (mimeType.includes("document") ||
        mimeType.includes("word") ||
        mimeType.includes("text"))
        return library_1.FileType.DOCUMENT;
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
        return library_1.FileType.PRESENTATION;
    if (mimeType.includes("zip") || mimeType.includes("archive"))
        return library_1.FileType.ARCHIVE;
    return library_1.FileType.OTHER;
};
// Upload single file
const uploadFile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { description, tags, isPublic, customerId } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!req.file) {
            return next(new errorHandler_1.default("No file uploaded", 400));
        }
        // Validate file exists
        if (!fs_1.default.existsSync(req.file.path)) {
            return next(new errorHandler_1.default("File not found", 404));
        }
        const fileRepository = database_1.AppDataSource.getRepository(library_1.LibraryFile);
        const userRepository = database_1.AppDataSource.getRepository(users_1.User);
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        // Get user who uploaded
        let uploadedBy = null;
        if (userId) {
            uploadedBy = yield userRepository.findOne({ where: { id: userId } });
        }
        // Get customer if provided
        let customer = null;
        if (customerId) {
            customer = yield customerRepository.findOne({
                where: { id: customerId },
            });
        }
        let cloudinaryResult;
        try {
            // Upload to Cloudinary
            cloudinaryResult = yield cloudinary_1.default.uploader.upload(req.file.path, {
                folder: "library",
                resource_type: "auto",
            });
            // Generate thumbnail for images
            let thumbnailUrl = undefined;
            if (req.file.mimetype.startsWith("image/")) {
                const thumbnail = yield cloudinary_1.default.uploader.upload(req.file.path, {
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
                tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
                isPublic: isPublic === "true" || isPublic === true,
                uploadedBy,
                uploadedById: userId || null,
                customer,
                customerId: customerId || null,
            });
            yield fileRepository.save(file);
            // Delete local file after successful upload
            fs_1.default.unlinkSync(req.file.path);
            return res.status(201).json({
                success: true,
                message: "File uploaded successfully",
                data: file,
            });
        }
        catch (uploadError) {
            // Clean up local file if upload failed
            if (fs_1.default.existsSync(req.file.path)) {
                fs_1.default.unlinkSync(req.file.path);
            }
            return next(new errorHandler_1.default("Failed to upload file to cloud", 500));
        }
    }
    catch (error) {
        return next(error);
    }
});
exports.uploadFile = uploadFile;
// Get all files (with filters)
const getFiles = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { type, search, customerId, isPublic, page = 1, limit = 20, } = req.query;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        const fileRepository = database_1.AppDataSource.getRepository(library_1.LibraryFile);
        const query = fileRepository.createQueryBuilder("file");
        // Apply filters
        if (type) {
            query.andWhere("file.fileType = :type", { type });
        }
        if (search) {
            query.andWhere("(file.originalName LIKE :search OR file.description LIKE :search OR file.tags LIKE :search)", { search: `%${search}%` });
        }
        if (customerId) {
            query.andWhere("file.customerId = :customerId", { customerId });
        }
        // Regular users can only see public files or their own files
        if (userRole !== "ADMIN" && userRole !== "MANAGER") {
            query.andWhere("(file.isPublic = :isPublic OR file.uploadedById = :userId)", { isPublic: true, userId });
        }
        else if (isPublic !== undefined) {
            // Admins/Managers can filter by isPublic if specified
            query.andWhere("file.isPublic = :isPublic", {
                isPublic: isPublic === "true",
            });
        }
        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        query.skip(skip).take(parseInt(limit));
        // Order by upload date
        query.orderBy("file.uploadedAt", "DESC");
        const [files, total] = yield query.getManyAndCount();
        return res.status(200).json({
            success: true,
            data: files,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getFiles = getFiles;
// Get single file by ID
const getFileById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { fileId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        if (!fileId) {
            return next(new errorHandler_1.default("File ID is required", 400));
        }
        const fileRepository = database_1.AppDataSource.getRepository(library_1.LibraryFile);
        const file = yield fileRepository.findOne({
            where: { id: fileId },
            relations: ["uploadedBy", "customer"],
        });
        if (!file) {
            return next(new errorHandler_1.default("File not found", 404));
        }
        // Check access permissions
        if (userRole !== "ADMIN" &&
            userRole !== "MANAGER" &&
            !file.isPublic &&
            file.uploadedById !== userId) {
            return next(new errorHandler_1.default("Access denied", 403));
        }
        return res.status(200).json({
            success: true,
            data: file,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getFileById = getFileById;
// Delete file
const deleteFile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { fileId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        if (!fileId) {
            return next(new errorHandler_1.default("File ID is required", 400));
        }
        const fileRepository = database_1.AppDataSource.getRepository(library_1.LibraryFile);
        const file = yield fileRepository.findOne({ where: { id: fileId } });
        if (!file) {
            return next(new errorHandler_1.default("File not found", 404));
        }
        // Check permissions: Only admin/manager or file owner can delete
        if (userRole !== "ADMIN" &&
            userRole !== "MANAGER" &&
            file.uploadedById !== userId) {
            return next(new errorHandler_1.default("Access denied", 403));
        }
        // Delete from Cloudinary
        try {
            const publicId = (_c = file.url.split("/").pop()) === null || _c === void 0 ? void 0 : _c.split(".")[0];
            if (publicId) {
                yield cloudinary_1.default.uploader.destroy(`library/${publicId}`);
            }
            // Delete thumbnail if exists
            if (file.thumbnailUrl) {
                const thumbPublicId = (_d = file.thumbnailUrl.split("/").pop()) === null || _d === void 0 ? void 0 : _d.split(".")[0];
                if (thumbPublicId) {
                    yield cloudinary_1.default.uploader.destroy(`library/thumbnails/${thumbPublicId}`);
                }
            }
        }
        catch (cloudinaryError) {
            console.error("Cloudinary deletion error:", cloudinaryError);
            // Continue with database deletion even if cloudinary fails
        }
        // Delete from database
        yield fileRepository.delete(fileId);
        return res.status(200).json({
            success: true,
            message: "File deleted successfully",
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.deleteFile = deleteFile;
// Update file metadata
const updateFile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { fileId } = req.params;
        const { description, tags, isPublic } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        if (!fileId) {
            return next(new errorHandler_1.default("File ID is required", 400));
        }
        const fileRepository = database_1.AppDataSource.getRepository(library_1.LibraryFile);
        const file = yield fileRepository.findOne({ where: { id: fileId } });
        if (!file) {
            return next(new errorHandler_1.default("File not found", 404));
        }
        // Check permissions: Only admin/manager or file owner can update
        if (userRole !== "ADMIN" &&
            userRole !== "MANAGER" &&
            file.uploadedById !== userId) {
            return next(new errorHandler_1.default("Access denied", 403));
        }
        // Update fields
        if (description !== undefined)
            file.description = description;
        if (tags !== undefined) {
            file.tags = Array.isArray(tags)
                ? tags
                : tags.split(",").map((tag) => tag.trim());
        }
        if (isPublic !== undefined) {
            file.isPublic = isPublic === "true" || isPublic === true;
        }
        yield fileRepository.save(file);
        return res.status(200).json({
            success: true,
            message: "File updated successfully",
            data: file,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.updateFile = updateFile;
// Get file statistics
const getFileStats = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fileRepository = database_1.AppDataSource.getRepository(library_1.LibraryFile);
        const stats = yield fileRepository
            .createQueryBuilder("file")
            .select("file.fileType", "type")
            .addSelect("COUNT(*)", "count")
            .addSelect("SUM(file.fileSize)", "totalSize")
            .groupBy("file.fileType")
            .getRawMany();
        const total = yield fileRepository.count();
        const totalSize = yield fileRepository
            .createQueryBuilder("file")
            .select("SUM(file.fileSize)", "total")
            .getRawOne();
        return res.status(200).json({
            success: true,
            data: {
                stats,
                totalFiles: total,
                totalSize: (totalSize === null || totalSize === void 0 ? void 0 : totalSize.total) || 0,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getFileStats = getFileStats;

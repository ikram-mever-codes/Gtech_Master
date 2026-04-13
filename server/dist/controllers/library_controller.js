"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const cloudinary_1 = __importStar(require("../config/cloudinary"));
const fs_1 = __importDefault(require("fs"));
const users_1 = require("../models/users");
const customers_1 = require("../models/customers");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
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
const uploadFile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { description, tags, isPublic, customerId, itemId } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!req.file) {
            return next(new errorHandler_1.default("No file uploaded", 400));
        }
        if (!fs_1.default.existsSync(req.file.path)) {
            return next(new errorHandler_1.default("File not found", 404));
        }
        const fileRepository = database_1.AppDataSource.getRepository(library_1.LibraryFile);
        const userRepository = database_1.AppDataSource.getRepository(users_1.User);
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        let uploadedBy = null;
        if (userId) {
            uploadedBy = yield userRepository.findOne({ where: { id: userId } });
        }
        let customer = null;
        if (customerId) {
            customer = yield customerRepository.findOne({
                where: { id: customerId },
            });
        }
        let cloudinaryResult;
        try {
            const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME &&
                process.env.CLOUDINARY_API_KEY &&
                process.env.CLOUDINARY_API_SECRET;
            let fileUrl = "";
            let thumbnailUrl = undefined;
            if (isCloudinaryConfigured) {
                const isDocument = !req.file.mimetype.startsWith("image/") && !req.file.mimetype.startsWith("video/");
                cloudinaryResult = yield cloudinary_1.default.uploader.upload(req.file.path, {
                    folder: "library",
                    resource_type: isDocument ? "raw" : "auto",
                });
                fileUrl = cloudinaryResult.secure_url;
                if (req.file.mimetype.startsWith("image/")) {
                    const thumbnail = yield cloudinary_1.default.uploader.upload(req.file.path, {
                        folder: "library/thumbnails",
                        width: 300,
                        height: 200,
                        crop: "fill",
                    });
                    thumbnailUrl = thumbnail.secure_url;
                }
            }
            else {
                const protocol = req.protocol;
                const host = req.get("host");
                fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
                if (req.file.mimetype.startsWith("image/")) {
                    thumbnailUrl = fileUrl;
                }
            }
            const file = fileRepository.create({
                filename: req.file.filename || "",
                originalName: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
                fileType: getFileType(req.file.mimetype),
                url: fileUrl,
                thumbnailUrl,
                description: description || null,
                tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
                isPublic: isPublic === "true" || isPublic === true,
                uploadedBy,
                uploadedById: userId || null,
                customer,
                customerId: customerId || null,
                itemId: itemId ? parseInt(itemId) : null,
            });
            yield fileRepository.save(file);
            if (isCloudinaryConfigured) {
                fs_1.default.unlinkSync(req.file.path);
            }
            return res.status(201).json({
                success: true,
                message: "File uploaded successfully",
                data: Object.assign(Object.assign({}, file), { url: (0, cloudinary_1.signCloudinaryPdfUrl)(file.url) }),
            });
        }
        catch (uploadError) {
            console.error("Upload error details:", uploadError);
            if (fs_1.default.existsSync(req.file.path)) {
                fs_1.default.unlinkSync(req.file.path);
            }
            return next(new errorHandler_1.default(`Failed to upload file: ${uploadError.message}`, 500));
        }
    }
    catch (error) {
        return next(error);
    }
});
exports.uploadFile = uploadFile;
const getFiles = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { type, search, customerId, itemId, isPublic, page = 1, limit = 20, } = req.query;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        const fileRepository = database_1.AppDataSource.getRepository(library_1.LibraryFile);
        const query = fileRepository.createQueryBuilder("file");
        if (type) {
            query.andWhere("file.fileType = :type", { type });
        }
        if (search) {
            query.andWhere("(file.originalName LIKE :search OR file.description LIKE :search OR file.tags LIKE :search)", { search: `%${search}%` });
        }
        if (customerId) {
            query.andWhere("file.customerId = :customerId", { customerId });
        }
        if (itemId) {
            query.andWhere("file.itemId = :itemId", { itemId });
        }
        if (userRole !== "ADMIN" && userRole !== "MANAGER") {
            query.andWhere("(file.isPublic = :isPublic OR file.uploadedById = :userId)", { isPublic: true, userId });
        }
        else if (isPublic !== undefined) {
            query.andWhere("file.isPublic = :isPublic", {
                isPublic: isPublic === "true",
            });
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        query.skip(skip).take(parseInt(limit));
        query.orderBy("file.uploadedAt", "DESC");
        const [files, total] = yield query.getManyAndCount();
        return res.status(200).json({
            success: true,
            data: files.map(file => (Object.assign(Object.assign({}, file), { url: (0, cloudinary_1.signCloudinaryPdfUrl)(file.url) }))),
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
        if (userRole !== "ADMIN" &&
            userRole !== "MANAGER" &&
            !file.isPublic &&
            file.uploadedById !== userId) {
            return next(new errorHandler_1.default("Access denied", 403));
        }
        return res.status(200).json({
            success: true,
            data: Object.assign(Object.assign({}, file), { url: (0, cloudinary_1.signCloudinaryPdfUrl)(file.url) }),
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getFileById = getFileById;
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
        if (userRole !== "ADMIN" &&
            userRole !== "MANAGER" &&
            file.uploadedById !== userId) {
            return next(new errorHandler_1.default("Access denied", 403));
        }
        try {
            const isRaw = file.url.includes("/raw/upload/");
            if (isRaw) {
                const splitUrl = file.url.split("/library/");
                if (splitUrl.length > 1) {
                    const publicIdWithExt = splitUrl[1];
                    yield cloudinary_1.default.uploader.destroy(`library/${publicIdWithExt}`, { resource_type: "raw" });
                }
            }
            else {
                const publicId = (_c = file.url.split("/").pop()) === null || _c === void 0 ? void 0 : _c.split(".")[0];
                if (publicId) {
                    yield cloudinary_1.default.uploader.destroy(`library/${publicId}`);
                }
            }
            if (file.thumbnailUrl) {
                const thumbPublicId = (_d = file.thumbnailUrl.split("/").pop()) === null || _d === void 0 ? void 0 : _d.split(".")[0];
                if (thumbPublicId) {
                    yield cloudinary_1.default.uploader.destroy(`library/thumbnails/${thumbPublicId}`);
                }
            }
        }
        catch (cloudinaryError) {
            console.error("Cloudinary deletion error:", cloudinaryError);
        }
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
        if (userRole !== "ADMIN" &&
            userRole !== "MANAGER" &&
            file.uploadedById !== userId) {
            return next(new errorHandler_1.default("Access denied", 403));
        }
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

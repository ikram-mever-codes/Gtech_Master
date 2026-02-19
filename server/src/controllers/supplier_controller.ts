
import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Supplier } from "../models/suppliers";
import { SupplierItem } from "../models/supplier_items";
import { Like, ILike } from "typeorm";

export const getAllSuppliers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const supplierRepo = AppDataSource.getRepository(Supplier);

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 30;
        const search = req.query.search as string || "";
        const skip = (page - 1) * limit;

        let whereClause: any = {};

        if (search) {
            whereClause = [
                { name: Like(`%${search}%`) },
                { name_cn: Like(`%${search}%`) },
                { company_name: Like(`%${search}%`) },
                { email: Like(`%${search}%`) },
                { contact_person: Like(`%${search}%`) },
                { city: Like(`%${search}%`) },
                { province: Like(`%${search}%`) },
            ];
        }

        const [suppliers, totalRecords] = await supplierRepo.findAndCount({
            where: whereClause,
            order: { id: "DESC" },
            skip,
            take: limit,
        });

        const totalPages = Math.ceil(totalRecords / limit);

        res.status(200).json({
            success: true,
            data: suppliers,
            pagination: {
                page,
                limit,
                totalRecords,
                totalPages,
            },
        });
        return;
    } catch (error) {
        return next(error);
    }
};

export const getSupplierById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const supplierRepo = AppDataSource.getRepository(Supplier);

        const supplier = await supplierRepo.findOne({
            where: { id: Number(id) },
        });

        if (!supplier) {
            res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: supplier,
        });
        return;
    } catch (error) {
        return next(error);
    }
};

export const createSupplier = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const supplierRepo = AppDataSource.getRepository(Supplier);

        const { id, created_at, updated_at, supplierItems, parents, supplier: _supplier, ...supplierData } = req.body;

        const newSupplier = supplierRepo.create(supplierData);
        const savedSupplier = await supplierRepo.save(newSupplier);

        res.status(201).json({
            success: true,
            message: "Supplier created successfully",
            data: savedSupplier,
        });
        return;
    } catch (error) {
        return next(error);
    }
};

export const updateSupplier = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const supplierRepo = AppDataSource.getRepository(Supplier);

        const supplier = await supplierRepo.findOne({
            where: { id: Number(id) },
        });

        if (!supplier) {
            res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
            return;
        }

        const { id: _id, created_at, updated_at, supplierItems, parents, supplier: _supplier, ...updateData } = req.body;

        supplierRepo.merge(supplier, updateData);
        const updatedSupplier = await supplierRepo.save(supplier);

        res.status(200).json({
            success: true,
            message: "Supplier updated successfully",
            data: updatedSupplier,
        });
        return;
    } catch (error) {
        return next(error);
    }
};

export const deleteSupplier = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const supplierRepo = AppDataSource.getRepository(Supplier);

        const supplier = await supplierRepo.findOne({
            where: { id: Number(id) },
        });

        if (!supplier) {
            res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
            return;
        }

        await supplierRepo.remove(supplier);

        res.status(200).json({
            success: true,
            message: "Supplier deleted successfully",
        });
        return;
    } catch (error) {
        return next(error);
    }
};

export const getSupplierItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const supplierItemRepo = AppDataSource.getRepository(SupplierItem);

        const supplierItems = await supplierItemRepo.find({
            where: { supplier_id: Number(id) },
            relations: ["item"]
        });

        const items = supplierItems
            .filter((si) => si.item)
            .map((si) => si.item);

        res.status(200).json({
            success: true,
            data: items,
        });
        return;
    } catch (error) {
        return next(error);
    }
};


import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Supplier } from "../models/suppliers";
import { SupplierItem } from "../models/supplier_items";
import { Like, ILike } from "typeorm";
import { Item } from "../models/items";

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
        const supplierId = Number(id);

        const supplierItemRepo = AppDataSource.getRepository(SupplierItem);
        const itemRepo = AppDataSource.getRepository(Item);

        // Fetch items from the junction table
        const supplierItems = await supplierItemRepo.find({
            where: { supplier_id: supplierId },
            relations: ["item"]
        });

        // Fetch items from the main Item table where supplier_id matches
        const itemsFromMainTable = await itemRepo.find({
            where: { supplier_id: supplierId }
        });

        // Use a Map to deduplicate items by their ID
        const itemMap = new Map<number, any>();

        // Add items from the junction table
        supplierItems.forEach(si => {
            if (si.item) {
                itemMap.set(si.item.id, si.item);
            }
        });

        // Add items from the main Item table (overwriting if already present)
        itemsFromMainTable.forEach(item => {
            itemMap.set(item.id, item);
        });

        const items = Array.from(itemMap.values());

        res.status(200).json({
            success: true,
            data: items,
        });
        return;
    } catch (error) {
        return next(error);
    }
};

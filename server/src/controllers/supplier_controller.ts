
import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Supplier } from "../models/suppliers";
import { SupplierItem } from "../models/supplier_items";

export const getAllSuppliers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const supplierRepo = AppDataSource.getRepository(Supplier);
        const suppliers = await supplierRepo.find({
            order: { name: "ASC" }
        });

        res.status(200).json({
            success: true,
            data: suppliers,
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

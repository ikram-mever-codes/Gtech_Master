
import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Supplier } from "../models/suppliers";
import { SupplierItem } from "../models/supplier_items";
import { Like, ILike, Brackets } from "typeorm";
import { Item } from "../models/items";

export const getAllSuppliers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const supplierRepo = AppDataSource.getRepository(Supplier);

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 30;
        const search = req.query.search as string || "";
        const tags = req.query.tags as string || "";
        const skip = (page - 1) * limit;

        const queryBuilder = supplierRepo.createQueryBuilder("supplier")
            .leftJoinAndSelect("supplier.tags", "tags");

        if (search) {
            const searchStr = `%${search}%`;
            queryBuilder.andWhere(
                new Brackets((qb) => {
                    qb.where("supplier.name ILIKE :search", { search: searchStr })
                      .orWhere("supplier.name_cn ILIKE :search", { search: searchStr })
                      .orWhere("supplier.company_name ILIKE :search", { search: searchStr })
                      .orWhere("supplier.email ILIKE :search", { search: searchStr })
                      .orWhere("supplier.contact_person ILIKE :search", { search: searchStr })
                      .orWhere("supplier.city ILIKE :search", { search: searchStr })
                      .orWhere("supplier.province ILIKE :search", { search: searchStr });
                })
            );
        }

        if (tags) {
            const tagIds = tags.split(",");
            const includeTagIds = tagIds.filter((id) => !id.startsWith("!")).map((id) => id.trim());
            const excludeTagIds = tagIds.filter((id) => id.startsWith("!")).map((id) => id.substring(1).trim());

            if (includeTagIds.length > 0) {
                queryBuilder.andWhere((qb) => {
                    const subQuery = qb
                        .subQuery()
                        .select("s.id")
                        .from(Supplier, "s")
                        .innerJoin("s.tags", "t")
                        .where("t.id IN (:...supplierIncludeTagIds)")
                        .groupBy("s.id")
                        .having("COUNT(t.id) = :supplierIncludeCount");
                    return `supplier.id IN ${subQuery.getQuery()}`;
                });
                queryBuilder.setParameter("supplierIncludeTagIds", includeTagIds);
                queryBuilder.setParameter("supplierIncludeCount", includeTagIds.length);
            }

            if (excludeTagIds.length > 0) {
                queryBuilder.andWhere((qb) => {
                    const subQuery = qb
                        .subQuery()
                        .select("s.id")
                        .from(Supplier, "s")
                        .innerJoin("s.tags", "t")
                        .where("t.id IN (:...supplierExcludeTagIds)");
                    return `supplier.id NOT IN ${subQuery.getQuery()}`;
                });
                queryBuilder.setParameter("supplierExcludeTagIds", excludeTagIds);
            }
        }

        queryBuilder.orderBy("supplier.id", "DESC")
            .skip(skip)
            .take(limit);

        const [suppliers, totalRecords] = await Promise.all([
            queryBuilder.getMany(),
            queryBuilder.getCount()
        ]);

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
            relations: ["tags"],
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

        const { id, created_at, updated_at, supplierItems, parents, supplier: _supplier, tags, ...supplierData } = req.body;

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
            relations: ["tags"],
        });

        if (!supplier) {
            res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
            return;
        }
        const { id: _id, created_at, updated_at, supplierItems, parents, supplier: _supplier, tags, ...updateData } = req.body;
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
        const supplierItems = await supplierItemRepo.find({
            where: { supplier_id: supplierId },
            relations: ["item"]
        });
        const itemsFromMainTable = await itemRepo.find({
            where: { supplier_id: supplierId }
        });
        const itemMap = new Map<number, any>();
        supplierItems.forEach(si => {
            if (si.item) {
                itemMap.set(si.item.id, si.item);
            }
        });
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

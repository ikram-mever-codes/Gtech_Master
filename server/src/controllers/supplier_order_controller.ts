import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/errorHandler";
import { AppDataSource } from "../config/database";
import { SupplierOrder } from "../models/supplier_orders";
import { OrderItem } from "../models/order_items";
import { Supplier } from "../models/suppliers";
import { In } from "typeorm";

export const createSupplierOrder = async (req: Request, res: Response, next: NextFunction) => {
    const queryRunner = AppDataSource.createQueryRunner();

    try {
        await queryRunner.connect();
        await queryRunner.startTransaction();

        const { supplier_id, order_type_id, item_ids, remark, ref_no } = req.body;

        if (!Array.isArray(item_ids) || item_ids.length === 0) {
            throw new ErrorHandler("item_ids[] is required", 400);
        }

        const supplierOrderRepo = queryRunner.manager.getRepository(SupplierOrder);
        const orderItemsRepo = queryRunner.manager.getRepository(OrderItem);

        const supplierOrder = supplierOrderRepo.create({
            supplier_id: supplier_id || null,
            order_type_id: order_type_id || null,
            remark: remark || null,
            ref_no: ref_no || null,
            paid: "N",
            send2cargo: "N",
            is_po_created: 0,
            created_at: new Date(),
            updated_at: new Date(),
        });

        await supplierOrderRepo.save(supplierOrder);

        await orderItemsRepo.update(
            { id: In(item_ids.map(Number)) },
            { supplier_order_id: supplierOrder.id, status: "SO" }
        );

        await queryRunner.commitTransaction();

        return res.status(201).json({
            success: true,
            message: "Supplier order created successfully",
            data: supplierOrder,
        });
    } catch (error) {
        try {
            await queryRunner.rollbackTransaction();
        } catch { }
        return next(error);
    } finally {
        try {
            await queryRunner.release();
        } catch { }
    }
};

export const getAllSupplierOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const repo = AppDataSource.getRepository(SupplierOrder);
        const { search = "" } = req.query as any;

        const qb = repo
            .createQueryBuilder("so")
            .leftJoinAndSelect("so.supplier", "s")
            .leftJoinAndSelect("so.order_type", "cat")
            .leftJoinAndSelect("so.items", "items")
            .orderBy("so.id", "DESC");

        if (search) {
            qb.andWhere("(so.ref_no LIKE :q OR so.remark LIKE :q OR s.company_name LIKE :q)", { q: `%${search}%` });
        }

        const data = await qb.getMany();

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        return next(error);
    }
};

export const getSupplierOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const repo = AppDataSource.getRepository(SupplierOrder);

        const data = await repo.findOne({
            where: { id: Number(id) },
            relations: ["supplier", "order_type", "items", "items.item"],
        });

        if (!data) throw new ErrorHandler("Supplier order not found", 404);

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        return next(error);
    }
};

export const updateSupplierOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const repo = AppDataSource.getRepository(SupplierOrder);

        let so = await repo.findOneBy({ id: Number(id) });
        if (!so) throw new ErrorHandler("Supplier order not found", 404);

        const { supplier_id, order_type_id, ref_no, paid, remark, send2cargo, is_po_created } = req.body;

        if (supplier_id !== undefined) so.supplier_id = supplier_id;
        if (order_type_id !== undefined) so.order_type_id = order_type_id;
        if (ref_no !== undefined) so.ref_no = ref_no;
        if (paid !== undefined) so.paid = paid;
        if (remark !== undefined) so.remark = remark;
        if (send2cargo !== undefined) so.send2cargo = send2cargo;
        if (is_po_created !== undefined) so.is_po_created = is_po_created;

        await repo.save(so);

        return res.status(200).json({
            success: true,
            data: so,
        });
    } catch (error) {
        return next(error);
    }
};

export const deleteSupplierOrder = async (req: Request, res: Response, next: NextFunction) => {
    const queryRunner = AppDataSource.createQueryRunner();
    try {
        await queryRunner.connect();
        await queryRunner.startTransaction();

        const { id } = req.params;
        const repo = queryRunner.manager.getRepository(SupplierOrder);
        const itemRepo = queryRunner.manager.getRepository(OrderItem);

        const so = await repo.findOneBy({ id: Number(id) });
        if (!so) throw new ErrorHandler("Supplier order not found", 404);
        await itemRepo.update({ supplier_order_id: so.id }, { supplier_order_id: undefined });

        await repo.delete(id);

        await queryRunner.commitTransaction();

        return res.status(200).json({
            success: true,
            message: "Supplier order deleted",
        });
    } catch (error) {
        try { await queryRunner.rollbackTransaction(); } catch { }
        return next(error);
    } finally {
        try { await queryRunner.release(); } catch { }
    }
};

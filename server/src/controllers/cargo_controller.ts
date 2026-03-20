import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Cargo } from "../models/cargos";
import { CargoOrder } from "../models/cargo_orders";
import { Order } from "../models/orders";
import { OrderItem } from "../models/order_items";
import { Invoice, InvoiceItem } from "../models/invoice";
import { Customer } from "../models/customers";
import { Like, IsNull, In } from "typeorm";

export const generateInvoicesForOrders = async (orderIds: number[], cargoIds: number[] = []) => {
    try {
        const orderRepo = AppDataSource.getRepository(Order);
        const orderItemRepo = AppDataSource.getRepository(OrderItem);
        const invoiceRepo = AppDataSource.getRepository(Invoice);
        const invoiceItemRepo = AppDataSource.getRepository(InvoiceItem);
        const customerRepo = AppDataSource.getRepository(Customer);
        const cargoRepo = AppDataSource.getRepository(Cargo);

        const cargoNumbers = new Set<string>();
        const orderNumbers = new Set<string>();

        if (cargoIds.length > 0) {
            const cargos = await cargoRepo.find({ where: { id: In(cargoIds) } });
            cargos.forEach(c => c.cargo_no && cargoNumbers.add(c.cargo_no));
        }

        if (orderIds.length > 0) {
            const orders = await orderRepo.find({
                where: { id: In(orderIds) },
                relations: ["orderItems", "orderItems.cargo"]
            });
            for (const order of orders) {
                orderNumbers.add(order.order_no);
                if (order.orderItems) {
                    for (const oi of order.orderItems) {
                        if (oi.cargo_id && oi.cargo?.cargo_no) {
                            cargoNumbers.add(oi.cargo.cargo_no);
                        }
                    }
                }
            }
        }

        for (const cargoNo of Array.from(cargoNumbers)) {
            const cargo = await cargoRepo.findOne({ where: { cargo_no: cargoNo }, relations: ["customer"] });
            if (!cargo) continue;

            const items = await orderItemRepo.find({
                where: { cargo_id: cargo.id },
                relations: ["item", "item.taric", "order"]
            });

            await syncInvoiceRecord(cargoNo, items, cargo.customer || null, invoiceRepo, invoiceItemRepo, customerRepo);
        }

        for (const orderNo of Array.from(orderNumbers)) {
            const items = await orderItemRepo.find({
                where: {
                    order: { order_no: orderNo },
                    cargo_id: IsNull()
                },
                relations: ["item", "item.taric", "order"]
            });

            const order = await orderRepo.findOne({ where: { order_no: orderNo }, relations: ["customer"] });
            if (!order) continue;

            await syncInvoiceRecord(orderNo, items, order.customer || null, invoiceRepo, invoiceItemRepo, customerRepo);
        }

    } catch (e) {
        console.error("Failed to sync invoices", e);
    }
};

const syncInvoiceRecord = async (
    orderNumber: string,
    items: OrderItem[],
    customer: Customer | null,
    invoiceRepo: any,
    invoiceItemRepo: any,
    customerRepo: any
) => {
    let invoice = await invoiceRepo.findOne({ where: { orderNumber }, relations: ["items"] });

    if (!invoice && items.length === 0) return;

    if (invoice) {
        await invoiceItemRepo.delete({ invoice: { id: invoice.id } });
    } else {
        invoice = invoiceRepo.create({
            invoiceNumber: `INV-${orderNumber.startsWith("MA") ? orderNumber : "C-" + orderNumber}-${Date.now().toString().slice(-4)}`,
            orderNumber: orderNumber,
            invoiceDate: new Date(),
            deliveryDate: new Date(),
            status: "draft",
            customer,
            netTotal: 0,
            taxAmount: 0,
            grossTotal: 0,
            paidAmount: 0,
            outstandingAmount: 0,
            paymentMethod: "Bank Transfer",
            shippingMethod: "Cargo",
        });
        await invoiceRepo.save(invoice);
    }

    let netTotal = 0;
    let taxAmount = 0;
    let grossTotal = 0;
    const invoiceItems: InvoiceItem[] = [];

    for (const oi of items) {
        const quantity = oi.qty || 1;
        const unitPrice = oi.price || oi.rmb_special_price || 0;
        const netPrice = quantity * unitPrice;
        const itemTaxRate = oi.item?.taric?.duty_rate ? Number(oi.item.taric.duty_rate) : 19;
        const itemTax = (netPrice * itemTaxRate) / 100;
        const total = netPrice + itemTax;

        netTotal += netPrice;
        taxAmount += itemTax;
        grossTotal += total;

        invoiceItems.push(invoiceItemRepo.create({
            quantity,
            articleNumber: oi.item?.ean?.toString() || oi.item?.model || "Unknown",
            description: oi.item?.item_name || "Unknown Item",
            unitPrice,
            netPrice,
            taxRate: itemTaxRate,
            taxAmount: itemTax,
            grossPrice: total,
            invoice,
        }));
    }

    if (invoiceItems.length > 0) {
        await invoiceItemRepo.save(invoiceItems);
    }

    invoice.netTotal = netTotal;
    invoice.taxAmount = taxAmount;
    invoice.grossTotal = grossTotal;
    invoice.outstandingAmount = Math.max(0, grossTotal - (invoice.paidAmount || 0));
    invoice.updatedAt = new Date();
    if (customer) invoice.customer = customer;

    await invoiceRepo.save(invoice);
};

export const getAllCargos = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cargoRepo = AppDataSource.getRepository(Cargo);
        const { page = 1, limit = 50, search = "", unassignedOnly = "false" } = req.query as any;

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.max(1, Math.min(100, Number(limit)));
        const skip = (pageNum - 1) * limitNum;

        const qb = cargoRepo.createQueryBuilder("cargo");

        if (search) {
            qb.where("(cargo.cargo_no LIKE :search OR cargo.note LIKE :search OR cargo.remark LIKE :search OR cargo.cargo_status LIKE :search)", { search: `%${search}%` });
        }

        if (unassignedOnly === "true") {
            qb.andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select("o.cargo_id")
                    .from(Order, "o")
                    .where("o.cargo_id IS NOT NULL")
                    .getQuery();
                return "cargo.id NOT IN " + subQuery;
            });

            // Also check CargoOrder table just in case
            qb.andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select("co.cargo_id")
                    .from(CargoOrder, "co")
                    .where("co.cargo_id IS NOT NULL")
                    .getQuery();
                return "cargo.id NOT IN " + subQuery;
            });
        }

        const [cargos, total] = await qb
            .orderBy("cargo.id", "DESC")
            .skip(skip)
            .take(limitNum)
            .getManyAndCount();

        res.status(200).json({
            success: true,
            data: cargos,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalRecords: total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
        return;
    } catch (error) {
        return next(error);
    }
};

export const getCargoById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const cargoRepo = AppDataSource.getRepository(Cargo);

        const cargo = await cargoRepo.findOne({ where: { id: Number(id) } });

        if (!cargo) {
            res.status(404).json({ success: false, message: "Cargo not found" });
            return;
        }

        const cargoOrderRepo = AppDataSource.getRepository(CargoOrder);
        const cargoOrders = await cargoOrderRepo.find({
            where: { cargo_id: cargo.id },
            relations: ["order"],
        });

        const orderIds = cargoOrders.map((co) => co.order_id);

        let orderItems: any[] = [];
        if (orderIds.length > 0) {
            const orderItemRepo = AppDataSource.getRepository(OrderItem);
            orderItems = await orderItemRepo
                .createQueryBuilder("oi")
                .leftJoinAndSelect("oi.item", "item")
                .where("oi.order_id IN (:...orderIds)", { orderIds })
                .getMany();
        }

        res.status(200).json({
            success: true,
            data: {
                ...cargo,
                orders: cargoOrders.map((co) => co.order),
                orderItems,
            },
        });
        return;
    } catch (error) {
        return next(error);
    }
};

export const createCargo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cargoRepo = AppDataSource.getRepository(Cargo);

        const { id, created_at, updated_at, orders, orderItems, ...cargoData } = req.body;

        const cargo = cargoRepo.create(cargoData as Partial<Cargo>);
        const savedCargo = await cargoRepo.save(cargo);

        if (Array.isArray(orders) && orders.length > 0) {
            const cargoOrderRepo = AppDataSource.getRepository(CargoOrder);
            const cargoOrderEntries = orders.map((orderId: number) =>
                cargoOrderRepo.create({
                    cargo_id: savedCargo.id,
                    order_id: orderId,
                })
            );
            await cargoOrderRepo.save(cargoOrderEntries);
            await generateInvoicesForOrders(orders);
        }

        res.status(201).json({
            success: true,
            message: "Cargo created successfully",
            data: savedCargo,
        });
        return;
    } catch (error) {
        return next(error);
    }
};

export const updateCargo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const cargoRepo = AppDataSource.getRepository(Cargo);

        const cargo = await cargoRepo.findOne({ where: { id: Number(id) } });
        if (!cargo) {
            res.status(404).json({ success: false, message: "Cargo not found" });
            return;
        }

        const { id: _id, created_at, updated_at, orders, orderItems, ...updateData } = req.body;

        cargoRepo.merge(cargo, updateData);
        const updatedCargo = await cargoRepo.save(cargo);

        if (Array.isArray(orders)) {
            const cargoOrderRepo = AppDataSource.getRepository(CargoOrder);

            await cargoOrderRepo
                .createQueryBuilder()
                .delete()
                .from(CargoOrder)
                .where("cargo_id = :cargoId", { cargoId: cargo.id })
                .execute();

            if (orders.length > 0) {
                const cargoOrderEntries = orders.map((orderId: number) =>
                    cargoOrderRepo.create({
                        cargo_id: cargo.id,
                        order_id: orderId,
                    })
                );
                await cargoOrderRepo.save(cargoOrderEntries);
                await generateInvoicesForOrders(orders);
            }
        }

        res.status(200).json({
            success: true,
            message: "Cargo updated successfully",
            data: updatedCargo,
        });
        return;
    } catch (error) {
        return next(error);
    }
};

export const deleteCargo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const cargoRepo = AppDataSource.getRepository(Cargo);
        const cargoOrderRepo = AppDataSource.getRepository(CargoOrder);

        const cargo = await cargoRepo.findOne({ where: { id: Number(id) } });
        if (!cargo) {
            res.status(404).json({ success: false, message: "Cargo not found" });
            return;
        }

        await cargoOrderRepo
            .createQueryBuilder()
            .delete()
            .from(CargoOrder)
            .where("cargo_id = :cargoId", { cargoId: cargo.id })
            .execute();

        await cargoRepo.delete(cargo.id);

        res.status(200).json({
            success: true,
            message: "Cargo deleted successfully",
        });
        return;
    } catch (error) {
        return next(error);
    }
};

export const assignOrdersToCargo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { orderIds } = req.body;

        const validOrderIds = (orderIds as any[]).filter(id => Boolean(id) && !isNaN(Number(id))).map(id => Number(id));
        if (validOrderIds.length === 0) {
            res.status(400).json({ success: false, message: "No valid orderIds provided" });
            return;
        }

        const cargoRepo = AppDataSource.getRepository(Cargo);
        const cargo = await cargoRepo.findOne({ where: { id: Number(id) } });
        if (!cargo) {
            res.status(404).json({ success: false, message: "Cargo not found" });
            return;
        }

        const cargoOrderRepo = AppDataSource.getRepository(CargoOrder);

        const existing = await cargoOrderRepo.find({ where: { cargo_id: cargo.id } });
        const existingIds = new Set(existing.map((e) => e.order_id));

        const newEntries = orderIds
            .filter((oid: number) => !existingIds.has(oid))
            .map((oid: number) =>
                cargoOrderRepo.create({
                    cargo_id: cargo.id,
                    order_id: oid,
                })
            );

        if (newEntries.length > 0) {
            await cargoOrderRepo.save(newEntries);
        }

        const orderItemRepo = AppDataSource.getRepository(OrderItem);
        const orderRepo = AppDataSource.getRepository(Order);

        if (validOrderIds.length > 0) {
            await orderItemRepo
                .createQueryBuilder()
                .update(OrderItem)
                .set({ cargo_id: cargo.id })
                .where("order_id IN (:...validOrderIds)", { validOrderIds })
                .execute();

            await orderRepo
                .createQueryBuilder()
                .update(Order)
                .set({ cargo_id: cargo.id })
                .where("id IN (:...validOrderIds)", { validOrderIds })
                .execute();
        }

        await generateInvoicesForOrders(validOrderIds);

        res.status(200).json({
            success: true,
            message: `Assigned ${newEntries.length} order(s) to cargo`,
        });
        return;
    } catch (error: any) {
        return next(error);
    }
};

export const removeOrderFromCargo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id, orderId } = req.params;
        const cargoOrderRepo = AppDataSource.getRepository(CargoOrder);

        await cargoOrderRepo
            .createQueryBuilder()
            .delete()
            .from(CargoOrder)
            .where("cargo_id = :cargoId AND order_id = :orderId", {
                cargoId: Number(id),
                orderId: Number(orderId),
            })
            .execute();

        res.status(200).json({
            success: true,
            message: "Order removed from cargo",
        });
        return;
    } catch (error) {
        return next(error);
    }
};

export const getCargoOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const cargoOrderRepo = AppDataSource.getRepository(CargoOrder);

        const cargoOrders = await cargoOrderRepo.find({
            where: { cargo_id: Number(id) },
            relations: ["order"],
        });

        const orderIds = cargoOrders.map((co) => co.order_id);
        let orderItems: any[] = [];
        if (orderIds.length > 0) {
            const orderItemRepo = AppDataSource.getRepository(OrderItem);
            orderItems = await orderItemRepo
                .createQueryBuilder("oi")
                .leftJoinAndSelect("oi.item", "item")
                .where("oi.order_id IN (:...orderIds)", { orderIds })
                .getMany();
        }

        res.status(200).json({
            success: true,
            data: {
                orders: cargoOrders.map((co) => co.order),
                orderItems,
            },
        });
        return;
    } catch (error) {
        return next(error);
    }
};

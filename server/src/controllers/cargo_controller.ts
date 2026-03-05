import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Cargo } from "../models/cargos";
import { CargoOrder } from "../models/cargo_orders";
import { Order } from "../models/orders";
import { OrderItem } from "../models/order_items";
import { Invoice, InvoiceItem } from "../models/invoice";
import { Customer } from "../models/customers";
import { Like } from "typeorm";

const generateInvoicesForOrders = async (orderIds: number[]) => {
    if (!orderIds || orderIds.length === 0) return;
    try {
        const orderRepo = AppDataSource.getRepository(Order);
        const orderItemRepo = AppDataSource.getRepository(OrderItem);
        const invoiceRepo = AppDataSource.getRepository(Invoice);
        const invoiceItemRepo = AppDataSource.getRepository(InvoiceItem);
        const customerRepo = AppDataSource.getRepository(Customer);

        for (const orderId of orderIds) {
            const order = await orderRepo.findOne({ where: { id: orderId } });
            if (!order) {
                console.warn(`[Invoice] Order ${orderId} not found, skipping.`);
                continue;
            }

            // Delete existing invoice for this order_no to regenerate fresh
            const existingInvoice = await invoiceRepo.findOne({ where: { orderNumber: order.order_no } });
            if (existingInvoice) {
                await invoiceItemRepo.delete({ invoice: { id: existingInvoice.id } });
                await invoiceRepo.remove(existingInvoice);
            }

            let customer = null;
            if (order.customer_id) {
                customer = await customerRepo.findOne({ where: { id: order.customer_id as string } });
            }
            if (!customer) {
                console.warn(`[Invoice] Order ${order.order_no} has no customer (customer_id=${order.customer_id}), skipping invoice generation.`);
                continue;
            }

            const orderItems = await orderItemRepo.find({
                where: { order_id: order.id },
                relations: ["item", "item.taric"]
            });

            if (orderItems.length === 0) {
                console.warn(`[Invoice] Order ${order.order_no} has no items, skipping.`);
                continue;
            }

            let netTotal = 0;
            let taxAmount = 0;
            let grossTotal = 0;

            // First save the invoice without items
            const invoice = invoiceRepo.create({
                invoiceNumber: `INV-${Date.now().toString().slice(-6)}-${order.id}`,
                orderNumber: order.order_no,
                invoiceDate: new Date(),
                deliveryDate: new Date(),
                netTotal: 0,
                taxAmount: 0,
                grossTotal: 0,
                paidAmount: 0,
                outstandingAmount: 0,
                paymentMethod: "Bank Transfer",
                shippingMethod: "Standard",
                customer: customer,
                status: "draft",
            });
            const savedInvoice = await invoiceRepo.save(invoice);

            const invoiceItemEntities: InvoiceItem[] = [];
            for (const oi of orderItems) {
                const quantity = oi.qty || 1;
                const unitPrice = oi.price || oi.rmb_special_price || 0;
                const netPrice = quantity * unitPrice;
                const itemTaxRate = oi.item?.taric?.duty_rate ? Number(oi.item.taric.duty_rate) : 19;
                const itemTax = (netPrice * itemTaxRate) / 100;
                const grossPrice = netPrice + itemTax;
                netTotal += netPrice;
                taxAmount += itemTax;
                grossTotal += grossPrice;

                const invItem = invoiceItemRepo.create({
                    quantity,
                    articleNumber: oi.item?.ean?.toString() || oi.item?.model || oi.item?.ItemID_DE?.toString() || "Unknown",
                    description: oi.item?.item_name || "Unknown Item",
                    unitPrice,
                    netPrice,
                    taxRate: itemTaxRate,
                    taxAmount: itemTax,
                    grossPrice,
                    invoice: savedInvoice,
                });
                invoiceItemEntities.push(invItem);
            }
            await invoiceItemRepo.save(invoiceItemEntities);

            // Update totals on the invoice
            savedInvoice.netTotal = netTotal;
            savedInvoice.taxAmount = taxAmount;
            savedInvoice.grossTotal = grossTotal;
            savedInvoice.outstandingAmount = grossTotal;
            await invoiceRepo.save(savedInvoice);

            console.log(`[Invoice] Created invoice ${savedInvoice.invoiceNumber} for order ${order.order_no}`);
        }
    } catch (e) {
        console.error("Failed to generate invoices for orders", e);
    }
};

export const getAllCargos = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cargoRepo = AppDataSource.getRepository(Cargo);
        const { page = 1, limit = 50, search = "" } = req.query as any;

        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.max(1, Math.min(100, Number(limit)));
        const skip = (pageNum - 1) * limitNum;

        const whereConditions: any[] = [];
        if (search) {
            whereConditions.push(
                { cargo_no: Like(`%${search}%`) },
                { note: Like(`%${search}%`) },
                { remark: Like(`%${search}%`) },
                { cargo_status: Like(`%${search}%`) }
            );
        }

        const [cargos, total] = await cargoRepo.findAndCount({
            where: whereConditions.length > 0 ? whereConditions : undefined,
            order: { id: "DESC" },
            skip,
            take: limitNum,
        });

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
        if (validOrderIds.length > 0) {
            await orderItemRepo
                .createQueryBuilder()
                .update(OrderItem)
                .set({ cargo_id: cargo.id })
                .where("order_id IN (:...validOrderIds)", { validOrderIds })
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

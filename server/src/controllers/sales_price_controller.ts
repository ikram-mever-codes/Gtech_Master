import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { SalesPrice } from "../models/sales_prices";
import { Item } from "../models/items";
import { Customer } from "../models/customers";

export class SalesPriceController {
  private salesPriceRepository = AppDataSource.getRepository(SalesPrice);
  private itemRepository = AppDataSource.getRepository(Item);
  private customerRepository = AppDataSource.getRepository(Customer);

  private mapTier(r: SalesPrice) {
    return {
      id: r.id,
      minQuantity: Number(r.min_quantity),
      unitPriceEur: Number(r.unit_price_eur),
    };
  }

  private async assertCustomerAllowed(
    itemId: number,
    customerId: string | null,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    if (customerId === null) return { ok: true };

    const item = await this.itemRepository.findOne({
      where: { id: itemId },
      relations: ["customer"],
    });
    if (!item) return { ok: false, message: "Item not found" };

    const assignedCustomerId = item.customer?.id
      ? String(item.customer.id)
      : null;

    if (assignedCustomerId !== null && assignedCustomerId !== customerId) {
      return {
        ok: false,
        message:
          "This item is assigned to a specific customer — sales prices can only be added for that customer, or as a global price.",
      };
    }
    return { ok: true };
  }

  async getForItem(request: Request, response: Response) {
    try {
      const itemId = parseInt(request.params.itemId, 10);
      if (isNaN(itemId)) {
        return response
          .status(400)
          .json({ success: false, message: "Invalid item id" });
      }

      const item = await this.itemRepository.findOne({
        where: { id: itemId },
        relations: ["customer"],
      });
      if (!item) {
        return response
          .status(404)
          .json({ success: false, message: "Item not found" });
      }

      const rows = await this.salesPriceRepository.find({
        where: { item_id: itemId },
        relations: ["customer"],
        order: { min_quantity: "ASC" },
      });

      const byKey = new Map<string, any>();

      const keyFor = (customerId: string | null) =>
        customerId === null ? "global" : String(customerId);

      // Global row always exists
      byKey.set("global", {
        customerId: null,
        customerName: "Global (default)",
        customerNumber: undefined,
        individual: null,
        tiers: [],
      });

      rows.forEach((r) => {
        const cid = r.customer_id || null;
        const key = keyFor(cid);
        if (!byKey.has(key)) {
          byKey.set(key, {
            customerId: cid,
            customerName:
              r.customer?.legalName ||
              r.customer?.companyName ||
              (cid !== null ? `#${cid}` : "Global (default)"),
            customerNumber: r.customer?.customerNumber || undefined,
            individual: null,
            tiers: [],
          });
        }
        const entry = byKey.get(key);
        if (r.is_individual) {
          entry.individual = this.mapTier(r);
        } else {
          entry.tiers.push(this.mapTier(r));
        }
      });

      const rowsArr = Array.from(byKey.values()).sort((a, b) => {
        if (a.customerId === null) return -1;
        if (b.customerId === null) return 1;
        return (a.customerName || "").localeCompare(b.customerName || "");
      });

      return response.status(200).json({
        success: true,
        data: {
          itemCustomerId: item.customer?.id ? String(item.customer.id) : null,
          rows: rowsArr,
        },
      });
    } catch (error) {
      console.error("Error fetching sales prices:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async create(request: Request, response: Response) {
    try {
      const { itemId, customerId, isIndividual, minQuantity, unitPriceEur } =
        request.body || {};

      const parsedItemId = parseInt(itemId, 10);
      if (isNaN(parsedItemId)) {
        return response
          .status(400)
          .json({ success: false, message: "itemId is required" });
      }

      const parsedPrice = Number(unitPriceEur);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return response.status(400).json({
          success: false,
          message: "unitPriceEur must be a valid, non-negative number",
        });
      }

      // Handle customerId - it can be null, undefined, or a UUID string
      let parsedCustomerId: string | null = null;
      if (
        customerId !== undefined &&
        customerId !== null &&
        customerId !== ""
      ) {
        parsedCustomerId = String(customerId);

        // Validate it's a valid UUID
        const uuidRegex =
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        if (!uuidRegex.test(parsedCustomerId)) {
          return response.status(400).json({
            success: false,
            message: "Invalid customerId format. Expected UUID.",
          });
        }

        // Verify the customer exists
        const customer = await this.customerRepository.findOne({
          where: { id: parsedCustomerId as any },
        });
        if (!customer) {
          return response
            .status(404)
            .json({ success: false, message: "Customer not found" });
        }
      }

      const permission = await this.assertCustomerAllowed(
        parsedItemId,
        parsedCustomerId,
      );
      if (!permission.ok) {
        return response.status(403).json({
          success: false,
          message: permission.message,
        });
      }

      const item = await this.itemRepository.findOne({
        where: { id: parsedItemId },
      });
      if (!item) {
        return response
          .status(404)
          .json({ success: false, message: "Item not found" });
      }

      // Handle individual price
      if (isIndividual === true || isIndividual === "true") {
        const existing = await this.salesPriceRepository.findOne({
          where: {
            item_id: parsedItemId,
            customer_id: parsedCustomerId as any,
            is_individual: true,
          },
        });

        if (existing) {
          existing.unit_price_eur = parsedPrice;
          const saved = await this.salesPriceRepository.save(existing);
          return response.status(200).json({
            success: true,
            message: "Individual price updated",
            data: this.mapTier(saved),
          });
        }

        const created = this.salesPriceRepository.create({
          item_id: parsedItemId,
          customer_id: parsedCustomerId,
          is_individual: true,
          min_quantity: 1,
          unit_price_eur: parsedPrice,
        });
        const saved = await this.salesPriceRepository.save(created);
        return response.status(201).json({
          success: true,
          message: "Individual price created",
          data: this.mapTier(saved),
        });
      }

      // Handle quantity tier
      const parsedQty = Number(minQuantity);
      if (!parsedQty || parsedQty <= 0 || !Number.isInteger(parsedQty)) {
        return response.status(400).json({
          success: false,
          message: "minQuantity must be a positive integer",
        });
      }

      const existingTier = await this.salesPriceRepository.findOne({
        where: {
          item_id: parsedItemId,
          customer_id: parsedCustomerId as any,
          is_individual: false,
          min_quantity: parsedQty,
        },
      });

      if (existingTier) {
        existingTier.unit_price_eur = parsedPrice;
        const saved = await this.salesPriceRepository.save(existingTier);
        return response.status(200).json({
          success: true,
          message: "Price tier updated",
          data: this.mapTier(saved),
        });
      }

      const created = this.salesPriceRepository.create({
        item_id: parsedItemId,
        customer_id: parsedCustomerId,
        is_individual: false,
        min_quantity: parsedQty,
        unit_price_eur: parsedPrice,
      });
      const saved = await this.salesPriceRepository.save(created);
      return response.status(201).json({
        success: true,
        message: "Price tier created",
        data: this.mapTier(saved),
      });
    } catch (error) {
      console.error("Error creating sales price:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async update(request: Request, response: Response) {
    try {
      const id = parseInt(request.params.id, 10);
      const { minQuantity, unitPriceEur } = request.body || {};

      const row = await this.salesPriceRepository.findOne({ where: { id } });
      if (!row) {
        return response
          .status(404)
          .json({ success: false, message: "Price entry not found" });
      }

      if (!row.is_individual && minQuantity !== undefined) {
        const parsedQty = Number(minQuantity);
        if (!parsedQty || parsedQty <= 0) {
          return response.status(400).json({
            success: false,
            message: "minQuantity must be a positive number",
          });
        }
        row.min_quantity = parsedQty;
      }

      if (unitPriceEur !== undefined) {
        const parsedPrice = Number(unitPriceEur);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          return response.status(400).json({
            success: false,
            message: "unitPriceEur must be a valid, non-negative number",
          });
        }
        row.unit_price_eur = parsedPrice;
      }

      const saved = await this.salesPriceRepository.save(row);
      return response.status(200).json({
        success: true,
        message: "Price entry updated",
        data: this.mapTier(saved),
      });
    } catch (error) {
      console.error("Error updating sales price:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async delete(request: Request, response: Response) {
    try {
      const id = parseInt(request.params.id, 10);
      const row = await this.salesPriceRepository.findOne({ where: { id } });
      if (!row) {
        return response
          .status(404)
          .json({ success: false, message: "Price entry not found" });
      }
      await this.salesPriceRepository.remove(row);
      return response
        .status(200)
        .json({ success: true, message: "Price entry deleted" });
    } catch (error) {
      console.error("Error deleting sales price:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async resolvePrice(request: Request, response: Response) {
    try {
      const itemId = parseInt(String(request.query.itemId), 10);
      const customerId = request.query.customerId
        ? String(request.query.customerId)
        : null;
      const quantity = Number(request.query.quantity) || 1;

      if (isNaN(itemId)) {
        return response
          .status(400)
          .json({ success: false, message: "itemId is required" });
      }

      let rows: SalesPrice[] = [];
      let source: "customer" | "global" = "global";

      if (customerId !== null) {
        rows = await this.salesPriceRepository.find({
          where: { item_id: itemId, customer_id: customerId as any },
        });
        if (rows.length > 0) source = "customer";
      }

      if (rows.length === 0) {
        rows = await this.salesPriceRepository.find({
          where: { item_id: itemId, customer_id: null as any },
        });
        source = "global";
      }

      const applicable = rows
        .filter((r) => Number(r.min_quantity) <= quantity)
        .sort((a, b) => Number(b.min_quantity) - Number(a.min_quantity))[0];

      if (!applicable) {
        return response.status(200).json({ success: true, data: null });
      }

      return response.status(200).json({
        success: true,
        data: {
          unitPriceEur: Number(applicable.unit_price_eur),
          minQuantity: Number(applicable.min_quantity),
          source,
        },
      });
    } catch (error) {
      console.error("Error resolving sales price:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
}

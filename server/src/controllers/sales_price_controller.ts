import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { SalesPrice } from "../models/sales_prices";
import { Item } from "../models/items";
import { Customer } from "../models/customers";

export class SalesPriceController {
  private salesPriceRepository = AppDataSource.getRepository(SalesPrice);
  private itemRepository = AppDataSource.getRepository(Item);
  private customerRepository = AppDataSource.getRepository(Customer);

  private mapRow(r: SalesPrice) {
    return {
      id: r.id,
      minQuantity: Number(r.min_quantity),
      unitPriceEur: Number(r.unit_price_eur),
    };
  }

  // GET /sales-prices/item/:itemId
  // Returns every price tier for this item, split into:
  //   - global: tiers with customer_id = NULL (the item's default ladder)
  //   - customers: one entry per customer with at least one tier, each
  //     carrying that customer's own tiers. A customer's tiers fully
  //     override the global ladder for them — never merged together.
  async getForItem(request: Request, response: Response) {
    try {
      const itemId = parseInt(request.params.itemId, 10);
      if (isNaN(itemId)) {
        return response
          .status(400)
          .json({ success: false, message: "Invalid item id" });
      }

      const rows = await this.salesPriceRepository.find({
        where: { item_id: itemId },
        relations: ["customer"],
        order: { min_quantity: "ASC" },
      });

      const global = rows
        .filter((r) => r.customer_id === null || r.customer_id === undefined)
        .map((r) => this.mapRow(r));

      const byCustomer = new Map<number, any>();
      rows
        .filter((r) => r.customer_id !== null && r.customer_id !== undefined)
        .forEach((r) => {
          const cid = r.customer_id as number;
          if (!byCustomer.has(cid)) {
            byCustomer.set(cid, {
              customerId: cid,
              customerName:
                r.customer?.legalName || r.customer?.companyName || `#${cid}`,
              customerNumber: r.customer?.customerNumber || undefined,
              tiers: [],
            });
          }
          byCustomer.get(cid).tiers.push(this.mapRow(r));
        });

      return response.status(200).json({
        success: true,
        data: {
          global,
          customers: Array.from(byCustomer.values()).sort((a, b) =>
            (a.customerName || "").localeCompare(b.customerName || ""),
          ),
        },
      });
    } catch (error) {
      console.error("Error fetching sales prices:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  // POST /sales-prices
  // body: { itemId, customerId?, minQuantity, unitPriceEur }
  // customerId omitted/null => a global tier.
  async create(request: Request, response: Response) {
    try {
      const { itemId, customerId, minQuantity, unitPriceEur } =
        request.body || {};

      const parsedItemId = parseInt(itemId, 10);
      if (isNaN(parsedItemId)) {
        return response
          .status(400)
          .json({ success: false, message: "itemId is required" });
      }
      const parsedQty = Number(minQuantity);
      const parsedPrice = Number(unitPriceEur);
      if (!parsedQty || parsedQty <= 0) {
        return response.status(400).json({
          success: false,
          message: "minQuantity must be a positive number",
        });
      }
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return response.status(400).json({
          success: false,
          message: "unitPriceEur must be a valid, non-negative number",
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

      let parsedCustomerId: number | null = null;
      if (
        customerId !== undefined &&
        customerId !== null &&
        customerId !== ""
      ) {
        parsedCustomerId = parseInt(customerId, 10);
        if (isNaN(parsedCustomerId)) {
          return response
            .status(400)
            .json({ success: false, message: "Invalid customerId" });
        }
        const customer = await this.customerRepository.findOne({
          where: { id: String(parsedCustomerId) as any },
        });
        if (!customer) {
          return response
            .status(404)
            .json({ success: false, message: "Customer not found" });
        }
      }

      // One tier per (item, customer, min_quantity) — updates in place
      // instead of creating a duplicate row at the same quantity.
      const existing = await this.salesPriceRepository.findOne({
        where: {
          item_id: parsedItemId,
          customer_id: parsedCustomerId as any,
          min_quantity: parsedQty as any,
        },
      });

      if (existing) {
        existing.unit_price_eur = parsedPrice;
        const saved = await this.salesPriceRepository.save(existing);
        return response.status(200).json({
          success: true,
          message: "Price tier updated",
          data: this.mapRow(saved),
        });
      }

      const created = this.salesPriceRepository.create({
        item_id: parsedItemId,
        customer_id: parsedCustomerId,
        min_quantity: parsedQty,
        unit_price_eur: parsedPrice,
      });
      const saved = await this.salesPriceRepository.save(created);

      return response.status(201).json({
        success: true,
        message: "Price tier created",
        data: this.mapRow(saved),
      });
    } catch (error) {
      console.error("Error creating sales price:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  // PUT /sales-prices/:id
  async update(request: Request, response: Response) {
    try {
      const id = parseInt(request.params.id, 10);
      const { minQuantity, unitPriceEur } = request.body || {};

      const row = await this.salesPriceRepository.findOne({ where: { id } });
      if (!row) {
        return response
          .status(404)
          .json({ success: false, message: "Price tier not found" });
      }

      if (minQuantity !== undefined) {
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
        message: "Price tier updated",
        data: this.mapRow(saved),
      });
    } catch (error) {
      console.error("Error updating sales price:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  // DELETE /sales-prices/:id
  async delete(request: Request, response: Response) {
    try {
      const id = parseInt(request.params.id, 10);
      const row = await this.salesPriceRepository.findOne({ where: { id } });
      if (!row) {
        return response
          .status(404)
          .json({ success: false, message: "Price tier not found" });
      }
      await this.salesPriceRepository.remove(row);
      return response
        .status(200)
        .json({ success: true, message: "Price tier deleted" });
    } catch (error) {
      console.error("Error deleting sales price:", error);
      return response
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  // GET /sales-prices/resolve?itemId=&customerId=&quantity=
  // Suggested-price lookup for prefilling an Offer or manual Order line.
  // If the customer has ANY tiers at all, those completely replace the
  // global ladder (no merging); otherwise the global ladder is used.
  // Picks the highest min_quantity tier the requested quantity qualifies
  // for. This never touches existing Offers/Orders — it's read-only,
  // called only at line-creation time (the "snapshot" rule).
  async resolvePrice(request: Request, response: Response) {
    try {
      const itemId = parseInt(String(request.query.itemId), 10);
      const customerId = request.query.customerId
        ? parseInt(String(request.query.customerId), 10)
        : null;
      const quantity = Number(request.query.quantity) || 1;

      if (isNaN(itemId)) {
        return response
          .status(400)
          .json({ success: false, message: "itemId is required" });
      }

      let tiers: SalesPrice[] = [];
      let source: "customer" | "global" = "global";

      if (customerId !== null && !isNaN(customerId)) {
        tiers = await this.salesPriceRepository.find({
          where: { item_id: itemId, customer_id: customerId as any },
          order: { min_quantity: "ASC" },
        });
        if (tiers.length > 0) source = "customer";
      }

      if (tiers.length === 0) {
        tiers = await this.salesPriceRepository.find({
          where: { item_id: itemId, customer_id: null as any },
          order: { min_quantity: "ASC" },
        });
        source = "global";
      }

      const applicable = tiers
        .filter((t) => Number(t.min_quantity) <= quantity)
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

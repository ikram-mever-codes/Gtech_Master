import { AppDataSource } from "../config/database";
import { Offer } from "../models/offer";
import { Order } from "../models/orders";
import { OrderItem } from "../models/order_items";
import { NumberSequenceService } from "../services/number_sequence_service";

export const backfillOfferOrdersMigration = async () => {
  try {
    const offerRepo = AppDataSource.getRepository(Offer);
    const orderRepo = AppDataSource.getRepository(Order);
    const orderItemRepo = AppDataSource.getRepository(OrderItem);

    const offers = await offerRepo.find({ relations: ["lineItems"] });

    for (const offer of offers) {
      const targetCount = Math.max(offer.conversionCount || 0, offer.status === "Accepted" ? 1 : 0);
      if (targetCount === 0) continue;

      const existingOrders = await orderRepo.find({
        where: { source_offer_id: offer.id },
      });

      const missingCount = targetCount - existingOrders.length;
      if (missingCount <= 0) continue;

      console.log(
        `[Migration] Backfilling ${missingCount} missing order(s) for offer ${offer.offerNumber} (Target: ${targetCount}, Existing: ${existingOrders.length})`
      );

      for (let i = 0; i < missingCount; i++) {
        let orderNo = "";
        try {
          orderNo = await NumberSequenceService.getNextNumber("order");
        } catch (_) {
          const now = new Date();
          const yy = String(now.getFullYear()).slice(-2);
          const mm = String(now.getMonth() + 1).padStart(2, "0");
          orderNo = `B${yy}${mm}-${Date.now().toString().slice(-3)}`;
        }

        const now = new Date();
        const customerId = offer.customerId || (offer.customerSnapshot as any)?.id || null;

        const newOrder = orderRepo.create({
          order_no: orderNo,
          customer_id: customerId,
          category_id: null,
          supplier_id: null,
          status: 1,
          comment: `Converted from offer ${offer.offerNumber}`,
          source_offer_id: offer.id,
          date_created: now.toISOString(),
          created_at: now,
          updated_at: now,
        } as any);

        const savedOrder: any = await orderRepo.save(newOrder as any);

        if (offer.lineItems && offer.lineItems.length > 0) {
          const itemPayloads = offer.lineItems.map((li) => {
            const rawItemId = Number(li.sourceItemId);
            const validItemId = Number.isFinite(rawItemId) && rawItemId > 0 ? rawItemId : undefined;
            const qty = Number(li.baseQuantity) || 1;
            const price = Number(li.basePrice) || 0;

            return {
              order_id: savedOrder.id,
              item_id: validItemId,
              qty,
              price,
              currency: offer.currency || "EUR",
              remark_de: li.itemName || "Item",
              status: "NSO",
              created_at: now,
              updated_at: now,
            };
          });

          const orderItems = orderItemRepo.create(itemPayloads as any);
          await orderItemRepo.save(orderItems);
        }
      }
    }
  } catch (err) {
    console.error("[Migration] Failed to backfill offer orders:", err);
  }
};
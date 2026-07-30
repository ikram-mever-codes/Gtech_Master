import { AppDataSource } from "../config/database";
import { Order } from "../models/orders";

export const restoreFulfillmentOrdersMigration = async () => {
  try {
    const orderRepo = AppDataSource.getRepository(Order);
    const orders = await orderRepo.find();

    let restoredCount = 0;
    let auftragCount = 0;

    for (const order of orders) {
      const orderNo = String(order.order_no || "");
      const orderAny = order as any;
      const isDeOrder =
        orderNo.startsWith("DE") ||
        (order.comment || "").includes("[Moved to Fulfillment]") ||
        orderAny.is_fulfilled === true;

      if (isDeOrder) {
        orderAny.is_fulfilled = true;
        order.status = 2;
        if (!order.bestellung_status || order.bestellung_status === "draft") {
          order.bestellung_status = "to_be_processed";
        }
        await orderRepo.save(order);
        restoredCount++;
      } else if (orderNo.startsWith("B") || orderNo.startsWith("MA") || order.source_offer_id) {
        if (!order.bestellung_status) {
          order.bestellung_status = "draft";
        }
        orderAny.is_fulfilled = false;
        order.status = 1;
        await orderRepo.save(order);
        auftragCount++;
      }
    }

    console.log(
      `[Migration] Restored ${restoredCount} DE order(s) to Fulfillment/Bestellung (status: to_be_processed) and organized ${auftragCount} Auftrag order(s).`
    );
  } catch (err) {
    console.error("[Migration] Failed to restore fulfillment orders:", err);
  }
};

// scripts/clear_draft_flag_for_items_in_auftrags.ts
//
// Rule: an Item that is referenced by any CustomerOrderItem (i.e. it's
// actually in use on an Auftrag) can never be isDraft: true. A draft is
// meant to be a placeholder that hasn't been fully vetted yet — once it's
// live on a real customer order, it's no longer a draft by definition,
// regardless of whether every draft-required field (TARIC, weight, sales
// price, etc.) was filled in through the proper conversion flow.
//
// For every CustomerOrderItem with a sourceItemId, resolve the Item it
// points to and set isDraft = false if it's currently true. Items with no
// CustomerOrderItem referencing them are left untouched — this only acts
// on Items that are demonstrably in use on an Auftrag right now.
//
// Run with: ts-node scripts/clear_draft_flag_for_items_in_auftrags.ts

import { AppDataSource } from "../config/database";
import { CustomerOrderItem } from "../models/customer_order_items";
import { Item } from "../models/items";
import { In } from "typeorm";

async function run() {
  await AppDataSource.initialize();

  const orderItemRepo = AppDataSource.getRepository(CustomerOrderItem);
  const itemRepo = AppDataSource.getRepository(Item);

  const orderItems = await orderItemRepo.find({
    select: ["id", "sourceItemId", "itemName"],
  });

  const referencedItemIds = Array.from(
    new Set(
      orderItems
        .map((oi) => oi.sourceItemId)
        .filter((v): v is string => !!v && v.trim() !== "")
        .map((v) => parseInt(v, 10))
        .filter((v) => !isNaN(v)),
    ),
  );

  console.log(
    `Found ${orderItems.length} CustomerOrderItem row(s), referencing ${referencedItemIds.length} distinct Item id(s).`,
  );

  if (referencedItemIds.length === 0) {
    console.log("Nothing to do — no CustomerOrderItem rows reference an Item.");
    await AppDataSource.destroy();
    process.exit(0);
  }

  const draftItemsInUse = await itemRepo.find({
    where: { id: In(referencedItemIds), isDraft: true },
    select: ["id", "item_name", "item_no_de"],
  });

  console.log(
    `${draftItemsInUse.length} of those Item(s) are currently isDraft: true — clearing the flag.`,
  );

  if (draftItemsInUse.length === 0) {
    console.log(
      "Nothing to update — no draft Items are referenced by an Auftrag.",
    );
    await AppDataSource.destroy();
    process.exit(0);
  }

  for (const item of draftItemsInUse) {
    console.log(
      `  Item ${item.id} (${item.item_no_de || "no item_no_de"} — ${item.item_name || "unnamed"}) -> isDraft: false`,
    );
  }

  const idsToUpdate = draftItemsInUse.map((it) => it.id);

  const result = await itemRepo
    .createQueryBuilder()
    .update(Item)
    .set({ isDraft: false })
    .where("id IN (:...ids)", { ids: idsToUpdate })
    .execute();

  console.log(
    `Done. Updated ${result.affected ?? idsToUpdate.length} Item(s).`,
  );

  await AppDataSource.destroy();
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration script crashed:", err);
  process.exit(1);
});

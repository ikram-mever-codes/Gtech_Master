// services/cronJobs.ts
import { CronJob } from "cron";
import { AppDataSource } from "../config/database";
import { List, LIST_STATUS } from "../models/list";
import { updateLocalListItem } from "../controllers/list_controllers";
import { getHighlightedFields } from "../models/list";

export class CronJobs {
  private static instance: CronJobs;

  public static getInstance(): CronJobs {
    if (!CronJobs.instance) {
      CronJobs.instance = new CronJobs();
    }
    return CronJobs.instance;
  }

  // Cron job to refresh all lists from MIS
  private refreshAllListsJob: CronJob;

  constructor() {
    // Run every hour (you can adjust the schedule as needed)
    this.refreshAllListsJob = new CronJob(
      "0 * * * *", // Every hour at minute 0
      this.refreshAllLists.bind(this),
      null,
      false, // Don't start automatically
      "Europe/Berlin" // Adjust timezone as needed
    );
  }

  /**
   * Refresh all lists and their items from MIS
   */
  private async refreshAllLists() {
    console.log("🔄 Starting scheduled refresh of all lists from MIS...");

    const listRepository = AppDataSource.getRepository(List);
    const startTime = Date.now();

    try {
      // Fetch all lists with their items
      const lists = await listRepository.find({
        relations: ["items", "customer"],
        where: { status: LIST_STATUS.ACTIVE }, // Only refresh active lists
      });

      console.log(`📋 Found ${lists.length} lists to refresh`);

      let totalItems = 0;
      let refreshedItems = 0;
      let failedRefreshes = 0;

      for (const list of lists) {
        if (list.items && list.items.length > 0) {
          totalItems += list.items.length;
          console.log(
            `🔄 Refreshing ${list.items.length} items for list: ${list.name}`
          );

          const updatedItems = [];

          for (const item of list.items) {
            try {
              // Refresh item data from MIS
              const refreshedItem = await updateLocalListItem(item);
              updatedItems.push(refreshedItem);
              refreshedItems++;

              // Log successful refresh
              console.log(`✅ Refreshed item: ${item.articleName}`);
            } catch (error) {
              console.error(`❌ Failed to refresh item ${item.id}:`, error);
              updatedItems.push(item); // Keep original item if refresh fails
              failedRefreshes++;
            }
          }

          // Update the list with refreshed items
          list.items = updatedItems;

          // Save the updated list
          await listRepository.save(list);

          // Log the refresh activity for the list
          //   list.addActivityLog(
          //     `System automatically refreshed ${updatedItems.length} items from MIS`,
          //     "admin",
          //     "system",
          //     undefined,
          //     "list_auto_refreshed"
          //   );

          //   await listRepository.save(list);
          // }
        }

        const duration = Date.now() - startTime;
        console.log(`✅ Scheduled refresh completed in ${duration}ms`);
        console.log(
          `📊 Statistics: ${refreshedItems} items refreshed, ${failedRefreshes} failed out of ${totalItems} total items`
        );
      }
    } catch (error) {
      console.error("❌ Error in scheduled list refresh:", error);
    }
  }

  /**
   * Refresh a specific list by ID
   */
  public async refreshSpecificList(listId: string) {
    console.log(`🔄 Manually refreshing list: ${listId}`);

    const listRepository = AppDataSource.getRepository(List);

    try {
      const list = await listRepository.findOne({
        where: { id: listId },
        relations: ["items", "customer"],
      });

      if (!list) {
        console.error(`List ${listId} not found`);
        return false;
      }

      if (list.items && list.items.length > 0) {
        const updatedItems = [];
        let refreshedCount = 0;

        for (const item of list.items) {
          try {
            const refreshedItem = await updateLocalListItem(item);
            updatedItems.push(refreshedItem);
            refreshedCount++;
          } catch (error) {
            console.error(`Failed to refresh item ${item.id}:`, error);
            updatedItems.push(item);
          }
        }

        list.items = updatedItems;
        await listRepository.save(list);

        // Log the manual refresh activity
        // list.addActivityLog(
        //   `System manually refreshed ${refreshedCount} items from MIS`,
        //   "admin",
        //   "system",
        //   undefined,
        //   "list_manual_refresh"
        // );

        await listRepository.save(list);

        console.log(
          `✅ Successfully refreshed ${refreshedCount} items for list: ${list.name}`
        );
        return true;
      } else {
        console.log(`List ${list.name} has no items to refresh`);
        return true;
      }
    } catch (error) {
      console.error(`Error refreshing list ${listId}:`, error);
      return false;
    }
  }

  /**
   * Start all cron jobs
   */
  public start() {
    this.refreshAllListsJob.start();
    console.log("✅ Cron jobs started");
  }

  /**
   * Stop all cron jobs
   */
  public stop() {
    this.refreshAllListsJob.stop();
    console.log("⏹️ Cron jobs stopped");
  }

  /**
   * Get cron job status
   */
  public getStatus() {
    return {
      refreshAllLists: {
        nextDate: this.refreshAllListsJob.nextDate(),
        lastDate: this.refreshAllListsJob.lastDate(),
      },
    };
  }
}

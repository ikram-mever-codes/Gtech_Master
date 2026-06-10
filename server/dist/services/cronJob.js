"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronJobs = void 0;
// services/cronJobs.ts
const cron_1 = require("cron");
const database_1 = require("../config/database");
const list_1 = require("../models/list");
const list_controllers_1 = require("../controllers/list_controllers");
class CronJobs {
    static getInstance() {
        if (!CronJobs.instance) {
            CronJobs.instance = new CronJobs();
        }
        return CronJobs.instance;
    }
    constructor() {
        // Run every hour (you can adjust the schedule as needed)
        this.refreshAllListsJob = new cron_1.CronJob("0 * * * *", // Every hour at minute 0
        this.refreshAllLists.bind(this), null, false, // Don't start automatically
        "Europe/Berlin" // Adjust timezone as needed
        );
    }
    /**
     * Refresh all lists and their items from MIS
     */
    refreshAllLists() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("🔄 Starting scheduled refresh of all lists from MIS...");
            const listRepository = database_1.AppDataSource.getRepository(list_1.List);
            const startTime = Date.now();
            try {
                // Fetch all lists with their items
                const lists = yield listRepository.find({
                    relations: ["items", "customer"],
                    where: { status: list_1.LIST_STATUS.ACTIVE }, // Only refresh active lists
                });
                console.log(`📋 Found ${lists.length} lists to refresh`);
                let totalItems = 0;
                let refreshedItems = 0;
                let failedRefreshes = 0;
                for (const list of lists) {
                    if (list.items && list.items.length > 0) {
                        totalItems += list.items.length;
                        console.log(`🔄 Refreshing ${list.items.length} items for list: ${list.name}`);
                        const updatedItems = [];
                        for (const item of list.items) {
                            try {
                                // Refresh item data from MIS
                                const refreshedItem = yield (0, list_controllers_1.updateLocalListItem)(item);
                                updatedItems.push(refreshedItem);
                                refreshedItems++;
                                // Log successful refresh
                                console.log(`✅ Refreshed item: ${item.articleName}`);
                            }
                            catch (error) {
                                console.error(`❌ Failed to refresh item ${item.id}:`, error);
                                updatedItems.push(item);
                                failedRefreshes++;
                            }
                        }
                        // Update the list with refreshed items
                        list.items = updatedItems;
                        // Save the updated list
                        yield listRepository.save(list);
                    }
                    const duration = Date.now() - startTime;
                    console.log(`✅ Scheduled refresh completed in ${duration}ms`);
                    console.log(`📊 Statistics: ${refreshedItems} items refreshed, ${failedRefreshes} failed out of ${totalItems} total items`);
                }
            }
            catch (error) {
                console.error("❌ Error in scheduled list refresh:", error);
            }
        });
    }
    /**
     * Refresh a specific list by ID
     */
    refreshSpecificList(listId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`🔄 Manually refreshing list: ${listId}`);
            const listRepository = database_1.AppDataSource.getRepository(list_1.List);
            try {
                const list = yield listRepository.findOne({
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
                            const refreshedItem = yield (0, list_controllers_1.updateLocalListItem)(item);
                            updatedItems.push(refreshedItem);
                            refreshedCount++;
                        }
                        catch (error) {
                            console.error(`Failed to refresh item ${item.id}:`, error);
                            updatedItems.push(item);
                        }
                    }
                    list.items = updatedItems;
                    yield listRepository.save(list);
                    yield listRepository.save(list);
                    console.log(`✅ Successfully refreshed ${refreshedCount} items for list: ${list.name}`);
                    return true;
                }
                else {
                    console.log(`List ${list.name} has no items to refresh`);
                    return true;
                }
            }
            catch (error) {
                console.error(`Error refreshing list ${listId}:`, error);
                return false;
            }
        });
    }
    /**
     * Start all cron jobs
     */
    start() {
        this.refreshAllListsJob.start();
        console.log("✅ Cron jobs started");
    }
    /**
     * Stop all cron jobs
     */
    stop() {
        this.refreshAllListsJob.stop();
        console.log("⏹️ Cron jobs stopped");
    }
    /**
     * Get cron job status
     */
    getStatus() {
        return {
            refreshAllLists: {
                nextDate: this.refreshAllListsJob.nextDate(),
                lastDate: this.refreshAllListsJob.lastDate(),
            },
        };
    }
}
exports.CronJobs = CronJobs;

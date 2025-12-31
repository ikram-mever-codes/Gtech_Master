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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateListContactPerson = exports.acknowledgeItemFieldChanges = exports.getListItemWithRefresh = exports.refreshItemsFromMIS = exports.fetchAllListsAndItems = exports.getPendingChangesForAdmin = exports.bulkAcknowledgeChanges = exports.getListsByCompanyName = exports.searchListsByNumber = exports.deleteList = exports.updateList = exports.duplicateList = exports.getAllLists = exports.getCustomerLists = exports.searchItems = exports.rejectListItemChanges = exports.acknowledgeListItemChanges = exports.deleteListItem = exports.getCustomerList = exports.getCustomerDeliveries = exports.getListWithItems = exports.updateDeliveryInfo = exports.updateListItemComment = exports.updateListItem = exports.addListItem = exports.createList = void 0;
exports.updateLocalListItem = updateLocalListItem;
const database_1 = require("../config/database");
const list_1 = require("../models/list");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const misDb_1 = require("../config/misDb");
const customers_1 = require("../models/customers");
const users_1 = require("../models/users");
const typeorm_1 = require("typeorm");
const contact_person_1 = require("../models/contact_person");
function fetchItemData(itemId) {
    return __awaiter(this, void 0, void 0, function* () {
        const connection = yield (0, misDb_1.getConnection)();
        try {
            const [itemRows] = yield connection.query(`
            SELECT 
              i.*,
              os.cargo_id,
              os.status as order_status,
              oi.qty AS quantity,
              c.cargo_no,
              c.pickup_date,
              c.dep_date,
              c.cargo_status,
              c.shipped_at,
              c.eta,
              c.remark,
              c.cargo_type_id,
              ct.cargo_type,
              wi.item_name_de,
              wi.item_no_de,
              -- Additional field to identify unassigned items
              CASE WHEN os.cargo_id IS NULL THEN 1 ELSE 0 END as has_no_cargo
            FROM items i
            LEFT JOIN order_items oi ON i.ItemID_DE = oi.ItemID_DE
            LEFT JOIN order_statuses os ON oi.master_id = os.master_id AND oi.ItemID_DE = os.ItemID_DE
            LEFT JOIN cargos c ON os.cargo_id = c.id
            LEFT JOIN cargo_types ct ON c.cargo_type_id = ct.id
            LEFT JOIN warehouse_items wi ON i.ItemID_DE = wi.ItemID_DE
            WHERE i.id = ? 
            -- Include items that either match the itemId OR have no cargo assigned
            OR (os.cargo_id IS NULL AND oi.ItemID_DE IS NOT NULL)
            `, [itemId]);
            if (!itemRows || itemRows.length === 0) {
                throw new errorHandler_1.default("Item not found in MIS database", 404);
            }
            const itemData = itemRows[0];
            console.log("ItemData", itemData);
            const deliveryMap = new Map();
            // Counter for cargos without dates
            let noDateCounter = 0;
            // Counter for unassigned cargos
            let unassignedCounter = 0;
            itemRows.forEach((row) => {
                // Handle unassigned cargos (cargo_id IS NULL but has order_status)
                if (row.cargo_id === null && row.order_status) {
                    unassignedCounter++;
                    const unassignedKey = `unassigned-${unassignedCounter}`;
                    const quantity = Number(row.quantity) || 0;
                    if (!deliveryMap.has(unassignedKey)) {
                        deliveryMap.set(unassignedKey, {
                            quantity,
                            status: row.order_status || "Open",
                            deliveredAt: null,
                            cargoNo: [], // Empty array for cargo numbers
                            cargoStatus: "UNASSIGNED", // Special status for unassigned
                            remark: row.remark || "Not yet assigned to cargo",
                            shippedAt: "",
                            eta: "",
                            cargoType: "",
                            isUnassigned: true, // Mark as unassigned
                        });
                    }
                    else {
                        const existing = deliveryMap.get(unassignedKey);
                        deliveryMap.set(unassignedKey, {
                            quantity: existing.quantity + quantity,
                            status: row.order_status || existing.status,
                            deliveredAt: existing.deliveredAt,
                            cargoNo: existing.cargoNo,
                            cargoStatus: existing.cargoStatus,
                            remark: existing.remark,
                            shippedAt: existing.shippedAt,
                            eta: existing.eta,
                            cargoType: existing.cargoType,
                            isUnassigned: true,
                        });
                    }
                }
                // Handle assigned cargos (existing logic)
                else if (row.cargo_id && row.cargo_no) {
                    // Get all possible dates, use fallbacks if primary dates are null
                    const possibleDates = [
                        row.pickup_date,
                        row.dep_date,
                        row.shipped_at,
                        row.eta,
                    ].filter((date) => date !== null);
                    // If no dates available, create a unique key for cargos without dates
                    if (possibleDates.length === 0) {
                        noDateCounter++;
                        const uniqueKey = `no-date-${noDateCounter}`;
                        const quantity = Number(row.quantity) || 0;
                        if (!deliveryMap.has(uniqueKey)) {
                            deliveryMap.set(uniqueKey, {
                                quantity,
                                status: row.order_status || "Open",
                                deliveredAt: null,
                                cargoNo: [row.cargo_no],
                                cargoStatus: row.cargo_status || "",
                                remark: row.remark || "",
                                shippedAt: row.shipped_at
                                    ? new Date(row.shipped_at).toISOString().split("T")[0]
                                    : "",
                                eta: row.eta ? new Date(row.eta).toISOString().split("T")[0] : "",
                                cargoType: row.cargo_type || "",
                                isUnassigned: false,
                            });
                        }
                        else {
                            const existing = deliveryMap.get(uniqueKey);
                            const isUniqueDelivery = !existing.cargoNo.includes(row.cargo_no);
                            deliveryMap.set(uniqueKey, {
                                quantity: isUniqueDelivery
                                    ? existing.quantity + quantity
                                    : existing.quantity,
                                status: row.order_status || existing.status,
                                deliveredAt: existing.deliveredAt,
                                cargoNo: isUniqueDelivery
                                    ? [...existing.cargoNo, row.cargo_no]
                                    : existing.cargoNo,
                                cargoStatus: row.cargo_status || existing.cargoStatus,
                                remark: row.remark || existing.remark,
                                shippedAt: row.shipped_at || existing.shippedAt,
                                eta: row.eta
                                    ? new Date(row.eta).toISOString().split("T")[0]
                                    : existing.eta,
                                cargoType: row.cargo_type || existing.cargoType,
                                isUnassigned: false,
                            });
                        }
                    }
                    else {
                        // Process each available date
                        possibleDates.forEach((date) => {
                            const dateKey = date.toISOString().split("T")[0];
                            const quantity = Number(row.quantity) || 0;
                            if (!deliveryMap.has(dateKey)) {
                                deliveryMap.set(dateKey, {
                                    quantity,
                                    status: row.order_status || "Open",
                                    deliveredAt: date,
                                    cargoNo: [row.cargo_no],
                                    cargoStatus: row.cargo_status || "",
                                    remark: row.remark || "",
                                    shippedAt: row.shipped_at
                                        ? new Date(row.shipped_at).toISOString().split("T")[0]
                                        : "",
                                    eta: row.eta
                                        ? new Date(row.eta).toISOString().split("T")[0]
                                        : "",
                                    cargoType: row.cargo_type || "",
                                    isUnassigned: false,
                                });
                            }
                            else {
                                const existing = deliveryMap.get(dateKey);
                                const isUniqueDelivery = !existing.cargoNo.includes(row.cargo_no);
                                deliveryMap.set(dateKey, {
                                    quantity: isUniqueDelivery
                                        ? existing.quantity + quantity
                                        : existing.quantity,
                                    status: row.order_status || existing.status,
                                    deliveredAt: existing.deliveredAt,
                                    cargoNo: isUniqueDelivery
                                        ? [...existing.cargoNo, row.cargo_no]
                                        : existing.cargoNo,
                                    cargoStatus: row.cargo_status || existing.cargoStatus,
                                    remark: row.remark || existing.remark,
                                    shippedAt: row.shipped_at || existing.shippedAt,
                                    eta: row.eta
                                        ? new Date(row.eta).toISOString().split("T")[0]
                                        : existing.eta,
                                    cargoType: row.cargo_type || existing.cargoType,
                                    isUnassigned: false,
                                });
                            }
                        });
                    }
                }
            });
            const deliveries = {};
            deliveryMap.forEach((value, dateKey) => {
                const uniqueCargoNo = Array.from(new Set(value.cargoNo)).join(", ");
                deliveries[dateKey] = Object.assign({ quantity: value.quantity, status: value.status, deliveredAt: value.deliveredAt, cargoNo: uniqueCargoNo || "", cargoStatus: value.cargoStatus, remark: value.remark, shippedAt: value.shippedAt, eta: value.eta, cargoType: value.cargoType }, (value.isUnassigned && { isUnassigned: true }));
            });
            return {
                articleName: itemData.item_name_de || "",
                articleNumber: itemData.ItemID_DE || "",
                itemNoDe: itemData.item_no_de || "",
                weight: itemData.weight,
                imageUrl: itemData.photo || null,
                dimensions: {
                    width: itemData.width,
                    height: itemData.height,
                    length: itemData.length,
                },
                deliveries,
            };
        }
        finally {
            connection.release();
        }
    });
}
function updateLocalListItem(item) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const listItemRepository = database_1.AppDataSource.getRepository(list_1.ListItem);
        try {
            console.log(`Updating item ${item.id} from MIS...`);
            const itemData = yield fetchItemData(parseInt(item.itemNumber));
            console.log(itemData);
            if (!itemData) {
                console.warn(`No data returned from MIS for item ${item.id}`);
                return item;
            }
            // Store original values for comparison
            const originalValues = {
                articleName: item.articleName,
                articleNumber: item.articleNumber,
                item_no_de: item.item_no_de,
                quantity: item.quantity,
                imageUrl: item.imageUrl,
            };
            // Update all fields from MIS data
            item.articleName = itemData.articleName || item.articleName;
            item.articleNumber = itemData.articleNumber || item.articleNumber;
            item.item_no_de = itemData.itemNoDe || item.item_no_de;
            item.quantity = item.quantity;
            item.imageUrl = itemData.imageUrl || item.imageUrl;
            // Check if any values actually changed
            const hasChanges = item.articleName !== originalValues.articleName ||
                item.articleNumber !== originalValues.articleNumber ||
                item.item_no_de !== originalValues.item_no_de ||
                item.quantity !== originalValues.quantity ||
                item.imageUrl !== originalValues.imageUrl;
            // Update deliveries if available
            if (itemData.deliveries && Object.keys(itemData.deliveries).length > 0) {
                const currentDeliveries = item.deliveries || {};
                const mergedDeliveries = {};
                for (const [dateKey, delivery] of Object.entries(itemData.deliveries)) {
                    mergedDeliveries[dateKey] = Object.assign(Object.assign({}, delivery), { status: ((_a = currentDeliveries[dateKey]) === null || _a === void 0 ? void 0 : _a.status) || delivery.status, cargoStatus: ((_b = currentDeliveries[dateKey]) === null || _b === void 0 ? void 0 : _b.cargoStatus) || delivery.cargoStatus, remark: ((_c = currentDeliveries[dateKey]) === null || _c === void 0 ? void 0 : _c.remark) || delivery.remark });
                }
                item.deliveries = mergedDeliveries;
                console.log(`Updated deliveries for item ${item.id}`);
            }
            if (hasChanges) {
                console.log(`Item ${item.id} updated with new data from MIS`);
            }
            else {
                console.log(`Item ${item.id} already has latest data from MIS`);
            }
            return yield listItemRepository.save(item);
        }
        catch (error) {
            console.error(`Failed to update local item ${item.id}:`, error);
            return item;
        }
    });
}
function createCreator(userId, customerId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (userId) {
            const user = yield database_1.AppDataSource.getRepository(users_1.User).findOne({
                where: { id: userId },
            });
            if (!user)
                throw new errorHandler_1.default("User not found", 404);
            const creator = new list_1.UserCreator();
            creator.user = user;
            return creator;
        }
        else if (customerId) {
            const customer = yield database_1.AppDataSource.getRepository(customers_1.Customer).findOne({
                where: { id: customerId },
            });
            if (!customer)
                throw new errorHandler_1.default("Customer not found", 404);
            const creator = new list_1.CustomerCreator();
            creator.customer = customer;
            return creator;
        }
        throw new errorHandler_1.default("Creator information missing", 400);
    });
}
// Helper function to determine user role
function getUserRole(userId, customerId) {
    if (userId)
        return list_1.USER_ROLE.ADMIN;
    if (customerId)
        return list_1.USER_ROLE.CUSTOMER;
    return list_1.USER_ROLE.ADMIN; // Default fallback
}
// 1. Create New List
const createList = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, description, templateType, customerId } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!name || !customerId) {
            return next(new errorHandler_1.default("Name and customer ID are required", 400));
        }
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const customer = yield customerRepository.findOne({
            where: { id: customerId },
        });
        if (!customer) {
            return next(new errorHandler_1.default("Customer not found", 404));
        }
        const createdBy = yield createCreator(null, customerId);
        const list = listRepository.create({
            name,
            description,
            templateType,
            customer,
            createdBy,
            status: list_1.LIST_STATUS.ACTIVE,
            activityLogs: [],
            pendingChanges: [],
        });
        yield listRepository.save(list);
        return res.status(201).json({
            success: true,
            message: "List created successfully",
            data: list,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.createList = createList;
const addListItem = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { listId, itemId, quantity, interval, comment } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const customerId = (_b = req.customer) === null || _b === void 0 ? void 0 : _b.id;
        if (!listId || !itemId) {
            return next(new errorHandler_1.default("List ID and Item ID are required", 400));
        }
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const listItemRepository = database_1.AppDataSource.getRepository(list_1.ListItem);
        const list = yield listRepository.findOne({
            where: { id: listId },
            relations: ["items", "customer"],
        });
        if (!list) {
            return next(new errorHandler_1.default("List not found", 404));
        }
        const createdBy = yield createCreator(userId !== undefined ? userId : null, customerId !== undefined ? customerId : null);
        const itemData = yield fetchItemData(itemId);
        const userRole = getUserRole(userId, customerId);
        const performerId = userId || customerId || "system";
        const listItem = listItemRepository.create({
            itemNumber: itemId.toString(),
            item_no_de: itemData.itemNoDe,
            articleName: itemData.articleName,
            articleNumber: itemData.articleNumber,
            quantity: quantity,
            interval: interval || "monthly",
            comment,
            imageUrl: itemData.imageUrl,
            list,
            createdBy,
        });
        if (itemData.deliveries && Object.keys(itemData.deliveries).length > 0) {
            const deliveries = Object.assign({}, itemData.deliveries);
            for (const dateKey in deliveries) {
                deliveries[dateKey] = Object.assign(Object.assign({}, deliveries[dateKey]), { quantity: deliveries[dateKey].quantity });
            }
            listItem.deliveries = deliveries;
        }
        yield listItemRepository.save(listItem);
        list.items = [...(list.items || []), listItem];
        // Add activity log using the new simplified method
        list.addActivityLog(`${userRole} added item ${itemData.articleName} to the list`, userRole, performerId, listItem.id, "item_added", null, itemData.articleName);
        yield listRepository.save(list);
        return res.status(201).json({
            success: true,
            message: "Item added to list successfully",
            data: listItem,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.addListItem = addListItem;
const updateListItem = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { itemId } = req.params;
        const { quantity, interval, marked, deliveries, articleName, articleNumber, imageUrl, item_no_de, } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const customerId = (_b = req.customer) === null || _b === void 0 ? void 0 : _b.id;
        if (!itemId) {
            return next(new errorHandler_1.default("Item ID is required", 400));
        }
        console.log("Request body:", req.body);
        const listItemRepository = database_1.AppDataSource.getRepository(list_1.ListItem);
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        // Fetch item with list and ensure relations are loaded
        const item = yield listItemRepository.findOne({
            where: { id: itemId },
            relations: ["list", "list.customer"],
        });
        if (!item) {
            return next(new errorHandler_1.default("List item not found", 404));
        }
        // Fetch list explicitly to ensure activityLogs is loaded
        const list = yield listRepository.findOne({
            where: { id: item.list.id },
            relations: ["customer", "items"],
        });
        if (!list) {
            return next(new errorHandler_1.default("Associated list not found", 404));
        }
        // Initialize activityLogs and pendingChanges if null
        if (!list.activityLogs) {
            list.activityLogs = [];
        }
        if (!list.pendingChanges) {
            list.pendingChanges = [];
        }
        const performerId = userId || customerId || "system";
        const userRole = getUserRole(userId, customerId);
        // Track what fields actually changed
        const changedFields = [];
        // Normalize nullable fields to avoid comparison issues
        const normalizeValue = (value) => (value === undefined ? null : value);
        // Update fields using the item's updateField method
        if (quantity !== undefined && normalizeValue(quantity) !== item.quantity) {
            if (item.updateField("quantity", normalizeValue(quantity), userRole, performerId)) {
                changedFields.push("quantity");
            }
        }
        if (interval !== undefined && normalizeValue(interval) !== item.interval) {
            if (item.updateField("interval", normalizeValue(interval), userRole, performerId)) {
                changedFields.push("interval");
            }
        }
        if (articleName !== undefined &&
            normalizeValue(articleName) !== item.articleName) {
            if (item.updateField("articleName", normalizeValue(articleName), userRole, performerId)) {
                changedFields.push("articleName");
            }
        }
        if (articleNumber !== undefined &&
            normalizeValue(articleNumber) !== item.articleNumber) {
            if (item.updateField("articleNumber", normalizeValue(articleNumber), userRole, performerId)) {
                changedFields.push("articleNumber");
            }
        }
        if (imageUrl !== undefined && normalizeValue(imageUrl) !== item.imageUrl) {
            if (item.updateField("imageUrl", normalizeValue(imageUrl), userRole, performerId)) {
                changedFields.push("imageUrl");
            }
        }
        if (item_no_de !== undefined &&
            normalizeValue(item_no_de) !== item.item_no_de) {
            if (item.updateField("item_no_de", normalizeValue(item_no_de), userRole, performerId)) {
                changedFields.push("item_no_de");
            }
        }
        const namee = userRole === list_1.USER_ROLE.CUSTOMER
            ? (_c = req.customer) === null || _c === void 0 ? void 0 : _c.companyName
            : req.name;
        if (marked !== undefined && marked !== item.marked) {
            const oldValue = item.marked;
            item.marked = marked;
            list.logFieldChange("marked", oldValue, marked, userRole, namee, performerId, item.id, item.articleName);
            changedFields.push("marked");
        }
        // Handle delivery updates with validation
        if (deliveries) {
            if (typeof deliveries !== "object" || Array.isArray(deliveries)) {
                return next(new errorHandler_1.default("Invalid deliveries format", 400));
            }
            Object.entries(deliveries).forEach(([period, deliveryData]) => {
                if (deliveryData && typeof deliveryData === "object") {
                    item.updateDelivery(period, deliveryData, userRole, performerId);
                    changedFields.push(`delivery_${period}`);
                }
            });
        }
        const logss = item.getActivityLogs();
        const existingLogIds = new Set(list.activityLogs.map((log) => log.id));
        const uniqueLogs = logss.filter((log) => !existingLogIds.has(log.id));
        list.activityLogs = [...list.activityLogs, ...uniqueLogs];
        yield database_1.AppDataSource.transaction((transactionalEntityManager) => __awaiter(void 0, void 0, void 0, function* () {
            yield transactionalEntityManager.save(list_1.ListItem, item);
            yield transactionalEntityManager.save(list_1.List, list);
        }));
        // Check if there are pending changes for highlighting
        const hasPendingChanges = item.hasUnacknowledgedCustomerChanges();
        const highlightedFields = (0, list_1.getHighlightedFields)(item);
        return res.status(200).json({
            success: true,
            message: "List item updated successfully",
            data: Object.assign(Object.assign({}, item), { hasPendingChanges,
                highlightedFields }),
            changedFields: changedFields.length > 0 ? changedFields : undefined,
        });
    }
    catch (error) {
        console.error("Error in updateListItem:", error);
        return next(error);
    }
});
exports.updateListItem = updateListItem;
// Separate controller for updating only comments with logging
const updateListItemComment = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { itemId } = req.params;
        const { comment } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const customerId = (_b = req.customer) === null || _b === void 0 ? void 0 : _b.id;
        if (!itemId) {
            return next(new errorHandler_1.default("Item ID is required", 400));
        }
        console.log("Updating comment for item:", itemId);
        console.log("New comment:", comment);
        const listItemRepository = database_1.AppDataSource.getRepository(list_1.ListItem);
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        // Fetch item with list relation
        const item = yield listItemRepository.findOne({
            where: { id: itemId },
            relations: ["list"],
        });
        if (!item) {
            return next(new errorHandler_1.default("List item not found", 404));
        }
        // Fetch the associated list
        const list = yield listRepository.findOne({
            where: { id: item.list.id },
        });
        if (!list) {
            return next(new errorHandler_1.default("Associated list not found", 404));
        }
        const performerId = userId || customerId || "system";
        const userRole = getUserRole(userId, customerId);
        // Store old comment for logging
        const oldComment = item.comment;
        // Check if comment actually changed
        if (comment === undefined || comment === item.comment) {
            return res.status(200).json({
                success: true,
                message: "No changes detected",
                data: item,
            });
        }
        // Update the comment directly
        item.comment = comment;
        const namee = userRole === list_1.USER_ROLE.CUSTOMER
            ? (_c = req.customer) === null || _c === void 0 ? void 0 : _c.companyName
            : req.user.name;
        // Log the change to the list activity logs
        if (list) {
            list.logFieldChange("comment", oldComment, comment, userRole, namee, performerId, item.id, item.articleName);
        }
        // Save both item and list
        yield listItemRepository.save(item);
        if (list) {
            yield listRepository.save(list);
        }
        console.log("Comment updated successfully:", item.comment);
        // Check if there are pending changes for highlighting
        const hasPendingChanges = item.hasUnacknowledgedCustomerChanges();
        const highlightedFields = (0, list_1.getHighlightedFields)(item);
        return res.status(200).json({
            success: true,
            message: "Comment updated successfully",
            data: Object.assign(Object.assign({}, item), { hasPendingChanges,
                highlightedFields }),
        });
    }
    catch (error) {
        console.error("Error updating comment:", error);
        return next(error);
    }
});
exports.updateListItemComment = updateListItemComment;
// 4. Update Delivery Info
const updateDeliveryInfo = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { itemId } = req.params;
        const { period, quantity, status, remark, cargoStatus, shippedAt, eta, cargoType, cargoNo, } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = list_1.USER_ROLE.ADMIN;
        if (!itemId || !period) {
            return next(new errorHandler_1.default("Item ID and period are required", 400));
        }
        const listItemRepository = database_1.AppDataSource.getRepository(list_1.ListItem);
        const item = yield listItemRepository.findOne({
            where: { id: itemId },
            relations: ["list"],
        });
        if (!item) {
            return next(new errorHandler_1.default("List item not found", 404));
        }
        // Use the item's updateDelivery method which handles logging
        item.updateDelivery(period, {
            quantity,
            status,
            remark,
            cargoStatus,
            shippedAt,
            eta,
            cargoType,
            cargoNo,
        }, userRole, userId || "system");
        yield listItemRepository.save(item);
        // Save the list to persist the activity logs
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        yield listRepository.save(item.list);
        return res.status(200).json({
            success: true,
            message: "Delivery information updated successfully",
            data: item.deliveries[period],
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.updateDeliveryInfo = updateDeliveryInfo;
// 5. Get List with Items
const getListWithItems = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { listId } = req.params;
        if (!listId) {
            return next(new errorHandler_1.default("List ID is required", 400));
        }
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const list = yield listRepository.findOne({
            where: { id: listId },
            relations: ["items", "customer"],
        });
        if (!list) {
            return next(new errorHandler_1.default("List not found", 404));
        }
        if (list.items && list.items.length > 0) {
            const updatedItems = [];
            for (const item of list.items) {
                const updatedItem = yield updateLocalListItem(item);
                // Add unacknowledged fields information using new methods
                const highlightedFields = (0, list_1.getHighlightedFields)(updatedItem);
                const pendingChanges = updatedItem.getPendingChanges();
                const itemWithFieldStatus = Object.assign(Object.assign({}, updatedItem), { highlightedFields,
                    pendingChanges, hasPendingChanges: updatedItem.hasUnacknowledgedCustomerChanges(), needsAttention: updatedItem.needsAttention() });
                updatedItems.push(itemWithFieldStatus);
            }
            list.items = updatedItems;
            yield listRepository.save(list);
        }
        // Get pending changes using new method
        const pendingChanges = list.getPendingFieldChanges();
        const changesByField = (0, list_1.getPendingChangesByField)(list);
        return res.status(200).json({
            success: true,
            data: Object.assign(Object.assign({}, list), { items: list.items.map((item) => (Object.assign(Object.assign({}, item), { highlightedFields: (0, list_1.getHighlightedFields)(item), pendingChanges: item.getPendingChanges(), hasPendingChanges: item.hasUnacknowledgedCustomerChanges(), needsAttention: item.needsAttention() }))), pendingChangesCount: pendingChanges.length, pendingChanges, changesByField: Object.fromEntries(changesByField), activityLogs: list.getAllActivityLogs(), hasPendingChanges: list.hasPendingChanges() }),
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getListWithItems = getListWithItems;
// 6. Get Customer Deliveries
const getCustomerDeliveries = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId } = req.params;
        if (!customerId) {
            return next(new errorHandler_1.default("Customer ID is required", 400));
        }
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const customer = yield customerRepository.findOne({
            where: { id: customerId },
        });
        if (!customer) {
            return next(new errorHandler_1.default("Customer not found", 404));
        }
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const lists = yield listRepository.find({
            where: { customer: { id: customerId } },
            relations: ["items"],
        });
        const allDeliveries = [];
        for (const list of lists) {
            if (list.items && list.items.length > 0) {
                const updatedItems = [];
                for (const item of list.items) {
                    const updatedItem = yield updateLocalListItem(item);
                    updatedItems.push(updatedItem);
                    if (updatedItem.deliveries) {
                        Object.entries(updatedItem.deliveries).forEach(([period, delivery]) => {
                            allDeliveries.push({
                                id: updatedItem.id,
                                listId: list.id,
                                listName: list.name,
                                itemName: updatedItem.articleName,
                                articleNumber: updatedItem.articleNumber,
                                quantity: delivery.quantity || updatedItem.quantity,
                                scheduledDate: period,
                                status: delivery.status || list_1.DELIVERY_STATUS.PENDING,
                                deliveredAt: delivery.deliveredAt,
                                cargoNo: delivery.cargoNo || "",
                                cargoStatus: delivery.cargoStatus || "",
                                shippedAt: delivery.shippedAt || "",
                                eta: delivery.eta || "",
                                cargoType: delivery.cargoType || "",
                                interval: updatedItem.interval || "monthly",
                                imageUrl: updatedItem.imageUrl || null,
                                hasPendingChanges: updatedItem.hasUnacknowledgedCustomerChanges(),
                                highlightedFields: (0, list_1.getHighlightedFields)(updatedItem),
                            });
                        });
                    }
                }
                list.items = updatedItems;
                yield listRepository.save(list);
            }
        }
        allDeliveries.sort((a, b) => {
            const dateA = new Date(a.scheduledDate);
            const dateB = new Date(b.scheduledDate);
            return dateA.getTime() - dateB.getTime();
        });
        return res.status(200).json({
            success: true,
            data: allDeliveries,
        });
    }
    catch (error) {
        return next(new errorHandler_1.default("Failed to fetch customer deliveries", 500));
    }
});
exports.getCustomerDeliveries = getCustomerDeliveries;
// 7. Get Customer List
const getCustomerList = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId, listId } = req.params;
        if (!customerId || !listId) {
            return next(new errorHandler_1.default("Customer ID and List ID are required", 400));
        }
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const list = yield listRepository.findOne({
            where: { id: listId, customer: { id: customerId } },
            relations: ["items", "customer"],
        });
        if (!list) {
            return next(new errorHandler_1.default("List not found for this customer", 404));
        }
        if (list.items && list.items.length > 0) {
            const updatedItems = [];
            for (const item of list.items) {
                const updatedItem = yield updateLocalListItem(item);
                updatedItems.push(updatedItem);
            }
            list.items = updatedItems;
            yield listRepository.save(list);
        }
        const pendingChanges = list.getPendingFieldChanges();
        return res.status(200).json({
            success: true,
            data: Object.assign(Object.assign({}, list), { items: list.items.map((item) => (Object.assign(Object.assign({}, item), { highlightedFields: (0, list_1.getHighlightedFields)(item), hasPendingChanges: item.hasUnacknowledgedCustomerChanges() }))), pendingChangesCount: pendingChanges.length, hasPendingChanges: list.hasPendingChanges() }),
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getCustomerList = getCustomerList;
// 8. Delete List Item
const deleteListItem = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { itemId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const customerId = (_b = req.customer) === null || _b === void 0 ? void 0 : _b.id;
        if (!itemId) {
            return next(new errorHandler_1.default("Item ID is required", 400));
        }
        if (!userId && !customerId) {
            return next(new errorHandler_1.default("Authentication required", 401));
        }
        const listItemRepository = database_1.AppDataSource.getRepository(list_1.ListItem);
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const item = yield listItemRepository.findOne({
            where: { id: itemId },
            relations: ["list", "list.customer"],
        });
        if (!item) {
            return next(new errorHandler_1.default("List item not found", 404));
        }
        if (customerId && item.list.customer.id !== customerId) {
            return next(new errorHandler_1.default("Not authorized to delete this item", 403));
        }
        const performerId = userId || customerId || "system";
        const userRole = getUserRole(userId, customerId);
        // Log the deletion
        item.list.addActivityLog(`${userRole} deleted item ${item.articleName} from the list`, userRole, performerId, item.id, "item_deleted", item.articleName, null);
        yield listItemRepository.remove(item);
        yield listRepository.save(item.list);
        return res.status(200).json({
            success: true,
            message: "List item deleted successfully",
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.deleteListItem = deleteListItem;
// 9. Acknowledge List Item Changes - UPDATED
const acknowledgeListItemChanges = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { listId, itemId } = req.params;
        const { logIds, fields } = req.body; // Now supports both log IDs and field names
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!listId) {
            return next(new errorHandler_1.default("List ID is required", 400));
        }
        if (!itemId) {
            return next(new errorHandler_1.default("Item ID is required", 400));
        }
        const userRole = getUserRole(userId, undefined);
        if (userRole !== list_1.USER_ROLE.ADMIN) {
            return next(new errorHandler_1.default("Only admins can acknowledge changes", 403));
        }
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const list = yield listRepository.findOne({
            where: { id: listId },
            relations: ["items"],
        });
        if (!list) {
            return next(new errorHandler_1.default("List not found", 404));
        }
        // Find the specific item
        const item = list.items.find((listItem) => listItem.id === itemId);
        if (!item) {
            return next(new errorHandler_1.default("Item not found in the specified list", 404));
        }
        let acknowledgedCount = 0;
        // Acknowledge by log IDs if provided
        if (logIds && Array.isArray(logIds)) {
            list.acknowledgeCustomerChanges(userId, logIds);
            acknowledgedCount = logIds.length;
        }
        // Acknowledge by field names if provided
        if (fields && Array.isArray(fields)) {
            list.acknowledgeFieldChanges(userId, fields);
            acknowledgedCount += fields.length;
        }
        // If neither provided, acknowledge all pending changes for the item
        if (!logIds && !fields) {
            const itemPendingChanges = list.getItemPendingChanges(itemId);
            const fieldNames = itemPendingChanges.map((change) => change.field);
            list.acknowledgeFieldChanges(userId, fieldNames);
            acknowledgedCount = fieldNames.length;
        }
        yield listRepository.save(list);
        return res.status(200).json({
            success: true,
            message: `Successfully acknowledged ${acknowledgedCount} changes for item ${item.articleName}`,
            data: {
                itemId: item.id,
                itemNumber: item.itemNumber,
                acknowledgedCount,
                remainingPendingChanges: list.getItemPendingChanges(itemId).length,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.acknowledgeListItemChanges = acknowledgeListItemChanges;
// 10. Reject List Item Changes (Not applicable with new schema, keeping for compatibility)
const rejectListItemChanges = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { itemId } = req.params;
        const { reason } = req.body;
        if (!itemId || !reason) {
            return next(new errorHandler_1.default("Item ID and reason are required", 400));
        }
        // With the new schema, there's no concept of rejecting changes
        // They are simply logged and can be acknowledged
        return res.status(200).json({
            success: true,
            message: "Change rejection noted in activity log",
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.rejectListItemChanges = rejectListItemChanges;
// 11. Search Items
const searchItems = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { q } = req.query;
        if (!q || typeof q !== "string") {
            return next(new errorHandler_1.default("Search query is required", 400));
        }
        const connection = yield (0, misDb_1.getConnection)();
        const searchTerm = `%${q}%`;
        // Check if the search query is a numeric value (potentially an ItemID_DE)
        const isNumericSearch = !isNaN(Number(q));
        try {
            let query = `
            SELECT 
              id, 
              item_name AS name,
              ItemID_DE AS articleNumber,
              photo AS imageUrl
            FROM items 
            WHERE (item_name LIKE ? 
          `;
            const params = [searchTerm];
            // If it's a numeric search, also search by ItemID_DE
            if (isNumericSearch) {
                query += ` OR ItemID_DE = ?`;
                params.push(Number(q));
            }
            query += `)
            AND photo IS NOT NULL
            AND photo != ''
            LIMIT 10`;
            const [items] = yield connection.query(query, params);
            const results = items.map((item) => (Object.assign(Object.assign({}, item), { imageUrl: item.imageUrl })));
            return res.status(200).json({
                success: true,
                data: results,
            });
        }
        finally {
            connection.release();
        }
    }
    catch (error) {
        return next(error);
    }
});
exports.searchItems = searchItems;
// 12. Get Customer Lists - UPDATED
const getCustomerLists = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId } = req.params;
        console.log(customerId);
        if (!customerId) {
            return next(new errorHandler_1.default("Customer ID is required", 400));
        }
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const customer = yield customerRepository.findOne({
            where: { id: customerId },
        });
        if (!customer) {
            return next(new errorHandler_1.default("Customer not found", 404));
        }
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const lists = yield listRepository.find({
            where: { customer: { id: customerId } },
            relations: [
                "createdBy",
                "createdBy.user",
                "createdBy.customer",
                "items",
                "customer",
            ],
        });
        // Enhance lists with pending changes information
        const listsWithChanges = lists.map((list) => (Object.assign(Object.assign({}, list), { pendingChangesCount: list.getPendingFieldChanges().length, hasPendingChanges: list.hasPendingChanges() })));
        return res.status(200).json({
            success: true,
            data: listsWithChanges,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getCustomerLists = getCustomerLists;
const getAllLists = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { refresh = "false" } = req.query;
        const shouldRefresh = false;
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const listItemRepository = database_1.AppDataSource.getRepository(list_1.ListItem);
        console.log(`Fetching all lists. Refresh from MIS: ${shouldRefresh}`);
        // Fetch all lists with their relationships
        const lists = yield listRepository.find({
            relations: [
                "customer",
                "items",
                "createdBy.user",
                "createdBy.customer",
                "contactPerson",
            ],
            order: { createdAt: "DESC" },
        });
        console.log(`Found ${lists.length} lists`);
        let totalItems = 0;
        let refreshedItems = 0;
        let failedRefreshes = 0;
        // Refresh all items from MIS if requested
        if (shouldRefresh) {
            console.log("Refreshing all items from MIS...");
            for (const list of lists) {
                if (list.items && list.items.length > 0) {
                    totalItems += list.items.length;
                    console.log(`Refreshing ${list.items.length} items for list: ${list.name}`);
                    const updatedItems = [];
                    for (const item of list.items) {
                        try {
                            // Refresh item data from MIS
                            const refreshedItem = yield updateLocalListItem(item);
                            updatedItems.push(refreshedItem);
                            refreshedItems++;
                            // Update the item in the database
                            yield listItemRepository.save(refreshedItem);
                            console.log(`Successfully refreshed item: ${item.articleName}`);
                        }
                        catch (error) {
                            console.error(`Failed to refresh item ${item.id}:`, error);
                            updatedItems.push(item); // Keep the original item if refresh fails
                            failedRefreshes++;
                        }
                    }
                    // Update the list with refreshed items
                    list.items = updatedItems;
                    // Save the updated list
                    yield listRepository.save(list);
                    // Log the refresh activity for the list
                    list.addActivityLog(`System refreshed ${updatedItems.length} items from MIS`, list_1.USER_ROLE.ADMIN, "system", undefined, "list_refreshed");
                    yield listRepository.save(list);
                }
            }
            console.log(`Refresh completed: ${refreshedItems} items refreshed, ${failedRefreshes} failed`);
        }
        else {
            // Just count total items without refreshing
            totalItems = lists.reduce((count, list) => { var _a; return count + (((_a = list.items) === null || _a === void 0 ? void 0 : _a.length) || 0); }, 0);
        }
        // Enhance lists with pending changes information
        const listsWithChanges = lists.map((list) => {
            var _a, _b;
            return (Object.assign(Object.assign({}, list), { pendingChangesCount: list.getPendingFieldChanges().length, hasPendingChanges: list.hasPendingChanges(), 
                // Include refresh statistics for each list
                refreshStats: shouldRefresh
                    ? {
                        itemsRefreshed: ((_a = list.items) === null || _a === void 0 ? void 0 : _a.filter((item) => item.updatedAt > new Date(Date.now() - 60000) // Items updated in last minute
                        ).length) || 0,
                        totalItems: ((_b = list.items) === null || _b === void 0 ? void 0 : _b.length) || 0,
                    }
                    : undefined }));
        });
        return res.status(200).json({
            success: true,
            message: shouldRefresh
                ? `Fetched all lists and refreshed ${refreshedItems} items from MIS`
                : "Fetched all lists with current data",
            data: listsWithChanges,
        });
    }
    catch (error) {
        console.error("Error in getAllLists:", error);
        return next(new errorHandler_1.default("Failed to fetch lists", 500));
    }
});
exports.getAllLists = getAllLists;
// 14. Duplicate List
const duplicateList = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { listId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const customerId = (_b = req.customer) === null || _b === void 0 ? void 0 : _b.id;
        if (!listId) {
            return next(new errorHandler_1.default("List ID is required", 400));
        }
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const listItemRepository = database_1.AppDataSource.getRepository(list_1.ListItem);
        const originalList = yield listRepository.findOne({
            where: { id: listId },
            relations: ["items", "customer"],
        });
        if (!originalList) {
            return next(new errorHandler_1.default("List not found", 404));
        }
        const createdBy = yield createCreator(userId !== undefined ? userId : null, customerId !== undefined ? customerId : null);
        const newList = listRepository.create({
            name: `${originalList.name} (Copy)`,
            description: originalList.description,
            templateType: originalList.templateType,
            customer: originalList.customer,
            createdBy,
            status: list_1.LIST_STATUS.DRAFTED,
            activityLogs: [],
            pendingChanges: [],
        });
        yield listRepository.save(newList);
        if (originalList.items && originalList.items.length > 0) {
            for (const item of originalList.items) {
                const newItem = listItemRepository.create({
                    itemNumber: item.itemNumber || item.articleNumber,
                    item_no_de: item.item_no_de,
                    articleName: item.articleName,
                    articleNumber: item.articleNumber,
                    quantity: item.quantity,
                    interval: item.interval,
                    comment: item.comment,
                    imageUrl: item.imageUrl,
                    deliveries: item.deliveries,
                    list: newList,
                    createdBy,
                    marked: item.marked || false,
                });
                yield listItemRepository.save(newItem);
            }
        }
        const performerId = userId || customerId || "system";
        const userRole = getUserRole(userId, customerId);
        newList.addActivityLog(`${userRole} duplicated list from ${originalList.name}`, userRole, performerId, undefined, "list_duplicated", originalList.id, newList.id);
        yield listRepository.save(newList);
        return res.status(201).json({
            success: true,
            message: "List duplicated successfully",
            data: newList,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.duplicateList = duplicateList;
// 15. Update List
const updateList = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { listId } = req.params;
        const { name, description, status } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const customerId = (_b = req.customer) === null || _b === void 0 ? void 0 : _b.id;
        if (!listId) {
            return next(new errorHandler_1.default("List ID is required", 400));
        }
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const list = yield listRepository.findOne({
            where: { id: listId },
            relations: ["customer"],
        });
        if (!list) {
            return next(new errorHandler_1.default("List not found", 404));
        }
        const performerId = userId || customerId || "system";
        const userRole = getUserRole(userId, customerId);
        const namee = userRole === list_1.USER_ROLE.CUSTOMER
            ? (_c = req.customer) === null || _c === void 0 ? void 0 : _c.companyName
            : req.user.name;
        const changes = [];
        if (name !== undefined && name !== list.name) {
            list.logFieldChange("name", list.name, namee, userRole, namee, performerId);
            list.name = name;
            changes.push("name");
        }
        if (description !== undefined && description !== list.description) {
            list.logFieldChange("description", list.description, description, userRole, namee, performerId);
            list.description = description;
            changes.push("description");
        }
        if (status !== undefined && status !== list.status) {
            list.logFieldChange("status", list.status, status, userRole, namee, performerId);
            list.status = status;
            changes.push("status");
        }
        if (changes.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No changes detected",
                data: list,
            });
        }
        yield listRepository.save(list);
        return res.status(200).json({
            success: true,
            message: "List updated successfully",
            data: list,
            changedFields: changes,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.updateList = updateList;
// 16. Delete List
const deleteList = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { listId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const customerId = (_b = req.customer) === null || _b === void 0 ? void 0 : _b.id;
        if (!listId) {
            return next(new errorHandler_1.default("List ID is required", 400));
        }
        if (!userId && !customerId) {
            return next(new errorHandler_1.default("Authentication required", 401));
        }
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const list = yield listRepository.findOne({
            where: { id: listId },
            relations: ["items", "customer"],
        });
        if (!list) {
            return next(new errorHandler_1.default("List not found", 404));
        }
        if (customerId && list.customer.id !== customerId) {
            return next(new errorHandler_1.default("Not authorized to delete this list", 403));
        }
        // Check if list has any items
        if (list.items && list.items.length > 0) {
            return next(new errorHandler_1.default("Cannot delete list. List contains items. Please delete all items first.", 400));
        }
        // Delete the list
        yield listRepository.remove(list);
        return res.status(200).json({
            success: true,
            message: "List deleted successfully",
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.deleteList = deleteList;
// 17. Search Lists by List Number
const searchListsByNumber = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { listNumber } = req.params;
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const list = yield listRepository.findOne({
            where: { listNumber },
            relations: ["items", "customer", "createdBy.user", "createdBy.customer"],
        });
        if (!list) {
            return next(new errorHandler_1.default("List not found", 404));
        }
        const pendingChanges = list.getPendingFieldChanges();
        return res.status(200).json({
            success: true,
            data: Object.assign(Object.assign({}, list), { pendingChangesCount: pendingChanges.length, hasPendingChanges: list.hasPendingChanges() }),
        });
    }
    catch (error) {
        return next(new errorHandler_1.default("Failed to search lists", 500));
    }
});
exports.searchListsByNumber = searchListsByNumber;
// 18. Get Lists by Company Name
const getListsByCompanyName = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyName } = req.params;
        if (!companyName) {
            return next(new errorHandler_1.default("Company name is required", 400));
        }
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const customer = yield customerRepository
            .createQueryBuilder("customer")
            .where("LOWER(customer.companyName) = LOWER(:companyName)", {
            companyName,
        })
            .select(["customer.id"])
            .getOne();
        if (!customer) {
            return next(new errorHandler_1.default("Customer not found", 404));
        }
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const lists = yield listRepository.find({
            where: { customer: { id: customer.id } },
            relations: ["items", "customer", "createdBy.user", "createdBy.customer"],
            order: { createdAt: "DESC" },
        });
        const listsWithChanges = lists.map((list) => (Object.assign(Object.assign({}, list), { pendingChangesCount: list.getPendingFieldChanges().length, hasPendingChanges: list.hasPendingChanges() })));
        return res.status(200).json({
            success: true,
            data: listsWithChanges,
        });
    }
    catch (error) {
        return next(new errorHandler_1.default("Failed to fetch lists by company name", 500));
    }
});
exports.getListsByCompanyName = getListsByCompanyName;
// 19. Bulk Acknowledge Changes - UPDATED
const bulkAcknowledgeChanges = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { listIds, itemIds, fields } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!listIds || !Array.isArray(listIds) || listIds.length === 0) {
            return next(new errorHandler_1.default("List IDs array is required", 400));
        }
        const userRole = getUserRole(userId, undefined);
        if (userRole !== list_1.USER_ROLE.ADMIN) {
            return next(new errorHandler_1.default("Only admins can acknowledge changes", 403));
        }
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const lists = yield listRepository.find({
            where: { id: (0, typeorm_1.In)(listIds) },
        });
        if (lists.length === 0) {
            return next(new errorHandler_1.default("No lists found", 404));
        }
        let totalAcknowledgedCount = 0;
        const results = [];
        for (const list of lists) {
            const pendingBefore = list.getPendingFieldChanges().length;
            if (itemIds && Array.isArray(itemIds)) {
                // Acknowledge changes for specific items
                for (const itemId of itemIds) {
                    const itemPendingChanges = list.getItemPendingChanges(itemId);
                    const fieldNames = itemPendingChanges.map((change) => change.field);
                    list.acknowledgeFieldChanges(userId, fieldNames);
                    totalAcknowledgedCount += fieldNames.length;
                }
            }
            else if (fields && Array.isArray(fields)) {
                // Acknowledge specific fields across the list
                list.acknowledgeFieldChanges(userId, fields);
                totalAcknowledgedCount += fields.length;
            }
            else {
                // Acknowledge all changes in the list
                const pendingChanges = list.getPendingFieldChanges();
                const fieldNames = pendingChanges.map((change) => change.field);
                list.acknowledgeFieldChanges(userId, fieldNames);
                totalAcknowledgedCount += fieldNames.length;
            }
            const pendingAfter = list.getPendingFieldChanges().length;
            const acknowledgedCount = pendingBefore - pendingAfter;
            yield listRepository.save(list);
            results.push({
                listId: list.id,
                acknowledgedCount,
                remainingPending: pendingAfter,
            });
        }
        return res.status(200).json({
            success: true,
            message: `Acknowledged ${totalAcknowledgedCount} changes across ${lists.length} lists`,
            data: {
                totalAcknowledgedCount,
                processedLists: lists.length,
                results,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.bulkAcknowledgeChanges = bulkAcknowledgeChanges;
// 20. Get Pending Changes for Admin Dashboard
const getPendingChangesForAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const lists = yield listRepository.find({
            relations: ["customer", "items"],
        });
        const pendingChangesSummary = lists.map((list) => {
            var _a;
            const pendingChanges = list.getPendingFieldChanges();
            const changesByField = (0, list_1.getPendingChangesByField)(list);
            return {
                listId: list.id,
                listName: list.name,
                customerName: (_a = list.customer) === null || _a === void 0 ? void 0 : _a.companyName,
                pendingChangesCount: pendingChanges.length,
                changesByField: Object.fromEntries(changesByField),
                itemsWithChanges: list.items
                    .filter((item) => item.hasUnacknowledgedCustomerChanges())
                    .map((item) => ({
                    itemId: item.id,
                    itemName: item.articleName,
                    highlightedFields: (0, list_1.getHighlightedFields)(item),
                    pendingChanges: item.getPendingChanges(),
                })),
            };
        });
        const totalPendingChanges = pendingChangesSummary.reduce((total, list) => total + list.pendingChangesCount, 0);
        return res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalLists: lists.length,
                    totalPendingChanges,
                    listsWithPendingChanges: pendingChangesSummary.filter((list) => list.pendingChangesCount > 0).length,
                },
                detailed: pendingChangesSummary.filter((list) => list.pendingChangesCount > 0),
            },
        });
    }
    catch (error) {
        return next(new errorHandler_1.default("Failed to fetch pending changes", 500));
    }
});
exports.getPendingChangesForAdmin = getPendingChangesForAdmin;
// 21. Fetch All Lists and Items - UPDATED
const fetchAllListsAndItems = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const shouldRefresh = true;
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const listItemRepository = database_1.AppDataSource.getRepository(list_1.ListItem);
        console.log(`Fetching all lists and items. Refresh from MIS: ${shouldRefresh}`);
        // Fetch all lists with their relationships
        const lists = yield listRepository.find({
            relations: ["customer", "items", "createdBy.user", "createdBy.customer"],
            order: { createdAt: "DESC" },
        });
        console.log(`Found ${lists.length} lists`);
        let totalItems = 0;
        let refreshedItems = 0;
        let failedRefreshes = 0;
        // Process each list and its items
        for (const list of lists) {
            if (list.items && list.items.length > 0) {
                totalItems += list.items.length;
                console.log(`Processing list ${list.name} with ${list.items.length} items`);
                if (shouldRefresh) {
                    const updatedItems = [];
                    for (const item of list.items) {
                        try {
                            // Refresh item data from MIS
                            const refreshedItem = yield updateLocalListItem(item);
                            updatedItems.push(refreshedItem);
                            refreshedItems++;
                            // Also update the item in the database
                            yield listItemRepository.save(refreshedItem);
                        }
                        catch (error) {
                            console.error(`Failed to refresh item ${item.id}:`, error);
                            updatedItems.push(item); // Keep the original item if refresh fails
                            failedRefreshes++;
                        }
                    }
                    list.items = updatedItems;
                    // Save the updated list
                    yield listRepository.save(list);
                }
            }
        }
        // Enhance lists with pending changes information
        const listsWithChanges = lists.map((list) => (Object.assign(Object.assign({}, list), { pendingChangesCount: list.getPendingFieldChanges().length, hasPendingChanges: list.hasPendingChanges(), activityLogs: list.getAllActivityLogs() })));
        console.log(`Successfully processed ${lists.length} lists with ${totalItems} items`);
        if (shouldRefresh) {
            console.log(`Refreshed ${refreshedItems} items from MIS, ${failedRefreshes} failed`);
        }
        return res.status(200).json({
            success: true,
            message: shouldRefresh
                ? `Fetched all lists and refreshed ${refreshedItems} items from MIS`
                : "Fetched all lists with current data",
            data: {
                lists: listsWithChanges,
                statistics: {
                    totalLists: lists.length,
                    totalItems,
                    refreshedItems: shouldRefresh ? refreshedItems : undefined,
                    failedRefreshes: shouldRefresh ? failedRefreshes : undefined,
                    refreshTimestamp: shouldRefresh
                        ? new Date().toISOString()
                        : undefined,
                },
            },
        });
    }
    catch (error) {
        console.error("Error fetching all lists and items:", error);
        return next(new errorHandler_1.default("Failed to fetch all lists and items", 500));
    }
});
exports.fetchAllListsAndItems = fetchAllListsAndItems;
// 22. Refresh Specific Items from MIS
const refreshItemsFromMIS = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { itemIds } = req.body;
        if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
            return next(new errorHandler_1.default("Array of item IDs is required", 400));
        }
        const listItemRepository = database_1.AppDataSource.getRepository(list_1.ListItem);
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        console.log(`Refreshing ${itemIds.length} items from MIS`);
        const items = yield listItemRepository.find({
            where: { id: (0, typeorm_1.In)(itemIds) },
            relations: ["list"],
        });
        if (items.length === 0) {
            return next(new errorHandler_1.default("No items found with the provided IDs", 404));
        }
        let refreshedCount = 0;
        let failedCount = 0;
        const refreshedItems = [];
        for (const item of items) {
            try {
                const refreshedItem = yield updateLocalListItem(item);
                yield listItemRepository.save(refreshedItem);
                refreshedItems.push(refreshedItem);
                refreshedCount++;
                // Log the refresh activity
                if (item.list) {
                    item.list.addActivityLog(`System refreshed item ${item.articleName} from MIS`, list_1.USER_ROLE.ADMIN, "system", item.id, "item_refreshed");
                    yield listRepository.save(item.list);
                }
            }
            catch (error) {
                console.error(`Failed to refresh item ${item.id}:`, error);
                failedCount++;
            }
        }
        return res.status(200).json({
            success: true,
            message: `Refreshed ${refreshedCount} items from MIS${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
            data: {
                refreshedItems,
                statistics: {
                    totalRequested: itemIds.length,
                    successfullyRefreshed: refreshedCount,
                    failed: failedCount,
                    refreshTimestamp: new Date().toISOString(),
                },
            },
        });
    }
    catch (error) {
        console.error("Error refreshing items from MIS:", error);
        return next(new errorHandler_1.default("Failed to refresh items from MIS", 500));
    }
});
exports.refreshItemsFromMIS = refreshItemsFromMIS;
// 23. Get List Item with MIS Refresh - UPDATED
const getListItemWithRefresh = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { itemId } = req.params;
        const { refresh = "true" } = req.query;
        const shouldRefresh = refresh === "true";
        if (!itemId) {
            return next(new errorHandler_1.default("Item ID is required", 400));
        }
        const listItemRepository = database_1.AppDataSource.getRepository(list_1.ListItem);
        const item = yield listItemRepository.findOne({
            where: { id: itemId },
            relations: ["list", "list.customer"],
        });
        if (!item) {
            return next(new errorHandler_1.default("List item not found", 404));
        }
        let refreshedItem = item;
        if (shouldRefresh) {
            try {
                refreshedItem = yield updateLocalListItem(item);
                yield listItemRepository.save(refreshedItem);
                // Log the refresh activity
                if (refreshedItem.list) {
                    refreshedItem.list.addActivityLog(`System refreshed item ${refreshedItem.articleName} from MIS`, list_1.USER_ROLE.ADMIN, "system", refreshedItem.id, "item_refreshed");
                    yield database_1.AppDataSource.getRepository(list_1.List).save(refreshedItem.list);
                }
            }
            catch (error) {
                console.error(`Failed to refresh item ${itemId}:`, error);
            }
        }
        // Add pending changes information
        const hasPendingChanges = refreshedItem.hasUnacknowledgedCustomerChanges();
        const highlightedFields = (0, list_1.getHighlightedFields)(refreshedItem);
        const pendingChanges = refreshedItem.getPendingChanges();
        return res.status(200).json({
            success: true,
            message: shouldRefresh
                ? "Item fetched and refreshed from MIS"
                : "Item fetched",
            data: Object.assign(Object.assign({}, refreshedItem), { hasPendingChanges,
                highlightedFields,
                pendingChanges, needsAttention: refreshedItem.needsAttention() }),
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getListItemWithRefresh = getListItemWithRefresh;
// 24. Acknowledge Field Changes for Specific Item
const acknowledgeItemFieldChanges = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { listId, itemId } = req.params;
        const { fields } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!listId || !itemId || !fields || !Array.isArray(fields)) {
            return next(new errorHandler_1.default("List ID, Item ID, and fields array are required", 400));
        }
        const userRole = getUserRole(userId, undefined);
        if (userRole !== list_1.USER_ROLE.ADMIN) {
            return next(new errorHandler_1.default("Only admins can acknowledge changes", 403));
        }
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const list = yield listRepository.findOne({
            where: { id: listId },
        });
        if (!list) {
            return next(new errorHandler_1.default("List not found", 404));
        }
        // Use the utility function to acknowledge item changes
        (0, list_1.acknowledgeItemChanges)(list, itemId, userId);
        yield listRepository.save(list);
        return res.status(200).json({
            success: true,
            message: `Acknowledged changes for ${fields.length} fields`,
            data: {
                itemId,
                acknowledgedFields: fields,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.acknowledgeItemFieldChanges = acknowledgeItemFieldChanges;
const updateListContactPerson = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { listId } = req.params;
        const { contactPersonId } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!listId) {
            return next(new errorHandler_1.default("List ID is required", 400));
        }
        const listRepository = database_1.AppDataSource.getRepository(list_1.List);
        const contactPersonRepository = database_1.AppDataSource.getRepository(contact_person_1.ContactPerson);
        const list = yield listRepository.findOne({
            where: { id: listId },
            relations: ["customer.starBusinessDetails", "contactPerson"],
        });
        if (!list) {
            return next(new errorHandler_1.default("List not found", 404));
        }
        let contactPerson = null;
        if (contactPersonId) {
            contactPerson = yield contactPersonRepository.findOne({
                where: { id: contactPersonId },
                relations: ["starBusinessDetails"],
            });
            if (!contactPerson) {
                return next(new errorHandler_1.default("Contact person not found", 404));
            }
            // console.log(contactPerson.starBusinessDetails.id, list.customer);
            // Validate that contact person belongs to the same company
            if (contactPerson.starBusinessDetailsId !==
                ((_c = (_b = list === null || list === void 0 ? void 0 : list.customer) === null || _b === void 0 ? void 0 : _b.starBusinessDetails) === null || _c === void 0 ? void 0 : _c.id)) {
                return next(new errorHandler_1.default("Contact person does not belong to this company", 400));
            }
        }
        // Store old contact person for logging
        const oldContactPerson = list.contactPerson;
        // Update the contact person
        list.contactPerson = contactPerson;
        // Add activity log
        const action = contactPerson
            ? `assigned contact person ${contactPerson.name} ${contactPerson.familyName} to the list`
            : "removed contact person from the list";
        list.addActivityLog(`Admin ${action}`, list_1.USER_ROLE.ADMIN, userId || "system", undefined, "contact_person_updated");
        yield listRepository.save(list);
        return res.status(200).json({
            success: true,
            message: "Contact person updated successfully",
            data: {
                list: {
                    id: list.id,
                    contactPerson: contactPerson
                        ? {
                            id: contactPerson.id,
                            name: contactPerson.name,
                            familyName: contactPerson.familyName,
                            position: contactPerson.position,
                            email: contactPerson.email,
                            phone: contactPerson.phone,
                            linkedInLink: contactPerson.linkedInLink,
                        }
                        : null,
                },
            },
        });
    }
    catch (error) {
        console.error("Error in updateListContactPerson:", error);
        return next(error);
    }
});
exports.updateListContactPerson = updateListContactPerson;

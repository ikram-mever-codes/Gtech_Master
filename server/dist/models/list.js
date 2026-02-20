"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var List_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListItem = exports.List = exports.CustomerCreator = exports.UserCreator = exports.ListCreator = exports.DELIVERY_STATUS = exports.CHANGE_STATUS = exports.USER_ROLE = exports.LIST_STATUS = void 0;
exports.formatActivityMessage = formatActivityMessage;
exports.getUnacknowledgedChangesCount = getUnacknowledgedChangesCount;
exports.getItemsWithUnacknowledgedChanges = getItemsWithUnacknowledgedChanges;
exports.getPendingChangesByField = getPendingChangesByField;
exports.acknowledgeItemChanges = acknowledgeItemChanges;
exports.getHighlightedFields = getHighlightedFields;
const typeorm_1 = require("typeorm");
const customers_1 = require("./customers");
const users_1 = require("./users");
const database_1 = require("../config/database");
const contact_person_1 = require("./contact_person");
// Enums
var LIST_STATUS;
(function (LIST_STATUS) {
    LIST_STATUS["ACTIVE"] = "active";
    LIST_STATUS["DISABLED"] = "disabled";
    LIST_STATUS["DRAFTED"] = "drafted";
})(LIST_STATUS || (exports.LIST_STATUS = LIST_STATUS = {}));
var USER_ROLE;
(function (USER_ROLE) {
    USER_ROLE["ADMIN"] = "admin";
    USER_ROLE["CUSTOMER"] = "customer";
})(USER_ROLE || (exports.USER_ROLE = USER_ROLE = {}));
var CHANGE_STATUS;
(function (CHANGE_STATUS) {
    CHANGE_STATUS["ACKNOWLEDGED"] = "acknowledged";
    CHANGE_STATUS["PENDING"] = "pending";
})(CHANGE_STATUS || (exports.CHANGE_STATUS = CHANGE_STATUS = {}));
exports.DELIVERY_STATUS = {
    OPEN: "Open",
    PENDING: "Pending",
    IN_TRANSIT: "In Transit",
    PARTIALLY_DELIVERED: "Partially Delivered",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
    RETURNED: "Returned",
};
// List Creator entities (simplified)
let ListCreator = class ListCreator {
};
exports.ListCreator = ListCreator;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], ListCreator.prototype, "id", void 0);
exports.ListCreator = ListCreator = __decorate([
    (0, typeorm_1.Entity)(),
    (0, typeorm_1.TableInheritance)({ column: { type: "varchar", name: "creatorType" } })
], ListCreator);
let UserCreator = class UserCreator extends ListCreator {
};
exports.UserCreator = UserCreator;
__decorate([
    (0, typeorm_1.ManyToOne)(() => users_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", users_1.User)
], UserCreator.prototype, "user", void 0);
exports.UserCreator = UserCreator = __decorate([
    (0, typeorm_1.ChildEntity)("user")
], UserCreator);
let CustomerCreator = class CustomerCreator extends ListCreator {
};
exports.CustomerCreator = CustomerCreator;
__decorate([
    (0, typeorm_1.ManyToOne)(() => customers_1.Customer, { nullable: true }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", customers_1.Customer)
], CustomerCreator.prototype, "customer", void 0);
exports.CustomerCreator = CustomerCreator = __decorate([
    (0, typeorm_1.ChildEntity)("customer")
], CustomerCreator);
let List = List_1 = class List {
    generateListNumber() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.listNumber) {
                const customerPrefix = this.customer.companyName
                    .slice(0, 4)
                    .toUpperCase();
                const maxNumber = yield database_1.AppDataSource.getRepository(List_1).count({
                    where: {
                        customer: { id: this.customer.id },
                        listNumber: (0, typeorm_1.Like)(`${customerPrefix}-%`),
                    },
                });
                this.listNumber = `${customerPrefix}-${maxNumber + 1}`;
            }
        });
    }
    // Simple method to add activity log
    addActivityLog(message, userRole, userId, itemId, field, oldValue, newValue) {
        this.activityLogs = this.activityLogs || [];
        const log = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            message,
            userRole,
            userId,
            itemId,
            field,
            oldValue,
            newValue,
            timestamp: new Date(),
            acknowledged: userRole === USER_ROLE.ADMIN,
            changeStatus: userRole === USER_ROLE.ADMIN
                ? CHANGE_STATUS.ACKNOWLEDGED
                : CHANGE_STATUS.PENDING,
        };
        this.activityLogs = [...this.activityLogs, log];
    }
    // Track field changes for acknowledgment system
    trackFieldChange(field, oldValue, newValue, userRole, userId, itemId) {
        if (userRole === USER_ROLE.ADMIN) {
            return; // Admin changes don't need tracking for acknowledgment
        }
        this.pendingChanges = this.pendingChanges || [];
        const change = {
            field,
            oldValue,
            newValue,
            changedBy: userId,
            userRole,
            changedAt: new Date(),
            changeStatus: CHANGE_STATUS.PENDING,
        };
        // Remove any existing pending changes for the same field and item
        this.pendingChanges = this.pendingChanges.filter((change) => !(change.field === field && change.itemId === itemId));
        this.pendingChanges.push(change);
    }
    // Log field changes with tracking for acknowledgment
    logFieldChange(field, oldValue, newValue, userRole, name, userId, itemId, itemName) {
        const message = `${name} changed ${field} value from "${oldValue}" to "${newValue}" at ${new Date().toLocaleString()}`;
        this.addActivityLog(message, userRole, userId, itemId, field, oldValue, newValue);
        // Track for acknowledgment system
        this.trackFieldChange(field, oldValue, newValue, userRole, userId, itemId);
    }
    // Get unacknowledged customer changes
    getUnacknowledgedCustomerChanges() {
        return (this.activityLogs || []).filter((log) => log.userRole === USER_ROLE.CUSTOMER && !log.acknowledged);
    }
    // Get pending field changes that need acknowledgment
    getPendingFieldChanges() {
        return (this.pendingChanges || []).filter((change) => change.userRole === USER_ROLE.CUSTOMER &&
            change.changeStatus === CHANGE_STATUS.PENDING);
    }
    // Acknowledge customer changes
    acknowledgeCustomerChanges(adminUserId, logIds) {
        if (!this.activityLogs)
            return;
        const now = new Date();
        this.activityLogs.forEach((log) => {
            if (log.userRole === USER_ROLE.CUSTOMER &&
                !log.acknowledged &&
                (!logIds || logIds.includes(log.id))) {
                log.acknowledged = true;
                log.acknowledgedBy = adminUserId;
                log.acknowledgedAt = now;
                log.changeStatus = CHANGE_STATUS.ACKNOWLEDGED;
            }
        });
        // Also update pending changes
        if (this.pendingChanges) {
            this.pendingChanges.forEach((change) => {
                if (change.userRole === USER_ROLE.CUSTOMER &&
                    change.changeStatus === CHANGE_STATUS.PENDING &&
                    (!logIds ||
                        this.getLogIdsForFieldChange(change).some((id) => logIds.includes(id)))) {
                    change.changeStatus = CHANGE_STATUS.ACKNOWLEDGED;
                    change.acknowledgedBy = adminUserId;
                    change.acknowledgedAt = now;
                }
            });
            // Clean up acknowledged changes after a while (optional)
            this.cleanupAcknowledgedChanges();
        }
    }
    // Acknowledge specific field changes
    acknowledgeFieldChanges(adminUserId, fieldChanges) {
        if (!this.pendingChanges)
            return;
        const now = new Date();
        this.pendingChanges.forEach((change) => {
            if (fieldChanges.includes(change.field) &&
                change.changeStatus === CHANGE_STATUS.PENDING) {
                change.changeStatus = CHANGE_STATUS.ACKNOWLEDGED;
                change.acknowledgedBy = adminUserId;
                change.acknowledgedAt = now;
            }
        });
        // Update corresponding activity logs
        if (this.activityLogs) {
            this.activityLogs.forEach((log) => {
                if (log.userRole === USER_ROLE.CUSTOMER &&
                    !log.acknowledged &&
                    log.field &&
                    fieldChanges.includes(log.field)) {
                    log.acknowledged = true;
                    log.acknowledgedBy = adminUserId;
                    log.acknowledgedAt = now;
                    log.changeStatus = CHANGE_STATUS.ACKNOWLEDGED;
                }
            });
        }
    }
    // Helper method to get log IDs for a field change
    getLogIdsForFieldChange(change) {
        if (!this.activityLogs)
            return [];
        return this.activityLogs
            .filter((log) => log.field === change.field &&
            log.userRole === USER_ROLE.CUSTOMER &&
            !log.acknowledged)
            .map((log) => log.id);
    }
    // Clean up acknowledged changes (keep only recent ones)
    cleanupAcknowledgedChanges() {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        this.pendingChanges = this.pendingChanges.filter((change) => change.changeStatus === CHANGE_STATUS.PENDING ||
            (change.acknowledgedAt && change.acknowledgedAt > oneWeekAgo));
    }
    // Get activity logs for a specific item
    getItemActivityLogs(itemId) {
        return (this.activityLogs || []).filter((log) => log.itemId === itemId);
    }
    // Get pending changes for a specific item
    getItemPendingChanges(itemId) {
        return (this.pendingChanges || []).filter((change) => change.itemId === itemId);
    }
    // Get all activity logs sorted by timestamp (newest first)
    getAllActivityLogs() {
        return (this.activityLogs || []).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    // Check if list has any pending changes
    hasPendingChanges() {
        return this.getPendingFieldChanges().length > 0;
    }
};
exports.List = List;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], List.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: false, unique: false }),
    __metadata("design:type", String)
], List.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, unique: true }),
    __metadata("design:type", String)
], List.prototype, "listNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], List.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], List.prototype, "templateType", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ListCreator, {
        eager: true,
        cascade: ["insert", "update"],
        nullable: true,
    }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", ListCreator)
], List.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => customers_1.Customer, { nullable: false }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", customers_1.Customer)
], List.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: LIST_STATUS,
        default: LIST_STATUS.ACTIVE,
    }),
    __metadata("design:type", String)
], List.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ListItem, (item) => item.list, { cascade: true }),
    __metadata("design:type", Array)
], List.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Array)
], List.prototype, "activityLogs", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Array)
], List.prototype, "pendingChanges", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], List.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], List.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => contact_person_1.ContactPerson, {
        nullable: true,
        onDelete: "SET NULL",
    }),
    (0, typeorm_1.JoinColumn)({ name: "contact_person_id" }),
    __metadata("design:type", contact_person_1.ContactPerson)
], List.prototype, "contactPerson", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], List.prototype, "generateListNumber", null);
exports.List = List = List_1 = __decorate([
    (0, typeorm_1.Entity)()
], List);
let ListItem = class ListItem {
    // Enhanced updateField method with change tracking
    updateField(field, newValue, userRole, userId) {
        const oldValue = this[field];
        if (oldValue === newValue) {
            return false;
        }
        // Update the field
        this[field] = newValue;
        // Log the change in the parent list
        if (this.list) {
            this.list.logFieldChange(field, oldValue, newValue, userRole, userId, this.id, this.articleName);
        }
        return true;
    }
    // Update multiple fields at once
    updateFields(updates, userRole, userId) {
        const changedFields = [];
        Object.entries(updates).forEach(([field, newValue]) => {
            if (this.updateField(field, newValue, userRole, userId)) {
                changedFields.push(field);
            }
        });
        return changedFields;
    }
    // Update delivery information with change tracking
    updateDelivery(period, deliveryData, userRole, userId) {
        this.deliveries = this.deliveries || {};
        const currentDelivery = this.deliveries[period] || {};
        // Track changes for logging
        const changes = [];
        Object.entries(deliveryData).forEach(([key, newValue]) => {
            if (newValue !== undefined &&
                newValue !== currentDelivery[key]) {
                changes.push(`${key}: ${currentDelivery[key]} → ${newValue}`);
            }
        });
        // Update the delivery
        this.deliveries[period] = Object.assign(Object.assign(Object.assign({}, currentDelivery), deliveryData), { status: deliveryData.status || currentDelivery.status || exports.DELIVERY_STATUS.OPEN });
        // Log the delivery changes
        if (changes.length > 0 && this.list) {
            const message = `${userRole} updated delivery for period ${period}: ${changes.join(", ")} at ${new Date().toLocaleString()}`;
            this.list.addActivityLog(message, userRole, userId, this.id, `delivery_${period}`);
            // Track delivery changes for acknowledgment
            if (userRole === USER_ROLE.CUSTOMER) {
                this.list.trackFieldChange(`delivery_${period}`, currentDelivery, this.deliveries[period], userRole, userId, this.id);
            }
        }
    }
    // Get unacknowledged fields for this item
    getUnacknowledgedFields() {
        var _a;
        const unacknowledgedFields = new Set();
        const pendingChanges = ((_a = this.list) === null || _a === void 0 ? void 0 : _a.getItemPendingChanges(this.id)) || [];
        pendingChanges.forEach((change) => {
            if (change.changeStatus === CHANGE_STATUS.PENDING) {
                unacknowledgedFields.add(change.field);
            }
        });
        return unacknowledgedFields;
    }
    // Check if a specific field has pending changes
    hasPendingFieldChange(field) {
        var _a;
        const pendingChanges = ((_a = this.list) === null || _a === void 0 ? void 0 : _a.getItemPendingChanges(this.id)) || [];
        return pendingChanges.some((change) => change.field === field && change.changeStatus === CHANGE_STATUS.PENDING);
    }
    // Get the latest unacknowledged value for a field
    getLatestUnacknowledgedChange(field) {
        var _a;
        const pendingChanges = ((_a = this.list) === null || _a === void 0 ? void 0 : _a.getItemPendingChanges(this.id)) || [];
        const relevantChanges = pendingChanges
            .filter((change) => change.field === field &&
            change.changeStatus === CHANGE_STATUS.PENDING)
            .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
        return relevantChanges.length > 0 ? relevantChanges[0] : null;
    }
    // Get all activity logs for this item
    getActivityLogs() {
        var _a;
        return ((_a = this.list) === null || _a === void 0 ? void 0 : _a.getItemActivityLogs(this.id)) || [];
    }
    // Get all pending changes for this item
    getPendingChanges() {
        var _a;
        return ((_a = this.list) === null || _a === void 0 ? void 0 : _a.getItemPendingChanges(this.id)) || [];
    }
    // Check if this item has unacknowledged customer changes
    hasUnacknowledgedCustomerChanges() {
        return this.getPendingChanges().length > 0;
    }
    // Check if this item has any pending changes for highlighting
    needsAttention() {
        return this.hasUnacknowledgedCustomerChanges();
    }
};
exports.ListItem = ListItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], ListItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ListItem.prototype, "itemNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ListItem.prototype, "item_no_de", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], ListItem.prototype, "marked", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ListItem.prototype, "articleName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ListItem.prototype, "articleNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal" }),
    __metadata("design:type", Number)
], ListItem.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ListItem.prototype, "interval", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ListItem.prototype, "comment", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ListCreator, {
        eager: true,
        cascade: ["insert", "update"],
        nullable: false,
    }),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", ListCreator)
], ListItem.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ListItem.prototype, "imageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Object)
], ListItem.prototype, "deliveries", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => List, (list) => list.items),
    (0, typeorm_1.JoinColumn)(),
    __metadata("design:type", List)
], ListItem.prototype, "list", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ListItem.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ListItem.prototype, "updatedAt", void 0);
exports.ListItem = ListItem = __decorate([
    (0, typeorm_1.Entity)()
], ListItem);
// Enhanced Utility functions
function formatActivityMessage(username, field, oldValue, newValue, itemName) {
    return `${username} changed ${field} value from "${oldValue}" to "${newValue}" at ${new Date().toLocaleString()}`;
}
function getUnacknowledgedChangesCount(list) {
    return list.getPendingFieldChanges().length;
}
function getItemsWithUnacknowledgedChanges(list) {
    var _a;
    return (((_a = list.items) === null || _a === void 0 ? void 0 : _a.filter((item) => item.hasUnacknowledgedCustomerChanges())) || []);
}
// New utility functions for the acknowledgment system
function getPendingChangesByField(list) {
    const changesByField = new Map();
    list.getPendingFieldChanges().forEach((change) => {
        if (!changesByField.has(change.field)) {
            changesByField.set(change.field, []);
        }
        changesByField.get(change.field).push(change);
    });
    return changesByField;
}
function acknowledgeItemChanges(list, itemId, adminUserId) {
    const itemChanges = list.getItemPendingChanges(itemId);
    const fieldNames = itemChanges.map((change) => change.field);
    list.acknowledgeFieldChanges(adminUserId, fieldNames);
}
function getHighlightedFields(item) {
    return Array.from(item.getUnacknowledgedFields());
}

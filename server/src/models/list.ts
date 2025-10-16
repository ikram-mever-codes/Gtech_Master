import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  TableInheritance,
  ChildEntity,
  BeforeInsert,
  Like,
} from "typeorm";
import { Customer } from "./customers";
import { User } from "./users";
import { AppDataSource } from "../config/database";

// Enums
export enum LIST_STATUS {
  ACTIVE = "active",
  DISABLED = "disabled",
  DRAFTED = "drafted",
}

export enum USER_ROLE {
  ADMIN = "admin",
  CUSTOMER = "customer",
}

export enum CHANGE_STATUS {
  ACKNOWLEDGED = "acknowledged",
  PENDING = "pending",
}

export const DELIVERY_STATUS = {
  OPEN: "Open",
  PENDING: "Pending",
  IN_TRANSIT: "In Transit",
  PARTIALLY_DELIVERED: "Partially Delivered",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
} as const;

// Enhanced Activity Log Interface
interface ActivityLog {
  id: string;
  message: string;
  userRole: USER_ROLE;
  userId: string;
  itemId?: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  changeStatus: CHANGE_STATUS;
}

interface DeliveryInfo {
  quantity?: number;
  status: string;
  deliveredAt?: Date;
  shippedAt?: Date;
  remark?: string;
  eta?: number;
  cargoNo: string;
  cargoType: string;
  cargoStatus?: string;
}

// Field Change Tracking Interface
interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
  changedBy: string;
  userRole: USER_ROLE;
  changedAt: Date;
  changeStatus: CHANGE_STATUS;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

// List Creator entities (simplified)
@Entity()
@TableInheritance({ column: { type: "varchar", name: "creatorType" } })
export abstract class ListCreator {
  @PrimaryGeneratedColumn("uuid")
  id!: string;
}

@ChildEntity("user")
export class UserCreator extends ListCreator {
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  user!: User;
}

@ChildEntity("customer")
export class CustomerCreator extends ListCreator {
  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn()
  customer!: Customer;
}

@Entity()
export class List {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ nullable: false })
  name!: string;

  @Column({ nullable: true, unique: true })
  listNumber!: string;

  @Column({ nullable: true })
  description!: string;

  @Column({ nullable: true })
  templateType!: string;

  @ManyToOne(() => ListCreator, {
    eager: true,
    cascade: ["insert", "update"],
    nullable: true,
  })
  @JoinColumn()
  createdBy!: ListCreator;

  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn()
  customer!: Customer;

  @Column({
    type: "enum",
    enum: LIST_STATUS,
    default: LIST_STATUS.ACTIVE,
  })
  status!: LIST_STATUS;

  @OneToMany(() => ListItem, (item) => item.list, { cascade: true })
  items!: ListItem[];

  // Simplified activity logs - stored as JSON
  @Column({ type: "json", nullable: true })
  activityLogs!: ActivityLog[];

  // Field change tracking for acknowledgment system
  @Column({ type: "json", nullable: true })
  pendingChanges!: FieldChange[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  async generateListNumber() {
    if (!this.listNumber) {
      const customerPrefix = this.customer.companyName
        .slice(0, 4)
        .toUpperCase();

      const maxNumber = await AppDataSource.getRepository(List).count({
        where: {
          customer: { id: this.customer.id },
          listNumber: Like(`${customerPrefix}-%`),
        },
      });

      this.listNumber = `${customerPrefix}-${maxNumber + 1}`;
    }
  }

  // Simple method to add activity log
  addActivityLog(
    message: string,
    userRole: USER_ROLE,
    userId: string,
    itemId?: string,
    field?: string,
    oldValue?: any,
    newValue?: any
  ): void {
    this.activityLogs = this.activityLogs || [];
    const log: ActivityLog = {
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
      changeStatus:
        userRole === USER_ROLE.ADMIN
          ? CHANGE_STATUS.ACKNOWLEDGED
          : CHANGE_STATUS.PENDING,
    };

    this.activityLogs = [...this.activityLogs, log];
  }

  // Track field changes for acknowledgment system
  trackFieldChange(
    field: string,
    oldValue: any,
    newValue: any,
    userRole: USER_ROLE,
    userId: string,
    itemId?: string
  ): void {
    if (userRole === USER_ROLE.ADMIN) {
      return; // Admin changes don't need tracking for acknowledgment
    }

    this.pendingChanges = this.pendingChanges || [];

    const change: FieldChange = {
      field,
      oldValue,
      newValue,
      changedBy: userId,
      userRole,
      changedAt: new Date(),
      changeStatus: CHANGE_STATUS.PENDING,
    };

    // Remove any existing pending changes for the same field and item
    this.pendingChanges = this.pendingChanges.filter(
      (change: any) => !(change.field === field && change.itemId === itemId)
    );

    this.pendingChanges.push(change);
  }

  // Log field changes with tracking for acknowledgment
  logFieldChange(
    field: string,
    oldValue: any,
    newValue: any,
    userRole: USER_ROLE,
    name: string,
    userId: string,
    itemId?: string,
    itemName?: string
  ): void {
    const message = `${name} changed ${field} value from "${oldValue}" to "${newValue}" at ${new Date().toLocaleString()}`;

    this.addActivityLog(
      message,
      userRole,
      userId,
      itemId,
      field,
      oldValue,
      newValue
    );

    // Track for acknowledgment system
    this.trackFieldChange(field, oldValue, newValue, userRole, userId, itemId);
  }

  // Get unacknowledged customer changes
  getUnacknowledgedCustomerChanges(): ActivityLog[] {
    return (this.activityLogs || []).filter(
      (log) => log.userRole === USER_ROLE.CUSTOMER && !log.acknowledged
    );
  }

  // Get pending field changes that need acknowledgment
  getPendingFieldChanges(): FieldChange[] {
    return (this.pendingChanges || []).filter(
      (change) =>
        change.userRole === USER_ROLE.CUSTOMER &&
        change.changeStatus === CHANGE_STATUS.PENDING
    );
  }

  // Acknowledge customer changes
  acknowledgeCustomerChanges(adminUserId: string, logIds?: string[]): void {
    if (!this.activityLogs) return;

    const now = new Date();
    this.activityLogs.forEach((log) => {
      if (
        log.userRole === USER_ROLE.CUSTOMER &&
        !log.acknowledged &&
        (!logIds || logIds.includes(log.id))
      ) {
        log.acknowledged = true;
        log.acknowledgedBy = adminUserId;
        log.acknowledgedAt = now;
        log.changeStatus = CHANGE_STATUS.ACKNOWLEDGED;
      }
    });

    // Also update pending changes
    if (this.pendingChanges) {
      this.pendingChanges.forEach((change) => {
        if (
          change.userRole === USER_ROLE.CUSTOMER &&
          change.changeStatus === CHANGE_STATUS.PENDING &&
          (!logIds ||
            this.getLogIdsForFieldChange(change).some((id) =>
              logIds.includes(id)
            ))
        ) {
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
  acknowledgeFieldChanges(adminUserId: string, fieldChanges: string[]): void {
    if (!this.pendingChanges) return;

    const now = new Date();
    this.pendingChanges.forEach((change) => {
      if (
        fieldChanges.includes(change.field) &&
        change.changeStatus === CHANGE_STATUS.PENDING
      ) {
        change.changeStatus = CHANGE_STATUS.ACKNOWLEDGED;
        change.acknowledgedBy = adminUserId;
        change.acknowledgedAt = now;
      }
    });

    // Update corresponding activity logs
    if (this.activityLogs) {
      this.activityLogs.forEach((log) => {
        if (
          log.userRole === USER_ROLE.CUSTOMER &&
          !log.acknowledged &&
          log.field &&
          fieldChanges.includes(log.field)
        ) {
          log.acknowledged = true;
          log.acknowledgedBy = adminUserId;
          log.acknowledgedAt = now;
          log.changeStatus = CHANGE_STATUS.ACKNOWLEDGED;
        }
      });
    }
  }

  // Helper method to get log IDs for a field change
  private getLogIdsForFieldChange(change: FieldChange): string[] {
    if (!this.activityLogs) return [];

    return this.activityLogs
      .filter(
        (log) =>
          log.field === change.field &&
          log.userRole === USER_ROLE.CUSTOMER &&
          !log.acknowledged
      )
      .map((log) => log.id);
  }

  // Clean up acknowledged changes (keep only recent ones)
  private cleanupAcknowledgedChanges(): void {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    this.pendingChanges = this.pendingChanges.filter(
      (change) =>
        change.changeStatus === CHANGE_STATUS.PENDING ||
        (change.acknowledgedAt && change.acknowledgedAt > oneWeekAgo)
    );
  }

  // Get activity logs for a specific item
  getItemActivityLogs(itemId: string): ActivityLog[] {
    return (this.activityLogs || []).filter((log) => log.itemId === itemId);
  }

  // Get pending changes for a specific item
  getItemPendingChanges(itemId: string): FieldChange[] {
    return (this.pendingChanges || []).filter(
      (change: any) => change.itemId === itemId
    );
  }

  // Get all activity logs sorted by timestamp (newest first)
  getAllActivityLogs(): ActivityLog[] {
    return (this.activityLogs || []).sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // Check if list has any pending changes
  hasPendingChanges(): boolean {
    return this.getPendingFieldChanges().length > 0;
  }
}

@Entity()
export class ListItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  itemNumber!: string;

  @Column({ nullable: true })
  item_no_de!: string;

  @Column({ default: false })
  marked!: boolean;

  @Column()
  articleName!: string;

  @Column()
  articleNumber!: string;

  @Column({ type: "decimal" })
  quantity!: number;

  @Column()
  interval!: string;

  @Column({ nullable: true })
  comment!: string;

  @ManyToOne(() => ListCreator, {
    eager: true,
    cascade: ["insert", "update"],
    nullable: false,
  })
  @JoinColumn()
  createdBy!: ListCreator;

  @Column({ nullable: true })
  imageUrl!: string;

  @Column({ type: "json", nullable: true })
  deliveries!: {
    [period: string]: DeliveryInfo;
  };

  @ManyToOne(() => List, (list) => list.items)
  @JoinColumn()
  list!: List;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Enhanced updateField method with change tracking
  updateField(
    field: keyof ListItem,
    newValue: any,
    userRole: USER_ROLE,
    userId: string
  ): boolean {
    const oldValue = this[field];

    if (oldValue === newValue) {
      return false;
    }

    // Update the field
    (this as any)[field] = newValue;

    // Log the change in the parent list
    if (this.list) {
      this.list.logFieldChange(
        field as string,
        oldValue,
        newValue,
        userRole,
        userId,
        this.id,
        this.articleName
      );
    }

    return true;
  }

  // Update multiple fields at once
  updateFields(
    updates: Partial<ListItem>,
    userRole: USER_ROLE,
    userId: string
  ): string[] {
    const changedFields: string[] = [];

    Object.entries(updates).forEach(([field, newValue]) => {
      if (
        this.updateField(field as keyof ListItem, newValue, userRole, userId)
      ) {
        changedFields.push(field);
      }
    });

    return changedFields;
  }

  // Update delivery information with change tracking
  updateDelivery(
    period: string,
    deliveryData: Partial<DeliveryInfo>,
    userRole: USER_ROLE,
    userId: string
  ): void {
    this.deliveries = this.deliveries || {};
    const currentDelivery = this.deliveries[period] || {};

    // Track changes for logging
    const changes: string[] = [];

    Object.entries(deliveryData).forEach(([key, newValue]) => {
      if (
        newValue !== undefined &&
        newValue !== currentDelivery[key as keyof DeliveryInfo]
      ) {
        changes.push(
          `${key}: ${currentDelivery[key as keyof DeliveryInfo]} → ${newValue}`
        );
      }
    });

    // Update the delivery
    this.deliveries[period] = {
      ...currentDelivery,
      ...deliveryData,
      status:
        deliveryData.status || currentDelivery.status || DELIVERY_STATUS.OPEN,
    };

    // Log the delivery changes
    if (changes.length > 0 && this.list) {
      const message = `${userRole} updated delivery for period ${period}: ${changes.join(
        ", "
      )} at ${new Date().toLocaleString()}`;
      this.list.addActivityLog(
        message,
        userRole,
        userId,
        this.id,
        `delivery_${period}`
      );

      // Track delivery changes for acknowledgment
      if (userRole === USER_ROLE.CUSTOMER) {
        this.list.trackFieldChange(
          `delivery_${period}`,
          currentDelivery,
          this.deliveries[period],
          userRole,
          userId,
          this.id
        );
      }
    }
  }

  // Get unacknowledged fields for this item
  getUnacknowledgedFields(): Set<string> {
    const unacknowledgedFields = new Set<string>();
    const pendingChanges = this.list?.getItemPendingChanges(this.id) || [];

    pendingChanges.forEach((change) => {
      if (change.changeStatus === CHANGE_STATUS.PENDING) {
        unacknowledgedFields.add(change.field);
      }
    });

    return unacknowledgedFields;
  }

  // Check if a specific field has pending changes
  hasPendingFieldChange(field: string): boolean {
    const pendingChanges = this.list?.getItemPendingChanges(this.id) || [];
    return pendingChanges.some(
      (change) =>
        change.field === field && change.changeStatus === CHANGE_STATUS.PENDING
    );
  }

  // Get the latest unacknowledged value for a field
  getLatestUnacknowledgedChange(field: string): any {
    const pendingChanges = this.list?.getItemPendingChanges(this.id) || [];

    const relevantChanges = pendingChanges
      .filter(
        (change) =>
          change.field === field &&
          change.changeStatus === CHANGE_STATUS.PENDING
      )
      .sort(
        (a, b) =>
          new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
      );

    return relevantChanges.length > 0 ? relevantChanges[0] : null;
  }

  // Get all activity logs for this item
  getActivityLogs(): ActivityLog[] {
    return this.list?.getItemActivityLogs(this.id) || [];
  }

  // Get all pending changes for this item
  getPendingChanges(): FieldChange[] {
    return this.list?.getItemPendingChanges(this.id) || [];
  }

  // Check if this item has unacknowledged customer changes
  hasUnacknowledgedCustomerChanges(): boolean {
    return this.getPendingChanges().length > 0;
  }

  // Check if this item has any pending changes for highlighting
  needsAttention(): boolean {
    return this.hasUnacknowledgedCustomerChanges();
  }
}

// Enhanced Utility functions
export function formatActivityMessage(
  username: USER_ROLE,
  field: string,
  oldValue: any,
  newValue: any,
  itemName?: string
): string {
  return `${username} changed ${field} value from "${oldValue}" to "${newValue}" at ${new Date().toLocaleString()}`;
}

export function getUnacknowledgedChangesCount(list: List): number {
  return list.getPendingFieldChanges().length;
}

export function getItemsWithUnacknowledgedChanges(list: List): ListItem[] {
  return (
    list.items?.filter((item) => item.hasUnacknowledgedCustomerChanges()) || []
  );
}

// New utility functions for the acknowledgment system
export function getPendingChangesByField(
  list: List
): Map<string, FieldChange[]> {
  const changesByField = new Map<string, FieldChange[]>();

  list.getPendingFieldChanges().forEach((change) => {
    if (!changesByField.has(change.field)) {
      changesByField.set(change.field, []);
    }
    changesByField.get(change.field)!.push(change);
  });

  return changesByField;
}

export function acknowledgeItemChanges(
  list: List,
  itemId: string,
  adminUserId: string
): void {
  const itemChanges = list.getItemPendingChanges(itemId);
  const fieldNames = itemChanges.map((change) => change.field);

  list.acknowledgeFieldChanges(adminUserId, fieldNames);
}

export function getHighlightedFields(item: ListItem): string[] {
  return Array.from(item.getUnacknowledgedFields());
}

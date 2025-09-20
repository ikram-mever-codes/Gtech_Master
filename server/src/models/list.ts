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

export const DELIVERY_STATUS = {
  OPEN: "Open",
  PENDING: "Pending",
  IN_TRANSIT: "In Transit",
  PARTIALLY_DELIVERED: "Partially Delivered",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
} as const;

// Simple Activity Log Interface
interface ActivityLog {
  id: string;
  message: string; // Simple message format: "{userRole} changed {field} value from {from} to {to} at {Date}"
  userRole: USER_ROLE;
  userId: string;
  itemId?: string; // Optional - only for item-specific changes
  field?: string;
  oldValue?: any;
  newValue?: any;
  timestamp: Date;
  acknowledged: boolean; // Only for customer changes
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
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
    nullable: false,
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
      acknowledged: userRole === USER_ROLE.ADMIN, // Admin changes don't need acknowledgment
    };

    this.activityLogs = [...this.activityLogs, log];
  }

  // Log field changes with simple message format
  logFieldChange(
    field: string,
    oldValue: any,
    newValue: any,
    userRole: USER_ROLE,
    userId: string,
    itemId?: string,
    itemName?: string
  ): void {
    const message = `${userRole} changed ${field} value from "${oldValue}" to "${newValue}" at ${new Date().toLocaleString()}`;

    this.addActivityLog(
      message,
      userRole,
      userId,
      itemId,
      field,
      oldValue,
      newValue
    );
  }

  // Get unacknowledged customer changes
  getUnacknowledgedCustomerChanges(): ActivityLog[] {
    return (this.activityLogs || []).filter(
      (log) => log.userRole === USER_ROLE.CUSTOMER && !log.acknowledged
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
      }
    });
  }

  // Get activity logs for a specific item
  getItemActivityLogs(itemId: string): ActivityLog[] {
    return (this.activityLogs || []).filter((log) => log.itemId === itemId);
  }

  // Get all activity logs sorted by timestamp (newest first)
  getAllActivityLogs(): ActivityLog[] {
    return (this.activityLogs || []).sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
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

  // Simple method to update any field and log the change
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

    // // Update the field
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

  // Update delivery information
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
    }
  }

  getUnacknowledgedFields(): Set<string> {
    const unacknowledgedFields = new Set<string>();
    const itemLogs = this.getActivityLogs();

    itemLogs.forEach((log) => {
      if (
        log.userRole === USER_ROLE.CUSTOMER &&
        !log.acknowledged &&
        log.field
      ) {
        // Check if this is a delivery field
        if (log.field.startsWith("delivery_")) {
          unacknowledgedFields.add(log.field);
        } else {
          unacknowledgedFields.add(log.field);
        }
      }
    });

    return unacknowledgedFields;
  }

  // Also add a method to get the latest unacknowledged value for a field
  getLatestUnacknowledgedChange(field: string): any {
    const itemLogs = this.getActivityLogs();

    // Find the most recent unacknowledged change for this field
    const relevantLogs = itemLogs
      .filter(
        (log) =>
          log.userRole === USER_ROLE.CUSTOMER &&
          !log.acknowledged &&
          log.field === field
      )
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    return relevantLogs.length > 0 ? relevantLogs[0] : null;
  }
  // Get all activity logs for this item
  getActivityLogs(): ActivityLog[] {
    return this.list?.getItemActivityLogs(this.id) || [];
  }

  // Check if this item has unacknowledged customer changes
  hasUnacknowledgedCustomerChanges(): boolean {
    const itemLogs = this.getActivityLogs();
    return itemLogs.some(
      (log) => log.userRole === USER_ROLE.CUSTOMER && !log.acknowledged
    );
  }
}

// Utility functions
export function formatActivityMessage(
  userRole: USER_ROLE,
  field: string,
  oldValue: any,
  newValue: any,
  itemName?: string
): string {
  return `${userRole} changed ${field} value from "${oldValue}" to "${newValue}" at ${new Date().toLocaleString()}`;
}

export function getUnacknowledgedChangesCount(list: List): number {
  return list.getUnacknowledgedCustomerChanges().length;
}

export function getItemsWithUnacknowledgedChanges(list: List): ListItem[] {
  return (
    list.items?.filter((item) => item.hasUnacknowledgedCustomerChanges()) || []
  );
}

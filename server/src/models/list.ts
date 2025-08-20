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
  AfterLoad,
} from "typeorm";
import { Customer } from "./customers";
import { User } from "./users";
import { AppDataSource } from "../config/database";

export enum LIST_STATUS {
  ACTIVE = "active",
  DISABLED = "disabled",
  DRAFTED = "drafted",
}

export enum CHANGE_STATUS {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  REJECTED = "rejected",
}

export enum LOG_APPROVAL_STATUS {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum CHANGE_ORIGIN {
  ADMIN = "admin",
  CUSTOMER = "customer",
  SYSTEM = "system",
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
  @ManyToOne(() => Customer, {
    nullable: true,
  })
  @JoinColumn()
  customer!: Customer;
}

@Entity()
export class List {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ nullable: false })
  name!: string;

  @Column({
    nullable: true,
    unique: true,
  })
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

  @OneToMany(() => ListActivityLog, (log) => log.list, { cascade: true })
  activityLogs!: ListActivityLog[];

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

  logActivity(
    action: string,
    changes: Record<string, any>,
    performedById: string,
    performedByType: "user" | "customer",
    requiresApproval: boolean = false
  ) {
    const log = new ListActivityLog();
    log.action = action;
    log.changes = changes;
    log.performedById = performedById;
    log.performedByType = performedByType;
    log.performedAt = new Date();
    log.approvalStatus = requiresApproval
      ? LOG_APPROVAL_STATUS.PENDING
      : LOG_APPROVAL_STATUS.APPROVED;

    this.activityLogs = this.activityLogs || [];
    this.activityLogs.push(log);
    return log;
  }

  async approveActivityLog(logId: string) {
    if (!this.activityLogs) {
      throw new Error("Activity logs not loaded");
    }

    const log = this.activityLogs.find((log) => log.id === logId);
    if (log) {
      log.approvalStatus = LOG_APPROVAL_STATUS.APPROVED;
      log.approvedAt = new Date();
    }
    return log;
  }

  // Get all items with pending changes from a specific origin
  getItemsWithPendingChanges(origin?: CHANGE_ORIGIN): ListItem[] {
    return (
      this.items?.filter(
        (item) =>
          item.hasPendingChanges(origin) ||
          item.hasUnacknowledgedComments(origin)
      ) || []
    );
  }

  // Get changes that need acknowledgment by a specific role
  getChangesForAcknowledgment(acknowledgerRole: CHANGE_ORIGIN): ListItem[] {
    return (
      this.items?.filter((item) =>
        item.needsAcknowledgmentBy(acknowledgerRole)
      ) || []
    );
  }

  // Acknowledge all changes from a specific origin
  acknowledgeChangesFromOrigin(
    origin: CHANGE_ORIGIN,
    acknowledgedById: string,
    acknowledgedByType: "user" | "customer"
  ) {
    if (!this.items) return;

    this.items.forEach((item) => {
      if (
        item.changeOrigin === origin &&
        item.changeStatus === CHANGE_STATUS.PENDING
      ) {
        item.confirmChange(acknowledgedById, acknowledgedByType);
      }
      item.acknowledgeCommentsFromOrigin(
        origin,
        acknowledgedById,
        acknowledgedByType
      );
    });
  }
}

@Entity()
export class ListActivityLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  action!: string;

  @Column({ type: "json", nullable: true })
  changes!: Record<string, any>;

  @Column()
  performedById!: string;

  @Column({ type: "varchar" })
  performedByType!: "user" | "customer";

  @Column()
  performedAt!: Date;

  @Column({
    type: "enum",
    enum: LOG_APPROVAL_STATUS,
    default: LOG_APPROVAL_STATUS.PENDING,
  })
  approvalStatus!: LOG_APPROVAL_STATUS;

  @Column({ nullable: true })
  approvedAt!: Date;

  @Column({ nullable: true })
  rejectionReason!: string;

  @ManyToOne(() => List, (list) => list.activityLogs)
  @JoinColumn()
  list!: List;
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

  @Column({ type: "json", nullable: true })
  originalValues!: Record<string, any>;

  @Column({
    type: "enum",
    enum: CHANGE_STATUS,
    default: CHANGE_STATUS.CONFIRMED,
  })
  changeStatus!: CHANGE_STATUS;

  @Column({ nullable: true })
  changedById!: string;

  @Column({ nullable: true, type: "varchar" })
  changedByType!: "user" | "customer";

  @Column({ type: "enum", enum: CHANGE_ORIGIN, nullable: true })
  changeOrigin!: CHANGE_ORIGIN;

  @Column({ nullable: true })
  changedAt!: Date;

  @ManyToOne(() => ListCreator, {
    eager: true,
    cascade: ["insert", "update"],
    nullable: false,
  })
  @JoinColumn()
  createdBy!: ListCreator;

  @Column({ nullable: true })
  imageUrl!: string;

  @Column({ nullable: true })
  confirmedAt!: Date;

  @Column({ type: "json", nullable: true })
  deliveries!: {
    [period: string]: DeliveryInfo;
  };

  // Comment tracking with origin information
  @Column({ type: "json", nullable: true })
  commentHistory!: {
    text: string;
    addedById: string;
    addedByType: "user" | "customer";
    addedAt: Date;
    origin: CHANGE_ORIGIN;
    acknowledged: boolean;
    acknowledgedAt?: Date;
    acknowledgedById?: string;
    acknowledgedByType?: "user" | "customer";
    acknowledgedByOrigin?: CHANGE_ORIGIN;
  }[];

  @Column({ default: false })
  hasUnacknowledgedComment!: boolean;

  @Column({ nullable: true })
  lastCommentAddedAt!: Date;

  @Column({ type: "enum", enum: CHANGE_ORIGIN, nullable: true })
  lastCommentOrigin!: CHANGE_ORIGIN;

  @ManyToOne(() => List, (list) => list.items)
  @JoinColumn()
  list!: List;

  // Store original values before making changes
  @AfterLoad()
  private storeOriginalValues() {
    if (!this.originalValues) {
      this.originalValues = {
        articleName: this.articleName,
        articleNumber: this.articleNumber,
        quantity: this.quantity,
        interval: this.interval,
        marked: this.marked,
        comment: this.comment,
      };
    }
  }

  // Check if item has pending changes from a specific origin
  hasPendingChanges(origin?: CHANGE_ORIGIN): boolean {
    if (this.changeStatus !== CHANGE_STATUS.PENDING) return false;

    if (origin) {
      return this.changeOrigin === origin;
    }

    return true;
  }

  // Check if item has unacknowledged comments from a specific origin
  hasUnacknowledgedComments(origin?: CHANGE_ORIGIN): boolean {
    if (!this.hasUnacknowledgedComment) return false;

    if (origin && this.commentHistory) {
      return this.commentHistory.some(
        (comment) => !comment.acknowledged && comment.origin === origin
      );
    }

    return this.hasUnacknowledgedComment;
  }

  // Check if this item needs acknowledgment by a specific role
  needsAcknowledgmentBy(acknowledgerRole: CHANGE_ORIGIN): boolean {
    // If no changes or comments, no acknowledgment needed
    if (!this.hasChanges() && !this.hasUnacknowledgedComment) return false;

    // Admin needs to acknowledge customer changes/comments
    if (acknowledgerRole === CHANGE_ORIGIN.ADMIN) {
      return (
        (this.changeOrigin === CHANGE_ORIGIN.CUSTOMER &&
          this.changeStatus === CHANGE_STATUS.PENDING) ||
        this.hasUnacknowledgedComments(CHANGE_ORIGIN.CUSTOMER)
      );
    }

    // Customer needs to acknowledge admin changes/comments
    if (acknowledgerRole === CHANGE_ORIGIN.CUSTOMER) {
      return (
        (this.changeOrigin === CHANGE_ORIGIN.ADMIN &&
          this.changeStatus === CHANGE_STATUS.PENDING) ||
        this.hasUnacknowledgedComments(CHANGE_ORIGIN.ADMIN)
      );
    }

    return false;
  }

  // Add a comment with origin tracking
  addComment(
    text: string,
    addedById: string,
    addedByType: "user" | "customer",
    origin: CHANGE_ORIGIN
  ) {
    this.commentHistory = this.commentHistory || [];

    const commentEntry = {
      text,
      addedById,
      addedByType,
      addedAt: new Date(),
      origin,
      acknowledged: false,
    };

    this.commentHistory.push(commentEntry);
    this.comment = text;
    this.hasUnacknowledgedComment = true;
    this.lastCommentAddedAt = new Date();
    this.lastCommentOrigin = origin;

    // Log this as a change if it's a new comment or different from previous
    const previousComment =
      this.commentHistory.length > 1
        ? this.commentHistory[this.commentHistory.length - 2]
        : null;

    if (!previousComment || previousComment.text !== text) {
      this.markChange(
        "comment",
        previousComment?.text,
        text,
        addedById,
        addedByType,
        origin
      );
    }
  }

  // Acknowledge comments from a specific origin
  acknowledgeCommentsFromOrigin(
    origin: CHANGE_ORIGIN,
    acknowledgedById?: string,
    acknowledgedByType?: "user" | "customer",
    acknowledgedByOrigin?: CHANGE_ORIGIN
  ) {
    if (!this.commentHistory || this.commentHistory.length === 0) return;

    let acknowledgedAny = false;
    const now = new Date();

    this.commentHistory.forEach((comment) => {
      if (!comment.acknowledged && comment.origin === origin) {
        comment.acknowledged = true;
        comment.acknowledgedAt = now;
        comment.acknowledgedById = acknowledgedById;
        comment.acknowledgedByType = acknowledgedByType;
        comment.acknowledgedByOrigin = acknowledgedByOrigin;
        acknowledgedAny = true;
      }
    });

    // Update the global flag if all comments are acknowledged
    if (acknowledgedAny) {
      this.hasUnacknowledgedComment = this.commentHistory.some(
        (comment) => !comment.acknowledged
      );
    }
  }

  // Mark a field change with origin tracking
  markChange(
    field: string,
    oldValue: any,
    newValue: any,
    changedById: string,
    changedByType: "user" | "customer",
    origin: CHANGE_ORIGIN
  ) {
    this.changeStatus = CHANGE_STATUS.PENDING;
    this.changedById = changedById;
    this.changedByType = changedByType;
    this.changeOrigin = origin;
    this.changedAt = new Date();

    // Store original values if not already set
    if (!this.originalValues) {
      this.originalValues = {};
    }

    if (!this.originalValues[field]) {
      this.originalValues[field] = oldValue;
    }
  }

  // Update a field with change tracking
  updateField(
    field: string,
    newValue: any,
    changedById: string,
    changedByType: "user" | "customer",
    origin: CHANGE_ORIGIN
  ) {
    const oldValue = (this as any)[field];

    if (oldValue !== newValue) {
      this.markChange(
        field,
        oldValue,
        newValue,
        changedById,
        changedByType,
        origin
      );
      (this as any)[field] = newValue;
    }
  }

  // Confirm/acknowledge a change
  confirmChange(confirmedById: string, confirmedByType: "user" | "customer") {
    this.changeStatus = CHANGE_STATUS.CONFIRMED;
    this.confirmedAt = new Date();
    this.originalValues = {};
  }

  // Reject a change and revert to original values
  rejectChange(rejectedById: string, rejectedByType: "user" | "customer") {
    if (this.originalValues) {
      Object.keys(this.originalValues).forEach((key) => {
        (this as any)[key] = this.originalValues[key];
      });
    }

    this.changeStatus = CHANGE_STATUS.REJECTED;
    this.originalValues = {};
  }

  // Get changed fields
  getChangedFields(): string[] {
    if (!this.originalValues || this.changeStatus !== CHANGE_STATUS.PENDING) {
      return [];
    }

    return Object.keys(this.originalValues).filter(
      (key) => (this as any)[key] !== this.originalValues[key]
    );
  }

  // Check if item has any changes
  hasChanges(): boolean {
    return this.changeStatus === CHANGE_STATUS.PENDING;
  }

  // Check if item should be highlighted for a specific role
  shouldHighlightFor(role: CHANGE_ORIGIN): boolean {
    return this.needsAcknowledgmentBy(role);
  }

  updateDelivery(
    period: string,
    data: {
      quantity?: number;
      status?: string;
      deliveredAt?: Date;
      shippedAt?: Date;
      cargoType: string;
      remark?: string;
      eta?: number;
      cargoNo?: string;
      cargoStatus?: string;
      notes?: string;
    }
  ) {
    this.deliveries = this.deliveries || {};
    this.deliveries[period] = {
      ...(this.deliveries[period] || {
        status: DELIVERY_STATUS.OPEN,
        cargoNo: "",
      }),
      ...data,
    };
  }
}

// Utility functions for different perspectives
export function createListItemDTOForRole(item: ListItem, role: CHANGE_ORIGIN) {
  return {
    ...item,
    hasChanges: item.hasChanges(),
    hasUnacknowledgedComments: item.hasUnacknowledgedComments(),
    shouldHighlight: item.shouldHighlightFor(role),
    changedFields: item.getChangedFields(),
    unacknowledgedComments:
      item.commentHistory?.filter(
        (c) => !c.acknowledged && c.origin !== role
      ) || [],
    changesNeedAcknowledgment: item.needsAcknowledgmentBy(role),
    changeOrigin: item.changeOrigin,
    lastCommentOrigin: item.lastCommentOrigin,
  };
}

// Helper function to determine origin from user type
export function getOriginFromUserType(
  userType: "user" | "customer"
): CHANGE_ORIGIN {
  return userType === "user" ? CHANGE_ORIGIN.ADMIN : CHANGE_ORIGIN.CUSTOMER;
}

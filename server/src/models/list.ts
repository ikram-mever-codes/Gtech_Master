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
} from "typeorm";
import { Customer } from "./customers";
import { User } from "./users";

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

export enum DELIVERY_STATUS {
  PENDING = "pending",
  PARTIAL = "partial",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

export enum LOG_APPROVAL_STATUS {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
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

  approveActivityLog(
    logId: string,
    approvedById: string,
    approvedByType: "user" | "customer"
  ) {
    const log = this.activityLogs.find((log) => log.id === logId);
    if (log) {
      log.approvalStatus = LOG_APPROVAL_STATUS.APPROVED;
      log.approvedAt = new Date();
    }
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
    [period: string]: {
      quantity?: number;
      status: DELIVERY_STATUS;
      deliveredAt?: Date;
      cargoNo: string;
    };
  };

  @ManyToOne(() => List, (list) => list.items)
  @JoinColumn()
  list!: List;

  updateDelivery(
    period: string,
    data: {
      quantity?: number;
      status?: DELIVERY_STATUS;
      deliveredAt?: Date;
      notes?: string;
    }
  ) {
    this.deliveries = this.deliveries || {};
    this.deliveries[period] = {
      ...(this.deliveries[period] || {}),
      status: DELIVERY_STATUS.PENDING,
      ...data,
    };
  }
}

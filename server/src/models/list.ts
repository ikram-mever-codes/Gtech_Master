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

  @ManyToOne(() => List, (list) => list.items)
  @JoinColumn()
  list!: List;

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

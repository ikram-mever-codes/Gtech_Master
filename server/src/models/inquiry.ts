import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  OneToOne,
} from "typeorm";
import { Customer } from "./customers";
import { ContactPerson } from "./contact_person";
import { RequestedItem } from "./requested_items";

export type Currency = "RMB" | "HKD" | "EUR" | "USD";

@Entity()
export class DeliveryAddress {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  street?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  city?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  state?: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  postalCode?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  country?: string;

  @Column({ type: "text", nullable: true })
  additionalInfo?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  contactName?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  contactPhone?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  constructor(partial?: Partial<DeliveryAddress>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

@Entity()
export class Inquiry {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;
  @Column({ type: "text", nullable: true })
  @Column({ type: "varchar", length: 500, nullable: true })
  image?: string;

  @Column({ type: "boolean", default: false })
  isAssembly!: boolean;

  @Column({ type: "text", nullable: true })
  assemblyInstructions?: string;

  @ManyToOne(() => Customer, (customer) => customer.inquiries, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "customer_id" })
  customer!: Customer;

  @Column({ name: "customer_id" })
  customerId!: string;

  @ManyToOne(() => ContactPerson, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "contact_person_id" })
  contactPerson?: ContactPerson;

  @Column({ name: "contact_person_id", nullable: true })
  contactPersonId?: string;

  @OneToMany(() => RequestedItem, (request) => request.inquiry, {
    cascade: true,
  })
  requests!: RequestedItem[];

  @Column({
    type: "enum",
    enum: [
      "Draft",
      "Submitted",
      "In Review",
      "Quoted",
      "Negotiation",
      "Accepted",
      "Rejected",
      "Cancelled",
    ],
    default: "Draft",
  })
  status!:
    | "Draft"
    | "Submitted"
    | "In Review"
    | "Quoted"
    | "Negotiation"
    | "Accepted"
    | "Rejected"
    | "Cancelled";

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  totalEstimatedCost?: number;

  @Column({
    type: "enum",
    enum: ["Low", "Medium", "High", "Urgent"],
    default: "Medium",
  })
  priority!: "Low" | "Medium" | "High" | "Urgent";

  @Column({ type: "varchar", length: 100, nullable: true })
  referenceNumber?: string;

  @Column({ type: "date", nullable: true })
  requiredByDate?: Date;

  @Column({ type: "text", nullable: true })
  internalNotes?: string;

  @Column({ type: "text", nullable: true })
  termsConditions?: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  projectLink?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  constructor(partial?: Partial<Inquiry>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

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
import { Offer } from "./offer";

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
  image?: string;

  @Column({ type: "boolean", default: false })
  isAssembly!: boolean;

  @Column({ type: "boolean", default: false })
  isEstimated!: boolean;

  @Column({ type: "text", nullable: true })
  assemblyInstructions?: string;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
    comment: "Purchase price for assembly inquiries only",
  })
  purchasePrice?: number;

  @Column({
    type: "enum",
    enum: ["RMB", "HKD", "EUR", "USD"],
    default: "RMB",
    comment: "Currency for purchase price",
    nullable: true,
  })
  purchasePriceCurrency?: Currency;

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

  @Column({ type: "float", nullable: true })
  weight?: number;

  @Column({ type: "float", nullable: true })
  width?: number;

  @Column({ type: "float", nullable: true })
  height?: number;

  @Column({ type: "float", nullable: true })
  length?: number;

  @Column({ type: "text", nullable: true })
  description?: string;

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

  @Column({ default: false })
  isFragile: boolean;

  @Column({ default: false })
  requiresSpecialHandling: boolean;

  @Column({ type: "text", nullable: true })
  handlingInstructions: string;

  @Column({ type: "int", nullable: true })
  numberOfPackages: number;

  @Column({ nullable: true })
  packageType: string;

  @OneToMany(() => Offer, (offer) => offer.inquiry, {
    cascade: false,
  })
  offers!: Offer[];

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

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Customer } from "./customers";
import { Invoice } from "./invoice";
import { DeliveryAddress } from "./inquiry";

@Entity()
export class StarCustomerDetails {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @OneToOne(() => Customer, (customer) => customer.starCustomerDetails)
  customer!: Customer;

  @Column({ nullable: true })
  taxNumber!: string;

  @Column({ type: "boolean", default: false })
  isEmailVerified!: boolean;

  @Column({ type: "varchar", nullable: true })
  emailVerificationCode?: string;

  @Column({ type: "timestamp", nullable: true })
  emailVerificationExp?: Date;

  @Column({ type: "boolean", default: false })
  isPhoneVerified!: boolean;

  @Column({ type: "varchar", nullable: true })
  phoneVerificationCode?: string;

  @Column({ type: "timestamp", nullable: true })
  phoneVerificationExp?: Date;

  @Column({
    type: "enum",
    enum: ["pending", "verified", "rejected"],
    default: "pending",
  })
  accountVerificationStatus!: "pending" | "verified" | "rejected";

  @Column({ type: "varchar", nullable: true })
  verificationRemark?: string;

  @Column()
  password!: string;

  @Column({ type: "varchar", nullable: true })
  resetPasswordToken?: string;

  @Column({ type: "timestamp", nullable: true })
  resetPasswordExp?: Date;

  // Billing Address
  @Column({ type: "varchar", length: 255, nullable: true })
  billingStreet?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  billingCity?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  billingState?: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  billingPostalCode?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  billingCountry?: string;

  // Delivery Address Snapshot - keeping old field names for backward compatibility
  @Column({ type: "varchar", length: 255, nullable: true })
  deliveryAddressLine1?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  deliveryAddressLine2?: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  deliveryPostalCode?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  deliveryCity?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  deliveryCountry?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  deliveryContactName?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  deliveryContactPhone?: string;

  @Column({ type: "text", nullable: true })
  deliveryAdditionalInfo?: string;

  // Relationship to DeliveryAddress entity (optional)
  @ManyToOne(() => DeliveryAddress, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "delivery_address_id" })
  deliveryAddress?: DeliveryAddress;

  @Column({ name: "delivery_address_id", nullable: true })
  deliveryAddressId?: string;

  @Column({ nullable: true })
  deletedAt!: Date;

  @OneToMany(() => Invoice, (invoice) => invoice.customer)
  invoices!: Invoice[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

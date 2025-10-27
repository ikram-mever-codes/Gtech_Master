import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from "typeorm";
import { Customer } from "./customers";
import { Invoice } from "./invoice";

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

  @Column({ nullable: true })
  deliveryAddressLine1?: string;

  @Column({ nullable: true })
  deliveryAddressLine2?: string;

  @Column({ nullable: true })
  deliveryPostalCode?: string;

  @Column({ nullable: true })
  deliveryCity?: string;

  @Column({ nullable: true })
  deliveryCountry?: string;

  @Column({ nullable: true })
  deletedAt!: Date;

  @OneToMany(() => Invoice, (invoice) => invoice.customer)
  invoices!: Invoice[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

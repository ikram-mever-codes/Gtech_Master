import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Invoice } from "./invoice";

@Entity()
export class Customer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  companyName!: string;

  @Column({ nullable: true })
  legalName?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  contactEmail!: string;

  @Column()
  contactPhoneNumber!: string;

  @Column()
  taxNumber!: string;

  @OneToMany(() => Invoice, (invoice) => invoice.customer)
  invoices!: Invoice[];

  @Column({ nullable: true })
  addressLine1?: string;

  @Column({ nullable: true })
  addressLine2?: string;

  @Column({ nullable: true })
  postalCode?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  country?: string;

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
  deletedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  constructor(partial?: Partial<Customer>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

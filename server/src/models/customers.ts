import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class Customer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  companyName!: string;

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

  @Column()
  addressLine1!: string;

  @Column({ nullable: true })
  addressLine2?: string;

  @Column()
  postalCode!: string;

  @Column()
  city!: string;

  @Column()
  country!: string;

  @Column()
  deliveryAddressLine1!: string;

  @Column({ nullable: true })
  deliveryAddressLine2?: string;

  @Column()
  deliveryPostalCode!: string;

  @Column()
  deliveryCity!: string;

  @Column()
  deliveryCountry!: string;

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

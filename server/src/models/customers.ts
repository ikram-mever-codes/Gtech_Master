import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { Invoice } from "./invoice";
import { BusinessDetails } from "./business_details";
import { StarBusinessDetails } from "./star_business_details";
import { StarCustomerDetails } from "./star_customer_details";

@Entity()
export class Customer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "enum",
    enum: ["business", "star_business", "star_customer", "device_maker"],
    default: "business",
  })
  stage!: "business" | "star_business" | "star_customer" | "device_maker";

  @Column({ unique: true })
  companyName!: string;

  @Column({ nullable: true })
  legalName?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ unique: true, nullable: true })
  email!: string;

  @Column({ nullable: true })
  contactEmail!: string;

  @Column({ nullable: true })
  contactPhoneNumber!: string;

  @OneToOne(() => BusinessDetails, { nullable: true, cascade: true })
  @JoinColumn()
  businessDetails?: BusinessDetails;

  @OneToOne(() => StarBusinessDetails, { nullable: true, cascade: true })
  @JoinColumn()
  starBusinessDetails?: StarBusinessDetails;

  @OneToOne(() => StarCustomerDetails, { nullable: true, cascade: true })
  @JoinColumn()
  starCustomerDetails?: StarCustomerDetails;

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

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from "typeorm";
import { Customer } from "./customers";

@Entity()
export class BusinessDetails {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ nullable: true })
  businessSource?: string;

  @Column({ type: "decimal", precision: 10, scale: 8, nullable: true })
  longitude?: number;

  @Column({ type: "decimal", precision: 10, scale: 8, nullable: true })
  latitude?: number;

  @Column({ nullable: true })
  googleMapsUrl?: string;

  @Column({ type: "int", nullable: true })
  reviewCount?: number;

  @Column({ nullable: true })
  website?: string;

  @Column({ nullable: true })
  contactPhone?: string;

  @Column({ nullable: true, unique: true })
  email?: string;

  @Column({ type: "json", nullable: true })
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
  };

  @Column({
    type: "enum",
    enum: ["Yes", "No", "Unsure"],
    nullable: true,
  })
  isDeviceMaker?: "Yes" | "No" | "Unsure";

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  postalCode?: string;

  @Column({ nullable: true })
  category?: string;

  @Column({ type: "simple-array", nullable: true })
  additionalCategories?: string[];

  @Column({ nullable: true })
  industry?: string;

  @Column({ type: "int", nullable: true })
  employeeCount?: number;

  @Column({ type: "boolean", default: false })
  isStarBusiness!: boolean;

  @Column({ type: "boolean", default: false })
  isStarCustomer!: boolean;

  @OneToOne(() => Customer, (customer) => customer.businessDetails)
  customer!: Customer;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

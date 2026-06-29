import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Customer } from "./customers";
import { Country } from "./country";

@Entity({ name: "company_shipping_addresses" })
export class CompanyShippingAddress {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Customer, (customer) => customer.shippingAddresses, {
    onDelete: "CASCADE",
    nullable: false,
  })
  @JoinColumn({ name: "company_id" })
  company!: Customer;

  @Column({ type: "varchar", length: 150 })
  name!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  address_additional_line?: string | null;

  @Column({ type: "varchar", length: 255 })
  street!: string;

  @Column({ type: "varchar", length: 50 })
  postal_code!: string;

  @Column({ type: "varchar", length: 150 })
  city!: string;

  @ManyToOne(() => Country, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "country_id" })
  country?: Country | null;

  @Column({ type: "boolean", default: false })
  is_default!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
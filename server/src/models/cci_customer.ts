import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { CCIInvoice } from "./cci_invoice";

@Entity("cci_customer")
export class CCICustomer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ nullable: true })
  original_customer_id?: string;

  @Column({ type: "varchar", length: 255 })
  company_name!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  email?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  tax_number?: string;

  @Column({ type: "text", nullable: true })
  bill_to_address?: string;

  @Column({ type: "text", nullable: true })
  ship_to_address?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  city?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  country?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  phone?: string;

  @OneToMany(() => CCIInvoice, (invoice: CCIInvoice) => invoice.customer)
  invoices!: CCIInvoice[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

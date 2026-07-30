import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { CCICustomer } from "./cci_customer";
import { CCIItem } from "./cci_items";

@Entity("cci_invoice")
export class CCIInvoice {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  invoice_number!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  order_number?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  cargo_no?: string;

  @Column({ type: "date" })
  invoice_date!: Date;

  @Column({ type: "date" })
  delivery_date!: Date;

  @Column({ type: "date", nullable: true })
  due_date?: Date;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  net_total!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  tax_amount!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  gross_total!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  freight_cost!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  description?: string;

  @Column({ type: "text", nullable: true })
  remark?: string;

  @Column({ type: "varchar", length: 50, default: "closed" })
  status!: string;

  @Column({ type: "timestamp", nullable: true })
  closed_at?: Date;

  @Column({ type: "uuid", nullable: true })
  cci_customer_id?: string;

  @ManyToOne(() => CCICustomer, (customer: CCICustomer) => customer.invoices, {
    nullable: true,
    cascade: true,
  })
  @JoinColumn({ name: "cci_customer_id" })
  customer?: CCICustomer | null;

  @OneToMany(() => CCIItem, (item: CCIItem) => item.cci_invoice, { cascade: true })
  items!: CCIItem[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

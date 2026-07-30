import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { CCIInvoice } from "./cci_invoice";

@Entity("cci_items")
export class CCIItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  cci_invoice_id!: string;

  @ManyToOne(() => CCIInvoice, (invoice: CCIInvoice) => invoice.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "cci_invoice_id" })
  cci_invoice!: CCIInvoice;

  @Column({ type: "int", nullable: true })
  item_id?: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  ean?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  item_no_de?: string;

  @Column({ type: "varchar", length: 500 })
  item_name!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  taric_code?: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  taric_name_en?: string;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  duty_rate!: number;

  @Column({ type: "int", default: 1 })
  quantity!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  unit_price!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  total_price!: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  order_no?: string;

  @Column({ type: "text", nullable: true })
  remark?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

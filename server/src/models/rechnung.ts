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
import { RechnungCustomer } from "./rechnung_customer";
import { RechnungItem } from "./rechnung_items";
import { numericTransformer } from "../utils/numeric-transformer";

@Entity("rechnungen")
export class Rechnung {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  invoice_number!: string;

  @Column({ type: "integer", nullable: true })
  auftrag_id?: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  auftrag_no?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  order_number?: string;

  @Column({ type: "date" })
  invoice_date!: Date;

  @Column({ type: "date", nullable: true })
  due_date?: Date;

  @Column({ type: "date", nullable: true })
  delivery_date?: Date;

  @Column({ type: "varchar", length: 50, nullable: true })
  warehouse?: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  subtotal!: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 19, transformer: numericTransformer })
  tax_rate!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  tax_amount!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  total_amount!: number;

  @Column({ type: "varchar", length: 50, default: "EUR" })
  currency!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  payment_method?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  shipping_method?: string;

  @Column({ type: "text", nullable: true })
  notes?: string;

  @Column({ type: "varchar", length: 50, default: "open" })
  status!: string;

  @Column({ type: "uuid", nullable: true })
  rechnung_customer_id?: string;

  @ManyToOne(() => RechnungCustomer, (customer: RechnungCustomer) => customer.rechnungen, {
    nullable: true,
    cascade: true,
  })
  @JoinColumn({ name: "rechnung_customer_id" })
  customer?: RechnungCustomer | null;

  @OneToMany(() => RechnungItem, (item: RechnungItem) => item.rechnung, { cascade: true, eager: true })
  items!: RechnungItem[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

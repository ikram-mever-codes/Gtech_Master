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
import { RechnungKItem } from "./rechnung_k_items";
import { numericTransformer } from "../utils/numeric-transformer";

export enum StockWhere {
  EU = "EU",
  CN = "CN",
}

@Entity("rechnungen_k")
export class Rechnung_k {
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

  // --- Dates ---
  @Column({ type: "date" })
  invoice_date!: Date;

  @Column({ type: "date", nullable: true })
  due_date?: Date;

  @Column({ type: "date", nullable: true })
  delivery_date?: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  date_created?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  date_emailed?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  date_delivery?: string;

  // --- Warehouse & Stock ---
  @Column({ type: "varchar", length: 50, nullable: true })
  warehouse?: string;

  @Column({
    type: "enum",
    enum: StockWhere,
    default: StockWhere.EU,
  })
  stock_where!: StockWhere;

  // --- Financials ---
  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  subtotal!: number;

  @Column({
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 19,
    transformer: numericTransformer,
  })
  tax_rate!: number;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  tax_amount!: number;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  total_amount!: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
    nullable: true,
    transformer: numericTransformer,
  })
  discount_percentage!: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
    nullable: true,
    transformer: numericTransformer,
  })
  discount_amount!: number;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    nullable: true,
    transformer: numericTransformer,
  })
  shipping_cost!: number;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 1,
    nullable: true,
    transformer: numericTransformer,
  })
  shipping_quantity!: number;

  // --- Currency ---
  @Column({ type: "varchar", length: 10, default: "EUR" })
  currency!: string;

  // --- Payment & Shipping ---
  @Column({ type: "varchar", length: 255, nullable: true })
  payment_method?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  payment_terms?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  shipping_method?: string;

  @Column({ type: "text", nullable: true })
  delivery_terms?: string;

  @Column({ type: "text", nullable: true })
  terms_conditions?: string;

  // --- Status & Notes ---
  @Column({ type: "varchar", length: 50, default: "open" })
  status!: string;

  @Column({ type: "text", nullable: true })
  notes?: string;

  @Column({ type: "text", nullable: true })
  internal_notes?: string;

  // --- UI ---
  @Column({ type: "varchar", length: 20, nullable: true })
  highlight_color?: string;

  // --- Customer Data ---
  @Column({ type: "uuid", nullable: true })
  rechnung_customer_id?: string;

  @Column({ type: "json", nullable: true })
  customerSnapshot?: any;

  @Column({ type: "json", nullable: true })
  deliveryAddress?: {
    addressName?: string;
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    additionalInfo?: string;
    contactName?: string;
    contactPhone?: string;
  };

  @ManyToOne(
    () => RechnungCustomer,
    (customer: RechnungCustomer) => customer.rechnungen,
    {
      nullable: true,
      cascade: true,
    },
  )
  @JoinColumn({ name: "rechnung_customer_id" })
  customer?: RechnungCustomer | null;

  @Column({ type: "uuid", nullable: true })
  original_rechnung_id?: string;

  @OneToMany(() => RechnungKItem, (item: RechnungKItem) => item.rechnung, {
    cascade: true,
    eager: true,
  })
  items!: RechnungKItem[];

  // --- Timestamps ---
  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

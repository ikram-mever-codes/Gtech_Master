import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { CustomerOrderItem } from "./customer_order_items";
import { Customer } from "./customers";
import { numericTransformer } from "../utils/numeric-transformer";
import { WeiterversandServiceProvider } from "./weiterversand_service_provider";

export enum StockWhere {
  EU = "EU",
  CN = "CN",
}

export enum AuftragStatus {
  OPEN = "open",
  PARTIALLY_DELIVERED = "partially_delivered",
  DELIVERED = "delivered",
  CLOSED = "closed",
}

@Entity({ name: "customer_orders" })
export class CustomerOrder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255, unique: true })
  order_no!: string;

  @Column({ type: "uuid", nullable: true })
  customer_id?: string;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: "customer_id" })
  customer?: Customer;

  @Column({ type: "varchar", length: 255, nullable: true })
  offer_id?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  title?: string;

  @Column({ type: "varchar", length: 50, default: "Draft" })
  status!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  currency!: string;

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

  @Column({ type: "varchar", length: 100, nullable: true })
  payment_method?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  shipping_method?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  payment_terms?: string;

  @Column({ type: "text", nullable: true })
  delivery_terms?: string;

  @Column({ type: "text", nullable: true })
  terms_conditions?: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  highlight_color?: string;

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

  @Column({ type: "text", nullable: true })
  notes?: string;

  @Column({ type: "text", nullable: true })
  internal_notes?: string;

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

  @Column({ type: "varchar", length: 255, nullable: true })
  date_created?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  date_emailed?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  date_delivery?: string;

  @Column({
    type: "enum",
    enum: StockWhere,
    default: StockWhere.EU,
  })
  stock_where!: StockWhere;

  @Column({
    type: "enum",
    enum: AuftragStatus,
    nullable: true,
  })
  auftrag_status?: AuftragStatus;

  @Column({ type: "date", nullable: true })
  real_delivery_date?: string;

  @Column({ type: "boolean", default: false })
  is_weiterversand!: boolean;

  @Column({ type: "int", nullable: true })
  weiterversand_service_provider_id?: number;

  @ManyToOne(() => WeiterversandServiceProvider, { nullable: true, eager: false })
  @JoinColumn({ name: "weiterversand_service_provider_id" })
  weiterversandServiceProvider?: WeiterversandServiceProvider;

  @Column({ type: "text", nullable: true })
  weiterversand_labels?: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  weiterversand_tracking?: string;

  @OneToMany(() => CustomerOrderItem, (item) => item.customerOrder, {
    cascade: true,
    eager: true,
  })
  orderItems!: CustomerOrderItem[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
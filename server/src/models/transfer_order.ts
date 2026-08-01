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
import { TransferOrderItem } from "./transfer_order_items";
import { Customer } from "./customers";
import { numericTransformer } from "../utils/numeric-transformer";

@Entity({ name: "transfer_orders" })
export class TransferOrder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255, unique: true })
  order_no!: string;

  @Column({ type: "integer", nullable: true })
  auftrag_id?: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  auftrag_no?: string;

  @Column({ type: "uuid", nullable: true })
  customer_id?: string;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: "customer_id" })
  customer?: Customer;

  @Column({ type: "varchar", length: 50, default: "draft" })
  status!: "draft" | "to be processed" | "partially delivered" | "delivered";

  @Column({ type: "varchar", length: 10, default: "EUR" })
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

  // --- NEW FIELDS ---

  @Column({ type: "varchar", length: 255, nullable: true })
  title?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  date_delivery?: string;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 3,
    default: 0,
    transformer: numericTransformer,
  })
  net_weight!: number;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 3,
    default: 0,
    transformer: numericTransformer,
  })
  extra_weight!: number;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 3,
    default: 0,
    transformer: numericTransformer,
  })
  total_weight!: number;

  @Column({ type: "varchar", length: 20, nullable: true })
  highlight_color?: string;

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

  @Column({ type: "varchar", length: 255, default: "Gtech Hong Kong" })
  receiver!: string;

  @Column({ type: "text", nullable: true })
  notes?: string;

  @Column({ type: "json", nullable: true })
  customerSnapshot?: any;

  @Column({ type: "varchar", length: 255, nullable: true })
  date_created?: string;

  @Column({ type: "boolean", default: false })
  is_fulfilled_shifted!: boolean;

  @OneToMany(() => TransferOrderItem, (item) => item.transferOrder, {
    cascade: true,
    eager: true,
  })
  orderItems!: TransferOrderItem[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

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

  @Column({ type: "varchar", length: 50, default: "Draft" })
  status!: string;

  @Column({ type: "varchar", length: 10, default: "EUR" })
  currency!: string;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 19, transformer: numericTransformer })
  tax_rate!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  subtotal!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  tax_amount!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  total_amount!: number;

  @Column({ type: "text", nullable: true })
  notes?: string;

  @Column({ type: "json", nullable: true })
  customerSnapshot?: any;

  @Column({ type: "varchar", length: 255, nullable: true })
  date_created?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  date_emailed?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  date_delivery?: string;

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

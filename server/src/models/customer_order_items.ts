import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { CustomerOrder } from "./customer_orders";
import { numericTransformer } from "../utils/numeric-transformer";

@Entity({ name: "customer_order_items" })
export class CustomerOrderItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => CustomerOrder, (order) => order.orderItems, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "customer_order_id" })
  customerOrder!: CustomerOrder;

  @Column({ name: "customer_order_id" })
  customerOrderId!: number;

  @Column({ type: "varchar", length: 255 })
  itemName!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  itemNo?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  material?: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  photo?: string;

  @Column({ type: "text", nullable: true })
  specification?: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "float", nullable: true })
  weight?: number;

  @Column({ type: "decimal", precision: 12, scale: 3, default: 1, transformer: numericTransformer })
  quantity!: number;

  @Column({ type: "decimal", precision: 12, scale: 3, default: 0, transformer: numericTransformer })
  price!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  lineTotal!: number;

  @Column({ type: "integer", default: 1 })
  position!: number;

  @Column({ name: "source_line_item_id", type: "varchar", length: 100, nullable: true })
  sourceLineItemId?: string;

  @Column({ name: "source_item_id", type: "varchar", length: 100, nullable: true })
  sourceItemId?: string;

  @Column({ type: "text", nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

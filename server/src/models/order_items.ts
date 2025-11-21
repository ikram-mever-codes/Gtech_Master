import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Item } from "./items";
import { Order } from "./orders";

// Alternative OrderItem entity (use this if order_no shouldn't be unique)
@Entity()
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 25 })
  master_id!: string;

  @Column()
  ItemID_DE!: number;

  @Column({ type: "int", nullable: true }) // Changed to int to reference Order.id
  order_id?: number;

  @Column({ type: "int", nullable: true })
  qty?: number;

  @Column({ type: "text", nullable: true })
  remark_de?: string;

  @Column({ type: "int", nullable: true })
  qty_delivered?: number;

  @ManyToOne(() => Item, (item) => item.orderItems)
  @JoinColumn({ name: "item_id" })
  item!: Item;

  @ManyToOne(() => Order, (order) => order.orderItems)
  @JoinColumn({ name: "order_id" }) // Changed to reference id instead of order_no
  order!: Order;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

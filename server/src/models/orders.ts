// src/entities/orders.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from "typeorm";
import { OrderItem } from "./order_items";
import { Category } from "./categories";

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255, unique: true })
  order_no!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  customer_id?: string;

  @Column({ type: "int", nullable: true })
  status?: number;

  @Column({ type: "text", nullable: true })
  comment?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  date_created?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  date_emailed?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  date_delivery?: string;

  // @Column({ type: "varchar", length: 50, nullable: true })
  // category_id?: string;
  @Column({ type: "int", nullable: true })
category_id?: number;

  // @ManyToOne(() => Category, (category) => category.orders)
  // @JoinColumn({ name: "category_id", referencedColumnName: "de_cat" })
  // category!: Category;
  @ManyToOne(() => Category, (category) => category.orders)
  @JoinColumn({ name: "category_id", referencedColumnName: "id" })

  category!: Category;


  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  orderItems!: OrderItem[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

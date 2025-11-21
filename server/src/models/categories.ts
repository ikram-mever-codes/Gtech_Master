// src/entities/categories.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Order } from "./orders";
import { Item } from "./items";
import { WarehouseItem } from "./warehouse_items";

@Entity()
export class Category {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 1, default: "N" })
  is_ignored_value!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  name?: string;

  @Column({ type: "varchar", length: 5, unique: true }) // ADDED: unique: true
  de_cat!: string;

  @OneToMany(() => Order, (order) => order.category)
  orders!: Order[];

  @OneToMany(() => Item, (item) => item.category)
  items!: Item[];

  @OneToMany(() => WarehouseItem, (warehouseItem) => warehouseItem.category)
  warehouseItems!: WarehouseItem[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

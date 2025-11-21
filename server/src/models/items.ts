// src/entities/items.ts
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
import { Parent } from "./parents";
import { SupplierItem } from "./supplier_items";
import { WarehouseItem } from "./warehouse_items";
import { VariationValue } from "./variation_values";
import { OrderItem } from "./order_items";
import { Taric } from "./tarics";
import { ItemQuality } from "./item_qualities";
import { Category } from "./categories";
import { Supplier } from "./suppliers";

@Entity()
export class Item {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  taric_id?: number;

  @Column({ nullable: true })
  supplier_id?: number;

  @Column({ nullable: true })
  de_id?: number;

  @Column({ type: "varchar", length: 9, nullable: true })
  de_no?: string;

  @Column({ type: "varchar", length: 1, default: "Y" })
  is_active!: string;

  @Column({ type: "varchar", length: 111, nullable: true })
  name_de?: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  name_en?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  name_cn?: string;

  @Column({ type: "varchar", length: 27, nullable: true })
  var_de_1?: string;

  @Column({ type: "varchar", length: 23, nullable: true })
  var_de_2?: string;

  @Column({ type: "varchar", length: 18, nullable: true })
  var_de_3?: string;

  @Column({ type: "varchar", length: 25, nullable: true })
  var_en_1?: string;

  @Column({ type: "varchar", length: 17, nullable: true })
  var_en_2?: string;

  @Column({ type: "varchar", length: 18, nullable: true })
  var_en_3?: string;

  @Column({ type: "varchar", length: 1, default: "N" })
  is_NwV!: string;

  @Column({ type: "smallint", default: 3 }) // FIXED: tinyint → smallint
  parent_rank!: number;

  @Column({ type: "varchar", length: 1, default: "N" })
  is_var_unilingual!: string;

  @ManyToOne(() => Parent, (parent) => parent.items)
  @JoinColumn({ name: "parent_id" })
  parent!: Parent;

  @ManyToOne(() => Taric, (taric) => taric.items)
  @JoinColumn({ name: "taric_id" })
  taric!: Taric;

  @ManyToOne(() => Category, (category) => category.items)
  @JoinColumn({ name: "category_id" })
  category!: Category;

  @ManyToOne(() => Supplier, (supplier) => supplier.items)
  @JoinColumn({ name: "supplier_id" })
  supplier!: Supplier;

  @OneToMany(() => SupplierItem, (supplierItem) => supplierItem.item)
  supplierItems!: SupplierItem[];

  @OneToMany(() => WarehouseItem, (warehouseItem) => warehouseItem.item)
  warehouseItems!: WarehouseItem[];

  @OneToMany(() => VariationValue, (variationValue) => variationValue.item)
  variationValues!: VariationValue[];

  @OneToMany(() => OrderItem, (orderItem) => orderItem.item)
  orderItems!: OrderItem[];

  @OneToMany(() => ItemQuality, (itemQuality) => itemQuality.item)
  itemQualities!: ItemQuality[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

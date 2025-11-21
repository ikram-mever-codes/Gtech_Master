// src/entities/supplier_items.ts
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
import { Supplier } from "./suppliers";

@Entity()
export class SupplierItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  item_id!: number;

  @Column()
  supplier_id!: number;

  @Column({ type: "varchar", length: 1, default: "Y" })
  is_default!: string;

  @Column({ type: "int", nullable: true })
  moq?: number;

  @Column({ type: "int", default: 0 })
  oi!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true }) // FIXED: double precision → decimal
  price_rmb?: number;

  @Column({ type: "varchar", length: 1000, nullable: true })
  url?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  note_cn?: string;

  @Column({ type: "varchar", length: 100, default: "No" })
  is_po!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  lead_time?: string;

  @Column({ type: "varchar", length: 25, nullable: true })
  updated_by?: string;

  @ManyToOne(() => Item, (item) => item.supplierItems)
  @JoinColumn({ name: "item_id" })
  item!: Item;

  @ManyToOne(() => Supplier, (supplier) => supplier.supplierItems)
  @JoinColumn({ name: "supplier_id" })
  supplier!: Supplier;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

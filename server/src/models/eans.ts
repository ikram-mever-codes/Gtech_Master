// src/entities/eans.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { WarehouseItem } from "./warehouse_items";

@Entity()
export class Ean {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", nullable: true })
  ean?: string;

  @Column({ type: "char", length: 1, default: "N" })
  is_used!: string;

  @OneToOne(() => WarehouseItem, (warehouseItem) => warehouseItem.eanRecord)
  @JoinColumn({ name: "ean", referencedColumnName: "ean" })
  warehouseItem!: WarehouseItem;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

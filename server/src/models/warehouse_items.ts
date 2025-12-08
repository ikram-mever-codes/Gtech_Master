import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
} from "typeorm";
import { Item } from "./items";
import { Category } from "./categories";

@Entity()
export class WarehouseItem {
  @PrimaryColumn()
  id!: number;

  @Column()
  item_id!: number;

  @Column({ nullable: true })
  ItemID_DE?: number;

  @Column({ default: 1, nullable: true })
  category_id!: number;

  @Column({ type: "varchar", length: 13, nullable: true })
  ean?: string; // Changed from bigint to varchar, no foreign key

  @Column({ type: "varchar", length: 100, nullable: true })
  item_no_de?: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  item_name_de?: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  item_name_en?: string;

  @Column({ type: "char", length: 1, default: "N" })
  is_no_auto_order!: string;

  @Column({ type: "char", length: 1, default: "Y" })
  is_active!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  stock_qty?: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  msq?: number;

  @Column({ type: "int", nullable: true })
  buffer?: number;

  @Column({ type: "char", length: 1, default: "Y" })
  is_stock_item!: string;

  @Column({ type: "char", length: 1, default: "Y" })
  is_SnSI!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  ship_class?: string;

  // @ManyToOne(() => Item, (item) => item.warehouseItems)
  // @JoinColumn({ name: "item_id" })
  // item!: Item;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

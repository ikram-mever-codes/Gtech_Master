import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Item } from "./items";
import { Supplier } from "./suppliers";

@Entity("purchase_prices")
export class PurchasePrice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  item_id!: number;

  @Column()
  supplier_id!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 1 })
  min_quantity!: number;

  @Column({ type: "decimal", precision: 10, scale: 4 })
  unit_price_cny!: number;

  @Column({ type: "varchar", length: 10, default: "RMB" })
  currency!: string;

  @ManyToOne(() => Item)
  @JoinColumn({ name: "item_id" })
  item!: Item;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: "supplier_id" })
  supplier!: Supplier;
}

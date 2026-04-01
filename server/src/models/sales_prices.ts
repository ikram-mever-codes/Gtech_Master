import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Item } from "./items";
// Assuming you have a Customer entity, if not, use customer_id: number
// import { Customer } from "./customers";

@Entity("sales_prices")
export class SalesPrice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  item_id!: number;

  @Column({ nullable: true })
  customer_id?: number; // NULL = Standardpreis

  @Column({ type: "decimal", precision: 10, scale: 2, default: 1 })
  min_quantity!: number;

  @Column({ type: "decimal", precision: 10, scale: 4 })
  unit_price_eur!: number;

  @ManyToOne(() => Item)
  @JoinColumn({ name: "item_id" })
  item!: Item;
}

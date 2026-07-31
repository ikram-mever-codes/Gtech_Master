import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Item } from "./items";
import { Customer } from "./customers";

@Entity("sales_prices")
export class SalesPrice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  item_id!: number;

  // FIX: Change from number to string (UUID)
  @Column({ type: "uuid", nullable: true })
  customer_id?: string | null;

  @Column({ type: "boolean", default: false })
  is_individual!: boolean;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 1 })
  min_quantity!: number;

  @Column({ type: "decimal", precision: 10, scale: 4 })
  unit_price_eur!: number;

  @ManyToOne(() => Item)
  @JoinColumn({ name: "item_id" })
  item!: Item;

  @ManyToOne(() => Customer, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "customer_id" })
  customer?: Customer | null;
}

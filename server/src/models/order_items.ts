import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from "typeorm";
import { Item } from "./items";
import { Order } from "./orders";
import { Cargo } from "./cargos";

@Entity()
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 25, nullable: true })
  master_id!: string;

  @Column({ type: "int", nullable: true })
  ItemID_DE!: number;

  @Column({ nullable: true })
  item_id!: number;

  @Column({ type: "int", nullable: true })
  order_id?: number;

  @Column({ type: "int", nullable: true })
  qty?: number;

  @Column({ type: "text", nullable: true })
  remark_de?: string;

  @Column({ type: "int", nullable: true })
  qty_delivered?: number;

  @Column({ type: "int", nullable: true })
  category_id?: number;

  @Column({ type: "float", nullable: true })
  rmb_special_price?: number;

  @Column({ type: "float", nullable: true })
  eur_special_price?: number;

  @Column({ type: "int", nullable: true })
  taric_id?: number;

  @Column({ type: "bigint", nullable: true })
  set_taric_code?: number;

  @Column({ type: "varchar", length: 20, nullable: true })
  status?: string;

  @Column({ type: "text", nullable: true })
  remarks_cn?: string;

  @Column({ type: "text", nullable: true })
  problems?: string;

  @Column({ type: "int", nullable: true })
  qty_label?: number;

  @Column({ type: "int", nullable: true })
  qty_split?: number;

  @Column({ type: "int", nullable: true })
  supplier_order_id?: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  ref_no?: string;

  @Column({ type: "int", nullable: true })
  cargo_id?: number;

  @Column({ type: "char", length: 1, nullable: true })
  printed?: string;

  @Column({ type: "timestamp", nullable: true })
  cargo_date?: Date;

  @ManyToOne(() => Item, (item) => item.orderItems)
  @JoinColumn({ name: "item_id" })
  item!: Item;

  @ManyToOne(() => Order, (order) => order.orderItems)
  @JoinColumn({ name: "order_id" })
  order!: Order;

  @ManyToOne(() => Cargo, { nullable: true })
  @JoinColumn({ name: "cargo_id" })
  cargo?: Cargo;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

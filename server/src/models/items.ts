import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Parent } from "./parents";
import { Taric } from "./tarics";
import { Category } from "./categories";
import { OrderItem } from "./order_items";

@Entity()
export class Item {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  parent_id?: number;

  @Column({ nullable: true })
  ItemID_DE?: number;

  @Column({ type: "varchar", length: 50, nullable: true })
  parent_no_de?: string;

  @Column({ type: "char", length: 1, default: "N" })
  is_dimension_special!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  model?: string;

  @Column({ type: "varchar", length: 3, nullable: true })
  supp_cat?: string;

  @Column({ type: "bigint", nullable: true })
  ean?: number;

  @Column({ nullable: true })
  taric_id?: number;

  @Column({ type: "float", nullable: true })
  weight?: number;

  @Column({ type: "float", nullable: true })
  width?: number;

  @Column({ type: "float", nullable: true })
  height?: number;

  @Column({ type: "float", nullable: true })
  length?: number;

  @Column({ type: "text", nullable: true })
  item_name?: string;

  @Column({ type: "text", nullable: true })
  item_name_cn?: string;

  @Column({ type: "decimal", precision: 10, scale: 0, nullable: true })
  FOQ?: number;

  @Column({ type: "decimal", precision: 10, scale: 0, nullable: true })
  FSQ?: number;

  @Column({ type: "char", length: 1, default: "Y" })
  is_qty_dividable!: string;

  @Column({ default: 0 })
  ISBN!: number;

  @Column({ nullable: true })
  cat_id?: number;

  @Column({ type: "text", nullable: true })
  remark?: string;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  RMB_Price?: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  photo?: string;

  @Column({ type: "text", nullable: true })
  pix_path?: string;

  @Column({ type: "text", nullable: true })
  pix_path_eBay?: string;

  @Column({ type: "char", length: 1, default: "N" })
  is_npr!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  npr_remark?: string;

  @Column({ nullable: true })
  many_components?: number;

  @Column({ nullable: true })
  effort_rating?: number;

  @Column({ type: "char", length: 1, default: "N" })
  is_rmb_special!: string;

  @Column({ type: "char", length: 1, default: "N" })
  is_eur_special!: string;

  @Column({ default: 0 })
  is_pu_item!: number;

  @Column({ default: 0 })
  is_meter_item!: number;

  @Column({ type: "varchar", length: 1, default: "Y" })
  is_new!: string;

  @Column({ type: "char", length: 1, default: "Y" })
  isActive!: string;

  @Column({ type: "json", nullable: true })
  painPoints?: string[];

  @Column({ type: "varchar", length: 200, nullable: true })
  note?: string;

  @CreateDateColumn()
  synced_at!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Parent, (parent) => parent.items, { nullable: true })
  @JoinColumn({ name: "parent_id" })
  parent: Parent | null;

  @ManyToOne(() => Taric, (taric) => taric.items, { nullable: true })
  @JoinColumn({ name: "taric_id" })
  taric: Taric | null;

  @ManyToOne(() => Category, (category) => category.items, { nullable: true })
  @JoinColumn({ name: "cat_id" })
  category: Category | null;

  @OneToMany(() => OrderItem, orderItem => orderItem.item)
  orderItems: OrderItem[];

}

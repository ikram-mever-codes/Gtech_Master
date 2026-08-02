import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Rechnung } from "./rechnung";
import { numericTransformer } from "../utils/numeric-transformer";

@Entity("rechnung_items")
export class RechnungItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Rechnung, (rechnung: Rechnung) => rechnung.items, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "rechnung_id" })
  rechnung!: Rechnung;

  @Column({ name: "rechnung_id" })
  rechnungId!: string;

  // --- Basic Item Info ---
  @Column({ type: "varchar", length: 255, nullable: true })
  item_name!: string; // Changed from itemName to match controller

  @Column({ name: "item_no_de", type: "varchar", length: 255, nullable: true })
  itemNo?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  material?: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  photo?: string;

  @Column({ type: "text", nullable: true })
  specification?: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({
    name: "quantity",
    type: "decimal",
    precision: 12,
    scale: 3,
    default: 1,
    nullable: true,
    transformer: numericTransformer,
  })
  quantity!: number; // Changed from qty to match controller

  @Column({
    type: "decimal",
    precision: 12,
    scale: 3,
    default: 1,
    nullable: true,
    transformer: numericTransformer,
  })
  max_qty?: number;

  @Column({
    name: "unit_price",
    type: "decimal",
    precision: 12,
    scale: 3,
    default: 0,
    nullable: true,
    transformer: numericTransformer,
  })
  price?: number;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  transferPrice?: number;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  purchasePrice?: number;

  @Column({ type: "varchar", length: 10, nullable: true })
  purchaseCurrency?: string;

  @Column({
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  taxRate?: number;

  @Column({
    name: "linear_total",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    nullable: true,
    transformer: numericTransformer,
  })
  lineTotal?: number;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 3,
    default: 0,
    nullable: true,
    transformer: numericTransformer,
  })
  unit_price_eur?: number;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  total_price!: number; // Added to match controller

  // --- Weights ---
  @Column({ type: "float", nullable: true })
  weight?: number;

  @Column({ type: "float", nullable: true })
  extraWeight?: number;

  @Column({ type: "integer", default: 1, nullable: true })
  position?: number;

  @Column({ type: "varchar", length: 20, nullable: true })
  highlightColor?: string;

  @Column({
    name: "source_line_item_id",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  sourceLineItemId?: string;

  @Column({
    name: "source_item_id",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  sourceItemId?: string;

  // --- Order Reference ---
  @Column({ type: "varchar", length: 100, nullable: true })
  order_no?: string; // Added to match controller

  // --- Remarks ---
  @Column({ type: "text", nullable: true })
  notes?: string;

  @Column({ type: "text", nullable: true })
  remark?: string; // Added to match controller (used for remark field)

  @Column({ type: "text", nullable: true })
  remark_order_item?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

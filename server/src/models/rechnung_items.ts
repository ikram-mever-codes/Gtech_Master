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

  @Column({ type: "uuid" })
  rechnung_id!: string;

  @ManyToOne(() => Rechnung, (rechnung: Rechnung) => rechnung.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "rechnung_id" })
  rechnung!: Rechnung;

  @Column({ type: "int", nullable: true })
  item_id?: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  ean?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  item_no_de?: string;

  @Column({ type: "varchar", length: 500 })
  item_name!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  taric_code?: string;

  @Column({ type: "decimal", precision: 12, scale: 3, default: 1, transformer: numericTransformer })
  quantity!: number;

  @Column({ type: "decimal", precision: 12, scale: 3, default: 0, transformer: numericTransformer })
  unit_price!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0, transformer: numericTransformer })
  total_price!: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  order_no?: string;

  @Column({ type: "text", nullable: true })
  remark?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

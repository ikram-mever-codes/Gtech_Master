// src/models/lieferschein.ts
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

@Entity("lieferscheine")
export class Lieferschein {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  delivery_note_number!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  invoice_number?: string;

  @Column({ type: "integer", nullable: true })
  auftrag_id?: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  auftrag_no?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  order_number?: string;

  // --- Dates ---
  @Column({ type: "date" })
  delivery_date!: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  date_created?: string;

  // --- References ---
  @Column({ type: "uuid", nullable: false })
  rechnung_id!: string;

  @ManyToOne(() => Rechnung, { nullable: false })
  @JoinColumn({ name: "rechnung_id" })
  rechnung!: Rechnung;

  // --- Status ---
  @Column({ type: "varchar", length: 50, default: "open" })
  status!: string;

  @Column({ type: "text", nullable: true })
  notes?: string;

  // --- UI ---
  @Column({ type: "varchar", length: 20, nullable: true })
  highlight_color?: string;

  // --- Timestamps ---
  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

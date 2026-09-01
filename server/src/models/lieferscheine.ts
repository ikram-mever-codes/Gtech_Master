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

  /**
   * Copied verbatim from Rechnung.kundenreferenz at the moment this
   * Lieferschein is generated (createLieferscheinFromRechnung).
   */
  @Column({ type: "varchar", length: 255, nullable: true })
  kundenreferenz?: string;

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
  @Column({ type: "varchar", length: 50, default: "vorläufig" })
  status!: string;

  @Column({ type: "text", nullable: true })
  notes?: string;

  // --- UI ---
  @Column({ type: "varchar", length: 20, nullable: true })
  highlight_color?: string;

  // --- Confirmation Audit ---
  @Column({ type: "timestamp", nullable: true })
  confirmed_at?: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  confirmed_by?: string;

  // --- Timestamps ---
  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { PaymentInbound } from "./payment_inbound";
import { numericTransformer } from "../utils/numeric-transformer";

export enum PaymentAllocationTargetType {
  AUFTRAG = "auftrag",
  RECHNUNG = "rechnung",
}

/**
 * A single "this much of this Payment Inbound pays for this Auftrag /
 * Rechnung" link. One PaymentInbound can have many allocations (split
 * across several documents), and one Auftrag/Rechnung can be covered by
 * several allocations from different inbound payments — same shape as a
 * bank-transaction-to-invoice matching table.
 */
@Entity("payment_allocations")
export class PaymentAllocation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  payment_inbound_id!: string;

  @ManyToOne(() => PaymentInbound, { onDelete: "CASCADE" })
  @JoinColumn({ name: "payment_inbound_id" })
  paymentInbound!: PaymentInbound;

  @Column({ type: "enum", enum: PaymentAllocationTargetType })
  target_type!: PaymentAllocationTargetType;

  // Auftrag (CustomerOrder) primary keys are integers.
  @Column({ type: "int", nullable: true })
  auftrag_id?: number;

  // Rechnung primary keys are UUIDs.
  @Column({ type: "uuid", nullable: true })
  rechnung_id?: string;

  // Denormalized so the allocation still reads sensibly (e.g. in a list
  // of "what this payment covers") even without joining back to the
  // target document.
  @Column({ type: "varchar", length: 255, nullable: true })
  target_label?: string;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  amount!: number;

  @Column({ type: "text", nullable: true })
  notes?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  created_by_user_id?: string;

  @CreateDateColumn()
  created_at!: Date;
}

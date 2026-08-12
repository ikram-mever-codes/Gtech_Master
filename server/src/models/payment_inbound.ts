import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { PaymentAccount } from "./payment_account";
import { numericTransformer } from "../utils/numeric-transformer";

@Entity("payment_inbounds")
export class PaymentInbound {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", nullable: true })
  payment_account_id?: string;

  @ManyToOne(() => PaymentAccount, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "payment_account_id" })
  paymentAccount?: PaymentAccount | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  external_transaction_id?: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  received_date!: Date;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  amount!: number;

  @Column({ type: "varchar", length: 10, default: "EUR" })
  currency_code!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  payer_name?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  payer_account_reference?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  reference?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  created_by_user_id?: string;

  @Column({ type: "varchar", length: 50, default: "manual" })
  source!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

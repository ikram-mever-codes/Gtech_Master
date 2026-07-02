import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class TaxProfile {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 150 })
  name!: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  tax_case?: string | null;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0.0 })
  tax_rate!: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  tax_code?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  revenue_account_no?: string | null;

  @Column({ type: "boolean", default: false })
  requires_vat_id!: boolean;

  @Column({ type: "boolean", default: false })
  requires_confirmed_vat_id!: boolean;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @Column({ type: "varchar", length: 255, nullable: true })
  description?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  get rate(): number {
    return this.tax_rate;
  }
  set rate(value: number) {
    this.tax_rate = value;
  }
}
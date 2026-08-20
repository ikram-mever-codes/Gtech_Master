import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Rechnung } from "./rechnung";
import { Rechnung_k } from "./rechnung_k";

@Entity("rechnung_customers")
export class RechnungCustomer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ nullable: true })
  original_customer_id?: string;

  @Column({ type: "varchar", length: 255 })
  company_name!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  display_name?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  legal_name?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  email?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  tax_number?: string;

  @Column({ type: "text", nullable: true })
  bill_to_address?: string;

  @Column({ type: "text", nullable: true })
  ship_to_address?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  city?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  country?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  phone?: string;

  @OneToMany(() => Rechnung, (rechnung: Rechnung) => rechnung.customer)
  rechnungen!: Rechnung[];

  @OneToMany(() => Rechnung_k, (rechnungK: Rechnung_k) => rechnungK.customer)
  rechnungenK!: Rechnung_k[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("gtech_company")
export class GtechCompany {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  legal_name!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  display_name?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  additional_address?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  street?: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  postal_code?: string | null;

  @Column({ type: "varchar", length: 150, nullable: true })
  city?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  country?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  shipping_additional_address?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  shipping_street?: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  shipping_postal_code?: string | null;

  @Column({ type: "varchar", length: 150, nullable: true })
  shipping_city?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  shipping_country?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  registry_no?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  vat_id?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  tax_no?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  official_no1?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  official_no2?: string | null;

  @Column({ type: "date", nullable: true })
  date_of_incorporation?: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  contact_person_name?: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  contact_phone?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  contact_email?: string | null;
  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

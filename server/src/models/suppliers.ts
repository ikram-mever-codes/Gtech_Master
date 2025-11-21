import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { SupplierItem } from "./supplier_items";
import { Item } from "./items";
import { Parent } from "./parents";

@Entity()
export class Supplier {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int", default: 1 })
  order_type_id!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  name?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  name_cn?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  company_name?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  extra_note?: string;

  @Column({ type: "int", nullable: true })
  min_order_value?: number;

  @Column({ type: "varchar", length: 3, nullable: true })
  is_fully_prepared?: string;

  @Column({ type: "varchar", length: 2, nullable: true })
  is_tax_included?: string;

  @Column({ type: "varchar", length: 2, nullable: true })
  is_freight_included?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  province?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  city?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  street?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  full_address?: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  contact_person?: string;

  @Column({ type: "varchar", length: 12, nullable: true })
  phone?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  mobile?: string;

  @Column({ type: "varchar", length: 25, nullable: true })
  email?: string;

  @Column({ type: "varchar", length: 142, nullable: true })
  website?: string;

  @Column({ type: "varchar", length: 245, nullable: true })
  bank_name?: string;

  @Column({ type: "varchar", length: 45, nullable: true })
  account_number?: string;

  @Column({ type: "varchar", length: 45, nullable: true })
  beneficiary?: string;

  @Column({ type: "int", nullable: true })
  deposit?: number;

  @Column({ type: "int", nullable: true })
  bbgd?: number;

  @Column({ type: "int", nullable: true })
  bagd?: number;

  @Column({ type: "decimal", precision: 10, scale: 0, nullable: true })
  percentage?: number;

  @Column({ type: "decimal", precision: 10, scale: 0, nullable: true })
  percentage2?: number;

  @Column({ type: "decimal", precision: 10, scale: 0, nullable: true })
  percentage3?: number;

  @OneToMany(() => SupplierItem, (supplierItem) => supplierItem.supplier)
  supplierItems!: SupplierItem[];

  @OneToMany(() => Item, (item) => item.supplier)
  items!: Item[];

  @OneToMany(() => Parent, (parent) => parent.supplier)
  parents!: Parent[];

  @ManyToOne(() => Supplier, (supplier) => supplier.parents)
  @JoinColumn({ name: "supplier_id" })
  supplier!: Supplier;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

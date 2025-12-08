// Updated parents.ts with proper nullable handling
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from "typeorm";
import { Item } from "./items";
import { Taric } from "./tarics";
import { Supplier } from "./suppliers";

@Entity()
export class Parent {
  @PrimaryColumn()
  id!: number;

  @Column({ nullable: true })
  taric_id?: number;

  @Column({ nullable: true })
  supplier_id?: number;

  @Column({ nullable: true })
  de_id?: number;

  @Column({ type: "varchar", length: 9, nullable: true })
  de_no?: string;

  @Column({ type: "varchar", length: 1, default: "Y" })
  is_active!: string;

  @Column({ type: "varchar", length: 111, nullable: true })
  name_de?: string;

  @Column({ type: "varchar", length: 80, nullable: true })
  name_en?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  name_cn?: string;

  @Column({ type: "varchar", length: 27, nullable: true })
  var_de_1?: string;

  @Column({ type: "varchar", length: 23, nullable: true })
  var_de_2?: string;

  @Column({ type: "varchar", length: 18, nullable: true })
  var_de_3?: string;

  @Column({ type: "varchar", length: 25, nullable: true })
  var_en_1?: string;

  @Column({ type: "varchar", length: 17, nullable: true })
  var_en_2?: string;

  @Column({ type: "varchar", length: 18, nullable: true })
  var_en_3?: string;

  @Column({ type: "varchar", length: 1, default: "N" })
  is_NwV!: string;

  @Column({ type: "smallint", default: 3 })
  parent_rank!: number;

  @Column({ type: "varchar", length: 1, default: "N" })
  is_var_unilingual!: string;

  @ManyToOne(() => Taric, (taric) => taric.parents, { nullable: true })
  @JoinColumn({ name: "taric_id" })
  taric: Taric | null;

  @ManyToOne(() => Supplier, (supplier) => supplier.parents, { nullable: true })
  @JoinColumn({ name: "supplier_id" })
  supplier: Supplier | null;

  @OneToMany(() => Item, (item) => item.parent)
  items: Item[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

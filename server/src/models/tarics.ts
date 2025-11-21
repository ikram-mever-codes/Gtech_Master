import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Item } from "./items";
import { Parent } from "./parents";

@Entity()
export class Taric {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 11, nullable: true })
  code?: string;

  @Column({ type: "char", length: 1, default: "Y" })
  reguler_artikel!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  duty_rate?: number;

  @Column({ type: "varchar", length: 132, nullable: true })
  name_de?: string;

  @Column({ type: "text", nullable: true })
  description_de?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  name_en?: string;

  @Column({ type: "text", nullable: true })
  description_en?: string;

  @Column({ type: "text", nullable: true })
  name_cn?: string;

  @OneToMany(() => Item, (item) => item.taric)
  items!: Item[];

  @OneToMany(() => Parent, (parent) => parent.taric)
  parents!: Parent[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from "typeorm";
import { Item } from "./items";

@Entity()
export class ItemQuality {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  item_id!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  picture?: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  name?: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "text", nullable: true })
  description_cn?: string;

  @Column({ type: "int", nullable: true })
  confirmed?: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

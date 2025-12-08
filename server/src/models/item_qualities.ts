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
  @PrimaryColumn()
  id!: number;

  @Column()
  item_id!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  picture?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  name_cn?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  name?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  description?: string;

  @Column({ type: "text", nullable: true })
  full_description?: string;

  @Column({ type: "int", nullable: true })
  confirmed?: number;

  // @ManyToOne(() => Item, (item) => item.itemQualities)
  // @JoinColumn({ name: "item_id" })
  // item!: Item;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

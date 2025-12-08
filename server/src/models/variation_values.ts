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
export class VariationValue {
  @PrimaryColumn()
  id!: number;

  @Column()
  item_id!: number;

  @Column({ type: "varchar", length: 50, nullable: true })
  value_de?: string;

  @Column({ type: "varchar", length: 30, nullable: true })
  value_de_2?: string;

  @Column({ type: "varchar", length: 30, nullable: true })
  value_de_3?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  value_en?: string;

  @Column({ type: "varchar", length: 30, nullable: true })
  value_en_2?: string;

  @Column({ type: "varchar", length: 30, nullable: true })
  value_en_3?: string;

  // @ManyToOne(() => Item, (item) => item.variationValues)
  // @JoinColumn({ name: "item_id" })
  // item!: Item;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

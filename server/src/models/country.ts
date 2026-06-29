import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class Country {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 2, unique: true })
  iso2!: string;

  @Column({ type: "varchar", length: 150 })
  name!: string;

  @Column({ type: "boolean", default: false })
  is_eu!: boolean;

  @Column({ type: "boolean", default: false })
  is_igl_country!: boolean;

  @Column({ type: "boolean", default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

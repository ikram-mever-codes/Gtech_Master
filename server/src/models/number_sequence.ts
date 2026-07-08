import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type ResetPolicy = "never" | "monthly" | "yearly";

@Entity()
export class NumberSequence {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50, unique: true })
  sequenceKey!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "varchar", length: 10 })
  prefix!: string;

  @Column({
    type: "varchar",
    length: 50,
    default: "{prefix}{yy}{mm}-{number}",
  })
  formatPattern!: string;

  @Column({ type: "int", default: 1 })
  nextRunningNo!: number;

  @Column({ type: "int", default: 2 })
  minDigits!: number;

  @Column({ type: "varchar", length: 20, default: "never" })
  resetPolicy!: ResetPolicy;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

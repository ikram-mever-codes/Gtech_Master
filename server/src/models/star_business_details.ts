import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from "typeorm";
import { Customer } from "./customers";

@Entity()
export class StarBusinessDetails {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "enum",
    enum: ["Yes", "No"],
    nullable: true,
  })
  inSeries?: "Yes" | "No";

  @Column({
    type: "enum",
    enum: ["Germany", "Switzerland", "Austria"],
    nullable: true,
  })
  madeIn?: "Germany" | "Switzerland" | "Austria";

  @Column({ type: "timestamp", nullable: true })
  lastChecked?: Date;

  @Column({
    type: "enum",
    enum: ["manual", "AI"],
    nullable: true,
  })
  checkedBy?: "manual" | "AI";

  @Column({ nullable: true })
  device?: string;

  @Column({ nullable: true })
  industry?: string;

  @OneToOne(() => Customer, (customer) => customer.starBusinessDetails)
  customer!: Customer;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

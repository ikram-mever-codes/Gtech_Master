import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Customer } from "./customers";
import { User } from "./users";

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

  @Column({ type: "timestamp", nullable: true })
  converted_timestamp?: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "check_by" })
  convertedBy?: User;

  @Column({ nullable: true })
  industry?: string;

  @Column({ type: "text", nullable: true })
  comment?: string;

  @OneToOne(() => Customer, (customer) => customer.starBusinessDetails)
  customer!: Customer;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

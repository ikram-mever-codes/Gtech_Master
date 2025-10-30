import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Customer } from "./customers";
import { User } from "./users";
import { ContactPerson } from "./contact_person";
import { RequestedItem } from "./requested_items";

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
    enum: ["Yes", "No"],
    nullable: true,
  })
  madeIn?: "Yes" | "No";

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
  @JoinColumn()
  customer!: Customer;

  @OneToMany(
    () => ContactPerson,
    (contactPerson) => contactPerson.starBusinessDetails,
    {
      cascade: true,
    }
  )
  contactPersons!: ContactPerson[];
  @OneToMany(() => RequestedItem, (requestedItem) => requestedItem.business, {
    cascade: true,
  })
  requestedItems!: RequestedItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  constructor(partial?: Partial<StarBusinessDetails>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Customer } from "./customers";
import { ContactPerson } from "./contact_person";

export type DecisionMakerState =
  | ""
  | "open"
  | "ErstEmail"
  | "Folgetelefonat"
  | "2.Email"
  | "Anfragtelefonat"
  | "weiteres Serienteil"
  | "kein Interesse";

@Entity()
export class DecisionMakerTracking {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Customer, (customer) => customer.id, { nullable: false })
  @JoinColumn({ name: "id_business" })
  business!: Customer;

  @Column({ name: "id_business" })
  idBusiness!: string;

  @ManyToOne(() => ContactPerson, (contactPerson) => contactPerson.id, {
    nullable: false,
  })
  @JoinColumn({ name: "id_contact_person" })
  contactPerson!: ContactPerson;

  @Column({ name: "id_contact_person" })
  idContactPerson!: string;

  @Column({
    type: "enum",
    enum: [
      "",
      "open",
      "ErstEmail",
      "Folgetelefonat",
      "2.Email",
      "Anfragtelefonat",
      "weiteres Serienteil",
      "kein Interesse",
    ],
    default: "",
  })
  state!: DecisionMakerState;

  @Column({ type: "text", nullable: true })
  note!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  constructor(partial?: Partial<DecisionMakerTracking>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

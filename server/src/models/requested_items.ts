import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { StarBusinessDetails } from "./star_business_details";
import { ContactPerson } from "./contact_person";
import { Inquiry } from "./inquiry";

export type Interval =
  | "Monatlich"
  | "2 monatlich"
  | "Quartal"
  | "halbjährlich"
  | "jährlich";
export type Priority = "High" | "Normal";

@Entity()
export class RequestedItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => StarBusinessDetails, (business) => business.requestedItems, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "business_id" })
  business!: StarBusinessDetails;

  @Column({ name: "business_id" })
  businessId!: string;

  @Column({ name: "contact_person_id", nullable: true })
  contactPersonId!: string;

  @Column({ type: "varchar", length: 255 })
  itemName!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  material!: string;

  @Column({ type: "text", nullable: true })
  specification!: string;

  @Column({
    type: "enum",
    enum: ["YES", "NO"],
    default: "NO",
  })
  extraItems!: "YES" | "NO";

  @Column({ type: "text", nullable: true })
  extraItemsDescriptions!: string;

  @Column({ type: "varchar", length: 100 })
  qty!: string;

  @Column({
    type: "enum",
    enum: ["Monatlich", "2 monatlich", "Quartal", "halbjährlich", "jährlich"],
    default: "Monatlich",
  })
  interval!: Interval;

  @Column({ type: "varchar", length: 100, nullable: true })
  sampleQty!: string;

  @Column({ type: "text", nullable: true })
  expectedDelivery!: string;

  @Column({
    type: "enum",
    enum: ["High", "Normal"],
    default: "Normal",
  })
  priority!: Priority;

  @Column({ type: "varchar", length: 255, nullable: true, default: "Open" })
  requestStatus!: string;

  @ManyToOne(
    () => ContactPerson,
    (contactPerson) => contactPerson.requestedItems,
    {
      nullable: true,
      onDelete: "SET NULL",
    }
  )
  @JoinColumn({ name: "contact_person_id" })
  contactPerson!: ContactPerson;

  @Column({ type: "text", nullable: true })
  comment!: string;

  @Column({ type: "text", nullable: true })
  extraNote!: string;

  @Column({ type: "text", nullable: true })
  asanaLink!: string;

  @ManyToOne(() => Inquiry, (inquiry) => inquiry.requests, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "inquiry_id" })
  inquiry!: Inquiry;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  constructor(partial?: Partial<RequestedItem>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

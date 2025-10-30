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
import { RequestedItem } from "./requested_items";

export type Sex = "male" | "female" | "Not Specified";
export type Position =
  | "Einkauf"
  | "Entwickler"
  | "Produktionsleiter"
  | "Betriebsleiter"
  | "Geschäftsführer"
  | "Owner"
  | "Others"
  | "";
export type LinkedInState =
  | "open"
  | "NoLinkedIn"
  | "Vernetzung geschickt"
  | "Linked angenommen"
  | "Erstkontakt"
  | "im Gespräch"
  | "NichtAnsprechpartner";
export type ContactType =
  | "User"
  | "Purchaser"
  | "Influencer"
  | "Gatekeeper"
  | "DecisionMaker technical"
  | "DecisionMaker financial"
  | "real DecisionMaker"
  | "";
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
export class ContactPerson {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "enum",
    enum: ["male", "female", "Not Specified"],
    default: "Not Specified",
  })
  sex!: Sex;

  @ManyToOne(
    () => StarBusinessDetails,
    (starBusiness) => starBusiness.contactPersons,
    {
      nullable: false,
      onDelete: "CASCADE",
    }
  )
  @JoinColumn({ name: "star_business_details_id" })
  starBusinessDetails!: StarBusinessDetails;

  @OneToMany(
    () => RequestedItem,
    (requestedItem) => requestedItem.contactPerson
  )
  requestedItems!: RequestedItem[];

  @Column({ name: "star_business_details_id" })
  starBusinessDetailsId!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255 })
  familyName!: string;

  @Column({
    type: "enum",
    enum: [
      "Einkauf",
      "Entwickler",
      "Produktionsleiter",
      "Betriebsleiter",
      "Geschäftsführer",
      "Owner",
      "Others",
      "",
    ],
    default: "",
  })
  position!: Position;

  @Column({ type: "text", nullable: true })
  positionOthers!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  email!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  phone!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  linkedInLink!: string;

  @Column({ type: "text", nullable: true })
  noteContactPreference!: string;

  @Column({
    type: "enum",
    enum: [
      "open",
      "NoLinkedIn",
      "Vernetzung geschickt",
      "Linked angenommen",
      "Erstkontakt",
      "im Gespräch",
      "NichtAnsprechpartner",
    ],
    default: "open",
  })
  stateLinkedIn!: LinkedInState;

  @Column({
    type: "enum",
    enum: [
      "User",
      "Purchaser",
      "Influencer",
      "Gatekeeper",
      "DecisionMaker technical",
      "DecisionMaker financial",
      "real DecisionMaker",
      "",
    ],
    default: "",
  })
  contact!: ContactType;

  @Column({ type: "boolean", default: false })
  isDecisionMaker!: boolean;

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
  decisionMakerState!: DecisionMakerState;

  @Column({ type: "text", nullable: true })
  note!: string;

  @Column({ type: "text", nullable: true })
  decisionMakerNote!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  constructor(partial?: Partial<ContactPerson>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

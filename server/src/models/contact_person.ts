import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { StarBusinessDetails } from "./star_business_details";

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

  @Column({ type: "text", nullable: true })
  note!: string;

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

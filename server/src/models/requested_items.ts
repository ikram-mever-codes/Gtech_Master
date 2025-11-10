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
import { ContactPerson } from "./contact_person";

export type Interval =
  | "Monatlich"
  | "2 monatlich"
  | "Quartal"
  | "halbjährlich"
  | "jährlich";
export type Priority = "High" | "Normal";
export type RequestStatus =
  | "open"
  | "supplier search"
  | "stopped"
  | "successful"
  | "Anfrage gestoppt"
  | "Anfrage verschoben"
  | "Anfrage Phase"
  | "Musterplanung"
  | "WAS besprechen"
  | "Musterbeschaffung"
  | "Muster Empfänger klären"
  | "Muster vom Kunden in DE"
  | "Muster unterwegs"
  | "Lieferanten Findung"
  | "Rückfragen an Kunden"
  | "Angebot erstellen"
  | "Angebot besprechen"
  | "Artikel erstellen"
  | "AB an Kunden Muster"
  | "Muster bestellen"
  | "Muster fertiggestellt"
  | "Muster Versand vorbereiten"
  | "Muster versendet"
  | "Rückmeldung Liefertermin Muster"
  | "Muster auf dem Weg"
  | "Muster ist in DE"
  | "Artikel in MIS korrigieren"
  | "Muster Versand an Kunden"
  | "Muster Eingang beim Kunden"
  | "Kontakt mit Kunden Muster"
  | "Trial order besprechen"
  | "AB an Kunden gesendet"
  | "Trial order bestellt"
  | "Trial order fertiggestellt"
  | "Trial order vorbereiten"
  | "Rückmeldung Liefertermin Trial Order"
  | "Trial order Verfolgung"
  | "Trial order Wareneingang DE"
  | "Trial order Eingang beim Kunde"
  | "Trial order besprechen nach Erhalt"
  | "Übergabe an COO"
  | "Anruf Serienteil Planung"
  | "Bestellung Serienteil erstellen"
  | "Serienteil fertiggestellt"
  | "Fracht vorbereiten MIS"
  | "Versanddetails erhalten"
  | "Rückmeldung Liefertermin Serienteil"
  | "Serienteil Verfolgung"
  | "Serienteil Wareneingang DE"
  | "Serienteil Eingang beim Kunde";

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
  qty!: string; // e.g., "24000 Stk"

  @Column({
    type: "enum",
    enum: ["Monatlich", "2 monatlich", "Quartal", "halbjährlich", "jährlich"],
    default: "Monatlich",
  })
  interval!: Interval;

  @Column({ type: "varchar", length: 100, nullable: true })
  sampleQty!: string; // e.g., "30 Stk"

  @Column({ type: "text", nullable: true })
  expectedDelivery!: string;

  @Column({
    type: "enum",
    enum: ["High", "Normal"],
    default: "Normal",
  })
  priority!: Priority;

  @Column({
    type: "enum",
    enum: [
      "open",
      "supplier search",
      "stopped",
      "successful",
      "Anfrage gestoppt",
      "Anfrage verschoben",
      "Anfrage Phase",
      "Musterplanung",
      "WAS besprechen",
      "Musterbeschaffung",
      "Muster Empfänger klären",
      "Muster vom Kunden in DE",
      "Muster unterwegs",
      "Lieferanten Findung",
      "Rückfragen an Kunden",
      "Angebot erstellen",
      "Angebot besprechen",
      "Artikel erstellen",
      "AB an Kunden Muster",
      "Muster bestellen",
      "Muster fertiggestellt",
      "Muster Versand vorbereiten",
      "Muster versendet",
      "Rückmeldung Liefertermin Muster",
      "Muster auf dem Weg",
      "Muster ist in DE",
      "Artikel in MIS korrigieren",
      "Muster Versand an Kunden",
      "Muster Eingang beim Kunden",
      "Kontakt mit Kunden Muster",
      "Trial order besprechen",
      "AB an Kunden gesendet",
      "Trial order bestellt",
      "Trial order fertiggestellt",
      "Trial order vorbereiten",
      "Rückmeldung Liefertermin Trial Order",
      "Trial order Verfolgung",
      "Trial order Wareneingang DE",
      "Trial order Eingang beim Kunde",
      "Trial order besprechen nach Erhalt",
      "Übergabe an COO",
      "Anruf Serienteil Planung",
      "Bestellung Serienteil erstellen",
      "Serienteil fertiggestellt",
      "Fracht vorbereiten MIS",
      "Versanddetails erhalten",
      "Rückmeldung Liefertermin Serienteil",
      "Serienteil Verfolgung",
      "Serienteil Wareneingang DE",
      "Serienteil Eingang beim Kunde",
    ],
    default: "open",
  })
  requestStatus!: RequestStatus;

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

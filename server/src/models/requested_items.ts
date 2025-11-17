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
  | "1_Anfrage gestoppt"
  | "2_Anfrage verschoben"
  | "3_Anfrage Phase"
  | "4_Musterplanung"
  | "5_WAS besprechen"
  | "6_Musterbeschaffung"
  | "7_Muster Empfänger klären"
  | "8_Muster vom Kunden in DE"
  | "9_Muster unterwegs"
  | "10_Lieferanten Findung"
  | "11_Rückfragen an Kunden"
  | "11_Angebot erstellen"
  | "12_Angebot besprechen"
  | "13_Artikel erstellen"
  | "14_AB an Kunden Muster"
  | "15_Muster bestellen"
  | "16_Muster fertiggestellt"
  | "17_Muster Versand vorbereiten"
  | "18_Muster versendet"
  | "19_Rückmeldung Liefertermin Muster"
  | "20_Muster auf dem Weg"
  | "21_Muster ist in DE"
  | "22_Artikel in MIS korrigieren"
  | "23_Muster Versand an Kunden"
  | "24_Muster Eingang beim Kunden"
  | "25_Kontakt mit Kunden Muster"
  | "26_Trial order besprechen"
  | "27_AB an Kunden gesendet"
  | "28_Trial order bestellt"
  | "29_Trial order fertiggestellt"
  | "30_Trial order vorbereiten"
  | "31_Rückmeldung Liefertermin Trial Order"
  | "32_Trial order Verfolgung"
  | "33_Trial order Wareneingang DE"
  | "34_Trial order Eingang beim Kunde"
  | "35_Trial order besprechen nach Erhalt"
  | "36_Übergabe an COO"
  | "37_Anruf Serienteil Planung"
  | "38_Bestellung Serienteil erstellen"
  | "39_Serienteil fertiggestellt"
  | "40_Fracht vorbereiten MIS"
  | "41_Versanddetails erhalten"
  | "42_Rückmeldung Liefertermin Serienteil"
  | "43_Serienteil Verfolgung"
  | "44_Serienteil Wareneingang DE"
  | "45_Serienteil Eingang beim Kunde"
  | "";

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
      "1_Anfrage gestoppt",
      "2_Anfrage verschoben",
      "3_Anfrage Phase",
      "4_Musterplanung",
      "5_WAS besprechen",
      "6_Musterbeschaffung",
      "7_Muster Empfänger klären",
      "8_Muster vom Kunden in DE",
      "9_Muster unterwegs",
      "10_Lieferanten Findung",
      "11_Rückfragen an Kunden",
      "11_Angebot erstellen",
      "12_Angebot besprechen",
      "13_Artikel erstellen",
      "14_AB an Kunden Muster",
      "15_Muster bestellen",
      "16_Muster fertiggestellt",
      "17_Muster Versand vorbereiten",
      "18_Muster versendet",
      "19_Rückmeldung Liefertermin Muster",
      "20_Muster auf dem Weg",
      "21_Muster ist in DE",
      "22_Artikel in MIS korrigieren",
      "23_Muster Versand an Kunden",
      "24_Muster Eingang beim Kunden",
      "25_Kontakt mit Kunden Muster",
      "26_Trial order besprechen",
      "27_AB an Kunden gesendet",
      "28_Trial order bestellt",
      "29_Trial order fertiggestellt",
      "30_Trial order vorbereiten",
      "31_Rückmeldung Liefertermin Trial Order",
      "32_Trial order Verfolgung",
      "33_Trial order Wareneingang DE",
      "34_Trial order Eingang beim Kunde",
      "35_Trial order besprechen nach Erhalt",
      "36_Übergabe an COO",
      "37_Anruf Serienteil Planung",
      "38_Bestellung Serienteil erstellen",
      "39_Serienteil fertiggestellt",
      "40_Fracht vorbereiten MIS",
      "41_Versanddetails erhalten",
      "42_Rückmeldung Liefertermin Serienteil",
      "43_Serienteil Verfolgung",
      "44_Serienteil Wareneingang DE",
      "45_Serienteil Eingang beim Kunde",
      "",
    ],
    nullable: true,
    default: "",
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

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
  AfterLoad,
} from "typeorm";
import { Invoice } from "./invoice";
import { BusinessDetails } from "./business_details";
import { StarBusinessDetails } from "./star_business_details";
import { StarCustomerDetails } from "./star_customer_details";
import { Inquiry } from "./inquiry";

@Entity()
export class Customer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    type: "enum",
    enum: ["business", "star_business", "star_customer", "device_maker"],
    default: "business",
  })
  stage!: "business" | "star_business" | "star_customer" | "device_maker";

  @Column({ unique: true })
  companyName!: string;

  @Column({ nullable: true })
  legalName?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ unique: true, nullable: true })
  email!: string;

  @Column({ nullable: true })
  contactEmail!: string;

  @Column({ nullable: true })
  contactPhoneNumber!: string;

  @Column({ nullable: true })
  taxNumber?: string;

  @Column({ nullable: true })
  addressLine1?: string;

  @Column({ nullable: true })
  addressLine2?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  postalCode?: string;

  @Column({ nullable: true })
  country?: string;

  @OneToOne(() => BusinessDetails, { nullable: true, cascade: true })
  @JoinColumn()
  businessDetails?: BusinessDetails;

  @OneToOne(() => StarBusinessDetails, { nullable: true, cascade: true })
  @JoinColumn()
  starBusinessDetails?: StarBusinessDetails;

  @OneToOne(() => StarCustomerDetails, { nullable: true, cascade: true })
  @JoinColumn()
  starCustomerDetails?: StarCustomerDetails;

  @OneToMany(() => Invoice, (invoice) => invoice.customer)
  invoices!: Invoice[];

  @OneToMany(() => Inquiry, (inquiry) => inquiry.customer)
  inquiries!: Inquiry;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
  @AfterLoad()
  populateDetails() {
    if (this.businessDetails) {
      this.city = this.city || this.businessDetails.city;
      this.postalCode = this.postalCode || this.businessDetails.postalCode;
      this.addressLine1 = this.addressLine1 || this.businessDetails.address;
      this.country = this.country || this.businessDetails.country;
    }
    if (this.starCustomerDetails) {
      this.city = this.city || this.starCustomerDetails.deliveryCity;
      this.postalCode =
        this.postalCode || this.starCustomerDetails.deliveryPostalCode;
      this.addressLine1 =
        this.addressLine1 || this.starCustomerDetails.deliveryAddressLine1;
      this.country =
        this.country || this.starCustomerDetails.deliveryCountry;
      this.taxNumber = this.taxNumber || this.starCustomerDetails.taxNumber;
    }
  }

  constructor(partial?: Partial<Customer>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

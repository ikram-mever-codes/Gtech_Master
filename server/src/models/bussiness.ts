import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum BUSINESS_STATUS {
  ACTIVE = "active",
  INACTIVE = "inactive",
  NO_WEBSITE = "no_website",
}

export enum BUSINESS_SOURCE {
  SHOP = "Shop",
  INQUIRY = "Anfrage",
  RECOMMENDATION = "Empfehlung",
  SEARCH = "Suche",
  MANUAL = "Manual",
  GOOGLE_MAPS = "Google Maps",
}

@Entity()
export class Business {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ nullable: false })
  name!: string;

  @Column({ nullable: true })
  description!: string;

  @Column({ nullable: false })
  address!: string;

  @Column({ nullable: true })
  city!: string;

  @Column({ nullable: true })
  state!: string;

  @Column({ nullable: true })
  country!: string;

  @Column({ nullable: true })
  postalCode!: string;

  @Column("decimal", { precision: 10, scale: 7, nullable: true })
  @Index()
  latitude!: number;

  @Column("decimal", { precision: 10, scale: 7, nullable: true })
  @Index()
  longitude!: number;

  @Column({ nullable: true })
  website!: string;

  @Column({ nullable: true })
  phoneNumber!: string;

  @Column({ nullable: true })
  email!: string;

  @Column({ type: "json", nullable: true })
  socialMedia!: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };

  @Column({ nullable: true, unique: true })
  googlePlaceId!: string;

  @Column({ nullable: true })
  googleMapsUrl!: string;

  @Column("int", { nullable: true })
  reviewCount!: number;

  @Column("decimal", { precision: 3, scale: 2, nullable: true })
  averageRating!: number;

  @Column({ nullable: true })
  category!: string;

  @Column("simple-array", { nullable: true })
  additionalCategories!: string[];

  @Column({ type: "json", nullable: true })
  businessHours!: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };

  // Source of the business entry
  @Column({
    type: "enum",
    enum: BUSINESS_SOURCE,
    default: BUSINESS_SOURCE.SHOP,
  })
  source!: BUSINESS_SOURCE;

  // Status and Import Management
  @Column({
    type: "enum",
    enum: BUSINESS_STATUS,
    default: BUSINESS_STATUS.ACTIVE,
  })
  status!: BUSINESS_STATUS;

  @Column({ default: false })
  hasWebsite!: boolean;

  @Column({ type: "timestamp", nullable: true })
  lastVerifiedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  shouldImport(): boolean {
    return this.hasWebsite && this.status !== BUSINESS_STATUS.NO_WEBSITE;
  }

  getFullAddress(): string {
    return [this.address, this.city, this.state, this.postalCode, this.country]
      .filter((part) => part && part.trim() !== "")
      .join(", ");
  }

  needsVerification(): boolean {
    if (!this.lastVerifiedAt) return true;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.lastVerifiedAt < thirtyDaysAgo;
  }
}

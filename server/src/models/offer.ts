import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from "typeorm";
import { Inquiry } from "./inquiry";
import { Customer } from "./customers";

export type OfferStatus =
  | "Draft"
  | "Submitted"
  | "Negotiation"
  | "Accepted"
  | "Rejected"
  | "Expired"
  | "Cancelled";

export type Currency = "RMB" | "HKD" | "EUR" | "USD";

export interface QuantityPrice {
  quantity: string;
  price: number;
  isActive: boolean;
  total: number;
}

export interface UnitPrice {
  id: string;
  quantity: string;
  unitPrice: number; // 3 decimal places for unit price
  totalPrice: number; // 2 decimal places for total price
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerSnapshot {
  id: string;
  companyName: string;
  legalName?: string;
  email?: string;
  contactEmail?: string;
  contactPhoneNumber?: string;
  vatId?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  street?: string;
  state?: string;
  additionalInfo?: string;
}

@Entity()
export class Offer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  offerNumber!: string;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @ManyToOne(() => Inquiry, (inquiry) => inquiry.offers, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "inquiry_id" })
  inquiry!: Inquiry;

  @Column({ name: "inquiry_id" })
  inquiryId!: string;

  // Inquiry snapshot - stored as JSON
  @Column({ type: "json", nullable: true })
  inquirySnapshot!: {
    id: string;
    name: string;
    isAssembly: boolean;
    description?: string;
    createdAt: Date;
  };

  // Customer snapshot - stored as JSON
  @Column({ type: "json", nullable: false })
  customerSnapshot!: CustomerSnapshot;

  // Delivery address (can be different from billing address)
  @Column({ type: "json", nullable: true })
  deliveryAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    additionalInfo?: string;
    contactName?: string;
    contactPhone?: string;
  };

  // Offer details
  @Column({
    type: "enum",
    enum: [
      "Draft",
      "Submitted",
      "Negotiation",
      "Accepted",
      "Rejected",
      "Expired",
      "Cancelled",
    ],
    default: "Draft",
  })
  status!: OfferStatus;

  @Column({ type: "date", nullable: true })
  validUntil?: Date;

  @Column({ type: "text", nullable: true })
  termsConditions?: string;

  @Column({ type: "text", nullable: true })
  deliveryTerms?: string;

  @Column({ type: "text", nullable: true })
  paymentTerms?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  deliveryTime?: string;

  @Column({
    type: "enum",
    enum: ["RMB", "HKD", "EUR", "USD"],
    default: "EUR",
  })
  currency!: Currency;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
    nullable: true,
  })
  discountPercentage!: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
    nullable: true,
  })
  discountAmount!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  subtotal!: number;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    nullable: true,
  })
  shippingCost!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  taxAmount!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  totalAmount!: number;

  // Notes
  @Column({ type: "text", nullable: true })
  notes?: string;

  @Column({ type: "text", nullable: true })
  internalNotes?: string;

  // Assembly specific fields
  @Column({ type: "boolean", default: false })
  isAssembly!: boolean;

  @Column({ type: "varchar", length: 255, nullable: true })
  assemblyName?: string;

  @Column({ type: "text", nullable: true })
  assemblyDescription?: string;

  @Column({ type: "text", nullable: true })
  assemblyNotes?: string;

  // PDF generation
  @Column({ type: "text", nullable: true })
  pdfPath?: string;

  @Column({ type: "boolean", default: false })
  pdfGenerated!: boolean;

  @Column({ type: "timestamp", nullable: true })
  pdfGeneratedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Revision tracking
  @Column({ type: "integer", default: 1 })
  revision!: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  previousOfferNumber?: string;

  // Relationships
  @OneToMany(() => OfferLineItem, (lineItem) => lineItem.offer, {
    cascade: true,
    eager: true,
  })
  lineItems!: OfferLineItem[];

  @BeforeInsert()
  generateOfferNumber() {
    if (!this.offerNumber) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");
      this.offerNumber = `OFF-${year}${month}${day}-${random}`;
    }
  }

  @BeforeInsert()
  calculateTotals() {
    if (!this.subtotal && this.lineItems) {
      this.subtotal = this.lineItems.reduce(
        (sum, item) => sum + (item.lineTotal || 0),
        0
      );
    }

    if (this.discountPercentage > 0) {
      this.discountAmount = (this.subtotal * this.discountPercentage) / 100;
    }

    // Calculate VAT (19% as default)
    const taxableAmount =
      this.subtotal - this.discountAmount + (this.shippingCost || 0);
    this.taxAmount = taxableAmount * 0.19;

    this.totalAmount = taxableAmount + this.taxAmount;
  }

  constructor(partial?: Partial<Offer>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

@Entity()
export class OfferLineItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Offer, (offer) => offer.lineItems, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "offer_id" })
  offer!: Offer;

  @Column({ name: "offer_id" })
  offerId!: string;

  @Column({ type: "boolean", default: false })
  isEstimated!: boolean;

  @Column({ name: "requested_item_id", nullable: true })
  requestedItemId?: string;

  @Column({ type: "varchar", length: 255 })
  itemName!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  material?: string;

  @Column({ type: "text", nullable: true })
  specification?: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "float", nullable: true })
  weight?: number;

  @Column({ type: "float", nullable: true })
  width?: number;

  @Column({ type: "float", nullable: true })
  height?: number;

  @Column({ type: "float", nullable: true })
  length?: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  quantity?: string;

  @Column({ type: "boolean", default: false })
  useUnitPrices!: boolean;

  @Column({ type: "integer", default: 3, nullable: true })
  unitPriceDecimalPlaces!: number;

  @Column({ type: "integer", default: 2, nullable: true })
  totalPriceDecimalPlaces!: number;

  @Column({ type: "json", nullable: true })
  unitPrices?: UnitPrice[];

  @Column({ type: "integer", default: 0, nullable: true })
  maxUnitPriceColumns!: number;

  @Column({ type: "decimal", precision: 12, scale: 3, nullable: true })
  purchasePrice?: number;

  @Column({
    type: "enum",
    enum: ["RMB", "HKD", "EUR", "USD"],
    nullable: true,
  })
  purchaseCurrency?: string;

  @Column({ type: "json", nullable: true })
  quantityPrices?: QuantityPrice[];

  @Column({ type: "varchar", length: 100, nullable: true })
  baseQuantity?: string;

  @Column({ type: "decimal", precision: 10, scale: 3, nullable: true })
  basePrice?: number;

  @Column({ type: "decimal", precision: 10, scale: 3, nullable: true })
  samplePrice?: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  sampleQuantity?: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  lineTotal!: number;

  @Column({ type: "integer", default: 1 })
  position!: number;

  @Column({ type: "boolean", default: false })
  isAssemblyItem!: boolean;

  @Column({ type: "boolean", default: false })
  isComponent!: boolean;

  @Column({ name: "parent_item_id", nullable: true })
  parentItemId?: string;

  @Column({ type: "text", nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  calculateLineTotal() {
    if (this.useUnitPrices && this.unitPrices && this.unitPrices.length > 0) {
      const activeUnitPrice = this.unitPrices.find((up) => up.isActive);
      if (activeUnitPrice) {
        this.lineTotal = activeUnitPrice.totalPrice || 0;
        return;
      }
    }

    if (this.quantityPrices && this.quantityPrices.length > 0) {
      const activePrice = this.quantityPrices.find((qp) => qp.isActive);
      if (activePrice) {
        this.lineTotal = activePrice.total || 0;
        return;
      }
    }
    if (this.basePrice && this.baseQuantity) {
      const quantity = parseFloat(this.baseQuantity) || 1;
      this.lineTotal = this.basePrice * quantity;
    }
  }

  constructor(partial?: Partial<OfferLineItem>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

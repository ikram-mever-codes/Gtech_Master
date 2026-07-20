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
import { v4 as uuidv4 } from "uuid";
import { Inquiry } from "./inquiry";
import { Customer } from "./customers";
import { numericTransformer } from "../utils/numeric-transformer";
import { parseFlexibleNumber } from "../utils/decimal";

export type OfferStatus =
  | "Draft"
  | "Submitted"
  | "Negotiation"
  | "Accepted"
  | "Rejected"
  | "Expired"
  | "Cancelled";

export type Currency = "RMB" | "HKD" | "EUR" | "USD";

export type OfferSourceType = "inquiry" | "item" | "customer";

/**
 * Classic: exactly one quantity, one price, one tax rate, one subtotal
 * per line. Matrix (Qty_price_matrix): many quantity/price pairs per line.
 */
export type PricingMode = "classic" | "matrix";

/**
 * One cell of the quantity/price matrix. `price: null` is the client's "."
 * placeholder — a tier that intentionally has no calculated price yet,
 * shown as "." rather than 0 or a blank cell.
 */
export interface PriceMatrixEntry {
  id: string;
  quantity: string;
  price: number | null;
  total: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerSnapshot {
  id: string;
  customerNumber?: string;
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

export interface ItemSnapshot {
  id: string;
  itemName: string;
  itemNameCn?: string;
  ean?: string;
  model?: string;
  description?: string;
  specification?: string;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  purchasePrice?: number;
  purchaseCurrency?: string;
  photo?: string;
}

export interface InquirySnapshot {
  id: string;
  name: string;
  isAssembly: boolean;
  description?: string;
  createdAt: Date;
  referenceNumber?: string;
  status?: string;
  requestsCount?: number;
}

@Entity()
export class Offer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  offerNumber!: string;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "varchar", length: 20, default: "inquiry" })
  sourceType!: OfferSourceType;

  @ManyToOne(() => Inquiry, (inquiry) => inquiry.offers, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "inquiry_id" })
  inquiry?: Inquiry | null;

  @Column({ name: "inquiry_id", nullable: true })
  inquiryId?: string | null;

  @Column({ type: "json", nullable: true })
  inquirySnapshot?: InquirySnapshot | null;

  @Column({ name: "item_id", type: "varchar", length: 100, nullable: true })
  itemId?: string | null;

  @Column({ type: "json", nullable: true })
  itemSnapshot?: ItemSnapshot | null;

  @Column({ name: "customer_id", type: "varchar", length: 100, nullable: true })
  customerId?: string | null;

  @Column({ type: "json", nullable: false })
  customerSnapshot!: CustomerSnapshot;

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
  paymentMethod?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  shippingMethod?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  deliveryTime?: string;

  @Column({
    type: "enum",
    enum: ["RMB", "HKD", "EUR", "USD"],
    default: "EUR",
  })
  currency!: Currency;

  /** Classic vs Qty_price_matrix, per line. Set at offer level. */
  @Column({ type: "varchar", length: 20, default: "classic" })
  pricingMode!: PricingMode;

  /** Document-level, editable tax rate as a percentage (e.g. 19 = 19%). */
  @Column({
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 19,
    transformer: numericTransformer,
  })
  taxRate!: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
    nullable: true,
    transformer: numericTransformer,
  })
  discountPercentage!: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
    nullable: true,
    transformer: numericTransformer,
  })
  discountAmount!: number;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    nullable: true,
    transformer: numericTransformer,
  })
  subtotal!: number;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    nullable: true,
    transformer: numericTransformer,
  })
  shippingCost!: number;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  taxAmount!: number;

  @Column({
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  totalAmount!: number;

  @Column({ type: "text", nullable: true })
  notes?: string;

  @Column({ type: "text", nullable: true })
  internalNotes?: string;

  @Column({ type: "boolean", default: false })
  isAssembly!: boolean;

  @Column({ type: "varchar", length: 255, nullable: true })
  assemblyName?: string;

  @Column({ type: "text", nullable: true })
  assemblyDescription?: string;

  @Column({ type: "text", nullable: true })
  assemblyNotes?: string;

  /** Matrix-mode display settings. Unused in classic mode. */
  @Column({ type: "integer", default: 3, nullable: true })
  unitPriceDecimalPlaces!: number;

  @Column({ type: "integer", default: 2, nullable: true })
  totalPriceDecimalPlaces!: number;

  @Column({ type: "integer", default: 3, nullable: true })
  maxUnitPriceColumns!: number;

  /** Template tiers applied to new/synced line items in matrix mode. */
  @Column({ type: "json", nullable: true })
  defaultPriceMatrix?: PriceMatrixEntry[];

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

  @Column({ type: "integer", default: 1 })
  revision!: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  previousOfferNumber?: string;

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
  @BeforeUpdate()
  calculateTotals() {
    if (this.lineItems && this.lineItems.length > 0) {
      this.subtotal = this.lineItems.reduce((sum, item) => {
        if (item.isComponent) return sum;
        return sum + (item.getLineTotal(this.pricingMode) || 0);
      }, 0);
    }

    if (this.discountPercentage > 0) {
      this.discountAmount = (this.subtotal * this.discountPercentage) / 100;
    }

    const taxableAmount =
      this.subtotal - this.discountAmount + (this.shippingCost || 0);
    const rate = (this.taxRate ?? 19) / 100;
    this.taxAmount = taxableAmount * rate;
    this.totalAmount = taxableAmount + this.taxAmount;
  }

  @BeforeInsert()
  initializeDefaultPriceMatrix() {
    if (this.pricingMode === "matrix" && !this.defaultPriceMatrix) {
      const now = new Date();
      this.defaultPriceMatrix = ["1000", "5000", "10000"].map((q, i) => ({
        id: uuidv4(),
        quantity: q,
        price: null,
        total: null,
        isActive: i === 0,
        createdAt: now,
        updatedAt: now,
      }));
    }
  }

  getActiveDefaultTier(): PriceMatrixEntry | null {
    if (this.pricingMode === "matrix" && this.defaultPriceMatrix?.length) {
      return this.defaultPriceMatrix.find((t) => t.isActive) || null;
    }
    return null;
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

  @Column({
    name: "source_item_id",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  sourceItemId?: string;

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

  /** Extra weight, decimal-capable (e.g. 0.1, 2, 4.5). */
  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  extraWeight?: number;

  /** Expected delivery date for this line item. */
  @Column({ type: "date", nullable: true })
  expectedDeliveryDate?: Date;

  /** UI highlight color for this offer line (e.g. "#FFEE58" or a named color). */
  @Column({ type: "varchar", length: 20, nullable: true })
  highlightColor?: string;

  // --- Classic mode: exactly one quantity, one price -----------------------
  @Column({ type: "varchar", length: 100, nullable: true })
  baseQuantity?: string;

  @Column({ type: "decimal", precision: 12, scale: 3, nullable: true })
  basePrice?: number;

  // --- Matrix mode: many quantity/price pairs -------------------------------
  @Column({ type: "json", nullable: true })
  priceMatrix?: PriceMatrixEntry[];

  @Column({ type: "decimal", precision: 12, scale: 3, nullable: true })
  purchasePrice?: number;

  @Column({
    type: "enum",
    enum: ["RMB", "HKD", "EUR", "USD"],
    nullable: true,
  })
  purchaseCurrency?: string;

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
  calculateLineTotal(pricingMode?: PricingMode) {
    const mode = pricingMode || this.offer?.pricingMode || "classic";

    if (mode === "matrix" && this.priceMatrix && this.priceMatrix.length > 0) {
      const active = this.priceMatrix.find((p) => p.isActive);
      if (active && active.total !== null) {
        this.lineTotal = active.total;
        return;
      }
    }

    const price = Number(this.basePrice) || 0;
    const quantity = parseFlexibleNumber(this.baseQuantity) || 1;
    this.lineTotal = price * quantity;
  }
  getLineTotal(pricingMode?: PricingMode): number {
    this.calculateLineTotal(pricingMode);
    return this.lineTotal || 0;
  }

  getActiveMatrixEntry(): PriceMatrixEntry | null {
    return (this.priceMatrix || []).find((p) => p.isActive) || null;
  }

  formatPrice(price: number | null, decimals = 3): string {
    if (price === null || price === undefined) return ".";
    return price.toFixed(decimals);
  }

  formatTotalPrice(price: number, decimals = 2): string {
    if (isNaN(price) || !isFinite(price)) return `0.${"0".repeat(decimals)}`;
    return price.toFixed(decimals);
  }

  /** Applies the offer's tier template to this line, keeping any already-entered prices for matching tiers. */
  syncPriceMatrixWithOffer(offer: Offer): void {
    if (offer.pricingMode === "matrix" && offer.defaultPriceMatrix) {
      const existing = this.priceMatrix || [];
      this.priceMatrix = offer.defaultPriceMatrix.map((tpl) => {
        const match = existing.find((e) => e.quantity === tpl.quantity);
        return match
          ? {
              ...tpl,
              price: match.price,
              total: match.total,
              isActive: match.isActive,
            }
          : { ...tpl };
      });
    }
  }

  constructor(partial?: Partial<OfferLineItem>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

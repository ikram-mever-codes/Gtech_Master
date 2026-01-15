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
  unitPrice: number;
  totalPrice: number;
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

  @Column({ type: "json", nullable: true })
  inquirySnapshot!: {
    id: string;
    name: string;
    isAssembly: boolean;
    description?: string;
    createdAt: Date;
  };

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

  @Column({ type: "boolean", default: false })
  useUnitPrices!: boolean;

  @Column({ type: "integer", default: 3, nullable: true })
  unitPriceDecimalPlaces!: number;

  @Column({ type: "integer", default: 2, nullable: true })
  totalPriceDecimalPlaces!: number;

  @Column({ type: "integer", default: 3, nullable: true })
  maxUnitPriceColumns!: number;

  @Column({ type: "json", nullable: true })
  defaultUnitPrices?: UnitPrice[];

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
        if (
          this.useUnitPrices &&
          item.unitPrices &&
          item.unitPrices.length > 0
        ) {
          const activeUnitPrice = item.unitPrices.find((up) => up.isActive);
          if (activeUnitPrice) {
            return sum + (activeUnitPrice.totalPrice || 0);
          }
        } else if (item.quantityPrices && item.quantityPrices.length > 0) {
          const activePrice = item.quantityPrices.find((qp) => qp.isActive);
          if (activePrice) {
            return sum + (activePrice.total || 0);
          }
        } else if (item.basePrice && item.baseQuantity) {
          const quantity = parseFloat(item.baseQuantity) || 1;
          return sum + item.basePrice * quantity;
        }
        return sum + (item.lineTotal || 0);
      }, 0);
    }

    if (this.discountPercentage > 0) {
      this.discountAmount = (this.subtotal * this.discountPercentage) / 100;
    }

    const taxableAmount =
      this.subtotal - this.discountAmount + (this.shippingCost || 0);
    this.taxAmount = taxableAmount * 0.19;

    this.totalAmount = taxableAmount + this.taxAmount;
  }

  @BeforeInsert()
  initializeDefaultUnitPrices() {
    if (this.useUnitPrices && !this.defaultUnitPrices) {
      this.defaultUnitPrices = [
        {
          id: `unit-price-default-1-${Date.now()}`,
          quantity: "1000",
          unitPrice: 0,
          totalPrice: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: `unit-price-default-2-${Date.now()}`,
          quantity: "5000",
          unitPrice: 0,
          totalPrice: 0,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: `unit-price-default-3-${Date.now()}`,
          quantity: "10000",
          unitPrice: 0,
          totalPrice: 0,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
    }
  }

  getActiveUnitPrice(): UnitPrice | null {
    if (
      this.useUnitPrices &&
      this.defaultUnitPrices &&
      this.defaultUnitPrices.length > 0
    ) {
      return this.defaultUnitPrices.find((up) => up.isActive) || null;
    }
    return null;
  }

  updateLineItemsForUnitPricing(): void {
    if (!this.lineItems) return;

    this.lineItems.forEach((lineItem) => {
      if (
        this.useUnitPrices &&
        (!lineItem.unitPrices || lineItem.unitPrices.length === 0)
      ) {
        lineItem.unitPrices = this.defaultUnitPrices
          ? JSON.parse(JSON.stringify(this.defaultUnitPrices)) // Deep copy
          : [];
      }

      lineItem.calculateLineTotal(this.useUnitPrices);
    });
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

  @Column({ type: "json", nullable: true })
  unitPrices?: UnitPrice[];

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
  calculateLineTotal(useUnitPrices?: boolean) {
    const shouldUseUnitPrices =
      useUnitPrices !== undefined
        ? useUnitPrices
        : this.offer?.useUnitPrices || false;

    if (shouldUseUnitPrices && this.unitPrices && this.unitPrices.length > 0) {
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

  getActivePrice(useUnitPrices?: boolean): QuantityPrice | UnitPrice | null {
    const shouldUseUnitPrices =
      useUnitPrices !== undefined
        ? useUnitPrices
        : this.offer?.useUnitPrices || false;

    if (shouldUseUnitPrices && this.unitPrices && this.unitPrices.length > 0) {
      return this.unitPrices.find((up) => up.isActive) || null;
    } else if (this.quantityPrices && this.quantityPrices.length > 0) {
      return this.quantityPrices.find((qp) => qp.isActive) || null;
    }
    return null;
  }

  getActivePriceType(useUnitPrices?: boolean): "quantity" | "unit" | null {
    const activePrice = this.getActivePrice(useUnitPrices);
    if (activePrice) {
      return "totalPrice" in activePrice ? "unit" : "quantity";
    }
    return null;
  }

  formatUnitPrice(price: number, offer?: Offer): string {
    const decimalPlaces = offer?.unitPriceDecimalPlaces || 3;
    if (isNaN(price) || !isFinite(price)) {
      return `0.${"0".repeat(decimalPlaces)}`;
    }
    return price.toFixed(decimalPlaces);
  }

  formatTotalPrice(price: number, offer?: Offer): string {
    const decimalPlaces = offer?.totalPriceDecimalPlaces || 2;
    if (isNaN(price) || !isFinite(price)) {
      return `0.${"0".repeat(decimalPlaces)}`;
    }
    return price.toFixed(decimalPlaces);
  }

  syncUnitPricesWithOffer(offer: Offer): void {
    if (offer.useUnitPrices && offer.defaultUnitPrices) {
      this.unitPrices = JSON.parse(JSON.stringify(offer.defaultUnitPrices));

      if (this.unitPrices && this.unitPrices.length > 0) {
        const existingPrices = this.unitPrices || [];
        this.unitPrices.forEach((newUp, index) => {
          const existingUp = existingPrices.find(
            (up) => up.quantity === newUp.quantity
          );
          if (existingUp) {
            newUp.unitPrice = existingUp.unitPrice;
            newUp.totalPrice = existingUp.totalPrice;
          }
        });
      }
    }
  }

  constructor(partial?: Partial<OfferLineItem>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

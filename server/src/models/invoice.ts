import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";

@Entity()
export class Customer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  companyName!: string;

  @Column({ nullable: true })
  contactPerson?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  contactEmail?: string;

  @Column({ nullable: true })
  contactPhoneNumber?: string;

  @Column({ nullable: true })
  taxNumber?: string;

  @Column({ nullable: true })
  addressLine1?: string;

  @Column({ nullable: true })
  addressLine2?: string;

  @Column({ nullable: true })
  postalCode?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true, default: "Germany" })
  country?: string;

  @Column({ nullable: true })
  customerNumber?: string;

  @Column({ nullable: true })
  vatId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Invoice, (invoice) => invoice.customer)
  invoices!: Invoice[];
}

@Entity()
export class Invoice {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  invoiceNumber!: string;

  @Column()
  orderNumber!: string;

  @Column({ type: "date" })
  invoiceDate!: Date;

  @Column({ type: "date" })
  deliveryDate!: Date;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  netTotal!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  taxAmount!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  grossTotal!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  paidAmount!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  outstandingAmount!: number;

  @Column({ nullable: true })
  paymentMethod?: string;

  @Column({ nullable: true })
  shippingMethod?: string;

  @Column({ nullable: true })
  paymentDate?: Date;

  @Column({ nullable: true })
  notes?: string;

  @ManyToOne(() => Customer, (customer) => customer.invoices)
  @JoinColumn()
  customer!: Customer;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true })
  items!: InvoiceItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity()
export class InvoiceItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  quantity!: number;
  @Column({ nullable: true })
  articleNumber?: string;

  @Column()
  description!: string;
  @Column({ type: "decimal", precision: 10, scale: 2 })
  unitPrice!: number;
  @Column({ type: "decimal", precision: 10, scale: 2 })
  netPrice!: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  taxRate!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  taxAmount!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  grossPrice!: number;

  @ManyToOne(() => Invoice, (invoice) => invoice.items)
  invoice!: Invoice;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

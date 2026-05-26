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
import { Customer } from "./customers";
import { Item } from "./items";

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

  @Column({ type: "varchar", nullable: true })
  pdfUrl!: string;

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

  @Column({ type: "varchar", nullable: true })
  description?: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0, nullable: true })
  freightCost?: number;

  @Column({ type: "text", nullable: true })
  remark?: string;

  @Column({ type: "varchar", default: "draft" })
  status!: string;

  @Column({ nullable: true })
  closedAt?: Date;

  @ManyToOne(() => Customer, (customer) => customer.invoices, {
    nullable: true,
  })
  @JoinColumn()
  customer?: Customer | null;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true })
  items!: InvoiceItem[];

  @Column({ type: "json", nullable: true })
  packingListData?: any;

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

  @Column({ type: "int", nullable: true })
  item_id?: number | null;

  @ManyToOne(() => Item, { nullable: true, eager: false })
  @JoinColumn({ name: "item_id" })
  item?: Item | null;

  @ManyToOne(() => Invoice, (invoice) => invoice.items)
  invoice!: Invoice;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

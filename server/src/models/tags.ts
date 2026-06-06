import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  Unique,
} from "typeorm";
import { Customer } from "./customers";
import { ContactPerson } from "./contact_person";
import { Inquiry } from "./inquiry";
import { RequestedItem } from "./requested_items";
import { Item } from "./items";
import { Supplier } from "./suppliers";

export enum TagCategory {
  COMPANY = "company",
  CONTACT = "contact",
  INQUIRY = "inquiry",
  REQUEST_ITEM = "request_item",
  ITEM = "item",
  SUPPLIER = "supplier",
}

export enum TagColor {
  GRAY = "gray",
  BLUE = "blue",
  GREEN = "green",
  YELLOW = "yellow",
  ORANGE = "orange",
  RED = "red",
  PURPLE = "purple",
}

@Entity()
@Unique(["name", "category"])
export class Tag {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({
    type: "enum",
    enum: TagCategory,
  })
  category!: TagCategory;

  @Column({
    type: "enum",
    enum: TagColor,
    default: TagColor.GRAY,
  })
  color!: TagColor;

  @ManyToMany(() => Customer, (customer) => customer.tags)
  customers!: Customer[];

  @ManyToMany(() => ContactPerson, (contact) => contact.tags)
  contacts!: ContactPerson[];

  @ManyToMany(() => Inquiry, (inquiry) => inquiry.tags)
  inquiries!: Inquiry[];

  @ManyToMany(() => RequestedItem, (reqItem) => reqItem.tags)
  requestedItems!: RequestedItem[];

  @ManyToMany(() => Item, (item) => item.tags)
  items!: Item[];

  @ManyToMany(() => Supplier, (supplier) => supplier.tags)
  suppliers!: Supplier[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

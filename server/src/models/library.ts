// models/library.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./users";
import { Customer } from "./customers";
import { Item } from "./items";

export enum FileType {
  IMAGE = "IMAGE",
  DOCUMENT = "DOCUMENT",
  PDF = "PDF",
  SPREADSHEET = "SPREADSHEET",
  PRESENTATION = "PRESENTATION",
  ARCHIVE = "ARCHIVE",
  OTHER = "OTHER",
}

@Entity()
export class LibraryFile {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  filename!: string;

  @Column()
  originalName!: string;

  @Column()
  fileSize!: number;

  @Column()
  mimeType!: string;

  @Column({
    type: "enum",
    enum: FileType,
    default: FileType.OTHER,
  })
  fileType!: FileType;

  @Column()
  url!: string;

  @Column({ nullable: true })
  thumbnailUrl?: string;

  @Column({ nullable: true })
  description?: string;

  @Column("simple-array", { nullable: true })
  tags: string[] = [];

  @Column({ default: false })
  isPublic!: boolean;

  @ManyToOne(() => User, (user) => user.id, { nullable: true })
  uploadedBy?: User;

  @Column({ nullable: true })
  uploadedById?: string;
  @ManyToOne(() => Customer, (customer) => customer.id, { nullable: true })
  customer?: Customer;

  @Column({ nullable: true })
  customerId?: string;

  @Column({ nullable: true })
  itemId?: number;

  @ManyToOne(() => Item, (item) => item.attachments)
  @JoinColumn({ name: "itemId" })
  item?: Item;

  @CreateDateColumn()
  uploadedAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  constructor(partial?: Partial<LibraryFile>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

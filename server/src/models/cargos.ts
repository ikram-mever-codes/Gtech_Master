import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { Customer } from "./customers";

@Entity()
export class Cargo {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ nullable: true })
    customer_id?: string;

    @ManyToOne(() => Customer, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "customer_id" })
    customer?: Customer;

    @Column({ type: "int", nullable: true })
    cargo_type_id?: number;

    @Column({ type: "varchar", length: 150, nullable: true })
    cargo_no?: string;

    @Column({ type: "date", nullable: true })
    pickup_date?: Date;

    @Column({ type: "date", nullable: true })
    dep_date?: Date;

    @Column({ type: "date", nullable: true })
    eta?: Date;

    @Column({ type: "varchar", length: 255, nullable: true })
    note?: string;

    @Column({ type: "text", nullable: true })
    online_track?: string;

    @Column({ type: "text", nullable: true })
    remark?: string;

    @Column({ type: "varchar", length: 50, default: "Open" })
    cargo_status!: string;

    @Column({ type: "date", nullable: true })
    shipped_at?: Date;

    @Column({ type: "varchar", length: 50, default: "Other Customer" })
    customer_type!: string;

    @Column({ type: "varchar", nullable: true })
    bill_to_company_name?: string;

    @Column({ type: "varchar", nullable: true })
    bill_to_display_name?: string;

    @Column({ type: "varchar", nullable: true })
    bill_to_phone_no?: string;

    @Column({ type: "varchar", nullable: true })
    bill_to_tax_no?: string;

    @Column({ type: "varchar", nullable: true })
    bill_to_email?: string;

    @Column({ type: "varchar", nullable: true })
    bill_to_website?: string;

    @Column({ type: "varchar", nullable: true })
    bill_to_contact_person?: string;

    @Column({ type: "varchar", nullable: true })
    bill_to_contact_phone?: string;

    @Column({ type: "varchar", nullable: true })
    bill_to_contact_mobile?: string;

    @Column({ type: "varchar", nullable: true })
    bill_to_contact_email?: string;

    @Column({ type: "varchar", nullable: true })
    bill_to_country?: string;

    @Column({ type: "varchar", nullable: true })
    bill_to_city?: string;

    @Column({ type: "varchar", nullable: true })
    bill_to_postal_code?: string;

    @Column({ type: "text", nullable: true })
    bill_to_full_address?: string;

    @Column({ type: "varchar", nullable: true })
    ship_to_company_name?: string;

    @Column({ type: "varchar", nullable: true })
    ship_to_display_name?: string;

    @Column({ type: "varchar", nullable: true })
    ship_to_contact_person?: string;

    @Column({ type: "varchar", nullable: true })
    ship_to_contact_phone?: string;

    @Column({ type: "varchar", nullable: true })
    ship_to_country?: string;

    @Column({ type: "varchar", nullable: true })
    ship_to_city?: string;

    @Column({ type: "varchar", nullable: true })
    ship_to_postal_code?: string;

    @Column({ type: "text", nullable: true })
    ship_to_full_address?: string;

    @Column({ type: "text", nullable: true })
    ship_to_remarks?: string;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}

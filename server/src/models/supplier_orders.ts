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
import { Supplier } from "./suppliers";
import { Category } from "./categories";
import { OrderItem } from "./order_items";

@Entity("supplier_orders")
export class SupplierOrder {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "int", nullable: true })
    supplier_id?: number | null;

    @Column({ type: "int", nullable: true })
    order_type_id?: number | null;

    @Column({ type: "char", length: 1, default: "N", nullable: true })
    send2cargo?: string;

    @Column({ type: "varchar", length: 20, nullable: true })
    ref_no?: string;

    @Column({ type: "char", length: 1, default: "N" })
    paid!: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    remark?: string;

    @Column({ type: "int", default: 0 })
    is_po_created!: number;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;

    @ManyToOne(() => Supplier)
    @JoinColumn({ name: "supplier_id" })
    supplier?: Supplier;

    @ManyToOne(() => Category)
    @JoinColumn({ name: "order_type_id" })
    order_type?: Category;

    @OneToMany(() => OrderItem, (item) => item.supplier_order)
    items?: OrderItem[];
}

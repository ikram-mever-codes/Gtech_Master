import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { OrderItem } from "./order_items";
import { Category } from "./categories";
import { Supplier } from "./suppliers";
import { Cargo } from "./cargos";
import { Customer } from "./customers";

@Entity({ name: "customer_orders" })
export class CustomerOrder {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", length: 255, unique: true })
    order_no!: string;

    @Column({ type: "uuid", nullable: true })
    customer_id?: string;

    @ManyToOne(() => Customer, { nullable: true })
    @JoinColumn({ name: "customer_id" })
    customer?: Customer;

    @Column({ type: "varchar", length: 255, nullable: true })
    offer_id?: string;

    @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
    discount?: number;

    @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
    discount_percent?: number;

    @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
    subtotal?: number;

    @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
    total_amount?: number;

    @Column({ type: "boolean", default: false })
    is_fulfilled?: boolean;

    @Column({ type: "int", nullable: true })
    status?: number;

    @Column({ type: "text", nullable: true })
    comment?: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    date_created?: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    date_emailed?: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    date_delivery?: string;

    @Column({ type: "int", nullable: true })
    category_id?: number;

    @ManyToOne(() => Category)
    @JoinColumn({ name: "category_id", referencedColumnName: "id" })
    category!: Category;

    @Column({ type: "int", nullable: true })
    supplier_id?: number;

    @ManyToOne(() => Supplier)
    @JoinColumn({ name: "supplier_id" })
    supplier?: Supplier;

    @Column({ type: "int", nullable: true })
    cargo_id?: number;

    @ManyToOne(() => Cargo)
    @JoinColumn({ name: "cargo_id" })
    cargo?: Cargo;

    @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
    orderItems!: OrderItem[];

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
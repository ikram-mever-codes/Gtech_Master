import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { Cargo } from "./cargos";
import { Order } from "./orders";

@Entity()
export class CargoOrder {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "int" })
    cargo_id!: number;

    @Column({ type: "int" })
    order_id!: number;

    @ManyToOne(() => Cargo, { onDelete: "CASCADE" })
    @JoinColumn({ name: "cargo_id", referencedColumnName: "id" })
    cargo!: Cargo;

    @ManyToOne(() => Order, { onDelete: "CASCADE" })
    @JoinColumn({ name: "order_id", referencedColumnName: "id" })
    order!: Order;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}

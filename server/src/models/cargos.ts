import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from "typeorm";

@Entity()
export class Cargo {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", length: 50, nullable: true })
    customer_id?: string;

    @Column({ type: "int", nullable: true })
    cargo_type_id?: number;

    @Column({ type: "varchar", length: 50, nullable: true })
    cargo_no?: string;

    @Column({ type: "date", nullable: true })
    pickup_date?: Date;

    @Column({ type: "date", nullable: true })
    dep_date?: Date;

    @Column({ type: "date", nullable: true })
    eta?: Date;

    @Column({ type: "varchar", length: 50, nullable: true })
    note?: string;

    @Column({ type: "text", nullable: true })
    online_track?: string;

    @Column({ type: "text", nullable: true })
    remark?: string;

    @Column({ type: "varchar", length: 10, default: "Open" })
    cargo_status!: string;

    @Column({ type: "date", nullable: true })
    shipped_at?: Date;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}

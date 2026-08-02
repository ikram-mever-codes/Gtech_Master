import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("weiterversand_service_providers")
export class WeiterversandServiceProvider {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int", default: 0 })
  pos!: number;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "varchar", nullable: true })
  website?: string;

  @Column({ type: "text", nullable: true })
  remark?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

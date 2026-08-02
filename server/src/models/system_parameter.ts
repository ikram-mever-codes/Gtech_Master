import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("system_parameters")
export class SystemParameter {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  key!: string;

  @Column({ type: "jsonb", nullable: true })
  value?: any;

  @Column({ nullable: true })
  file_url?: string;

  @Column({ nullable: true })
  file_name?: string;

  @Column({ nullable: true })
  file_type?: string;

  @Column({ type: "timestamp", nullable: true })
  uploaded_at?: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

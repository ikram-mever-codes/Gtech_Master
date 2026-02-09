import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  UpdateDateColumn,
} from "typeorm";
import { Permission } from "./permissions";

export enum UserRole {
  ADMIN = "ADMIN",
  SALES = "SALES",
  PURCHASING = "PURCHASING",
  MANAGER = "MANAGER",
  STAFF = "STAFF",
  SUPPORT = "SUPPORT",
}

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ nullable: true })
  country!: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.STAFF,
  })
  role!: UserRole;

  @Column({ type: "simple-array", nullable: true })
  assignedResources: string[] = [];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ nullable: true })
  gender?: "MALE" | "FEMALE";

  @Column({ nullable: true, type: "date" })
  dateOfBirth?: Date;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ type: "boolean", default: false })
  isEmailVerified!: boolean;

  @Column({ type: "varchar", nullable: false, default: false })
  emailVerificationCode?: string;

  @Column({ type: "timestamp", nullable: true })
  emailVerificationExp: Date | null = null;

  @Column({ type: "boolean", default: false, nullable: false })
  isPhoneVerified!: boolean;

  @Column({ type: "varchar", nullable: true })
  phoneVerificationCode?: string;

  @Column({ type: "timestamp", nullable: true })
  phoneVerificationExp?: Date | null = null;

  @Column({ type: "varchar", nullable: true })
  resetPasswordToken?: string;

  @Column({ type: "timestamp", nullable: true })
  resetPasswordExp?: Date;

  @OneToMany(() => Permission, (permission) => permission.user)
  permissions: Permission[];

  constructor(partial?: Partial<User>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}

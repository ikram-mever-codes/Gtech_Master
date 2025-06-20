import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./users";

@Entity()
export class Permission {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  resource: string;

  @Column({ type: "simple-array" })
  actions: string[];

  @ManyToOne(() => User, (user) => user.permissions, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user: User;

  constructor(partial?: Partial<Permission>) {
    if (partial) {
      Object.assign(this, partial);
      this.actions = partial.actions || [];
    }
  }
}

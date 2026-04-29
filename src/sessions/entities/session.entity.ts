import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

@Entity('sessions')
@Index(['refresh_token'])
@Index(['user_id'])
@Index(['expires_at'])
@Index(['user_id', 'is_revoked'])
export class Session {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', name: 'user_id' })
  user_id!: string;

  @Column({ type: 'varchar', length: 512 })
  refresh_token!: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address!: string;

  @Column({ type: 'text', nullable: true })
  user_agent!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @Column({ type: 'timestamptz' })
  expires_at!: Date;

  @Column({ type: 'boolean', default: false })
  is_revoked!: boolean;

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}

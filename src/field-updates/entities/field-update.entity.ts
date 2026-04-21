import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Field, FieldStage } from '../../fields/entities/field.entity';
import { User } from '../../users/entities/user.entity';

@Entity('field_updates')
@Index(['fieldId'])
@Index(['agentId'])
@Index(['createdAt'])
@Index(['newStage'])
@Index(['fieldId', 'createdAt']) 
@Index(['agentId', 'createdAt']) 
@Index(['fieldId', 'newStage'])
export class FieldUpdate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  fieldId!: string;

  @Column({ type: 'uuid' })
  @Index()
  agentId!: string;

  @Column({
    type: 'enum',
    enum: FieldStage,
  })
  newStage!: FieldStage;

  @Column({
    type: 'enum',
    enum: FieldStage,
    nullable: true,
  })
  previousStage!: FieldStage;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: {
    weatherCondition?: string;
    temperature?: number;
    humidity?: number;
    images?: string[];
    healthScore?: number; 
    pestDetected?: boolean;
  };

  @Column({ type: 'varchar', length: 50, nullable: true })
  updateType!: 'stage_change' | 'note' | 'observation' | 'issue';

  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  createdAt!: Date;

  
  @ManyToOne(() => Field, (field) => field.updates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fieldId' })
  field!: Field;

  @ManyToOne(() => User, (user) => user.updates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent!: User;
}
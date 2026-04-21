import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Field } from '../../fields/entities/field.entity';
import { User } from '../../users/entities/user.entity';

enum FieldStage {
  PLANTED = 'planted',
  GROWING = 'growing',
  READY = 'ready',
  HARVESTED = 'harvested',
}

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
  fieldId!: string;

  @Column({ type: 'uuid' })
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
  createdAt!: Date;


  @ManyToOne(() => Field, (field) => field.updates, { onDelete: 'CASCADE', lazy: true })
  @JoinColumn({ name: 'fieldId' })
  field!: Promise<Field> | Field;

  @ManyToOne(() => User, (user) => user.updates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent!: User;
}
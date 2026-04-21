import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { FieldUpdate } from '../../field-updates/entities/field-update.entity';

export enum CropType {
  CORN = 'corn',
  WHEAT = 'wheat',
  SOYBEANS = 'soybeans',
  RICE = 'rice',
  COTTON = 'cotton',
  BARLEY = 'barley',
  OATS = 'oats',
  SUNFLOWER = 'sunflower',
  POTATOES = 'potatoes',
  TOMATOES = 'tomatoes',
}

export enum FieldStage {
  PLANTED = 'planted',
  GROWING = 'growing',
  READY = 'ready',
  HARVESTED = 'harvested',
}

export enum FieldStatus {
  ACTIVE = 'active',
  AT_RISK = 'at_risk',
  COMPLETED = 'completed',
}

export enum SoilType {
  CLAY = 'clay',
  SANDY = 'sandy',
  SILTY = 'silty',
  PEATY = 'peaty',
  CHALKY = 'chalcky',
  LOAMY = 'loamy',
}

@Entity('fields')
@Index(['name'])
@Index(['cropType'])
@Index(['currentStage'])
@Index(['computedStatus'])
@Index(['assignedAgentId'])
@Index(['plantingDate'])
@Index(['createdAt'])
@Index(['assignedAgentId', 'computedStatus'])
@Index(['currentStage', 'computedStatus']) 
@Index(['plantingDate', 'computedStatus']) 
export class Field {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({
    type: 'enum',
    enum: CropType,
  })
  @Index()
  cropType!: CropType;

  @Column({ type: 'date' })
  @Index()
  plantingDate!: Date;

  @Column({
    type: 'enum',
    enum: FieldStage,
    default: FieldStage.PLANTED,
  })
  @Index()
  currentStage!: FieldStage;

  @Column({
    type: 'enum',
    enum: FieldStatus,
    nullable: true,
  })
  @Index()
  computedStatus!: FieldStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  areaInHectares!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location!: string;

  @Column({ type: 'jsonb', nullable: true })
  coordinates!: {
    latitude: number;
    longitude: number;
  };

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({
    type: 'enum',
    enum: SoilType,
    nullable: true,
  })
  soilType!: SoilType;

  @Column({ type: 'int', nullable: true })
  estimatedYield!: number; 

  @Column({ type: 'uuid' })
  @Index()
  assignedAgentId!: string;

  @Column({ type: 'timestamp', nullable: true })
  lastUpdateAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  estimatedHarvestDate!: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: {
    irrigationType?: string;
    previousCrop?: string;
    pesticideApplied?: boolean;
    fertilizerUsed?: string;
  };

  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  
  @ManyToOne(() => User, (user) => user.assignedFields, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'assignedAgentId' })
  assignedAgent!: User;

  @OneToMany(() => FieldUpdate, (update: any) => update.field, { cascade: true })
  updates!: FieldUpdate[];
}
import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsObject,
  IsArray,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { FieldStage } from '../../fields/entities/field.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMetadataDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  weatherCondition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(50)
  temperature?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  healthScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  pestDetected?: boolean;
}

export class CreateFieldUpdateDto {
  @ApiProperty()
  @IsUUID()
  fieldId!: string;

  @ApiProperty({ enum: FieldStage })
  @IsEnum(FieldStage)
  newStage!: FieldStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: UpdateMetadataDto })
  @IsOptional()
  @IsObject()
  metadata?: UpdateMetadataDto;
}

export class AddNoteDto {
  @ApiProperty()
  @IsUUID()
  fieldId!: string;

  @ApiProperty()
  @IsString()
  notes!: string;

  @ApiPropertyOptional({ type: UpdateMetadataDto })
  @IsOptional()
  @IsObject()
  metadata?: UpdateMetadataDto;
}

export class FilterUpdatesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fieldId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  agentId?: string;

  @ApiPropertyOptional({ enum: FieldStage })
  @IsOptional()
  @IsEnum(FieldStage)
  stage?: FieldStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number = 20;
}

export class BulkUpdateDto {
  @ApiProperty()
  @IsArray()
  @IsUUID('4', { each: true })
  fieldIds!: string[];

  @ApiProperty({ enum: FieldStage })
  @IsEnum(FieldStage)
  newStage!: FieldStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

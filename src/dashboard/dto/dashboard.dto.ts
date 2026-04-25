import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsNumber,
    IsDate,
    IsArray,
    ValidateNested,
    IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class HeaderStatsDto {
  @ApiProperty()
  @IsNumber()
  totalFields!: number;

  @ApiProperty()
  @IsNumber()
  activeFields!: number;

  @ApiProperty()
  @IsNumber()
  atRiskFields!: number;

  @ApiProperty()
  @IsNumber()
  completedFields!: number;
}

export class CropDistributionDto {
    @ApiProperty() @IsNumber() corn!: number;
    @ApiProperty() @IsNumber() wheat!: number;
    @ApiProperty() @IsNumber() soybeans!: number;
    @ApiProperty() @IsNumber() rice!: number;
    @ApiProperty() @IsNumber() cotton!: number;
    @ApiProperty() @IsNumber() barley!: number;
}

export class StageDistributionDto {
    @ApiProperty() @IsNumber() planted!: number;
    @ApiProperty() @IsNumber() growing!: number;
    @ApiProperty() @IsNumber() ready!: number;
    @ApiProperty() @IsNumber() harvested!: number;
}

export class AgentPerformanceDto {
    @ApiProperty() @IsString() agentId!: string;
    @ApiProperty() @IsString() agentName!: string;

    @ApiProperty() @IsNumber() fieldsAssigned!: number;
    @ApiProperty() @IsNumber() updatesThisWeek!: number;
    @ApiProperty() @IsNumber() completionRate!: number;
    @ApiProperty() @IsNumber() performanceScore!: number;
}

export class RecentActivityDto {
    @ApiProperty() @IsString() id!: string;
    @ApiProperty() @IsString() fieldName!: string;
    @ApiProperty() @IsString() agentName!: string;
    @ApiProperty() @IsString() action!: string;

    @ApiProperty() @IsDate()
    @Type(() => Date)
    timestamp!: Date;
}

export class AtRiskFieldDto {
    @ApiProperty() @IsString() id!: string;
    @ApiProperty() @IsString() name!: string;
    @ApiProperty() @IsString() cropType!: string;
    @ApiProperty() @IsString() agentName!: string;
    @ApiProperty() @IsString() riskReason!: string;

    @ApiProperty() @IsNumber()
    daysAtRisk!: number;
}

export class WeeklyTrendDto {
    @ApiProperty({ type: [String] })
    @IsArray()
    @IsString({ each: true })
    labels!: string[];

    @ApiProperty({ type: [Number] })
    @IsArray()
    @IsNumber({}, { each: true })
    updatesCount!: number[];

    @ApiProperty({ type: [Number] })
    @IsArray()
    @IsNumber({}, { each: true })
    newFieldsCount!: number[];
}

export class AdminDashboardResponseDto {
    @ApiProperty() @IsNumber() totalFields!: number;
    @ApiProperty() @IsNumber() activeFields!: number;
    @ApiProperty()
    @IsNumber()
    atRiskFieldsCount!: number;
    @ApiProperty() @IsNumber() completedFields!: number;

    @ApiProperty({ type: CropDistributionDto })
    @ValidateNested()
    @Type(() => CropDistributionDto)
    cropDistribution!: CropDistributionDto;

    @ApiProperty({ type: StageDistributionDto })
    @ValidateNested()
    @Type(() => StageDistributionDto)
    stageDistribution!: StageDistributionDto;

    @ApiProperty({ type: [AgentPerformanceDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AgentPerformanceDto)
    agentPerformance!: AgentPerformanceDto[];

    @ApiProperty({ type: [RecentActivityDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RecentActivityDto)
    recentActivity!: RecentActivityDto[];

    @ApiProperty({ type: [AtRiskFieldDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AtRiskFieldDto)
    atRiskFields!: AtRiskFieldDto[];

    @ApiProperty({ type: WeeklyTrendDto })
    @ValidateNested()
    @Type(() => WeeklyTrendDto)
    weeklyTrend!: WeeklyTrendDto;
}

export class AgentHeaderStatsDto {
  @ApiProperty()
  @IsNumber()
  totalFieldsAssigned!: number;

  @ApiProperty()
  @IsNumber()
  activeFields!: number;

  @ApiProperty()
  @IsNumber()
  atRiskFields!: number;

  @ApiProperty()
  @IsNumber()
  completedFields!: number;
}

export class RecentUpdateDto {
  @ApiProperty() @IsString() id!: string;
  @ApiProperty() @IsString() fieldName!: string;
  @ApiProperty() @IsString() fieldId!: string;
  @ApiProperty() @IsString() previousStage!: string;
  @ApiProperty() @IsString() newStage!: string;
  @ApiProperty() @IsString() notes!: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  timestamp!: Date;
}

export class AgentAtRiskFieldDto {
  @ApiProperty() @IsString() id!: string;
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsString() cropType!: string;
  @ApiProperty() @IsString() currentStage!: string;
  @ApiProperty() @IsString() riskReason!: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  lastUpdateAt!: Date;

  @ApiProperty()
  @IsNumber()
  daysSinceLastUpdate!: number;
}

export class AgentPerformanceMetricsDto {
  @ApiProperty() @IsNumber() totalUpdates!: number;
  @ApiProperty() @IsNumber() updatesThisWeek!: number;
  @ApiProperty() @IsNumber() updatesThisMonth!: number;
  @ApiProperty() @IsNumber() averageResponseTime!: number;
  @ApiProperty() @IsNumber() completionRate!: number;
  @ApiProperty() @IsNumber() performanceScore!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  rankAmongAgents?: number;
}

export class PendingTaskDto {
  @ApiProperty() @IsString() fieldId!: string;
  @ApiProperty() @IsString() fieldName!: string;
  @ApiProperty() @IsString() currentStage!: string;
  @ApiProperty() @IsNumber() daysSinceLastUpdate!: number;
  @ApiProperty() @IsString() suggestedAction!: string;
}

export class WeeklyActivityDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  labels!: string[];

  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  myUpdates!: number[];
}

export class AgentDashboardResponseDto {
  @ApiProperty() @IsNumber() totalFieldsAssigned!: number;
  @ApiProperty() @IsNumber() activeFields!: number;
  @ApiProperty() @IsNumber() atRiskFields!: number;
  @ApiProperty() @IsNumber() completedFields!: number;

  @ApiProperty({ type: AgentHeaderStatsDto })
  @ValidateNested()
  @Type(() => AgentHeaderStatsDto)
  myHeaderStats!: AgentHeaderStatsDto;

  @ApiProperty({ type: [RecentUpdateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecentUpdateDto)
  myRecentUpdates!: RecentUpdateDto[];

  @ApiProperty({ type: [AgentAtRiskFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentAtRiskFieldDto)
  myAtRiskFields!: AgentAtRiskFieldDto[];

  @ApiProperty({ type: AgentPerformanceMetricsDto })
  @ValidateNested()
  @Type(() => AgentPerformanceMetricsDto)
  myPerformance!: AgentPerformanceMetricsDto;

  @ApiProperty({ type: [PendingTaskDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PendingTaskDto)
  pendingTasks!: PendingTaskDto[];

  @ApiProperty({ type: WeeklyActivityDto })
  @ValidateNested()
  @Type(() => WeeklyActivityDto)
  weeklyActivity!: WeeklyActivityDto;
}
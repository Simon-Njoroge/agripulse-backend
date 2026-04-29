import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CacheService } from '../cache/cache.service';
import {
  Field,
  FieldStage,
  FieldStatus,
  CropType,
} from '../fields/entities/field.entity';
import { UserRole } from '../users/entities/user.entity';
import {
  AdminDashboardResponseDto,
  AgentPerformanceDto,
  RecentActivityDto,
  AtRiskFieldDto,
  WeeklyTrendDto,
} from './dto/dashboard.dto';

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);
  private readonly CACHE_TTL = 300;
  private readonly CACHE_PREFIX = 'admin_dashboard';

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
  ) {}

  async getAdminDashboard(): Promise<AdminDashboardResponseDto> {
    const cacheKey = `${this.CACHE_PREFIX}_data`;

    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      this.logger.debug('Admin dashboard cache hit');
      return cachedData;
    }

    this.logger.debug('Admin dashboard cache miss, fetching from database');

    const [
      headerStats,
      cropDistribution,
      stageDistribution,
      agentPerformance,
      recentActivity,
      atRiskFields,
      weeklyTrend,
    ] = await Promise.all([
      this.getHeaderStats(),
      this.getCropDistribution(),
      this.getStageDistribution(),
      this.getAgentPerformance(),
      this.getRecentActivity(),
      this.getAtRiskFields(),
      this.getWeeklyTrend(),
    ]);

    const dashboardData: AdminDashboardResponseDto = {
      ...headerStats,
      atRiskFieldsCount: headerStats.atRiskFields,
      cropDistribution,
      stageDistribution,
      agentPerformance,
      recentActivity,
      atRiskFields,
      weeklyTrend,
    };

    await this.cacheService.set(cacheKey, dashboardData, this.CACHE_TTL);
    this.logger.debug('Admin dashboard cached successfully');

    return dashboardData;
  }

  private async getHeaderStats() {
    const result = await this.dataSource
      .createQueryBuilder()
      .select([
        'COUNT(*) as "totalFields"',
        'SUM(CASE WHEN "computedStatus" = :active THEN 1 ELSE 0 END) as "activeFields"',
        'SUM(CASE WHEN "computedStatus" = :atRisk THEN 1 ELSE 0 END) as "atRiskFields"',
        'SUM(CASE WHEN "computedStatus" = :completed THEN 1 ELSE 0 END) as "completedFields"',
      ])
      .from(Field, 'field')
      .setParameters({
        active: FieldStatus.ACTIVE,
        atRisk: FieldStatus.AT_RISK,
        completed: FieldStatus.COMPLETED,
      })
      .getRawOne();

    return {
      totalFields: parseInt(result.totalFields) || 0,
      activeFields: parseInt(result.activeFields) || 0,
      atRiskFields: parseInt(result.atRiskFields) || 0,
      completedFields: parseInt(result.completedFields) || 0,
    };
  }

  private async getCropDistribution() {
    const results = await this.dataSource
      .createQueryBuilder()
      .select('field."cropType"', 'cropType')
      .addSelect('COUNT(*)', 'count')
      .from(Field, 'field')
      .groupBy('field."cropType"')
      .getRawMany();

    const distribution = {
      [CropType.CORN]: 0,
      [CropType.WHEAT]: 0,
      [CropType.SOYBEANS]: 0,
      [CropType.RICE]: 0,
      [CropType.COTTON]: 0,
      [CropType.BARLEY]: 0,
    };

    results.forEach((result) => {
      distribution[result.cropType as CropType] = parseInt(result.count);
    });

    return distribution;
  }

  private async getStageDistribution() {
    const results = await this.dataSource
      .createQueryBuilder()
      .select('field."currentStage"', 'stage')
      .addSelect('COUNT(*)', 'count')
      .from(Field, 'field')
      .groupBy('field."currentStage"')
      .getRawMany();

    const distribution = {
      [FieldStage.PLANTED]: 0,
      [FieldStage.GROWING]: 0,
      [FieldStage.READY]: 0,
      [FieldStage.HARVESTED]: 0,
    };

    results.forEach((result) => {
      distribution[result.stage as FieldStage] = parseInt(result.count);
    });

    return distribution;
  }

  private async getAgentPerformance(): Promise<AgentPerformanceDto[]> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    try {
      const query = `
      SELECT 
        u.id as "agentId",
        u.name as "agentName",
        COALESCE(COUNT(DISTINCT f.id), 0) as "fieldsAssigned",
        COALESCE(COUNT(DISTINCT CASE WHEN f."computedStatus" = $1 THEN f.id END), 0) as "completedFields",
        COALESCE(COUNT(DISTINCT upd.id), 0) as "totalUpdates",
        COALESCE(COUNT(DISTINCT CASE WHEN upd."createdAt" > $2 THEN upd.id END), 0) as "updatesThisWeek"
      FROM users u
      LEFT JOIN fields f ON f."assignedAgentId" = u.id
      LEFT JOIN field_updates upd ON upd."fieldId" = f.id
      WHERE u.role = $3 AND u."isActive" = $4
      GROUP BY u.id, u.name
      ORDER BY u.name
    `;

      const agents = await this.dataSource.query(query, [
        FieldStatus.COMPLETED,
        oneWeekAgo,
        UserRole.AGENT,
        true,
      ]);

      if (!agents || agents.length === 0) {
        this.logger.debug('No agents found in database');
        return [];
      }

      return agents.map((agent) => {
        const fieldsAssigned = parseInt(agent.fieldsAssigned) || 0;
        const completedFields = parseInt(agent.completedFields) || 0;
        const totalUpdates = parseInt(agent.totalUpdates) || 0;
        const updatesThisWeek = parseInt(agent.updatesThisWeek) || 0;

        const completionRate =
          fieldsAssigned > 0 ? (completedFields / fieldsAssigned) * 100 : 0;

        const performanceScore = this.calculatePerformanceScore(
          completionRate,
          updatesThisWeek,
          totalUpdates,
        );

        return {
          agentId: agent.agentId,
          agentName: agent.agentName,
          fieldsAssigned,
          updatesThisWeek,
          completionRate: Math.round(completionRate),
          performanceScore,
        };
      });
    } catch (error: any) {
      this.logger.error(`Failed to get agent performance: ${error.message}`);
      this.logger.error(
        `Error details: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`,
      );

      return [];
    }
  }

  private async getRecentActivity(): Promise<RecentActivityDto[]> {
    const activities = await this.dataSource
      .createQueryBuilder()
      .select([
        'update.id as id',
        'field.name as "fieldName"',
        'agent.name as "agentName"',
        'update."newStage" as "newStage"',
        'update."previousStage" as "previousStage"',
        'update.notes as notes',
        'update."createdAt" as timestamp',
      ])
      .from('field_updates', 'update')
      .leftJoin('fields', 'field', 'field.id = update."fieldId"')
      .leftJoin('users', 'agent', 'agent.id = update."agentId"')
      .orderBy('update."createdAt"', 'DESC')
      .limit(10)
      .getRawMany();

    return activities.map((activity) => ({
      id: activity.id,
      fieldName: activity.fieldName,
      agentName: activity.agentName,
      action: this.formatActivityAction(
        activity.previousStage,
        activity.newStage,
        activity.notes,
      ),
      timestamp: activity.timestamp,
    }));
  }

  private async getAtRiskFields(): Promise<AtRiskFieldDto[]> {
    const atRiskFields = await this.dataSource
      .createQueryBuilder()
      .select([
        'field.id as id',
        'field.name as name',
        'field."cropType" as "cropType"',
        'field."currentStage" as "currentStage"',
        'field."lastUpdateAt" as "lastUpdateAt"',
        'field."plantingDate" as "plantingDate"',
        'agent.name as "agentName"',
      ])
      .addSelect([
        'EXTRACT(DAY FROM (NOW() - field."lastUpdateAt")) as "daysSinceLastUpdate"',
        'EXTRACT(DAY FROM (NOW() - field."plantingDate")) as "daysSincePlanting"',
      ])
      .from('fields', 'field')
      .leftJoin('users', 'agent', 'agent.id = field."assignedAgentId"')
      .where('field."computedStatus" = :status', {
        status: FieldStatus.AT_RISK,
      })
      .getRawMany();

    return atRiskFields.map((field) => ({
      id: field.id,
      name: field.name,
      cropType: field.cropType,
      agentName: field.agentName || 'Unassigned',
      riskReason: this.determineRiskReason(
        field.currentStage,
        parseInt(field.daysSinceLastUpdate) || 0,
        parseInt(field.daysSincePlanting) || 0,
      ),
      daysAtRisk: parseInt(field.daysSinceLastUpdate) || 0,
    }));
  }

  private async getWeeklyTrend(): Promise<WeeklyTrendDto> {
    const labels: string[] = [];
    const dates: Date[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      dates.push(date);
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    }

    const updatesData = await this.dataSource
      .createQueryBuilder()
      .select('DATE(update."createdAt") as date')
      .addSelect('COUNT(*) as count')
      .from('field_updates', 'update')
      .where('update."createdAt" >= :startDate', { startDate: dates[0] })
      .groupBy('DATE(update."createdAt")')
      .getRawMany();

    const fieldsData = await this.dataSource
      .createQueryBuilder()
      .select('DATE(field."createdAt") as date')
      .addSelect('COUNT(*) as count')
      .from('fields', 'field')
      .where('field."createdAt" >= :startDate', { startDate: dates[0] })
      .groupBy('DATE(field."createdAt")')
      .getRawMany();

    const updatesMap = new Map();
    updatesData.forEach((item) => {
      const dateKey = new Date(item.date).toISOString().split('T')[0];
      updatesMap.set(dateKey, parseInt(item.count));
    });

    const fieldsMap = new Map();
    fieldsData.forEach((item) => {
      const dateKey = new Date(item.date).toISOString().split('T')[0];
      fieldsMap.set(dateKey, parseInt(item.count));
    });

    const updatesCount: number[] = [];
    const newFieldsCount: number[] = [];

    for (const date of dates) {
      const dateKey = date.toISOString().split('T')[0];
      updatesCount.push(updatesMap.get(dateKey) || 0);
      newFieldsCount.push(fieldsMap.get(dateKey) || 0);
    }

    return { labels, updatesCount, newFieldsCount };
  }

  private calculatePerformanceScore(
    completionRate: number,
    updatesThisWeek: number,
    totalUpdates: number,
  ): number {
    const completionScore = completionRate * 0.5;
    const recentActivityScore = Math.min(updatesThisWeek * 5, 30);
    const totalActivityScore = Math.min(totalUpdates * 2, 20);
    return Math.round(
      completionScore + recentActivityScore + totalActivityScore,
    );
  }

  private formatActivityAction(
    previousStage: string | null,
    newStage: string,
    notes: string | null,
  ): string {
    if (previousStage && previousStage !== newStage) {
      return `Updated stage from ${previousStage} to ${newStage}`;
    }
    if (notes) {
      return `Added note: ${notes.substring(0, 50)}${notes.length > 50 ? '...' : ''}`;
    }
    return `Updated field to ${newStage}`;
  }

  private determineRiskReason(
    currentStage: string,
    daysSinceLastUpdate: number,
    daysSincePlanting: number,
  ): string {
    if (daysSinceLastUpdate > 7) {
      return `No updates for ${daysSinceLastUpdate} days`;
    }
    if (currentStage === FieldStage.GROWING && daysSincePlanting > 60) {
      return `Stuck in growing stage for ${daysSincePlanting} days`;
    }
    if (daysSincePlanting > 90) {
      return `Exceeded expected growing period by ${daysSincePlanting - 90} days`;
    }
    return 'Field requires attention';
  }
}

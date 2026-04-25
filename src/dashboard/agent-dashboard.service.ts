import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CacheService } from '../cache/cache.service';
import { FieldStage, FieldStatus } from '../fields/entities/field.entity';
import { UserRole } from '../users/entities/user.entity';
import {
  AgentDashboardResponseDto,
  RecentUpdateDto,
  AgentAtRiskFieldDto,
  AgentPerformanceMetricsDto,
  PendingTaskDto,
  WeeklyActivityDto,
} from './dto/dashboard.dto';

@Injectable()
export class AgentDashboardService {
  private readonly logger = new Logger(AgentDashboardService.name);
  private readonly CACHE_TTL = 180; 
  private readonly CACHE_PREFIX = 'agent_dashboard';

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
  ) {}

  async getAgentDashboard(agentId: string): Promise<AgentDashboardResponseDto> {
    const cacheKey = `${this.CACHE_PREFIX}_${agentId}`;

   
    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      this.logger.debug(`Agent dashboard cache hit for agent: ${agentId}`);
      return cachedData;
    }

    this.logger.debug(`Agent dashboard cache miss for agent: ${agentId}, fetching from database`);

   
    const agent = await this.dataSource
      .createQueryBuilder()
      .select(['user.id', 'user.name', 'user.email'])
      .from('users', 'user')
      .where('user.id = :agentId', { agentId })
      .andWhere('user.role = :role', { role: UserRole.AGENT })
      .andWhere('user."isActive" = :isActive', { isActive: true })
      .getRawOne();

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    
    const [
      headerStats,
      stageDistribution,
      recentUpdates,
      atRiskFields,
      performanceMetrics,
      pendingTasks,
      weeklyActivity,
    ] = await Promise.all([
      this.getHeaderStats(agentId),
      this.getStageDistribution(agentId),
      this.getRecentUpdates(agentId),
      this.getAtRiskFields(agentId),
      this.getPerformanceMetrics(agentId),
      this.getPendingTasks(agentId),
      this.getWeeklyActivity(agentId),
    ]);

    const dashboardData: AgentDashboardResponseDto = {
      ...headerStats,
      myStageDistribution: stageDistribution,
      myRecentUpdates: recentUpdates,
      myAtRiskFields: atRiskFields,
      myPerformance: performanceMetrics,
      pendingTasks,
      weeklyActivity,
    };

    
    await this.cacheService.set(cacheKey, dashboardData, this.CACHE_TTL);
    this.logger.debug(`Agent dashboard cached successfully for agent: ${agentId}`);

    return dashboardData;
  }

  
  private async getHeaderStats(agentId: string) {
    const result = await this.dataSource
      .createQueryBuilder()
      .select([
        'COUNT(*) as "totalFieldsAssigned"',
        'SUM(CASE WHEN "computedStatus" = :active THEN 1 ELSE 0 END) as "activeFields"',
        'SUM(CASE WHEN "computedStatus" = :atRisk THEN 1 ELSE 0 END) as "atRiskFields"',
        'SUM(CASE WHEN "computedStatus" = :completed THEN 1 ELSE 0 END) as "completedFields"',
      ])
      .from('fields', 'field')
      .where('field."assignedAgentId" = :agentId', { agentId })
      .setParameters({
        active: FieldStatus.ACTIVE,
        atRisk: FieldStatus.AT_RISK,
        completed: FieldStatus.COMPLETED,
      })
      .getRawOne();

    return {
      totalFieldsAssigned: parseInt(result.totalFieldsAssigned) || 0,
      activeFields: parseInt(result.activeFields) || 0,
      atRiskFields: parseInt(result.atRiskFields) || 0,
      completedFields: parseInt(result.completedFields) || 0,
    };
  }

  
  private async getStageDistribution(agentId: string) {
    const results = await this.dataSource
      .createQueryBuilder()
      .select('field."currentStage"', 'stage')
      .addSelect('COUNT(*)', 'count')
      .from('fields', 'field')
      .where('field."assignedAgentId" = :agentId', { agentId })
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

  
  private async getRecentUpdates(agentId: string): Promise<RecentUpdateDto[]> {
    const updates = await this.dataSource
      .createQueryBuilder()
      .select([
        'update.id as id',
        'field.name as "fieldName"',
        'field.id as "fieldId"',
        'update."previousStage" as "previousStage"',
        'update."newStage" as "newStage"',
        'update.notes as notes',
        'update."createdAt" as timestamp',
      ])
      .from('field_updates', 'update')
      .leftJoin('fields', 'field', 'field.id = update."fieldId"')
      .where('update."agentId" = :agentId', { agentId })
      .orderBy('update."createdAt"', 'DESC')
      .limit(10)
      .getRawMany();

    return updates.map((update) => ({
      id: update.id,
      fieldName: update.fieldName,
      fieldId: update.fieldId,
      previousStage: update.previousStage,
      newStage: update.newStage,
      notes: update.notes,
      timestamp: update.timestamp,
    }));
  }

 
  private async getAtRiskFields(agentId: string): Promise<AgentAtRiskFieldDto[]> {
    const atRiskFields = await this.dataSource
      .createQueryBuilder()
      .select([
        'field.id as id',
        'field.name as name',
        'field."cropType" as "cropType"',
        'field."currentStage" as "currentStage"',
        'field."lastUpdateAt" as "lastUpdateAt"',
        'field."plantingDate" as "plantingDate"',
      ])
      .addSelect([
        'EXTRACT(DAY FROM (NOW() - field."lastUpdateAt")) as "daysSinceLastUpdate"',
        'EXTRACT(DAY FROM (NOW() - field."plantingDate")) as "daysSincePlanting"',
      ])
      .from('fields', 'field')
      .where('field."assignedAgentId" = :agentId', { agentId })
      .andWhere('field."computedStatus" = :status', { status: FieldStatus.AT_RISK })
      .getRawMany();

    return atRiskFields.map((field) => ({
      id: field.id,
      name: field.name,
      cropType: field.cropType,
      currentStage: field.currentStage,
      riskReason: this.determineRiskReason(
        field.currentStage,
        parseInt(field.daysSinceLastUpdate) || 0,
        parseInt(field.daysSincePlanting) || 0,
      ),
      lastUpdateAt: field.lastUpdateAt,
      daysSinceLastUpdate: parseInt(field.daysSinceLastUpdate) || 0,
    }));
  }

  
  private async getPerformanceMetrics(agentId: string): Promise<AgentPerformanceMetricsDto> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

   
    const fieldStats = await this.dataSource
      .createQueryBuilder()
      .select([
        'COUNT(*) as "totalFields"',
        'SUM(CASE WHEN "computedStatus" = :completed THEN 1 ELSE 0 END) as "completedFields"',
      ])
      .from('fields', 'field')
      .where('field."assignedAgentId" = :agentId', { agentId })
      .setParameter('completed', FieldStatus.COMPLETED)
      .getRawOne();

   
    const updateStats = await this.dataSource
      .createQueryBuilder()
      .select([
        'COUNT(*) as "totalUpdates"',
        'SUM(CASE WHEN "createdAt" > :oneWeekAgo THEN 1 ELSE 0 END) as "updatesThisWeek"',
        'SUM(CASE WHEN "createdAt" > :oneMonthAgo THEN 1 ELSE 0 END) as "updatesThisMonth"',
      ])
      .from('field_updates', 'update')
      .where('update."agentId" = :agentId', { agentId })
      .setParameters({
        oneWeekAgo,
        oneMonthAgo,
      })
      .getRawOne();

   
    const responseTimeData = await this.dataSource
      .createQueryBuilder()
      .select([
        'update."fieldId"',
        'COUNT(*) as updateCount',
        'EXTRACT(DAY FROM (MAX(update."createdAt") - MIN(update."createdAt"))) / NULLIF(COUNT(*) - 1, 0) as avgDaysBetween',
      ])
      .from('field_updates', 'update')
      .where('update."agentId" = :agentId', { agentId })
      .groupBy('update."fieldId"')
      .having('COUNT(*) > 1')
      .getRawMany();

    let averageResponseTime = 0;
    if (responseTimeData.length > 0) {
      const totalAvg = responseTimeData.reduce((sum, field) => {
        return sum + (parseFloat(field.avgDaysBetween) || 0);
      }, 0);
      averageResponseTime = totalAvg / responseTimeData.length;
    }

    const totalFields = parseInt(fieldStats.totalFields) || 0;
    const completedFields = parseInt(fieldStats.completedFields) || 0;
    const completionRate = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;

    const totalUpdates = parseInt(updateStats.totalUpdates) || 0;
    const updatesThisWeek = parseInt(updateStats.updatesThisWeek) || 0;
    const updatesThisMonth = parseInt(updateStats.updatesThisMonth) || 0;

    const performanceScore = this.calculatePerformanceScore(
      completionRate,
      updatesThisWeek,
      totalUpdates,
      averageResponseTime,
    );

    const rank = await this.getAgentRank(agentId, completionRate);

    return {
      totalUpdates,
      updatesThisWeek,
      updatesThisMonth,
      averageResponseTime: Math.round(averageResponseTime * 10) / 10,
      completionRate: Math.round(completionRate),
      performanceScore,
      rankAmongAgents: rank,
    };
  }

 
  private async getPendingTasks(agentId: string): Promise<PendingTaskDto[]> {
    const fieldsNeedingAttention = await this.dataSource
      .createQueryBuilder()
      .select([
        'field.id as "fieldId"',
        'field.name as "fieldName"',
        'field."currentStage" as "currentStage"',
        'field."lastUpdateAt" as "lastUpdateAt"',
      ])
      .addSelect([
        'EXTRACT(DAY FROM (NOW() - field."lastUpdateAt")) as "daysSinceLastUpdate"',
      ])
      .from('fields', 'field')
      .where('field."assignedAgentId" = :agentId', { agentId })
      .andWhere('field."computedStatus" != :completed', { completed: FieldStatus.COMPLETED })
      .andWhere('field."lastUpdateAt" IS NULL OR field."lastUpdateAt" < :threshold', {
        threshold: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days
      })
      .orderBy('field."lastUpdateAt"', 'ASC')
      .limit(5)
      .getRawMany();

    return fieldsNeedingAttention.map((field) => {
      const daysSinceLastUpdate = parseInt(field.daysSinceLastUpdate) || 0;
      return {
        fieldId: field.fieldId,
        fieldName: field.fieldName,
        currentStage: field.currentStage,
        daysSinceLastUpdate,
        suggestedAction: this.getSuggestedAction(field.currentStage, daysSinceLastUpdate),
      };
    });
  }

  
  private async getWeeklyActivity(agentId: string): Promise<WeeklyActivityDto> {
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
      .where('update."agentId" = :agentId', { agentId })
      .andWhere('update."createdAt" >= :startDate', { startDate: dates[0] })
      .groupBy('DATE(update."createdAt")')
      .getRawMany();

    
    const updatesMap = new Map();
    updatesData.forEach((item) => {
      const dateKey = new Date(item.date).toISOString().split('T')[0];
      updatesMap.set(dateKey, parseInt(item.count));
    });

  
    const myUpdates: number[] = [];
    for (const date of dates) {
      const dateKey = date.toISOString().split('T')[0];
      myUpdates.push(updatesMap.get(dateKey) || 0);
    }

    return { labels, myUpdates };
  }

  private calculatePerformanceScore(
    completionRate: number,
    updatesThisWeek: number,
    totalUpdates: number,
    averageResponseTime: number,
  ): number {
    const completionScore = (completionRate / 100) * 40;
    const weeklyActivityScore = Math.min(updatesThisWeek * 3, 30);
    const totalActivityScore = Math.min(totalUpdates, 30) * (20 / 30);
    
    let responseTimeScore = 10;
    if (averageResponseTime > 0 && averageResponseTime <= 2) {
      responseTimeScore = 10; // Excellent
    } else if (averageResponseTime <= 4) {
      responseTimeScore = 7; // Good
    } else if (averageResponseTime <= 7) {
      responseTimeScore = 4; // Average
    } else if (averageResponseTime > 7) {
      responseTimeScore = 1; // Poor
    }

    return Math.min(Math.round(completionScore + weeklyActivityScore + totalActivityScore + responseTimeScore), 100);
  }

  private async getAgentRank(agentId: string, myCompletionRate: number): Promise<number> {
    const agents = await this.dataSource
      .createQueryBuilder()
      .select([
        'user.id as "agentId"',
        'COUNT(DISTINCT field.id) as "totalFields"',
        'SUM(CASE WHEN field."computedStatus" = :completed THEN 1 ELSE 0 END) as "completedFields"',
      ])
      .from('users', 'user')
      .leftJoin('fields', 'field', 'field."assignedAgentId" = user.id')
      .where('user.role = :role', { role: UserRole.AGENT })
      .andWhere('user."isActive" = :isActive', { isActive: true })
      .groupBy('user.id')
      .setParameter('completed', FieldStatus.COMPLETED)
      .getRawMany();

    const agentsWithRates = agents.map((agent) => {
      const totalFields = parseInt(agent.totalFields) || 0;
      const completedFields = parseInt(agent.completedFields) || 0;
      const completionRate = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;
      return { agentId: agent.agentId, completionRate };
    });

    
    agentsWithRates.sort((a, b) => b.completionRate - a.completionRate);

    const rank = agentsWithRates.findIndex((a) => a.agentId === agentId) + 1;
    return rank > 0 ? rank : null;
  }

  private determineRiskReason(
    currentStage: string,
    daysSinceLastUpdate: number,
    daysSincePlanting: number,
  ): string {
    if (daysSinceLastUpdate > 7) {
      return `⚠️ No updates for ${daysSinceLastUpdate} days`;
    }
    if (currentStage === FieldStage.GROWING && daysSincePlanting > 60) {
      return `⚠️ Stuck in growing stage for ${daysSincePlanting} days`;
    }
    if (currentStage === FieldStage.PLANTED && daysSincePlanting > 21) {
      return `⚠️ Should have progressed from planted stage`;
    }
    if (currentStage === FieldStage.READY && daysSincePlanting > 90) {
      return `⚠️ Ready for harvest for ${daysSincePlanting - 75} days`;
    }
    return `⚠️ Field requires attention`;
  }

  private getSuggestedAction(currentStage: string, daysSinceLastUpdate: number): string {
    if (daysSinceLastUpdate > 14) {
      return 'Urgent: Schedule immediate field inspection';
    }
    if (daysSinceLastUpdate > 7) {
      return 'Schedule field inspection and provide update';
    }
    if (currentStage === FieldStage.PLANTED) {
      return 'Monitor germination and plan for growing stage transition';
    }
    if (currentStage === FieldStage.GROWING) {
      return 'Check crop health and consider fertilizer application';
    }
    if (currentStage === FieldStage.READY) {
      return 'Prepare for harvest and coordinate with logistics';
    }
    return 'Provide status update';
  }
}
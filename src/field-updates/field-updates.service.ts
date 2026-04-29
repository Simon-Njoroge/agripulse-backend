import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { FieldUpdate } from './entities/field-update.entity';
import {
  Field,
  FieldStage,
  FieldStatus,
} from '../fields/entities/field.entity';
import { UserRole } from '../users/entities/user.entity';
import {
  CreateFieldUpdateDto,
  AddNoteDto,
  FilterUpdatesDto,
  BulkUpdateDto,
} from './dto/create-field-update.dto';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class FieldUpdatesService {
  private readonly logger = new Logger(FieldUpdatesService.name);
  private readonly CACHE_TTL = 60;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
  ) {}

  async createUpdate(createDto: CreateFieldUpdateDto, agentId: string) {
    const { fieldId, newStage, notes, metadata } = createDto;

    const field = await this.dataSource
      .createQueryBuilder()
      .select([
        'field.id',
        'field.name',
        'field.currentStage',
        'field.assignedAgentId',
        'field.plantingDate',
        'field.lastUpdateAt',
      ])
      .from(Field, 'field')
      .where('field.id = :fieldId', { fieldId })
      .getRawOne();

    if (!field) {
      throw new NotFoundException('Field not found');
    }

    if (field.assignedAgentId !== agentId) {
      throw new ForbiddenException('You are not assigned to this field');
    }

    const previousStage = field.currentStage;

    const stageOrder = [
      FieldStage.PLANTED,
      FieldStage.GROWING,
      FieldStage.READY,
      FieldStage.HARVESTED,
    ];
    const currentIndex = stageOrder.indexOf(previousStage);
    const newIndex = stageOrder.indexOf(newStage);

    if (newIndex < currentIndex) {
      throw new BadRequestException('Cannot move backward to a previous stage');
    }

    const daysSincePlanting = this.getDaysDifference(
      field.plantingDate,
      new Date(),
    );
    const computedStatus = this.calculateStatus(newStage, daysSincePlanting);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager
        .createQueryBuilder()
        .update(Field)
        .set({
          currentStage: newStage,
          computedStatus,
          lastUpdateAt: new Date(),
        })
        .where('id = :fieldId', { fieldId })
        .execute();

      const updateResult = await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(FieldUpdate)
        .values({
          fieldId,
          agentId,
          newStage,
          previousStage,
          notes: notes || `Stage updated from ${previousStage} to ${newStage}`,
          metadata: metadata || {},
          updateType: 'stage_change',
        })
        .returning('*')
        .execute();

      await queryRunner.commitTransaction();

      await this.clearRelatedCache(fieldId, agentId);

      return {
        message: 'Stage updated successfully',
        update: updateResult.raw[0],
        field: {
          id: fieldId,
          name: field.name,
          previousStage,
          newStage,
          computedStatus,
        },
      };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create update: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async addNote(addNoteDto: AddNoteDto, agentId: string) {
    const { fieldId, notes, metadata } = addNoteDto;

    const field = await this.dataSource
      .createQueryBuilder()
      .select([
        'field.id',
        'field.name',
        'field.assignedAgentId',
        'field.currentStage',
      ])
      .from(Field, 'field')
      .where('field.id = :fieldId', { fieldId })
      .getRawOne();

    if (!field) {
      throw new NotFoundException('Field not found');
    }

    // Check authorization
    if (field.assignedAgentId !== agentId) {
      throw new ForbiddenException('You are not assigned to this field');
    }

    const updateResult = await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(FieldUpdate)
      .values({
        fieldId,
        agentId,
        newStage: field.currentStage,
        previousStage: field.currentStage,
        notes,
        metadata: metadata || {},
        updateType: 'note',
      })
      .returning('*')
      .execute();

    await this.dataSource
      .createQueryBuilder()
      .update(Field)
      .set({ lastUpdateAt: new Date() })
      .where('id = :fieldId', { fieldId })
      .execute();

    await this.clearRelatedCache(fieldId, agentId);

    return {
      message: 'Note added successfully',
      update: updateResult.raw[0],
    };
  }

  async bulkUpdateStages(bulkUpdateDto: BulkUpdateDto, adminId: string) {
    const { fieldIds, newStage, notes } = bulkUpdateDto;

    const stageOrder = [
      FieldStage.PLANTED,
      FieldStage.GROWING,
      FieldStage.READY,
      FieldStage.HARVESTED,
    ];
    const newIndex = stageOrder.indexOf(newStage);

    const results = {
      success: [] as string[],
      failed: [] as { id: string; reason: string }[],
    };

    for (const fieldId of fieldIds) {
      try {
        const field = await this.dataSource
          .createQueryBuilder()
          .select(['field.id', 'field.currentStage', 'field.assignedAgentId'])
          .from(Field, 'field')
          .where('field.id = :fieldId', { fieldId })
          .getRawOne();

        if (!field) {
          results.failed.push({ id: fieldId, reason: 'Field not found' });
          continue;
        }

        const currentIndex = stageOrder.indexOf(field.currentStage);
        if (newIndex < currentIndex) {
          results.failed.push({ id: fieldId, reason: 'Cannot move backward' });
          continue;
        }

        await this.dataSource
          .createQueryBuilder()
          .update(Field)
          .set({
            currentStage: newStage,
            lastUpdateAt: new Date(),
          })
          .where('id = :fieldId', { fieldId })
          .execute();

        await this.dataSource
          .createQueryBuilder()
          .insert()
          .into(FieldUpdate)
          .values({
            fieldId,
            agentId: field.assignedAgentId,
            newStage,
            previousStage: field.currentStage,
            notes:
              notes ||
              `Bulk update from admin: ${field.currentStage} to ${newStage}`,
            updateType: 'stage_change',
          })
          .execute();

        results.success.push(fieldId);
      } catch (error: any) {
        results.failed.push({ id: fieldId, reason: error.message });
      }
    }

    return {
      message: `Updated ${results.success.length} of ${fieldIds.length} fields`,
      results,
    };
  }

  async getFieldUpdates(
    fieldId: string,
    filters: FilterUpdatesDto,
    userId: string,
    userRole: UserRole,
  ) {
    const field = await this.dataSource
      .createQueryBuilder()
      .select(['field.id', 'field.assignedAgentId'])
      .from(Field, 'field')
      .where('field.id = :fieldId', { fieldId })
      .getRawOne();

    if (!field) {
      throw new NotFoundException('Field not found');
    }

    if (userRole === UserRole.AGENT && field.assignedAgentId !== userId) {
      throw new ForbiddenException('You do not have access to this field');
    }

    const { page = 1, limit = 20, startDate, endDate } = filters;
    const skip = (page - 1) * limit;

    let query = this.dataSource
      .createQueryBuilder()
      .select([
        'update.id',
        'update.newStage',
        'update.previousStage',
        'update.notes',
        'update.metadata',
        'update.updateType',
        'update.createdAt',
        'agent.id as "agentId"',
        'agent.name as "agentName"',
      ])
      .from(FieldUpdate, 'update')
      .leftJoin('update.agent', 'agent')
      .where('update.fieldId = :fieldId', { fieldId });

    if (startDate) {
      query = query.andWhere('update.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      query = query.andWhere('update.createdAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const total = await query.getCount();

    const updates = await query
      .orderBy('update.createdAt', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany();

    return {
      updates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMyUpdates(agentId: string, filters: FilterUpdatesDto) {
    const { page = 1, limit = 20, startDate, endDate } = filters;
    const skip = (page - 1) * limit;

    let query = this.dataSource
      .createQueryBuilder()
      .select([
        'update.id',
        'update.newStage',
        'update.previousStage',
        'update.notes',
        'update.metadata',
        'update.updateType',
        'update.createdAt',
        'field.id as "fieldId"',
        'field.name as "fieldName"',
        'field.cropType as "cropType"',
      ])
      .from(FieldUpdate, 'update')
      .leftJoin('update.field', 'field')
      .where('update.agentId = :agentId', { agentId });

    if (startDate) {
      query = query.andWhere('update.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      query = query.andWhere('update.createdAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const total = await query.getCount();

    const updates = await query
      .orderBy('update.createdAt', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany();

    return {
      updates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllUpdates(filters: FilterUpdatesDto) {
    const {
      page = 1,
      limit = 20,
      fieldId,
      agentId,
      stage,
      startDate,
      endDate,
    } = filters;
    const skip = (page - 1) * limit;

    let query = this.dataSource
      .createQueryBuilder()
      .select([
        'update.id',
        'update.newStage',
        'update.previousStage',
        'update.notes',
        'update.metadata',
        'update.updateType',
        'update.createdAt',
        'field.id as "fieldId"',
        'field.name as "fieldName"',
        'agent.id as "agentId"',
        'agent.name as "agentName"',
      ])
      .from(FieldUpdate, 'update')
      .leftJoin('update.field', 'field')
      .leftJoin('update.agent', 'agent')
      .where('1=1');

    if (fieldId) {
      query = query.andWhere('update.fieldId = :fieldId', { fieldId });
    }
    if (agentId) {
      query = query.andWhere('update.agentId = :agentId', { agentId });
    }
    if (stage) {
      query = query.andWhere('update.newStage = :stage', { stage });
    }
    if (startDate) {
      query = query.andWhere('update.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      query = query.andWhere('update.createdAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const total = await query.getCount();

    const updates = await query
      .orderBy('update.createdAt', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany();

    return {
      updates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUpdateStatistics(fieldId?: string) {
    let query = this.dataSource
      .createQueryBuilder()
      .select([
        'COUNT(*) as "totalUpdates"',
        'updateType',
        'DATE(createdAt) as date',
      ])
      .from(FieldUpdate, 'update');

    if (fieldId) {
      query = query.where('update.fieldId = :fieldId', { fieldId });
    }

    const stats = await query
      .groupBy('updateType, DATE(createdAt)')
      .orderBy('date', 'DESC')
      .limit(30)
      .getRawMany();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(*)', 'count')
      .from(FieldUpdate, 'update')
      .where('update.createdAt >= :today', { today })
      .getRawOne();

    return {
      totalUpdates: parseInt(
        stats.reduce((sum, s) => sum + parseInt(s.totalUpdates), 0),
      ),
      todayUpdates: parseInt(todayCount.count),
      breakdown: stats,
    };
  }

  async deleteUpdate(updateId: string, adminId: string) {
    const result = await this.dataSource
      .createQueryBuilder()
      .delete()
      .from(FieldUpdate)
      .where('id = :updateId', { updateId })
      .execute();

    if (result.affected === 0) {
      throw new NotFoundException('Update not found');
    }

    return { message: 'Update deleted successfully' };
  }

  private calculateStatus(
    currentStage: FieldStage,
    daysSincePlanting: number,
  ): FieldStatus {
    if (currentStage === FieldStage.HARVESTED) {
      return FieldStatus.COMPLETED;
    }

    const riskThresholds = {
      [FieldStage.PLANTED]: 21,
      [FieldStage.GROWING]: 60,
      [FieldStage.READY]: 90,
    };

    if (daysSincePlanting > (riskThresholds[currentStage] || 999)) {
      return FieldStatus.AT_RISK;
    }

    return FieldStatus.ACTIVE;
  }

  private getDaysDifference(startDate: Date, endDate: Date): number {
    return Math.floor(
      (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24),
    );
  }

  private async clearRelatedCache(fieldId: string, agentId: string) {
    await this.cacheService.delPattern(`field_${fieldId}`);

    await this.cacheService.delPattern(`agent_dashboard_${agentId}`);

    await this.cacheService.delPattern('admin_dashboard_data');
  }
}

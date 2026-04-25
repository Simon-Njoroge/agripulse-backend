import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FieldUpdatesService } from './field-updates.service';
import { CreateFieldUpdateDto, AddNoteDto, FilterUpdatesDto, BulkUpdateDto } from './dto/create-field-update.dto';
import { Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RoleGuard } from 'src/common/guards/role.guard';
import { AtGuard } from '../common/guards/at.guard';

interface RequestWithUser extends Request {
  user?: {
    sub: string;
    email: string;
    role: UserRole;
  };
}

@ApiTags('Field Updates')
@Controller('field-updates')
@UseGuards(AtGuard, RoleGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth()
export class FieldUpdatesController {
  constructor(private readonly fieldUpdatesService: FieldUpdatesService) {}


  @Post()
  @Roles(UserRole.AGENT)
  @ApiOperation({ summary: 'Create a stage update for a field' })
  @ApiResponse({ status: 201, description: 'Update created successfully' })
  @ApiResponse({ status: 403, description: 'Not assigned to this field' })
  @ApiResponse({ status: 400, description: 'Invalid stage progression' })
  async createUpdate(@Body() createDto: CreateFieldUpdateDto, @Req() req: RequestWithUser) {
    const result = await this.fieldUpdatesService.createUpdate(createDto, (req as any).user.sub);
    return result;
  }

 
  @Post('note')
  @Roles(UserRole.AGENT)
  @ApiOperation({ summary: 'Add a note to a field without changing stage' })
  @ApiResponse({ status: 201, description: 'Note added successfully' })
  async addNote(@Body() addNoteDto: AddNoteDto, @Req() req: RequestWithUser) {
    const result = await this.fieldUpdatesService.addNote(addNoteDto, (req as any).user.sub);
    return result;
  }

  
  @Post('bulk')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk update stages for multiple fields' })
  @ApiResponse({ status: 201, description: 'Bulk update completed' })
  async bulkUpdateStages(@Body() bulkUpdateDto: BulkUpdateDto, @Req() req: RequestWithUser) {
    const result = await this.fieldUpdatesService.bulkUpdateStages(bulkUpdateDto, (req as any).user.sub);
    return result;
  }


  @Get('field/:fieldId')
  @ApiOperation({ summary: 'Get all updates for a specific field' })
  @ApiResponse({ status: 200, description: 'Updates retrieved successfully' })
  async getFieldUpdates(
    @Param('fieldId') fieldId: string,
    @Query() filters: FilterUpdatesDto,
    @Req() req: RequestWithUser,
  ) {
    const result = await this.fieldUpdatesService.getFieldUpdates(
      fieldId,
      filters,
      (req as any).user.sub,
      (req as any).user.role,
    );
    return result;
  }

  
  @Get('my-updates')
  @Roles(UserRole.AGENT)
  @ApiOperation({ summary: 'Get all updates made by the current agent' })
  async getMyUpdates(@Query() filters: FilterUpdatesDto, @Req() req: RequestWithUser) {
    const result = await this.fieldUpdatesService.getMyUpdates((req as any).user.sub, filters);
    return result;
  }

  
  @Get('all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all updates across all fields (admin only)' })
  async getAllUpdates(@Query() filters: FilterUpdatesDto) {
    const result = await this.fieldUpdatesService.getAllUpdates(filters);
    return result;
  }

 
  @Get('statistics')
  @ApiOperation({ summary: 'Get update statistics' })
  async getStatistics(@Query('fieldId') fieldId?: string) {
    const result = await this.fieldUpdatesService.getUpdateStatistics(fieldId);
    return result;
  }

 
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete an update (admin only)' })
  @ApiResponse({ status: 200, description: 'Update deleted successfully' })
  async deleteUpdate(@Param('id') id: string, @Req() req: RequestWithUser) {
    const result = await this.fieldUpdatesService.deleteUpdate(id, (req as any).user.sub);
    return result;
  }
}
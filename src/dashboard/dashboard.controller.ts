import {
  Controller,
  Get,
  Req,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RoleGuard } from 'src/common/guards/role.guard';
import { AtGuard } from '../common/guards/at.guard';
import { AdminDashboardResponseDto } from './dto/dashboard.dto';

interface RequestWithUser extends Request {
  user?: {
    sub: string;
    email: string;
    role: UserRole;
  };
}

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(AtGuard, RoleGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get admin dashboard with system-wide analytics' })
  @ApiResponse({
    status: 200,
    description: 'Admin dashboard data retrieved successfully',
    type: AdminDashboardResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'User is not authorized as admin',
  })
  async getAdminDashboard(@Req() req: RequestWithUser) {
    const result = await this.dashboardService.getAdminDashboard();
    return result;
  }

  @Get('agent')
  @Roles(UserRole.AGENT)
  @ApiOperation({ summary: 'Get agent dashboard with personal analytics' })
  @ApiResponse({
    status: 200,
    description: 'Agent dashboard data retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not authorized as agent',
  })
  async getAgentDashboard(@Req() req: RequestWithUser) {
    const result = await this.dashboardService.getAgentDashboard(
      (req as any).user.sub,
    );
    return result;
  }
}

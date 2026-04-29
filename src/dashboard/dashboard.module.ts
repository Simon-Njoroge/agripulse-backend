import { Module } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { DashboardController } from './dashboard.controller';
import { AgentDashboardService } from './agent-dashboard.service';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, AdminDashboardService, AgentDashboardService],
})
export class DashboardModule {}

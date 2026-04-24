import { Module } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Admin } from 'typeorm';

@Module({
  controllers: [DashboardController],
  providers: [AdminDashboardService],
})
export class DashboardModule {}

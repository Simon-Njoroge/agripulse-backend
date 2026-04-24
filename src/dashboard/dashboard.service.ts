import { Injectable } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
// import { AgentDashboardService } from './services/agent-dashboard.service';
import { AdminDashboardResponseDto } from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly adminDashboardService: AdminDashboardService,
    // private readonly agentDashboardService: AgentDashboardService,
  ) {}

  async getAdminDashboard(): Promise<AdminDashboardResponseDto> {
    return this.adminDashboardService.getAdminDashboard();
  }

//   async getAgentDashboard(agentId: string) {
//     return this.agentDashboardService.getAgentDashboard(agentId);
//   }
}
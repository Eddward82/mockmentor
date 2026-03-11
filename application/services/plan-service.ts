import { UserPlan } from '../../core/domain/plan';
import { InterviewHistoryPort } from '../ports/interview-history-port';
import { PlanPort } from '../ports/plan-port';
import { interviewFlowService } from './interview-flow-service';

export class PlanService {
  constructor(
    private readonly planPort: PlanPort,
    private readonly interviewHistoryPort: InterviewHistoryPort
  ) {}

  getUserPlan(): Promise<UserPlan> {
    return this.planPort.getUserPlan();
  }

  setUserPlan(plan: UserPlan): Promise<void> {
    return this.planPort.setUserPlan(plan);
  }

  async getSessionCount(_plan?: UserPlan): Promise<number> {
    const history = await this.interviewHistoryPort.getHistory();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return history.filter((item) => new Date(item.date) >= startOfMonth).length;
  }

  async getAudioMinutesUsed(): Promise<number> {
    const history = await this.interviewHistoryPort.getHistory();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthSessions = history.filter((item) => new Date(item.date) >= startOfMonth);
    const totalSeconds = monthSessions.reduce((sum, item) => sum + (item.duration ?? 0), 0);
    return totalSeconds / 60;
  }

  async canStartSession(plan: UserPlan): Promise<{ allowed: boolean; reason?: string }> {
    const history = await this.interviewHistoryPort.getHistory();
    const result = interviewFlowService.canStartInterview(plan, history);
    return result.allowed ? { allowed: true } : { allowed: false, reason: result.reason };
  }
}

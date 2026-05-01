import { UserPlan } from '../../core/domain/plan';
import { InterviewHistoryPort } from '../ports/interview-history-port';
import { PlanPort } from '../ports/plan-port';
import { interviewFlowService } from './interview-flow-service';
import { auth } from '../../services/firebase';

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
    const uid = auth.currentUser?.uid;
    if (!uid) return 0;
    const history = await this.interviewHistoryPort.getHistory(uid);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return history.filter((item) => {
      // Support both createdAt (Firestore Timestamp) and date (ISO string)
      const raw = (item as any).createdAt;
      const d = raw?.toDate ? raw.toDate() : new Date(item.date);
      return d >= startOfMonth;
    }).length;
  }

  async getAudioMinutesUsed(): Promise<number> {
    const uid = auth.currentUser?.uid;
    if (!uid) return 0;
    const history = await this.interviewHistoryPort.getHistory(uid);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthSessions = history.filter((item) => {
      const raw = (item as any).createdAt;
      const d = raw?.toDate ? raw.toDate() : new Date(item.date);
      return d >= startOfMonth;
    });
    const totalSeconds = monthSessions.reduce((sum, item) => sum + (item.duration ?? 0), 0);
    return totalSeconds / 60;
  }

  async canStartSession(plan: UserPlan): Promise<{ allowed: boolean; reason?: string }> {
    const uid = auth.currentUser?.uid;
    if (!uid) return { allowed: false, reason: 'session_limit_reached' };
    const history = await this.interviewHistoryPort.getHistory(uid);
    const result = interviewFlowService.canStartInterview(plan, history);
    return result.allowed ? { allowed: true } : { allowed: false, reason: result.reason };
  }
}

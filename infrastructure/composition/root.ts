import { PlanService } from '../../application/services/plan-service';
import { SessionRecoveryService } from '../../application/services/session-recovery-service';
import { interviewHistoryRepository } from '../persistence/interview-history-repository';
import { browserSessionRecoveryStore } from '../persistence/browser-session-recovery-store';
import { firestorePlanRepository } from '../plans/firestore-plan-repository';

export const compositionRoot = {
  interviewHistoryRepository,
  planService: new PlanService(firestorePlanRepository, interviewHistoryRepository),
  sessionRecoveryService: new SessionRecoveryService(browserSessionRecoveryStore)
};

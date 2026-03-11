import { UserPlan } from '../../core/domain/plan';

export interface PlanPort {
  getUserPlan(): Promise<UserPlan>;
  setUserPlan(plan: UserPlan): Promise<void>;
}

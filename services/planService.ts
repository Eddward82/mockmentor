import { UserPlan, PLAN_LIMITS } from '../types';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { persistenceService } from './persistenceService';

export const planService = {
  async getUserPlan(): Promise<UserPlan> {
    const user = auth.currentUser;
    if (!user) return 'starter';

    try {
      const profileRef = doc(db, 'users', user.uid, 'profile', 'plan');
      const snap = await getDoc(profileRef);
      if (snap.exists()) {
        const plan = snap.data().plan as UserPlan;
        if (plan === 'professional' || plan === 'premium' || plan === 'starter') return plan;
      }
    } catch (e) {
      console.error('Error fetching user plan:', e);
    }

    return 'starter';
  },

  async setUserPlan(plan: UserPlan): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    const profileRef = doc(db, 'users', user.uid, 'profile', 'plan');
    await setDoc(profileRef, { plan }, { merge: true });
  },

  async getSessionCount(plan: UserPlan): Promise<number> {
    const limits = PLAN_LIMITS[plan];
    const history = await persistenceService.getHistory();

    if (limits.isLifetimeLimit) {
      return history.length;
    }

    // Monthly count for paid plans
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return history.filter((item) => new Date(item.date) >= startOfMonth).length;
  },

  async canStartSession(plan: UserPlan): Promise<{ allowed: boolean; reason?: string }> {
    const limits = PLAN_LIMITS[plan];
    const count = await this.getSessionCount(plan);

    if (count >= limits.sessionLimit) {
      return { allowed: false, reason: 'limit_reached' };
    }

    return { allowed: true };
  },
};

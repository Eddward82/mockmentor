import { UserPlan, PLAN_LIMITS } from '../types';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { persistenceService } from './persistenceService';

function getStartOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

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
    const history = await persistenceService.getHistory();
    const startOfMonth = getStartOfMonth();
    // All plans now count monthly sessions
    return history.filter((item) => new Date(item.date) >= startOfMonth).length;
  },

  async getAudioMinutesUsed(): Promise<number> {
    const history = await persistenceService.getHistory();
    const startOfMonth = getStartOfMonth();
    const monthSessions = history.filter((item) => new Date(item.date) >= startOfMonth);
    // Sum up duration (stored in seconds), convert to minutes
    const totalSeconds = monthSessions.reduce((sum, item) => sum + (item.duration ?? 0), 0);
    return totalSeconds / 60;
  },

  async canStartSession(plan: UserPlan): Promise<{ allowed: boolean; reason?: string }> {
    const limits = PLAN_LIMITS[plan];

    // Premium has unlimited sessions — only check audio cap
    if (limits.sessionLimit === null) {
      const audioUsed = await this.getAudioMinutesUsed();
      if (audioUsed >= limits.maxAudioMinutesPerMonth) {
        return { allowed: false, reason: 'audio_limit_reached' };
      }
      return { allowed: true };
    }

    // Check session count for Starter and Professional
    const count = await this.getSessionCount(plan);
    if (count >= limits.sessionLimit) {
      return { allowed: false, reason: 'limit_reached' };
    }

    // Check audio minutes cap
    const audioUsed = await this.getAudioMinutesUsed();
    if (audioUsed >= limits.maxAudioMinutesPerMonth) {
      return { allowed: false, reason: 'audio_limit_reached' };
    }

    return { allowed: true };
  },
};

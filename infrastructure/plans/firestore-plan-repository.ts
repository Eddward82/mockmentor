import { UserPlan } from '../../core/domain/plan';
import { db, auth } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { PlanPort } from '../../application/ports/plan-port';

class FirestorePlanRepository implements PlanPort {
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
  }

  async setUserPlan(plan: UserPlan): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    const profileRef = doc(db, 'users', user.uid, 'profile', 'plan');
    await setDoc(profileRef, { plan }, { merge: true });
  }
}

export const firestorePlanRepository = new FirestorePlanRepository();

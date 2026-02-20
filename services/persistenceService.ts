import { InterviewResult } from '../types';
import { db, auth } from './firebase';
// Fix firestore imports to ensure correct module resolution for named exports
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';

const LOCAL_KEY = 'ai_interview_history';

const saveLocal = (result: InterviewResult) => {
  const saved = localStorage.getItem(LOCAL_KEY);
  const history: InterviewResult[] = saved ? JSON.parse(saved) : [];
  localStorage.setItem(LOCAL_KEY, JSON.stringify([result, ...history]));
};

const getLocal = (): InterviewResult[] => {
  const saved = localStorage.getItem(LOCAL_KEY);
  return saved ? JSON.parse(saved) : [];
};

export const persistenceService = {
  async saveInterview(result: InterviewResult): Promise<void> {
    // Always save to localStorage immediately as source of truth
    saveLocal(result);

    const user = auth.currentUser;
    if (!user) return;

    try {
      const colRef = collection(db, 'users', user.uid, 'interviews');
      await addDoc(colRef, {
        ...result,
        createdAt: Timestamp.now()
      });
    } catch (e) {
      console.error('Error saving to Firestore:', e);
    }
  },

  async getHistory(): Promise<InterviewResult[]> {
    const user = auth.currentUser;

    // Try Firestore with a 3s timeout for logged-in users, fall back to localStorage
    if (user) {
      try {
        const colRef = collection(db, 'users', user.uid, 'interviews');
        const q = query(colRef, orderBy('createdAt', 'desc'));
        const snapshot = await Promise.race([
          getDocs(q),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3000))
        ]);
        if (snapshot.docs.length > 0) {
          return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as unknown as InterviewResult);
        }
      } catch (e) {
        console.warn('Firestore unavailable, using local storage:', (e as Error).message);
      }
    }

    // Fall back to localStorage (works for guests and when Firestore fails/is empty)
    return getLocal();
  },

  async getMonthlyInterviewCount(): Promise<number> {
    const user = auth.currentUser;
    if (!user) return 0;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const history = await this.getHistory();
    return history.filter((item) => new Date(item.date) >= startOfMonth).length;
  },

  async clearHistory(): Promise<void> {
    localStorage.removeItem('ai_interview_history');
  }
};

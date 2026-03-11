import { InterviewResult } from '../../core/domain/interview';
import { db, auth } from '../../services/firebase';
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { InterviewHistoryPort } from '../../application/ports/interview-history-port';

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

class InterviewHistoryRepository implements InterviewHistoryPort {
  async saveInterview(result: InterviewResult): Promise<void> {
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
  }

  async getHistory(): Promise<InterviewResult[]> {
    const user = auth.currentUser;

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

    return getLocal();
  }

  async getMonthlyInterviewCount(): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const history = await this.getHistory();
    return history.filter((item) => new Date(item.date) >= startOfMonth).length;
  }

  async clearHistory(): Promise<void> {
    localStorage.removeItem(LOCAL_KEY);
  }
}

export const interviewHistoryRepository = new InterviewHistoryRepository();

import { InterviewResult } from '../../core/domain/interview';
import { db, auth } from '../../services/firebase';
import { collection, addDoc, getDocs, query, orderBy, Timestamp, deleteDoc } from 'firebase/firestore';
import { InterviewHistoryPort } from '../../application/ports/interview-history-port';

class InterviewHistoryRepository implements InterviewHistoryPort {
  async saveInterview(result: InterviewResult): Promise<void> {
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

  async getHistory(uid: string): Promise<InterviewResult[]> {
    try {
      const colRef = collection(db, 'users', uid, 'interviews');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as unknown as InterviewResult);
    } catch (e) {
      console.warn('Failed to fetch interview history:', (e as Error).message);
      return [];
    }
  }

  async getMonthlyInterviewCount(): Promise<number> {
    const user = auth.currentUser;
    if (!user) return 0;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const history = await this.getHistory(user.uid);
    return history.filter((item) => {
      const raw = (item as any).createdAt;
      const d = raw?.toDate ? raw.toDate() : new Date(item.date);
      return d >= startOfMonth;
    }).length;
  }

  async clearHistory(): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const colRef = collection(db, 'users', user.uid, 'interviews');
      const snapshot = await getDocs(colRef);
      await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  }
}

export const interviewHistoryRepository = new InterviewHistoryRepository();

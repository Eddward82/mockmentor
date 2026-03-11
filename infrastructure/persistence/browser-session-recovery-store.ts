import { RecoverableSession, SessionRecoveryPort } from '../../application/ports/session-recovery-port';

const STORAGE_KEY = 'mockmentor-session-recovery';

class BrowserSessionRecoveryStore implements SessionRecoveryPort {
  save(data: RecoverableSession): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // sessionStorage full or unavailable - silently ignore
    }
  }

  load(): RecoverableSession | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data: RecoverableSession = JSON.parse(raw);
      if (Date.now() - data.savedAt > 60 * 60 * 1000) {
        this.clear();
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  clear(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // silently ignore
    }
  }

  exists(): boolean {
    return this.load() !== null;
  }
}

export const browserSessionRecoveryStore = new BrowserSessionRecoveryStore();

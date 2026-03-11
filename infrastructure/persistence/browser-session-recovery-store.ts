import { RecoverableSession, SessionRecoveryPort } from '../../application/ports/session-recovery-port';
import { emitLiveSessionEvent } from '../../utils/live-session-observability';

const STORAGE_KEY = 'mockmentor-session-recovery';
const STORAGE_VERSION = 1;
const SESSION_TTL_MS = 60 * 60 * 1000;

interface StoredRecoveryPayload {
  version: number;
  checksum: number;
  payload: RecoverableSession;
}

const checksum = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

class BrowserSessionRecoveryStore implements SessionRecoveryPort {
  save(data: RecoverableSession): void {
    try {
      const payloadJson = JSON.stringify(data);
      const wrapped: StoredRecoveryPayload = {
        version: STORAGE_VERSION,
        checksum: checksum(payloadJson),
        payload: data,
      };
      const raw = JSON.stringify(wrapped);
      sessionStorage.setItem(STORAGE_KEY, raw);
      localStorage.setItem(STORAGE_KEY, raw);
    } catch {
      emitLiveSessionEvent('recovery_save_failure', { reason: 'storage_write_failed' });
    }
  }

  load(): RecoverableSession | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as RecoverableSession | StoredRecoveryPayload;
      const data = this.unwrap(parsed);
      if (!data) {
        this.clear();
        return null;
      }

      if (Date.now() - data.savedAt > SESSION_TTL_MS) {
        this.clear();
        return null;
      }
      return data;
    } catch {
      emitLiveSessionEvent('recovery_load_failure', { reason: 'storage_read_failed' });
      return null;
    }
  }

  private unwrap(parsed: RecoverableSession | StoredRecoveryPayload): RecoverableSession | null {
    if ('payload' in parsed && 'version' in parsed && 'checksum' in parsed) {
      if (parsed.version !== STORAGE_VERSION) {
        emitLiveSessionEvent('recovery_parse_failure', { reason: 'unsupported_version' });
        return null;
      }
      const payloadJson = JSON.stringify(parsed.payload);
      if (checksum(payloadJson) !== parsed.checksum) {
        emitLiveSessionEvent('recovery_integrity_failure', { reason: 'checksum_mismatch' });
        return null;
      }
      return parsed.payload;
    }

    return parsed;
  }

  clear(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // silently ignore
    }
  }

  exists(): boolean {
    return this.load() !== null;
  }
}

export const browserSessionRecoveryStore = new BrowserSessionRecoveryStore();

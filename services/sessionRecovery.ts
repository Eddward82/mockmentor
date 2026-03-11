import { RecoverableSession } from '../application/ports/session-recovery-port';
import { SessionRecoveryService } from '../application/services/session-recovery-service';
import { browserSessionRecoveryStore } from '../infrastructure/persistence/browser-session-recovery-store';

export type { RecoverableSession };
export const sessionRecovery = new SessionRecoveryService(browserSessionRecoveryStore);

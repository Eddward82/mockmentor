import { RecoverableSession, SessionRecoveryPort } from '../ports/session-recovery-port';

export class SessionRecoveryService {
  constructor(private readonly sessionRecoveryPort: SessionRecoveryPort) {}

  save(data: RecoverableSession): void {
    this.sessionRecoveryPort.save(data);
  }

  load(): RecoverableSession | null {
    return this.sessionRecoveryPort.load();
  }

  clear(): void {
    this.sessionRecoveryPort.clear();
  }

  exists(): boolean {
    return this.sessionRecoveryPort.exists();
  }
}

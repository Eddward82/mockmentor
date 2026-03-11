export type LiveSessionEventName =
  | 'realtime_send_failure'
  | 'heartbeat_failure'
  | 'camera_recovery_attempt'
  | 'camera_recovery_success'
  | 'camera_recovery_failure'
  | 'transcript_persist_failure'
  | 'recovery_save_failure'
  | 'recovery_load_failure'
  | 'recovery_parse_failure'
  | 'recovery_integrity_failure'
  | 'transport_state_change'
  | 'reconnect_attempt';

export interface LiveSessionEventPayload {
  sessionId?: string;
  questionIndex?: number;
  elapsedMs?: number;
  reason?: string;
  [key: string]: unknown;
}

export const emitLiveSessionEvent = (event: LiveSessionEventName, payload: LiveSessionEventPayload = {}): void => {
  console.info('[live-session-event]', {
    event,
    at: new Date().toISOString(),
    ...payload,
  });
};

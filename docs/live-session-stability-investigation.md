# Live Session Stability Investigation

## Summary

This report documents a focused review of the live interview session pipeline, with emphasis on reconnect behavior, audio/video transport resilience, and session recovery durability.

### Headline findings

1. **The runtime includes multiple stability controls** (heartbeat keepalive, buffered audio flush, muted microphone during AI playback, and best-effort camera track recovery), which significantly reduce common realtime interruptions.
2. **Most error handling is intentionally fail-soft** (silent catches around non-critical persistence and media sends), which protects the UI from crashing but can hide degraded behavior.
3. **Session recovery is available for interrupted interviews**, but recovery durability is limited to `sessionStorage` (tab-scoped, best-effort writes, one-hour TTL).
4. **A small number of operational risks remain**, especially around long-running sessions, hidden send failures, and limited telemetry for diagnosing intermittent issues.

---

## Scope

The investigation focused on these modules:

- `components/InterviewSimulation.tsx` (live Gemini session orchestration, media capture, timers, buffering, callbacks).
- `infrastructure/persistence/browser-session-recovery-store.ts` (recovery persistence and expiry behavior).
- `application/services/session-recovery-service.ts` + `services/sessionRecovery.ts` (recovery abstraction and singleton wiring).
- Existing session-recovery tests in `tests/services/sessionRecovery.test.ts`.

---

## Architecture snapshot (current behavior)

During an active interview, the component initializes realtime media + model streaming and manages:

- microphone capture at 16kHz input,
- model audio playback at 24kHz output,
- periodic camera frame uploads (when video mode is enabled),
- per-question timer state and auto-advance logic,
- transcript persistence (fire-and-forget) to Firestore,
- in-browser recovery snapshots for interrupted runs.

The session lifecycle is guarded through refs (`sessionRef`, `sessionOpenRef`, `interviewFinishedRef`, etc.) to avoid stale React closure behavior while high-frequency callbacks are active.

---

## Stability controls observed

## 1) Keepalive heartbeat for realtime connection longevity

A silent PCM frame is sent every 20 seconds while the session is open. This reduces idle timeout risk for stretches where no user speech is detected.

**Impact:** Helps sustain long pauses without requiring explicit reconnect logic.

## 2) Audio buffering + periodic flush

Microphone PCM chunks are queued and flushed every 150ms. This smooths short jitter spikes and avoids one-send-per-processor-callback burstiness.

**Impact:** Improves transport stability and ordering under mild network variance.

## 3) No-interruption input policy + AI playback mic gating

The session config uses no-interruption activity handling, and local capture is skipped while the AI is speaking.

**Impact:** Reduces model/user talk-over loops and accidental feedback/echo into the upstream stream.

## 4) Video track interruption recovery

If the camera track ends/mutes unexpectedly, the component attempts a one-time reacquire path and remounts the track into the active stream.

**Impact:** Protects against transient camera device interruptions without terminating the full interview.

## 5) Fail-soft persistence and transcript writes

Recovery saves and transcript `addDoc` writes are non-throwing best-effort operations.

**Impact:** Keeps session UX responsive even when persistence backends are unavailable.

---

## Session recovery behavior

Recovery is backed by `sessionStorage` with key `mockmentor-session-recovery`.

### Current semantics

- **Save:** JSON serialize into session storage (errors swallowed).
- **Load:** Parse payload; reject and clear entries older than 1 hour.
- **Exists:** Delegates to `load()` so expiry and parse failures return false.
- **Clear:** Removes storage key (errors swallowed).

### Test coverage currently present

The existing unit tests verify:

- save/load roundtrip,
- empty-state null behavior,
- clear semantics,
- exists true/false cases,
- expiry discard beyond 1 hour,
- acceptance within 1 hour.

---

## Risks and instability contributors

## A) Silent send/persist failures reduce diagnosability

Many operational failures are intentionally ignored to preserve UX continuity. This is reasonable for production continuity but makes root-cause analysis difficult when users report intermittent stalls, missing transcript lines, or partial recovery.

**Risk level:** Medium.

## B) Recovery durability is tab-scoped, not cross-tab/device

`sessionStorage` survives reloads in the same tab, but not browser restarts, different tabs, or different devices.

**Risk level:** Medium for users expecting "resume anywhere" semantics.

## C) Limited explicit reconnect state machine

The flow relies on keepalive and local guards; there is no full reconnect state machine with bounded retry/backoff and reason codes.

**Risk level:** Medium-High for unstable networks.

## D) Long-session drift and resource lifecycle complexity

The component coordinates many intervals/timeouts/audio contexts/refs. Cleanup exists, but lifecycle complexity raises the chance of edge-case leaks or duplicate loops after unusual transitions.

**Risk level:** Medium.

---

## Recommendations (prioritized)

## P0 — Add low-cost observability for live session failures

- Emit structured client events for:
  - realtime send failures,
  - heartbeat failures,
  - camera recovery attempts/success/failure,
  - transcript persistence failures,
  - recovery save/load parse failures.
- Include session id + question index + elapsed time.

**Expected outcome:** Faster triage for "random disconnect" and "lost transcript" incidents.

## P1 — Introduce explicit reconnect orchestration

- Add a connection state machine (`connecting`, `open`, `degraded`, `reconnecting`, `closed`).
- Implement bounded retry with exponential backoff and jitter.
- Keep interview state isolated from transport state so reconnect does not reset question progression.

**Expected outcome:** Better resilience to temporary websocket/network drops.

## P1 — Strengthen recovery storage strategy

- Consider dual-write to `localStorage` (opt-in) for broader resume behavior.
- Persist a compact integrity/version field to handle future schema changes safely.
- Surface a lightweight user signal when recovery save fails repeatedly.

**Expected outcome:** More reliable resume path and fewer silent recovery misses.

## P2 — Decompose `InterviewSimulation` transport logic

- Extract audio transport, video transport, and timer/recovery orchestration into dedicated hooks/services.
- Keep component focused on rendering and high-level state transitions.

**Expected outcome:** Lower lifecycle complexity and easier targeted testing.

---

## Suggested validation plan

1. **Synthetic interruption testing**
   - simulate network drop/restore while speaking and while idle,
   - force camera track end events,
   - verify interview continuity and recovery metrics emission.

2. **Longevity test**
   - run 30–45 minute sessions with varied pause lengths,
   - verify heartbeat effectiveness and absence of interval leaks.

3. **Recovery test matrix**
   - refresh in-tab, crash/reopen tab, open new tab, browser restart,
   - verify expected recover/non-recover semantics are explicit in UX.

---

## Conclusion

The current live-session stack already contains several practical resilience mechanisms and is in better shape than a "minimal realtime prototype." The main gap is not core capability, but **operational clarity and deterministic reconnect behavior** under adverse conditions. Addressing observability and reconnect orchestration should produce the biggest near-term stability gains.

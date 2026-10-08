/**
 * Runs a fire-and-forget async operation (typically an audit/log write) without ever letting it
 * throw into the caller - not even synchronously. A test double (`vi.fn()` with no
 * `mockResolvedValue`) returns `undefined` rather than a Promise, and calling `.catch()`
 * directly on that throws a TypeError immediately; wrapping the call in `Promise.resolve(...)`
 * plus a `try/catch` around the whole thing handles both the real (rejected promise) and test
 * double (non-promise return) failure shapes the same way. Used by every "write a SecurityEvent/
 * AiSecurityEvent/session touch and don't block on it" call site - see security/aiGateway.ts,
 * security/policyEngine.ts, services/securityActivity.service.ts, services/session.service.ts.
 */
export function fireAndForget(fn: () => unknown, onError: (err: unknown) => void): void {
  try {
    void Promise.resolve(fn()).catch(onError);
  } catch (err) {
    onError(err);
  }
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runInvestigation } from '../src/agent/agent';
import { clearCooldown, getAvailableProviders, REQUESTY_MAX_MODEL_ATTEMPTS, REQUESTY_MODEL_PRIORITY } from '../src/agent/providers';

const invokeMock = vi.fn();
vi.mock('@langchain/langgraph/prebuilt', () => ({
  createReactAgent: () => ({ invoke: invokeMock }),
}));

vi.mock('@langchain/google-genai', () => ({ ChatGoogleGenerativeAI: vi.fn().mockImplementation(() => ({})) }));
vi.mock('@langchain/groq', () => ({ ChatGroq: vi.fn().mockImplementation(() => ({})) }));
vi.mock('@langchain/openai', () => ({ ChatOpenAI: vi.fn().mockImplementation(() => ({})) }));

let hasRequesty = true;
vi.mock('../src/config/env', () => ({
  get env() {
    return {
      get hasRequesty() {
        return hasRequesty;
      },
      hasGemini: true,
      hasGroq: true,
      hasOpenRouter: true,
      openRouterModel: 'openrouter/free',
      hasAnyAgentProvider: true,
    };
  },
}));

const okAgentResponse = (toolName = 'getOrganMetrics') => ({
  messages: [{ tool_calls: [{ name: toolName }] }],
  structuredResponse: { summary: 'ok', findings: [], toolsUsed: [toolName], insufficientEvidence: false },
});

beforeEach(() => {
  vi.clearAllMocks();
  hasRequesty = true;
  clearCooldown('requesty');
  clearCooldown('gemini');
  clearCooldown('groq');
  clearCooldown('openrouter');
});

describe('Requesty disabled (REQUESTY_ENABLED=false / hasRequesty=false)', () => {
  it('skips Requesty entirely and goes straight to Groq (next provider in priority)', async () => {
    hasRequesty = false;
    invokeMock.mockResolvedValueOnce(okAgentResponse());
    const outcome = await runInvestigation(undefined);
    expect(outcome.ok).toBe(true);
    expect(invokeMock).toHaveBeenCalledTimes(1); // only the first available provider (Groq) is called
    expect(getAvailableProviders().map((p) => p.name)).not.toContain('requesty');
  });
});

describe('Requesty 402 (account-level error)', () => {
  it('fails over to Groq immediately without trying any other Requesty model', async () => {
    invokeMock.mockRejectedValueOnce(new Error('402 Your organization\'s balance is too low')).mockResolvedValueOnce(okAgentResponse());
    const outcome = await runInvestigation(undefined);
    expect(outcome.ok).toBe(true);
    // Exactly 2 invoke calls: one Requesty attempt (402, account-level, stop immediately), then Groq succeeds.
    expect(invokeMock).toHaveBeenCalledTimes(2);
  });

  it('401 and 403 are treated the same as 402 - stop Requesty immediately', async () => {
    invokeMock.mockRejectedValueOnce(new Error('403 not approved for this API key')).mockResolvedValueOnce(okAgentResponse());
    const outcome = await runInvestigation(undefined);
    expect(outcome.ok).toBe(true);
    expect(invokeMock).toHaveBeenCalledTimes(2);
  });
});

describe('Requesty model-specific failure (400/404)', () => {
  it('tries the next model in REQUESTY_MODEL_PRIORITY, up to REQUESTY_MAX_MODEL_ATTEMPTS', async () => {
    invokeMock
      .mockRejectedValueOnce(new Error('400 invalid model ID'))
      .mockResolvedValueOnce(okAgentResponse());
    const outcome = await runInvestigation(undefined);
    expect(outcome.ok).toBe(true);
    // Both calls were Requesty model attempts (model #1 fails, model #2 succeeds) - no Groq call needed.
    expect(invokeMock).toHaveBeenCalledTimes(2);
  });

  it('never tries more than REQUESTY_MAX_MODEL_ATTEMPTS Requesty models before failing over', async () => {
    // Every Requesty model attempt 400s; after REQUESTY_MAX_MODEL_ATTEMPTS, failover to Groq.
    invokeMock
      .mockRejectedValueOnce(new Error('400 invalid model ID'))
      .mockRejectedValueOnce(new Error('400 invalid model ID'))
      .mockResolvedValueOnce(okAgentResponse());
    const outcome = await runInvestigation(undefined);
    expect(outcome.ok).toBe(true);
    expect(invokeMock).toHaveBeenCalledTimes(REQUESTY_MAX_MODEL_ATTEMPTS + 1); // 2 Requesty attempts + 1 Groq success
    expect(REQUESTY_MAX_MODEL_ATTEMPTS).toBe(2);
    expect(REQUESTY_MODEL_PRIORITY.length).toBeGreaterThan(REQUESTY_MAX_MODEL_ATTEMPTS);
  });
});

describe('Requesty transient failure (429/5xx/timeout)', () => {
  it('does not retry the same model and fails over to the next provider immediately', async () => {
    invokeMock.mockRejectedValueOnce(new Error('ETIMEDOUT')).mockResolvedValueOnce(okAgentResponse());
    const outcome = await runInvestigation(undefined);
    expect(outcome.ok).toBe(true);
    // Only 1 Requesty attempt (no model retry on a transient error), then Groq succeeds.
    expect(invokeMock).toHaveBeenCalledTimes(2);
  });
});

describe('No hidden retries / bounded steps', () => {
  it('a successful first provider call never triggers a second invoke', async () => {
    invokeMock.mockResolvedValueOnce(okAgentResponse());
    await runInvestigation(undefined);
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it('invoke is called with a bounded recursionLimit and an abort signal', async () => {
    invokeMock.mockResolvedValueOnce(okAgentResponse());
    await runInvestigation(undefined);
    const [, callOptions] = invokeMock.mock.calls[0]!;
    expect(callOptions.recursionLimit).toBeGreaterThan(0);
    expect(callOptions.recursionLimit).toBeLessThanOrEqual(24);
    expect(callOptions.signal).toBeInstanceOf(AbortSignal);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runInvestigation } from '../src/agent/agent';
import { clearCooldown, getAvailableProviders, getProviderStatuses, putOnCooldown } from '../src/agent/providers';

// Mock LangGraph's createReactAgent: these tests validate the failover LOOP in agent.ts
// (try provider 1, on failure try provider 2, etc.), not LangChain/Gemini/Groq/OpenRouter
// internals - those are exercised by the real, scarce smoke test instead (see final report).
const invokeMock = vi.fn();
vi.mock('@langchain/langgraph/prebuilt', () => ({
  createReactAgent: () => ({ invoke: invokeMock }),
}));

// Mock the three provider SDK constructors so "building" a provider never actually touches the
// network - providers.ts's own available/configured logic is exercised directly.
vi.mock('@langchain/google-genai', () => ({ ChatGoogleGenerativeAI: vi.fn().mockImplementation(() => ({})) }));
vi.mock('@langchain/groq', () => ({ ChatGroq: vi.fn().mockImplementation(() => ({})) }));
vi.mock('@langchain/openai', () => ({ ChatOpenAI: vi.fn().mockImplementation(() => ({})) }));

vi.mock('../src/config/env', () => ({
  env: {
    hasGemini: true,
    hasGroq: true,
    hasOpenRouter: true,
    openRouterModel: 'openrouter/free',
    hasAnyAgentProvider: true,
  },
}));

const okAgentResponse = (toolName = 'getOrganMetrics') => ({
  messages: [{ tool_calls: [{ name: toolName }] }],
  structuredResponse: {
    summary: 'ok',
    findings: [],
    toolsUsed: [toolName],
    insufficientEvidence: false,
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  clearCooldown('gemini');
  clearCooldown('groq');
  clearCooldown('openrouter');
});

describe('provider failover', () => {
  it('returns a result from the first provider (Gemini) on success, without trying others', async () => {
    invokeMock.mockResolvedValueOnce(okAgentResponse());
    const outcome = await runInvestigation(undefined);
    expect(outcome.ok).toBe(true);
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it('fails over from Gemini to Groq when Gemini errors (e.g. 429)', async () => {
    invokeMock.mockRejectedValueOnce(new Error('[429 Too Many Requests] quota exceeded')).mockResolvedValueOnce(okAgentResponse());
    const outcome = await runInvestigation(undefined);
    expect(outcome.ok).toBe(true);
    expect(invokeMock).toHaveBeenCalledTimes(2);
  });

  it('fails over from Gemini and Groq to OpenRouter when both error', async () => {
    invokeMock
      .mockRejectedValueOnce(new Error('[429] quota exceeded'))
      .mockRejectedValueOnce(new Error('[500] internal error'))
      .mockResolvedValueOnce(okAgentResponse());
    const outcome = await runInvestigation(undefined);
    expect(outcome.ok).toBe(true);
    expect(invokeMock).toHaveBeenCalledTimes(3);
  });

  it('reports a single generic failure when every provider fails, never a provider name', async () => {
    invokeMock
      .mockRejectedValueOnce(new Error('[429] quota exceeded (gemini secret stuff)'))
      .mockRejectedValueOnce(new Error('[429] quota exceeded (groq secret stuff)'))
      .mockRejectedValueOnce(new Error('[429] quota exceeded (openrouter secret stuff)'));
    const outcome = await runInvestigation(undefined);
    expect(outcome.ok).toBe(false);
    expect(JSON.stringify(outcome)).not.toMatch(/secret stuff|gemini|groq|openrouter/i);
  });

  it('treats a timeout the same as a quota error for failover purposes', async () => {
    invokeMock.mockRejectedValueOnce(new Error('ETIMEDOUT')).mockResolvedValueOnce(okAgentResponse());
    const outcome = await runInvestigation(undefined);
    expect(outcome.ok).toBe(true);
    expect(invokeMock).toHaveBeenCalledTimes(2);
  });

  it('fails over when a provider returns malformed structured output, not just on a thrown error', async () => {
    invokeMock.mockResolvedValueOnce({ messages: [], structuredResponse: undefined }).mockResolvedValueOnce(okAgentResponse());
    const outcome = await runInvestigation(undefined);
    expect(outcome.ok).toBe(true);
    expect(invokeMock).toHaveBeenCalledTimes(2);
  });
});

describe('provider cooldown', () => {
  it('a provider that just failed is skipped on the next investigation within the cooldown window', async () => {
    invokeMock.mockRejectedValueOnce(new Error('[429] quota exceeded')).mockResolvedValueOnce(okAgentResponse());

    const first = await runInvestigation(undefined);
    expect(first.ok).toBe(true);
    expect(invokeMock).toHaveBeenCalledTimes(2); // gemini failed, groq succeeded

    invokeMock.mockResolvedValueOnce(okAgentResponse());
    const second = await runInvestigation(undefined);
    expect(second.ok).toBe(true);
    // Gemini is on cooldown from the first call, so the second investigation should go straight
    // to groq (1 more invoke call), not retry gemini first.
    expect(invokeMock).toHaveBeenCalledTimes(3);
  });

  it('a provider recovers (comes off cooldown) after clearCooldown is called', () => {
    putOnCooldown('gemini');
    expect(getAvailableProviders().map((p) => p.name)).not.toContain('gemini');

    clearCooldown('gemini');
    expect(getAvailableProviders().map((p) => p.name)).toContain('gemini');
  });
});

describe('getProviderStatuses', () => {
  it('reports NOT_CONFIGURED, WORKING or QUOTA_LIMITED per provider without exposing errors', () => {
    putOnCooldown('groq');
    const statuses = getProviderStatuses();
    expect(statuses.gemini).toBe('WORKING');
    expect(statuses.groq).toBe('QUOTA_LIMITED');
    expect(statuses.openrouter).toBe('WORKING');
  });
});

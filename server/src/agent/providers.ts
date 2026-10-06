/**
 * LLM provider failover for the Operations Intelligence Agent (admin and public). Three
 * providers only, all free-tier: Gemini, Groq, OpenRouter (free model). Order is fixed
 * (Gemini -> Groq -> OpenRouter) because that's the order they're listed in the project's own
 * requirements - don't reorder without a reason. A provider that fails (429/quota/5xx/timeout/
 * network/model error) is skipped for the rest of THIS request and put into a short cooldown so
 * a repeatedly-failing provider doesn't get retried on every subsequent investigation either
 * (bounded failover, no retry storm). If every provider fails or none are configured, the
 * caller gets a single generic "unavailable" outcome - provider names and raw errors are never
 * returned to the client, only logged server-side.
 */
import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import type { LanguageModelLike } from '@langchain/core/language_models/base';
import { env } from '../config/env';

export type ProviderName = 'gemini' | 'groq' | 'openrouter';
export type ProviderStatus = 'WORKING' | 'QUOTA_LIMITED' | 'FAILED' | 'NOT_CONFIGURED';

interface ProviderDef {
  name: ProviderName;
  configured: boolean;
  build: () => LanguageModelLike;
}

/** How long a provider that just failed is skipped for subsequent investigations. */
const COOLDOWN_MS = 60_000;

const cooldownUntil = new Map<ProviderName, number>();

function isOnCooldown(name: ProviderName): boolean {
  const until = cooldownUntil.get(name);
  return until !== undefined && Date.now() < until;
}

function putOnCooldown(name: ProviderName) {
  cooldownUntil.set(name, Date.now() + COOLDOWN_MS);
}

/** Called after a provider call succeeds, so a previously-failing provider recovers immediately. */
export function clearCooldown(name: ProviderName) {
  cooldownUntil.delete(name);
}

function buildProviderDefs(): ProviderDef[] {
  return [
    {
      name: 'gemini',
      configured: env.hasGemini,
      build: () =>
        new ChatGoogleGenerativeAI({
          apiKey: process.env.GEMINI_API_KEY,
          // Google retires dated Flash ids on a rolling basis; a 404 naming a newer id here is
          // an upstream deprecation, not a bug in this code - update to match.
          model: 'gemini-3.8-flash',
          temperature: 0.1,
        }),
    },
    {
      name: 'groq',
      configured: env.hasGroq,
      build: () =>
        new ChatGroq({
          apiKey: process.env.GROQ_API_KEY,
          // Groq rotates which models are served on the free tier; this id was confirmed live
          // against this account's /v1/models list. If it 404s later, check that list again.
          model: 'openai/gpt-oss-120b',
          temperature: 0.1,
        }),
    },
    {
      name: 'openrouter',
      configured: env.hasOpenRouter,
      build: () =>
        new ChatOpenAI({
          apiKey: process.env.OPENROUTER_API_KEY,
          model: env.openRouterModel,
          temperature: 0.1,
          configuration: { baseURL: 'https://openrouter.ai/api/v1' },
        }),
    },
  ];
}

/** Providers configured and not currently in cooldown, in fixed priority order. */
export function getAvailableProviders(): ProviderDef[] {
  return buildProviderDefs().filter((p) => p.configured && !isOnCooldown(p.name));
}

export function isQuotaOrTransientError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /429|quota|rate.?limit|5\d\d|timeout|ETIMEDOUT|ECONNRESET|ENOTFOUND|fetch failed/i.test(message);
}

/** Reports each provider's configuration/cooldown state - used only for internal diagnostics, never returned to a client. */
export function getProviderStatuses(): Record<ProviderName, ProviderStatus> {
  const statuses = {} as Record<ProviderName, ProviderStatus>;
  for (const def of buildProviderDefs()) {
    if (!def.configured) statuses[def.name] = 'NOT_CONFIGURED';
    else if (isOnCooldown(def.name)) statuses[def.name] = 'QUOTA_LIMITED';
    else statuses[def.name] = 'WORKING';
  }
  return statuses;
}

export { putOnCooldown };

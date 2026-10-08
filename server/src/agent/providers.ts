/**
 * LLM provider failover for the Operations Intelligence Agent (admin and public). Four
 * providers, all free-tier/low-cost: Requesty, Groq, OpenRouter, Gemini. Order is fixed
 * (Requesty -> Groq -> OpenRouter -> Gemini) because that's the priority the project's own
 * requirements specify - don't reorder without a reason. A provider that fails (429/quota/5xx/
 * timeout/network/model error) is skipped for the rest of THIS request and put into a short
 * cooldown so a repeatedly-failing provider doesn't get retried on every subsequent
 * investigation either (bounded failover, no retry storm). If every provider fails or none are
 * configured, the caller gets a single generic "unavailable" outcome - provider names and raw
 * errors are never returned to the client, only logged server-side.
 *
 * Requesty is OpenAI-compatible (same pattern as OpenRouter below): a plain ChatOpenAI client
 * pointed at Requesty's router base URL, no separate SDK needed.
 *
 * PERFORMANCE: every client below sets a `timeout` (ms) constructor option, so a single slow/
 * hanging HTTP call to a provider cannot block the request indefinitely - see agent.ts's
 * `INVESTIGATION_TIMEOUT_MS` for the additional whole-run wall-clock cap (belt and suspenders:
 * the per-call timeout bounds one model/tool round trip, the whole-run timeout bounds the
 * entire multi-step ReAct loop in case many slow-but-not-quite-timed-out calls add up).
 */
import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import type { LanguageModelLike } from '@langchain/core/language_models/base';
import { env } from '../config/env';

export type ProviderName = 'requesty' | 'groq' | 'openrouter' | 'gemini';
export type ProviderStatus = 'WORKING' | 'QUOTA_LIMITED' | 'FAILED' | 'NOT_CONFIGURED';

/** Per-provider/model HTTP attempt timeout. One hanging call fails fast and hands off to the
 * next model/provider instead of stalling the whole investigation. */
export const PROVIDER_CALL_TIMEOUT_MS = 8_000;

/**
 * Requesty model fallback list - the ONE configurable location for model priority. Requesty
 * model ids are individually approved per API key (see providers below); when the current
 * model 400s/404s ("invalid model ID" / "not approved"), the next one in this list is tried
 * instead, up to REQUESTY_MAX_MODEL_ATTEMPTS total - never all of them, and never on a 401/402/
 * 403 (those disable Requesty entirely for this request, see buildRequestyAttempts below). This
 * exact order (and no other model) was specified explicitly - don't add/reorder without asking.
 */
export const REQUESTY_MODEL_PRIORITY = [
  'nvidia/nemotron-3-super-120b-a12b',
  'google/gemma-4-31b-it',
  'nvidia/nemotron-3.5-lightning-30b-a3b',
  'novita/ling-3.1-flash',
  'mistral/leanstral-1-5',
  'nvidia/muse-glimmer-30b',
  'novita/inclusionai/ling-3.0-tiny',
] as const;

/** Hard cap on how many different Requesty models are tried in a single investigation - never
 * all 13, so a string of model-level 400/404s cannot itself become a slow path. */
export const REQUESTY_MAX_MODEL_ATTEMPTS = 2;

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

function buildRequestyModel(model: string): LanguageModelLike {
  return new ChatOpenAI({
    apiKey: process.env.REQUESTY_API_KEY?.trim(),
    model,
    temperature: 0.1,
    timeout: PROVIDER_CALL_TIMEOUT_MS,
    maxRetries: 0, // no hidden SDK-level retries - one attempt per model, failover handles the rest
    configuration: { baseURL: 'https://router.requesty.ai/v1' },
  });
}

function buildProviderDefs(): ProviderDef[] {
  return [
    {
      name: 'requesty',
      // REQUESTY_ENABLED=false (or no key) means Requesty is never constructed or called at
      // all - see env.ts's hasRequesty, which already folds REQUESTY_ENABLED into this flag.
      configured: env.hasRequesty,
      // This default build() is only used by getProviderStatuses()'s diagnostics; the real
      // call path always goes through agent.ts's runRequestyWithModelFallback, which builds
      // each REQUESTY_MODEL_PRIORITY entry itself via buildRequestyModel directly.
      build: () => buildRequestyModel(REQUESTY_MODEL_PRIORITY[0]),
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
          timeout: PROVIDER_CALL_TIMEOUT_MS,
          maxRetries: 0,
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
          timeout: PROVIDER_CALL_TIMEOUT_MS,
          maxRetries: 0,
          configuration: { baseURL: 'https://openrouter.ai/api/v1' },
        }),
    },
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
          maxRetries: 0,
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

/**
 * Classifies a Requesty error so agent.ts's Requesty-specific attempt loop knows whether to try
 * the next model (model-level problem) or give up on Requesty entirely for this request
 * (account-level problem) - see the file header and agent.ts's `runRequestyWithModelFallback`.
 *
 * - 401/402/403 (auth/billing/approval): the ACCOUNT is the problem, not the model. Disable
 *   Requesty entirely and fail over to the next provider immediately - trying a different model
 *   would just reproduce the same account-level error.
 * - 400/404 ("invalid model ID" / model not found / not approved for this key): the MODEL is
 *   the problem. Try the next model in REQUESTY_MODEL_PRIORITY.
 * - 429/5xx/timeout/network: transient. Do not retry the same model; fail over to the next
 *   provider immediately (per-request budget is too tight to also try every other model).
 */
export function classifyRequestyError(err: unknown): 'account' | 'model' | 'transient' {
  const message = err instanceof Error ? err.message : String(err);
  if (/\b(401|402|403)\b/.test(message)) return 'account';
  if (/\b(400|404)\b/.test(message) || /invalid model|model not found|not approved/i.test(message)) return 'model';
  return 'transient';
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

export { putOnCooldown, buildRequestyModel };

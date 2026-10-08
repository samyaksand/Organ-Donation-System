/**
 * Operations Intelligence Agent: a read-only LangGraph ReAct loop (model <-> tools <-> model)
 * over a Zod-validated, deterministic tool surface (agent/tools.ts for the admin investigation,
 * agent/publicTools.ts for the public one). The LLM interprets OrganFlow's own computed
 * figures; it never computes a KPI itself, never writes to the database, and never receives raw
 * SQL or a connection string - see agent/tools.service.ts for the full boundary of what it can
 * read.
 *
 * Model/provider: three free-tier providers with bounded failover (agent/providers.ts) - Gemini,
 * Groq, OpenRouter, in that fixed order. All three use official/standard LangChain chat-model
 * adapters (@langchain/google-genai, @langchain/groq, @langchain/openai against OpenRouter's
 * OpenAI-compatible endpoint), so no custom tool-calling protocol glue is needed for any of
 * them. Orchestration: LangGraph's prebuilt `createReactAgent` - this already *is* the smallest
 * architecture that fits a "call tools until you have enough evidence, then answer" loop; a
 * hand-built StateGraph would only re-implement what this prebuilt already provides (step limit
 * via recursionLimit, message history, tool-call dispatch). A separate Python/FastAPI service
 * was considered and rejected: it would add a second runtime, deployment target and auth
 * boundary to keep in sync for read-only endpoints the existing Express/TypeScript stack can
 * host directly.
 */
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import type { LanguageModelLike } from '@langchain/core/language_models/base';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { investigationResultSchema } from '../schemas/agent.schema';
import { ADMIN_TOOLS } from './tools';
import {
  buildRequestyModel,
  classifyRequestyError,
  clearCooldown,
  getAvailableProviders,
  isQuotaOrTransientError,
  putOnCooldown,
  REQUESTY_MAX_MODEL_ATTEMPTS,
  REQUESTY_MODEL_PRIORITY,
  type ProviderName,
} from './providers';

/**
 * Hard cap on model<->tool round-trips per investigation, independent of any token budget.
 * Public investigation uses a tighter cap (see runPublicInvestigation): a public aggregate
 * question never needs more than a handful of tool calls, and a smaller step budget bounds the
 * worst case even if every per-call timeout is hit.
 */
const MAX_STEPS_ADMIN = 12;
const MAX_STEPS_PUBLIC = 6;

/**
 * Whole-run wall-clock cap, independent of any per-provider-call timeout. Bounds the entire
 * "try every available provider" loop (agent/providers.ts's PROVIDER_CALL_TIMEOUT_MS bounds one
 * HTTP call; this bounds the sum of all of them plus every LangGraph step across every
 * provider/model attempt) so a request can never hang for minutes even if several slow-but-not-
 * quite-timed-out calls add up. Hit this and the caller gets the normal "unavailable" outcome,
 * never a raw timeout error.
 */
const INVESTIGATION_TIMEOUT_MS = 15_000;

const ADMIN_SYSTEM_PROMPT = `You are the Operations Intelligence Agent for OrganFlow, an organ donation registry's internal admin system.

You investigate OPERATIONAL questions about the registry's own recorded data: donor registrations, organ availability, hospital activity, withdrawal requests, and hospital organ requests. You are NOT a general assistant and you have no knowledge of, or opinions about, anything outside the tools available to you.

Your method, always:
1. DETECT a signal worth investigating (from the question, or from getThresholdBreaches / getOverviewMetrics for an open-ended "analyze operations" request).
2. INVESTIGATE by calling the specific tools that narrow down WHERE and WHY - call only the tools relevant to the question, not every tool.
3. GATHER EVIDENCE: every number in your findings must come from a tool result. Call tools until you have enough evidence to support a conclusion, or until you can state plainly that the evidence is insufficient.
4. EXPLAIN: separate FACTS (verbatim from tool results) from your INTERPRETATION (your reasoning connecting them). Never phrase your own interpretation as if it were a database fact.
5. PRIORITIZE findings by severity (high/medium/low/info) based on the deterministic thresholds OrganFlow already defines (see getThresholdBreaches) and the numbers you gathered - do not invent a confidence score or a new threshold of your own.
6. RECOMMEND a human action. You never take any action yourself: you cannot approve, decline, or modify anything. Every recommendation is something an administrator must do.

Hard rules:
- Never invent a number. If you did not get it from a tool result, do not state it as fact.
- If the available tools do not provide enough evidence to answer the question, say so explicitly in your summary and set insufficientEvidence to true, with zero or only low-confidence findings. Do not guess.
- Keep findings concrete and specific (name the hospital, the count, the threshold), not generic advice.
- "evidence" on each finding should list the tool names whose results back it up.
- Never mention your own tool names, the model/provider you run on, or any internal implementation detail in the summary, interpretation or recommendation text - those fields are read by end users.`;

export const PUBLIC_SYSTEM_PROMPT = `You are the public Operations Intelligence Agent for OrganFlow, an organ donation registry demo platform. You answer PUBLIC operational questions about organ availability, organ types, hospitals, and availability trends - aggregate, non-identifying information only.

You have NO access to donor identity, medical information, individual donor/withdrawal/organ-request records, or any administrative data. If a question asks for any of that, say plainly in your summary that this information is not available to the public investigation tool, and set insufficientEvidence to true with no findings. Do not guess or approximate private data from public figures.

Your method, always:
1. DETECT the operational question being asked about availability, hospitals, organ types, or trends.
2. INVESTIGATE using only the tools available to you. Call the SMALLEST number of tools that answers the question - most questions need exactly one tool call. Never call a tool you already have the answer from, and never call the same tool twice in one investigation.
3. GATHER EVIDENCE: every number in your findings must come from a tool result.
4. EXPLAIN: separate FACTS (verbatim from tool results) from your INTERPRETATION. Never phrase interpretation as fact.
5. PRIORITIZE findings by severity (high/medium/low/info).
6. RECOMMEND what a visitor might explore next on the public site (e.g. "view the hospital network", "explore organ availability") - never a clinical, medical or administrative action, since this is a demo platform with simulated data, not a real registry.

Hard rules:
- Never invent a number. If you did not get it from a tool result, do not state it as fact.
- Never mention your own tool names, the model/provider you run on, or any internal implementation detail.
- This is simulated/demo data for a database-systems course project, not a real national registry - never imply otherwise.
- Answer as soon as you have enough evidence. Do not keep calling tools "for completeness" once the question is answered.`;

/** Appended to the admin system prompt only when the AI Security Gateway has authorized a
 * security-analysis investigation and the security tools are attached - see agent/securityTools.ts. */
const SECURITY_ANALYSIS_ADDENDUM = `You have ALSO been authorized to analyze OrganFlow's own security/access-control metrics for this request, using the additional security tools available to you (getSecurityOverview, getAccessDecisionMetrics, getDeniedAccessEvents, getPolicyViolations, getSecurityTrends, getSecurityEventHistory, getAiSecurityEvents).

You may: explain access-control decisions, identify patterns or repeated violations, compare trends, and summarize blocked/allowed AI requests - always citing the specific tool results as facts.

You may NEVER: grant or revoke access, change a role, modify a security policy, approve or decline any workflow, modify any record, or expose a specific donor's identity or medical information (security tools never return that; they return decision metadata only). State plainly in your summary: "AI provides analysis and explanation only. OrganFlow's security policies enforce access."`;

export type AgentUnavailableReason = 'NO_PROVIDER' | 'MALFORMED_OUTPUT' | 'AGENT_ERROR';

interface RunOptions {
  question: string | undefined;
  tools: StructuredToolInterface[];
  systemPrompt: string;
  /** Prefixes the user message for the open-ended (no-question) case. */
  defaultTask: string;
  maxSteps: number;
}

async function runOnce(
  providerName: ProviderName,
  buildModel: () => LanguageModelLike,
  opts: RunOptions,
  signal: AbortSignal,
) {
  const agent = createReactAgent({
    llm: buildModel(),
    tools: opts.tools,
    prompt: opts.systemPrompt,
    responseFormat: investigationResultSchema,
  });

  const userMessage = opts.question ? `Investigate: ${opts.question}` : opts.defaultTask;

  const result = await agent.invoke(
    { messages: [{ role: 'user', content: userMessage }] },
    { recursionLimit: opts.maxSteps * 2, signal }, // each step is a model call + a tool call
  );

  const toolsUsed = new Set<string>();
  for (const message of result.messages) {
    const toolCalls = (message as { tool_calls?: Array<{ name: string }> }).tool_calls;
    if (toolCalls) for (const call of toolCalls) toolsUsed.add(call.name);
  }

  const structured = result.structuredResponse as z.infer<typeof investigationResultSchema> | undefined;
  if (!structured) return { ok: false as const, reason: 'MALFORMED_OUTPUT' as const };

  const parsed = investigationResultSchema.safeParse({
    ...structured,
    toolsUsed: structured.toolsUsed?.length ? structured.toolsUsed : [...toolsUsed],
  });
  if (!parsed.success) return { ok: false as const, reason: 'MALFORMED_OUTPUT' as const };

  clearCooldown(providerName);
  return { ok: true as const, result: parsed.data, generatedAt: new Date().toISOString() };
}

/**
 * Requesty-specific attempt loop: tries up to REQUESTY_MAX_MODEL_ATTEMPTS models from
 * REQUESTY_MODEL_PRIORITY, in that exact fixed order, moving to the next model only on a
 * model-level error (400/404 - wrong/unapproved model id). An account-level error (401/402/403)
 * or anything transient stops this
 * loop immediately rather than burning the rest of the attempt budget - see
 * providers.ts's classifyRequestyError for the three-way split this depends on.
 */
async function runRequestyWithModelFallback(opts: RunOptions, signal: AbortSignal) {
  const tried = new Set<string>();
  let lastError: unknown;

  for (let attempt = 0; attempt < REQUESTY_MAX_MODEL_ATTEMPTS; attempt++) {
    const model = REQUESTY_MODEL_PRIORITY.find((m) => !tried.has(m)) ?? REQUESTY_MODEL_PRIORITY[0]!;
    tried.add(model);

    try {
      const outcome = await runOnce('requesty', () => buildRequestyModel(model), opts, signal);
      if (outcome.ok) return outcome;
      lastError = new Error('MALFORMED_OUTPUT');
      break; // malformed structured output is not a model-id problem; don't keep trying models
    } catch (err) {
      lastError = err;
      const kind = classifyRequestyError(err);
      if (kind !== 'model') break; // account-level or transient: stop trying Requesty models
      // kind === 'model': loop continues and tries the next model, up to the attempt cap.
    }
  }

  if (lastError instanceof Error && lastError.message === 'MALFORMED_OUTPUT') {
    return { ok: false as const, reason: 'MALFORMED_OUTPUT' as const };
  }
  throw lastError;
}

/**
 * Runs one investigation, trying each configured/available provider in order until one
 * succeeds, with a whole-run wall-clock timeout (INVESTIGATION_TIMEOUT_MS) wrapping the entire
 * attempt sequence - no provider, however many models it tries, can make a request hang for
 * minutes. A provider failure that looks like a quota/rate-limit/transient error (429/5xx/
 * timeout/network) puts that provider on a short cooldown and moves to the next one; any other
 * error is treated the same way for this phase (fail over, don't retry the same provider) since
 * there is no case where blindly retrying the same provider immediately would help. If every
 * available provider fails, or none are configured, returns a single generic failure - never a
 * provider name or raw error message.
 */
async function run(opts: RunOptions) {
  const providers = getAvailableProviders();
  if (providers.length === 0) {
    return { ok: false as const, reason: 'NO_PROVIDER' as AgentUnavailableReason };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('INVESTIGATION_TIMEOUT')), INVESTIGATION_TIMEOUT_MS);

  try {
    let lastReason: AgentUnavailableReason = 'NO_PROVIDER';
    for (const provider of providers) {
      if (controller.signal.aborted) break; // whole-run budget exhausted - stop trying further providers
      try {
        const outcome =
          provider.name === 'requesty'
            ? await runRequestyWithModelFallback(opts, controller.signal)
            : await runOnce(provider.name, provider.build, opts, controller.signal);
        if (outcome.ok) return outcome;
        // Malformed structured output from a model that otherwise responded is still worth
        // failing over on - a different provider may follow the schema correctly.
        lastReason = outcome.reason;
        putOnCooldown(provider.name);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[agent] provider "${provider.name}" failed:`, message);
        // No hidden retry of the same provider/model here regardless of error shape - bounded
        // failover only. isQuotaOrTransientError is kept for clarity/future branching even
        // though both arms currently cool down; see git history if that ever needs to diverge.
        if (isQuotaOrTransientError(err)) putOnCooldown(provider.name);
        else putOnCooldown(provider.name);
        lastReason = 'AGENT_ERROR';
      }
    }

    return { ok: false as const, reason: lastReason };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Admin investigation. `question` is a free-text operational question, or undefined for the
 * general "analyze current operations" mode. Returns either a validated InvestigationResult or
 * a structured failure the controller maps to an HTTP error - never throws for an expected
 * failure mode (no provider available, malformed model output, provider error).
 */
export async function runInvestigation(question: string | undefined, extraTools: StructuredToolInterface[] = []) {
  return run({
    question,
    // extraTools is only ever SECURITY_TOOLS, and only when the AI Security Gateway has
    // already classified this request as AUTHORIZED_SECURITY_ANALYSIS for an admin actor - see
    // services/agent.service.ts. ADMIN_TOOLS itself never changes based on the request.
    tools: [...ADMIN_TOOLS, ...extraTools],
    systemPrompt: extraTools.length > 0 ? `${ADMIN_SYSTEM_PROMPT}\n\n${SECURITY_ANALYSIS_ADDENDUM}` : ADMIN_SYSTEM_PROMPT,
    defaultTask:
      'Analyze current operations. Proactively inspect the relevant metrics and return a prioritized operational assessment of the most significant issues right now, if any.',
    maxSteps: MAX_STEPS_ADMIN,
  });
}

/** Public investigation - see agent/publicTools.ts for the restricted toolset this uses. A
 * tighter step budget (MAX_STEPS_PUBLIC) than admin: public aggregate questions never need more
 * than a handful of tool calls, so this also bounds the worst-case latency. */
export async function runPublicInvestigation(question: string | undefined, tools: StructuredToolInterface[]) {
  return run({
    question,
    tools,
    systemPrompt: PUBLIC_SYSTEM_PROMPT,
    defaultTask: 'Summarize the current state of organ availability across the network: which organ types and hospitals have availability, and where it is concentrated.',
    maxSteps: MAX_STEPS_PUBLIC,
  });
}

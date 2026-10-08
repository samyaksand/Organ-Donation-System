/**
 * AI Security Gateway: classifies every investigation request BEFORE any LangGraph/LLM/
 * provider call is made, using deterministic, server-side pattern checks - never an LLM call
 * itself for the classification step, so a BLOCK decision never costs a provider request and
 * can never be bypassed by prompt-engineering the model being gated. See CLAUDE.md-style header
 * comments across this security/ folder for the overall flow:
 *
 *   Prompt -> AI Security Gateway -> Policy evaluation -> ALLOW/BLOCK -> authorized LangGraph
 *   tools -> read-only AI analysis -> safe response + audit event
 *
 * `classifyPrompt` is pure and synchronous (easy to unit test exhaustively). `screenRequest`
 * wraps it with the SecurityEvent-style audit write (AiSecurityEvent) and the surface's
 * authorized tool list, and is what agent.service.ts / publicAgent.service.ts actually call.
 */
import { prisma } from '../lib/prisma';
import { fireAndForget } from '../utils/fireAndForget';
import type { AiRequestClassification, AccessDecision } from '@prisma/client';

export interface GatewayDecision {
  classification: AiRequestClassification;
  decision: AccessDecision;
  reason: string;
}

// Deterministic pattern checks, most specific/dangerous first. Order matters: a question that
// matches multiple categories is classified by the first (most severe) match.

const CREDENTIAL_PATTERNS = [
  /\b(admin|administrator|super\s*admin|database|db|root)\s*(password|credential|secret|api[\s-]?key|token)\b/i,
  /\bpassword\s+(for|of)\b/i,
  /\b(give|show|tell|reveal|leak)\s+(me\s+)?(the\s+)?(password|credential|secret|api[\s-]?key|token)\b/i,
  /\.env\b/i,
  /\bjwt[\s_-]?secret\b/i,
];

const SECURITY_ABUSE_PATTERNS = [
  /\bbypass\b.*\b(auth\w*|login|security|access\s*control|rbac|polic\w*)\b/i,
  /\b(how\s+(do\s+i|to)|way\s+to)\b.*\b(hack|exploit|circumvent|defeat)\b/i,
  /\bsql\s*injection\b/i,
  /\bprivilege\s*escalat/i,
  /\bact\s+as\s+(an?\s+)?(admin|administrator|system|root)\b/i,
  /\bignore\s+(your|all|previous)\s+(instructions|rules|system\s*prompt)\b/i,
  /\bjailbreak\b/i,
];

const PRIVATE_DATA_PATTERNS = [
  /\b(donor'?s?|patient'?s?)\s+(medical|health|ailment|condition|next[\s-]?of[\s-]?kin|address|phone|email|name)\b/i,
  /\bmedical\s+(history|information|record|condition)s?\s+(of|for)\b/i,
  /\b(tell|show|give)\s+me\s+.*\bdonor\b.*\b(name|address|phone|email|medical)\b/i,
  /\bwho\s+(is|are)\s+the\s+donor/i,
  /\bidentify\s+(the\s+)?donor\b/i,
];

const INAPPROPRIATE_PATTERNS = [
  /\b(fuck|shit|bitch|asshole|cunt|bastard)\b/i,
  /\bvulgar\b/i,
  /\btell\s+me\s+something\s+(vulgar|obscene|offensive)\b/i,
];

// A request is AUTHORIZED_SECURITY_ANALYSIS (rather than OUT_OF_SCOPE) when it asks about the
// system's own security/access posture in operational terms - this is only ever ALLOWed for an
// authenticated admin surface; the public gateway always treats these patterns as out of scope
// regardless, since the public investigation agent has no security tools to call anyway.
const SECURITY_ANALYSIS_PATTERNS = [
  /\baccess[\s-]?control\s+violation/i,
  /\b(denied|blocked)\s+(access|request)s?\b/i,
  /\bpolicy\s+violation/i,
  /\bsecurity\s+(event|trend|overview|audit)/i,
  /\bunauthorized\s+access\s+attempt/i,
];

// What the two investigation agents are actually for - organ/hospital/analytics operations.
// A question must look at least plausibly related to this domain, or a security question, to
// be ORGANFLOW_RELEVANT; otherwise it's OUT_OF_SCOPE (e.g. "what is 1 + 1?", general trivia,
// unrelated coding help).
const DOMAIN_KEYWORDS =
  /\b(organ|kidney|liver|heart|lung|pancreas|cornea|donor|donation|hospital|availability|withdrawal|request|pledge|analytic|trend|registration|operation|registry|bottleneck|threshold)\w*\b/i;

function matchesAny(patterns: RegExp[], text: string): boolean {
  return patterns.some((p) => p.test(text));
}

/**
 * Pure classification function - no I/O, fully deterministic, exhaustively unit-testable.
 * `allowSecurityAnalysis` is true only for the admin investigation surface (an authenticated
 * admin asking about the system's own security posture); the public surface never allows it
 * since the public toolset has no security tools at all.
 */
export function classifyPrompt(question: string | undefined, allowSecurityAnalysis: boolean): GatewayDecision {
  const text = (question ?? '').trim();

  // No question at all = the "analyze current operations" default task, which is always
  // in-scope (it only ever calls the surface's own authorized analytics tools).
  if (text.length === 0) {
    return { classification: 'ORGANFLOW_RELEVANT', decision: 'ALLOW', reason: 'Default operational analysis task - no free-text question to screen.' };
  }

  if (matchesAny(CREDENTIAL_PATTERNS, text)) {
    return { classification: 'CREDENTIAL_REQUEST', decision: 'DENY', reason: 'The question asks for a credential, secret or API key. The AI agent has no access to credentials and such requests are always blocked before any provider call.' };
  }

  if (matchesAny(SECURITY_ABUSE_PATTERNS, text)) {
    return { classification: 'SECURITY_ABUSE', decision: 'DENY', reason: 'The question attempts to bypass, exploit, or manipulate the system’s security or the AI agent’s own instructions. Blocked before any provider call.' };
  }

  if (matchesAny(INAPPROPRIATE_PATTERNS, text)) {
    return { classification: 'INAPPROPRIATE_CONTENT', decision: 'DENY', reason: 'The question contains inappropriate content unrelated to OrganFlow operations. Blocked before any provider call.' };
  }

  if (matchesAny(PRIVATE_DATA_PATTERNS, text)) {
    return { classification: 'PRIVATE_DATA_REQUEST', decision: 'DENY', reason: 'The question asks for an individual donor’s identity or medical/contact information, which the investigation agent can never access or disclose. Blocked before any provider call.' };
  }

  if (matchesAny(SECURITY_ANALYSIS_PATTERNS, text)) {
    if (allowSecurityAnalysis) {
      return { classification: 'AUTHORIZED_SECURITY_ANALYSIS', decision: 'ALLOW', reason: 'An authorized administrator may ask the investigation agent to analyze the system’s own security/access-control metrics using read-only security tools.' };
    }
    return { classification: 'OUT_OF_SCOPE', decision: 'DENY', reason: 'Security-event analysis requires an authenticated administrator; this surface cannot run that investigation.' };
  }

  if (DOMAIN_KEYWORDS.test(text)) {
    return { classification: 'ORGANFLOW_RELEVANT', decision: 'ALLOW', reason: 'The question concerns OrganFlow’s own operational data (organs, hospitals, donors, requests, analytics).' };
  }

  return { classification: 'OUT_OF_SCOPE', decision: 'DENY', reason: 'The question is not related to OrganFlow’s organ-donation operations, hospitals, or analytics. The investigation agent only answers questions in that domain.' };
}

export interface ScreenRequestInput {
  question: string | undefined;
  actorUserId: string | null;
  actorRole: 'PUBLIC' | 'DONOR' | 'ADMIN' | 'SUPER_ADMIN';
  surface: 'admin' | 'public';
  /** The tool names this surface would authorize if ALLOWed - recorded for traceability even on a BLOCK (where it is empty). */
  authorizedTools: string[];
}

/**
 * Runs the gateway and records an AiSecurityEvent audit row. Always called before
 * runInvestigation/runPublicInvestigation - a BLOCK decision here means the caller must return
 * a safe explanation WITHOUT ever constructing a LangGraph agent or calling a provider.
 */
export async function screenRequest(input: ScreenRequestInput): Promise<GatewayDecision> {
  const allowSecurityAnalysis = input.surface === 'admin' && (input.actorRole === 'ADMIN' || input.actorRole === 'SUPER_ADMIN');
  const decision = classifyPrompt(input.question, allowSecurityAnalysis);

  fireAndForget(
    () =>
      prisma.aiSecurityEvent.create({
        data: {
          actorUserId: input.actorUserId,
          actorRole: input.actorRole,
          surface: input.surface,
          classification: decision.classification,
          decision: decision.decision,
          reason: decision.reason,
          // Truncated excerpt only, for operator troubleshooting - never the full prompt.
          questionExcerpt: input.question ? input.question.slice(0, 160) : null,
          toolsAuthorized: decision.decision === 'ALLOW' ? input.authorizedTools : [],
        },
      }),
    (err) => console.error('[security] failed to record AiSecurityEvent:', err instanceof Error ? err.message : err),
  );

  return decision;
}

import { z } from 'zod';
import { ANALYTICS_WINDOWS } from './analytics.schema';
import { ORGAN_REQUEST_STATUSES, WITHDRAWAL_STATUSES } from './common';

/**
 * A FACTORY, not a shared constant: `.regex(...)` must be called fresh at each use site. Zod's
 * JSON Schema conversion (used by @langchain/google-genai to build Gemini's tool/response
 * schemas) de-dupes by object identity and represents a second use of the *same* schema
 * instance as a JSON Schema `$ref` - which Gemini's function-calling/structured-output API
 * rejects outright ("Unknown name \"$ref\"..."). Every schema below that needs more than one
 * date-only field (e.g. `from`/`to`) calls this twice rather than reusing one instance.
 */
const dateOnly = () => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD');

/** POST /api/v1/agent/investigate body. */
export const investigateRequestSchema = z
  .object({
    /** Free-text operational question, or omitted for a general "analyze current operations" run. */
    question: z.string().trim().min(1).max(500).optional(),
  })
  .strict();
export type InvestigateRequestInput = z.infer<typeof investigateRequestSchema>;

// ---------------------------------------------------------------------------
// Tool input schemas. Every tool the agent can call validates its own arguments with one of
// these before touching the database - the LLM cannot bypass validation by constructing an
// unexpected payload, since the tool function itself rejects it.
// ---------------------------------------------------------------------------

// NOTE: every tool input schema below is a flat, independent `z.object({...}).strict()` (no
// `.extend()`/`.merge()` sharing a base object), and every field calls `dateOnly()` fresh rather
// than reusing one instance across `from`/`to` - see the comment on `dateOnly` above for why
// instance reuse specifically is what triggers Gemini's "$ref" rejection.

export const periodToolInput = z
  .object({
    window: z.enum(ANALYTICS_WINDOWS).optional(),
    from: dateOnly().optional(),
    to: dateOnly().optional(),
  })
  .strict();
export type PeriodToolInput = z.infer<typeof periodToolInput>;

export const hospitalPerformanceToolInput = z
  .object({
    hospitalId: z.string().min(1).max(64),
    window: z.enum(ANALYTICS_WINDOWS).optional(),
    from: dateOnly().optional(),
    to: dateOnly().optional(),
  })
  .strict();
export type HospitalPerformanceToolInput = z.infer<typeof hospitalPerformanceToolInput>;

export const pendingRequestsToolInput = z
  .object({
    type: z.enum(['ORGAN_REQUEST', 'WITHDRAWAL']),
    status: z.enum([...ORGAN_REQUEST_STATUSES, ...WITHDRAWAL_STATUSES]).optional(),
    hospitalId: z.string().min(1).max(64).optional(),
    limit: z.coerce.number().int().min(1).max(20).default(10),
  })
  .strict();
export type PendingRequestsToolInput = z.infer<typeof pendingRequestsToolInput>;

export const trendsToolInput = z
  .object({
    metric: z.enum(['donorRegistrations', 'organRegistrations', 'withdrawalRequests', 'organRequests']),
    granularity: z.enum(['day', 'week', 'month']).optional(),
    window: z.enum(ANALYTICS_WINDOWS).optional(),
    from: dateOnly().optional(),
    to: dateOnly().optional(),
  })
  .strict();
export type TrendsToolInput = z.infer<typeof trendsToolInput>;

export const comparePeriodsToolInput = z
  .object({
    metric: z.enum(['donorRegistrations', 'organRequestVolume', 'withdrawalVolume']),
    currentWindow: z.enum(ANALYTICS_WINDOWS).default('30d'),
  })
  .strict();
export type ComparePeriodsToolInput = z.infer<typeof comparePeriodsToolInput>;

export const workflowHistoryToolInput = z
  .object({
    entityType: z.enum(['DONOR', 'ORGAN', 'WITHDRAWAL_REQUEST', 'ORGAN_REQUEST']),
    entityId: z.string().min(1).max(64),
  })
  .strict();
export type WorkflowHistoryToolInput = z.infer<typeof workflowHistoryToolInput>;

// ---------------------------------------------------------------------------
// Output contract - the structured final answer the agent must produce. Findings separate
// FACTS (deterministic tool results) from INTERPRETATION (agent reasoning) and RECOMMENDATION
// (suggested human action); the agent is never allowed to present interpretation as fact.
// ---------------------------------------------------------------------------

/**
 * Kept as its own exported schema for the controller/tests to validate a single finding, but
 * `investigationResultSchema` below does NOT reference this object by identity (see note above
 * about `$ref` generation) - it inlines the same shape directly so the schema handed to Gemini
 * as `responseSchema` has no `$ref`/`$defs`.
 */
export const findingSchema = z.object({
  severity: z.enum(['high', 'medium', 'low', 'info']),
  title: z.string().min(1).max(160),
  /** Deterministic facts pulled from tool results - numbers/statuses only, no speculation. */
  facts: z.array(z.string().min(1).max(300)).min(1).max(10),
  /** The agent's reasoning connecting the facts. Never phrased as if it were itself a fact. */
  interpretation: z.string().min(1).max(800),
  /** Suggested human action. The agent never performs this itself. */
  recommendation: z.string().min(1).max(400),
  /** Which tool(s) this finding's facts came from, for traceability. */
  evidence: z.array(z.string().min(1).max(80)).min(1).max(10),
});
export type Finding = z.infer<typeof findingSchema>;

export const investigationResultSchema = z.object({
  summary: z.string().min(1).max(600),
  findings: z
    .array(
      z.object({
        severity: z.enum(['high', 'medium', 'low', 'info']),
        title: z.string().min(1).max(160),
        facts: z.array(z.string().min(1).max(300)).min(1).max(10),
        interpretation: z.string().min(1).max(800),
        recommendation: z.string().min(1).max(400),
        evidence: z.array(z.string().min(1).max(80)).min(1).max(10),
      }),
    )
    .max(10),
  toolsUsed: z.array(z.string().min(1).max(80)),
  /** Set when the agent could not find enough evidence to support a conclusion for the question asked. */
  insufficientEvidence: z.boolean().default(false),
});
export type InvestigationResult = z.infer<typeof investigationResultSchema>;

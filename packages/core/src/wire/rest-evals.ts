/** The evals doors a page reads: personas, their runs, the voices a caller speaks with, an agent's judges, the org's cases. */

import { z } from "zod";
import { EndReasonSchema } from "./defs.js";
import { JudgmentSchema } from "./events.js";
import { SessionScoreSchema } from "./rest.js";

/**
 * One synthetic caller of ONE agent, kept by the gateway: what they want, how they talk, and what
 * they may state about themselves. A model plays them turn by turn — there is no script — for
 * `pinecall simulate` and the console's Simulations. Another agent of the org has callers of its
 * own, even under the same name.
 */
export const PersonaSchema = z.strictObject({
  /** The agent the caller was written for: every row says whose, so the org's roster reads the same. */
  agent: z.string(),
  name: z.string(),
  about: z.string(),
  goal: z.string(),
  style: z.string(),
  facts: z.record(z.string(), z.string()),
  state: z.record(z.string(), z.unknown()),
  llm: z.string().nullable(),
  tts: z.string().nullable(),
  voice: z.string().nullable(),
  accepts_when: z.string(),
  declines_when: z.string(),
  author: z.string(),
  set_at: z.number(),
});

export type Persona = z.infer<typeof PersonaSchema>;

/** GET /v1/agents/{slug}/personas: every caller written for the agent, by name; GET /v1/personas: every agent's, by agent. The same in both worlds. */
export const PersonaListSchema = z.strictObject({
  personas: z.array(PersonaSchema),
});

/**
 * PUT /v1/agents/{slug}/personas/{name}, the body: the caller, written whole. A name that exists
 * is replaced; `was` renames the agent's caller it names.
 */
export const PersonaPutSchema = z.strictObject({
  about: z.string().nullish(),
  goal: z.string(),
  style: z.string(),
  facts: z.record(z.string(), z.string()).nullish(),
  state: z.record(z.string(), z.unknown()).nullish(),
  llm: z.string().nullable().nullish(),
  tts: z.string().nullable().nullish(),
  voice: z.string().nullable().nullish(),
  accepts_when: z.string().nullish(),
  declines_when: z.string().nullish(),
  was: z.string().nullish(),
});

export type PersonaPut = z.infer<typeof PersonaPutSchema>;

/**
 * One simulation this caller has run: the call it was, and what the call came to. Read off the
 * call index, never off a log — the same row the sessions list is drawn from.
 */
export const PersonaRunSchema = z.strictObject({
  call: z.string(),
  agent: z.string(),
  /** Who played it: every simulated call names its persona. */
  persona: z.string().nullable(),
  started_at: z.number(),
  ended_at: z.number().nullable(),
  turns: z.int(),
  end_reason: EndReasonSchema.nullable(),
  outcome: z.string().nullable(),
  cost_usd: z.number().nullable(),
  score: SessionScoreSchema.nullable(),
});

export type PersonaRun = z.infer<typeof PersonaRunSchema>;

/**
 * Simulated calls, newest first, a page at a time: one caller's to the agent (GET
 * /v1/agents/{slug}/personas/{name}/runs), or every one of the world (GET /v1/simulations) — in the
 * key's own world and corner, paged exactly as the sessions list is.
 */
export const PersonaRunListSchema = z.strictObject({
  runs: z.array(PersonaRunSchema),
  total: z.int(),
  next: z.string().nullable(),
});

export type PersonaRunList = z.infer<typeof PersonaRunListSchema>;

/**
 * One voice a picker offers, as GET /v1/voices lists it: the id the `voice` setting takes, and
 * what a person chooses by. `country` and `accent` are the vendor's own words (`ES` is Spain, `MX`
 * Mexico), empty when the vendor said none.
 */
export const ListedVoiceSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  language: z.string(),
  description: z.string(),
  gender: z.string(),
  country: z.string(),
  accent: z.string(),
});

export type ListedVoice = z.infer<typeof ListedVoiceSchema>;

/**
 * GET /v1/voices?tts=&language=: a voice vendor's own voices in one language, in the vendor's
 * order.
 */
export const VoicesListedSchema = z.strictObject({
  tts: z.string(),
  language: z.string().nullable(),
  voices: z.array(ListedVoiceSchema),
});

/**
 * POST /v1/voices/sample, the body: which vendor, which voice, which model and which words to
 * hear. The answer is the WAV itself (`audio/wav`), with `Server-Timing: first-audio;dur=…,
 * total;dur=…` in milliseconds.
 */
export const VoiceSampleSchema = z.strictObject({
  tts: z.string(),
  voice: z.string(),
  model: z.string().nullable().nullish(),
  language: z.string().nullable().nullish(),
  text: z.string().nullable().nullish(),
});

export type VoiceSample = z.infer<typeof VoiceSampleSchema>;

/** How a judge answers: held or broken, one of its choices, or a score from 1 to 5. */
export const JudgeAnswerSchema = z.enum(["verdict", "choice", "score"]);

export type JudgeAnswer = z.infer<typeof JudgeAnswerSchema>;

/** When a judge runs: every call, only a call a simulated caller played, or a call its trigger says it applies to. */
export const JudgeOnSchema = z.enum(["always", "simulations", "trigger"]);

export type JudgeOn = z.infer<typeof JudgeOnSchema>;

/** What a judge reads beyond the call and its tool calls, each one more block of its question. */
export const JudgeReadSchema = z.enum(["prompt", "evidence", "facts"]);

export type JudgeRead = z.infer<typeof JudgeReadSchema>;

/**
 * One judge as a list shows it: Pinecall's library's (`owner` "pinecall", switched by `on`), the
 * org's own (`owner` "org") or an agent's own (`owner` its slug), what it asks, how it answers,
 * when it runs and what it reads. One list serves both worlds.
 */
export const JudgeRowSchema = z.strictObject({
  name: z.string(),
  owner: z.string(),
  on: z.boolean(),
  question: z.string(),
  answer: JudgeAnswerSchema,
  choices: z.array(z.string()),
  when: JudgeOnSchema,
  trigger: z.string(),
  reads: z.array(JudgeReadSchema),
  /** The library's: one line on what it holds a call to, and the version of its question. */
  summary: z.string().nullish(),
  version: z.int().nullish(),
  /** One of the org's own: who wrote it last, and when. */
  author: z.string().nullish(),
  set_at: z.number().nullish(),
});

export type JudgeRow = z.infer<typeof JudgeRowSchema>;

/** GET /v1/org/judges and /v1/agents/{slug}/judges, and what PUT and DELETE answer: the library first, then the org's own, then the agent's. */
export const JudgeListSchema = z.strictObject({
  judges: z.array(JudgeRowSchema),
});

/** PUT …/judges/{name}: one of the org's own written whole, or for one of Pinecall's only `on`. */
export const JudgeRequestSchema = z.strictObject({
  question: z.string().nullish(),
  answer: JudgeAnswerSchema.nullish(),
  choices: z.array(z.string()).nullish(),
  when: JudgeOnSchema.nullish(),
  trigger: z.string().nullish(),
  reads: z.array(JudgeReadSchema).nullish(),
  on: z.boolean().nullish(),
});

export type JudgeRequest = z.infer<typeof JudgeRequestSchema>;

/** POST /v1/agents/{slug}/judges/try: one judge, by name alone or written whole, asked of the agent's last calls or of the calls named. Nothing is kept. */
export const JudgeTrySchema = JudgeRequestSchema.extend({
  name: z.string(),
  last: z.int().min(1).max(50).nullish(),
  calls: z.array(z.string()).max(50).nullish(),
});

export type JudgeTry = z.infer<typeof JudgeTrySchema>;

/** What the judge answered of one call, or why it did not. */
export const JudgeTriedRowSchema = z.strictObject({
  call: z.string(),
  judgment: JudgmentSchema.nullable(),
  not_judged: z.string().nullish(),
});

export type JudgeTriedRow = z.infer<typeof JudgeTriedRowSchema>;

/** The try's answer: every call's row, the evals it spent and what they cost. */
export const JudgeTriedSchema = z.strictObject({
  rows: z.array(JudgeTriedRowSchema),
  evals: z.int(),
  cost_usd: z.number(),
});

export type JudgeTried = z.infer<typeof JudgeTriedSchema>;

/**
 * What a golden expects: each field set is one judge, settled by code — except `judges`, the
 * hang-up judges asked again by name of the golden's call, the one field a model answers. A field
 * left at its default is not sent.
 */
export const ExpectSchema = z.strictObject({
  tools: z.array(z.string()).optional(),
  not_tools: z.array(z.string()).optional(),
  not: z.array(z.string()).optional(),
  says: z.array(z.string()).optional(),
  says_any: z.array(z.string()).optional(),
  grounded: z.boolean().optional(),
  register: z.enum(["tu", "usted"]).nullable().optional(),
  replies: z.boolean().nullable().optional(),
  judges: z.array(z.string()).optional(),
});

export type Expect = z.infer<typeof ExpectSchema>;

/** A fact of the tenant's backend a golden injects after the caller line it names (0: before the first). */
export const EventStepSchema = z.strictObject({
  after_turn: z.number().optional(),
  name: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
});

/** One conversation written down: the state it opens in, the caller's lines, what it expects. */
export const GoldenSchema = z.strictObject({
  name: z.string(),
  state: z.record(z.string(), z.unknown()).optional(),
  input: z.array(z.string()).optional(),
  memory: z.array(z.string()).optional(),
  events: z.array(EventStepSchema).optional(),
  today: z.string().nullable().optional(),
  expect: ExpectSchema.optional(),
  promoted_from: z.string().nullable().optional(),
});

export type Golden = z.infer<typeof GoldenSchema>;

/** A case waits for a person (`pending`) until approved into the nightly or dismissed. */
export const CaseStatusSchema = z.enum(["pending", "approved", "dismissed"]);

export type CaseStatus = z.infer<typeof CaseStatusSchema>;

/**
 * One case of the org's dataset: a real call kept as a golden — at hang-up when a judge broke on
 * it, or by a person — whose agent, from which world, on which settings version, and decided how.
 */
export const EvalCaseSchema = z.strictObject({
  id: z.string(),
  agent: z.string(),
  name: z.string(),
  golden: GoldenSchema,
  source_call: z.string(),
  source_env: z.enum(["production", "sandbox"]),
  held_out: z.boolean(),
  author: z.string(),
  created_at: z.number(),
  status: CaseStatusSchema,
  broke: z.array(z.strictObject({ judge: z.string(), reason: z.string() })),
  source_version: z.number().nullable(),
  kept_in_repo: z.boolean(),
  decided_by: z.string().nullable(),
});

export type EvalCase = z.infer<typeof EvalCaseSchema>;

/** GET /v1/evals/cases: the org's cases, the pending first, and how many wait of how many may. */
export const EvalCaseListSchema = z.strictObject({
  cases: z.array(EvalCaseSchema),
  pending: z.number(),
  pending_at_most: z.number(),
});

/** PATCH /v1/evals/cases/{id}, the body: what a person decided; each field sent is written. */
export const CaseDecisionSchema = z.strictObject({
  status: CaseStatusSchema.optional(),
  held_out: z.boolean().optional(),
  kept_in_repo: z.boolean().optional(),
  judge_was_wrong: z.string().optional(),
  note: z.string().optional(),
});

export type CaseDecision = z.infer<typeof CaseDecisionSchema>;

/** The numbers a monitor can watch (runtime domain/monitor.py): latencies in seconds at the median, rates as shares of 1, spend in dollars, calls. */
export const MonitorMetricSchema = z.enum(["e2e_median_s", "llm_median_s", "held_rate", "escalated_rate", "tool_failure_rate", "spend_usd", "calls"]);

export type MonitorMetric = z.infer<typeof MonitorMetricSchema>;

/**
 * One monitor of the world (runtime wire/rest/monitors.py: MonitorRow): what it watches over
 * which window, the line it must not cross, and the last day it did with the value that crossed.
 */
export const MonitorSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  metric: z.string(),
  above: z.boolean(),
  threshold: z.number(),
  window_days: z.number(),
  agent: z.string().nullable(),
  created_by: z.string(),
  fired_on: z.string().nullable(),
  fired_value: z.number().nullable(),
});

export type Monitor = z.infer<typeof MonitorSchema>;

/** GET /v1/monitors: every monitor of the world, oldest first. */
export const MonitorListSchema = z.strictObject({ monitors: z.array(MonitorSchema) });

/** POST /v1/monitors, the body: the rule, and whose agent — every agent's calls when null. */
export const MonitorPutSchema = z.strictObject({
  name: z.string(),
  metric: MonitorMetricSchema,
  above: z.boolean(),
  threshold: z.number(),
  window_days: z.union([z.literal(1), z.literal(7), z.literal(30)]),
  agent: z.string().nullable(),
});

export type MonitorPut = z.infer<typeof MonitorPutSchema>;

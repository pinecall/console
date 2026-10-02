/** The evals doors a page reads: personas, their runs, the voices a caller speaks with, an agent's judges. */

import { z } from "zod";
import { EndReasonSchema } from "./defs.js";
import { SessionScoreSchema } from "./rest.js";

/**
 * One synthetic caller of ONE agent, kept by the gateway: what they want, how they talk, and what
 * they may state about themselves. A model plays them turn by turn — there is no script — for
 * `pinecall simulate` and the console's Simulations. Another agent of the org has callers of its
 * own, even under the same name.
 */
export const PersonaSchema = z.strictObject({
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

/** GET /v1/agents/{slug}/personas: every caller written for the agent, by name, the same in both worlds. */
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
 * Every call this caller has made to the agent, newest first, a page at a time. GET
 * /v1/agents/{slug}/personas/{name}/runs, in the key's own world and corner, paged exactly as the
 * sessions list is.
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

/** When one of the agent's own judges reads a call: every call, or only one a persona played. */
export const RunsOnSchema = z.enum(["every-call", "simulations"]);

export type RunsOn = z.infer<typeof RunsOnSchema>;

/**
 * One judge of an agent's own, kept by the gateway: a question about the agent's job that the
 * judge model answers held or broken at hang-up, beside the runtime's panel. One list per agent,
 * the same in both worlds.
 */
export const JudgeSchema = z.strictObject({
  name: z.string(),
  question: z.string(),
  runs_on: RunsOnSchema,
  author: z.string(),
  set_at: z.number(),
});

export type Judge = z.infer<typeof JudgeSchema>;

/** GET /v1/agents/{slug}/judges, and what PUT and DELETE answer: the agent's own judges, by name. */
export const JudgeListSchema = z.strictObject({
  judges: z.array(JudgeSchema),
});

/** PUT /v1/agents/{slug}/judges/{name}, the body: the question, and which calls it reads. */
export const JudgePutSchema = z.strictObject({
  question: z.string(),
  runs_on: RunsOnSchema.nullish(),
});

export type JudgePut = z.infer<typeof JudgePutSchema>;

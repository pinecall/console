/** The org's and the box's doors: insights, limits, the held agents, settings, an agent's lexicon. */

import { z } from "zod";
import {
  ChannelSchema,
  DocsConfigSchema,
  EnvSchema,
  GreetingConfigSchema,
  HangupConfigSchema,
  MemoryConfigSchema,
  PronunciationSchema,
  TurnConfigSchema,
} from "./defs.js";

/** One quota: the limit the org was given, and how much of it is used. */
export const LimitSchema = z.strictObject({
  limit: z.int().nullable(),
  used: z.number(),
});

/**
 * GET /v1/limits: what the key's org may use and has used on this instance, where it bought more,
 * and which of the box's vendor keys it runs on. Any key of the org.
 */
export const LimitsSchema = z.strictObject({
  minutes: LimitSchema,
  messages: LimitSchema,
  llm_tokens: LimitSchema,
  concurrent_calls: LimitSchema,
  agents: LimitSchema,
  seats: LimitSchema,
  numbers: LimitSchema,
  lends: z.array(z.string()).nullable(),
  billing_url: z.string().nullable(),
  // The world these limits are of: the one the request acted in.
  world: EnvSchema,
});

export type Limits = z.infer<typeof LimitsSchema>;

/** One corner of a world holding an agent: the member whose it is, named so a person can read it. */
export const LineHolderSchema = z.strictObject({
  holder: z.string().nullable(),
  name: z.string().nullable(),
});

/** One agent, as somebody choosing which to open needs to see it: its name and its channels. */
export const HeldAgentSchema = z.strictObject({
  slug: z.string(),
  channels: z.array(ChannelSchema),
  holder: LineHolderSchema.nullable().nullish(),
});

export type HeldAgent = z.infer<typeof HeldAgentSchema>;

/** GET /v1/agents: every agent this fleet is holding right now, as the front page lists them. */
export const AgentListSchema = z.strictObject({
  agents: z.array(HeldAgentSchema),
});

/**
 * One app connected to the gateway right now: one process on one machine, holding one or more
 * agents in one world.
 */
export const AppProcessSchema = z.strictObject({
  app: z.string(),
  agents: z.array(z.string()),
  env: EnvSchema,
  host: z.string().nullable(),
  address: z.string().nullable(),
  sdk: z.string().nullable(),
  holder: LineHolderSchema.nullable(),
  connected_at: z.number(),
});

export type AppProcess = z.infer<typeof AppProcessSchema>;

/**
 * GET /v1/apps: every app connected in the request's world that this key may see — its own
 * corner's and the org's, every corner's with `team`.
 */
export const AppListSchema = z.strictObject({
  apps: z.array(AppProcessSchema),
});

/**
 * POST /v1/apps/{app}/stop, the answer: the socket was closed with the stop code, and the app
 * exits rather than reconnect.
 */
export const AppStoppedSchema = z.strictObject({
  app: z.string(),
  stopped: z.boolean(),
});

/**
 * An agent's settings: what the org set, per world and per corner. Every field is optional; one
 * left out is not set, and the runtime's own default stands for it.
 */
export const TuningBodySchema = z.strictObject({
  voice: z.string().nullish(),
  tts: z.string().nullish(),
  tts_model: z.string().nullish(),
  stt: z.string().nullish(),
  llm: z.string().nullish(),
  greeting: GreetingConfigSchema.nullish(),
  hangup: HangupConfigSchema.nullish(),
  turn: TurnConfigSchema.nullish(),
  memory: MemoryConfigSchema.nullish(),
  record: z.boolean().nullish(),
  max_duration_s: z.int().nullish(),
  knowledge: z.string().nullish(),
  bases: z.array(DocsConfigSchema).nullish(),
});

export type TuningBody = z.infer<typeof TuningBodySchema>;

/**
 * One kept version of an agent's tuning: whose corner, which version, who set it and when, and
 * what it says.
 */
export const TuningRowSchema = z.strictObject({
  holder: z.string(),
  version: z.int(),
  author: z.string(),
  note: z.string().nullable(),
  set_at: z.number(),
  config: TuningBodySchema,
});

export type TuningRow = z.infer<typeof TuningRowSchema>;

/**
 * GET /v1/agents/{slug}/settings: the agent's tuning as this key sees it — its own corner's, the
 * team's and production's, each corner's own newest row, or null when that corner set nothing.
 */
export const TuningAnswerSchema = z.strictObject({
  world: EnvSchema,
  yours: TuningRowSchema.nullable(),
  team: TuningRowSchema.nullable(),
  production: TuningRowSchema.nullable(),
});

export type TuningAnswer = z.infer<typeof TuningAnswerSchema>;

/** GET /v1/agents/{slug}/settings/history: one corner's versions, newest first. */
export const TuningHistorySchema = z.strictObject({
  world: EnvSchema,
  holder: z.string(),
  rows: z.array(TuningRowSchema),
});

export type TuningHistory = z.infer<typeof TuningHistorySchema>;

/**
 * An agent's lexicon: how the voice says the words it would get wrong, and the words the ears must
 * know. The class sets neither: these are the agent's says and hears.
 */
export const LexiconBodySchema = z.strictObject({
  said: z.array(PronunciationSchema),
  heard: z.array(z.string()),
});

export type LexiconBody = z.infer<typeof LexiconBodySchema>;

/** One kept version of an agent's lexicon. */
export const LexiconRowSchema = z.strictObject({
  holder: z.string(),
  version: z.int(),
  author: z.string(),
  note: z.string().nullable(),
  set_at: z.number(),
  lexicon: LexiconBodySchema,
});

export type LexiconRow = z.infer<typeof LexiconRowSchema>;

/**
 * GET /v1/agents/{slug}/lexicon: the agent's words as this key sees them — its own corner's, the
 * team's and production's, each corner's own newest, or null.
 */
export const LexiconAnswerSchema = z.strictObject({
  world: EnvSchema,
  yours: LexiconRowSchema.nullable(),
  team: LexiconRowSchema.nullable(),
  production: LexiconRowSchema.nullable(),
});

export type LexiconAnswer = z.infer<typeof LexiconAnswerSchema>;

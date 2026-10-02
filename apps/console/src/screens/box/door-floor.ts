/** Operator doors: fleet, org routes, usage and a number's traceback. */

import { z } from "zod";

import { drop, post, read, type Credentials } from "@pinecall/core/api";

const OPS = "/v1/ops";

// Mirrors runtime fleet/roster.py. `max_jobs` null: unreported. Compare `seen_at` with the answer's `now`.
// A worker's name is its machine and slot, the same in both worlds: `fleet` tells them apart.
const WorkerSchema = z.looseObject({
  fleet: z.string(),
  worker: z.string(),
  active: z.number(),
  max_jobs: z.number().nullish(),
  load: z.number(),
  draining: z.boolean(),
  cordoned: z.boolean(),
  seen_at: z.number(),
});
export type Worker = z.infer<typeof WorkerSchema>;

const FleetSchema = z.looseObject({ now: z.number(), stale_after_s: z.number(), workers: z.array(WorkerSchema) });
export type TheFleet = z.infer<typeof FleetSchema>;

const AnsweringSchema = z.looseObject({
  route: z.looseObject({
    agent: z.string(),
    channel: z.string(),
    number: z.string().nullish(),
    env: z.string(),
    managed: z.boolean().nullish(),
  }),
  source: z.string(),
});
export type Answering = z.infer<typeof AnsweringSchema>;

const UsageRowSchema = z.looseObject({
  cursor: z.number(),
  org: z.string(),
  agent: z.string(),
  call: z.string(),
  type: z.string(),
  at: z.number(),
  minutes: z.number(),
  messages: z.number(),
  cost_usd: z.number(),
});
export type UsageRow = z.infer<typeof UsageRowSchema>;

const TotalsSchema = z.looseObject({ minutes: z.number(), messages: z.number(), input_tokens: z.number(), output_tokens: z.number(), characters: z.number() });
export type Totals = z.infer<typeof TotalsSchema>;

const UsagePageSchema = z.looseObject({ rows: z.array(UsageRowSchema), totals: z.record(z.string(), TotalsSchema), next: z.number().nullish() });
export type UsagePage = z.infer<typeof UsagePageSchema>;

/** Workers known to the hub, and the hub's clock. */
export async function readFleet(credentials: Credentials): Promise<TheFleet> {
  return FleetSchema.parse(await read(credentials, `${OPS}/fleet`));
}

/** Cordon or uncordon a worker; its current calls are unaffected. */
export async function cordon(credentials: Credentials, worker: Worker, wanted: boolean): Promise<void> {
  const path = `${OPS}/fleet/${encodeURIComponent(worker.worker)}/cordon?fleet=${encodeURIComponent(worker.fleet)}`;
  await (wanted ? post(credentials, path, {}) : drop(credentials, path));
}

/** An org's routes in one world, each with its source table. */
export async function readRoutes(credentials: Credentials, org: string, env: string): Promise<Answering[]> {
  return z.array(AnsweringSchema).parse(await read(credentials, `${OPS}/routes`, { org, env }));
}

/** Assign a number to an agent; returns the previous agent, if any. */
export async function addRoute(
  credentials: Credentials,
  wanted: { org: string; number: string; agent: string; channel: string; env: string },
): Promise<string | null> {
  return z.looseObject({ overrides: z.string().nullish() }).parse(await post(credentials, `${OPS}/routes`, wanted)).overrides ?? null;
}

/** Remove a manually assigned number; 404 if it was never assigned. */
export async function removeRoute(credentials: Credentials, org: string, number: string): Promise<void> {
  await drop(credentials, `${OPS}/routes/${encodeURIComponent(number)}?org=${encodeURIComponent(org)}`);
}

/** One page of usage rows (oldest first), per-org totals and the next cursor. */
export async function readUsage(credentials: Credentials, after: number, limit: number): Promise<UsagePage> {
  return UsagePageSchema.parse(await read(credentials, `${OPS}/usage`, { after, limit }));
}

const TracedCallSchema = z.looseObject({
  call: z.string(),
  org: z.string().nullable(),
  env: z.string().nullable(),
  direction: z.string().nullable(),
  from_number: z.string().nullable(),
  to_number: z.string().nullable(),
  started_at: z.number().nullable(),
  ended_at: z.number().nullable(),
  end_reason: z.string().nullable(),
  erased: z.boolean(),
});

const TracedDialSchema = z.looseObject({
  org: z.string(),
  env: z.string(),
  agent: z.string(),
  call: z.string().nullable(),
  shown: z.string().nullable(),
  asked_by: z.string(),
  refused: z.string().nullable(),
  at: z.number(),
});

const TracebackSchema = z.looseObject({
  number: z.string(),
  since: z.number(),
  calls: z.array(TracedCallSchema),
  dials: z.array(TracedDialSchema),
});
export type Traceback = z.infer<typeof TracebackSchema>;

/** `GET /v1/ops/traceback`: a number's phone calls, kept or erased, and every dial to it; 24 months back unless a day is given. */
export async function readTraceback(credentials: Credentials, number: string, since: number | null): Promise<Traceback> {
  const query: Record<string, string | number> = since === null ? { number } : { number, since };
  return TracebackSchema.parse(await read(credentials, `${OPS}/traceback`, query));
}

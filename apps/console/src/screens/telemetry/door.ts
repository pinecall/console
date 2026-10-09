/** Telemetry screen API: where the org sends its calls' traces — set with its headers, read back by name, dropped. */

import { z } from "zod";

import { drop, put, read, type Credentials } from "@pinecall/core/api";

// runtime wire/rest/telemetry.py: TelemetryResponse; null when the org sends its traces nowhere.
const CollectorSchema = z.object({ endpoint: z.string(), header_names: z.array(z.string()), pii: z.boolean() });

/** The org's collector, as the gateway says it: the headers by name, never by value. */
export type Collector = z.infer<typeof CollectorSchema>;

const DOOR = "/v1/telemetry";

/** Where the org's traces go, or null. */
export async function readCollector(credentials: Credentials): Promise<Collector | null> {
  const answered: unknown = await read(credentials, DOOR);
  return answered === null ? null : CollectorSchema.parse(answered);
}

/** Set the collector, replacing the one the org had; the headers are sent once and never read back. */
export async function putCollector(credentials: Credentials, endpoint: string, headers: Record<string, string>, pii: boolean): Promise<void> {
  await put(credentials, DOOR, { endpoint, headers, pii });
}

/** Forget the collector: the traces stay on the platform alone. */
export async function dropCollector(credentials: Credentials): Promise<void> {
  await drop(credentials, DOOR);
}

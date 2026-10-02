/** Start a simulated call through the local dev process. */

import { z } from "zod";

import type { Credentials } from "@pinecall/core/api";
import { dev } from "../../lib/dev";

const StartedSchema = z.object({ call: z.string() });

/** Simulate request; the server validates it. */
export interface Wanted {
  agent: string;
  persona: string;
  voice: boolean;
  judge: boolean;
  turns: number;
  background_noise?: number;
  packet_loss?: number;
}

/** Start a simulated call; resolves with its id while the call keeps running. */
export async function startSimulation(credentials: Credentials, wanted: Wanted): Promise<string> {
  return StartedSchema.parse(await dev(credentials, wanted.agent, "simulate.start", wanted)).call;
}



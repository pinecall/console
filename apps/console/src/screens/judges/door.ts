/** Judges doors: the org's judges (asked of every agent's calls) and one agent's own, listed, written and dropped. */

import { type Judge, JudgeListSchema, type JudgePut } from "@pinecall/core/wire/rest-evals";

import { drop, put, read, type Credentials } from "@pinecall/core/api";

export type { Judge, JudgePut };

/** Whose judges: the org's (null), or one agent's by its slug. */
export type Whose = string | null;

const door = (whose: Whose, name?: string): string =>
  `${whose === null ? "/v1/org" : `/v1/agents/${encodeURIComponent(whose)}`}/judges${name === undefined ? "" : `/${encodeURIComponent(name)}`}`;

export async function readJudges(credentials: Credentials, whose: Whose): Promise<Judge[]> {
  return JudgeListSchema.parse(await read(credentials, door(whose))).judges;
}

/** Write one judge whole, a new one or the same name again; resolves to that list. */
export async function writeJudge(credentials: Credentials, whose: Whose, name: string, written: JudgePut): Promise<Judge[]> {
  return JudgeListSchema.parse(await put(credentials, door(whose, name), written)).judges;
}

/** Forget one judge; resolves to that list. */
export async function dropJudge(credentials: Credentials, whose: Whose, name: string): Promise<Judge[]> {
  return JudgeListSchema.parse(await drop(credentials, door(whose, name))).judges;
}

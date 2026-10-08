/** Cases doors: the org's dataset read for one agent, a call kept as a case, and what a person decides. */

import { type CaseDecision, type EvalCase, EvalCaseListSchema, EvalCaseSchema } from "@pinecall/core/wire/rest-evals";

import { patch, post, read, type Credentials } from "@pinecall/core/api";

export type { CaseDecision, EvalCase };

/** One agent's cases, the pending first, and how many wait of how many may. */
export interface Listed {
  cases: EvalCase[];
  pending: number;
  pendingAtMost: number;
}

/** Every case of one agent, whatever its status: the gateway orders the pending first. */
export async function readCases(credentials: Credentials, agent: string): Promise<Listed> {
  const listed = EvalCaseListSchema.parse(await read(credentials, "/v1/evals/cases", { agent }));
  return { cases: listed.cases, pending: listed.pending, pendingAtMost: listed.pending_at_most };
}

/** Write what a person decided of one case; resolves to the case as it stands now. */
export async function decideCase(credentials: Credentials, id: string, decision: CaseDecision): Promise<EvalCase> {
  return EvalCaseSchema.parse(await patch(credentials, `/v1/evals/cases/${encodeURIComponent(id)}`, decision));
}

/**
 * Keep a finished call as a case of the org's dataset, approved from the start: a person kept it.
 * Its expect is what the call's broken verdicts give; a call that held expects nothing yet.
 */
export async function keepCall(credentials: Credentials, call: string, name: string): Promise<EvalCase> {
  return EvalCaseSchema.parse(await post(credentials, "/v1/evals/cases", { call, name }));
}

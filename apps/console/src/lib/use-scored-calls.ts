/** Hook for an agent's finished calls with their `call.score`. */

import { useAgentSessions } from "@pinecall/core/use-agent-sessions";
import { useScores, type Scored } from "./use-scores";

export type { Scored } from "./use-scores";

export interface ScoredCalls {
  rows: Scored[];
  error: string | null;
}

export function useScoredCalls(agent: string): ScoredCalls {
  const { lines, error } = useAgentSessions(agent);
  return { rows: useScores(lines), error };
}

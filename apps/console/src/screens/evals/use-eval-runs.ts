/** Hook for an agent's eval runs, polled while one is running. */

import { useEffect, useState } from "react";

import { useCredentials } from "@pinecall/core/credentials";
import { readRuns, type EvalRun } from "./door";

// Runs are rows, not a stream, so a running one is polled at the calls list's interval.
const EVERY_MS = 3000;

export interface EvalRuns {
  runs: EvalRun[];
  reading: boolean;
  error: string | null;
}

export function useEvalRuns(agent: string): EvalRuns {
  const credentials = useCredentials();
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [reading, setReading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;

    const ask = async (): Promise<void> => {
      try {
        const listed = await readRuns(credentials, agent);
        if (!stopped) {
          setRuns(listed);
          setError(null);
        }
      } catch (refused) {
        if (!stopped) {
          setError(String(refused));
        }
      } finally {
        if (!stopped) {
          setReading(false);
        }
      }
    };

    void ask();
    const again = window.setInterval(() => void ask(), EVERY_MS);
    return () => {
      stopped = true;
      window.clearInterval(again);
    };
  }, [agent, credentials]);

  return { runs, reading, error };
}

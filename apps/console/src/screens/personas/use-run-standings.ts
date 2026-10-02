/** Hook for each persona's run count and newest runs. */

import { useEffect, useState } from "react";

import { useCredentials } from "@pinecall/core/credentials";
import { readRuns, type PersonaRun } from "./door";

export interface Standing {
  total: number;
  newest: PersonaRun[];
}

export interface Standings {
  by: Record<string, Standing>;
  read: boolean;
}

// Per-persona sample merged into the agent's latest runs; totals stay exact regardless of the limit.
const A_FEW = 5;

/** Reads every persona in parallel; failed reads are omitted from the map. */
export function useRunStandings(agent: string, names: readonly string[] | null): Standings {
  const credentials = useCredentials();
  const [standings, setStandings] = useState<Standings>({ by: {}, read: false });
  const asked = names === null ? null : names.join("\u0000");

  useEffect(() => {
    if (asked === null) return;
    if (asked === "") {
      setStandings({ by: {}, read: true });
      return;
    }
    let gone = false;
    setStandings({ by: {}, read: false });
    void Promise.all(
      asked.split("\u0000").map(async (name): Promise<[string, Standing] | null> => {
        try {
          const page = await readRuns(credentials, agent, name, { limit: A_FEW });
          return [name, { total: page.total, newest: page.runs }];
        } catch {
          return null;
        }
      }),
    ).then((read) => {
      if (gone) return;
      setStandings({ by: Object.fromEntries(read.filter((one) => one !== null)), read: true });
    });
    return () => {
      gone = true;
    };
  }, [credentials, agent, asked]);

  return standings;
}

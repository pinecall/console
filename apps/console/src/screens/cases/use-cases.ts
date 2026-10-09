/** One agent's cases, or every agent's, read once, and set again by what a decision answers. */

import { useCallback, useEffect, useState } from "react";

import { saidBy } from "@pinecall/core/api";
import { useCredentials } from "@pinecall/core/credentials";
import { readCases, type EvalCase, type Listed } from "./door";

export interface Cases {
  listed: Listed | null;
  /** Why the gateway would not answer, while it would not. */
  asking: string | null;
  /** A case as a decision answered it: replaced in the list, and the count of what waits redone. */
  decided: (kept: EvalCase) => void;
}

export function useCases(agent: string): Cases {
  const credentials = useCredentials();
  const [listed, setListed] = useState<Listed | null>(null);
  const [asking, setAsking] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setListed(null);
    readCases(credentials, agent)
      .then((read) => live && (setListed(read), setAsking(null)))
      .catch((failed: unknown) => live && setAsking(saidBy(failed)));
    return () => {
      live = false;
    };
  }, [credentials, agent]);

  const decided = useCallback((kept: EvalCase): void => {
    setListed((was) => {
      if (was === null) return was;
      const cases = was.cases.map((each) => (each.id === kept.id ? kept : each));
      return { ...was, cases, pending: cases.filter((each) => each.status === "pending").length };
    });
  }, []);

  return { listed, asking, decided };
}

/** Hook for one list of judges, the org's or an agent's own, loaded when it changes. */

import { useEffect, useState } from "react";

import { useCredentials } from "@pinecall/core/credentials";
import { readJudges, type Judge, type Whose } from "./door";

export function useJudges(whose: Whose): {
  judges: Judge[] | null;
  error: string | null;
  setJudges: (judges: Judge[]) => void;
} {
  const credentials = useCredentials();
  const [judges, setJudges] = useState<Judge[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let gone = false;
    setJudges(null);
    setError(null);
    readJudges(credentials, whose).then(
      (read) => {
        if (!gone) setJudges(read);
      },
      (failed: unknown) => {
        if (!gone) setError(failed instanceof Error ? failed.message : String(failed));
      },
    );
    return () => {
      gone = true;
    };
  }, [credentials, whose]);

  return { judges, error, setJudges };
}

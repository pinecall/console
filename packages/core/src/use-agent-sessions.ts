/** Poll an agent's session list (used by the agent's Evals screen). */

import { type SessionLine, SessionListSchema } from "./wire/rest.js";
import { useEffect, useState } from "react";

import { read } from "./api";
import { useCredentials } from "./credentials";

// The session list has no stream, so it is polled. Org-wide call lists use use-floor.ts instead.
const EVERY_MS = 3000;

/** The agent's calls, newest first, and the last error. */
export interface AgentSessions {
  lines: SessionLine[];
  error: string | null;
}

/** Poll an agent's calls. */
export function useAgentSessions(slug: string): AgentSessions {
  const credentials = useCredentials();
  const [lines, setLines] = useState<SessionLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;

    const ask = async (): Promise<void> => {
      try {
        const listed = SessionListSchema.parse(
          await read(credentials, `/v1/agents/${slug}/sessions`),
        );
        if (!stopped) {
          setLines(listed.calls);
          setError(null);
        }
      } catch (refused) {
        if (!stopped) {
          setError(String(refused));
        }
      }
    };

    void ask();
    const again = window.setInterval(() => void ask(), EVERY_MS);
    return () => {
      stopped = true;
      window.clearInterval(again);
    };
  }, [slug, credentials]);

  return { lines, error };
}

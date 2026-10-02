/** Org-wide call list, polled and refreshed on /v1/events. */

import { type SessionLine, SessionListSchema } from "./wire/rest.js";
import { useEffect, useState } from "react";

import { doorUrl, GatewayError, read, saidBy } from "./api";
import { useCredentials } from "./credentials";
import { openLog } from "./stream";
import type { Connection } from "./stream";

// Polled, and also refetched whenever the org event stream fires.
const EVERY_MS = 3000;

/** Newest calls to read; older ones are paged via `calls-search.ts`. */
export const FLOOR_ROWS = 50;

/** Org calls newest first, stream status and last error. */
export interface Floor {
  lines: SessionLine[];
  connection: Connection;
  /** Incremented on agent.registered/detached, so the agent list can refetch. */
  agentsChanged: number;
  error: string | null;
  /** HTTP status of the last refusal (403: key lacks `calls`), or null. */
  refusedWith: number | null;
}

/** Error message and, for gateway errors, the HTTP status. */
export function refusal(refused: unknown): { error: string; refusedWith: number | null } {
  return { error: saidBy(refused), refusedWith: refused instanceof GatewayError ? refused.status : null };
}

/** Follow the org's calls. */
export function useFloor(limit = FLOOR_ROWS): Floor {
  const credentials = useCredentials();
  const [lines, setLines] = useState<SessionLine[]>([]);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [agentsChanged, setAgentsChanged] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refusedWith, setRefusedWith] = useState<number | null>(null);

  useEffect(() => {
    let stopped = false;

    const ask = async (): Promise<void> => {
      try {
        const listed = SessionListSchema.parse(await read(credentials, "/v1/sessions", { limit }));
        if (!stopped) {
          setLines(listed.calls);
          setError(null);
          setRefusedWith(null);
        }
      } catch (refused) {
        if (!stopped) {
          const said = refusal(refused);
          setError(said.error);
          setRefusedWith(said.refusedWith);
        }
      }
    };

    void ask();
    const again = window.setInterval(() => void ask(), EVERY_MS);
    // /v1/events has no backlog or seq: a frame only triggers a refetch.
    const close = openLog(doorUrl(credentials, "/v1/events"), credentials, {
      onEntry(entry) {
        if (entry.type === "agent.registered" || entry.type === "agent.detached") {
          setAgentsChanged((count) => count + 1);
        }
        void ask();
      },
      onPaint: () => undefined,
      onConnection: setConnection,
      onRefused: setError,
    });
    return () => {
      stopped = true;
      window.clearInterval(again);
      close();
    };
  }, [credentials, limit]);

  return { lines, connection, agentsChanged, error, refusedWith };
}

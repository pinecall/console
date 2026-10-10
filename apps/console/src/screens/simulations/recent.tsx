/** Under the form: the simulations already run — the agent in view's, or every agent's — newest first, each opened beside the form. */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";

import { saidBy } from "@pinecall/core/api";
import { useCredentials } from "@pinecall/core/credentials";
import { ago } from "../../lib/format";
import { rowAt, useHarnessAgents } from "../../lib/harness";
import { Avatar, Button } from "../../ui";
import { readSimulations, type PersonaRun } from "../personas/door";
import { Verdict } from "../personas/runs-side";

export function Recent({ inView, open, round }: { inView: string; open: string | undefined; round: number }): ReactNode {
  const credentials = useCredentials();
  // The agent in view's runs, or the org's agents' — the ones Viewing offers, and no other slug.
  const agents = useHarnessAgents(inView);
  const named = agents?.join("\n") ?? null;
  const [runs, setRuns] = useState<PersonaRun[] | null>(null);
  const [total, setTotal] = useState(0);
  const [next, setNext] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  const page = useCallback(
    async (before?: string): Promise<void> => {
      if (named === null) return;
      // An org holding no agent has no runs to list: an empty name list would ask for every one.
      if (named === "") {
        setRuns([]);
        setTotal(0);
        setNext(null);
        return;
      }
      setAsking(true);
      try {
        const read = await readSimulations(credentials, named.split("\n"), before);
        setRuns((had) => (before === undefined ? read.runs : [...(had ?? []), ...read.runs]));
        setTotal(read.total);
        setNext(read.next);
        setRefused(null);
      } catch (failed) {
        setRefused(saidBy(failed));
      } finally {
        setAsking(false);
      }
    },
    [credentials, named],
  );

  // Read again whenever a simulation starts here, so the new one is at the top.
  useEffect(() => {
    void page();
  }, [page, round]);

  const base = rowAt(inView, "simulations");
  return (
    <section className="sims-recent" aria-label="simulations run">
      <h2 className="sims-recent-title">
        Run <span className="sims-recent-count">{runs === null ? "" : total}</span>
      </h2>
      {runs?.map((run) => (
        <Link key={run.call} to={`${base}/${run.call}`} className={run.call === open ? "sims-run sims-run-on" : "sims-run"}>
          <Avatar size={28} round name={run.persona ?? "?"} />
          <span className="sims-run-words">
            <span className="sims-run-top">
              <span className="sims-run-who">{run.persona ?? "a caller"}</span>
              <span className="sims-run-when">{ago(run.started_at)}</span>
            </span>
            <span className="sims-run-sub">
              {inView === "" && `${run.agent} · `}
              {String(run.turns)} {run.turns === 1 ? "turn" : "turns"}
            </span>
            <span className="sims-run-mark">
              <Verdict run={run} />
            </span>
          </span>
        </Link>
      ))}
      {runs !== null && runs.length === 0 && <p className="sims-note">No simulation has run here yet. The first one you start is listed here.</p>}
      {runs === null && refused === null && <p className="sims-note">Asking the gateway…</p>}
      {refused !== null && <p className="sims-note sims-bad">{refused}</p>}
      {next !== null && (
        <Button size="sm" disabled={asking} onClick={() => void page(next)}>
          {asking ? "Reading…" : `Show more (${String(total - (runs?.length ?? 0))} older)`}
        </Button>
      )}
    </section>
  );
}

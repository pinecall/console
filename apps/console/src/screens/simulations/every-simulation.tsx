/** Simulations with every agent in view: every simulated call of the world, newest first, whichever agent and persona; a row opens the call. */

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { saidBy } from "@pinecall/core/api";
import { useCredentials } from "@pinecall/core/credentials";
import { ago, usd } from "../../lib/format";
import { Button, Card, Empty, Page, PageHead, Refused, TableHead, TableRow } from "../../ui";
import { readSimulations, type PersonaRun } from "../personas/door";
import { Verdict } from "../personas/runs-side";

const COLUMNS = "minmax(90px, 0.6fr) minmax(120px, 0.9fr) minmax(120px, 0.9fr) minmax(0, 2fr) 110px 70px 70px";

export function EverySimulation(): ReactNode {
  const credentials = useCredentials();
  const [runs, setRuns] = useState<PersonaRun[] | null>(null);
  const [total, setTotal] = useState(0);
  const [next, setNext] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  const page = useCallback(
    async (before?: string): Promise<void> => {
      setAsking(true);
      try {
        const read = await readSimulations(credentials, before);
        setRuns((had) => (before === undefined ? read.runs : [...(had ?? []), ...read.runs]));
        setTotal(read.total);
        setNext(read.next);
      } catch (failed) {
        setRefused(saidBy(failed));
      } finally {
        setAsking(false);
      }
    },
    [credentials],
  );

  useEffect(() => {
    void page();
  }, [page]);

  return (
    <Page>
      <PageHead
        title="Simulations"
        lede="Every simulated call of this world, newest first: a persona calling an agent, scored at hang-up like any call. A row opens the conversation; an agent's own Simulations puts a new caller on it."
      />
      <Refused>{refused}</Refused>
      <Card>
        <TableHead columns={COLUMNS} labels={["When", "Agent", "Persona", "Came to", "Judges", "Turns>", "Cost>"]} padding="10px 16px" />
        {runs?.length === 0 && <Empty>No simulation has run in this world yet. Open an agent's Simulations, or run pinecall simulate in its directory.</Empty>}
        {runs === null && refused === null && <Empty>Asking the gateway…</Empty>}
        {runs?.map((run) => (
          <TableRow key={run.call} columns={COLUMNS} padding="12px 16px" to={`/calls/${run.call}`}>
            <span className="ui-clip">{ago(run.started_at)}</span>
            <span className="ui-clip">{run.agent}</span>
            <span className="ui-clip" style={{ fontWeight: 600 }}>{run.persona ?? "—"}</span>
            <span className="ui-clip" style={{ color: "var(--ink-3)" }}>{run.outcome ?? ""}</span>
            <span>
              <Verdict run={run} />
            </span>
            <span style={{ textAlign: "right" }}>{String(run.turns)}</span>
            <span style={{ textAlign: "right" }}>{run.cost_usd === null ? "" : usd(run.cost_usd)}</span>
          </TableRow>
        ))}
      </Card>
      {next !== null && (
        <div>
          <Button size="sm" disabled={asking} onClick={() => void page(next)}>
            {asking ? "Reading…" : `Show more (${String(total - (runs?.length ?? 0))} older)`}
          </Button>
        </div>
      )}
    </Page>
  );
}

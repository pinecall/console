/** Docs tab card listing the bases this agent reads in the current world. */

import { type DocsConfig } from "@pinecall/core/wire/defs";
import { type TuningAnswer } from "@pinecall/core/wire/rest-org";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";

import { useCredentials } from "@pinecall/core/credentials";
import { WORLD } from "../../lib/mode";
import { Card, CardHead, Empty } from "../../ui";
import { readSettings } from "../settings/door";

function saidBy(failed: unknown): string {
  return failed instanceof Error ? failed.message : String(failed);
}

/** Bases from production's settings, or from yours falling back to the team's. */
function basesRead(answer: TuningAnswer): DocsConfig[] {
  const row = WORLD === "production" ? answer.production : (answer.yours ?? answer.team);
  return row?.config.bases ?? [];
}

// Read-only: the bases are edited in Configure.
export function Attached({ agent }: { agent: string }): ReactNode {
  const credentials = useCredentials();
  const [bases, setBases] = useState<DocsConfig[] | null>(null);
  const [refused, setRefused] = useState<string | null>(null);

  useEffect(() => {
    let gone = false;
    readSettings(credentials, agent).then(
      (answer) => {
        if (!gone) setBases(basesRead(answer));
      },
      (failed: unknown) => {
        if (!gone) setRefused(saidBy(failed));
      },
    );
    return () => {
      gone = true;
    };
  }, [credentials, agent]);

  return (
    <Card>
      <CardHead title="Attached bases" meta="what this agent reads on every call — set in Settings, per corner and versioned" />
      {refused !== null ? (
        <Empty>{refused}</Empty>
      ) : bases === null ? (
        <Empty>Asking the gateway…</Empty>
      ) : bases.length === 0 ? (
        <Empty>
          No base attached: this agent searches nothing. Attach one in <Link to={`/a/${encodeURIComponent(agent)}/configure`}>Configure</Link>, or `pinecall docs attach &lt;base&gt;`.
        </Empty>
      ) : (
        <div className="kb-attached">
          {bases.map((one) => (
            <div key={one.base} className="kb-attached-row">
              <span className="ui-cell-strong">{one.base}</span>
              <span className="ui-cell-faint">
                {one.mode ?? "retrieved"} · k {one.k ?? 8}
                {one.min_score === undefined || one.min_score === null ? "" : ` · min score ${one.min_score}`}
              </span>
            </div>
          ))}
          <div className="ui-card-foot">
            {bases.length > 1 && "They are one search: read together and ranked against each other, so a base with nothing to say about the question takes none of the turn's chunks. "}
            Change them in <Link to={`/a/${encodeURIComponent(agent)}/configure`}>Configure</Link>.
          </div>
        </div>
      )}
    </Card>
  );
}

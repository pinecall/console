/** The left side: the agent's cases by what a person still has to do with them. */

import type { ReactNode } from "react";
import { Link } from "react-router";

import { ago } from "../../lib/format";
import { Pill } from "../../ui";
import type { EvalCase, Listed } from "./door";

// The order a person works in: what waits for them, what runs every night, what they let go.
const GROUPS = [
  { status: "pending", title: "Waiting for you" },
  { status: "approved", title: "Played every night" },
  { status: "dismissed", title: "Dismissed" },
] as const;

export function CaseRoster({ agent, listed, asking, open }: { agent: string; listed: Listed | null; asking: string | null; open: string | undefined }): ReactNode {
  const row = (kept: EvalCase): ReactNode => (
    <Link key={kept.id} to={`/a/${encodeURIComponent(agent)}/cases/${encodeURIComponent(kept.name)}`} className={kept.name === open ? "cs-row cs-row-on" : "cs-row"}>
      <span className="cs-row-top">
        {kept.broke.length === 0 ? <Pill tone="gray" small>kept by hand</Pill> : kept.broke.map((one) => <Pill key={one.judge} tone={kept.status === "pending" ? "red" : "muted"} small>{one.judge}</Pill>)}
        <span className="cs-row-age">{ago(kept.created_at)}</span>
      </span>
      <span className="cs-row-said">{kept.golden.input?.[0] ?? kept.name}</span>
      <span className="cs-row-from">
        {kept.source_env}
        {kept.kept_in_repo && " · in the repository"}
      </span>
    </Link>
  );
  return (
    <aside className="cs-side" aria-label={`${agent}'s cases`}>
      <div className="cs-side-head">
        <span className="cs-title">Cases</span>
        <p className="cs-lede">Real calls of {agent} a judge broke on. Each one waits here until you fix it and approve it, or dismiss it.</p>
        {listed !== null && (
          <span className={listed.pending >= listed.pendingAtMost ? "cs-count cs-count-full" : "cs-count"}>
            {listed.pending} waiting of at most {listed.pendingAtMost}
          </span>
        )}
      </div>
      <div className="cs-list">
        {listed?.cases.length === 0 && <p className="cs-empty">No call of {agent} has broken a judge yet. When one does, it lands here on its own, at hang-up.</p>}
        {listed !== null &&
          GROUPS.map(({ status, title }) => {
            const these = listed.cases.filter((kept) => kept.status === status);
            return these.length === 0 ? null : (
              <section key={status} className="cs-group">
                <h2 className="cs-group-title">
                  {title} <span className="cs-group-count">{these.length}</span>
                </h2>
                {these.map(row)}
              </section>
            );
          })}
        {listed === null && <p className="cs-empty">{asking ?? "Asking the gateway…"}</p>}
      </div>
      {listed !== null && listed.pending >= listed.pendingAtMost && (
        <p className="cs-foot cs-bad">The inbox is full: a call that breaks now is judged as ever and not kept, until you decide some of these.</p>
      )}
    </aside>
  );
}

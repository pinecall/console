/** The left side: the agent's callers, by name. */

import type { ReactNode } from "react";
import { Link } from "react-router";

import { Button } from "../../ui";
import type { Persona } from "./door";

export function RosterSide({
  agent,
  personas,
  asking,
  open,
  onNew,
}: {
  agent: string;
  personas: Persona[] | null;
  asking: string | null;
  open: string | undefined;
  onNew: () => void;
}): ReactNode {
  const row = (one: Persona): ReactNode => (
    <Link key={one.name} to={`/a/${encodeURIComponent(agent)}/personas/${encodeURIComponent(one.name)}`} className={one.name === open ? "psn-row psn-row-on" : "psn-row"}>
      <span className="psn-row-top">
        <span className="psn-row-name">{one.name}</span>
      </span>
      <span className="psn-row-sub">{one.about !== "" ? one.about : one.goal}</span>
    </Link>
  );
  return (
    <aside className="psn-side" aria-label={`${agent}'s personas`}>
      <div className="psn-side-head">
        <div className="psn-titles">
          <span className="psn-title">Personas</span>
          <span className="psn-count">{personas === null ? "" : personas.length}</span>
        </div>
        <p className="psn-lede">
          The callers a model plays against {agent}, in Simulations and in <code>pinecall simulate</code>.
        </p>
        <Button size="sm" kind="primary" onClick={onNew}>
          New persona
        </Button>
      </div>
      <div className="psn-list">
        {personas?.map(row)}
        {personas !== null && personas.length === 0 && asking === null && (
          <p className="psn-empty">No caller is written for {agent} yet. Write one: somebody who calls this business wanting something.</p>
        )}
        {personas === null && <p className="psn-empty">{asking ?? "Asking the gateway…"}</p>}
      </div>
      {asking !== null && personas !== null && <p className="psn-empty psn-bad">{asking}</p>}
      <p className="psn-foot">Kept by the gateway, one list for {agent} in both worlds: another agent of the org has callers of its own.</p>
    </aside>
  );
}

/** The left side: the callers written for the agent in view, or for every agent under each one's name. */

import type { ReactNode } from "react";
import { Link } from "react-router";

import { ownedAt, whoseIs } from "../../lib/harness";
import { Avatar, Button } from "../../ui";
import type { Persona } from "./door";

export function RosterSide({
  agent,
  personas,
  asking,
  open,
  onNew,
}: {
  /** The agent in view, or "" for every agent. */
  agent: string;
  personas: Persona[] | null;
  asking: string | null;
  /** The caller open, by its agent and its name. */
  open: Pick<Persona, "agent" | "name"> | undefined;
  onNew: () => void;
}): ReactNode {
  const whose = whoseIs(agent);
  const row = (one: Persona): ReactNode => (
    <Link
      key={`${one.agent}/${one.name}`}
      to={ownedAt(agent, "personas", one.agent, one.name)}
      className={one.name === open?.name && one.agent === open.agent ? "psn-row psn-row-on" : "psn-row"}
    >
      <Avatar size={28} round name={one.name} />
      <span className="psn-row-words">
        <span className="psn-row-name">{one.name}</span>
        <span className="psn-row-sub">{one.about !== "" ? one.about : one.goal}</span>
      </span>
    </Link>
  );
  // With every agent in view the callers stand under their agent's name: a name is one agent's.
  const groups = agent === "" ? byAgent(personas ?? []) : [{ owner: agent, these: personas ?? [] }];
  return (
    <aside className="psn-side" aria-label={`${whose}'s personas`}>
      <div className="psn-side-head">
        <div className="psn-titles">
          <span className="psn-title">Personas</span>
          <span className="psn-count">{personas === null ? "" : personas.length}</span>
        </div>
        <p className="psn-lede">
          The callers a model plays against {whose}, in Simulations and in <code>pinecall simulate</code>.
        </p>
        <Button size="sm" kind="primary" onClick={onNew}>
          New persona
        </Button>
      </div>
      <div className="psn-list">
        {groups.map(({ owner, these }) => (
          <section key={owner} className="psn-group">
            {agent === "" && <h2 className="psn-group-title">{owner}</h2>}
            {these.map(row)}
          </section>
        ))}
        {personas !== null && personas.length === 0 && asking === null && (
          <p className="psn-empty">No caller is written for {whose} yet. Write one: somebody who calls this business wanting something.</p>
        )}
        {personas === null && <p className="psn-empty">{asking ?? "Asking the gateway…"}</p>}
      </div>
      {asking !== null && personas !== null && <p className="psn-empty psn-bad">{asking}</p>}
      <p className="psn-foot">Kept by the gateway, one list per agent in both worlds: another agent of the org has callers of its own.</p>
    </aside>
  );
}

function byAgent(personas: Persona[]): { owner: string; these: Persona[] }[] {
  const owners = [...new Set(personas.map((one) => one.agent))];
  return owners.map((owner) => ({ owner, these: personas.filter((one) => one.agent === owner) }));
}

/** Personas: the callers down the left — the agent in view's, or every agent's — the one chosen read, or written, beside them. */

import type { ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";

import { ownedAt, rowAt, useHarnessAgents } from "../../lib/harness";
import { usePane } from "../../ui";
import type { Persona } from "./door";
import { PersonaEditor } from "./persona-editor";
import { PersonaView } from "./persona-view";
import { Overview } from "./overview";
import { RosterSide } from "./roster";
import { RunsSide } from "./runs-side";
import { usePersonas } from "./use-personas";
import { useRunStandings } from "./use-run-standings";
import "./personas.css";

/**
 * One screen whoever is in view. A caller is written to test ONE agent — the patient who cancels is
 * the clinic's — and the gateway keeps them so (`/v1/agents/<agent>/personas`); with every agent in
 * view the roster is every agent's (`/v1/personas`), each under its agent's name. The URL says which
 * one is open: `/a/<agent>/personas/<name>`, or `/personas/<agent>/<name>` with every agent in view;
 * `?edit=1` that one being written, `?new=1` a new one. What this page writes is what `pinecall
 * simulate --persona` finds, in every console, with no deploy between.
 */
export function Personas(): ReactNode {
  const params = useParams();
  const agent = params["agent"] ?? "";
  const owner = params["owner"] ?? agent;
  const named = params["call"];
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const pane = usePane({ name: "personas.list", initial: 320, min: 260, max: 480, side: "left" });
  // Two panes on one screen, each on its own element: `--pane` is set per grid, and the inner one
  // is the runs'. The floor does the same with the call it watches.
  const runs = usePane({ name: "personas.runs", initial: 340, min: 280, max: 560, side: "right" });
  const { personas: kept, asking, setPersonas, reread } = usePersonas(agent);
  // With every agent in view, the org's agents' callers: the ones Viewing offers, and no other slug.
  const theOrgs = useHarnessAgents(agent);
  const personas = kept === null || theOrgs === null ? null : kept.filter((one) => theOrgs.includes(one.agent));
  // What every caller has done, read once here for the overview's standing.
  const standings = useRunStandings(personas);
  const adding = search.get("new") === "1";
  const editing = search.get("edit") === "1";
  const chosen = named === undefined ? undefined : personas?.find((one) => one.agent === owner && one.name === named);
  // The caller being READ, which is the only state the runs pane stands beside.
  const reading = chosen !== undefined && !adding && !editing ? chosen : null;
  // Whom a new caller may be written for: the agent in view, or any agent of the org.
  const owners = [...(theOrgs ?? [])].sort();

  const go = (persona: Pick<Persona, "agent" | "name"> | null, how: "" | "edit" | "new" = ""): void => {
    const asked = how === "" ? "" : `?${how}=1`;
    void navigate(`${persona === null ? rowAt(agent, "personas") : ownedAt(agent, "personas", persona.agent, persona.name)}${asked}`);
  };
  // A write answers with its agent's list: one agent in view takes it whole, every agent reads all again.
  const saved = (read: Persona[], written: Pick<Persona, "agent" | "name">): void => {
    if (agent === "") reread();
    else setPersonas(read);
    go(written);
  };

  return (
    <div className="psn" style={pane.style}>
      {pane.handle}
      <RosterSide agent={agent} personas={personas} asking={asking} open={chosen} onNew={() => go(null, "new")} />
      {/* The runs stand beside a caller being READ: while the form is open the screen is about
          writing one, and the pane would only squeeze the fields. */}
      <div className={reading === null ? "psn-right" : "psn-right psn-right-runs"} style={runs.style}>
        {reading !== null && runs.handle}
        <main className="psn-main">
          {adding ? (
            <PersonaEditor key="new" owners={owners} was={undefined} onSaved={saved} onCancel={() => go(chosen ?? null)} />
          ) : chosen === undefined ? (
            <Overview agent={agent} personas={personas ?? []} standings={standings} onNew={() => go(null, "new")} />
          ) : editing ? (
            <PersonaEditor key={`${chosen.agent}/${chosen.name}`} owners={[chosen.agent]} was={chosen} onSaved={saved} onCancel={() => go(chosen)} />
          ) : (
            <PersonaView
              key={`${chosen.agent}/${chosen.name}`}
              inView={agent}
              persona={chosen}
              onEdit={() => go(chosen, "edit")}
              onDropped={(read) => {
                if (agent === "") reread();
                else setPersonas(read);
                go(null);
              }}
            />
          )}
        </main>
        {reading !== null && <RunsSide key={`${reading.agent}/${reading.name}`} inView={agent} persona={reading} />}
      </div>
    </div>
  );
}

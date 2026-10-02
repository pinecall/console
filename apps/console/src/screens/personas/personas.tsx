/** Personas: the agent's callers down the left, the one chosen read — or written — beside them. */

import type { ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";

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
 * The screen, under one agent. A caller is written to test ONE agent — the patient who cancels is
 * the clinic's — and the gateway keeps them so (`/v1/agents/<agent>/personas`). The URL says which
 * one is open:
 * `/a/<agent>/personas/<name>` the one read, `?edit=1` that one being written, `?new=1` a new one.
 * What this page writes is what `pinecall simulate --persona` finds, in every console, with no
 * deploy between.
 */
export function Personas(): ReactNode {
  const agent = useParams()["agent"] ?? "";
  const base = `/a/${encodeURIComponent(agent)}`;
  const named = useParams()["call"];
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const pane = usePane({ name: "personas.list", initial: 320, min: 260, max: 480, side: "left" });
  // Two panes on one screen, each on its own element: `--pane` is set per grid, and the inner one
  // is the runs'. The floor does the same with the call it watches.
  const runs = usePane({ name: "personas.runs", initial: 340, min: 280, max: 560, side: "right" });
  const { personas, asking, setPersonas } = usePersonas(agent);
  // What every caller has done, read once here for the overview's standing.
  const standings = useRunStandings(agent, personas === null ? null : personas.map((one) => one.name));
  const adding = search.get("new") === "1";
  const editing = search.get("edit") === "1";
  const open = named ?? undefined;
  const chosen = personas?.find((one) => one.name === open);
  // The caller being READ, which is the only state the runs pane stands beside.
  const reading = chosen !== undefined && !adding && !editing ? chosen : null;

  const go = (name: string | null, how: "" | "edit" | "new" = ""): void => {
    const asked = how === "" ? "" : `?${how}=1`;
    void navigate(`${base}/personas${name === null ? "" : `/${encodeURIComponent(name)}`}${asked}`);
  };
  const saved = (read: Persona[], name: string): void => {
    setPersonas(read);
    go(name);
  };

  return (
    <div className="psn" style={pane.style}>
      {pane.handle}
      <RosterSide agent={agent} personas={personas} asking={asking} open={chosen?.name} onNew={() => go(null, "new")} />
      {/* The runs stand beside a caller being READ: while the form is open the screen is about
          writing one, and the pane would only squeeze the fields. */}
      <div className={reading === null ? "psn-right" : "psn-right psn-right-runs"} style={runs.style}>
        {reading !== null && runs.handle}
        <main className="psn-main">
          {adding ? (
            <PersonaEditor key="new" agent={agent} was={undefined} onSaved={saved} onCancel={() => go(open ?? null)} />
          ) : chosen === undefined ? (
            <Overview agent={agent} personas={personas ?? []} standings={standings} onNew={() => go(null, "new")} />
          ) : editing ? (
            <PersonaEditor key={chosen.name} agent={agent} was={chosen} onSaved={saved} onCancel={() => go(chosen.name)} />
          ) : (
            <PersonaView
              key={chosen.name}
              agent={agent}
              persona={chosen}
              onEdit={() => go(chosen.name, "edit")}
              onDropped={(read) => {
                setPersonas(read);
                go(null);
              }}
            />
          )}
        </main>
        {reading !== null && <RunsSide key={reading.name} agent={agent} persona={reading} />}
      </div>
    </div>
  );
}

/** Simulations: the form down the left, the simulated call beside it — heard live, both sides, and read as it happens. */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";

import { useListen } from "@pinecall/core/use-listen";
import { useSupervise } from "@pinecall/core/use-supervise";
import { useScopes } from "../../lib/whoami";
import { Button, usePane } from "../../ui";
import { SimulateForm } from "./simulate-form";
import { usePersonas } from "../personas/use-personas";
import { Call } from "../call";
import "./simulations.css";

/**
 * The screen, under one agent: a simulation is started from the form and watched right here. The
 * URL names the call (`/a/<agent>/simulations/<call>?spoken=1`), so a reload lands on the same
 * call. A spoken one is heard the moment its room opens — the caller the model plays and the
 * agent, one ear on both.
 */
export function Simulations(): ReactNode {
  const agent = useParams()["agent"] ?? "";
  const call = useParams()["call"];
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const pane = usePane({ name: "simulations.form", initial: 340, min: 280, max: 520, side: "left" });
  const spoken = search.get("spoken") === "1";
  const preferred = search.get("persona") ?? undefined;
  // The form offers the agent's own callers: a persona is one agent's.
  const { personas, asking } = usePersonas(agent);

  const started = (next: string, voice: boolean): void => {
    void navigate(`/a/${encodeURIComponent(agent)}/simulations/${next}${voice ? "?spoken=1" : ""}`);
  };

  return (
    <div className="sims" style={pane.style}>
      {pane.handle}
      <aside className="sims-side" aria-label="start a simulation">
        <SimulateForm agent={agent} personas={personas} asking={asking} preferred={preferred} onStarted={started} />
        <p className="sims-note">
          A model plays the persona against the agent, improvising every line from its goal, its manner and its own facts. With Voice on,
          the call is a real line and you hear both of them here as it happens.
        </p>
      </aside>
      {call === undefined ? (
        <div className="sims-nothing">Pick an agent and a persona, then call. The simulation opens here, and you hear it live.</div>
      ) : (
        <div className="sims-watch" key={call}>
          {spoken && <Ear call={call} />}
          {/* The desk belongs to a supervisor on somebody's real call: whisper, say, take the
              line, transfer. Nobody is on this one — a model is playing both ends — so the screen
              is the transcript and the one move it has, which is to stop the thing. */}
          <Call call={call} agent={agent} supervised={false} beside={(over) => <Stop call={call} spoken={spoken} over={over} />} />
        </div>
      )}
    </div>
  );
}

// Stopping a simulation is hanging its call up, and there is no second door for it: the persona
// is played in the gateway off this call's own log, and `call.ended` is where it learns to stop
// talking (runtime api/evals/voice.py). So the agent, the app and this button all stop it alike.
/** The one move this screen has on a running simulation: end the call, and the caller with it. */
function Stop({ call, spoken, over }: { call: string; spoken: boolean; over: boolean }): ReactNode {
  const scopes = useScopes();
  const desk = useSupervise(call, spoken);
  const [stopping, setStopping] = useState(false);

  if (over) return <span className="sims-stopped">the simulation is over</span>;
  // Hanging a call up is a supervisor's verb wherever it is pressed, and `qa` is the one role that
  // runs simulations without that scope: it is told so, rather than handed a button the gateway
  // answers 403 to.
  if (scopes !== null && !scopes.includes("supervise")) {
    return <span className="sims-stopped">a key that supervises stops a simulation</span>;
  }
  // A refusal puts the button back: the call is still running and the person may try again.
  const sent = stopping && desk.error === null;
  return (
    <>
      <Button
        size="sm"
        kind="danger"
        disabled={sent}
        onClick={() => {
          setStopping(true);
          void desk.end();
        }}
      >
        {sent ? "Stopping…" : "Stop"}
      </Button>
      {desk.error !== null && <span className="sims-refused">{desk.error}</span>}
    </>
  );
}

// A spoken simulation's room opens a moment after the call has its id, so the ear knocks again
// until it is in, and a call that ended before it ever got in stops knocking.
const KNOCK_MS = 1000;
const KNOCKS = 30;

/** One ear on the whole room, the caller's track and the agent's, joined and unmuted on its own. */
function Ear({ call }: { call: string }): ReactNode {
  const ear = useListen(call);
  const knocks = useRef(0);
  const inside = useRef(false);

  useEffect(() => {
    if (ear.listening === "off" && !inside.current && knocks.current === 0) {
      knocks.current = 1;
      void ear.join();
    }
    if (ear.listening === "failed" && !inside.current && knocks.current < KNOCKS) {
      const again = window.setTimeout(() => {
        knocks.current += 1;
        void ear.join();
      }, KNOCK_MS);
      return () => window.clearTimeout(again);
    }
    // In the room: heard at once — this screen is for listening, not for reading first.
    if (ear.listening === "muted" && !inside.current) {
      inside.current = true;
      ear.hear(true);
    }
    return undefined;
  }, [ear]);

  const said = ((): string => {
    switch (ear.listening) {
      case "on":
        return "Listening live · the caller and the agent";
      case "muted":
        return "Muted";
      case "joining":
        return "Joining the call…";
      case "failed":
        return knocks.current < KNOCKS ? "Waiting for the call's room to open…" : `Could not join the call: ${ear.error ?? "no room"}`;
      case "off":
        return inside.current ? "The call is over" : "Joining the call…";
    }
  })();

  return (
    <div className="sims-ear" role="status">
      <span className={ear.listening === "on" ? "sims-ear-dot sims-ear-dot-on" : "sims-ear-dot"} />
      <span className="sims-ear-said">{said}</span>
      {ear.listening === "on" && (
        <Button size="sm" pill onClick={() => ear.hear(false)}>
          Mute
        </Button>
      )}
      {ear.listening === "muted" && (
        <Button size="sm" pill onClick={() => ear.hear(true)}>
          Unmute
        </Button>
      )}
    </div>
  );
}

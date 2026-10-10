/** The simulate form: pick the agent and a persona, choose the line, and put a synthetic caller on it. */

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";

import { ownedAt, rowAt } from "../../lib/harness";

import { GatewayError } from "@pinecall/core/api";
import { useCredentials } from "@pinecall/core/credentials";
import { Button, Check, Field, Input, Select, SelectItem } from "../../ui";
import type { Persona } from "../personas/door";
import { startSimulation } from "./simulating";
import "./simulate.css";

// How many turns a caller improvises when nobody said: the same fifteen `pinecall simulate` uses.
// Six was the length of a walkthrough and not of a call — a booking that settles an address, takes
// the property, the size, the condition, a day and a window and then confirms is past six turns
// before it has begun, so every simulation tested the opening of an agent and the end of none.
const TURNS = 15;

// The television behind the caller at the level the hearing calls measured, and no packets lost:
// the same defaults the terminal verb has, so the two doors spoil a line the same way.
const NOISE_DB = 15;
const LOSS_PERCENT = 0;

/**
 * The form. It asks the process holding the agent, through the gateway: a simulation mounts the
 * class of the directory `pinecall start` runs in, so only that process can start one. The call is
 * answered by its id, handed to the screen, which watches and plays it.
 */
export function SimulateForm({
  inView,
  agents,
  agent,
  onAgent,
  personas,
  asking,
  preferred,
  onStarted,
}: {
  /** The agent in view, or "" for every agent: with one in view, the form's agent is it. */
  inView: string;
  /** The agents a caller may be put on: the ones a process holds right now. */
  agents: readonly string[];
  /** The agent the caller is put on; "" while none is picked. */
  agent: string;
  onAgent: (agent: string) => void;
  /** The agent's callers, as the screen read them; null while asked or refused. */
  personas: Persona[] | null;
  /** Why there are none yet: still asking, or the refusal in the gateway's words. */
  asking: string | null;
  /** The persona to start on, when the page was opened for one (Personas' "Use in a simulation"). */
  preferred?: string | undefined;
  /** Told the call's id the moment it has one, and whether it is on a spoken line. */
  onStarted: (call: string, spoken: boolean) => void;
}): ReactNode {
  const credentials = useCredentials();
  const [persona, setPersona] = useState("");
  // The screen is for listening: a spoken line unless somebody wants a written one.
  const [voice, setVoice] = useState(true);
  const [judge, setJudge] = useState(false);
  const [turns, setTurns] = useState(TURNS);
  const [noise, setNoise] = useState(NOISE_DB);
  const [loss, setLoss] = useState(LOSS_PERCENT);
  const [spoiled, setSpoiled] = useState(false);
  const [starting, setStarting] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  // The personas change under the form — written, renamed, dropped — so the pick follows them.
  const names = personas?.map((one) => one.name).join("\n") ?? "";
  useEffect(() => {
    const listed = names === "" ? [] : names.split("\n");
    if (listed.includes(persona)) return;
    setPersona(preferred !== undefined && listed.includes(preferred) ? preferred : (listed[0] ?? ""));
  }, [names, persona, preferred]);

  const chosen = personas?.find((one) => one.name === persona);
  const why = whyNot(personas);

  const start = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setStarting(true);
    setRefused(null);
    try {
      const call = await startSimulation(credentials, {
        agent,
        persona,
        voice,
        judge,
        turns,
        ...(voice && spoiled ? { background_noise: noise, packet_loss: loss } : {}),
      });
      onStarted(call, voice);
    } catch (failed) {
      setRefused(failed instanceof GatewayError ? failed.message : String(failed));
    } finally {
      setStarting(false);
    }
  };

  return (
    <form className="sim" onSubmit={(event) => void start(event)}>
      <div className="sim-head">
        <span className="sim-title">Simulate a caller</span>
      </div>
      <Field label="Agent">
        <Select size="sm" aria-label="Agent" value={agent} disabled={inView !== ""} placeholder="Pick the agent it rings" onValueChange={(value) => onAgent(value)}>
          {(agents.includes(agent) || agent === "" ? agents : [agent, ...agents]).map((one) => (
            <SelectItem key={one} value={one}>
              {one}
            </SelectItem>
          ))}
        </Select>
      </Field>
      {agent === "" && <p className="sim-note">{agents.length === 0 ? "No agent is held right now: start one with pinecall start, and it is listed here." : "Pick the agent the caller rings."}</p>}
      {agent !== "" && personas === null && asking !== null && <p className="sim-note">{asking}</p>}
      {agent !== "" && why !== null && <p className="sim-note">{why}</p>}
      {agent !== "" && personas !== null && why === null && (
        <>
          <Field
            label={
              <span className="sim-label-row">
                Persona
                <Link className="sim-manage" to={persona === "" ? rowAt(inView, "personas") : ownedAt(inView, "personas", agent, persona)}>
                  Manage
                </Link>
              </span>
            }
          >
            <Select size="sm" aria-label="Persona" value={persona} onValueChange={(value) => setPersona(value)}>
              {personas.map((one) => (
                <SelectItem key={one.name} value={one.name}>
                  {one.name}
                </SelectItem>
              ))}
            </Select>
          </Field>
          {chosen !== undefined && <p className="sim-note">Goal: {chosen.goal}</p>}
          <div className="sim-pair">
            <Field label="Max turns">
              <Input size="sm" type="number" aria-label="Max turns" min={1} max={30} value={turns} onChange={(event) => setTurns(Number(event.target.value))} />
              <p className="sim-aside sim-under">the lines the caller says; the agent answers each one</p>
            </Field>
            {voice && spoiled && (
              <Field label="Noise, dB under">
                <Input size="sm" type="number" aria-label="Noise, dB under" min={0} max={60} value={noise} onChange={(event) => setNoise(Number(event.target.value))} />
              </Field>
            )}
            {voice && spoiled && (
              <Field label="Packets lost, %">
                <Input size="sm" type="number" aria-label="Packets lost, %" min={0} max={100} value={loss} onChange={(event) => setLoss(Number(event.target.value))} />
              </Field>
            )}
          </div>
          <div className="sim-checks">
            <Option on={voice} onChange={setVoice} name="Voice" says="a real line, and you can listen" />
            <Option on={judge} onChange={setJudge} name="Judge at hang-up" says="the panel scores the call the moment it ends" />
            {voice && <Option on={spoiled} onChange={setSpoiled} name="Noisy line" says="a TV behind the caller, packets lost" />}
          </div>
          <Button type="submit" kind="primary" size="md" disabled={starting || persona === ""}>
            {starting ? "Calling…" : "Call the agent"}
          </Button>
        </>
      )}
      {refused !== null && <p className="sim-refused">{refused}</p>}
    </form>
  );
}

// One switch on the form: the name on its own line, and the sentence that says what it does under
// it. The sentence used to sit beside the name, which in a pane this narrow broke the name itself.
function Option({ on, onChange, name, says }: { on: boolean; onChange: (on: boolean) => void; name: string; says: string }): ReactNode {
  return (
    <div className="sim-check">
      <Check checked={on} onChange={onChange}>
        {name}
      </Check>
      <p className="sim-aside">{says}</p>
    </div>
  );
}

// The one answer that is not "here are the callers": nobody has written one for this agent yet.
function whyNot(personas: Persona[] | null): string | null {
  if (personas === null) return null;
  return personas.length === 0 ? "No personas yet: write the first caller in Personas." : null;
}

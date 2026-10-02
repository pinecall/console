/** One persona, read: who they are, what they want, how they talk, what they know — and what to do with them. */

import { useState, type ReactNode } from "react";

import { GatewayError } from "@pinecall/core/api";
import { useCredentials } from "@pinecall/core/credentials";
import { Button, ButtonLink } from "../../ui";
import { dayAndTime } from "../../lib/format";
import { dropPersona, type Persona } from "./door";

// Unset is the runtime's choice, which is not the same as nothing: it picks the model, and a voice
// the agent does not have.
const THE_RUNTIMES = "the runtime's choice";

export function PersonaView({
  agent,
  persona,
  onEdit,
  onDropped,
}: {
  /** The agent this screen is under: where "Use in a simulation" puts the caller. */
  agent: string;
  persona: Persona;
  onEdit: () => void;
  onDropped: (personas: Persona[]) => void;
}): ReactNode {
  const credentials = useCredentials();
  // Delete asks twice: the file goes, and a persona nobody committed yet has no other copy.
  const [armed, setArmed] = useState(false);
  // The confirm is disarmed and the button shut the moment the door is knocked at, so the second
  // press of an impatient double-click — or of a slow answer — cannot send a second DELETE.
  const [dropping, setDropping] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const facts = Object.entries(persona.facts);

  const drop = async (): Promise<void> => {
    if (dropping) return;
    setDropping(true);
    setArmed(false);
    setRefused(null);
    try {
      onDropped(await dropPersona(credentials, agent, persona.name));
    } catch (failed) {
      setRefused(failed instanceof GatewayError ? failed.message : String(failed));
      setDropping(false);
    }
  };

  return (
    <article className="psn-doc">
      <header className="psn-doc-head">
        <div>
          <h1 className="psn-doc-name">{persona.name}</h1>
          {persona.about !== "" && <p className="psn-doc-about">{persona.about}</p>}
        </div>
        <div className="psn-doc-actions">
          <ButtonLink kind="primary" size="sm" to={`/a/${encodeURIComponent(agent)}/simulations?persona=${encodeURIComponent(persona.name)}`}>
            Use in a simulation
          </ButtonLink>
          <Button size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button size="sm" kind="danger" disabled={dropping} onClick={() => (armed ? void drop() : setArmed(true))} onBlur={() => setArmed(false)}>
            {dropping ? "Deleting…" : armed ? "Delete · sure?" : "Delete"}
          </Button>
        </div>
      </header>

      <Section title="What they want" hint="The goal the model pursues on every turn, until it has it or sees it will not.">
        <p className="psn-doc-text">{persona.goal}</p>
      </Section>
      <Section title="How they talk" hint="The manner: hurried, polite, switching language mid-sentence. It shapes every line, not what they ask for.">
        <p className="psn-doc-text">{persona.style}</p>
      </Section>
      <Section title="When they accept the call" hint="Their own rule. A judge named persona reads every call of theirs against it at hang-up; the model playing them is never told it.">
        {persona.accepts_when === "" && persona.declines_when === "" ? (
          <p className="psn-doc-none">No rule: nobody judges whether this caller got what it came for.</p>
        ) : (
          <dl className="psn-facts">
            {persona.accepts_when !== "" && (
              <div className="psn-fact">
                <dt>accepts when</dt>
                <dd>{persona.accepts_when}</dd>
              </div>
            )}
            {persona.declines_when !== "" && (
              <div className="psn-fact">
                <dt>declines when</dt>
                <dd>{persona.declines_when}</dd>
              </div>
            )}
          </dl>
        )}
      </Section>
      <Section title="How they are played" hint="The model that improvises them and the voice their lines are read in, in an agent's own words.">
        <dl className="psn-facts">
          {(
            [
              ["model", persona.llm],
              ["voice vendor", persona.tts],
              ["voice", persona.voice],
            ] as const
          ).map(([what, said]) => (
            <div key={what} className="psn-fact">
              <dt>{what}</dt>
              <dd>{said ?? THE_RUNTIMES}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="What they know about themselves" hint="The only facts they may state. Asked for anything else, they say they do not know — they never invent.">
        {facts.length === 0 ? (
          <p className="psn-doc-none">Nothing: this caller states no fact about themselves.</p>
        ) : (
          <dl className="psn-facts">
            {facts.map(([what, said]) => (
              <div key={what} className="psn-fact">
                <dt>{what}</dt>
                <dd>{said}</dd>
              </div>
            ))}
          </dl>
        )}
      </Section>

      <footer className="psn-doc-foot">
        <span className="psn-doc-note">
          {persona.author === "" ? "Kept by the gateway." : `Last written by ${persona.author}, ${dayAndTime(persona.set_at)}.`}
          {Object.keys(persona.state).length > 0 && " It opens the call in a state, written from a project."}
        </span>
      </footer>
      {refused !== null && <p className="psn-refused">{refused}</p>}
    </article>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }): ReactNode {
  return (
    <section className="psn-sec">
      <h2 className="psn-sec-title">{title}</h2>
      <p className="psn-sec-hint">{hint}</p>
      {children}
    </section>
  );
}

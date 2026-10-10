/** Persona editor form. */

import { useState, type ReactNode } from "react";

import { GatewayError } from "@pinecall/core/api";
import { useCredentials } from "@pinecall/core/credentials";
import { Button, Input, Select, SelectItem, TextArea } from "../../ui";
import { writePersona, type Persona, type Written } from "./door";

// Same rule as `pinecall simulate --persona` and the gateway.
const A_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Text fields; empty means unset (runtime default or no rule). */
type Worded = "about" | "goal" | "style" | "llm" | "tts" | "voice" | "accepts_when" | "declines_when";

export function PersonaEditor({
  owners,
  was,
  onSaved,
  onCancel,
}: {
  /** Whom the caller may be written for: one agent, or — every agent in view, a new caller — the org's. */
  owners: readonly string[];
  /** The persona being changed; undefined for a new one. */
  was: Persona | undefined;
  onSaved: (personas: Persona[], written: Pick<Persona, "agent" | "name">) => void;
  onCancel: () => void;
}): ReactNode {
  const credentials = useCredentials();
  const [agent, setAgent] = useState(was?.agent ?? owners[0] ?? "");
  // The name goes in the path, the rest in the body.
  const [name, setName] = useState(was?.name ?? "");
  const [written, setWritten] = useState<Written>(() =>
    was === undefined
      ? { about: "", goal: "", style: "", facts: {}, llm: "", tts: "", voice: "", accepts_when: "", declines_when: "" }
      : {
          about: was.about,
          goal: was.goal,
          style: was.style,
          facts: was.facts,
          llm: was.llm ?? "",
          tts: was.tts ?? "",
          voice: was.voice ?? "",
          accepts_when: was.accepts_when,
          declines_when: was.declines_when,
        },
  );
  // A new persona starts with one empty fact row.
  const [facts, setFacts] = useState<[string, string][]>(() => {
    const rows = Object.entries(written.facts ?? {});
    return rows.length > 0 ? rows : [["", ""]];
  });
  const [saving, setSaving] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  const set = (field: Worded, value: string): void => setWritten({ ...written, [field]: value });
  const setFact = (at: number, row: [string, string]): void => setFacts(facts.map((one, index) => (index === at ? row : one)));
  const nameOk = A_NAME.test(name);
  const ready = agent !== "" && nameOk && written.goal.trim() !== "" && written.style.trim() !== "";

  const save = async (): Promise<void> => {
    setSaving(true);
    setRefused(null);
    try {
      const kept = Object.fromEntries(facts.filter(([what]) => what.trim() !== "").map(([what, said]) => [what.trim(), said.trim()]));
      // Preserve `state` even though the form cannot edit it.
      const body: Written = { ...written, facts: kept, state: was?.state ?? {}, ...(was === undefined || was.name === name ? {} : { was: was.name }) };
      onSaved(await writePersona(credentials, agent, name, body), { agent, name });
    } catch (failed) {
      setRefused(failed instanceof GatewayError ? failed.message : String(failed));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="psn-doc psn-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) void save();
      }}
    >
      <header className="psn-doc-head">
        <div>
          <h1 className="psn-doc-name">{was === undefined ? "New persona" : `Editing ${was.name}`}</h1>
          <p className="psn-doc-about">
            Kept by the gateway for {agent === "" ? "the agent you pick" : agent}: for this console and for <code>pinecall simulate --persona {name || "<name>"}</code>.
          </p>
        </div>
      </header>

      {owners.length > 1 && (
        <Row title="Agent" hint="The agent this caller rings: a persona is written to test one agent, and only that agent's simulations play it.">
          <Select aria-label="Agent" value={agent} onValueChange={(value) => setAgent(value)}>
            {owners.map((one) => (
              <SelectItem key={one} value={one}>
                {one}
              </SelectItem>
            ))}
          </Select>
        </Row>
      )}
      <Row title="Name" hint="What pinecall simulate --persona takes, and how the list names them. Lower-case words joined by hyphens.">
        <Input value={name} spellCheck={false} aria-label="Name" placeholder="price-shopper" onChange={(event) => setName(event.target.value.toLowerCase().replace(/\s+/g, "-"))} />
        {name !== "" && !nameOk && <p className="psn-bad">Only a–z, 0–9 and single hyphens between words.</p>}
      </Row>
      <Row title="Who they are" hint="One line for people reading the list. The model is not told it.">
        <Input value={written.about ?? ""} aria-label="Who they are" placeholder="A landlord who only wants a number" onChange={(event) => set("about", event.target.value)} />
      </Row>
      <Row title="What they want" hint="The goal the model pursues on every turn. Say it the way the caller would: specific, with the deadline if there is one.">
        <TextArea rows={3} value={written.goal} aria-label="What they want" placeholder="get a price for a deep clean of a three bedroom house before Friday" onChange={(event) => set("goal", event.target.value)} />
      </Row>
      <Row title="How they talk" hint="The manner, not the content: hurried, polite, suspicious, switches into Spanish, answers only what is asked.">
        <TextArea rows={2} value={written.style} aria-label="How they talk" placeholder="blunt, impatient, keeps asking for the price" onChange={(event) => set("style", event.target.value)} />
      </Row>
      <Row
        title="They accept the call when"
        hint="What has to have happened for them to hang up satisfied. A judge named persona reads every call of theirs against it at hang-up — the model playing them is never told it."
      >
        <TextArea rows={2} value={written.accepts_when ?? ""} aria-label="They accept the call when" placeholder="they were given a price and a day this week" onChange={(event) => set("accepts_when", event.target.value)} />
      </Row>
      <Row title="They decline it when" hint="What on the call makes them hang up unsatisfied. Leave both empty and no judge reads their calls for it.">
        <TextArea rows={2} value={written.declines_when ?? ""} aria-label="They decline it when" placeholder="they were asked to call back, or nobody could say the price" onChange={(event) => set("declines_when", event.target.value)} />
      </Row>
      <Row
        title="How they are played"
        hint="The same three words as an agent's settings: the model that improvises them, the vendor that reads their lines, the voice. Empty is the runtime's choice — its default model, a voice the agent does not have. A name this box does not have is refused on save."
      >
        <div className="psn-knobs">
          <Input size="sm" value={written.llm ?? ""} spellCheck={false} aria-label="Model" placeholder="anthropic/claude-haiku-5-5" onChange={(event) => set("llm", event.target.value.trim())} />
          <Input size="sm" value={written.tts ?? ""} spellCheck={false} aria-label="Voice vendor" placeholder="elevenlabs" onChange={(event) => set("tts", event.target.value.trim())} />
          <Input size="sm" value={written.voice ?? ""} spellCheck={false} aria-label="Voice" placeholder="carolina, or the vendor's own id" onChange={(event) => set("voice", event.target.value.trim())} />
        </div>
      </Row>
      <Row title="What they know about themselves" hint="The only facts they may state — asked for anything else, they say they do not know. One per row: what it is, and what they say.">
        <div className="psn-fact-rows">
          {facts.map(([what, said], at) => (
            <div className="psn-fact-row" key={at}>
              <Input size="sm" value={what} placeholder="their phone" aria-label="what it is" onChange={(event) => setFact(at, [event.target.value, said])} />
              <Input size="sm" value={said} placeholder="305 555 0101" aria-label="what they say" onChange={(event) => setFact(at, [what, event.target.value])} />
              <button type="button" className="psn-x" aria-label="remove this fact" onClick={() => setFacts(facts.filter((_, index) => index !== at))}>
                ×
              </button>
            </div>
          ))}
          <button type="button" className="psn-add" onClick={() => setFacts([...facts, ["", ""]])}>
            + Add a fact
          </button>
        </div>
      </Row>

      <footer className="psn-form-foot">
        <Button type="submit" kind="primary" disabled={!ready || saving}>
          {saving ? "Saving…" : was === undefined ? "Create persona" : "Save"}
        </Button>
        <Button type="button" onClick={onCancel}>
          Cancel
        </Button>
        {!ready && <span className="psn-form-need">A name, what they want and how they talk are needed.</span>}
      </footer>
      {refused !== null && <p className="psn-refused">{refused}</p>}
    </form>
  );
}

function Row({ title, hint, children }: { title: string; hint: string; children: ReactNode }): ReactNode {
  return (
    <div className="psn-field">
      <div className="psn-field-words">
        <span className="psn-sec-title">{title}</span>
        <span className="psn-sec-hint">{hint}</span>
      </div>
      <div className="psn-field-input">{children}</div>
    </div>
  );
}

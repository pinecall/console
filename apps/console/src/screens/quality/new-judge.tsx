/** The form a judge is written in, the org's or an agent's own: a name, the question, and when it runs. */

import { useState, type ReactNode } from "react";

import { GatewayError } from "@pinecall/core/api";
import { useCredentials } from "@pinecall/core/credentials";
import type { RunsOn } from "@pinecall/core/wire/rest-evals";
import { Button, Field, Input, Segmented, TextArea } from "../../ui";
import { writeJudge, type Judge, type Whose } from "./judges-door";

// The gateway's rule for the name call.score gives the verdict (runtime gateway/api/judges.py).
const A_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function NewJudge({ whose, onSaved, onClose }: { whose: Whose; onSaved: (judges: Judge[]) => void; onClose: () => void }): ReactNode {
  const credentials = useCredentials();
  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const [runsOn, setRunsOn] = useState<RunsOn>("every-call");
  const [saving, setSaving] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const nameOk = A_NAME.test(name);
  const ready = nameOk && question.trim() !== "" && !saving;

  const save = async (): Promise<void> => {
    setSaving(true);
    setRefused(null);
    try {
      onSaved(await writeJudge(credentials, whose, name, { question: question.trim(), runs_on: runsOn }));
    } catch (failed) {
      setRefused(failed instanceof GatewayError ? failed.message : String(failed));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="qly-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) void save();
      }}
    >
      <Field label="Name">
        <Input size="sm" placeholder="offers-next-slot" value={name} spellCheck={false} onChange={(event) => setName(event.target.value.toLowerCase().replace(/\s+/g, "-"))} />
        <p className="qly-hint">Lower-case words joined by hyphens, as a verdict names it in call.score. The same name again replaces the judge.</p>
        {name !== "" && !nameOk && <p className="qly-bad">Only a–z, 0–9 and single hyphens between words.</p>}
      </Field>
      <Field label="The question">
        <TextArea rows={3} placeholder={`The agent offered the next free slot before the caller asked twice.`} value={question} onChange={(event) => setQuestion(event.target.value)} />
        <p className="qly-hint">One sentence the judge model answers held or broken about the whole call, with the tool calls between the turns in front of it. {whose === null ? "Asked of every agent's calls: what any call of this business has to have done." : `About ${whose}'s job alone.`} The panel already asks what every call is held to.</p>
      </Field>
      <Field label="Runs on">
        <Segmented<RunsOn>
          options={[
            { value: "every-call", label: "every call" },
            { value: "simulations", label: "simulations only" },
          ]}
          value={runsOn}
          onChange={setRunsOn}
        />
        <p className="qly-hint">Every call is one model call per call at hang-up, under the box's judging ceiling; simulations only costs nothing on real traffic.</p>
      </Field>
      <div className="qly-form-foot">
        <Button size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" kind="primary" type="submit" disabled={!ready}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {refused !== null && <span className="qly-bad">{refused}</span>}
      </div>
    </form>
  );
}

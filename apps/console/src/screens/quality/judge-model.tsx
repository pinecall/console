/** The org's judging: on or off, and the model every agent's calls are judged on unless an agent names its own — Pinecall's, or one on the org's own key, never billed. */

import { useEffect, useState, type ReactNode } from "react";

import { GatewayError } from "@pinecall/core/api";
import { useCredentials } from "@pinecall/core/credentials";
import type { ModelConfig } from "@pinecall/core/wire/rest-org";
import { usd } from "../../lib/format";
import { Button, Card, CardHead, Field, Input, Refused, Switch, TextArea } from "../../ui";
import { readJudging, writeJudging, type JudgingSettings } from "./judges-door";

const NOT_AN_OBJECT = 'The options are not a JSON object: write them as {"base_url": "…"}, or leave the field empty.';

/** A model as one word, `vendor/model`, and its options as JSON text; both empty is Pinecall's. */
interface Typed {
  named: string;
  options: string;
}

export function JudgeModel(): ReactNode {
  const credentials = useCredentials();
  const [judging, setJudging] = useState<JudgingSettings | null>(null);
  const [typed, setTyped] = useState<Typed>({ named: "", options: "" });
  const [saving, setSaving] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [refused, setRefused] = useState<string | null>(null);

  useEffect(() => {
    let gone = false;
    readJudging(credentials).then(
      (read) => {
        if (gone) return;
        setJudging(read);
        setTyped(typedOf(read.model ?? null));
      },
      (failed: unknown) => {
        if (!gone) setRefused(failed instanceof Error ? failed.message : String(failed));
      },
    );
    return () => {
      gone = true;
    };
  }, [credentials]);

  // The PUT is whole: on and the model go together, whichever of the two changed.
  const save = async (on: boolean): Promise<void> => {
    setSaving(true);
    setSaid(null);
    setRefused(null);
    try {
      const kept = await writeJudging(credentials, { on, model: modelOf(typed) });
      setJudging(kept);
      setTyped(typedOf(kept.model ?? null));
      setSaid("Kept. The next call is judged on it.");
    } catch (failed) {
      setRefused(failed instanceof GatewayError || failed instanceof Error ? failed.message : String(failed));
    } finally {
      setSaving(false);
    }
  };

  if (judging === null) return refused === null ? null : <Refused>{refused}</Refused>;
  return (
    <Card>
      <CardHead title="Judging" meta={judging.on ? "every agent's calls are judged at hang-up" : "no call is judged at hang-up"} action={<Switch on={judging.on} label="Judging on" onChange={(on) => void save(on)} />} />
      <form
        className="qly-form"
        onSubmit={(event) => {
          event.preventDefault();
          void save(judging.on);
        }}
      >
        <Field label="The judge model">
          <Input size="sm" value={typed.named} spellCheck={false} placeholder="Pinecall's" aria-label="The judge model" onChange={(event) => setTyped({ ...typed, named: event.target.value })} />
          <p className="qly-hint">
            <code>vendor/model</code>, an agent&apos;s own in its Settings ▸ Judge winning over it. Empty is Pinecall&apos;s judge, billed per eval
            {judging.ceiling_usd === null ? "" : `, at most ${usd(judging.ceiling_usd)} of model a call`}. On your org&apos;s own key for the vendor its evals are never billed, and no ceiling of Pinecall&apos;s applies.
          </p>
        </Field>
        <Field label="Plugin options">
          <TextArea rows={2} value={typed.options} spellCheck={false} placeholder='{ "base_url": "http://your-gpu:8000/v1" }' aria-label="Plugin options" onChange={(event) => setTyped({ ...typed, options: event.target.value })} />
          <p className="qly-hint">A model on a server of your own, through base_url: on your own key alone. The judge is asked for a tool call, so the model must call tools.</p>
        </Field>
        <div className="qly-form-foot">
          <Button size="sm" kind="primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          {refused !== null ? <span className="qly-bad">{refused}</span> : said !== null && <span className="qly-hint">{said}</span>}
        </div>
      </form>
    </Card>
  );
}

function typedOf(model: ModelConfig | null): Typed {
  if (model === null) return { named: "", options: "" };
  const options = model.options ?? null;
  return { named: model.model === "" ? model.provider : `${model.provider}/${model.model}`, options: options === null ? "" : JSON.stringify(options, null, 2) };
}

// The model id keeps every slash after the vendor's: `livekit/openai/gpt-5-mini`.
function modelOf(typed: Typed): ModelConfig | null {
  const named = typed.named.trim();
  if (named === "") return null;
  const slash = named.indexOf("/");
  const model: ModelConfig = slash < 0 ? { provider: named, model: "" } : { provider: named.slice(0, slash), model: named.slice(slash + 1) };
  const options = optionsOf(typed.options);
  return options === undefined ? model : { ...model, options };
}

function optionsOf(text: string): Record<string, unknown> | undefined {
  if (text.trim() === "") return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(NOT_AN_OBJECT);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(NOT_AN_OBJECT);
  return parsed as Record<string, unknown>;
}

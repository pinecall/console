/** How a call opens and ends, and how a turn is cut: the Conversation section. */

import type { ReactNode } from "react";

import { Input, Label, Segmented, Select, SelectItem, TextArea } from "../../ui";
import { FixedByTheClass } from "./plugin";
import type { Typed } from "./typed";

const OPENINGS = [
  { value: "say", label: "Say these words" },
  { value: "reply", label: "Let the model open" },
] as const;

// The two numbers of a turn, as lists of values that run: the ears take 500 to 3000 ms of silence
// (soniox/stt.py:145), and the runtime's defaults are 1000 ms and two words.
const SILENCES = ["500", "700", "1000", "1500", "2000", "3000"];
const WORDS = ["1", "2", "3", "4", "5"];

// The longest a voice call runs, in seconds, as the runtime takes it: no limit, or a minute to an
// hour. The empty one falls through to the team's, and the team's to the runtime's ten minutes.
const LIMITS = ["300", "900", "1200", "1800", "2700", "3600"];

// Three and not two: a corner that has said nothing is not a corner that has said no. The empty
// one falls through to the team's, and the team's to the runtime's own answer, which is to keep it.
const RECORDINGS = [
  { value: "", label: "Not set" },
  { value: "on", label: "Keep the audio" },
  { value: "off", label: "Keep none" },
] as const;

export function ConversationSection({
  typed,
  wordsOnly,
  fixed,
  change,
}: {
  typed: Typed;
  /** A key that opens words and not the pipeline: the words of the opening, and nothing else here. */
  wordsOnly: boolean;
  /** The settings the agent's class declares itself: shown, never edited. */
  fixed: ReadonlySet<string>;
  change: (field: keyof Typed, value: string) => void;
}): ReactNode {
  return (
    <section className="set-section">
      <div className="set-section-head">
        <h2 className="set-section-title">Conversation</h2>
        <p className="set-section-blurb">The first thing a caller hears, when the agent may hang up, and how quickly a turn is cut.</p>
      </div>
      {fixed.has("greeting") ? (
        <FixedByTheClass label="Opening" />
      ) : (
        <div className="set-field set-wide">
          <Label>Opening</Label>
          {!wordsOnly && <Segmented options={OPENINGS} value={typed.opening} onChange={(picked) => change("opening", picked)} />}
          {typed.opening === "say" || wordsOnly ? (
            <TextArea value={typed.say} rows={2} aria-label="Opening" placeholder="The exact words the caller hears first" onChange={(event) => change("say", event.target.value)} />
          ) : (
            <TextArea value={typed.reply} rows={2} aria-label="Opening" placeholder="What the model is told about how to open the call" onChange={(event) => change("reply", event.target.value)} />
          )}
          <p className="set-help">
            {typed.opening === "say" || wordsOnly
              ? "Said exactly as written, before the model runs: the caller hears it at once."
              : "An instruction the model reads to find its own opening. It costs a model round trip before the caller hears anything."}
          </p>
        </div>
      )}
      {!wordsOnly && (
        <>
          {fixed.has("hangup") ? (
            <FixedByTheClass label="May hang up when" />
          ) : (
            <div className="set-field set-wide">
              <Label>May hang up when</Label>
              <Input value={typed.hangup} aria-label="May hang up when" placeholder="the person has what they came for, or asks you to end the call" onChange={(event) => change("hangup", event.target.value)} />
              <p className="set-help">In your words. Empty: the agent never ends the call itself.</p>
            </div>
          )}
          {fixed.has("turn") ? (
            <FixedByTheClass label="How a turn ends" />
          ) : (
            <div className="set-row">
              <div className="set-field">
                <Label>Silence that ends a turn</Label>
                <Select value={typed.endpointing_ms} aria-label="Silence that ends a turn" onValueChange={(value) => change("endpointing_ms", value)}>
                  <SelectItem value="">Runtime default · 1 second</SelectItem>
                  {listed(SILENCES, typed.endpointing_ms).map((ms) => (
                    <SelectItem key={ms} value={ms}>
                      {Number(ms) / 1000} s
                    </SelectItem>
                  ))}
                </Select>
                <p className="set-help">How long the caller stays quiet before the agent answers. Shorter answers faster, and cuts off a slow speaker.</p>
              </div>
              <div className="set-field">
                <Label>Words before an interruption counts</Label>
                <Select value={typed.min_interruption_words} aria-label="Words before an interruption counts" onValueChange={(value) => change("min_interruption_words", value)}>
                  <SelectItem value="">Runtime default · 2 words</SelectItem>
                  {listed(WORDS, typed.min_interruption_words).map((words) => (
                    <SelectItem key={words} value={words}>
                      {words === "1" ? "1 word" : `${words} words`}
                    </SelectItem>
                  ))}
                </Select>
                <p className="set-help">How many words a caller says over the agent before it stops talking. A cough is not an interruption.</p>
              </div>
            </div>
          )}
          <div className="set-field set-wide">
            <Label>Longest voice call</Label>
            <Select value={typed.max_duration_s} aria-label="Longest voice call" onValueChange={(value) => change("max_duration_s", value)}>
              <SelectItem value="">Runtime default · 10 minutes</SelectItem>
              {listed(LIMITS, typed.max_duration_s).filter((seconds) => seconds !== "0").map((seconds) => (
                <SelectItem key={seconds} value={seconds}>
                  {Number(seconds) / 60} minutes
                </SelectItem>
              ))}
              <SelectItem value="0">No limit</SelectItem>
            </Select>
            <p className="set-help">
              A minute before it the agent is told to wrap up and say goodbye; at it the call ends, logged as a timeout. Phone and web voice
              calls only: a written conversation is never cut. A supervisor on the line does not stop the clock.
            </p>
          </div>
          {fixed.has("record") ? (
            <FixedByTheClass label="Recording" />
          ) : (
            <div className="set-field set-wide">
              <Label>Recording</Label>
              <Segmented options={RECORDINGS} value={typed.record} onChange={(picked) => change("record", picked)} />
              <p className="set-help">
                Whether this agent&apos;s calls keep their audio, which is what a session is played back from. The box records the whole room:
                the caller, the agent, the hold music and a supervisor who took the line. Not set: what the corner below says, and calls are
                kept unless somebody said otherwise.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// A value set from the terminal that is not on the list stays on it, so the form never drops it.
export function listed(values: readonly string[], set: string): readonly string[] {
  return set === "" || values.includes(set) ? values : [set, ...values];
}

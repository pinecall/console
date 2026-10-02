/** Settings form state and its conversion to and from the wire config. */

import { type TuningBody } from "@pinecall/core/wire/rest-org";

export type Modality = "stt" | "llm" | "tts";

/** A model knob as vendor + model picks; empty means the default. */
export interface Knob {
  vendor: string;
  model: string;
}

/** An attached base as form strings. */
export interface Attachment {
  base: string;
  /** Chunks per turn; empty for the runtime default. */
  k: string;
  /** Retrieval mode: platform before the turn, or model on demand. */
  mode: "retrieved" | "tool";
  /** Minimum fused score for this base; empty keeps everything. */
  min_score: string;
}

/** Form fields as strings; lists are one item per line. */
export interface Typed {
  stt: Knob;
  llm: Knob;
  tts: Knob;
  voice: string;
  /** Opening: literal words, or an instruction for the model. */
  opening: "say" | "reply";
  say: string;
  reply: string;
  hangup: string;
  endpointing_ms: string;
  min_interruption_words: string;
  /** Record audio; "" is unset and falls through. */
  record: "" | "on" | "off";
  /** Max voice call duration in seconds; "0" is no limit, "" falls through. */
  max_duration_s: string;
  remember: string;
  forget: string;
  knowledge: string;
  bases: Attachment[];
  note: string;
}

// Wire forms: `vendor`, `vendor/model`, or a bare model. A word that is not a known vendor is a model.
/** Parse a wire word into vendor and model picks. */
export function knobOf(value: string | null | undefined, vendors: ReadonlySet<string>): Knob {
  if (value === null || value === undefined || value === "") return { vendor: "", model: "" };
  const at = value.lastIndexOf("/");
  if (at >= 0) return { vendor: value.slice(0, at), model: value.slice(at + 1) };
  return vendors.has(value) ? { vendor: value, model: "" } : { vendor: "", model: value };
}

/** Build the wire word from two picks; empty when neither is set. */
export function wordOf(knob: Knob): string {
  if (knob.vendor === "") return knob.model;
  return knob.model === "" ? knob.vendor : `${knob.vendor}/${knob.model}`;
}

/** Form fields from a corner's config. */
export function typedOf(config: TuningBody, vendors: ReadonlySet<string>): Typed {
  const turn = config.turn ?? undefined;
  const memory = config.memory ?? undefined;
  const tts = knobOf(config.tts, vendors);
  // Legacy `tts_model` wins on the wire; it is folded into the pick and never written back.
  const ttsModel = config.tts_model ?? undefined;
  const reply = config.greeting?.reply ?? "";
  return {
    stt: knobOf(config.stt, vendors),
    llm: knobOf(config.llm, vendors),
    tts: ttsModel === undefined || ttsModel === "" ? tts : { ...tts, model: ttsModel },
    voice: config.voice ?? "",
    opening: reply !== "" ? "reply" : "say",
    say: config.greeting?.say ?? "",
    reply,
    hangup: config.hangup?.when ?? "",
    endpointing_ms: typeof turn?.endpointing_ms === "number" ? String(turn.endpointing_ms) : "",
    min_interruption_words: typeof turn?.min_interruption_words === "number" ? String(turn.min_interruption_words) : "",
    // Keep absent and false distinct: absent falls through to the corner below.
    record: typeof config.record === "boolean" ? (config.record ? "on" : "off") : "",
    max_duration_s: typeof config.max_duration_s === "number" ? String(config.max_duration_s) : "",
    remember: (memory?.remember ?? []).join("\n"),
    forget: (memory?.forget ?? []).join("\n"),
    knowledge: config.knowledge ?? "",
    bases: (config.bases ?? []).map((one) => ({
      base: one.base,
      k: typeof one.k === "number" ? String(one.k) : "",
      mode: one.mode === "tool" ? "tool" : "retrieved",
      min_score: typeof one.min_score === "number" ? String(one.min_score) : "",
    })),
    note: "",
  };
}

// Empty fields are omitted (the door refuses ""), reverting to the runtime default. A words-only
// key keeps the corner's other fields and rewrites only its own three.
/** Full config to send from the form's fields. */
export function configOf(typed: Typed, wordsOnly: boolean, standing: TuningBody): TuningBody {
  const config: TuningBody = wordsOnly ? { ...standing } : {};
  if (!wordsOnly) {
    for (const field of ["stt", "llm", "tts"] as const) {
      const word = wordOf(typed[field]);
      if (word !== "") config[field] = word;
    }
    const voice = typed.voice.trim();
    if (voice !== "") config.voice = voice;
    const hangup = typed.hangup.trim();
    if (hangup !== "") config.hangup = { when: hangup };
    const turn: NonNullable<TuningBody["turn"]> = {};
    if (typed.endpointing_ms.trim() !== "") turn.endpointing_ms = Number(typed.endpointing_ms);
    if (typed.min_interruption_words.trim() !== "") turn.min_interruption_words = Number(typed.min_interruption_words);
    if (Object.keys(turn).length > 0) config.turn = turn;
    if (typed.record !== "") config.record = typed.record === "on";
    if (typed.max_duration_s !== "") config.max_duration_s = Number(typed.max_duration_s);
    // Send only explicit choices, so runtime defaults can change without rewriting corners.
    const bases = typed.bases.filter((one) => one.base.trim() !== "").map(attachmentOf);
    // Always sent, even empty: a missing `bases` means unset and falls back to the team's.
    config.bases = bases;
  }
  const say = typed.say.trim();
  const reply = typed.reply.trim();
  if (typed.opening === "say" && say !== "") config.greeting = { say };
  else if (typed.opening === "reply" && reply !== "" && !wordsOnly) config.greeting = { reply };
  else delete config.greeting;
  const remember = lines(typed.remember);
  const forget = lines(typed.forget);
  if (remember.length > 0 || forget.length > 0) config.memory = { remember, forget };
  else delete config.memory;
  if (typed.knowledge.trim() !== "") config.knowledge = typed.knowledge;
  else delete config.knowledge;
  return config;
}

function attachmentOf(one: Attachment): NonNullable<TuningBody["bases"]>[number] {
  const attached: NonNullable<TuningBody["bases"]>[number] = { base: one.base.trim() };
  if (one.k.trim() !== "") attached.k = Number(one.k);
  if (one.mode === "tool") attached.mode = "tool";
  if (one.min_score.trim() !== "") attached.min_score = Number(one.min_score);
  return attached;
}

function lines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

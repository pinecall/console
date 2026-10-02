/** Settings form, one section at a time: pipeline, conversation, memory, knowledge, bases. */

import { useState, type FormEvent, type ReactNode } from "react";

import { type TuningBody } from "@pinecall/core/wire/rest-org";
import { type KnowledgeBase } from "@pinecall/core/wire/rest-retrieval";

import type { Provider } from "../../lib/catalogue";
import { Button, Input, Tabs } from "../../ui";
import { BasesSection } from "./bases";
import { ConversationSection } from "./conversation";
import { StageSection, VoiceField } from "./stages";
import { configOf, typedOf, type Typed } from "./typed";
import { KnowledgeSection, MemorySection } from "./words";

export type Section = "hears" | "decides" | "speaks" | "conversation" | "memory" | "knowledge" | "bases";

const SECTIONS: readonly { tab: Section; name: string }[] = [
  { tab: "hears", name: "STT" },
  { tab: "decides", name: "LLM" },
  { tab: "speaks", name: "Voice" },
  { tab: "conversation", name: "Conversation" },
  { tab: "memory", name: "Memory" },
  { tab: "knowledge", name: "Knowledge" },
  { tab: "bases", name: "Bases" },
];

// A key with `words` but not `pipeline` edits only the opening, memory and knowledge.
const WORDS: readonly Section[] = ["conversation", "memory", "knowledge"];

/** Sections a key may edit, in display order. */
export function sectionsFor(wordsOnly: boolean): readonly { tab: Section; name: string }[] {
  return wordsOnly ? SECTIONS.filter((one) => WORDS.includes(one.tab)) : SECTIONS;
}

export function SettingsForm({
  standing,
  version,
  wordsOnly,
  language,
  providers,
  defaults,
  models,
  bases,
  section,
  onPickSection,
  saving,
  error,
  onSave,
}: {
  standing: TuningBody;
  /** Version the form was opened at; the save is checked against it. */
  version: number | null;
  wordsOnly: boolean;
  /** Agent's language for listing voices; null when undeclared. */
  language: string | null;
  providers: readonly Provider[];
  defaults: Readonly<Record<string, string>>;
  models: Readonly<Record<string, readonly string[]>>;
  /** Bases in this world for the Bases section; null while loading. */
  bases: readonly KnowledgeBase[] | null;
  section: Section;
  onPickSection: (section: Section) => void;
  saving: boolean;
  error: string | null;
  onSave: (config: TuningBody, ifVersion: number | null, note: string | null) => Promise<void>;
}): ReactNode {
  const vendors = new Set(providers.map((one) => one.name));
  const [typed, setTyped] = useState<Typed>(() => typedOf(standing, vendors));
  const [saved, setSaved] = useState(false);
  const change = (field: keyof Typed, value: string): void => {
    setSaved(false);
    setTyped({ ...typed, [field]: value });
  };
  const knob = (field: "stt" | "llm" | "tts") => (picked: Typed["stt"]) => {
    setSaved(false);
    // Voices are per vendor: changing the TTS vendor clears the voice.
    setTyped(field === "tts" && picked.vendor !== typed.tts.vendor ? { ...typed, tts: picked, voice: "" } : { ...typed, [field]: picked });
  };
  // Picked TTS vendor, else the runtime default (null until the pipeline report arrives).
  const speaking = typed.tts.vendor === "" ? (defaults["tts"] ?? null) : typed.tts.vendor;

  const save = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    await onSave(configOf(typed, wordsOnly, standing), version, typed.note.trim() === "" ? null : typed.note.trim());
    setSaved(true);
  };

  return (
    <form className="ui-card set-form" onSubmit={(event) => void save(event)}>
      <div className="set-tabs">
        <Tabs label="Settings" tabs={sectionsFor(wordsOnly)} on={section} onPick={onPickSection} />
      </div>
      {section === "hears" && (
        <StageSection modality="stt" title="Speech to text" blurb="What turns the caller's voice into words." knob={typed.stt} providers={providers} defaults={defaults} models={models} onChange={knob("stt")} />
      )}
      {section === "decides" && (
        <StageSection modality="llm" title="Language model" blurb="The model that reads what the caller said and writes the answer." knob={typed.llm} providers={providers} defaults={defaults} models={models} onChange={knob("llm")} />
      )}
      {section === "speaks" && (
        <StageSection modality="tts" title="Voice" blurb="What says the answer out loud, and in which voice." knob={typed.tts} providers={providers} defaults={defaults} models={models} onChange={knob("tts")}>
          <VoiceField vendor={speaking} providers={providers} model={typed.tts.model === "" ? null : typed.tts.model} language={language} opening={typed.say} voice={typed.voice} onChange={(voice) => change("voice", voice)} />
        </StageSection>
      )}
      {section === "conversation" && <ConversationSection typed={typed} wordsOnly={wordsOnly} change={change} />}
      {section === "memory" && <MemorySection typed={typed} change={change} />}
      {section === "knowledge" && <KnowledgeSection typed={typed} change={change} />}
      {section === "bases" && (
        <BasesSection
          rows={typed.bases}
          offered={bases}
          onChange={(rows) => {
            setSaved(false);
            setTyped({ ...typed, bases: rows });
          }}
        />
      )}
      <div className="set-save">
        <Input className="set-save-note" value={typed.note} placeholder="Why, for the history (optional)" aria-label="Why, for the history (optional)" onChange={(event) => change("note", event.target.value)} />
        <Button kind="primary" size="form" type="submit" disabled={saving}>
          {saving ? "Saving…" : version === null ? "Save as the first version" : `Save as v${version + 1}`}
        </Button>
        <span className={error !== null ? "set-save-said set-save-error" : "set-save-said"}>
          {error !== null ? error : saved ? "Kept. The next call runs on it." : "Every section is saved together, as one version. An empty field is the runtime's default."}
        </span>
      </div>
    </form>
  );
}

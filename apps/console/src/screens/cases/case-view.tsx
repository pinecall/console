/** One case, read: what broke, the call as it will be played again, what it expects, and what to do. */

import type { ReactNode } from "react";

import { dayAndTime } from "../../lib/format";
import { inTheWorld } from "../../lib/mode";
import { Pill } from "../../ui";
import { CaseRun } from "./case-run";
import { Decide } from "./decide";
import type { EvalCase } from "./door";
import { expectations } from "./expectations";
import { FixIt } from "./fix-it";
import { Section } from "./section";

const STATUS_TONE = { pending: "amber", approved: "green", dismissed: "gray" } as const;

const STATUS_SAID = { pending: "waiting for you", approved: "played every night", dismissed: "dismissed" } as const;

export function CaseView({ agent, kept, onDecided }: { agent: string; kept: EvalCase; onDecided: (kept: EvalCase) => void }): ReactNode {
  const golden = kept.golden;
  const lines = golden.input ?? [];
  const state = Object.entries(golden.state ?? {});
  const events = golden.events ?? [];
  return (
    <article className="cs-doc">
      <header className="cs-doc-head">
        <div>
          <h1 className="cs-doc-name">{kept.name}</h1>
          <p className="cs-doc-about">
            <Pill tone={STATUS_TONE[kept.status]}>{STATUS_SAID[kept.status]}</Pill>
            {kept.kept_in_repo && <Pill tone="indigo">in the repository</Pill>}
          </p>
        </div>
        <Decide kept={kept} onDecided={onDecided} />
      </header>

      <Section title="What broke" hint="The judges that did not hold when the call hung up, in their own words.">
        {kept.broke.length === 0 ? (
          <p className="cs-none">Nothing: a person kept this call by hand, and what it expects is theirs.</p>
        ) : (
          <ul className="cs-broke">
            {kept.broke.map((one) => (
              <li key={one.judge}>
                <Pill tone="red">{one.judge}</Pill>
                <span>{one.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="The call, as it will be played again" hint="The caller's own lines, in the state the call opened in, with what memory recalled and what your backend sent mid-call.">
        {state.length > 0 && (
          <dl className="cs-facts">
            {state.map(([what, value]) => (
              <div key={what} className="cs-fact">
                <dt>{what}</dt>
                <dd>{typeof value === "string" ? value : JSON.stringify(value)}</dd>
              </div>
            ))}
          </dl>
        )}
        {(golden.memory ?? []).length > 0 && <p className="cs-memory">Memory recalled: {(golden.memory ?? []).join(" · ")}</p>}
        <ol className="cs-lines">
          {events.filter((event) => (event.after_turn ?? 0) === 0).map((event) => <Event key={event.name} name={event.name} data={event.data} />)}
          {lines.map((line, at) => (
            <li key={`${at}-${line}`} className="cs-line">
              <span className="cs-line-said">“{line}”</span>
              {events.filter((event) => event.after_turn === at + 1).map((event) => <Event key={event.name} name={event.name} data={event.data} />)}
            </li>
          ))}
        </ol>
        {golden.today !== undefined && golden.today !== null && <p className="cs-memory">Played as if today were {golden.today}.</p>}
      </Section>

      <Section title="What it expects now" hint="What the broken verdicts forbid from now on. A verdict knows what broke, never what was right.">
        <ul className="cs-expects">
          {expectations(golden.expect ?? {}).map((said) => <li key={said}>{said}</li>)}
        </ul>
      </Section>

      <FixIt agent={agent} kept={kept} />
      <CaseRun agent={agent} kept={kept} />

      <footer className="cs-doc-foot">
        Kept {kept.author === "the hang-up panel" ? "at hang-up" : `by ${kept.author}`}, {dayAndTime(kept.created_at)}, from a{" "}
        <a href={inTheWorld(kept.source_env, `/calls/${encodeURIComponent(kept.source_call)}`)}>{kept.source_env} call</a>
        {kept.source_version !== null && ` on settings v${kept.source_version}`}.{kept.decided_by !== null && ` Decided by ${kept.decided_by}.`}
      </footer>
    </article>
  );
}

function Event({ name, data }: { name: string; data: Record<string, unknown> | undefined }): ReactNode {
  return (
    <span className="cs-event">
      your backend sent <code>{name}</code> {data === undefined ? "" : JSON.stringify(data)}
    </span>
  );
}

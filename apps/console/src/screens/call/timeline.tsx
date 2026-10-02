/** Live call timeline: rows in order, in-flight speech last, auto-scrolling to the end. */

import { type Entry } from "@pinecall/core/wire/envelope";
import { type State } from "@pinecall/core/wire/state";
import { useEffect, useRef, type ReactNode } from "react";

import { LogRow } from "./log-row";
import { MemoryRow, SourcesRow } from "./lookup-rows";
import { ConfirmRow, EventRow, LineRow, QuietRow, StateRow, SupervisorRow } from "./marks";
import { rowsOf, type Row } from "./timeline-rows";
import { ToolRow } from "./tool-run";
import { TurnRow } from "./turn";

// Within this distance of the bottom, the list keeps auto-scrolling.
const NEAR_THE_END_PX = 80;

// Row kinds shown in terse (transcript) mode.
const SPOKEN: readonly Row["kind"][] = ["turn", "tool", "confirm", "event", "supervisor", "line"];

/** `after` renders at the end (e.g. a recording). `terse` shows only conversation rows, without metrics. */
export function Timeline({ entries, state, after, terse = false }: { entries: Entry[]; state: State; after?: ReactNode; terse?: boolean }): ReactNode {
  // `live.agent` is the reducer's join of `agent.transcript` deltas so far.
  const saying = state.live.agent;
  const list = useRef<HTMLDivElement>(null);
  const following = useRef(true);

  // Auto-scroll unless the user scrolled up; `following` is updated on scroll.
  useEffect(() => {
    const box = list.current;
    if (box !== null && following.current) box.scrollTop = box.scrollHeight;
  }, [entries, state.live.user, saying]);

  return (
    <div
      className="call-rows"
      ref={list}
      onScroll={(event) => {
        const box = event.currentTarget;
        following.current = box.scrollHeight - box.scrollTop - box.clientHeight < NEAR_THE_END_PX;
      }}
    >
      {rowsOf(entries, state)
        .filter((row) => !terse || SPOKEN.includes(row.kind))
        .map((row) => (
          <RowOf key={`${row.kind}-${String(row.seq)}`} row={row} state={state} terse={terse} />
        ))}
      <Saying said={state.live.user} who="caller" />
      <Saying said={saying} who="agent" />
      {after}
    </div>
  );
}

function RowOf({ row, state, terse }: { row: Row; state: State; terse: boolean }): ReactNode {
  switch (row.kind) {
    case "turn":
      return <TurnRow turn={row.turn} seq={row.seq} metrics={state.metrics} terse={terse} />;
    case "tool":
      return <ToolRow run={row.run} seq={row.seq} />;
    case "state":
      return <StateRow changed={row.changed} cause={row.cause} seq={row.seq} />;
    case "confirm":
      return <ConfirmRow confirm={row.confirm} seq={row.seq} />;
    case "event":
      return <EventRow name={row.name} source={row.source} data={row.data} seq={row.seq} />;
    case "supervisor":
      return <SupervisorRow mark={row.mark} seq={row.seq} />;
    case "line":
      return <LineRow mark={row.mark} seq={row.seq} />;
    case "memory":
      return <MemoryRow ops={row.ops} seq={row.seq} />;
    case "sources":
      return <SourcesRow sources={row.sources} seq={row.seq} />;
    case "quiet":
      return <QuietRow entries={row.entries} />;
  }
}

// In-flight speech. Words are keyed by position so each fades in only once; the newest is highlighted.
function Saying({ said, who }: { said: string | null; who: "caller" | "agent" }): ReactNode {
  if (said === null) return null;
  const spoken = said.split(/\s+/).filter((word) => word !== "");
  return (
    <div className="call-saying">
      <LogRow
        seq={undefined}
        kind="turn"
        tone="turn"
        who={who}
        said={
          <>
            {spoken.map((word, at) => (
              <span key={at} className={at === spoken.length - 1 ? "call-word call-word-now" : "call-word"}>
                {word}{" "}
              </span>
            ))}
            <span className="call-caret" aria-hidden />
          </>
        }
      />
    </div>
  );
}

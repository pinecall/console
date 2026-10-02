/** A call read as a chat: the caller's words on the right, the agent's on the left, each tool one quiet line, the line's moves between them. */

import { type Entry } from "@pinecall/core/wire/envelope";
import { type State } from "@pinecall/core/wire/state";
import { useEffect, useRef, type ReactNode } from "react";

import { rowsOf } from "./timeline-rows";

// How close to the end counts as "reading the end": a person who scrolled up to read is left alone.
const NEAR_THE_END_PX = 80;

/** The conversation only — what was said and done — with the words being said as its last bubbles. */
export function ChatView({ entries, state, after }: { entries: Entry[]; state: State; after?: ReactNode }): ReactNode {
  const list = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const saying = state.live.agent;

  useEffect(() => {
    const box = list.current;
    if (box !== null && following.current) box.scrollTop = box.scrollHeight;
  }, [entries, state.live.user, saying]);

  return (
    <div
      className="call-chat"
      ref={list}
      onScroll={(event) => {
        const box = event.currentTarget;
        following.current = box.scrollHeight - box.scrollTop - box.clientHeight < NEAR_THE_END_PX;
      }}
    >
      <div className="call-chat-column">
        {rowsOf(entries, state).map((row) => {
          switch (row.kind) {
            case "turn":
              return <Bubble key={`t-${row.seq}`} who={row.turn.role === "agent" ? "agent" : "caller"} text={row.turn.text} />;
            case "tool":
              return (
                <div key={`x-${row.seq}`} className="call-chat-tool">
                  <span className="call-chat-tool-name">{row.run.name}</span>
                  <span className={row.run.status === "failed" ? "call-chat-tool-bad" : row.run.status === "running" ? "call-chat-tool-running" : "call-chat-tool-ok"}>
                    {row.run.status === "failed" ? "✗ failed" : row.run.status === "running" ? "running…" : "✓"}
                  </span>
                </div>
              );
            case "supervisor":
            case "line":
              return (
                <div key={`m-${row.seq}`} className="call-chat-note">
                  {row.mark.said}
                </div>
              );
            default:
              return null;
          }
        })}
        {state.live.user !== null && <Bubble who="caller" text={state.live.user} unsettled />}
        {saying !== null && <Bubble who="agent" text={saying} unsettled />}
        {after}
      </div>
    </div>
  );
}

function Bubble({ who, text, unsettled = false }: { who: "caller" | "agent"; text: string; unsettled?: boolean }): ReactNode {
  const classes = ["call-chat-bubble", who === "caller" ? "call-chat-caller" : "call-chat-agent"];
  if (unsettled) classes.push("call-chat-unsettled");
  return (
    <div className={who === "caller" ? "call-chat-line call-chat-line-caller" : "call-chat-line"}>
      <p className={classes.join(" ")}>{text}</p>
    </div>
  );
}

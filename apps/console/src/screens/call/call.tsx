/** One call: its head, the log as it arrives, and beside them the desk on a live call or the reading of a finished one. */

import { type Entry } from "@pinecall/core/wire/envelope";
import { type State } from "@pinecall/core/wire/state";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";

import { useDeclaredState } from "../../lib/declared-state";
import { elapsed, isSpoken, prettyNumber } from "@pinecall/core/calls";
import { medians } from "@pinecall/core/metrics";
import { keepCallView, keptCallView, type CallView } from "../../lib/preferences";
import { useWayBack, type WayBack } from "../../lib/whence";
import { useScopes } from "../../lib/whoami";
import { usePane } from "../../ui";
import { Desk } from "./desk";
import { MetricsPanel } from "./metrics-panel";
import { Actions, CostCard, Details, Facts, LatencyCard, Outcome, Player, recordingIn, ScoreCard, scoreIn, TimeCard, timeSpentIn } from "./over";
import { PromptPanel } from "./prompt-panel";
import { RoomPanel } from "./room-panel";
import { StatePanel } from "./state-panel";
import { ChatView } from "./chat-view";
import { Timeline } from "./timeline";
import { traceOf } from "./trace-bars";
import { TraceStep } from "./trace-step";
import { TraceView } from "./trace-view";
import { useWatchedCall } from "./use-watched-call";
import "./call.css";

/**
 * The page at `/calls/:call` — or under an agent's own Calls tab — whichever agent took it. The
 * way back is wherever the reader came from — Calls, the Inbox, Evals, Personas — and the list
 * itself on a reload or a link somebody pasted.
 */
export function OneCall(): ReactNode {
  const { agent = "", call = "" } = useParams();
  const back = useWayBack(agent === "" ? "/calls" : `/a/${agent}/inbox`);
  return <Call key={call} call={call} back={back} />;
}

// Everything on screen comes out of this one hook, so two calls side by side are two streams, two
// states and two timelines. The log is read from its first entry and followed to its last, live or
// not: a call that ends is the same page, with nothing more arriving.
/** A whole call, live or over. Mounting it opens the stream; leaving closes it. */
export function Call({
  call,
  agent,
  supervised = true,
  beside,
  back,
  foot,
  aside,
}: {
  call: string;
  agent?: string | undefined;
  /** Whether the supervisor's desk may be drawn here. A simulation is stopped, not whispered to. */
  supervised?: boolean;
  /** One more control in the call's head, told whether the call is over. */
  beside?: ((over: boolean) => ReactNode) | undefined;
  /** The way back, for the call that is a page of its own; a call mounted inside another screen has none. */
  back?: WayBack | undefined;
  /** Under the log: the screen that mounts the call may put a composer there. */
  foot?: ReactNode | undefined;
  /** After the call's own panels in the pane: what the screen that mounts the call knows besides. */
  aside?: ReactNode | undefined;
}): ReactNode {
  const watched = useWatchedCall(call);
  const state = watched.state;
  const declared = useDeclaredState(state.agent);
  const scopes = useScopes();
  const over = state.status === "ended";
  const recorded = recordingIn(summaryOf(watched.entries));
  // A thread — the widget's chat, WhatsApp — is not spoken, and the desk over it neither listens
  // nor opens a microphone. The widget's chat has a room too, so core's rule reads the caller's seat.
  const spoken = isSpoken(state);
  // A key that does not open `supervise` is refused every move: the desk is not drawn for it.
  const supervises = supervised && (scopes === null || scopes.includes("supervise"));
  const read = useMemo(
    () => ({ latencies: medians(watched.entries), score: scoreIn(watched.entries), spent: timeSpentIn(watched.entries, state) }),
    [watched.entries, state],
  );

  const pane = usePane({ name: "call.pane", initial: 360, min: 280, max: 640, side: "right" });
  // Four ways to read the same call: as a chat — the bubbles, the tools as one line each — as the
  // transcript, as the whole log with every number, or as a trace of its stages on a time axis. The
  // one a person picked is the one the next call opens in; the chat is where a person who never picked starts.
  const [view, setView] = useState<CallView>(() => keptCallView() ?? "chat");
  const pick = (chosen: CallView): void => {
    setView(chosen);
    keepCallView(chosen);
  };
  // The trace is folded only while it is read, and the bar picked in it is shown in the pane by id,
  // so a live call's next update shows the same bar with what has come in since.
  const trace = useMemo(() => (view === "trace" ? traceOf(watched.entries, state) : null), [view, watched.entries, state]);
  const [picked, setPicked] = useState<string | null>(null);
  const step = trace?.rows.flatMap((row) => row.bars).find((bar) => bar.id === picked);

  // What closes the conversation, however it is read: the recording, and on a call that is over its details.
  const theEnd = (
    <>
      {recorded !== null && <Recorded call={call} />}
      {over && (
        <div className="call-foot">
          <Details state={state} entries={watched.entries} beside={<Actions agent={state.agent || agent || ""} call={call} number={(state.direction === "outbound" ? state.to : state.from) ?? null} />} />
        </div>
      )}
    </>
  );

  return (
    <div className="call" style={pane.style}>
      {pane.handle}
      <div className="call-middle">
        <Head call={call} agent={agent} state={state} connection={watched.error ?? watched.connection} failed={watched.error !== null} back={back}>
          {beside?.(over)}
          <span className="call-view" role="group" aria-label="how the call is read">
            {(["chat", "transcript", "log", "trace"] as const).map((one) => (
              <button key={one} type="button" className={view === one ? "call-view-one call-view-on" : "call-view-one"} onClick={() => pick(one)}>
                {VIEW_NAMES[one]}
              </button>
            ))}
          </span>
        </Head>
        {view === "chat" ? (
          <ChatView entries={watched.entries} state={state} after={theEnd} />
        ) : trace !== null ? (
          <TraceView trace={trace} picked={picked} onPick={setPicked} after={theEnd} />
        ) : (
          <Timeline entries={watched.entries} state={state} terse={view === "transcript"} after={theEnd} />
        )}
        {foot}
      </div>
      <aside className="call-pane" aria-label="what the call holds">
        {/* A bar picked in the trace is what the reader is looking at: it comes before the rest. */}
        {step !== undefined && <TraceStep bar={step} onClose={() => setPicked(null)} />}
        {/* The desk is the live call's first thing: a supervisor opens the page to act on it. */}
        {!over && supervises && <Desk call={call} live spoken={spoken} asked={state.attention ?? null} />}
        {/* And what a finished call came to is the first thing of a call that is over. */}
        {over && (
          <div className="call-over">
            <Outcome state={state} />
            <ScoreCard call={call} base={`/calls/${call}`} score={read.score} turns={state.turns.length} ended />
            <LatencyCard rows={read.latencies} />
            {read.spent !== null && <TimeCard spent={read.spent} />}
            {state.cost !== null && state.cost.rows.length > 0 && <CostCard cost={state.cost} />}
            <Facts state={state} events={watched.entries.length} />
          </div>
        )}
        <StatePanel fields={state.app_state} declared={declared} />
        <RoomPanel room={state.room} from={state.from} over={over} />
        <PromptPanel prompt={state.prompt} cost={state.cost} />
        <MetricsPanel metrics={state.metrics} entries={watched.entries} />
        {aside}
      </aside>
    </div>
  );
}

const VIEW_NAMES: Record<CallView, string> = { chat: "Chat", transcript: "Transcript", log: "Log", trace: "Trace" };

/** The call's head: the way back, which call, which door, how it stands, who is on it, and how far the log got. */
function Head({
  call,
  agent,
  state,
  connection,
  failed,
  back,
  children,
}: {
  call: string;
  agent: string | undefined;
  state: State;
  connection: string;
  failed: boolean;
  back: WayBack | undefined;
  children: ReactNode;
}): ReactNode {
  const now = useNow(state.status !== "ended");
  const over = state.status === "ended";
  const from = state.caller?.name ?? prettyOrAsIs(state.direction === "outbound" ? state.to : state.from);
  return (
    <div className="call-head">
      {back !== undefined && (
        <Link to={back.to} className="ui-back call-back">
          ← {back.name}
        </Link>
      )}
      <span className="call-call">{call}</span>
      {state.channel !== null && <span className="call-tag">{state.channel}</span>}
      {state.direction !== null && <span className="call-tag">{state.direction}</span>}
      <span className={over ? "call-status call-status-over" : "call-status"}>
        {over ? (state.end_reason ?? "ended").replace(/_/g, " ") : state.status === "active" ? `on a call · ${elapsed(state.started_at, now)}` : state.status}
      </span>
      <span className="call-sub">
        {from} → {state.agent || agent || "—"} · seq {state.seq}
        {state.agent_state !== null && ` · agent ${state.agent_state}`}
        {state.user_state !== null && ` · caller ${state.user_state}`}
        {" · "}
        <span className={failed ? "call-connection-bad" : undefined}>{connection}</span>
      </span>
      {children}
    </div>
  );
}

function prettyOrAsIs(number: string | null): string {
  if (number === null) return "—";
  return number.startsWith("+") ? prettyNumber(number) : number;
}

// A live call's clock is the one thing here that moves without the log moving.
function useNow(ticking: boolean): number {
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    if (!ticking) return;
    const tick = window.setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => window.clearInterval(tick);
  }, [ticking]);
  return now;
}

// The pointer to the audio rides the summary, near the end of a finished call's log.
function summaryOf(entries: Entry[]): Record<string, unknown> | undefined {
  return [...entries].reverse().find((entry) => entry.type === "call.summary")?.data;
}

// The call's audio at the foot of its log — and nothing at all when the gateway has none to play.
function Recorded({ call }: { call: string }): ReactNode {
  const [nothing, setNothing] = useState(false);
  const noAudio = useCallback(() => setNothing(true), []);
  if (nothing) return null;
  return (
    <div className="call-recording">
      <Player call={call} onNothing={noAudio} />
    </div>
  );
}

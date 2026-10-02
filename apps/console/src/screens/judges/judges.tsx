/** Judges: the panel every call meets at hang-up, how each has held, the org's judges and the agent's own. */

import { useState, type ReactNode } from "react";

import { GatewayError } from "@pinecall/core/api";
import { useCredentials } from "@pinecall/core/credentials";
import { Link, useParams } from "react-router";

import { percent } from "../../lib/format";
import { useScoredCalls } from "../../lib/use-scored-calls";
import { Button, Card, CardHead, Empty, Page, PageHead, Refused, Stat, Stats, TableHead, TableRow, TextAction } from "../../ui";
import { dropJudge, type Judge, type Whose } from "./door";
import { NewJudge } from "./new-judge";
import { heldRates, PANEL, type HeldRate } from "./panel";
import { useJudges } from "./use-judges";
import "./judges.css";

const COLUMNS = "130px minmax(0,2fr) 150px 170px 110px";

const OWN_COLUMNS = "160px minmax(0,2fr) 130px 70px";

const RUNS_ON: Record<Judge["runs_on"], string> = { "every-call": "every call", simulations: "simulations only" };

/**
 * The screen. A judge is a question about a call, in three rings: the runtime's panel, the same for
 * every org; the org's own, asked of every agent's calls (never gives medical advice); and this
 * agent's own, about its job alone (offers the next free slot). The panel is read with how it has
 * held over the agent's newest scored calls; the other two are the gateway's records, written and
 * dropped here.
 */
export function Judges(): ReactNode {
  const agent = useParams()["agent"] ?? "";
  const scored = useScoredCalls(agent);
  const own = useJudges(agent);
  const general = useJudges(null);
  const [writing, setWriting] = useState<"org" | "agent" | null>(null);
  const read = scored.rows.filter((row) => row.read);
  const rates = heldRates(read.flatMap((row) => (row.score === null ? [] : [row.score])));
  const judged = read.filter((row) => row.score !== null && row.score.passed !== undefined).length;
  const held = read.filter((row) => row.score?.passed === true).length;

  return (
    <Page width={1060} tight>
      <PageHead
        title="Judges"
        lede={`What every call of ${agent} is held to at hang-up: the runtime's panel, the questions your org asks of every agent, and the ones you write for ${agent}'s own job.`}
        ledeWidth={640}
      />
      <Refused>{scored.error ?? own.error ?? general.error}</Refused>

      <Stats min={170}>
        <Stat size="small" label="Calls judged" value={judged} of={read.length === 0 ? undefined : `of the last ${read.length}`} />
        <Stat size="small" label="Held" value={judged === 0 ? "—" : percent(held / judged)} accent />
        <Stat size="small" label="Did not hold" value={judged - held} />
        <Stat size="small" label="Judges" value={PANEL.length + (general.judges?.length ?? 0) + (own.judges?.length ?? 0)} of={`the panel, the org's and ${agent}'s`} />
      </Stats>

      <Card>
        <CardHead title="The panel" meta={`what the runtime asks of every finished call — held-rate over ${agent}'s newest scored calls`} />
        <TableHead columns={COLUMNS} labels={["Judge", "Asks", "Answered by", "Runs on", "Held>"]} />
        {PANEL.map((judge) => (
          <TableRow key={judge.name} columns={COLUMNS}>
            <span className="jdg-name">{judge.name}</span>
            <span className="jdg-asks">{judge.asks}</span>
            <span className="ui-cell-faint">{judge.by}</span>
            <span className="ui-cell-faint">{judge.on}</span>
            <span className="jdg-rate">
              <Rate rate={rates.get(judge.name)} />
            </span>
          </TableRow>
        ))}
        <div className="ui-card-foot">
          <span>
            A verdict cites the log's own lines: open a call under <Link to={`/a/${encodeURIComponent(agent)}/evals`}>Evals</Link> to read what each judge answered and why, and the drift of each held-rate over two windows.
          </span>
        </div>
      </Card>

      <Card>
        <CardHead title="The org's" meta="asked of every agent's calls at hang-up" action={<Button size="sm" onClick={() => setWriting("org")} disabled={writing !== null}>New judge</Button>} />
        {writing === "org" && (
          <NewJudge
            whose={null}
            onSaved={(judges) => {
              general.setJudges(judges);
              setWriting(null);
            }}
            onClose={() => setWriting(null)}
          />
        )}
        {general.judges !== null && general.judges.length > 0 && <OwnJudges whose={null} judges={general.judges} onDropped={general.setJudges} />}
        {writing !== "org" && general.judges?.length === 0 && <Empty>No judge of the org's yet: one sentence every call of every agent has to hold to.</Empty>}
      </Card>

      <Card>
        <CardHead title={`${agent}'s own`} meta="a question about this agent's job alone" action={<Button size="sm" onClick={() => setWriting("agent")} disabled={writing !== null}>New judge</Button>} />
        {writing === "agent" && (
          <NewJudge
            whose={agent}
            onSaved={(judges) => {
              own.setJudges(judges);
              setWriting(null);
            }}
            onClose={() => setWriting(null)}
          />
        )}
        {own.judges !== null && own.judges.length > 0 && <OwnJudges whose={agent} judges={own.judges} onDropped={own.setJudges} />}
        {writing !== "agent" && own.judges?.length === 0 && <Empty>No judge of {agent}'s own yet. The first one is one sentence: what a good call of this agent's has to have done.</Empty>}
      </Card>
    </Page>
  );
}

/** One list of judges, the org's or the agent's own: each question, when it runs, and a drop. */
function OwnJudges({ whose, judges, onDropped }: { whose: Whose; judges: readonly Judge[]; onDropped: (judges: Judge[]) => void }): ReactNode {
  const credentials = useCredentials();
  const [refused, setRefused] = useState<string | null>(null);

  const dropped = async (name: string): Promise<void> => {
    setRefused(null);
    try {
      onDropped(await dropJudge(credentials, whose, name));
    } catch (failed) {
      setRefused(failed instanceof GatewayError ? failed.message : String(failed));
    }
  };

  return (
    <>
      <Refused>{refused}</Refused>
      <TableHead columns={OWN_COLUMNS} labels={["Judge", "Asks", "Runs on", ""]} />
      {judges.map((judge) => (
        <TableRow key={judge.name} columns={OWN_COLUMNS}>
          <span className="jdg-name">{judge.name}</span>
          <span className="jdg-asks">{judge.question}</span>
          <span className="ui-cell-faint">{RUNS_ON[judge.runs_on]}</span>
          <span className="jdg-drop">
            <TextAction danger onClick={() => void dropped(judge.name)}>
              Drop
            </TextAction>
          </span>
        </TableRow>
      ))}
    </>
  );
}

/** A held-rate as a cell: the percent and the count under it, or a dash where nothing settled. */
function Rate({ rate }: { rate: HeldRate | undefined }): ReactNode {
  if (rate === undefined || rate.settled === 0) return <span className="ui-cell-faint">—</span>;
  return (
    <>
      <span className={rate.held === rate.settled ? "jdg-pct" : "jdg-pct jdg-pct-bad"}>{percent(rate.held / rate.settled)}</span>
      <span className="ui-cell-faint">
        {rate.held}/{rate.settled}
      </span>
    </>
  );
}

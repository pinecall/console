/** Every judge a call meets at hang-up, one table: the runtime's panel, the org's, and the agent in view's own — what each asks, how it has held, and its drift where it is counted. */

import { useState, type ReactNode } from "react";

import { GatewayError } from "@pinecall/core/api";
import { useCredentials } from "@pinecall/core/credentials";
import { percent } from "../../lib/format";
import { Button, Card, CardHead, Empty, Refused, TableHead, TableRow, TextAction } from "../../ui";
import { BEFORE_DAYS, NOW_DAYS, type Drifted, type JudgeDrift } from "./drift";
import { dropJudge, type Judge, type Whose } from "./judges-door";
import { NewJudge } from "./new-judge";
import { PANEL, type HeldRate } from "./panel";
import { useJudges } from "./use-judges";

const RUNS_ON: Record<Judge["runs_on"], string> = { "every-call": "every call", simulations: "simulations only" };

/** One row of the table, whoever wrote the judge. */
interface Row {
  name: string;
  asks: string;
  by: string;
  on: string;
  /** Who may drop it here: the org's on the org's Quality, the agent's own on its own. */
  drops: Whose | undefined;
}

/**
 * The org's judges are written with every agent in view — they are asked of every agent's calls —
 * and the agent's own with that agent in view; each is read, never edited, from the other. The
 * held-rate is over the newest judged calls the screen read; the drift is `pinecall runs drift`'s,
 * a week against a month, and its columns are drawn only when the process holding the agent
 * counted it.
 */
export function Judges({ agent, rates, read, drifted }: { agent: string; rates: ReadonlyMap<string, HeldRate>; read: number; drifted: Drifted | null }): ReactNode {
  const general = useJudges(null);
  const own = useJudges(agent === "" ? null : agent);
  const [writing, setWriting] = useState(false);
  const whose: Whose = agent === "" ? null : agent;
  const drift = drifted === null ? null : new Map(drifted.drift.judges.map((judge) => [judge.judge, judge]));
  const columns = drift === null ? "150px minmax(0,2fr) 140px 120px 96px 56px" : "150px minmax(0,2fr) 140px 96px 74px 74px 64px 56px";

  const groups: { title: string; rows: Row[] }[] = [
    { title: "The panel · the runtime's", rows: PANEL.map((judge) => ({ name: judge.name, asks: judge.asks, by: judge.by, on: judge.on, drops: undefined })) },
    {
      title: agent === "" ? "The org's · asked of every agent" : "The org's · written with every agent in view",
      rows: (general.judges ?? []).map((judge) => ({ name: judge.name, asks: judge.question, by: "a model", on: RUNS_ON[judge.runs_on], drops: agent === "" ? null : undefined })),
    },
    ...(agent === ""
      ? []
      : [{ title: `${agent}'s own`, rows: (own.judges ?? []).map((judge) => ({ name: judge.name, asks: judge.question, by: "a model", on: RUNS_ON[judge.runs_on], drops: agent })) }]),
  ];
  const saved = (judges: Judge[]): void => {
    (agent === "" ? general : own).setJudges(judges);
    setWriting(false);
  };

  return (
    <Card>
      <CardHead
        title="Judges"
        meta={drift === null ? `held over the newest ${read} judged calls` : `held over the newest ${read} judged calls · drift: the last ${NOW_DAYS} days against the last ${BEFORE_DAYS}`}
        action={
          <Button size="sm" onClick={() => setWriting(true)} disabled={writing}>
            {agent === "" ? "New judge for every agent" : `New judge for ${agent}`}
          </Button>
        }
      />
      {writing && <NewJudge whose={whose} onSaved={saved} onClose={() => setWriting(false)} />}
      <Refused>{general.error ?? own.error}</Refused>
      <TableHead columns={columns} labels={drift === null ? ["Judge", "Asks", "Answered by", "Runs on", "Held>", ""] : ["Judge", "Asks", "Answered by", "Runs on", `${NOW_DAYS} days>`, `${BEFORE_DAYS} days>`, "Drift>", ""]} />
      {groups.map((group) => (
        <Group key={group.title} title={group.title} rows={group.rows} columns={columns} rates={rates} drift={drift} threshold={drifted?.threshold ?? null} onDropped={(judges) => (agent === "" ? general : own).setJudges(judges)} />
      ))}
      {agent !== "" && own.judges?.length === 0 && !writing && <Empty>No judge of {agent}'s own yet. The first one is one sentence: what a good call of this agent has to have done.</Empty>}
    </Card>
  );
}

function Group({
  title,
  rows,
  columns,
  rates,
  drift,
  threshold,
  onDropped,
}: {
  title: string;
  rows: Row[];
  columns: string;
  rates: ReadonlyMap<string, HeldRate>;
  drift: ReadonlyMap<string, JudgeDrift> | null;
  threshold: number | null;
  onDropped: (judges: Judge[]) => void;
}): ReactNode {
  const credentials = useCredentials();
  const [refused, setRefused] = useState<string | null>(null);
  if (rows.length === 0) return null;

  const dropped = async (whose: Whose, name: string): Promise<void> => {
    setRefused(null);
    try {
      onDropped(await dropJudge(credentials, whose, name));
    } catch (failed) {
      setRefused(failed instanceof GatewayError ? failed.message : String(failed));
    }
  };

  return (
    <>
      <div className="qly-group">{title}</div>
      <Refused>{refused}</Refused>
      {rows.map((row) => {
        const judged = drift?.get(row.name);
        return (
          <TableRow key={row.name} columns={columns}>
            <span className="qly-name">{row.name}</span>
            <span className="qly-asks">{row.asks}</span>
            <span className="ui-cell-faint">{row.by}</span>
            <span className="ui-cell-faint">{row.on}</span>
            {drift === null ? (
              <Held rate={rates.get(row.name)} />
            ) : (
              <>
                <Window standing={judged?.now ?? null} />
                <Window standing={judged?.before ?? null} faint />
                <Drift delta={judged?.delta ?? null} threshold={threshold} />
              </>
            )}
            <span className="qly-drop">
              {row.drops !== undefined && (
                <TextAction danger onClick={() => void dropped(row.drops ?? null, row.name)}>
                  Drop
                </TextAction>
              )}
            </span>
          </TableRow>
        );
      })}
    </>
  );
}

/** A held-rate as a cell: the percent and the count under it, or a dash where nothing settled. */
function Held({ rate }: { rate: HeldRate | undefined }): ReactNode {
  if (rate === undefined || rate.settled === 0) return <span className="qly-rate ui-cell-faint">—</span>;
  return (
    <span className="qly-rate">
      <span className={rate.held === rate.settled ? "qly-pct" : "qly-pct qly-pct-bad"}>{percent(rate.held / rate.settled)}</span>
      <span className="ui-cell-faint">
        {rate.held}/{rate.settled}
      </span>
    </span>
  );
}

/** One window of the drift: the percent, or a dash where no verdict fell in it — never a zero. */
function Window({ standing, faint = false }: { standing: JudgeDrift["now"]; faint?: boolean }): ReactNode {
  if (standing === null) return <span className="qly-rate ui-cell-faint">—</span>;
  return (
    <span className="qly-rate">
      <span className={faint ? "qly-pct qly-pct-faint" : "qly-pct"}>{standing.percent.toFixed(0)}%</span>
      <span className="ui-cell-faint">
        {standing.held}/{standing.settled}
      </span>
    </span>
  );
}

/** The move between the windows; only a drop past the threshold is coloured, because it is the one to act on. */
function Drift({ delta, threshold }: { delta: number | null; threshold: number | null }): ReactNode {
  if (delta === null) return <span className="qly-rate ui-cell-faint">—</span>;
  const falling = threshold !== null && delta < -Math.abs(threshold);
  return <span className={falling ? "qly-rate qly-drift-bad" : "qly-rate ui-cell-faint"}>{`${delta > 0 ? "+" : delta < 0 ? "−" : "±"}${Math.abs(delta).toFixed(0)} pts`}</span>;
}

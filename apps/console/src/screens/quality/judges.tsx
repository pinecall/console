/** Every judge a call meets at hang-up, one table: Pinecall's switched on or off, the org's own, and the agent in view's own — what each asks, how it answers, how it has held, and its drift where it is counted. */

import { useState, type ReactNode } from "react";

import { GatewayError } from "@pinecall/core/api";
import { useCredentials } from "@pinecall/core/credentials";
import { percent } from "../../lib/format";
import { Avatar, Button, Card, CardHead, Empty, Refused, Switch, TableHead, TableRow, TextAction } from "../../ui";
import { BEFORE_DAYS, NOW_DAYS, type Drifted, type JudgeDrift } from "./drift";
import type { HeldRate } from "./held-rates";
import { JudgeForm } from "./judge-form";
import { answersOf, readsOf, whenOf } from "./judge-words";
import { dropJudge, PINECALL, writeJudge, type JudgeRow, type Whose } from "./judges-door";
import { TryJudge } from "./try-judge";
import { useJudges } from "./use-judges";

const ON_THE_BILL = "Turning a judge on costs one eval per call, unless your judges run on your own key. N/A is never billed.";

/** Where the drift columns are: what the table is drawn with, and what each verdict is read against. */
interface Standing {
  rates: ReadonlyMap<string, HeldRate>;
  drift: ReadonlyMap<string, JudgeDrift> | null;
  threshold: number | null;
}

/**
 * One list per level: the org's (Pinecall's as the org switched them, and the org's own) or the
 * agent's (the same, switched for it, the agent's switch winning, and its own). A judge of one's
 * own is written, edited and dropped at its own level and read from the other; Pinecall's are
 * switched, never dropped. The held-rate is over the newest judged calls the screen read; the
 * drift is a week against a month, drawn only when the process holding the agent counted it.
 */
export function Judges({ agent, rates, read, drifted }: { agent: string; rates: ReadonlyMap<string, HeldRate>; read: number; drifted: Drifted | null }): ReactNode {
  const whose: Whose = agent === "" ? null : agent;
  const listed = useJudges(whose);
  const [editing, setEditing] = useState<JudgeRow | "new" | null>(null);
  const drift = drifted === null ? null : new Map(drifted.drift.judges.map((judge) => [judge.judge, judge]));
  const standing: Standing = { rates, drift, threshold: drifted?.threshold ?? null };
  const judges = listed.judges ?? [];
  const owner = agent === "" ? "org" : agent;
  const groups: { title: string; rows: JudgeRow[] }[] = [
    { title: agent === "" ? "Pinecall's · switched for every agent" : `Pinecall's · switched for ${agent}`, rows: judges.filter((judge) => judge.owner === PINECALL) },
    { title: agent === "" ? "The org's own · asked of every agent" : "The org's own · written with every agent in view", rows: judges.filter((judge) => judge.owner === "org") },
    ...(agent === "" ? [] : [{ title: `${agent}'s own`, rows: judges.filter((judge) => judge.owner === agent) }]),
  ];
  const saved = (rows: JudgeRow[]): void => {
    listed.setJudges(rows);
    setEditing(null);
  };

  return (
    <Card>
      <CardHead
        title="Judges"
        meta={drift === null ? `held over the newest ${read} judged calls` : `held over the newest ${read} judged calls · drift: the last ${NOW_DAYS} days against the last ${BEFORE_DAYS}`}
        action={
          <Button size="sm" onClick={() => setEditing("new")} disabled={editing !== null}>
            {agent === "" ? "New judge for every agent" : `New judge for ${agent}`}
          </Button>
        }
      />
      <p className="qly-bill">{ON_THE_BILL}</p>
      {editing !== null && <JudgeForm whose={whose} agent={agent} editing={editing === "new" ? null : editing} onSaved={saved} onClose={() => setEditing(null)} />}
      <Refused>{listed.error}</Refused>
      <TableHead columns={columnsOf(drift !== null)} labels={drift === null ? ["Judge", "Answers · runs on", "Held>", "On", ""] : ["Judge", "Answers · runs on", `${NOW_DAYS} days>`, `${BEFORE_DAYS} days>`, "Drift>", "On", ""]} />
      {groups.map((group) => (
        <Group key={group.title} title={group.title} rows={group.rows} whose={whose} agent={agent} mine={owner} standing={standing} onListed={listed.setJudges} onEdit={setEditing} />
      ))}
      {agent !== "" && listed.judges !== null && groups[2]?.rows.length === 0 && editing === null && (
        <Empty>No judge of {agent}&apos;s own yet. The first one is one question: what a good call of this agent has to have done.</Empty>
      )}
    </Card>
  );
}

function columnsOf(drifting: boolean): string {
  return drifting ? "minmax(0,3fr) 170px 74px 74px 64px 52px 96px" : "minmax(0,3fr) 190px 80px 52px 96px";
}

function Group({
  title,
  rows,
  whose,
  agent,
  mine,
  standing,
  onListed,
  onEdit,
}: {
  title: string;
  rows: JudgeRow[];
  whose: Whose;
  agent: string;
  /** The owner whose judges this level writes: "org", or the agent's slug. */
  mine: string;
  standing: Standing;
  onListed: (judges: JudgeRow[]) => void;
  onEdit: (judge: JudgeRow) => void;
}): ReactNode {
  const credentials = useCredentials();
  const [refused, setRefused] = useState<string | null>(null);
  const [trying, setTrying] = useState<string | null>(null);
  if (rows.length === 0) return null;

  const asked = async (change: () => Promise<JudgeRow[]>): Promise<void> => {
    setRefused(null);
    try {
      onListed(await change());
    } catch (failed) {
      setRefused(failed instanceof GatewayError ? failed.message : String(failed));
    }
  };

  return (
    <>
      <div className="qly-group">{title}</div>
      <Refused>{refused}</Refused>
      {rows.map((row) => {
        const ours = row.owner === mine;
        const library = row.owner === PINECALL;
        return (
          <div key={row.name}>
            <TableRow columns={columnsOf(standing.drift !== null)}>
              <span className="qly-judge">
                <Avatar size={28} name={row.name} />
                <span className="qly-judge-words">
                  <span className="qly-name">{row.name}</span>
                  <span className="qly-asks">{library ? (row.summary ?? row.question) : row.question}</span>
                </span>
              </span>
              <span className="qly-judge-words">
                <span className="ui-cell-faint">{answersOf(row)}</span>
                <span className="ui-cell-faint">{whenOf(row)}</span>
                {readsOf(row) !== "" && <span className="ui-cell-faint">reads {readsOf(row)}</span>}
              </span>
              <Standings name={row.name} standing={standing} />
              <span className="qly-on">{library ? <Switch on={row.on} label={`${row.name} on`} onChange={(on) => void asked(() => writeJudge(credentials, whose, row.name, { on }))} /> : <span className="ui-cell-faint">on</span>}</span>
              <span className="qly-drop">
                {agent !== "" && <TextAction onClick={() => setTrying(trying === row.name ? null : row.name)}>Try</TextAction>}
                {ours && <TextAction onClick={() => onEdit(row)}>Edit</TextAction>}
                {ours && (
                  <TextAction danger onClick={() => void asked(() => dropJudge(credentials, whose, row.name))}>
                    Drop
                  </TextAction>
                )}
              </span>
            </TableRow>
            {trying === row.name && <TryJudge agent={agent} name={row.name} written={null} />}
          </div>
        );
      })}
    </>
  );
}

/** A judge's held-rate, or its two windows and the move between them where the drift is counted. */
function Standings({ name, standing }: { name: string; standing: Standing }): ReactNode {
  if (standing.drift === null) return <Held rate={standing.rates.get(name)} />;
  const judged = standing.drift.get(name);
  return (
    <>
      <Window standing={judged?.now ?? null} />
      <Window standing={judged?.before ?? null} faint />
      <Drift delta={judged?.delta ?? null} threshold={standing.threshold} />
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

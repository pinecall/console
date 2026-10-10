/** What the screen shows before a caller is picked: how this agent's callers stand, and their runs against it. */

import type { ReactNode } from "react";
import { Link } from "react-router";

import { ago, duration } from "../../lib/format";
import { Button, Card, CardHead, Empty, Item, Page, PageHead, Pill, Stat, Stats, TableHead, TableRow } from "../../ui";
import type { Persona, PersonaRun } from "./door";
import { rowAt, whoseIs } from "../../lib/harness";
import { standingOf, type Standing, type Standings } from "./use-run-standings";

const COLUMNS = "minmax(0,1fr) minmax(0,1fr) 92px 70px 104px";

// The newest runs against this agent, whichever caller ran them: the per-caller pages merged and
// cut to one screenful. What a person opening Personas wants first is what has been happening.
const A_SCREENFUL = 12;

/**
 * This agent's callers as a standing, not as a second copy of the roster: how many there are, how
 * many times they have called it, when the last one was — and then the runs themselves, newest
 * first, each row the conversation it was. Who has never been called gets its own short list,
 * because that is the one thing on this screen somebody can act on.
 */
export function Overview({ agent, personas, standings, onNew }: { agent: string; personas: Persona[]; standings: Standings; onNew: () => void }): ReactNode {
  const simulations = rowAt(agent, "simulations");
  const whose = whoseIs(agent);
  const runs = everyRun(standings.by);
  const never = personas.filter((one) => standings.by[standingOf(one)]?.total === 0);
  const newest = runs[0];

  if (personas.length === 0) {
    return <NoCallers onNew={onNew} />;
  }

  return (
    <Page>
      <PageHead
        title="Personas"
        lede={
          <>
            The synthetic callers written for {whose}. A model plays one and improvises every line — in Simulations, or in{" "}
            <span className="ui-fixed">pinecall simulate</span>.
          </>
        }
      />

      <Stats min={170}>
        <Stat label="Callers" value={personas.length} of={never.length === 0 ? undefined : `· ${never.length} never called`} />
        <Stat label="Runs" value={standings.read ? runs.length : "—"} of={standings.read ? "among the newest" : undefined} />
        <Stat label="Last run" value={newest === undefined ? "—" : ago(newest.started_at)} of={newest === undefined ? undefined : `· ${newest.persona}`} />
        <Stat label="On a call" value={runs.filter((one) => one.ended_at === null).length} />
      </Stats>

      <Card>
        <CardHead title="Latest runs" meta={`newest first, whichever caller — a row opens it in Simulations`} />
        {standings.read && runs.length === 0 && (
          <Empty>
            No caller has called {whose} yet. <Link to={simulations}>Simulations</Link> puts one on it, and <span className="ui-fixed">pinecall simulate --persona</span> does the same from a terminal.
          </Empty>
        )}
        {runs.length > 0 && <TableHead columns={COLUMNS} padding="9px 16px" labels={["Caller", "Agent", "When", "Turns>", "How it went"]} />}
        {runs.slice(0, A_SCREENFUL).map((run) => (
          <TableRow key={run.call} columns={COLUMNS} to={`${simulations}/${run.call}`}>
            <span className="psn-over-name">{run.persona}</span>
            <span className="psn-over-goal">{run.agent}</span>
            <span className="psn-over-when">{ago(run.started_at)}</span>
            <span className="psn-over-count">{run.turns}</span>
            <span>
              <Verdict run={run} />
            </span>
          </TableRow>
        ))}
      </Card>

      {never.length > 0 && (
        <Card>
          <CardHead title="Never called" meta="written, and still only a description" />
          {never.map((one) => (
            <Item
              key={standingOf(one)}
              name={one.name}
              sub={one.goal}
              to={`${simulations}?agent=${encodeURIComponent(one.agent)}&persona=${encodeURIComponent(one.name)}`}
              end={<span className="psn-over-when">Call {one.agent} as them →</span>}
            />
          ))}
        </Card>
      )}
    </Page>
  );
}

// An agent with nobody written yet is the one place the whole sentence belongs: there is nothing to
// show, and what a persona IS is exactly what the person is missing.
function NoCallers({ onNew }: { onNew: () => void }): ReactNode {
  return (
    <Page>
      <PageHead
        title="Personas"
        lede="A persona is somebody who calls this business wanting something: a goal, a manner, and the few facts they may state about themselves. A model plays them against an agent and improvises every line — there is no script to write."
        ledeWidth={640}
        actions={
          <Button kind="primary" size="base" onClick={onNew}>
            New persona
          </Button>
        }
      />
      <Card>
        <Empty>No callers yet. The first one takes a minute: what they want, how they talk, and what they know about themselves.</Empty>
      </Card>
    </Page>
  );
}

// The run in one mark, the same words the pane beside a caller uses.
function Verdict({ run }: { run: PersonaRun }): ReactNode {
  if (run.ended_at === null) {
    return (
      <Pill tone="green" small>
        on a call
      </Pill>
    );
  }
  if (run.score === null) {
    return <span className="psn-over-when">{duration(run)} · not judged</span>;
  }
  return (
    <Pill tone={run.score.passed ? "green" : "red"} small>
      {run.score.passed ? "held" : "broke"} {String(run.score.held)}/{String(run.score.judged)}
    </Pill>
  );
}

// Every caller's newest runs in one list, newest first; each run names the caller it was.
function everyRun(by: Record<string, Standing>): PersonaRun[] {
  return Object.values(by)
    .flatMap((standing) => standing.newest)
    .sort((one, other) => other.started_at - one.started_at);
}

/** Goldens, a tab of Test: the agent's golden questions, the newest verdict on each, and every run — is a change safe to ship? */

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useSearchParams } from "react-router";

import { useCredentials } from "@pinecall/core/credentials";
import { dayAndTime } from "../../lib/format";
import { inTheOtherWorld, WORLD } from "../../lib/mode";
import { Button, Card, CardHead, Empty, Page, PageHead, Pill, Refused, Stat, Stats } from "../../ui";
import type { EvalRun } from "./door";
import { RunDetail } from "./run-detail";
import { RunTable } from "./run-table";
import { SuiteForm } from "./suite-form";
import { readGoldens, startSuite, type Listed, type Roster } from "./testing";
import { useEvalRuns } from "./use-eval-runs";
import "./evals.css";

const GOLDEN_COLUMNS = "minmax(0,1fr) 110px 90px";

/** One-word label for a golden: the kind of its first expectation. */
function kindOf(golden: Listed): string {
  const keys = Object.keys(golden.expect);
  if (keys.includes("tools") || keys.includes("not_tools")) return "tool call";
  if (keys.includes("says") || keys.includes("not")) return "exact phrase";
  if (keys.includes("grounded") || keys.includes("register")) return "judge";
  if (keys.includes("replies")) return "a reply";
  return keys.length === 0 ? "consent" : (keys[0] ?? "—");
}

/** Whether each golden held in a run: every judgment on it, under every model. */
function heldIn(run: EvalRun | undefined): Map<string, boolean> {
  const held = new Map<string, boolean>();
  for (const cell of run?.matrix?.runs ?? []) {
    const now = cell.scores.every((score) => score.passed);
    held.set(cell.golden, (held.get(cell.golden) ?? true) && now);
  }
  return held;
}

// All state lives in the URL (`?run=`) so a regression can be shared as a link. How the agent's REAL
// calls are judged is Quality's; this is the goldens alone.
export function Evals(): ReactNode {
  const agent = useParams()["agent"] ?? "";
  const credentials = useCredentials();
  const [params, setParams] = useSearchParams();
  const runs = useEvalRuns(agent);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [away, setAway] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  // Suites run through a developer's local class, so only the sandbox can start them.
  const suites = WORLD === "sandbox";

  useEffect(() => {
    let gone = false;
    readGoldens(credentials, agent).then(
      (read) => {
        if (!gone) setRoster(read);
      },
      (failed: unknown) => {
        if (!gone) setAway(failed instanceof Error ? failed.message : String(failed));
      },
    );
    return () => {
      gone = true;
    };
  }, [credentials, agent]);

  const selected = params.get("run");
  const open = runs.runs.find((run) => run.id === selected) ?? null;
  const latest = runs.runs.find((run) => run.matrix !== null);
  const held = heldIn(latest);
  const goldens: Listed[] = roster !== null && roster.agent === agent ? roster.goldens : [];
  const names = goldens.length > 0 ? goldens.map((one) => one.name) : [...held.keys()];
  const passing = [...held.values()].filter(Boolean).length;
  const failing = held.size - passing;

  const select = (next: Record<string, string | null>): void => {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value === null) merged.delete(key);
      else merged.set(key, value);
    }
    setParams(merged);
  };

  const runAll = async (): Promise<void> => {
    setStarting(true);
    setRefused(null);
    try {
      const opened = await startSuite(credentials, {
        agent,
        goldens: goldens.map((one) => one.name),
        voice: false,
      });
      select({ run: opened });
    } catch (failed) {
      setRefused(failed instanceof Error ? failed.message : String(failed));
    } finally {
      setStarting(false);
    }
  };

  return (
    <Page width={1060} tight>
      <PageHead
        title="Goldens"
        ledeWidth={640}
        lede="Fixed questions replayed against the agent as it is now: is a change safe to ship? A golden is fixed and the agent is the variable — never soften one so a change can pass."
      />

      <Stats min={150}>
        <Stat size="small" label="Goldens" value={names.length === 0 ? "—" : names.length} />
        <Stat size="small" label="Passing" value={latest === undefined ? "—" : passing} tone={latest === undefined ? undefined : "green"} />
        <Stat size="small" label="Failing" value={latest === undefined ? "—" : failing} tone={latest === undefined || failing === 0 ? undefined : "red"} />
        <div className="ui-stat ui-stat-small">
          <div className="ui-stat-label">Last run</div>
          <div className="ev-last">{runs.runs[0] === undefined ? "never" : dayAndTime(runs.runs[0].started_at)}</div>
        </div>
      </Stats>

      <Card>
        <CardHead
          title="Golden questions"
          action={
            suites ? (
              goldens.length > 0 && (
                <Button kind="primary" size="sm" disabled={starting} onClick={() => void runAll()}>
                  {starting ? "Opening…" : "Run all"}
                </Button>
              )
            ) : (
              // A suite runs through a developer's own class, so it is started from the sandbox: the
              // same screen there, on the same key.
              <Button size="sm" onClick={() => window.location.assign(inTheOtherWorld(window.location.pathname))}>
                Run them in the sandbox
              </Button>
            )
          }
        />
        {names.length === 0 && (
          <Empty>
            {roster !== null && roster.agent !== agent
              ? roster.agent === null
                ? "No agent class in the directory the agent's `pinecall start` runs in, so no goldens to read."
                : `The process holding the agent runs in ${roster.agent}'s directory; its goldens are that agent's.`
              : away !== null && runs.runs.length === 0
                ? "The goldens are files beside the class, read by the process holding the agent — and no run has been stored yet to list them from."
                : "No goldens for this agent yet: write one in its goldens folder — test/goldens, or test/goldens/<name> in a project of several."}
          </Empty>
        )}
        <div className="ev-goldens">
          {names.map((name) => {
            const golden = goldens.find((one) => one.name === name);
            const standing = held.get(name);
            return (
              <div key={name} className="ui-table-row" style={{ gridTemplateColumns: GOLDEN_COLUMNS }}>
                <span className="ev-golden-says ui-clip" title={name}>
                  {golden?.input[0] ?? name}
                </span>
                <span className="ui-cell-faint">{golden === undefined ? "—" : kindOf(golden)}</span>
                <span className="ui-cell-end">
                  {standing === undefined ? <Pill tone="muted">not run</Pill> : standing ? <Pill tone="green">pass</Pill> : <Pill tone="red">fail</Pill>}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <Refused>{refused}</Refused>

      {suites ? (
        <>
          {roster !== null && roster.agent === agent && goldens.length > 0 && <SuiteForm agent={agent} roster={roster} onOpened={(run) => select({ run })} />}
          <Card>
            <CardHead title="Runs" meta={`${runs.runs.length} · the same rows pinecall runs list prints`} />
            <Refused>{runs.error}</Refused>
            {runs.runs.length > 0 ? (
              <RunTable runs={runs.runs} selected={selected} onSelect={(id) => select({ run: id })} />
            ) : (
              <Empty>
                {runs.reading ? "Reading…" : "No run has been stored yet. A run appears here the moment one opens — from this page, a laptop or CI."}
              </Empty>
            )}
          </Card>
          {open !== null && <RunDetail run={open} before={runs.runs[runs.runs.indexOf(open) + 1]} />}
        </>
      ) : (
        <Card>
          <CardHead title="Runs" meta={`${runs.runs.length} · the same rows pinecall runs list prints`} />
          <Refused>{runs.error}</Refused>
          {runs.runs.length > 0 ? (
            <RunTable runs={runs.runs} selected={selected} onSelect={(id) => select({ run: id })} />
          ) : (
            <Empty>No run has been stored yet. Suites run from a developer's directory — the sandbox's console, a laptop or CI — and appear here the moment one opens.</Empty>
          )}
        </Card>
      )}
      {!suites && open !== null && <RunDetail run={open} before={runs.runs[runs.runs.indexOf(open) + 1]} />}
    </Page>
  );
}

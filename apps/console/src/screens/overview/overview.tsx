/** An agent's Overview over a window of days: its numbers, calls and spend a day, how its calls end and are judged, how fast it answers, and what to look at. */

import { type SessionLine, SessionListSchema } from "@pinecall/core/wire/rest";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";

import { read } from "@pinecall/core/api";
import { whoOn } from "@pinecall/core/calls";
import { useCredentials } from "@pinecall/core/credentials";
import { seconds } from "@pinecall/core/metrics";
import { ago, percent, spend, webVisitor } from "../../lib/format";
import { useInsights, useWindowDays, WindowPicker, windowSaid } from "../../lib/insights";
import { Card, CardHead, Empty, Page, PageHead, Pill, Refused, Stat, Stats } from "../../ui";
import { LATENCY_NAMES } from "../call";
import { readPipeline, type Report } from "../pipeline/door";
import { CallsByDay, CHANNEL_NAME, Legend, Shares, SpendByDay } from "./charts";
import { CHANNELS, daysOf, worthALook } from "./counted";
import "./overview.css";

// The numbers are the gateway's count over the window, however many calls it holds; the newest
// calls are read only for the list a reviewer opens first, and for when the last one came in.
const NEWEST = 50;

// A day's numbers do not need the floor's three seconds.
const EVERY_MS = 10000;

const FLAG_SAID = { escalated: "a person took part", low_score: "a judge said no", promise: "an unrecorded promise" } as const;

/** The agent's newest calls, re-read on a slow clock, and whatever the door refused with. */
function useNewestCalls(agent: string): { lines: SessionLine[] | null; refused: string | null } {
  const credentials = useCredentials();
  const [lines, setLines] = useState<SessionLine[] | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  useEffect(() => {
    let gone = false;
    const ask = async (): Promise<void> => {
      try {
        const listed = SessionListSchema.parse(await read(credentials, "/v1/sessions", { agent, limit: NEWEST }));
        if (!gone) {
          setLines(listed.calls);
          setRefused(null);
        }
      } catch (failed) {
        if (!gone) setRefused(failed instanceof Error ? failed.message : String(failed));
      }
    };
    void ask();
    const again = window.setInterval(() => void ask(), EVERY_MS);
    return () => {
      gone = true;
      window.clearInterval(again);
    };
  }, [credentials, agent]);
  return { lines, refused };
}

/** How fast the agent's turns were, from its pipeline report: undefined while asked, null when the door refused. */
function usePipeline(agent: string): { report: Report | null | undefined; refused: string | null } {
  const credentials = useCredentials();
  const [report, setReport] = useState<Report | null | undefined>(undefined);
  const [refused, setRefused] = useState<string | null>(null);
  useEffect(() => {
    let gone = false;
    readPipeline(credentials, agent).then(
      (read) => {
        if (!gone) setReport(read);
      },
      (failed: unknown) => {
        if (gone) return;
        setReport(null);
        setRefused(failed instanceof Error ? failed.message : String(failed));
      },
    );
    return () => {
      gone = true;
    };
  }, [credentials, agent]);
  return { report, refused };
}

export function Overview(): ReactNode {
  const agent = useParams()["agent"] ?? "";
  const base = `/a/${encodeURIComponent(agent)}`;
  const { lines, refused } = useNewestCalls(agent);
  const { report, refused: unmeasured } = usePipeline(agent);
  const [range, pickRange] = useWindowDays();
  const counted = useInsights({ agent, days: range });
  const days = useMemo(() => daysOf(counted?.series ?? []), [counted]);
  const flagged = useMemo(() => worthALook(lines ?? []), [lines]);
  const last = lines?.[0];
  const calls = counted?.conversations.now ?? 0;

  return (
    <Page tight>
      <div className="ovw">
      <PageHead
        title={agent}
        lede={
          counted === null
            ? "Counting its calls…"
            : `${calls} ${calls === 1 ? "call" : "calls"} ${windowSaid(range)}${last?.started_at == null ? "" : `, the last ${ago(last.started_at)}`}. Days are UTC.`
        }
        actions={<WindowPicker days={range} onPick={pickRange} />}
      />
      <Refused>{refused}</Refused>

      <Stats min={160}>
        <Stat label="Calls" value={counted === null ? "—" : calls} of={(counted?.live ?? 0) > 0 ? `· ${counted?.live ?? 0} live now` : undefined} />
        <Stat
          label="Judges held"
          value={counted === null || counted.judged === 0 ? "—" : percent(counted.passed / counted.judged)}
          of={counted === null || counted.judged === 0 ? undefined : `${counted.passed} of ${counted.judged}`}
          accent
        />
        <Stat label="Mean length" value={counted?.mean_length_s == null ? "—" : minutesOf(counted.mean_length_s)} />
        <Stat label="Spend" value={counted === null ? "—" : spend(counted.spend_usd)} of={counted === null || calls === 0 ? undefined : `${spend(counted.spend_usd / calls)} a call`} />
        <Stat label="A person took part" value={counted === null ? "—" : counted.escalated} of={counted === null || calls === 0 ? undefined : percent(counted.escalated / calls)} />
      </Stats>

      <div className="ovw-grid2">
        <Card>
          <CardHead title="Calls a day" meta={<Legend />} />
          <CallsByDay days={days} />
        </Card>
        <Card>
          <CardHead title="Spend a day" meta="provider fees, in dollars" />
          <SpendByDay days={days} />
        </Card>
      </div>

      <div className="ovw-grid3">
        <Card>
          <CardHead title="How calls end" />
          {(counted?.endings.length ?? 0) === 0 ? (
            <Empty>No call has ended {windowSaid(range)}.</Empty>
          ) : (
            <Shares rows={(counted?.endings ?? []).slice(0, 6).map((one) => ({ name: one.reason.replace(/_/g, " "), count: one.count }))} />
          )}
        </Card>
        <Card>
          <CardHead title="Where they come in" />
          <Shares tone="channel" rows={CHANNELS.map((channel) => ({ name: CHANNEL_NAME[channel], count: counted?.channels[channel] ?? 0, key: channel }))} />
        </Card>
        <Card>
          <CardHead title="How fast it answers" meta={report === undefined ? "reading…" : report === null ? undefined : `median over ${report.calls} calls`} />
          {report === undefined ? null : report === null ? (
            <Empty>{unmeasured}</Empty>
          ) : report.medians.length === 0 ? (
            <Empty>No turn has been measured yet.</Empty>
          ) : (
            <div className="ovw-latency">
              {report.medians.map((one) => (
                <div key={one.name} className="ovw-latency-one">
                  <span className="ovw-latency-value">{one.name === "talk_share" ? percent(one.seconds) : seconds(one.seconds)}</span>
                  <span className="ovw-latency-name">{LATENCY_NAMES[one.name] ?? one.name}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHead title="Worth a look" meta="the newest calls a reviewer should open first" action={<Link className="ui-card-action" to={`${base}/inbox`}>All calls</Link>} />
        {flagged.length === 0 ? (
          <Empty>Nothing to look at: no call of these went to a person, broke a judge, or promised what no tool recorded.</Empty>
        ) : (
          flagged.map((line) => (
            <Link key={line.call} to={`${base}/inbox/${line.call}`} className="ovw-flagged">
              <span className="ovw-flagged-who">{whoOn(line, webVisitor)}</span>
              <span className="ovw-flagged-what">{line.outcome ?? "—"}</span>
              <span className="ovw-flagged-flags">
                {line.flags?.map((flag) => (
                  <Pill key={flag} tone={flag === "low_score" ? "red" : "amber"} small>
                    {FLAG_SAID[flag]}
                  </Pill>
                ))}
              </span>
              <span className="ovw-flagged-when">{ago(line.started_at)}</span>
            </Link>
          ))
        )}
      </Card>
      </div>
    </Page>
  );
}

/** `2m 14s`: a mean length, the way the calls list says one. */
function minutesOf(total: number): string {
  const whole = Math.round(total);
  return `${Math.floor(whole / 60)}m ${String(whole % 60).padStart(2, "0")}s`;
}

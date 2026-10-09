/** Observability: the window's days as series — latency per stage, how calls end, judges, tool failures, cost — every agent's or the one in view. */

import { useMemo, type ReactNode } from "react";
import { useParams } from "react-router";

import { useWindowDays, windowSaid, WindowPicker } from "../../lib/insights";
import { useSeries, type SeriesDay } from "../../lib/series";
import { Card, CardHead, Empty, Page, PageHead } from "../../ui";
import { Lines, type Line } from "./lines";
import "./observability.css";

const STAGE_NAME: Record<string, string> = { stt: "Transcription", llm: "First token", tts: "First audio" };

const seconds = (value: number): string => (value >= 10 ? `${Math.round(value)} s` : `${(Math.round(value * 100) / 100).toFixed(2)} s`);
const percent = (value: number): string => `${Math.round(value * 100)}%`;
const count = (value: number): string => `${Math.round(value)}`;
const dollars = (value: number): string => `$${value.toFixed(2)}`;

function stageOf(day: SeriesDay, stage: string): SeriesDay["stages"][number] | undefined {
  return day.stages.find((one) => one.stage === stage);
}

/** Every number is the gateway's count over whole UTC days; a day nobody called is a gap, not a zero. */
export function Observability(): ReactNode {
  const agent = useParams()["agent"] ?? "";
  const asked = agent === "" ? undefined : agent;
  const [range, pickRange] = useWindowDays(7);
  const answered = useSeries({ agent: asked, days: range });
  const series = answered?.days === range ? answered.series : null;
  const days = useMemo(() => (series ?? []).map((day) => day.day), [series]);

  const latency: Line[] = useMemo(() => {
    const rows = series ?? [];
    return [
      { name: "End to end, median", values: rows.map((day) => day.e2e_median_s), tone: 1 },
      { name: "End to end, p95", values: rows.map((day) => day.e2e_p95_s), tone: 2 },
    ];
  }, [series]);
  const stages: Line[] = useMemo(() => {
    const rows = series ?? [];
    return (["stt", "llm", "tts"] as const).flatMap((stage, at): Line[] => [
      { name: `${STAGE_NAME[stage]}, median`, values: rows.map((day) => stageOf(day, stage)?.median_s ?? null), tone: (at + 1) as 1 | 2 | 3 },
    ]);
  }, [series]);
  const tails: Line[] = useMemo(() => {
    const rows = series ?? [];
    return (["stt", "llm", "tts"] as const).map((stage, at): Line => ({ name: `${STAGE_NAME[stage]}, p95`, values: rows.map((day) => stageOf(day, stage)?.p95_s ?? null), tone: (at + 1) as 1 | 2 | 3 }));
  }, [series]);
  const judges: Line[] = useMemo(() => {
    const rows = series ?? [];
    const names = [...new Set(rows.flatMap((day) => day.judges.map((judge) => judge.name)))].sort();
    return names.slice(0, 4).map((name, at): Line => ({
      name,
      values: rows.map((day) => {
        const judge = day.judges.find((one) => one.name === name);
        return judge === undefined || judge.judged === 0 ? null : judge.held / judge.judged;
      }),
      tone: ((at % 4) + 1) as 1 | 2 | 3 | 4,
    }));
  }, [series]);
  const calls: Line[] = useMemo(() => {
    const rows = series ?? [];
    return [
      { name: "Calls", values: rows.map((day) => (day.calls === 0 ? null : day.calls)), tone: 1 },
      { name: "A person took over", values: rows.map((day) => (day.calls === 0 ? null : day.escalated)), tone: 3 },
    ];
  }, [series]);
  const tools: Line[] = useMemo(() => {
    const rows = series ?? [];
    return [
      { name: "Tools ran", values: rows.map((day) => (day.calls === 0 ? null : day.tools_ran)), tone: 1 },
      { name: "Tools that failed", values: rows.map((day) => (day.calls === 0 ? null : day.tools_failed)), tone: 3 },
    ];
  }, [series]);
  const spend: Line[] = useMemo(() => [{ name: "Spend", values: (series ?? []).map((day) => (day.calls === 0 ? null : day.spend_usd)), tone: 4 }], [series]);
  const endings = useMemo(() => {
    const totals = new Map<string, number>();
    for (const day of series ?? []) for (const ending of day.endings) totals.set(ending.reason, (totals.get(ending.reason) ?? 0) + ending.count);
    return [...totals].sort((a, b) => b[1] - a[1]);
  }, [series]);

  return (
    <Page>
      <PageHead
        title="Observability"
        lede={`How ${agent === "" ? "every agent" : agent} ran over ${windowSaid(range)}: how fast each stage answered, how calls ended, what the judges held, which tools failed, what it cost — day by day.`}
        actions={<WindowPicker days={range} onPick={pickRange} />}
      />
      {series !== null && series.every((day) => day.calls === 0) && <Empty>No call in {windowSaid(range)}. The charts fill in as calls come.</Empty>}
      <div className="obs-grid">
        <Card pad>
          <CardHead title="Latency, end to end" meta="from the caller's last word to the agent's first" />
          <Lines days={days} lines={latency} says={seconds} label="End-to-end latency a day" />
        </Card>
        <Card pad>
          <CardHead title="Latency by stage, median" meta="transcription, first token, first audio" />
          <Lines days={days} lines={stages} says={seconds} label="Median latency by stage a day" />
        </Card>
        <Card pad>
          <CardHead title="Latency by stage, p95" meta="the slow tail" />
          <Lines days={days} lines={tails} says={seconds} label="p95 latency by stage a day" />
        </Card>
        <Card pad>
          <CardHead title="Judges" meta="the share of verdicts each judge held" />
          <Lines days={days} lines={judges} says={percent} label="Held rate by judge a day" ceiling={1} />
        </Card>
        <Card pad>
          <CardHead title="Calls" meta="and how many a person took over" />
          <Lines days={days} lines={calls} says={count} label="Calls a day" />
        </Card>
        <Card pad>
          <CardHead title="Tools" meta="runs, and the ones that answered an error" />
          <Lines days={days} lines={tools} says={count} label="Tool runs and failures a day" />
        </Card>
        <Card pad>
          <CardHead title="Spend" meta="every vendor, in US dollars" />
          <Lines days={days} lines={spend} says={dollars} label="Spend a day" />
        </Card>
        <Card pad>
          <CardHead title="How calls ended" meta={windowSaid(range)} />
          {endings.length === 0 ? (
            <p className="obs-quiet">No call ended in these days.</p>
          ) : (
            <div className="obs-endings">
              {endings.map(([reason, total]) => (
                <div key={reason} className="obs-ending">
                  <span className="ui-fixed">{reason.replaceAll("_", " ")}</span>
                  <span className="obs-ending-count">{total}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}

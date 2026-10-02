/** Home screen: the window's numbers (today, a week, a month), today's calls needing review, who is on the floor, channels. */

import type { ReactNode } from "react";

import { useInsights, useWindowDays, WindowPicker, windowSaid, type Insights } from "../../lib/insights";
import { Minutes, minutesMeter, useLimits } from "../../lib/limits";
import { useOrg } from "../../lib/org";
import { type SessionLine } from "@pinecall/core/wire/rest";
import { elapsed, whoOn } from "@pinecall/core/calls";
import { change, duration, percent, spend, startedOn, today, ago, utcDay, webVisitor } from "../../lib/format";
import { useScores, type Scored } from "../../lib/use-scores";
import { useWhoami } from "../../lib/whoami";
import { Avatar, Bar, ButtonLink, Card, CardAction, CardFoot, CardHead, Dot, Empty, Page, PageHead, Pill, Row, Stat, Stats, type Tint, type Tone } from "../../ui";
import { Setup } from "./setup";
import "./home.css";

// Outcomes where a human stepped in.
const ESCALATED = new Set(["transferred", "supervisor_ended"]);

type Flag = "escalated" | "low score" | "promise made";

interface Look {
  row: Scored;
  flag: Flag;
  reason: string;
}

const FLAG_TONE: Record<Flag, { pill: Tone; tint: Tint }> = {
  escalated: { pill: "red", tint: "red" },
  "low score": { pill: "amber", tint: "amber" },
  "promise made": { pill: "indigo", tint: "indigo" },
};

const FLAG_WORDS: Record<string, Flag> = { escalated: "escalated", low_score: "low score", promise: "promise made" };

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 19 ? "Good afternoon" : "Good evening";
}

/** Today's finished calls that were escalated or failed a judge. */
function needingALook(rows: Scored[]): Look[] {
  const found: Look[] = [];
  for (const row of rows) {
    const { score } = row;
    const line = row.line as SessionLine;
    // Older gateways send no flags; derive them below.
    if (line.flags !== undefined && line.flags !== null) {
      const first = line.flags.map((one) => FLAG_WORDS[one]).find((one) => one !== undefined);
      if (first !== undefined) found.push({ row, flag: first, reason: line.score?.reason ?? line.outcome ?? "" });
      continue;
    }
    if (line.end_reason !== null && ESCALATED.has(line.end_reason)) {
      found.push({ row, flag: "escalated", reason: line.outcome ?? (line.end_reason === "transferred" ? "Handed to a person" : "A supervisor ended it") });
    } else if (score !== null && score.passed === false) {
      const broken = score.judges.find((judge) => judge.verdict === "broken");
      found.push({ row, flag: "low score", reason: broken?.reason ?? line.outcome ?? "A judge did not hold" });
    }
  }
  return found;
}

function resolvedShare(lines: SessionLine[]): number | null {
  const finished = lines.filter((line) => !line.live);
  if (finished.length === 0) return null;
  return finished.filter((line) => line.end_reason === null || !ESCALATED.has(line.end_reason)).length / finished.length;
}

export function Home(): ReactNode {
  const whose = useWhoami();
  const { lines, live, insights } = useOrg();
  const days = today();
  const ofToday = startedOn(lines, days.today);
  const ofYesterday = startedOn(lines, days.yesterday);
  const scored = useScores(ofToday);
  const looks = needingALook(scored);
  const first = (whose?.name ?? "").split(" ")[0] ?? "";

  // The numbers are the gateway's count over the window picked; the window before it, of the same
  // length, is what they are compared with. A gateway that refuses the door leaves the loaded page,
  // which only knows today.
  const [range, pickRange] = useWindowDays();
  const counted = useInsights({ days: range });
  const before = useInsights({ day: utcDay(Date.now() / 1000 - range * 86400), days: range });
  const said = counted === null ? "today" : windowSaid(range);
  const count = counted?.conversations.now ?? ofToday.length;
  const conversations = change(count, counted?.conversations.before ?? ofYesterday.length);
  const resolved = counted === null ? resolvedShare(ofToday) : counted.resolved_rate;
  const resolvedBefore = counted === null ? resolvedShare(ofYesterday) : (before?.resolved_rate ?? null);
  const resolvedDelta = resolved === null || resolvedBefore === null ? null : Math.round((resolved - resolvedBefore) * 100);
  const spent = counted?.spend_usd ?? ofToday.reduce((sum, line) => sum + (line.cost?.usd ?? 0), 0);
  const limit = counted?.budget.limit_usd ?? null;
  // "Needs a look" is today's calls, whatever the window: the day's count is the org's own read.
  const countedToday = insights?.conversations.now ?? ofToday.length;
  const meter = minutesMeter(useLimits());

  const floor = live.length === 0 ? "Nobody on a call right now" : live.length === 1 ? "One call on the floor" : `${live.length} calls on the floor`;
  const looking = looks.length === 0 ? "nothing needs a look" : looks.length === 1 ? "one conversation needs a look" : `${looks.length} conversations need a look`;

  return (
    <Page>
      <PageHead
        title={first === "" ? greeting() : `${greeting()}, ${first}`}
        lede={`${floor}, ${looking}, everything else handled.`}
        actions={counted === null ? undefined : <WindowPicker days={range} onPick={pickRange} />}
      />

      <Stats min={190}>
        <Stat size="big" label="Conversations" value={count} delta={conversations?.text} tone={conversations?.tone} />
        <Stat
          size="big"
          label="Resolved without a human"
          value={resolved === null ? "—" : percent(resolved)}
          delta={resolvedDelta === null ? undefined : resolvedDelta === 0 ? "steady" : `${resolvedDelta > 0 ? "+" : "−"}${Math.abs(resolvedDelta)} pts`}
          tone={resolvedDelta === null || resolvedDelta === 0 ? "flat" : resolvedDelta > 0 ? "up" : "down"}
        />
        {counted !== null && <Median insights={counted} before={before} said={said} />}
        <Stat size="big" label={counted === null || range === 1 ? "Spend today" : "Spend"} value={spend(spent)} delta={limit === null ? said : `of $${limit} a month`} tone="flat" />
        {meter !== null && <Minutes meter={meter} size="big" />}
      </Stats>

      <div className="home-split">
        <Card>
          <CardHead title="Needs a look" meta={`${looks.length} of ${countedToday} today`} action={<CardAction to="/calls">All calls</CardAction>} />
          {looks.length === 0 && <Empty>Nothing today needs a look: no call went to a person, and no judge said no.</Empty>}
          {looks.map((look) => (
            <Row
              key={look.row.line.call}
              to={`/calls/${look.row.line.call}`}
              lead={<Avatar name={whoOn(look.row.line, webVisitor)} tint={FLAG_TONE[look.flag].tint} />}
              name={whoOn(look.row.line, webVisitor)}
              tag={
                <Pill tone={FLAG_TONE[look.flag].pill} small>
                  {look.flag}
                </Pill>
              }
              sub={look.reason}
              end={
                <>
                  <div className="ui-row-end-1">
                    {look.row.line.channel ?? "—"} · {duration(look.row.line)}
                  </div>
                  <div className="ui-row-end-2">{ago(look.row.line.started_at)}</div>
                </>
              }
            />
          ))}
          <CardFoot>
            <span>{Math.max(0, countedToday - looks.length)} more handled cleanly</span>
            <CardAction to="/calls">See every call</CardAction>
          </CardFoot>
        </Card>

        <div className="home-side">
          <Card>
            <CardHead title={<span className="home-floor-title"><Dot tone={live.length > 0 ? "green" : undefined} /><span className="ui-card-title">On the floor now</span></span>} />
            <div className="home-floor">
              {live.length === 0 && <div className="home-quiet">Nobody is on a call. A call that rings appears here the moment it does.</div>}
              {live.slice(0, 4).map((line) => (
                <div key={line.call} className="home-live">
                  <Avatar name={whoOn(line, webVisitor)} tint="green" />
                  <div className="ui-row-main">
                    <div className="home-live-name">{whoOn(line, webVisitor)}</div>
                    <div className="home-live-sub">
                      {line.agent} · {line.channel ?? "—"} · {elapsed(line.started_at)}
                    </div>
                  </div>
                  <ButtonLink to={`/calls/${line.call}`} size="xs">
                    Listen
                  </ButtonLink>
                </div>
              ))}
            </div>
          </Card>

          <Channels lines={ofToday.length > 0 ? ofToday : lines} counted={counted !== null && count > 0 ? counted.channels : null} />
          <Setup />
        </div>
      </div>
    </Page>
  );
}

const CHANNELS: readonly { channel: string; name: string; color: string }[] = [
  { channel: "phone", name: "Phone", color: "var(--accent)" },
  { channel: "web", name: "Web", color: "var(--accent-2)" },
  { channel: "whatsapp", name: "WhatsApp", color: "var(--accent-3)" },
];

/** Median response time of the window's turns, against the window before. */
function Median({ insights, before, said }: { insights: Insights; before: Insights | null; said: string }): ReactNode {
  const now = insights.median_e2e_s;
  const then = before?.median_e2e_s ?? null;
  let delta = said;
  let tone: "up" | "down" | "flat" = "flat";
  if (now !== null && then !== null) {
    const moved = Math.round((now - then) * 10) / 10;
    if (Math.abs(moved) < 0.1) delta = "steady";
    else {
      delta = `${moved > 0 ? "+" : "−"}${Math.abs(moved).toFixed(1)}s`;
      tone = moved > 0 ? "down" : "up";
    }
  }
  return <Stat size="big" label="Median answer" value={now === null ? "—" : `${now.toFixed(1)}s`} delta={delta} tone={tone} />;
}

/** Calls by channel: the gateway's count when available, else the page's. */
function Channels({ lines, counted }: { lines: SessionLine[]; counted: Insights["channels"] | null }): ReactNode {
  const total = counted === null ? lines.length : counted.phone + counted.web + counted.whatsapp;
  const of = (channel: string): number =>
    counted === null ? lines.filter((line) => line.channel === channel).length : (counted[channel as keyof Insights["channels"]] ?? 0);
  return (
    <Card>
      <div className="ui-card-head">
        <span className="ui-card-title">Where calls arrive</span>
      </div>
      <div className="home-channels">
        {CHANNELS.map(({ channel, name, color }) => {
          const share = total === 0 ? 0 : of(channel) / total;
          return (
            <div key={channel}>
              <div className="home-channel-line">
                <span className="home-channel-name">{name}</span>
                <span className="home-channel-share">{percent(share)}</span>
              </div>
              <Bar share={share} color={color} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

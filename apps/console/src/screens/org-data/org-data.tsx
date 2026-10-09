/** Data & privacy: the org's rules, what a call says first, consent and the list, export, a contact erased, the erasure trail, who read what. */

import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { saidBy } from "@pinecall/core/api";
import { useCredentials } from "@pinecall/core/credentials";
import { dayAndTime } from "../../lib/format";
import { nameOf, useNames } from "../../lib/names";
import { useWorld } from "../../lib/world";
import { Button, Card, CardHead, Empty, Input, Page, PageHead, Pill, Refused, Select, SelectItem, TableHead } from "../../ui";
import { eraseContact, exportWorld, putPolicy, readPolicy, readTrail, NOTHING_SET, type Erasure, type Policy, type PolicyRow } from "./door";
import { OpeningCard } from "./opening";
import { ReadsCard } from "./reads";
import { DoNotCallCard } from "./do-not-call";
import "./org-data.css";

const COLUMNS = "150px 90px minmax(0,1.2fr) minmax(0,1.6fr) minmax(0,1fr) 90px";

/**
 * What the org keeps in this console's world and for how long, taking it out, and erasing it. Every
 * erasure — from here, from a call's page, from `pinecall data`, from the nightly retention run —
 * is a row of the trail, which outlives the org.
 */
export function OrgData(): ReactNode {
  const credentials = useCredentials();
  const { world } = useWorld();
  const [policy, setPolicy] = useState<PolicyRow | null>(null);
  const [trail, setTrail] = useState<Erasure[] | null>(null);
  const [refused, setRefused] = useState<string | null>(null);

  const reread = async (): Promise<void> => {
    const [kept, erased] = await Promise.all([readPolicy(credentials), readTrail(credentials)]);
    setPolicy(kept);
    setTrail(erased);
  };

  useEffect(() => {
    let gone = false;
    Promise.all([readPolicy(credentials), readTrail(credentials)]).then(
      ([kept, erased]) => {
        if (gone) return;
        setPolicy(kept);
        setTrail(erased);
      },
      (failed: unknown) => {
        if (!gone) setRefused(saidBy(failed));
      },
    );
    return () => {
      gone = true;
    };
  }, [credentials]);

  return (
    <Page tight>
      <PageHead
        title="Data & privacy"
        ledeWidth={660}
        lede={`What this org keeps in ${world}, for how long, and how it comes out or goes away. An erasure cannot be undone: the call's log, its facts, the memories it taught and its recording go in one transaction, and a row below says so.`}
      />
      <Refused>{refused}</Refused>
      <Rules policy={policy} onSaved={setPolicy} onRefused={setRefused} />
      <OpeningCard policy={policy} onSaved={setPolicy} onRefused={setRefused} />
      <DoNotCallCard onRefused={setRefused} />
      <TakeItOut onRefused={setRefused} />
      <EraseAContact onErased={reread} onRefused={setRefused} />
      <Trail rows={trail} />
      <ReadsCard onRefused={setRefused} />
    </Page>
  );
}

const HOURS = Array.from({ length: 25 }, (_, hour) => hour);

/** The org's rules: how long a call is kept, the called number's hours, calls a day per number. */
function Rules({ policy, onSaved, onRefused }: { policy: PolicyRow | null; onSaved: (row: PolicyRow) => void; onRefused: (said: string | null) => void }): ReactNode {
  const credentials = useCredentials();
  const [days, setDays] = useState("");
  const [count, setCount] = useState("");
  const [busy, setBusy] = useState(false);
  const kept = policy?.policy ?? NOTHING_SET;
  const hours = kept.calling_hours ?? null;

  const save = async (changes: Partial<Policy>): Promise<void> => {
    setBusy(true);
    onRefused(null);
    try {
      onSaved(await putPolicy(credentials, kept, changes));
      setDays("");
      setCount("");
    } catch (failed) {
      onRefused(saidBy(failed));
    } finally {
      setBusy(false);
    }
  };

  const aCount = (typed: string, what: string): number | undefined => {
    const wanted = Number(typed);
    if (Number.isInteger(wanted) && wanted >= 1) return wanted;
    onRefused(`${what} is a whole number, 1 or more.`);
    return undefined;
  };

  const saveDays = (event: FormEvent): void => {
    event.preventDefault();
    const wanted = aCount(days, "Retention");
    if (wanted !== undefined) void save({ retention_days: wanted });
  };

  const saveCount = (event: FormEvent): void => {
    event.preventDefault();
    const wanted = aCount(count, "The count");
    if (wanted !== undefined) void save({ per_number_day: wanted });
  };

  const saveHours = (from: number, until: number): void => {
    if (from >= until) {
      onRefused("Calling hours are a window of the day: from before until.");
      return;
    }
    void save({ calling_hours: { from, until } });
  };

  const setBy = policy?.set_by ? `set by ${policy.set_by}${policy.set_at === null ? "" : ` · ${dayAndTime(policy.set_at)}`}` : "nobody set it";

  return (
    <Card pad>
      <CardHead title="Rules" meta={setBy} />

      <p className="data-sentence">
        <b>Retention.</b>{" "}
        {kept.retention_days == null ? "Every sealed call is kept until somebody erases it." : `A sealed call is erased ${kept.retention_days} day${kept.retention_days === 1 ? "" : "s"} after it started, by the box's run at 04:00.`}
      </p>
      <form className="data-form" onSubmit={saveDays}>
        <label className="ui-label" htmlFor="data-days">Keep a call for</label>
        <Input id="data-days" value={days} inputMode="numeric" placeholder={kept.retention_days == null ? "365" : String(kept.retention_days)} onChange={(event) => setDays(event.target.value)} />
        <span className="data-unit">days</span>
        <Button type="submit" kind="primary" size="form" disabled={busy || days === ""}>Save</Button>
        {kept.retention_days != null && <Button size="form" disabled={busy} onClick={() => void save({ retention_days: null })}>Keep everything</Button>}
      </form>

      <p className="data-sentence data-sentence-next">
        <b>Calling hours.</b>{" "}
        {hours === null ? "A number is rung at any hour of its own day; a US or Canadian number from 8:00 to 21:00 whatever is set here." : `A number is rung from ${hours.from}:00 to ${hours.until}:00 of its own day; a US or Canadian number never before 8:00 or after 21:00.`}
        {" "}The sandbox and your own verified phone are never held to them.
      </p>
      <div className="data-form">
        <label className="ui-label" htmlFor="data-from">From</label>
        <Select id="data-from" className="data-hour" aria-label="From" value={String(hours?.from ?? 8)} disabled={busy} onValueChange={(value) => saveHours(Number(value), hours?.until ?? 21)}>
          {HOURS.slice(0, 24).map((hour) => <SelectItem key={hour} value={String(hour)}>{hour}:00</SelectItem>)}
        </Select>
        <label className="ui-label" htmlFor="data-until">until</label>
        <Select id="data-until" className="data-hour" aria-label="Until" value={String(hours?.until ?? 21)} disabled={busy} onValueChange={(value) => saveHours(hours?.from ?? 8, Number(value))}>
          {HOURS.slice(1).map((hour) => <SelectItem key={hour} value={String(hour)}>{hour}:00</SelectItem>)}
        </Select>
        {hours !== null && <Button size="form" disabled={busy} onClick={() => void save({ calling_hours: null })}>Any hour</Button>}
      </div>

      <p className="data-sentence data-sentence-next">
        <b>Calls to one number a day.</b>{" "}
        {kept.per_number_day == null ? "No limit of the org's own; a US or Canadian number is rung at most three times in 24 hours." : `One number is rung at most ${kept.per_number_day} time${kept.per_number_day === 1 ? "" : "s"} in 24 hours.`}
      </p>
      <form className="data-form" onSubmit={saveCount}>
        <label className="ui-label" htmlFor="data-count">At most</label>
        <Input id="data-count" value={count} inputMode="numeric" placeholder={kept.per_number_day == null ? "3" : String(kept.per_number_day)} onChange={(event) => setCount(event.target.value)} />
        <span className="data-unit">calls a day</span>
        <Button type="submit" kind="primary" size="form" disabled={busy || count === ""}>Save</Button>
        {kept.per_number_day != null && <Button size="form" disabled={busy} onClick={() => void save({ per_number_day: null })}>No limit</Button>}
      </form>

      <p className="data-sentence data-sentence-next">
        <b>Consent in every country.</b>{" "}
        {kept.consent_everywhere === true
          ? "A call to any number in production needs a consent on file or sent with the dial."
          : "A call to a US or Canadian number in production needs a consent on file; other countries do not, unless this is on."}
      </p>
      <Button size="form" disabled={busy} onClick={() => void save({ consent_everywhere: kept.consent_everywhere !== true })}>
        {kept.consent_everywhere === true ? "Only where the law asks" : "Ask for consent everywhere"}
      </Button>
    </Card>
  );
}

/** The whole world, downloaded as JSON Lines. */
function TakeItOut({ onRefused }: { onRefused: (said: string | null) => void }): ReactNode {
  const credentials = useCredentials();
  const { world } = useWorld();
  const [busy, setBusy] = useState(false);

  const download = async (): Promise<void> => {
    setBusy(true);
    onRefused(null);
    try {
      const { file, name } = await exportWorld(credentials);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(file);
      link.download = name;
      link.click();
      // Revoked once the browser has taken the download: revoked at once, some abort it.
      setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
    } catch (failed) {
      onRefused(saidBy(failed));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card pad>
      <CardHead title="Export" meta={`${world}, whole`} />
      <p className="data-sentence">
        Every call with its whole log, every memory, every version of every agent's settings and words, and every knowledge document, as one file of JSON Lines. Recordings stay on each call's page.
      </p>
      <Button size="form" disabled={busy} onClick={() => void download()}>
        {busy ? "Exporting…" : "Download the export"}
      </Button>
    </Card>
  );
}

/** A person's "delete my data": every call they were on in this world, and every fact kept of them. */
function EraseAContact({ onErased, onRefused }: { onErased: () => Promise<void>; onRefused: (said: string | null) => void }): ReactNode {
  const credentials = useCredentials();
  const [who, setWho] = useState("");
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Erasure | null>(null);

  const erase = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (who.trim() === "") return;
    if (!sure) {
      setSure(true);
      return;
    }
    setBusy(true);
    onRefused(null);
    try {
      setDone(await eraseContact(credentials, who.trim()));
      setWho("");
      setSure(false);
    } catch (failed) {
      onRefused(saidBy(failed));
      setBusy(false);
      return;
    }
    // The erasure is done whatever the trail's re-read says: a refusal there is its own.
    await onErased();
    setBusy(false);
  };

  return (
    <Card pad>
      <CardHead title="Erase a contact" meta="cannot be undone" />
      <p className="data-sentence">The number or the id a call carried. Every call they were on in this world goes, with every fact the agents kept of them. The dial ledger keeps the numbers and the time, for a carrier's traceback.</p>
      <form className="data-form" onSubmit={(event) => void erase(event)}>
        <Input value={who} aria-label="The number or the id a call carried" placeholder="+14155550142" onChange={(event) => { setWho(event.target.value); setSure(false); }} />
        <Button type="submit" kind={sure ? "danger" : "primary"} size="form" disabled={busy || who.trim() === ""}>
          {busy ? "Erasing…" : sure ? `Erase ${who.trim()} for good` : "Erase"}
        </Button>
      </form>
      {done !== null && <p className="data-done">{tookLine(done)}</p>}
    </Card>
  );
}

/** Every erasure of the org, newest first. */
function Trail({ rows }: { rows: Erasure[] | null }): ReactNode {
  const names = useNames();
  return (
    <Card>
      <CardHead title="Erasures" meta="both worlds · newest first · kept after the org" />
      {rows !== null && rows.length === 0 ? (
        <Empty>Nothing erased yet.</Empty>
      ) : (
        <>
          <TableHead columns={COLUMNS} labels={["When", "What", "Which", "What went", "Who asked", "World"]} />
          {(rows ?? []).map((row) => (
            <div key={row.id} className="ui-table-row data-row" style={{ gridTemplateColumns: COLUMNS }}>
              <span className="ui-cell-faint">{dayAndTime(row.at)}</span>
              <span>
                <Pill tone={row.what === "org" ? "red" : "gray"}>{row.what}</Pill>
              </span>
              <span className="ui-cell-ink ui-clip" title={row.subject}>
                {row.subject}
              </span>
              <span className="ui-cell-faint ui-clip">{tookLine(row)}</span>
              <span className="ui-cell-faint ui-clip" title={row.asked_by}>
                {nameOf(names, row.asked_by)}
              </span>
              <span className="ui-cell-faint">{row.env ?? "—"}</span>
            </div>
          ))}
        </>
      )}
    </Card>
  );
}

function tookLine(row: Erasure): string {
  return `${row.calls} call${row.calls === 1 ? "" : "s"}, ${row.entries} entries, ${row.memories} memories, ${row.recordings} recording${row.recordings === 1 ? "" : "s"}`;
}

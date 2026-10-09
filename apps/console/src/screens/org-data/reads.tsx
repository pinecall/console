/** Who read what: a person reading a call's log or recording, the operator off the box or in a traceback. */

import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { saidBy } from "@pinecall/core/api";
import { useCredentials } from "@pinecall/core/credentials";
import { readMembers } from "@pinecall/core/members";
import { dayAndTime } from "../../lib/format";
import { Button, Card, CardHead, Empty, Input, Pill, TableHead } from "../../ui";
import { readReads, type Read } from "./door";

const COLUMNS = "150px 100px minmax(0,1.4fr) minmax(0,1fr) 100px";

const WHAT: Record<Read["what"], string> = {
  log: "the log",
  recording: "the recording",
  traceback: "a traceback",
  listen: "listened in",
  supervise: "the desk",
  export: "an export",
  memory: "memory",
};

/**
 * The org's access log, what a breach notification starts from. A read is written once an hour per
 * reader, call and kind; a server's key and a visitor's page write nothing.
 */
export function ReadsCard({ onRefused }: { onRefused: (said: string | null) => void }): ReactNode {
  const credentials = useCredentials();
  const [rows, setRows] = useState<Read[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [subject, setSubject] = useState("");

  useEffect(() => {
    let gone = false;
    readReads(credentials, null).then(
      (read) => {
        if (!gone) setRows(read);
      },
      (failed: unknown) => {
        if (!gone) onRefused(saidBy(failed));
      },
    );
    // Names are a courtesy: a key the members door refuses still reads the log, by id.
    readMembers(credentials).then(
      (members) => {
        if (!gone) setNames(Object.fromEntries(members.map((member) => [member.id, member.name])));
      },
      () => undefined,
    );
    return () => {
      gone = true;
    };
  }, [credentials, onRefused]);

  const look = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    try {
      setRows(await readReads(credentials, subject.trim() === "" ? null : subject.trim()));
    } catch (failed) {
      onRefused(saidBy(failed));
    }
  };

  return (
    <Card pad>
      <CardHead title="Who read what" meta="newest first · once an hour per reader" />
      <p className="data-sentence">
        A person or a server's key reading a call's log or its recording, a seat listening in or taking the desk, an export, a read of what
        memory kept about a contact, and the operator reading one off the box or looking a number up for a carrier's traceback. A visitor's page
        writes nothing.
      </p>
      <form className="data-form" onSubmit={(event) => void look(event)}>
        <Input value={subject} aria-label="A call id or a number" placeholder="a call id or a number, or empty for all" onChange={(event) => setSubject(event.target.value)} />
        <Button type="submit" size="form">
          Show
        </Button>
      </form>
      <div className="data-list">
        {rows !== null && rows.length === 0 ? (
          <Empty>Nobody read a call of this org yet.</Empty>
        ) : (
          <>
            <TableHead columns={COLUMNS} labels={["When", "Read", "Which", "Who", "World"]} />
            {(rows ?? []).map((row, index) => (
              <div key={`${row.at}-${index}`} className="ui-table-row data-row" style={{ gridTemplateColumns: COLUMNS }}>
                <span className="ui-cell-faint">{dayAndTime(row.at)}</span>
                <span>{WHAT[row.what]}</span>
                <span className="ui-cell-ink ui-clip ui-fixed">{row.subject}</span>
                <span className="ui-clip">{row.reader === "operator" ? <Pill tone="violet">the operator</Pill> : (names[row.reader] ?? row.reader)}</span>
                <span className="ui-cell-faint">{row.env ?? "—"}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </Card>
  );
}

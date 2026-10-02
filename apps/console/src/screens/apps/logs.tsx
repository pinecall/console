/** An app's logs, asked again every 3 s while the panel is open: each ask makes the runner send fresh lines. */

import { useEffect, useState, type ReactNode } from "react";

import { saidBy } from "@pinecall/core/api";
import { useCredentials } from "@pinecall/core/credentials";
import { Card, CardHead, Refused, TextAction } from "../../ui";
import { readLogs, type Logs } from "./door";
import { readAgo } from "./fold";

// The runner sends an app's lines with its beat after somebody asked, some 5 s later; asking every
// 3 s keeps them coming for as long as the panel is open, and not a request after it closes.
const EVERY_MS = 3000;

export function LogsPanel({ name, close }: { name: string; close: () => void }): ReactNode {
  const credentials = useCredentials();
  const [logs, setLogs] = useState<Logs | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now() / 1000);

  useEffect(() => {
    let gone = false;
    const ask = (): void => {
      readLogs(credentials, name).then(
        (read) => {
          if (gone) return;
          setLogs(read);
          setRefused(null);
          setNow(Date.now() / 1000);
        },
        (failed: unknown) => {
          if (!gone) setRefused(saidBy(failed));
        },
      );
    };
    ask();
    const timer = window.setInterval(ask, EVERY_MS);
    return () => {
      gone = true;
      window.clearInterval(timer);
    };
  }, [credentials, name]);

  const waiting = logs === null || (logs.lines === "" && logs.at === null);
  const meta = logs === null ? undefined : [readAgo(logs.at, now), logs.host].filter((part) => part !== null).join(" · ");

  return (
    <Card>
      <CardHead title={`Logs · ${name}`} meta={meta} action={<TextAction onClick={close}>Close</TextAction>} />
      <Refused>{refused}</Refused>
      {waiting ? <div className="apps-waiting">asking the box for its lines…</div> : <pre className="ui-code apps-lines">{logs.lines === "" ? "(no lines)" : logs.lines}</pre>}
    </Card>
  );
}

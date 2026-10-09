/** The call's trace id, for the org that exports its traces: the id to search its own tool by, with a copy. */

import { useEffect, useState, type ReactNode } from "react";

import { useCredentials } from "@pinecall/core/credentials";
import { readCollector, traceIdOf } from "../../lib/telemetry";
import { Button, Card, CardHead } from "../../ui";

/** Shown only when the org sends its traces somewhere: there is then a tool to paste the id into. */
export function TraceIdPanel({ call }: { call: string }): ReactNode {
  const credentials = useCredentials();
  const [exported, setExported] = useState<string | null>(null);
  const [traceId, setTraceId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let gone = false;
    readCollector(credentials).then(
      (found) => {
        if (!gone) setExported(found?.endpoint ?? null);
      },
      () => undefined,
    );
    void traceIdOf(call).then((id) => {
      if (!gone) setTraceId(id);
    });
    return () => {
      gone = true;
    };
  }, [credentials, call]);

  if (exported === null || traceId === null) return null;
  return (
    <Card pad>
      <CardHead title="Trace" />
      <div className="ui-fixed ui-clip" title={traceId}>
        {traceId}
      </div>
      <div className="ui-cell-faint">Its spans are in {exported}, under this trace id.</div>
      <Button size="xs" onClick={() => void navigator.clipboard.writeText(traceId).then(() => setCopied(true))}>
        {copied ? "Copied" : "Copy"}
      </Button>
    </Card>
  );
}

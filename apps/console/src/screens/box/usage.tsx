/** Per-org usage, folded from the log one page at a time. */

import { useEffect, useState, type ReactNode } from "react";

import { useCredentials } from "@pinecall/core/credentials";
import { spend, usd } from "../../lib/format";
import { Button, Card, CardFoot, CardHead, Empty, Page, PageHead, Refused, TableHead, TableRow } from "../../ui";
import { readUsage, type Totals, type UsageRow } from "./door-floor";
import { saidBy } from "./use-door";
import "./box.css";

const A_PAGE = 100;
const ORGS = "minmax(0,1.2fr) 110px 110px 140px 140px";
const ROWS = "130px minmax(0,1fr) minmax(0,1.4fr) 110px 80px 80px 90px";

/**
 * No usage table exists: rows fold `call.summary` and `call.score` log entries via a cursor, so a
 * page is a page of the log. Cost is the provider's cost as logged, not a price.
 */
export function BoxUsage(): ReactNode {
  const credentials = useCredentials();
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [totals, setTotals] = useState<Record<string, Totals>>({});
  const [next, setNext] = useState<number | null>(0);
  const [read, setRead] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);

  const page = async (after: number, fresh: boolean): Promise<void> => {
    setBusy(true);
    try {
      const answered = await readUsage(credentials, after, A_PAGE);
      setRows((kept) => (fresh ? answered.rows : [...kept, ...answered.rows]));
      setTotals((kept) => (fresh ? answered.totals : summed(kept, answered.totals)));
      setNext(answered.next ?? null);
      setRead(true);
    } catch (failed) {
      setRefused(saidBy(failed));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void page(0, true);
  }, [credentials]);

  const cost = (org: string): number => rows.filter((row) => row.org === org).reduce((sum, row) => sum + row.cost_usd, 0);

  return (
    <Page tight>
      <PageHead title="Box usage" lede="What every organization consumed, folded off the log by a cursor — there is no counter table to drift from it." />

      <Refused>{refused}</Refused>

      {read && rows.length === 0 && next === null && (
        <Card>
          <Empty>Nothing metered yet: no call of any org has been summarised.</Empty>
        </Card>
      )}

      {Object.keys(totals).length > 0 && (
        <Card>
          <CardHead title="By organization" meta={next === null ? "the whole log" : "the pages read so far"} />
          <TableHead columns={ORGS} labels={["Organization", "Minutes>", "Messages>", "Tokens>", "Cost>"]} />
          {Object.entries(totals).map(([org, sum]) => (
            <TableRow key={org} columns={ORGS}>
              <span className="ui-cell-strong ui-clip">{org}</span>
              <span className="ui-cell-ink ui-cell-right">{sum.minutes.toFixed(1)}</span>
              <span className="ui-cell-ink ui-cell-right">{sum.messages}</span>
              <span className="ui-cell-ink ui-cell-right">{(sum.input_tokens + sum.output_tokens).toLocaleString("en")}</span>
              <span className="ui-cell-ink ui-cell-right">{spend(cost(org))}</span>
            </TableRow>
          ))}
        </Card>
      )}

      {rows.length > 0 && (
        <Card>
          <CardHead title="Metered rows" meta={`${rows.length} read, oldest first`} />
          <TableHead columns={ROWS} labels={["When", "Organization", "Agent · call", "What", "Min>", "Msgs>", "Cost>"]} />
          {rows.map((row) => (
            <TableRow key={`${row.cursor}-${row.call}-${row.type}`} columns={ROWS}>
              <span className="ui-cell-faint">{when(row.at)}</span>
              <span className="ui-cell-ink ui-clip">{row.org}</span>
              <span className="ui-cell-ink ui-clip" title={row.call}>
                {row.agent} <span className="ui-cell-faint box-fixed">{row.call.slice(0, 13)}…</span>
              </span>
              <span className="ui-cell-faint box-fixed">{row.type}</span>
              <span className="ui-cell-ink ui-cell-right">{row.minutes.toFixed(2)}</span>
              <span className="ui-cell-ink ui-cell-right">{row.messages}</span>
              <span className="ui-cell-ink ui-cell-right">{usd(row.cost_usd)}</span>
            </TableRow>
          ))}
          {next !== null && (
            <CardFoot>
              <Button size="sm" disabled={busy} onClick={() => void page(next, false)}>
                {busy ? "Reading…" : "Read on"}
              </Button>
            </CardFoot>
          )}
        </Card>
      )}
    </Page>
  );
}

function when(at: number): string {
  return new Date(at * 1000).toISOString().slice(0, 16).replace("T", " ");
}

/** Merge two pages' totals, summing rows for the same org. */
function summed(kept: Record<string, Totals>, page: Record<string, Totals>): Record<string, Totals> {
  const all = { ...kept };
  for (const [org, sum] of Object.entries(page)) {
    const had = all[org];
    all[org] =
      had === undefined
        ? sum
        : {
            ...sum,
            minutes: had.minutes + sum.minutes,
            messages: had.messages + sum.messages,
            input_tokens: had.input_tokens + sum.input_tokens,
            output_tokens: had.output_tokens + sum.output_tokens,
            characters: had.characters + sum.characters,
          };
  }
  return all;
}

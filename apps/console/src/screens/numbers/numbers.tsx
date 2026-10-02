/** Numbers screen: inbound routes, outbound calling and the org's accounts. */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";

import { GatewayError } from "@pinecall/core/api";
import { useCredentials } from "@pinecall/core/credentials";
import { prettyNumber } from "@pinecall/core/calls";
import { useOrg } from "../../lib/org";
import { useWorld } from "../../lib/world";
import { Button, Card, CardHead, Dot, Empty, Page, PageHead, Pill, Refused, Select, SelectItem, Tabs } from "../../ui";
import { Adding } from "./adding";
import { CarrierPanel } from "./carrier";
import { OutboundPanel } from "./outbound";
import {
  bringCarrier,
  buyNumber,
  dropCarrier,
  importNumber,
  provisionOutbound,
  readAvailable,
  readCarriers,
  readNumbers,
  readOutbound,
  releaseNumber,
  type Answering,
  type Available,
  type Carrier,
  type Outbound,
  type Wired,
} from "./door";
import "./numbers.css";

type Tab = "numbers" | "outbound" | "carrier";

const TABS: readonly { tab: Tab; name: string }[] = [
  { tab: "numbers", name: "Numbers" },
  { tab: "outbound", name: "Outbound calls" },
  { tab: "carrier", name: "Accounts" },
];

/** The tab is kept in `?tab=`. Phone testing for developers is a separate screen (phone.tsx). */
export function Numbers(): ReactNode {
  const credentials = useCredentials();
  const { agents } = useOrg();
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.some((one) => one.tab === params.get("tab")) ? (params.get("tab") as Tab) : "numbers";
  const [carriers, setCarriers] = useState<Carrier[] | undefined>(undefined);
  const [doors, setDoors] = useState<Answering[] | null>(null);
  const [available, setAvailable] = useState<Available | null>(null);
  const [outbound, setOutbound] = useState<Outbound | null>(null);
  // Calls go out through one account: the first that places calls, unless another is picked.
  const [via, setVia] = useState<string | null>(null);
  const { world } = useWorld();
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState<Wired | null>(null);

  const reread = useCallback(async (): Promise<void> => {
    const [brought, answering] = await Promise.all([readCarriers(credentials), readNumbers(credentials)]);
    setCarriers(brought);
    setDoors(answering);
    setAvailable(brought.length === 0 ? null : await readAvailable(credentials).catch(() => null));
    const dialling = brought.filter((one) => one.kind !== "whatsapp");
    const through = dialling.find((one) => one.account === via) ?? dialling[0];
    setVia(through?.account ?? null);
    // Outbound needs an account that places calls; older gateways lack the door.
    setOutbound(through === undefined ? null : await readOutbound(credentials, dialling.length > 1 ? through.account : undefined).catch(() => null));
  }, [credentials, via]);

  useEffect(() => {
    let gone = false;
    reread().catch((failed: unknown) => {
      if (!gone) setRefused(saidBy(failed));
    });
    return () => {
      gone = true;
    };
  }, [reread]);

  // Run one action at a time, show its refusal inline, then reload.
  const moved = async <T,>(move: () => Promise<T>): Promise<T> => {
    setBusy(true);
    setRefused(null);
    try {
      const answered = await move();
      await reread();
      return answered;
    } catch (failed) {
      setRefused(saidBy(failed));
      throw failed;
    } finally {
      setBusy(false);
    }
  };

  const numbered = doors ?? [];
  const dialling = (carriers ?? []).filter((one) => one.kind !== "whatsapp");

  return (
    <Page width={900}>
      <PageHead title="Phone numbers" lede="The numbers people call or write to, which agent picks up, and the calls your agents place." />

      <Tabs
        label="Phone numbers"
        tabs={TABS.map((one) =>
          one.tab === "outbound" && carriers !== undefined ? { ...one, mark: <Dot tone={outbound?.ready ? "green" : "amber"} small /> } : one,
        )}
        on={tab}
        onPick={(picked) => setParams(picked === "numbers" ? {} : { tab: picked })}
      />

      <Refused>{refused}</Refused>

      {tab === "numbers" && doors !== null && carriers !== undefined && (
        <Card>
          <CardHead
            title={`Numbers in ${world}`}
            action={
              !adding ? (
                <Button
                  kind="primary"
                  size="sm"
                  className="ui-card-action"
                  onClick={() => {
                    setAdded(null);
                    setAdding(true);
                  }}
                >
                  Add a number
                </Button>
              ) : undefined
            }
          />
          {numbered.length === 0 && <Empty>No number rings or writes to an agent in {world} yet.</Empty>}
          {numbered.map((door) => (
            <div key={`${door.route.channel}:${door.route.number}`} className="num-row">
              <span className="num-number">{prettyNumber(door.route.number)}</span>
              {door.route.channel === "whatsapp" && (
                <span title="messages on WhatsApp">
                  <Pill tone="green">WhatsApp</Pill>
                </span>
              )}
              <span className="num-arrow" aria-hidden>
                →
              </span>
              <span className="num-agent">{door.route.agent}</span>
              {door.route.managed && (
                <span title="bought by the box for this org">
                  <Pill tone="violet">bought</Pill>
                </span>
              )}
              <Button
                kind="danger"
                size="xs"
                className="num-remove"
                disabled={busy}
                title="The number stops reaching this agent. It stays in your account."
                onClick={() => void moved(() => releaseNumber(credentials, door.route.number ?? "")).catch(() => undefined)}
              >
                Remove
              </Button>
            </div>
          ))}
          {added !== null && (
            <div className="num-added">
              Done. {prettyNumber(added.route.number)} now reaches {added.route.agent}.
            </div>
          )}
          {adding && (
            <Adding
              carriers={carriers}
              agents={agents}
              available={available}
              busy={busy}
              onImport={(wanted, dryRun) => moved(() => importNumber(credentials, wanted, dryRun))}
              onBuy={(wanted, dryRun) => moved(() => buyNumber(credentials, wanted, dryRun))}
              onDone={(wired) => {
                setAdded(wired);
                setAdding(false);
              }}
              onClose={() => setAdding(false)}
            />
          )}
          <div className="num-foot">
            Every agent is on the web, with no number and nothing to turn on: this page is the
            telephone and WhatsApp. An agent answers at as many numbers as you route to it, from
            any of your accounts. A number here is a row you keep — move it to another agent by
            adding it again, and it moves on the next call, with nothing deployed.
          </div>
        </Card>
      )}

      {tab === "outbound" && carriers !== undefined && (
        <>
          {dialling.length > 1 && (
            <div className="num-fields num-fields-3">
              <div>
                <Select value={via ?? ""} onValueChange={(value) => setVia(value)}>
                  {dialling.map((one) => (
                    <SelectItem key={one.account} value={one.account}>
                      {one.label === "" ? one.account : `${one.label} · ${one.account}`}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>
          )}
          <OutboundPanel
            outbound={outbound}
            agents={agents}
            busy={busy}
            onProvision={(dryRun) => moved(() => provisionOutbound(credentials, dryRun, dialling.length > 1 ? (via ?? undefined) : undefined))}
          />
        </>
      )}

      {tab === "carrier" && carriers !== undefined && (
        <CarrierPanel
          carriers={carriers}
          busy={busy}
          onBring={async (wanted) => {
            await moved(() => bringCarrier(credentials, wanted)).catch(() => undefined);
          }}
          onDrop={async (account) => {
            await moved(() => dropCarrier(credentials, account)).catch(() => undefined);
          }}
        />
      )}
    </Page>
  );
}

function saidBy(failed: unknown): string {
  return failed instanceof GatewayError ? failed.message : String(failed);
}

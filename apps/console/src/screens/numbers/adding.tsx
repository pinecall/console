/** Adding a number: import one an account owns, point one here yourself, or have the box buy one — the plan shown before anything is written. */

import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { type HeldAgent } from "@pinecall/core/wire/rest-org";

import { prettyNumber } from "@pinecall/core/calls";
import { Button, Input, Label, Select, SelectItem } from "../../ui";
import type { Available, Carrier, WantedNumber, WantedPurchase, Wired } from "./door";

/** What the panel is told: the org's accounts, its agents, what the accounts own, and the two doors it knocks at. */
export interface AddingProps {
  carriers: Carrier[];
  agents: HeldAgent[];
  available: Available | null;
  busy: boolean;
  onImport: (wanted: WantedNumber, dryRun: boolean) => Promise<Wired>;
  onBuy: (wanted: WantedPurchase, dryRun: boolean) => Promise<Wired>;
  /** The number is in: the card that opened this form closes it and says so. */
  onDone: (wired: Wired) => void;
  onClose: () => void;
}

type Way = "import" | "hooked" | "buy";
type Channel = "phone" | "whatsapp";

/**
 * Three ways into the org's world, one rule: the gateway is asked for the PLAN first — every step
 * it would take, with the ids that stand today — and a person reads it before the same request
 * goes again for real. Importing takes a number of one of the org's accounts and points it here;
 * hooking takes a number the org points here itself, from any carrier; buying needs no account,
 * since it is the box's that pays, and the plan names the number it found. Nothing is written on
 * the first click, ever. It is drawn inside the numbers card, opened from its head and closed on success.
 */
export function Adding({ carriers, agents, available, busy, onImport, onBuy, onDone, onClose }: AddingProps): ReactNode {
  const twilios = carriers.filter((one) => one.kind === "twilio");
  const metas = carriers.filter((one) => one.kind === "whatsapp");
  const [way, setWay] = useState<Way>(carriers.length === 0 ? "buy" : "import");
  const [channel, setChannel] = useState<Channel>("phone");
  const [account, setAccount] = useState("");
  const [number, setNumber] = useState("");
  const [networks, setNetworks] = useState("");
  const [country, setCountry] = useState("US");
  const [areaCode, setAreaCode] = useState("");
  const [agent, setAgent] = useState(agents[0]?.slug ?? "");
  const [plan, setPlan] = useState<Wired | null>(null);

  useEffect(() => {
    if (agent === "" && agents[0] !== undefined) setAgent(agents[0].slug);
  }, [agents, agent]);

  // The accounts a number of this channel can live in; one alone is chosen for the person.
  const accounts = channel === "whatsapp" ? metas : twilios;
  const chosen = accounts.length === 1 ? (accounts[0]?.account ?? "") : account;
  const owned = (available?.numbers ?? []).filter((one) => !one.imported && (chosen === "" || one.account === undefined || one.account === chosen));

  // A plan is about one request; change a field and it is somebody else's plan.
  const forget = (): void => setPlan(null);
  const ask = async (dryRun: boolean): Promise<Wired> => {
    if (way === "buy") {
      return onBuy({ country: country.trim().toUpperCase(), ...(areaCode.trim() === "" ? {} : { area_code: areaCode.trim() }), agent, channel: "phone" }, dryRun);
    }
    const wanted: WantedNumber = { number: number.trim(), agent, channel };
    if (way === "hooked") {
      wanted.hooked = true;
      const fence = networks.split(/[\s,]+/).filter(Boolean);
      if (fence.length > 0) wanted.networks = fence;
    } else if (chosen !== "") {
      wanted.account = chosen;
    }
    return onImport(wanted, dryRun);
  };

  const planned = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setPlan(await ask(true).catch(() => null));
  };
  const confirmed = async (): Promise<void> => {
    const wired = await ask(false).catch(() => null);
    if (wired === null) return;
    setPlan(null);
    setNumber("");
    onDone(wired);
  };

  const turn = (to: Way): void => {
    setWay(to);
    forget();
  };
  const segment = (to: Way, name: string, disabled: boolean, title?: string): ReactNode => (
    <button type="button" className={way === to ? "ui-segment ui-segment-on" : "ui-segment"} aria-pressed={way === to} onClick={() => turn(to)} disabled={disabled} title={title}>
      {name}
    </button>
  );

  return (
    <div className="num-add">
      <div className="num-add-head">
        <div className="ui-segmented" role="group">
          {segment("import", owned.length > 0 && way === "import" ? `From my account · ${owned.length}` : "From my account", carriers.length === 0, carriers.length === 0 ? "add an account first, in the Carrier tab" : undefined)}
          {segment("hooked", "I point it here myself", false)}
          {segment("buy", "Buy a new one", false)}
        </div>
        <button type="button" className="ui-text-action num-add-close" onClick={onClose}>
          Close
        </button>
      </div>

      <form onSubmit={(event) => void planned(event)}>
        <div className="num-fields num-fields-3">
          {way !== "buy" && (
            <div>
              <Label>Channel</Label>
              <Select
                value={channel}
                onValueChange={(value) => {
                  setChannel(value as Channel);
                  setAccount("");
                  setNumber("");
                  forget();
                }}
              >
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </Select>
            </div>
          )}
          {way === "import" && accounts.length > 1 && (
            <div>
              <Label>Account</Label>
              <Select
                value={account}
                onValueChange={(value) => {
                  setAccount(value);
                  setNumber("");
                  forget();
                }}
                required
              >
                <SelectItem value="">Choose an account…</SelectItem>
                {accounts.map((one) => (
                  <SelectItem key={one.account} value={one.account}>
                    {one.label === "" ? one.account : `${one.label} · ${one.account}`}
                  </SelectItem>
                ))}
              </Select>
            </div>
          )}
          {way !== "buy" ? (
            <div>
              <Label>Number</Label>
              {way === "import" && owned.length > 0 ? (
                <Select
                  value={number}
                  onValueChange={(value) => {
                    setNumber(value);
                    forget();
                  }}
                  required
                >
                  <SelectItem value="">Choose a number…</SelectItem>
                  {owned.map((one) => (
                    <SelectItem key={one.number} value={one.number}>
                      {prettyNumber(one.number)} — {one.name}
                    </SelectItem>
                  ))}
                </Select>
              ) : (
                <Input
                  value={number}
                  onChange={(e) => {
                    setNumber(e.target.value);
                    forget();
                  }}
                  placeholder="+14176743169"
                  required
                  autoComplete="off"
                />
              )}
            </div>
          ) : (
            <>
              <div>
                <Label>Country · two letters</Label>
                <Input
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    forget();
                  }}
                  maxLength={2}
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <Label>Area code · optional</Label>
                <Input
                  value={areaCode}
                  onChange={(e) => {
                    setAreaCode(e.target.value);
                    forget();
                  }}
                  placeholder="417"
                  autoComplete="off"
                />
              </div>
            </>
          )}
          {way === "hooked" && channel === "phone" && (
            <div>
              <Label>Networks it calls from · optional, CIDR</Label>
              <Input
                value={networks}
                onChange={(e) => {
                  setNetworks(e.target.value);
                  forget();
                }}
                placeholder="Twilio's when empty"
                autoComplete="off"
              />
            </div>
          )}
          <div>
            <Label>Agent that answers</Label>
            {agents.length > 0 ? (
              <Select
                value={agent}
                onValueChange={(value) => {
                  setAgent(value);
                  forget();
                }}
                required
              >
                {agents.map((held) => (
                  <SelectItem key={held.slug} value={held.slug}>
                    {held.slug}
                  </SelectItem>
                ))}
              </Select>
            ) : (
              <Input
                value={agent}
                onChange={(e) => {
                  setAgent(e.target.value);
                  forget();
                }}
                placeholder="the agent's slug"
                required
                autoComplete="off"
              />
            )}
          </div>
        </div>
        <div className="num-actions">
          <Button kind="primary" type="submit" disabled={busy || plan !== null}>
            {busy && plan === null ? "Checking…" : "Review"}
          </Button>
          <span className="num-note">
            {way === "import" && "Nothing changes yet — you will see exactly what is going to happen, and confirm."}
            {way === "hooked" && "Point the number at sip:<number>@<this gateway>:5060 from your side. Nothing of yours is touched."}
            {way === "buy" && "Nothing is bought yet — you will see the number that was found, and confirm."}
          </span>
        </div>
      </form>

      {plan !== null && (
        <div className="num-plan">
          <div className="num-plan-title">
            This is what will happen{way === "buy" && plan.route.number !== null ? <> with {prettyNumber(plan.route.number)}</> : null}. Nothing is deleted.
          </div>
          <Steps steps={plan.steps} />
          <div className="num-plan-moves">
            <Button kind="primary" size="md" onClick={() => void confirmed()} disabled={busy}>
              {busy ? "Working…" : way === "buy" ? "Buy it and connect it" : "Confirm"}
            </Button>
            <Button size="md" onClick={forget} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** The gateway's own steps, one per line, in its words — the first token is what kind of thing each is. */
export function Steps({ steps }: { steps: string[] }): ReactNode {
  return (
    <ol className="num-steps">
      {steps.map((step, index) => {
        const [kind, ...rest] = step.split(/\s+/);
        return (
          <li key={index}>
            <span className="num-step-kind">{kind}</span>
            <span className="num-step-text">{rest.join(" ")}</span>
          </li>
        );
      })}
    </ol>
  );
}

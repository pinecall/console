/** Org limits hook (GET /v1/limits) and the minutes meter. */

import { useEffect, useState, type ReactNode } from "react";

import { type Limits, LimitsSchema } from "@pinecall/core/wire/rest-org";
import { type Credentials, GatewayError, read } from "@pinecall/core/api";
import { useCredentials } from "@pinecall/core/credentials";
import { aLoginCode } from "@pinecall/core/login";
import { Stat } from "../ui";

const EVERY_MS = 60000;

/** Poll limits every minute; null until loaded, or permanently on 404. */
export function useLimits(): Limits | null {
  const credentials = useCredentials();
  const [limits, setLimits] = useState<Limits | null>(null);

  useEffect(() => {
    let stopped = false;
    let again: number | undefined;
    const ask = async (): Promise<void> => {
      try {
        const answered = LimitsSchema.parse(await read(credentials, "/v1/limits"));
        if (!stopped) setLimits(answered);
      } catch (refused) {
        // Older gateway without the door: stop polling.
        if (refused instanceof GatewayError && refused.status === 404) {
          window.clearInterval(again);
          if (!stopped) setLimits(null);
        }
      }
    };
    void ask();
    again = window.setInterval(() => void ask(), EVERY_MS);
    return () => {
      stopped = true;
      window.clearInterval(again);
    };
  }, [credentials]);

  return limits;
}

/** Minutes used against the org's limit, and the billing URL if any. */
export interface MinutesMeter {
  used: number;
  limit: number;
  billing: string | null;
}

export function minutesMeter(limits: Limits | null): MinutesMeter | null {
  if (limits === null || limits.minutes.limit === null) return null;
  return { used: Math.min(limits.minutes.used, limits.minutes.limit), limit: limits.minutes.limit, billing: limits.billing_url };
}

/**
 * The billing page in a new tab, signed in as this person: the tab opens at once (a tab opened after
 * an await is a popup the browser blocks), then goes to the page with a one-use login code; if
 * minting fails the page's own sign-in asks.
 */
export function openBilling(billing: string, credentials: Credentials): void {
  const tab = window.open("about:blank", "_blank");
  const go = (code: string | null): void => {
    const there = new URL(billing);
    if (code !== null) there.searchParams.set("login", code);
    if (tab === null) window.location.assign(there.toString());
    else tab.location.href = there.toString();
  };
  aLoginCode(credentials).then(go, () => go(null));
}

/** Minutes meter; shows "Upgrade" only when the box has a billing URL. */
export function Minutes({ meter, size }: { meter: MinutesMeter; size: "big" | "small" }): ReactNode {
  const credentials = useCredentials();
  const billing = meter.billing;
  const upgrade = billing === null ? null : (
    <a
      className="ui-text-action"
      href={billing}
      onClick={(event) => {
        event.preventDefault();
        openBilling(billing, credentials);
      }}
    >
      Upgrade
    </a>
  );
  const of = (
    <>
      of {meter.limit}
      {upgrade !== null && <> · {upgrade}</>}
    </>
  );
  const used = Math.round(meter.used * 10) / 10;
  return size === "big" ? (
    <Stat size="big" label="Minutes used" value={used} delta={of} tone="flat" />
  ) : (
    <Stat size="small" label="Minutes used" value={used} of={of} accent />
  );
}

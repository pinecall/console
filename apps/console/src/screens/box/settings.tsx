/** Box settings: Google sign-in, email, and brand. */

import type { ReactNode } from "react";
import { useSearchParams } from "react-router";

import { Card, Empty, Page, PageHead, Tabs } from "../../ui";
import { SettingsBrand } from "./settings-brand";
import { SettingsEmail } from "./settings-email";
import { SettingsSignIn } from "./settings-signin";
import "./box.css";

type Tab = "signin" | "email" | "brand";

const TABS: readonly { tab: Tab; name: string }[] = [
  { tab: "signin", name: "Sign-in" },
  { tab: "email", name: "Email" },
  { tab: "brand", name: "Brand" },
];

/** Box-wide settings; per-org settings live on the org's screens. */
export function BoxSettings(): ReactNode {
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.some((one) => one.tab === params.get("tab")) ? (params.get("tab") as Tab) : "signin";
  return (
    <Page width={900}>
      <PageHead title="Box settings" lede="What this gateway is set to, for every organization on it." />
      <Tabs label="Box settings" tabs={TABS} on={tab} onPick={(picked) => setParams(picked === "signin" ? {} : { tab: picked })} />
      {tab === "signin" && <SettingsSignIn />}
      {tab === "email" && <SettingsEmail />}
      {tab === "brand" && <SettingsBrand />}
    </Page>
  );
}

/** Placeholder for a tab whose door this gateway version lacks. */
export function NoSuchDoor(): ReactNode {
  return (
    <Card>
      <Empty>This gateway does not have this door yet.</Empty>
    </Card>
  );
}

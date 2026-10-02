/** The top bar: where you are on the left; what this tab is looking at, and the way out, on the right. */

import type { ReactNode } from "react";
import { useLocation } from "react-router";

import { useLeaving } from "../lib/leaving";
import { AGENT_SCREENS, BOX_SCREENS, ORG_SCREENS, rowOf, screenAt } from "../lib/mode";
import { orgOf, useWhoami } from "../lib/whoami";
import { NoticesButton } from "./notices-button";
import { Switcher } from "./switcher";
import { ThemeButton } from "./theme-button";

/** The page's title, from the path: the row's name, and its tab's after it where the screen is one. */
export function titleOf(pathname: string, agent: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "cli") return "Sign in a terminal";
  if (segments[0] === "box") {
    const box = BOX_SCREENS.find((one) => one.path === `box/${segments[1] ?? ""}`);
    return box === undefined ? "Box" : box.key === "box-orgs" && segments[2] !== undefined ? "Organization" : box.name;
  }
  const screen = screenAt(pathname);
  if (screen === undefined) return agent === "" ? "Home" : "Chat";
  const row = rowOf(agent === "" ? ORG_SCREENS : AGENT_SCREENS, screen);
  const name = screen.key === "numbers" ? "Phone numbers" : screen.name;
  return row.key === screen.key ? name : `${row.name} · ${name}`;
}

export function Top({ agent }: { agent: string }): ReactNode {
  const whose = useWhoami();
  const leave = useLeaving();
  const { pathname } = useLocation();
  // The box's screens are about every org, so the crumb says the box and not the org the key opens.
  const context = agent !== "" ? agent : pathname.startsWith("/box/") ? "box" : whose === null ? "" : orgOf(whose);
  return (
    <header className="top">
      {context !== "" && <span className="top-crumb">{context} /</span>}
      <span className="top-title">{titleOf(pathname, agent)}</span>
      <div className="top-right">
        <Switcher agent={agent} />
        <NoticesButton />
        <ThemeButton />
        {/* Both consoles are the box's and both hold a key of this browser's, so both sign out. */}
        <button type="button" className="top-leave" onClick={leave}>
          Sign out
        </button>
      </div>
    </header>
  );
}

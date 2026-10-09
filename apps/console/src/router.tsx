/** Every URL the console has. Append a route as a screen lands; never reorder — this file is a seam. */

import type { ReactNode } from "react";
import { createBrowserRouter, Navigate, useLocation, useParams, type RouteObject } from "react-router";

import { AGENT_SCREENS, BOX_SCREENS, ORG_SCREENS, screensOf, WORLD, WORLD_BASE, type Screen } from "./lib/mode";
// One import line per screen, and it is the screen's directory, never a file inside it: a screen
// that reorganises itself renames nothing here.
import { Agents } from "./screens/agents";
import { Apps } from "./screens/apps";
import { BoxCarriers, BoxFleet, BoxOrg, BoxOrgs, BoxRoutes, BoxSettings, BoxTraceback, BoxUsage, OperatorOnly } from "./screens/box";
import { Chat } from "./screens/chat";
import { Calls } from "./screens/calls";
import { Cases } from "./screens/cases";
import { OrgMemory } from "./screens/org-memory";
import { OrgBase, OrgDocs } from "./screens/org-docs";
import { Evals } from "./screens/evals";
import { Tokens } from "./screens/tokens";
import { Lexicon } from "./screens/lexicon";
import { Providers } from "./screens/providers";
import { Secrets } from "./screens/secrets";
import { Monitors } from "./screens/monitors";
import { Observability } from "./screens/observability";
import { Telemetry } from "./screens/telemetry";
import { Docs } from "./screens/docs";
import { Memory } from "./screens/memory";
import { Numbers, PhoneTesting } from "./screens/numbers";
import { Overview } from "./screens/overview";
import { Notifications } from "./screens/notifications";
import { OrgData } from "./screens/org-data";
import { Pipeline } from "./screens/pipeline";
import { Personas } from "./screens/personas";
import { Simulations } from "./screens/simulations";
import { Settings } from "./screens/settings";
import { Talk } from "./screens/talk";
import { BillingHop } from "./screens/billing";
import { Terminal } from "./screens/terminal";
import { Team } from "./screens/team";
import { Usage } from "./screens/usage";
import { JudgesTab, Quality } from "./screens/quality";
import { TestOverview } from "./screens/test-overview";
import { Widget, WidgetPreview } from "./screens/widget";
import { FirstTab } from "./shell/screen-tabs";
import { Shell } from "./shell/shell";

// The element of every screen, by the key lib/mode.ts lists it under. Which of them THIS console
// has is that table's answer and not this file's: a row it leaves out gets no route, so a path
// typed by hand lands on the front page and not on a screen whose doors would refuse.
const ORG: Record<string, ReactNode> = {
  overview: <Overview />,
  agents: <Agents />,
  calls: <Calls />,
  quality: <Quality />,
  judges: <JudgesTab />,
  monitors: <Monitors />,
  "org-memory": <OrgMemory />,
  "org-docs": <OrgDocs />,
  // A row that is only a place for its tabs lands on the first one this key opens.
  "org-settings": <FirstTab />,
  numbers: <Numbers />,
  phone: <PhoneTesting />,
  tokens: <Tokens />,
  providers: <Providers />,
  apps: <Apps />,
  secrets: <Secrets />,
  telemetry: <Telemetry />,
  observability: <Observability />,
  team: <Team />,
  usage: <Usage />,
  notifications: <Notifications />,
  "org-data": <OrgData />,
};

// The box's. They are routed for anybody on the gateway's page, because the router is built before
// anybody has signed in, and drawn for an operator only: anyone else lands on the front page
// before a door of the box's is ever knocked at.
const BOX: Record<string, ReactNode> = {
  "box-orgs": <OperatorOnly><BoxOrgs /></OperatorOnly>,
  "box-fleet": <OperatorOnly><BoxFleet /></OperatorOnly>,
  "box-carriers": <OperatorOnly><BoxCarriers /></OperatorOnly>,
  "box-routes": <OperatorOnly><BoxRoutes /></OperatorOnly>,
  "box-usage": <OperatorOnly><BoxUsage /></OperatorOnly>,
  "box-settings": <OperatorOnly><BoxSettings /></OperatorOnly>,
  "box-traceback": <OperatorOnly><BoxTraceback /></OperatorOnly>,
};

const AGENT: Record<string, ReactNode> = {
  "agent-overview": <Overview />,
  talk: <Talk />,
  devchat: <Chat />,
  calls: <Calls />,
  quality: <Quality />,
  judges: <JudgesTab />,
  monitors: <Monitors />,
  test: <TestOverview />,
  cases: <Cases />,
  personas: <Personas />,
  simulations: <Simulations />,
  evals: <Evals />,
  knowledge: <FirstTab />,
  docs: <Docs />,
  memory: <Memory />,
  settings: <Settings />,
  pipeline: <Pipeline />,
  lexicon: <Lexicon />,
  widget: <Widget />,
};

// A call in the path is the call itself under Calls — the one page a call has, live or over, the
// conversations beside it — the conversation Dev chat is one of, the simulation watched, or, under
// Personas, the caller open, or under Cases the case open: the same screen one level deeper.
const DEEPER: Record<string, ReactNode> = { devchat: <Chat />, calls: <Calls />, simulations: <Simulations />, personas: <Personas />, cases: <Cases /> };
// The org's, by the same rule: `/calls/:call` is the call named, shown beside every conversation.
const ORG_DEEPER: Record<string, ReactNode> = { calls: <Calls /> };

// The URLs the console had before Calls and the Inbox replaced Live, Sessions and — for a day —
// Conversations, and before one word took one place: Home's Agents tab is Agents, the table of
// calls is Calls' own `?view=table`, Evals is Quality. A link somebody pasted, or a verdict citing
// `#seq-93`, lands on what the screen is called now, hash and query and all — nothing pasted
// before today stops working. Personas, Simulations and the Lexicon were the org's and are an
// agent's now: a link to the org's lands on Overview, because no agent is named in it to land on.
const GONE: readonly { path: string; to: string }[] = [
  { path: "live", to: "/calls?status=live" },
  { path: "live/:call", to: "/calls/:call" },
  { path: "sessions", to: "/calls" },
  { path: "sessions/:call", to: "/calls/:call" },
  { path: "conversations", to: "/calls" },
  { path: "c/:call", to: "/calls/:call" },
  { path: "inbox", to: "/calls" },
  { path: "inbox/:call", to: "/calls/:call" },
  { path: "personas", to: "/" },
  { path: "personas/:call", to: "/" },
  { path: "simulations", to: "/" },
  { path: "simulations/:call", to: "/" },
  { path: "lexicon", to: "/" },
  { path: "overview", to: "/agents" },
  { path: "list", to: "/calls?view=table" },
  { path: "evals", to: "/quality" },
];
const AGENT_GONE: readonly { path: string; to: string }[] = [
  { path: "sessions", to: "/a/:agent/calls" },
  { path: "sessions/:call", to: "/calls/:call" },
  { path: "conversations", to: "/a/:agent/calls" },
  // An agent's screens before its rows were the org's own words: the Inbox is Calls, Chat is the
  // Playground, Settings is Configure, the goldens are Test's; its judges are a tab of Quality at the same path.
  { path: "inbox", to: "/a/:agent/calls" },
  { path: "inbox/:call", to: "/a/:agent/calls/:call" },
  { path: "talk", to: "/a/:agent/playground" },
  { path: "settings", to: "/a/:agent/configure" },
  { path: "evals", to: "/a/:agent/goldens" },
];

/** One old URL sent to the one it is now: the path's own words, and the query and hash it arrived with. */
function To({ to }: { to: string }): ReactNode {
  const params = useParams();
  const { search, hash } = useLocation();
  const [path = "", own = ""] = to.replace(/:(\w+)/g, (_, name: string) => encodeURIComponent(params[name] ?? "")).split("?");
  // A target that names its own query says what it is for (`?view=table`), and the query the reader
  // came with (`?q=`, `?agent=`) rides along beside it; the hash rides along either way.
  const query = new URLSearchParams(search);
  for (const [name, value] of new URLSearchParams(own)) query.set(name, value);
  const said = query.toString();
  return <Navigate to={`${path}${said === "" ? "" : `?${said}`}${hash}`} replace />;
}

function redirects(gone: readonly { path: string; to: string }[]): RouteObject[] {
  return gone.map(({ path, to }) => ({ path, element: <To to={to} /> }));
}

function routesOf(table: readonly Screen[], elements: Record<string, ReactNode>): RouteObject[] {
  return screensOf(table, WORLD, true).flatMap((screen): RouteObject[] => {
    const element = elements[screen.key];
    if (screen.path === "") return [{ index: true, element }];
    const deeper = (elements === AGENT ? DEEPER : ORG_DEEPER)[screen.key];
    return deeper === undefined ? [{ path: screen.path, element }] : [{ path: screen.path, element }, { path: `${screen.path}/:call`, element: deeper }];
  });
}

// The URL is the state: which agent, which screen, and later which call. Nothing the console holds
// in memory decides what is on screen, so a reload lands on exactly the same thing. The org's
// screens sit at the root; an agent's under /a/<slug>.
export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Shell />,
      children: [
        ...routesOf(ORG_SCREENS, ORG),
        ...routesOf(BOX_SCREENS, BOX),
        ...redirects(GONE),
        // One call, whichever agent took it and whether or not it is over.
        // One org of the box's, one level under its list.
        ...(WORLD === "production" ? [{ path: "box/orgs/:org", element: <OperatorOnly><BoxOrg /></OperatorOnly> }] : []),
        // Where `pinecall login` sends a person: the card that signs their terminal in. It is
        // built from the gateway the terminal was pointed at (cli/login.ts), which is the box's
        // own name, so the card is production's console and not the sandbox's.
        ...(WORLD === "production" ? [{ path: "cli", element: <Terminal /> }] : []),
        // Where billing.pinecall.io sends a person with no session: back there signed in, in this org.
        ...(WORLD === "production" ? [{ path: "billing", element: <BillingHop /> }] : []),
        // One base of the org's documents, its files read and edited one at a time.
        { path: "docs/:base", element: <OrgBase /> },
      ],
    },
    {
      path: "/a/:agent",
      element: <Shell />,
      children: [{ index: true, element: <Navigate to="overview" replace /> }, ...routesOf(AGENT_SCREENS, AGENT), ...redirects(AGENT_GONE)],
    },
    // A blank page with nothing but the widget on it, the way a site would have it: outside the
    // shell, the same key.
    { path: "/a/:agent/widget/preview", element: <WidgetPreview /> },
    { path: "*", element: <Navigate to="/" replace /> },
  ],
  // The world's base, not the API's: the sandbox's screens live under `/sandbox`, its doors do not.
  { basename: WORLD_BASE },
);

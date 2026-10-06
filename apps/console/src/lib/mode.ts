/** Which world this page is — production at the root, the sandbox under `/sandbox` — and the one table of what each has. */

/** The two worlds a gateway holds. The page names its world on every request (@pinecall/core/api). */
export type World = "production" | "sandbox";

// One gateway, one name, two worlds: the world of a page is the first segment of its path.
// `https://<name>/calls` is production's Calls and `https://<name>/sandbox/calls` the sandbox's —
// the same screens under the `/sandbox` prefix, at the same origin, on the same key. Only the
// router moves: the doors stay at the origin's root (`/v1/...`, lib/base.ts) whichever world the
// page is, and every request names its world in `pinecall-env`.
const THE_SANDBOXS_SEGMENT = "sandbox";

/** The world a page at that path is: `/sandbox` and everything under it is the sandbox's. */
export function worldOf(pathname: string): World {
  return pathname.split("/").filter(Boolean)[0] === THE_SANDBOXS_SEGMENT ? "sandbox" : "production";
}

/** The router's base in that world: production's screens at the root, the sandbox's under `/sandbox`. */
export function baseOf(world: World): string {
  return world === "sandbox" ? `/${THE_SANDBOXS_SEGMENT}` : "/";
}

/** A router path (`/calls/call_9f`) as the browser's own, in that world. */
export function inTheWorld(world: World, pathname: string): string {
  const base = baseOf(world);
  return base === "/" ? pathname : `${base}${pathname}`;
}

/** The same screen in the other world: the browser's path with `/sandbox` taken off or put on. */
export function inTheOtherWorld(pathname: string): string {
  const here = worldOf(pathname);
  const bare = here === "sandbox" ? pathname.slice(baseOf("sandbox").length) || "/" : pathname;
  return inTheWorld(here === "sandbox" ? "production" : "sandbox", bare);
}

// The tests import this module in node, where there is no window at all: a page that was never
// rendered is production's, as a page at the root is in a browser.
/** Read once, when the page loads: the world this path is. */
export const WORLD: World = typeof window === "undefined" ? "production" : worldOf(window.location.pathname);

/** The router's base for this page's world (never an API URL's: those are lib/base.ts's). */
export const WORLD_BASE: string = baseOf(WORLD);

/**
 * The name this box is known by from OUTSIDE: what a widget tag pasted into a customer's site
 * loads from, and what an identity provider is registered with. One name serves both worlds, so
 * it is this page's origin and never a path under it: a site is handed the box, not a world.
 */
export function theBoxsOwnName(): string {
  return window.location.origin;
}

/** The sidebar's icons, by name (ui/icon.tsx). */
export type ScreenIcon = "home" | "grid" | "activity" | "list" | "chart" | "phone" | "key" | "plug" | "users" | "building" | "server" | "route" | "sliders" | "check" | "memory" | "words" | "book" | "headphones" | "persona" | "bell" | "chat" | "flask" | "bot";

/**
 * Where a row sits in the sidebar. Unmarked rows are what is LOOKED AT — Overview, Calls, Quality —
 * and read the same with every agent in view or one. `build` is what makes one agent, drawn only
 * while one is in view; `workspace` is the org's own, drawn at the sidebar's foot whatever is.
 */
export type ScreenGroup = "build" | "workspace";

/**
 * One screen: where it is, what it is called, which console has it, and where it sits. A screen
 * with no `under` is a ROW of the sidebar; one that names another screen is a TAB of that row,
 * reached through the tab bar drawn over the row's screens and never from the sidebar. A row that
 * is only a place for its tabs (`Test`, `Knowledge`, the org's `Settings`) opens on its first tab.
 */
export interface Screen {
  /** The key the scopes table gates it by (@pinecall/core/scopes). */
  key: string;
  path: string;
  name: string;
  in: readonly World[];
  icon?: ScreenIcon;
  /** The key of the row this screen is a tab of. */
  under?: string;
  /** A row with no screen of its own: its path lands on the first of its tabs. */
  opensOn?: "first-tab";
  /** What a row that is also a screen is called in its own tab bar, when its name would say the row twice. */
  tab?: string;
  group?: ScreenGroup;
  /** The box's own: drawn and routed only for a person the box made an operator. */
  operator?: true;
}

const BOTH = ["production", "sandbox"] as const;
const PRODUCTIONS = ["production"] as const;
const THE_WORKSHOPS = ["sandbox"] as const;

// THE table. The sidebar draws its rows, the tab bar draws the tabs under the row on screen, and
// the router routes every one of them — so a screen a console does not have is neither linked nor
// reachable by typing its path. A redesign moves rows here and nothing else: no screen asks which
// world it is in to decide whether it exists.
//
// One word, one place. What is looked at — Overview, Calls, Quality — is the same three rows
// whether every agent is in view or one, and the agent is what the sidebar's Viewing picks, never
// a section of its own: these are the org's, at the root, and the agent's below are the same
// screens under `/a/<slug>`. Agents lists them all. What runs the org — numbers, people, the bill,
// what is set once and rarely — is the workspace, at the sidebar's foot; tokens and provider keys
// are each instance's own, so each console holds them.
export const ORG_SCREENS: readonly Screen[] = [
  { key: "overview", path: "", name: "Overview", in: BOTH, icon: "grid" },
  { key: "calls", path: "calls", name: "Calls", in: BOTH, icon: "list" },
  { key: "quality", path: "quality", name: "Quality", in: BOTH, icon: "check" },
  { key: "agents", path: "agents", name: "Agents", in: BOTH, icon: "bot" },
  { key: "numbers", path: "numbers", name: "Numbers", in: PRODUCTIONS, icon: "phone", group: "workspace" },
  { key: "team", path: "team", name: "Team", in: PRODUCTIONS, icon: "users", group: "workspace" },
  { key: "usage", path: "usage", name: "Usage", in: PRODUCTIONS, icon: "chart", group: "workspace" },
  { key: "org-settings", path: "settings", name: "Settings", in: BOTH, icon: "sliders", opensOn: "first-tab", group: "workspace" },
  { key: "tokens", path: "tokens", name: "Tokens", in: BOTH, under: "org-settings" },
  { key: "providers", path: "providers", name: "Providers", in: BOTH, under: "org-settings" },
  // The apps the box hosts for the org in this world (`pinecall deploy`), and what they start with.
  { key: "apps", path: "apps", name: "Apps", in: BOTH, under: "org-settings" },
  { key: "secrets", path: "secrets", name: "Secrets", in: BOTH, under: "org-settings" },
  // Every base of the world and who searches it, and every fact any agent's calls taught.
  { key: "org-docs", path: "docs", name: "Docs", in: BOTH, under: "org-settings" },
  { key: "org-memory", path: "memory", name: "Memory", in: BOTH, under: "org-settings" },
  { key: "notifications", path: "notifications", name: "Notifications", in: BOTH, under: "org-settings" },
  // How long a call is kept, the world exported, a contact erased, and the trail of every erasure.
  { key: "org-data", path: "data", name: "Data & privacy", in: BOTH, under: "org-settings" },
  { key: "phone", path: "phone", name: "Phone testing", in: THE_WORKSHOPS, under: "org-settings" },
];

// The BOX's screens: every tenant, the fleet under them, the doors, the bill of all of them, and
// what the box itself is set to. They are not an org's — an org's admin never sees them — so they
// are a table of their own, each row marked: only a person the box made an operator is shown one.
export const BOX_SCREENS: readonly Screen[] = [
  { key: "box-orgs", path: "box/orgs", name: "Organizations", in: PRODUCTIONS, icon: "building", operator: true },
  { key: "box-fleet", path: "box/fleet", name: "Fleet", in: PRODUCTIONS, icon: "server", operator: true },
  { key: "box-carriers", path: "box/carriers", name: "Carriers", in: PRODUCTIONS, icon: "phone", operator: true },
  { key: "box-routes", path: "box/routes", name: "Routes", in: PRODUCTIONS, icon: "route", operator: true },
  { key: "box-traceback", path: "box/traceback", name: "Traceback", in: PRODUCTIONS, icon: "phone", operator: true },
  { key: "box-usage", path: "box/usage", name: "Box usage", in: PRODUCTIONS, icon: "chart", operator: true },
  { key: "box-settings", path: "box/settings", name: "Box settings", in: PRODUCTIONS, icon: "sliders", operator: true },
];

// One agent in view: the same three rows the org's are — its Overview, its Calls, its Quality,
// each the org's screen with only its calls — then what builds it. Playground is the gateway's
// room, by voice or in writing, and Dev chat — a written call to the class in a developer's own
// directory — is its second tab in the workshop. Test is what happens before a change ships: the
// goldens and their runs, the callers written for it, and a caller put on it live; how its REAL
// calls are judged is Quality's. Knowledge is what it searches and what it learned. Configure is
// what it runs on, with the pipeline that results, its lexicon and the widget that embeds it.
export const AGENT_SCREENS: readonly Screen[] = [
  { key: "agent-overview", path: "overview", name: "Overview", in: BOTH, icon: "grid" },
  { key: "calls", path: "calls", name: "Calls", in: BOTH, icon: "list" },
  { key: "quality", path: "quality", name: "Quality", in: BOTH, icon: "check" },
  { key: "talk", path: "playground", name: "Playground", tab: "Chat", in: BOTH, icon: "chat", group: "build" },
  { key: "devchat", path: "dev-chat", name: "Dev chat", in: THE_WORKSHOPS, under: "talk" },
  { key: "test", path: "test", name: "Test", in: BOTH, icon: "flask", opensOn: "first-tab", group: "build" },
  { key: "evals", path: "goldens", name: "Goldens", in: BOTH, under: "test" },
  { key: "personas", path: "personas", name: "Personas", in: BOTH, under: "test" },
  { key: "simulations", path: "simulations", name: "Simulations", in: BOTH, under: "test" },
  { key: "knowledge", path: "knowledge", name: "Knowledge", in: BOTH, icon: "book", opensOn: "first-tab", group: "build" },
  { key: "docs", path: "docs", name: "Docs", in: BOTH, under: "knowledge" },
  { key: "memory", path: "memory", name: "Memory", in: BOTH, under: "knowledge" },
  { key: "settings", path: "configure", name: "Configure", tab: "General", in: BOTH, icon: "sliders", group: "build" },
  { key: "pipeline", path: "pipeline", name: "Pipeline", in: BOTH, under: "settings" },
  { key: "lexicon", path: "lexicon", name: "Lexicon", in: BOTH, under: "settings" },
  { key: "widget", path: "widget", name: "Widget", in: BOTH, under: "settings" },
];

/** The screens of a table this console has, in the table's order; an operator's only for an operator. */
export function screensOf(table: readonly Screen[], world: World = WORLD, operator = false): Screen[] {
  return table.filter((screen) => screen.in.includes(world) && (operator || screen.operator !== true));
}

/** Whether this console has that screen, by its key. */
export function has(table: readonly Screen[], key: string, world: World = WORLD): boolean {
  return table.some((screen) => screen.key === key && screen.in.includes(world));
}

/** The sidebar's rows of a table: the screens that are not a tab of another. */
export function rowsOf(table: readonly Screen[], world: World = WORLD, operator = false): Screen[] {
  return screensOf(table, world, operator).filter((screen) => screen.under === undefined);
}

/** A row's tabs: the row itself where it is a screen, then every screen that is under it. */
export function tabsOf(table: readonly Screen[], row: Screen, world: World = WORLD): Screen[] {
  const own = row.opensOn === "first-tab" ? [] : [row];
  return [...own, ...screensOf(table, world).filter((screen) => screen.under === row.key)];
}

/** What a row is called in its own tab bar: its `tab` word where its name would say the row twice. */
export function tabName(screen: Screen): string {
  return screen.under === undefined ? (screen.tab ?? screen.name) : screen.name;
}

/** The row a screen belongs to: itself, or the one it is a tab of. */
export function rowOf(table: readonly Screen[], screen: Screen): Screen {
  return (screen.under === undefined ? undefined : table.find((one) => one.key === screen.under)) ?? screen;
}

// A path is a screen's when it starts with that screen's own path, once an agent's prefix is off
// it: `/calls/call_9f` is Calls', `/a/clinica-norte/calls/call_9f` the same screen with one agent
// in view. The longest match wins, so `box/orgs` is not mistaken for anything shorter — and the
// table is the path's, because an agent's `docs` and the org's are two screens at one word. What a back link is
// CALLED comes from here, which is why a screen renamed in the table is renamed in every link
// pointing home to it.
/** The screen a path belongs to, or undefined when no screen owns it. */
export function screenAt(path: string): Screen | undefined {
  const bare = path.split(/[?#]/)[0] ?? "";
  const ofAnAgent = /^\/a\/[^/]+/.test(bare);
  const table = ofAnAgent ? AGENT_SCREENS : [...ORG_SCREENS, ...BOX_SCREENS];
  const under = bare.replace(/^\/a\/[^/]+\/?/, "/").replace(/^\/+/, "");
  const cut = under.replace(/\/$/, "");
  if (cut === "") return table.find((screen) => screen.path === "");
  return table.filter((screen) => screen.path !== "" && (cut === screen.path || cut.startsWith(`${screen.path}/`))).sort(
    (one, other) => other.path.length - one.path.length,
  )[0];
}

/** Which world this page is — production's name or the sandbox's — and the one table of what each has. */

import type { Credentials } from "@pinecall/core/api";
import { aLoginCode } from "@pinecall/core/login";

/** The two worlds a gateway holds. The page names its world on every request (@pinecall/core/api). */
export type World = "production" | "sandbox";

// One gateway, two names: production's and the sandbox's. The name a page is served at is its
// world, and the gateway writes that world into the page (`<meta name="pinecall-world">`) with the
// other name beside it (`pinecall-elsewhere`), so the switch is a link to the other name. A page
// nobody marked is production's: a box of one name serves both worlds at it.
const WORLD_MARK = 'meta[name="pinecall-world"]';
const ELSEWHERE_MARK = 'meta[name="pinecall-elsewhere"]';

/** Read once, when the page loads: the world this name is. */
export const WORLD: World = marked(WORLD_MARK) === "sandbox" ? "sandbox" : "production";

/** The other world's address, or null on a box of one name. */
export function elsewhere(): string | null {
  const said = marked(ELSEWHERE_MARK);
  return said === undefined || said === "" ? null : said.replace(/\/$/, "");
}

/** The same screen at the other world's name, carrying a one-use login code so it opens signed in. */
export function crossing(other: string, pathname: string, code: string | null): string {
  const there = new URL(`${other}${pathname}`);
  if (code !== null) there.searchParams.set("login", code);
  return there.toString();
}

/**
 * Leave for the same screen at the other name, signed in as this person: a one-use code is minted
 * first; if minting fails the other name's own sign-in card asks. Same tab, so two worlds are
 * never open side by side.
 */
export function crossOver(other: string, pathname: string, credentials: Credentials): void {
  aLoginCode(credentials).then(
    (code) => window.location.assign(crossing(other, pathname, code)),
    () => window.location.assign(crossing(other, pathname, null)),
  );
}

/**
 * The name this box is known by from OUTSIDE: what a widget tag pasted into a customer's site
 * loads from, and what an identity provider is registered with. Production's name, never the
 * sandbox's: a site handed that one would load its widget from the workshop.
 */
export function theBoxsOwnName(): string {
  const here = window.location.origin.replace(/\/$/, "");
  return WORLD === "production" ? here : (elsewhere() ?? here);
}

// The tests import this module in node, where there is no document at all: a page that was never
// rendered is production's, which is the same answer an unmarked page gives in a browser.
function marked(selector: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.querySelector(selector)?.getAttribute("content") ?? undefined;
}

/** The sidebar's icons, by name (ui/icon.tsx). */
export type ScreenIcon = "home" | "grid" | "activity" | "list" | "chart" | "phone" | "key" | "plug" | "users" | "building" | "server" | "route" | "sliders" | "check" | "memory" | "words" | "book" | "headphones" | "persona" | "bell" | "chat" | "flask";

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
// The org's screens: what the sidebar has once the agents are listed. Calls is every conversation
// of the org as a messenger shows them, whichever agent took it, the one open drawn as the call's
// own page — where a supervisor works a live call from — and the same calls as a table beside it.
// Evals is how every agent is judged, a row of its own. The agents held are Home's tab. Running the org
// (numbers, people, the bill) is production's
// business. What is set once and rarely — tokens, vendor keys, hosted apps and their secrets, the
// bases, the notices — is Settings' tabs; tokens and provider keys are each instance's own, so
// each console holds them.
export const ORG_SCREENS: readonly Screen[] = [
  { key: "home", path: "", name: "Home", in: BOTH, icon: "home" },
  { key: "agents", path: "overview", name: "Agents", in: BOTH, under: "home" },
  { key: "calls", path: "calls", name: "Calls", in: BOTH, icon: "list" },
  { key: "calls-list", path: "list", name: "List", in: BOTH, under: "calls" },
  { key: "org-evals", path: "evals", name: "Evals", in: BOTH, icon: "check" },
  { key: "numbers", path: "numbers", name: "Numbers", in: PRODUCTIONS, icon: "phone" },
  { key: "team", path: "team", name: "Team", in: PRODUCTIONS, icon: "users" },
  { key: "usage", path: "usage", name: "Usage", in: PRODUCTIONS, icon: "chart" },
  { key: "org-settings", path: "settings", name: "Settings", in: BOTH, icon: "sliders", opensOn: "first-tab" },
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

// An agent's screens: six rows under its name in the sidebar, and their tabs. Overview is where the
// agent opens: its numbers, calls and spend a day, how its calls end and how fast it answers. Chat is the
// gateway's room, by voice or in writing — its path stays `talk`, so links made before still land
// — and Dev chat, a written call to the class in a developer's own directory, is its second tab
// in the workshop. Calls is the agent's conversations the way a messenger shows them — a thread
// per person, the one open read and supervised live, its call's own page one click away — and the
// same calls as a table beside it. Test is everything
// that puts the agent through its paces: the callers written for it, the judges over its calls,
// a caller put on it live, and the goldens and their runs. Knowledge is what it searches and what
// it learned. Settings is what it runs on, with the pipeline that results, its lexicon and the
// widget that embeds it.
export const AGENT_SCREENS: readonly Screen[] = [
  { key: "agent-overview", path: "overview", name: "Overview", in: BOTH, icon: "grid" },
  { key: "talk", path: "talk", name: "Chat", in: BOTH, icon: "chat" },
  { key: "devchat", path: "dev-chat", name: "Dev chat", in: THE_WORKSHOPS, under: "talk" },
  { key: "inbox", path: "inbox", name: "Calls", in: BOTH, icon: "list" },
  { key: "calls", path: "calls", name: "List", in: BOTH, under: "inbox" },
  { key: "test", path: "test", name: "Test", in: BOTH, icon: "flask", opensOn: "first-tab" },
  { key: "personas", path: "personas", name: "Personas", in: BOTH, under: "test" },
  { key: "judges", path: "judges", name: "Judges", in: BOTH, under: "test" },
  { key: "simulations", path: "simulations", name: "Simulations", in: BOTH, under: "test" },
  { key: "evals", path: "evals", name: "Evals", in: BOTH, under: "test" },
  { key: "knowledge", path: "knowledge", name: "Knowledge", in: BOTH, icon: "book", opensOn: "first-tab" },
  { key: "docs", path: "docs", name: "Docs", in: BOTH, under: "knowledge" },
  { key: "memory", path: "memory", name: "Memory", in: BOTH, under: "knowledge" },
  { key: "settings", path: "settings", name: "Settings", in: BOTH, icon: "sliders" },
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

/** The row a screen belongs to: itself, or the one it is a tab of. */
export function rowOf(table: readonly Screen[], screen: Screen): Screen {
  return (screen.under === undefined ? undefined : table.find((one) => one.key === screen.under)) ?? screen;
}

// A path is a screen's when it starts with that screen's own path, once an agent's prefix is off
// it: `/calls/call_9f` is Calls', `/a/clinica-norte/inbox` is the agent's Calls. The longest
// match wins, so `box/orgs` is not mistaken for anything shorter — and the table is the path's,
// because an agent's `settings` and the org's are two screens at one word. What a back link is
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

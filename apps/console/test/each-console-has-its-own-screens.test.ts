// One bundle, two consoles: production at the root of the gateway's one name, the sandbox under
// `/sandbox`, the world read off the path (lib/mode.ts). Production's console runs the org; the
// sandbox's is the workshop, with its own tokens and provider keys. Which screens each has is ONE
// table (lib/mode.ts), and this pins it.

import { describe, expect, it } from "vitest";

import { headersFor } from "@pinecall/core/api";
import { AGENT_SCREENS, BOX_SCREENS, ORG_SCREENS, has, rowOf, rowsOf, screenAt, screensOf, tabsOf } from "../src/lib/mode.js";

const names = (table: typeof ORG_SCREENS, world: "production" | "sandbox"): string[] =>
  screensOf(table, world).map((screen) => screen.name);

const rows = (table: typeof ORG_SCREENS, world: "production" | "sandbox"): string[] => rowsOf(table, world).map((screen) => screen.name);

const tabs = (table: typeof ORG_SCREENS, key: string, world: "production" | "sandbox"): string[] => {
  const row = table.find((screen) => screen.key === key);
  return row === undefined ? [] : tabsOf(table, row, world).map((screen) => screen.name);
};

// The sidebar is the org's rows under the agents: nothing that is ONE agent's — its callers, its
// judges, its simulations — is a row of the org's, and what is set once and rarely is Settings' tabs.
describe("production's console", () => {
  it("runs the org from seven rows: its floor, every call, how it is judged, its numbers, its people, its bill and its settings", () => {
    expect(rows(ORG_SCREENS, "production")).toEqual(["Home", "Calls", "Evals", "Numbers", "Team", "Usage", "Settings"]);
  });

  it("reads every call as a messenger does, the table beside it; the floor under Home; what is set once under Settings", () => {
    expect(tabs(ORG_SCREENS, "calls", "production")).toEqual(["Calls", "List"]);
    expect(tabs(ORG_SCREENS, "home", "production")).toEqual(["Home", "Agents"]);
    expect(tabs(ORG_SCREENS, "org-settings", "production")).toEqual(["Tokens", "Providers", "Apps", "Secrets", "Docs", "Memory", "Notifications", "Data & privacy"]);
  });

  it("has no org-wide Personas, Simulations or Lexicon: a caller and the words are one agent's", () => {
    expect(names(ORG_SCREENS, "production")).not.toContain("Personas");
    expect(names(ORG_SCREENS, "production")).not.toContain("Simulations");
    expect(names(ORG_SCREENS, "production")).not.toContain("Lexicon");
  });

  it("talks and chats with what is deployed, and has no Dev chat: that one mounts the class in a developer's own directory", () => {
    expect(has(AGENT_SCREENS, "talk", "production")).toBe(true);
    expect(has(AGENT_SCREENS, "devchat", "production")).toBe(false);
  });
});

// The box is run from the page that shows production, by a person the box made an operator. The
// rows are marked, so nobody else is drawn one — and the sandbox's console has none at all.
describe("the box's screens", () => {
  it("are an operator's, on production's console", () => {
    expect(screensOf(BOX_SCREENS, "production", true).map((screen) => screen.name)).toEqual(["Organizations", "Fleet", "Carriers", "Routes", "Traceback", "Box usage", "Box settings"]);
    expect(BOX_SCREENS.every((screen) => screen.operator === true && screen.under === undefined && screen.path.startsWith("box/"))).toBe(true);
  });

  it("are drawn for nobody else", () => {
    expect(screensOf(BOX_SCREENS, "production")).toEqual([]);
    expect(screensOf(BOX_SCREENS, "production", false)).toEqual([]);
    expect(screensOf(BOX_SCREENS, "sandbox", true)).toEqual([]);
  });

  it("leave an org's own screens as they were, operator or not", () => {
    expect(screensOf(ORG_SCREENS, "production", true)).toEqual(screensOf(ORG_SCREENS, "production"));
  });
});

describe("the sandbox's console", () => {
  it("is the workshop: no numbers, people or bill, and its own tokens, provider keys and notices", () => {
    expect(rows(ORG_SCREENS, "sandbox")).toEqual(["Home", "Calls", "Evals", "Settings"]);
    expect(tabs(ORG_SCREENS, "org-settings", "sandbox")).toEqual(["Tokens", "Providers", "Apps", "Secrets", "Docs", "Memory", "Notifications", "Data & privacy", "Phone testing"]);
  });

  it("has every screen of an agent, Dev chat among them", () => {
    expect(names(AGENT_SCREENS, "sandbox")).toEqual(["Overview", "Chat", "Dev chat", "Calls", "List", "Test", "Personas", "Judges", "Simulations", "Evals", "Knowledge", "Docs", "Memory", "Settings", "Pipeline", "Lexicon", "Widget"]);
  });
});

// An agent is five rows under its name, and every other screen of it is a tab of one of them.
describe("an agent's screens", () => {
  it("are six rows in the sidebar, Overview first", () => {
    expect(rows(AGENT_SCREENS, "production")).toEqual(["Overview", "Chat", "Calls", "Test", "Knowledge", "Settings"]);
  });

  it("read its calls as threads, the messenger's way, with the table beside them", () => {
    expect(tabs(AGENT_SCREENS, "inbox", "production")).toEqual(["Calls", "List"]);
    expect(screenAt("/a/clinica-norte/inbox")?.name).toBe("Calls");
  });

  it("keep what it runs on under Settings: its settings, the pipeline, its lexicon and the widget", () => {
    expect(tabs(AGENT_SCREENS, "settings", "production")).toEqual(["Settings", "Pipeline", "Lexicon", "Widget"]);
    expect(tabs(AGENT_SCREENS, "settings", "sandbox")).toEqual(["Settings", "Pipeline", "Lexicon", "Widget"]);
    expect(screenAt("/a/clinica-norte/lexicon")?.key).toBe("lexicon");
    expect(screenAt("/lexicon")).toBeUndefined();
  });

  it("put its callers, its judges, a simulation and its goldens under Test", () => {
    expect(tabs(AGENT_SCREENS, "test", "production")).toEqual(["Personas", "Judges", "Simulations", "Evals"]);
  });

  it("read a path in the agent's table, so its Settings is not the org's", () => {
    expect(screenAt("/a/clinica-norte/settings")?.key).toBe("settings");
    expect(screenAt("/settings")?.key).toBe("org-settings");
    expect(screenAt("/a/clinica-norte/personas/el-que-cancela")?.key).toBe("personas");
    const judges = screenAt("/a/clinica-norte/judges");
    expect(judges === undefined ? undefined : rowOf(AGENT_SCREENS, judges).name).toBe("Test");
  });
});

// Both consoles ride one key of that browser's, and every request names the world of the page it
// came from — the path's — so the gateway serves the world the page is looking at and refuses a
// request that believes it is talking to the other (the runtime's auth/world.py).
describe("either console", () => {
  it("names its world and its key on every request", () => {
    expect(headersFor({ base: "/", key: "pk_1", world: "sandbox" })).toEqual({ authorization: "Bearer pk_1", "pinecall-env": "sandbox" });
    expect(headersFor({ base: "/", key: "pk_1", world: "production" })).toEqual({ authorization: "Bearer pk_1", "pinecall-env": "production" });
  });

  it("names the colleague's corner an admin opened, in the sandbox", () => {
    expect(headersFor({ base: "/", key: "pk_1", world: "sandbox", corner: "mem_2" })).toEqual({
      authorization: "Bearer pk_1",
      "pinecall-env": "sandbox",
      "pinecall-corner": "mem_2",
    });
  });
});

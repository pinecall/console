/** Cases parse the gateway's shapes field for field, a decision is a PATCH, and an expect reads as sentences. */

import { expect, test } from "vitest";
import { z } from "zod";

import { decideCase, keepCall, readCases } from "../src/screens/cases/door";
import { expectations } from "../src/screens/cases/expectations";

const CREDENTIALS = { base: "/", key: "pk_test" };

// runtime wire/rest/evals.py: EvalCase as the seal keeps a call a judge broke on (evals/dataset.py).
const A_CASE = {
  id: "case_3f0c1a2b4c5d",
  agent: "clinica-norte",
  name: "promises-me-llaman-manana-por-29d7c7",
  golden: {
    name: "promises-me-llaman-manana-por-29d7c7",
    state: { stage: "book" },
    input: ["¿Me llaman mañana, por favor?"],
    memory: ["Prefiere mañanas"],
    events: [{ after_turn: 1, name: "slot_freed", data: { at: "10:15" } }],
    today: "2026-10-08",
    expect: { judges: ["promises"] },
    promoted_from: "call_29d7c7",
  },
  source_call: "call_29d7c7",
  source_env: "production",
  held_out: false,
  author: "the hang-up panel",
  created_at: 1791460000.5,
  status: "pending",
  broke: [{ judge: "promises", reason: "it promised a call back and no tool booked one" }],
  source_version: 4,
  kept_in_repo: false,
  decided_by: null,
};

const asked: { method: string; url: string; body: unknown }[] = [];

function answering(body: unknown): void {
  globalThis.window = { location: { origin: "https://cloud.pinecall.io" } } as unknown as Window & typeof globalThis;
  globalThis.fetch = (async (url: URL, init?: RequestInit) => {
    asked.push({ method: init?.method ?? "GET", url: String(url), body: init?.body === undefined ? undefined : JSON.parse(String(init.body)) });
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

test("an agent's cases are the runtime's rows, and a renamed field is refused", async () => {
  answering({ cases: [A_CASE], pending: 1, pending_at_most: 50 });
  const listed = await readCases(CREDENTIALS, "clinica-norte");
  expect(listed.pending).toBe(1);
  expect(listed.pendingAtMost).toBe(50);
  expect(listed.cases[0]?.broke[0]?.judge).toBe("promises");
  expect(asked.at(-1)?.url).toContain("agent=clinica-norte");
  answering({ cases: [{ ...A_CASE, status: "waiting" }], pending: 1, pending_at_most: 50 });
  await expect(readCases(CREDENTIALS, "clinica-norte")).rejects.toBeInstanceOf(z.ZodError);
});

test("a decision is a PATCH of the case by its id, and keeping a call is a POST naming it", async () => {
  answering({ ...A_CASE, status: "dismissed", decided_by: "m_ana" });
  const decided = await decideCase(CREDENTIALS, A_CASE.id, { status: "dismissed", judge_was_wrong: "promises" });
  expect(decided.status).toBe("dismissed");
  expect(asked.at(-1)).toMatchObject({ method: "PATCH", body: { status: "dismissed", judge_was_wrong: "promises" } });
  expect(asked.at(-1)?.url).toContain(`/v1/evals/cases/${A_CASE.id}`);
  answering({ ...A_CASE, status: "approved", author: "m_ana", broke: [] });
  await keepCall(CREDENTIALS, "call_29d7c7", "kept-29d7c7");
  expect(asked.at(-1)).toMatchObject({ method: "POST", body: { call: "call_29d7c7", name: "kept-29d7c7" } });
});

test("what a case expects reads as one sentence a field, and nothing expected says so", () => {
  expect(expectations({ not_tools: ["book_appointment"], grounded: true, judges: ["promises"] })).toEqual([
    "never calls book_appointment",
    "states no price, hour, date or name the call did not carry (grounded)",
    "promises holds when the judge is asked again",
  ]);
  expect(expectations({})[0]).toMatch(/^nothing yet/);
});

/** The judges the runtime has: what each asks of a finished call, and who answers it. */

/** One judge of the runtime's panel, as the page describes it. */
export interface BuiltIn {
  name: string;
  /** The question, in the words `agents/docs/testing-an-agent.md` puts it. */
  asks: string;
  /** Who answers: code alone, or code first and a model for what code could not settle. */
  by: "code" | "code, then a model" | "a model";
  /** When it runs: every call, or only a simulation whose caller wrote a rule. */
  on: "every call" | "a simulated call whose caller wrote a rule";
}

// The panel is the runtime's (`pinecall/evals/judges.py`), read here so a person knows what their
// calls are being held to; it has no door. A tenant's own judge — a question about ONE agent's
// job, put to a model the same way `persona` is — has its own (`./door.ts`).
export const PANEL: readonly BuiltIn[] = [
  {
    name: "consent",
    asks: "Every irreversible tool call ran after a confirm.granted for the same call and the same audience.",
    by: "code",
    on: "every call",
  },
  {
    name: "grounded",
    asks: "Every concrete fact the agent stated appears in the evidence this call carried.",
    by: "code, then a model",
    on: "every call",
  },
  {
    name: "promises",
    asks: "Every commitment the agent made on the business's behalf is recorded by a tool call.",
    by: "code, then a model",
    on: "every call",
  },
  {
    name: "persona",
    asks: "The caller hangs up satisfied, by its own rule: what it wrote under accepts when and declines when.",
    by: "a model",
    on: "a simulated call whose caller wrote a rule",
  },
];

/** How one judge answered over a run of calls: the verdicts that settled, and how many held. */
export interface HeldRate {
  held: number;
  settled: number;
}

/** Each judge's held-rate over these verdicts, by name; a judge that answered nothing is absent. */
export function heldRates(calls: readonly { judges: readonly { name: string; verdict: string }[] }[]): Map<string, HeldRate> {
  const rates = new Map<string, HeldRate>();
  for (const call of calls) {
    for (const judge of call.judges) {
      // Only a verdict counts: a judge that skipped, or was never given a model, answered nothing.
      if (judge.verdict !== "held" && judge.verdict !== "broken") continue;
      const rate = rates.get(judge.name) ?? { held: 0, settled: 0 };
      rates.set(judge.name, { held: rate.held + (judge.verdict === "held" ? 1 : 0), settled: rate.settled + 1 });
    }
  }
  return rates;
}

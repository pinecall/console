/** No case open: the loop a case goes round, with this agent's numbers on it. */

import type { ReactNode } from "react";

import type { Listed } from "./door";

export function TheLoop({ agent, listed }: { agent: string; listed: Listed | null }): ReactNode {
  const whose = agent === "" ? "every agent" : agent;
  const count = (status: string): number => listed?.cases.filter((kept) => kept.status === status).length ?? 0;
  const steps: { said: string; how: ReactNode; now: string }[] = [
    {
      said: "A judge breaks",
      how: (
        <>
          Every real call of {whose} is judged at hang-up. One that does not pass is kept here on its own: the caller's words, the
          state it opened in, what memory recalled, and what the broken judges forbid from now on.
        </>
      ),
      now: `${listed?.pending ?? 0} waiting for you`,
    },
    {
      said: "You play it again",
      how: (
        <>
          <b>Run it</b> plays the same caller against the agent you hold with <code>pinecall start</code>, on the version of the
          settings you pick. Red means you reproduced it.
        </>
      ),
      now: "in the sandbox, never through production",
    },
    {
      said: "You fix it where it belongs",
      how: (
        <>
          A price, an hour, what to say: the agent's <b>settings</b>, a new version and no deploy. What it did in a stage, or a tool used
          wrong: the <b>code</b>, in a pull request that carries the case with <code>pinecall cases pull</code>.
        </>
      ),
      now: "run it again until it holds",
    },
    {
      said: "You approve it, or dismiss it",
      how: (
        <>
          Approved, the nightly plays it every night from now on, so the same mistake cannot come back unseen. <b>The judge was wrong</b>{" "}
          dismisses it and teaches the judge, through its calibration.
        </>
      ),
      now: `${count("approved")} played every night · ${count("dismissed")} dismissed`,
    },
  ];
  return (
    <article className="cs-loop">
      <h1 className="cs-loop-title">How a broken call stops breaking</h1>
      <p className="cs-loop-lede">Nobody writes these cases. The calls do; a person decides. Pick one on the left.</p>
      <ol className="cs-steps">
        {steps.map((step, at) => (
          <li key={step.said} className="cs-step">
            <span className="cs-step-n">{at + 1}</span>
            <div>
              <h2 className="cs-step-said">{step.said}</h2>
              <p className="cs-step-how">{step.how}</p>
              <span className="cs-step-now">{step.now}</span>
            </div>
          </li>
        ))}
      </ol>
      <p className="cs-loop-note">
        A case is never softened so a change can pass. A verdict knows what broke, not what was right: when the right answer names the code,
        write it in the repository's golden.
      </p>
    </article>
  );
}

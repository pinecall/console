/** Judges, a tab of Quality: every judge a call meets at hang-up, how each has held, and the form a new one is written in. */

import { useMemo, type ReactNode } from "react";
import { useParams } from "react-router";

import { useOrg } from "../../lib/org";
import { useScores } from "../../lib/use-scores";
import { Page, PageHead } from "../../ui";
import { useDrift } from "./drift";
import { Judges } from "./judges";
import { heldRates } from "./panel";
import "./quality.css";

/** The held-rates are folded from the newest verdicts the page read; the drift is the process holding the agent's count. */
export function JudgesTab(): ReactNode {
  const agent = useParams()["agent"] ?? "";
  const { lines } = useOrg();
  const mine = useMemo(() => (agent === "" ? lines : lines.filter((line) => line.agent === agent)), [lines, agent]);
  const scored = useScores(mine);
  const verdicts = scored.flatMap((row) => (row.score === null ? [] : [row.score]));
  const rates = heldRates(verdicts);
  const drifted = useDrift(agent);

  return (
    <Page tight>
      <PageHead
        title="Judges"
        ledeWidth={660}
        lede={
          agent === ""
            ? "Every judge a real call meets at hang-up: the runtime's panel, and the org's own, asked of every agent. A verdict that breaks opens a case."
            : `Every judge ${agent}'s real calls meet at hang-up: the runtime's panel, the org's, and ${agent}'s own. A verdict that breaks opens a case.`
        }
      />
      <Judges agent={agent} rates={rates} read={verdicts.length} drifted={drifted} />
    </Page>
  );
}
